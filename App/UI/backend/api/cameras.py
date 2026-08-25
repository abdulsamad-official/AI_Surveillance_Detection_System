import os

from fastapi import APIRouter, HTTPException
from core.recorder import (
    trigger_recording, feed_frame_to_recorder, is_recording
)
from core.buffer import init_buffer, push_frame, remove_buffer, get_pre_event_frames
from fastapi.responses import StreamingResponse
from core.optimizer import (
    get_optimal_skip_frames,
    update_fps,
    get_perf_stats
)
from pydantic import BaseModel
from fastapi import UploadFile, File
import shutil
from typing import Optional
from core.segment_manager import (
    start_segment,
    feed_segment_frame,
    mark_segment_threat,
    stop_segment
)
from datetime import datetime
from core.buffer import init_buffer, push_frame, remove_buffer
import uuid
import queue
import numpy as np
import threading
import time
from core.state import cameras, camera_last_detection
import cv2
from core.inference import run_inference

from core.state import cameras
from utils.helpers import get_timestamp, format_camera

router = APIRouter(prefix="/cameras", tags=["Cameras"])

class CameraCreate(BaseModel):
    name: str
    source: str
    location: Optional[str] = "Unknown"

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None

# ── Single shared capture per source ────────────────────────────
_captures = {}

# ── Per camera inference queues ──────────────────────────────────
_inference_queues  = {}   # camera_id -> Queue(frames to process)
_result_cache      = {}   # camera_id -> latest annotated frame + detections
_inference_threads = {}   # camera_id -> thread

# ── Per camera timeout tracking ──────────────────────────────────
# Stores the last time we spawned a clear_detection thread per camera
_last_clear_time: dict[str, float] = {}
# Stores whether a clear thread is currently sleeping for this camera
_clear_thread_active: dict[str, bool] = {}


def open_capture(source: str):
    """Open VideoCapture — webcam, RTSP, or video file."""
    try:
        src = int(source)
        cap = cv2.VideoCapture(src, cv2.CAP_MSMF)
    except ValueError:
        # RTSP, HTTP, or video file path
        cap = cv2.VideoCapture(source)

    if cap.isOpened():
        cap.set(cv2.CAP_PROP_FRAME_WIDTH,  640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_BUFFERSIZE,   1)
    return cap

def get_capture(source: str):
    """Return cached capture or create new one."""
    cap = _captures.get(source)
    if cap is None or not cap.isOpened():
        if cap is not None:
            try:
                cap.release()
            except Exception:
                pass
        _captures[source] = open_capture(source)
    return _captures[source]


def release_capture(source: str):
    """Safely release a capture without KeyError."""
    cap = _captures.pop(source, None)
    if cap is not None:
        try:
            cap.release()
        except Exception:
            pass


# ── Timeout reset ─────────────────────────────────────────────────
def clear_detection_after_timeout(cam_id: str, delay: float = 10.0):
    """
    Sleep for `delay` seconds, then reset to Normal — but ONLY if no
    new detection arrived while sleeping.  Uses a per-camera active-flag
    so we never have two threads racing for the same camera.
    """
    from core.state import camera_last_detection, cameras as cam_state

    time.sleep(delay)

    last = camera_last_detection.get(cam_id, {})
    now  = datetime.now().timestamp()

    if last and (now - last.get("timestamp", 0)) >= delay:
        camera_last_detection[cam_id] = {
            "class_name": "Normal",
            "confidence": 0.0,
            "timestamp":  now,
            "boxes":      []
        }
        if cam_id in cam_state:
            cam_state[cam_id]["last_class"] = "Normal"
            cam_state[cam_id]["last_conf"]  = 0.0
        print(f"[Timeout] Reset to Normal: {cam_id}")

    # Always clear the active flag so next detection can arm a new thread
    _clear_thread_active[cam_id] = False


def _maybe_arm_timeout(camera_id: str):
    """
    Called each time inference returns NO detections.
    Starts a clear_detection_after_timeout thread if:
      - no thread is already sleeping for this camera
      - the current detection is not already Normal
    """
    from core.state import system_settings, camera_last_detection

    # Already a thread in progress — let it finish
    if _clear_thread_active.get(camera_id, False):
        return

    # Already Normal — nothing to reset
    current_class = camera_last_detection.get(camera_id, {}).get("class_name", "Normal")
    if current_class == "Normal":
        return

    timeout = float(system_settings.get("detection_timeout", 10))
    _clear_thread_active[camera_id] = True
    t = threading.Thread(
        target=clear_detection_after_timeout,
        args=(camera_id, timeout),
        daemon=True
    )
    t.start()
    print(f"[Timeout] Armed {timeout}s reset for {camera_id}")


# ── Detection handler ─────────────────────────────────────────────
def fire_detection(cam_id, class_name, confidence, bbox, all_detections):
    import requests
    from core.state import (
        cameras as cam_state,
        detection_summary,
        camera_last_detection,
        alert_config,
        add_log
    )

    # Skip if camera offline
    cam = cam_state.get(cam_id, {})
    if cam.get("status") == "offline":
        print(f"[Detection] Skipped — camera offline: {cam_id}")
        return

    now  = datetime.now().timestamp()
    last = camera_last_detection.get(cam_id, {})

    boxes = [
        {
            "class_name": d["class_name"],
            "confidence": d["confidence"],
            "x1": d["bbox"][0],
            "y1": d["bbox"][1],
            "x2": d["bbox"][2],
            "y2": d["bbox"][3]
        }
        for d in all_detections
        if len(d.get("bbox", [])) == 4
    ]

    # Cooldown — avoid spamming same class within 2 s
    same  = last.get("class_name") == class_name
    delta = now - last.get("timestamp", 0)
    if same and delta < 2.0:
        if cam_id in camera_last_detection:
            camera_last_detection[cam_id]["boxes"] = boxes
        return

    THREAT_CLASSES = [
        "Fire", "Gun", "Knife",
        "Violence", "Smoke", "Falling", "Theft_Mask"
    ]

    # New detection arrived — cancel any pending timeout for this camera
    _clear_thread_active[cam_id] = False

    camera_last_detection[cam_id] = {
        "class_name": class_name,
        "confidence": confidence,
        "timestamp":  now,
        "boxes":      boxes
    }

    if cam_id in cam_state:
        cam_state[cam_id]["last_class"] = class_name
        cam_state[cam_id]["last_conf"]  = confidence

    add_log(
        "WARNING" if class_name in THREAT_CLASSES else "INFO",
        "Detection",
        f"{class_name} detected on {cam_state.get(cam_id, {}).get('name', cam_id)} "
        f"(conf: {confidence:.2f})"
    )

    if class_name in detection_summary:
        detection_summary[class_name] += 1
        print(f"[Detection] {class_name}: {detection_summary[class_name]}")

    alert_enabled = alert_config["enabled_classes"].get(class_name, False)

    # ── Check email alert ─────────────────────────────────────
    try:
        from core.email_alert import check_and_send_email
        cam_name = cam_state.get(cam_id, {}).get("name", cam_id)
        threading.Thread(
            target=check_and_send_email,
            args=(cam_id, cam_name, class_name, confidence),
            daemon=True
        ).start()
    except Exception as e:
        print(f"[Email] Check failed: {e}")

    if class_name in THREAT_CLASSES and not is_recording(cam_id):
        from core.buffer import get_pre_event_frames
        from core.state  import system_settings
        pre_secs   = system_settings.get("pre_event_minutes", 2) * 60
        pre_frames = get_pre_event_frames(cam_id, seconds=pre_secs)
        cam_name   = cam_state.get(cam_id, {}).get("name", cam_id)
        threading.Thread(
            target=trigger_recording,
            args=(cam_id, cam_name, class_name, confidence, pre_frames),
            daemon=True
        ).start()

    if class_name in THREAT_CLASSES:
        try:
            mark_segment_threat(cam_id)
        except Exception:
            pass

    def post():
        try:
            requests.post(
                "http://localhost:8000/detections/",
                json={
                    "camera_id":  cam_id,
                    "class_name": class_name,
                    "confidence": confidence,
                    "bbox":       bbox
                },
                timeout=2
            )
        except Exception as e:
            print(f"[Detection POST] {e}")

    threading.Thread(target=post, daemon=True).start()

# ── Inference thread ──────────────────────────────────────────────
def start_inference_thread(camera_id: str, conf_thresh: float = 0.50):
    """Runs inference in background — never blocks the stream."""
    if camera_id in _inference_threads:
        if _inference_threads[camera_id].is_alive():
            return

    q = queue.Queue(maxsize=2)
    _inference_queues[camera_id] = q

    def inference_worker():
        from core.state import class_visibility
        print(f"[Inference Thread] Started for {camera_id}")
        while True:
            try:
                frame = q.get(timeout=5)
                if frame is None:
                    break

                annotated, detections = run_inference(
                    frame.copy(),
                    conf_thresh,
                    source_key=camera_id
                )

                # ── Filter disabled classes ───────────────────────
                detections = [
                    d for d in detections
                    if class_visibility.get(d["class_name"], True)
                ]

                _result_cache[camera_id] = {
                    "frame":      annotated if detections else frame,
                    "detections": detections
                }

                if detections:
                    # New detection — cancel pending timeout
                    _clear_thread_active[camera_id] = False
                    top = max(detections, key=lambda d: d["confidence"])
                    fire_detection(
                        camera_id,
                        top["class_name"],
                        top["confidence"],
                        top["bbox"],
                        detections
                    )
                else:
                    # No detection — arm timeout if needed
                    _maybe_arm_timeout(camera_id)

            except queue.Empty:
                # No frame arrived in 5 s — also try to arm timeout
                _maybe_arm_timeout(camera_id)
                continue
            except Exception as e:
                print(f"[Inference Thread] Error: {e}")
                continue

    t = threading.Thread(target=inference_worker, daemon=True)
    t.start()
    _inference_threads[camera_id] = t
    print(f"[Inference Thread] Running for {camera_id}")

def stop_inference_thread(camera_id: str):
    """Stop inference thread for camera."""
    if camera_id in _inference_queues:
        try:
            _inference_queues[camera_id].put_nowait(None)
        except Exception:
            pass
        del _inference_queues[camera_id]
    _result_cache.pop(camera_id, None)
    _inference_threads.pop(camera_id, None)
    _clear_thread_active[camera_id] = False


# ── Offline placeholder frame ─────────────────────────────────────
def _make_offline_frame():
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    frame[:] = (10, 15, 26)
    cv2.putText(frame, "CAMERA OFFLINE", (160, 220),
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, (80, 100, 130), 2, cv2.LINE_AA)
    cv2.putText(frame, "Stream paused", (220, 265),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (50, 70, 90), 1, cv2.LINE_AA)
    return frame


# ── Main stream generator ─────────────────────────────────────────
# ── Main stream generator ─────────────────────────────────────────
def generate_frames(source: str, camera_id: str = None,
                    conf_thresh: float = 0.50,
                    run_ai: bool = True):
    """
    Yield MJPEG frames.
    - Inference runs in a separate thread (non-blocking).
    - Timeout resets in their own daemon threads (non-blocking).
    - Offline cameras get a placeholder frame at 1 fps.
    - Video files loop automatically when they reach the end.
    """
    from core.state import cameras as cam_state, camera_last_detection

    fail_count  = 0
    frame_count = 0
    SKIP_FRAMES = 3

    # ── Detect if source is a local video file ─────────────────────
    is_video_file = (
        not source.isdigit() and
        not source.startswith('rtsp') and
        not source.startswith('http') and
        os.path.isfile(source)
    )

    if camera_id:
        init_buffer(camera_id)
        cam_name = cameras.get(camera_id, {}).get("name", camera_id)
        start_segment(camera_id, cam_name)

    if run_ai and camera_id:
        start_inference_thread(camera_id, conf_thresh)

    while True:
        try:
            # ── Offline check ──────────────────────────────────────
            if camera_id:
                cam = cam_state.get(camera_id, {})
                if cam.get("status") == "offline":
                    stop_inference_thread(camera_id)
                    camera_last_detection[camera_id] = {
                        "class_name": "Normal",
                        "confidence": 0.0,
                        "timestamp":  0,
                        "boxes":      []
                    }
                    offline_frame = _make_offline_frame()
                    ret, buffer = cv2.imencode(
                        '.jpg', offline_frame,
                        [cv2.IMWRITE_JPEG_QUALITY, 50]
                    )
                    if ret:
                        yield (
                            b'--frame\r\n'
                            b'Content-Type: image/jpeg\r\n\r\n'
                            + buffer.tobytes()
                            + b'\r\n'
                        )
                    time.sleep(1)
                    continue

            # ── Capture frame ──────────────────────────────────────
            cap            = get_capture(source)
            success, frame = cap.read()

            if not success or frame is None:
                if is_video_file:
                    # ── Loop video file back to start ──────────────
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                else:
                    fail_count += 1
                    if fail_count >= 15:
                        release_capture(source)
                        fail_count = 0
                    continue

            fail_count   = 0
            frame_count += 1
            frame        = cv2.resize(frame, (640, 480))

            # ── Buffer / recorder / segment ────────────────────────
            if camera_id:
                push_frame(camera_id, frame)

            if camera_id and is_recording(camera_id):
                feed_frame_to_recorder(camera_id, frame)

            if camera_id:
                feed_segment_frame(camera_id, frame)

            # ── Send to inference (online only, every Nth frame) ───
            if run_ai and camera_id and (frame_count % SKIP_FRAMES == 0):
                if cam_state.get(camera_id, {}).get("status") == "online":
                    q = _inference_queues.get(camera_id)
                    if q is not None:
                        try:
                            q.put_nowait(frame.copy())
                        except queue.Full:
                            pass   # Inference busy — stream continues unblocked

            # ── Use latest annotated frame from cache ──────────────
            display_frame = frame
            if camera_id and camera_id in _result_cache:
                cached = _result_cache[camera_id]
                if cached and cached.get("frame") is not None:
                    display_frame = cached["frame"]

            update_fps()

            ret, buffer = cv2.imencode(
                '.jpg', display_frame,
                [cv2.IMWRITE_JPEG_QUALITY, 65]
            )
            if not ret:
                continue

            yield (
                b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n'
                + buffer.tobytes()
                + b'\r\n'
            )

        except Exception as e:
            print(f"[Stream Error] {e}")
            release_capture(source)
            break


# ── DETECT webcams ────────────────────────────────────────────────
@router.get("/detect-webcams")
def detect_webcams():
    found = []
    default_labels = {0: "Integrated Camera", 1: "USB Camera",
                      2: "USB Camera 2",       3: "External Camera"}
    for index in range(10):
        try:
            cap = cv2.VideoCapture(index, cv2.CAP_DSHOW)
            if cap.isOpened():
                ret, frame = cap.read()
                cap.release()
                if ret and frame is not None:
                    found.append({"index": index,
                                  "label": default_labels.get(index, f"Camera {index}")})
            else:
                cap.release()
        except Exception as e:
            print(f"[detect-webcams] index={index} error: {e}")
    return {"success": True, "count": len(found), "webcams": found}


VIDEOS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "../recordings/uploads/"
)

@router.post("/upload-video")
async def upload_video(file: UploadFile = File(...)):
    """Upload video file to use as camera source."""

    import os
    import shutil

    # ── Create upload directory ───────────────────────────────
    base_dir   = os.path.dirname(
        os.path.dirname(os.path.abspath(__file__))
    )
    videos_dir = os.path.join(base_dir, "..", "recordings", "uploads")
    os.makedirs(videos_dir, exist_ok=True)

    print(f"[Upload] Saving to: {videos_dir}")
    print(f"[Upload] File: {file.filename}")
    print(f"[Upload] Content-Type: {file.content_type}")

    # ── Validate extension ────────────────────────────────────
    if file.filename:
        ext = os.path.splitext(file.filename)[1].lower()
    else:
        ext = '.mp4'

    allowed_exts = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.m4v']
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Use: MP4, AVI, MOV, MKV"
        )

    # ── Save file ─────────────────────────────────────────────
    try:
        safe_name = f"{str(uuid.uuid4())[:8]}_{file.filename}"
        # Remove spaces from filename
        safe_name = safe_name.replace(' ', '_')
        filepath  = os.path.join(videos_dir, safe_name)

        # Read and save
        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(
                status_code=400,
                detail="File is empty"
            )

        with open(filepath, "wb") as f:
            f.write(contents)

        file_size_mb = round(len(contents) / (1024 * 1024), 1)
        print(f"[Upload] Saved: {filepath} ({file_size_mb} MB)")

        return {
            "success":  True,
            "filename": safe_name,
            "filepath": filepath,
            "size_mb":  file_size_mb,
            "message":  "Video uploaded successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Upload] Error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Upload failed: {str(e)}"
        )
    

# ── Debug endpoints ───────────────────────────────────────────────
@router.get("/debug/buffer-stats")
def buffer_stats():
    from core.buffer import get_all_buffer_stats
    return {"stats": get_all_buffer_stats()}

@router.get("/debug/performance")
def get_performance():
    return {
        "performance": get_perf_stats(),
        "cameras":     len(cameras),
        "active":      sum(1 for c in cameras.values() if c["status"] == "online")
    }

@router.get("/debug/segment-stats")
def segment_stats():
    from core.segment_manager import get_segment_stats
    return {"stats": get_segment_stats()}


# ── GET all cameras ───────────────────────────────────────────────
@router.get("/")
def get_all_cameras():
    return {
        "success": True,
        "count":   len(cameras),
        "cameras": [format_camera(c) for c in cameras.values()]
    }

# ── Camera status ─────────────────────────────────────────────────
@router.get("/{camera_id}/status")
def get_camera_status(camera_id: str):
    if camera_id not in cameras:
        raise HTTPException(status_code=404, detail="Camera not found")
    cam = cameras[camera_id]
    return {"success": True, "camera_id": camera_id,
            "status": cam["status"], "detections": cam["detections"]}

# ── STREAM ────────────────────────────────────────────────────────
@router.get("/{camera_id}/stream")
def stream_camera(camera_id: str):
    if camera_id not in cameras:
        raise HTTPException(status_code=404, detail="Camera not found")
    cam = cameras[camera_id]
    if cam["status"] == "offline":
        raise HTTPException(status_code=400, detail="Camera is offline")
    source = cam["source"]
    test = open_capture(source)
    if not test.isOpened():
        test.release()
        raise HTTPException(status_code=503,
                            detail=f"Cannot open camera source '{source}'")
    _captures[source] = test
    from core.state import add_log
    add_log("INFO", "Camera", f"Stream started: {cam['name']}")
    return StreamingResponse(
        generate_frames(source, camera_id=camera_id,
                        conf_thresh=0.50, run_ai=True),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control":               "no-cache, no-store",
            "Access-Control-Allow-Origin": "*",
            "X-Content-Type-Options":      "nosniff"
        },
        background=None
    )

# ── GET single camera ─────────────────────────────────────────────
@router.get("/{camera_id}")
def get_camera(camera_id: str):
    if camera_id not in cameras:
        raise HTTPException(status_code=404, detail="Camera not found")
    return {"success": True, "camera": format_camera(cameras[camera_id])}

# ── ADD camera ────────────────────────────────────────────────────
@router.post("/")
def add_camera(data: CameraCreate):
    if len(cameras) >= 6:
        raise HTTPException(status_code=400, detail="Maximum 6 cameras allowed")
    cam_id = str(uuid.uuid4())[:8]
    camera = {
        "id":         cam_id,
        "name":       data.name,
        "source":     data.source,
        "location":   data.location,
        "status":     "online",
        "added_at":   get_timestamp(),
        "detections": 0
    }
    cameras[cam_id] = camera
    from core.state import add_log
    add_log("SUCCESS", "Camera", f"Camera added: {data.name}")
    return {"success": True, "message": "Camera added", "camera": format_camera(camera)}

# ── UPDATE camera ─────────────────────────────────────────────────
@router.put("/{camera_id}")
def update_camera(camera_id: str, data: CameraUpdate):
    if camera_id not in cameras:
        raise HTTPException(status_code=404, detail="Camera not found")
    cam = cameras[camera_id]
    if data.name     is not None: cam["name"]     = data.name
    if data.location is not None: cam["location"] = data.location
    if data.status   is not None:
        cam["status"] = data.status
        if data.status == "offline":
            stop_inference_thread(camera_id)
            _result_cache.pop(camera_id, None)
            from core.state import camera_last_detection
            camera_last_detection[camera_id] = {
                "class_name": "Normal", "confidence": 0.0,
                "timestamp": 0, "boxes": []
            }
            from core.state import add_log
            add_log("INFO", "Camera", f"Camera set offline: {cam['name']}")
        elif data.status == "online":
            start_inference_thread(camera_id, 0.50)
            from core.state import add_log
            add_log("INFO", "Camera", f"Camera set online: {cam['name']}")
    return {"success": True, "message": "Camera updated",
            "camera": format_camera(cam)}

# ── DELETE camera ─────────────────────────────────────────────────
@router.delete("/{camera_id}")
def delete_camera(camera_id: str):
    if camera_id not in cameras:
        raise HTTPException(status_code=404, detail="Camera not found")
    from core.state import add_log
    add_log("WARNING", "Camera", f"Camera deleted: {cameras[camera_id]['name']}")
    source = cameras[camera_id]["source"]
    release_capture(source)
    remove_buffer(camera_id)
    stop_segment(camera_id)
    stop_inference_thread(camera_id)
    del cameras[camera_id]
    return {"success": True, "message": "Camera removed"}

# ── Last detection ────────────────────────────────────────────────
@router.get("/{camera_id}/last-detection")
def get_last_detection_api(camera_id: str):
    if camera_id not in cameras:
        raise HTTPException(status_code=404, detail="Camera not found")
    det = camera_last_detection.get(camera_id, {
        "class_name": "Normal", "confidence": 0.0, "timestamp": ""
    })
    return {"success": True, "detection": det}

# ── Bounding boxes ────────────────────────────────────────────────
@router.get("/{camera_id}/detections")
def get_camera_detections(camera_id: str):
    det = camera_last_detection.get(camera_id, {})
    return {
        "camera_id":  camera_id,
        "class_name": det.get("class_name", "Normal"),
        "confidence": det.get("confidence", 0.0),
        "boxes":      det.get("boxes", []),
        "timestamp":  det.get("timestamp", 0)
    }
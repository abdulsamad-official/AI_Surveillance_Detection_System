import cv2
import os
import threading
import time
import atexit
import signal
import subprocess
import numpy as np
from datetime import datetime
from core.config import get_recording_config

# ── Global state ─────────────────────────────────────────────────
_active_recordings = {}
_recording_lock    = threading.Lock()
recordings_list    = []


class RecordingSession:
    """Records video using FFmpeg pipe — produces proper MP4."""

    def __init__(self, camera_id, camera_name,
                 event_type, confidence, filepath):
        self.camera_id   = camera_id
        self.camera_name = camera_name
        self.event_type  = event_type
        self.confidence  = confidence
        self.filepath    = filepath
        self.frame_count = 0
        self.running     = True
        self.start_time  = time.time()
        self.process     = None
        self.writer      = None

        cfg          = get_recording_config()
        self.fps     = cfg["fps"]
        self.resolution = cfg["resolution"]
        w, h         = self.resolution

        # Read post_event_minutes from live settings
        from core.state import system_settings
        post_minutes    = system_settings.get("post_event_minutes", 2)
        self.max_frames = int(post_minutes * 60 * self.fps)

        # ── Try FFmpeg first ──────────────────────────────────
        try:
            import imageio_ffmpeg
            ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

            cmd = [
                ffmpeg_exe,
                '-y',
                '-f',      'rawvideo',
                '-vcodec', 'rawvideo',
                '-s',      f'{w}x{h}',
                '-pix_fmt','bgr24',
                '-r',      str(self.fps),
                '-i',      'pipe:0',
                '-vcodec', 'libx264',
                '-preset', 'ultrafast',
                '-pix_fmt','yuv420p',
                '-movflags','+faststart',
                self.filepath
            ]

            self.process = subprocess.Popen(
                cmd,
                stdin  = subprocess.PIPE,
                stdout = subprocess.DEVNULL,
                stderr = subprocess.DEVNULL
            )
            self.mode = 'ffmpeg'
            print(f"[Recorder] FFmpeg started: {self.filepath}")

        except Exception as e:
            print(f"[Recorder] FFmpeg failed ({e}) — using OpenCV")
            self.process = None
            self.mode    = 'opencv'

            for codec in ['avc1', 'H264', 'XVID', 'mp4v']:
                try:
                    fourcc  = cv2.VideoWriter_fourcc(*codec)
                    writer  = cv2.VideoWriter(
                        self.filepath, fourcc,
                        self.fps, self.resolution
                    )
                    if writer.isOpened():
                        self.writer = writer
                        print(f"[Recorder] OpenCV codec: {codec}")
                        break
                    writer.release()
                except Exception:
                    continue

    def write_frame(self, frame):
        """Write one frame to recording."""
        if not self.running:
            return
        if self.frame_count >= self.max_frames:
            self.stop()
            return
        try:
            resized = cv2.resize(frame, self.resolution)
            if self.mode == 'ffmpeg' and self.process:
                self.process.stdin.write(resized.tobytes())
            elif self.mode == 'opencv' and self.writer:
                self.writer.write(resized)
            self.frame_count += 1
        except Exception as e:
            print(f"[Recorder] Write error: {e}")
            self.stop()

    def stop(self):
        """Finalize and close the recording."""
        if not self.running:
            return
        self.running = False
        try:
            if self.mode == 'ffmpeg' and self.process:
                self.process.stdin.close()
                self.process.wait(timeout=10)
            elif self.mode == 'opencv' and self.writer:
                self.writer.release()
        except Exception as e:
            print(f"[Recorder] Stop error: {e}")

        duration = round(time.time() - self.start_time, 1)
        print(
            f"[Recorder] Saved: {self.filepath} "
            f"({duration}s, {self.frame_count} frames)"
        )


# ── Filepath generator ───────────────────────────────────────────
def make_filepath(camera_id: str, event_type: str) -> str:
    cfg       = get_recording_config()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename  = f"{event_type}_{camera_id}_{timestamp}.mp4"
    return os.path.join(cfg["events_path"], filename)


# ── Main trigger function ────────────────────────────────────────
def trigger_recording(
    camera_id:   str,
    camera_name: str,
    event_type:  str,
    confidence:  float,
    pre_frames:  list
):
    """Trigger event recording — called when threat detected."""
    with _recording_lock:
        if camera_id in _active_recordings:
            existing = _active_recordings[camera_id]
            if existing.running:
                return   # Already recording
            del _active_recordings[camera_id]

    filepath = make_filepath(camera_id, event_type)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    def save_in_thread():
        from core.state import system_settings

        session = RecordingSession(
            camera_id   = camera_id,
            camera_name = camera_name,
            event_type  = event_type,
            confidence  = confidence,
            filepath    = filepath
        )

        with _recording_lock:
            _active_recordings[camera_id] = session

        # ── Add to list IMMEDIATELY ───────────────────────────
        rec_entry = {
            "id":          f"rec_{camera_id}_{int(time.time())}",
            "camera_id":   camera_id,
            "camera_name": camera_name,
            "event_type":  event_type,
            "confidence":  confidence,
            "filepath":    filepath,
            "filename":    os.path.basename(filepath),
            "timestamp":   datetime.now().strftime("%b %d, %H:%M %p"),
            "duration":    "Recording...",
            "size_mb":     0,
            "status":      "recording"
        }
        recordings_list.insert(0, rec_entry)
        if len(recordings_list) > 50:
            recordings_list.pop()

        print(f"[Recorder] Entry added to list: {event_type} @ {camera_name}")

        # ── Write pre-event frames ────────────────────────────
        print(f"[Recorder] Writing {len(pre_frames)} pre-event frames...")
        for item in pre_frames:
            if not session.running:
                break
            session.write_frame(item["frame"])

        # ── Wait for post-event frames ────────────────────────
        post_minutes = system_settings.get("post_event_minutes", 2)
        pre_minutes  = system_settings.get("pre_event_minutes",  2)
        max_wait     = post_minutes * 60 + 10
        waited       = 0
        while session.running and waited < max_wait:
            time.sleep(0.1)
            waited += 0.1

        session.stop()

        # ── Update entry after completion ─────────────────────
        filesize = 0
        if os.path.exists(filepath):
            filesize = round(
                os.path.getsize(filepath) / 1024 / 1024, 1
            )

        for entry in recordings_list:
            if entry["filename"] == os.path.basename(filepath):
                entry["duration"] = f"{pre_minutes + post_minutes}:00"
                entry["size_mb"]  = filesize
                entry["status"]   = "complete"
                break

        with _recording_lock:
            if camera_id in _active_recordings:
                del _active_recordings[camera_id]

        print(f"[Recorder] Complete: {event_type} @ {camera_name} ({filesize} MB)")

    threading.Thread(target=save_in_thread, daemon=True).start()


# ── Frame feeding ────────────────────────────────────────────────
def feed_frame_to_recorder(camera_id: str, frame):
    """Feed current frame to active recorder."""
    with _recording_lock:
        session = _active_recordings.get(camera_id)
    if session and session.running:
        session.write_frame(frame)


# ── Status checks ────────────────────────────────────────────────
def is_recording(camera_id: str) -> bool:
    with _recording_lock:
        session = _active_recordings.get(camera_id)
    return session is not None and session.running


def get_recordings_list():
    return recordings_list


def get_active_recordings():
    with _recording_lock:
        return {
            cam_id: {
                "running":     s.running,
                "event_type":  s.event_type,
                "frame_count": s.frame_count,
                "elapsed":     round(time.time() - s.start_time, 1)
            }
            for cam_id, s in _active_recordings.items()
        }


# ── Shutdown handler ─────────────────────────────────────────────
def stop_all_recordings():
    """Stop all active recordings cleanly on exit."""
    print("[Recorder] Stopping all active recordings...")
    with _recording_lock:
        sessions = list(_active_recordings.values())
    for session in sessions:
        try:
            session.stop()
            print(f"[Recorder] Stopped: {session.camera_id}")
        except Exception as e:
            print(f"[Recorder] Error stopping {session.camera_id}: {e}")
    print("[Recorder] All recordings stopped.")


# ── Register shutdown hooks ───────────────────────────────────────
atexit.register(stop_all_recordings)

def _signal_handler(sig, frame):
    stop_all_recordings()

signal.signal(signal.SIGTERM, _signal_handler)
try:
    signal.signal(signal.SIGBREAK, _signal_handler)
except AttributeError:
    pass
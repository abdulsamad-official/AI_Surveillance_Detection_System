from collections import deque
import time
import cv2
import threading

# ── Per-camera circular buffer ───────────────────────────────────
# { camera_id: deque of (timestamp, frame) }
_buffers     = {}
_buffer_lock = threading.Lock()

# Max frames per camera in RAM
# 8GB RAM — safe limit: 15fps x 60sec = 900 frames per camera
MAX_FRAMES = 900
FPS        = 15

def init_buffer(camera_id: str):
    """Create buffer for a camera if not exists."""
    with _buffer_lock:
        if camera_id not in _buffers:
            _buffers[camera_id] = deque(maxlen=MAX_FRAMES)
            print(f"[Buffer] Initialized for camera: {camera_id}")

def push_frame(camera_id: str, frame):
    """Add a frame to camera buffer."""
    if camera_id not in _buffers:
        init_buffer(camera_id)
    with _buffer_lock:
        _buffers[camera_id].append({
            "timestamp": time.time(),
            "frame":     frame.copy()
        })

def get_pre_event_frames(camera_id: str, seconds: int = 60):
    """
    Get frames from buffer going back N seconds.
    Used for pre-event recording.
    """
    if camera_id not in _buffers:
        return []

    cutoff = time.time() - seconds
    with _buffer_lock:
        frames = [
            f for f in _buffers[camera_id]
            if f["timestamp"] >= cutoff
        ]
    print(f"[Buffer] Pre-event frames for {camera_id}: {len(frames)}")
    return frames

def get_buffer_size(camera_id: str) -> int:
    """Return number of frames in buffer."""
    if camera_id not in _buffers:
        return 0
    with _buffer_lock:
        return len(_buffers[camera_id])

def clear_buffer(camera_id: str):
    """Clear buffer for a camera."""
    with _buffer_lock:
        if camera_id in _buffers:
            _buffers[camera_id].clear()
            print(f"[Buffer] Cleared for camera: {camera_id}")

def remove_buffer(camera_id: str):
    """Remove buffer when camera deleted."""
    with _buffer_lock:
        if camera_id in _buffers:
            del _buffers[camera_id]
            print(f"[Buffer] Removed for camera: {camera_id}")

def get_all_buffer_stats():
    """Return buffer stats for all cameras."""
    with _buffer_lock:
        return {
            cam_id: {
                "frames":    len(buf),
                "max":       MAX_FRAMES,
                "seconds":   round(len(buf) / FPS, 1),
                "usage_pct": round(len(buf) / MAX_FRAMES * 100, 1)
            }
            for cam_id, buf in _buffers.items()
        }
import os
import time
import threading
from datetime import datetime
from core.config import get_recording_config

# ── Active normal segments ───────────────────────────────────────
# { camera_id: SegmentWriter }
_active_segments = {}
_segment_lock    = threading.Lock()


class SegmentWriter:
    """
    Records 10-min normal segments.
    Auto-deleted if no threat detected.
    Kept if threat was detected during segment.
    """

    def __init__(self, camera_id: str, camera_name: str):
        import cv2
        cfg             = get_recording_config()
        self.camera_id  = camera_id
        self.camera_name = camera_name
        self.fps        = cfg["fps"]
        self.resolution = cfg["resolution"]
        self.max_frames = int(cfg["segment_minutes"] * 60 * self.fps)
        self.frame_count = 0
        self.has_threat  = False
        self.running     = True
        self.start_time  = time.time()
        self.writer      = None

        # File path
        ts       = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"segment_{camera_id}_{ts}.mp4"
        self.filepath = os.path.join(
            cfg["segments_path"], filename
        )
        os.makedirs(cfg["segments_path"], exist_ok=True)

        # Init writer
        try:
            import imageio_ffmpeg
            import subprocess
            ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
            w, h = self.resolution
            cmd = [
                ffmpeg_exe, '-y',
                '-f', 'rawvideo',
                '-vcodec', 'rawvideo',
                '-s', f'{w}x{h}',
                '-pix_fmt', 'bgr24',
                '-r', str(self.fps),
                '-i', 'pipe:0',
                '-vcodec', 'libx264',
                '-preset', 'ultrafast',
                '-pix_fmt', 'yuv420p',
                self.filepath
            ]
            self.process = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            self.mode = 'ffmpeg'
        except Exception:
            import cv2
            self.process = None
            self.mode    = 'opencv'
            fourcc       = cv2.VideoWriter_fourcc(*'mp4v')
            self.writer  = cv2.VideoWriter(
                self.filepath, fourcc,
                self.fps, self.resolution
            )

        print(f"[Segment] Started: {self.filepath}")

    def write_frame(self, frame):
        import cv2
        if not self.running:
            return False
        if self.frame_count >= self.max_frames:
            return False   # Segment full

        try:
            resized = cv2.resize(frame, self.resolution)
            if self.mode == 'ffmpeg' and self.process:
                self.process.stdin.write(resized.tobytes())
            elif self.mode == 'opencv' and self.writer:
                self.writer.write(resized)
            self.frame_count += 1
            return True
        except Exception as e:
            print(f"[Segment] Write error: {e}")
            return False

    def mark_threat(self):
        """Mark this segment as having a threat — don't delete."""
        self.has_threat = True

    def stop(self):
        """Stop writing and decide keep or delete."""
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
            print(f"[Segment] Stop error: {e}")

        # ── Auto-delete if no threat ──────────────────────────
        if not self.has_threat:
            try:
                if os.path.exists(self.filepath):
                    os.remove(self.filepath)
                    print(f"[Segment] Auto-deleted (no threat): {self.filepath}")
            except Exception as e:
                print(f"[Segment] Delete error: {e}")
        else:
            print(f"[Segment] Kept (threat detected): {self.filepath}")


def start_segment(camera_id: str, camera_name: str):
    """Start a new normal segment for a camera."""
    with _segment_lock:
        # Stop existing segment first
        existing = _active_segments.get(camera_id)
        if existing and existing.running:
            threading.Thread(
                target=existing.stop,
                daemon=True
            ).start()

        seg = SegmentWriter(camera_id, camera_name)
        _active_segments[camera_id] = seg
    return seg


def feed_segment_frame(camera_id: str, frame) -> bool:
    """
    Feed frame to active segment.
    Returns False when segment is full (need new segment).
    """
    with _segment_lock:
        seg = _active_segments.get(camera_id)
    if seg and seg.running:
        result = seg.write_frame(frame)
        if not result:
            # Segment full — start new one
            cam_name = seg.camera_name
            threading.Thread(
                target=seg.stop,
                daemon=True
            ).start()
            with _segment_lock:
                if camera_id in _active_segments:
                    del _active_segments[camera_id]
            # Start fresh segment
            threading.Thread(
                target=start_segment,
                args=(camera_id, cam_name),
                daemon=True
            ).start()
        return result
    return False


def mark_segment_threat(camera_id: str):
    """Mark current segment as having a threat."""
    with _segment_lock:
        seg = _active_segments.get(camera_id)
    if seg:
        seg.mark_threat()
        print(f"[Segment] Marked threat: {camera_id}")


def stop_segment(camera_id: str):
    """Stop segment for camera (on delete/offline)."""
    with _segment_lock:
        seg = _active_segments.pop(camera_id, None)
    if seg:
        threading.Thread(
            target=seg.stop,
            daemon=True
        ).start()


def stop_all_segments():
    """Stop all segments on shutdown."""
    with _segment_lock:
        segs = list(_active_segments.values())
        _active_segments.clear()
    for seg in segs:
        try:
            seg.stop()
        except Exception:
            pass
    print("[Segment] All segments stopped.")


def get_segment_stats():
    """Return stats for all active segments."""
    with _segment_lock:
        return {
            cam_id: {
                "frames":     seg.frame_count,
                "has_threat": seg.has_threat,
                "elapsed":    round(time.time() - seg.start_time, 1),
                "filepath":   seg.filepath
            }
            for cam_id, seg in _active_segments.items()
            if seg.running
        }
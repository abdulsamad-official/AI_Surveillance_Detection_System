import os
import cv2
import numpy as np
import time
from core.config import get_config

# ── Performance stats ────────────────────────────────────────────
_perf_stats = {
    "inference_times": [],
    "fps_history":     [],
    "frame_count":     0,
    "last_fps_time":   time.time(),
    "current_fps":     0.0,
    "avg_inference_ms":0.0,
    "skip_count":      0
}

def record_inference_time(ms: float):
    """Record inference time for stats."""
    _perf_stats["inference_times"].append(ms)
    # Keep last 50
    if len(_perf_stats["inference_times"]) > 50:
        _perf_stats["inference_times"].pop(0)
    _perf_stats["avg_inference_ms"] = round(
        sum(_perf_stats["inference_times"]) /
        len(_perf_stats["inference_times"]), 2
    )

def update_fps():
    """Calculate and update current FPS."""
    _perf_stats["frame_count"] += 1
    now     = time.time()
    elapsed = now - _perf_stats["last_fps_time"]

    if elapsed >= 1.0:
        fps = _perf_stats["frame_count"] / elapsed
        _perf_stats["current_fps"]     = round(fps, 1)
        _perf_stats["frame_count"]     = 0
        _perf_stats["last_fps_time"]   = now
        _perf_stats["fps_history"].append(round(fps, 1))
        if len(_perf_stats["fps_history"]) > 30:
            _perf_stats["fps_history"].pop(0)

def get_perf_stats():
    """Return current performance statistics."""
    return {
        "current_fps":       _perf_stats["current_fps"],
        "avg_inference_ms":  _perf_stats["avg_inference_ms"],
        "fps_history":       _perf_stats["fps_history"],
        "skip_count":        _perf_stats["skip_count"]
    }

def get_optimal_skip_frames(camera_count: int) -> int:
    """Simple fixed skip — don't overcomplicate."""
    import psutil
    cpu = psutil.cpu_percent(interval=None)

    if camera_count <= 1:
        return 2   # 1 camera — every 2nd frame
    elif camera_count <= 2:
        return 3   # 2 cameras — every 3rd frame
    elif camera_count <= 4:
        return 4   # 4 cameras — every 4th frame
    else:
        return 5
def preprocess_frame_optimized(frame, target_size: int = 416):
    """
    Optimized frame preprocessing:
    - Resize to smaller input (416 instead of 640)
    - Use faster interpolation
    - Normalize efficiently
    """
    # Resize with INTER_LINEAR (faster than default)
    resized = cv2.resize(
        frame,
        (target_size, target_size),
        interpolation=cv2.INTER_LINEAR
    )
    return resized

def convert_pt_to_onnx():
    """
    Convert PyTorch model to ONNX if not already converted.
    Run this once for faster inference.
    """
    cfg        = get_config()
    pt_path    = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "../models/yolo11m.pt"
    )
    onnx_path  = pt_path.replace(".pt", ".onnx")

    if os.path.exists(onnx_path):
        print(f"[Optimizer] ONNX already exists: {onnx_path}")
        return onnx_path

    if not os.path.exists(pt_path):
        print("[Optimizer] No PT model found to convert")
        return None

    try:
        print("[Optimizer] Converting PT → ONNX...")
        from ultralytics import YOLO
        model = YOLO(pt_path)
        model.export(format="onnx", imgsz=416, simplify=True)
        print(f"[Optimizer] Converted: {onnx_path}")
        return onnx_path
    except Exception as e:
        print(f"[Optimizer] Conversion failed: {e}")
        return None
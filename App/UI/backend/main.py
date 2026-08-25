import json
import os
import asyncio

import psutil
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.cameras    import router as cameras_router
from api.detections import router as detections_router
from api.websocket  import router as websocket_router
from api.websocket  import system_stats_broadcaster
# from api.users    import router as users_router   # uncomment when users module is ready
from core.state import (
    cameras, detection_summary, alerts,
    system_settings, alert_config,
    class_visibility, class_thresholds,
    email_config,
)
from utils.helpers import get_timestamp

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Brawl Detection System API",
    description="AI-powered real-time video analytics",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cameras_router)
app.include_router(detections_router)
app.include_router(websocket_router)
# app.include_router(users_router)

# ── Data file paths ───────────────────────────────────────────────────────────

BASE     = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE, "data")

FILES = {
    "cameras":          os.path.join(DATA_DIR, "cameras.json"),
    "summary":          os.path.join(DATA_DIR, "detection_summary.json"),
    "system_settings":  os.path.join(DATA_DIR, "system_settings.json"),
    "alert_config":     os.path.join(DATA_DIR, "alert_config.json"),
    "class_visibility": os.path.join(DATA_DIR, "class_visibility.json"),
    "class_thresholds": os.path.join(DATA_DIR, "class_thresholds.json"),
    "email_config":     os.path.join(DATA_DIR, "email_config.json"),
}

# ── Persistence helpers ───────────────────────────────────────────────────────

def save_all() -> None:
    """Persist every in-memory state dict to disk."""
    os.makedirs(DATA_DIR, exist_ok=True)
    try:
        pairs = [
            (FILES["cameras"],          dict(cameras)),
            (FILES["summary"],          dict(detection_summary)),
            (FILES["system_settings"],  dict(system_settings)),
            (FILES["alert_config"],     dict(alert_config)),
            (FILES["class_visibility"], dict(class_visibility)),
            (FILES["class_thresholds"], dict(class_thresholds)),
            (FILES["email_config"],     dict(email_config)),
        ]
        for path, payload in pairs:
            with open(path, "w") as f:
                json.dump(payload, f, indent=2)
        print("[Save] All settings saved to disk")
    except Exception as e:
        print(f"[Save] Failed: {e}")


def load_all() -> None:
    """Restore every state dict from disk on startup."""
    os.makedirs(DATA_DIR, exist_ok=True)

    def _load(key: str, target: dict, label: str) -> None:
        path = FILES[key]
        if not os.path.exists(path):
            return
        try:
            with open(path, "r") as f:
                target.update(json.load(f))
            print(f"[Load] {label} loaded")
        except Exception as e:
            print(f"[Load] {label} failed: {e}")

    _load("cameras",          cameras,          f"{0} cameras")  # overridden below for count
    _load("summary",          detection_summary, "Detection summary")
    _load("system_settings",  system_settings,   "System settings")
    _load("alert_config",     alert_config,       "Alert config")
    _load("class_visibility", class_visibility,   "Class visibility")
    _load("class_thresholds", class_thresholds,   "Class thresholds")
    _load("email_config",     email_config,       "Email config")

    # Log camera count properly
    if cameras:
        print(f"[Load] {len(cameras)} cameras loaded")

    # Seed summary defaults if file didn't exist
    if not os.path.exists(FILES["summary"]):
        detection_summary.update({
            "Normal": 0, "Phone": 0, "Medical_Mask": 0,
            "Fire":   0, "Smoke": 0, "Gun":          0,
            "Knife":  0, "Falling": 0, "Violence":   0,
            "Theft_Mask": 0,
        })

    # Show email password status
    pwd = email_config.get("sender_password", "")
    print(f"[Load] Email config — password: {'set' if pwd else 'not set'}")
    print("[Load] All settings restored successfully!")


async def auto_saver() -> None:
    """Background task: save everything every 30 seconds."""
    while True:
        await asyncio.sleep(30)
        save_all()

# ── Lifecycle ─────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    from core.state import add_log

    load_all()

    # Model warm-up in a daemon thread so startup is non-blocking
    try:
        import threading
        import numpy as np
        from core.model import load_model

        def warmup():
            model, model_type = load_model()
            if model is None:
                return
            print("[Model] Warming up...")
            try:
                dummy = np.zeros((480, 640, 3), dtype=np.uint8)
                if model_type == "pt":
                    model.predict(dummy, conf=0.5, verbose=False, imgsz=640)
                elif model_type == "onnx":
                    from core.inference import preprocess_onnx
                    inp  = preprocess_onnx(dummy)
                    name = model.get_inputs()[0].name
                    for _ in range(3):
                        model.run(None, {name: inp})
                print("[Model] Warmup complete!")
                add_log("SUCCESS", "Model", "Model warmed up and ready")
            except Exception as e:
                print(f"[Model] Warmup failed: {e}")

        threading.Thread(target=warmup, daemon=True).start()

    except ImportError:
        # core.model / core.inference not yet available — skip warmup
        print("[Model] Warmup skipped (module not found)")

    asyncio.create_task(system_stats_broadcaster())
    asyncio.create_task(auto_saver())

    add_log("SUCCESS", "System",    "Brawl Detection System started")
    add_log("INFO",    "Backend",   "FastAPI running on port 8000")
    add_log("INFO",    "Model",     "YOLO11m model loaded")
    add_log("INFO",    "WebSocket", "WebSocket broadcaster started")

    if cameras:
        add_log("INFO", "Camera", f"Restored {len(cameras)} cameras from disk")

    print("[System] Started successfully!")


@app.on_event("shutdown")
async def shutdown():
    from core.recorder        import stop_all_recordings
    from core.segment_manager import stop_all_segments
    from core.state           import add_log

    add_log("INFO", "System", "System shutting down — saving all data...")
    save_all()
    stop_all_recordings()
    stop_all_segments()
    print("[System] Shutdown complete — all data saved!")

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "status":  "Brawl Detection System Running",
        "version": "1.0.0",
        "docs":    "http://localhost:8000/docs",
    }


@app.get("/health")
def health():
    cpu  = psutil.cpu_percent(interval=None)
    mem  = psutil.virtual_memory().percent
    disk = psutil.disk_usage("C:\\")
    return {
        "status":        "healthy",
        "cpu_usage":     f"{cpu}%",
        "memory_usage":  f"{mem}%",
        "storage_used":  f"{round(disk.used  / (1024 ** 3), 1)} GB",
        "storage_total": f"{round(disk.total / (1024 ** 3), 1)} GB",
        "storage_pct":   f"{disk.percent}%",
        "cameras_online": sum(1 for c in cameras.values() if c["status"] == "online"),
        "total_cameras":  len(cameras),
        "timestamp":      get_timestamp(),
    }


@app.get("/stats")
def get_stats():
    return {
        "cameras_online":    sum(1 for c in cameras.values() if c["status"] == "online"),
        "cameras_total":     len(cameras),
        "total_detections":  sum(detection_summary.values()),
        "active_alerts":     sum(1 for a in alerts if not a.get("acknowledged", False)),
        "detection_summary": detection_summary,
    }
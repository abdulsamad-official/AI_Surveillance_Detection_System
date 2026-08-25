from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import uuid
import os
import json

from core.state import (
    class_thresholds, class_visibility,
    detections, alerts, detection_summary, cameras,
    alert_config, system_settings, system_logs,
    email_config, email_detection_counters,
    add_log,
)
from utils.helpers import get_timestamp, get_severity, get_threat_color

router = APIRouter(prefix="/detections", tags=["Detections"])

# ── Constants ─────────────────────────────────────────────────────────────────

ALL_CLASSES = [
    "Falling", "Fire", "Gun", "Knife", "Normal",
    "Smoke", "Violence", "Medical_Mask", "Phone", "Theft_Mask"
]

CLASS_COLORS = {
    "Normal":       "#22c55e",
    "Phone":        "#60a5fa",
    "Medical_Mask": "#34d399",
    "Fire":         "#fb923c",
    "Smoke":        "#94a3b8",
    "Gun":          "#f87171",
    "Knife":        "#facc15",
    "Falling":      "#a78bfa",
    "Violence":     "#f43f5e",
    "Theft_Mask":   "#fbbf24",
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def _data_path(filename: str) -> str:
    """Resolve a path under the backend/data/ directory."""
    return os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "data", filename,
    )


def _save_json(filename: str, payload: dict) -> None:
    """Persist a dict to a JSON file under data/; silently logs on failure."""
    try:
        with open(_data_path(filename), "w") as f:
            json.dump(payload, f, indent=2)
    except Exception as e:
        print(f"[Save] {filename}: {e}")


# ── Models ────────────────────────────────────────────────────────────────────

class DetectionCreate(BaseModel):
    camera_id:  str
    class_name: str
    confidence: float
    bbox:       Optional[list] = []

# ── Detections ────────────────────────────────────────────────────────────────

@router.get("/")
def get_detections(limit: int = 50):
    return {"success": True, "count": len(detections), "detections": detections[-limit:][::-1]}


@router.get("/summary")
def get_summary():
    filtered = {cls: count for cls, count in detection_summary.items() if class_visibility.get(cls, True)}
    return {"success": True, "summary": filtered, "total": sum(filtered.values())}


@router.post("/")
def add_detection(data: DetectionCreate):
    if data.camera_id not in cameras:
        raise HTTPException(status_code=404, detail="Camera not found")
    if not (0 <= data.confidence <= 1):
        raise HTTPException(status_code=400, detail="Confidence must be between 0 and 1")

    det_id   = str(uuid.uuid4())[:8]
    severity = alert_config["severity_map"].get(data.class_name, get_severity(data.class_name))
    color    = get_threat_color(data.class_name)
    ts       = get_timestamp()

    detection = {
        "id":          det_id,
        "camera_id":   data.camera_id,
        "camera_name": cameras[data.camera_id]["name"],
        "class_name":  data.class_name,
        "confidence":  round(data.confidence, 2),
        "severity":    severity,
        "color":       color,
        "bbox":        data.bbox,
        "timestamp":   ts,
    }
    detections.append(detection)
    cameras[data.camera_id]["detections"] += 1

    if alert_config["enabled_classes"].get(data.class_name, False):
        alert = {
            "id":           str(uuid.uuid4())[:8],
            "type":         data.class_name,
            "camera_id":    data.camera_id,
            "camera_name":  cameras[data.camera_id]["name"],
            "confidence":   round(data.confidence, 2),
            "severity":     severity,
            "color":        color,
            "timestamp":    ts,
            "acknowledged": False,
        }
        alerts.append(alert)
        print(f"[Alert] Created: {data.class_name} @ {cameras[data.camera_id]['name']}")

    return {"success": True, "detection": detection}

# ── Alerts ────────────────────────────────────────────────────────────────────

@router.get("/alerts")
def get_alerts(limit: int = 20):
    return {"success": True, "count": len(alerts), "alerts": alerts[-limit:][::-1]}


@router.get("/alerts/filter")
def get_alerts_filtered(severity: str = "all", cls: str = "all", limit: int = 50, search: str = ""):
    filtered = alerts.copy()
    if severity != "all":
        filtered = [a for a in filtered if a.get("severity", "").lower() == severity.lower()]
    if cls != "all":
        filtered = [a for a in filtered if a.get("type", "") == cls]
    if search:
        s = search.lower()
        filtered = [a for a in filtered if s in a.get("type", "").lower() or s in a.get("camera_name", "").lower()]
    return {"success": True, "count": len(filtered), "alerts": filtered[-limit:][::-1]}


@router.get("/alerts/config")
def get_alert_config():
    return {"success": True, "config": alert_config}


@router.put("/alerts/config")
def update_alert_config(data: dict):
    for key in ["enabled_classes", "severity_map", "sound_enabled", "email_enabled",
                "email_address", "telegram_enabled", "telegram_token", "telegram_chat_id"]:
        if key not in data:
            continue
        if key in ("enabled_classes", "severity_map"):
            alert_config[key].update(data[key])
        else:
            alert_config[key] = data[key]

    _save_json("alert_config.json", dict(alert_config))
    return {"success": True, "config": alert_config}


@router.put("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str):
    for alert in alerts:
        if alert["id"] == alert_id:
            alert["acknowledged"] = True
            return {"success": True, "message": "Alert acknowledged"}
    raise HTTPException(status_code=404, detail="Alert not found")


@router.delete("/alerts/clear")
def clear_all_alerts():
    alerts.clear()
    return {"success": True, "message": "All alerts cleared"}

# ── Settings ──────────────────────────────────────────────────────────────────

@router.get("/settings")
def get_settings():
    return {"success": True, "settings": system_settings}


@router.put("/settings")
def update_settings(data: dict):
    for key in ["pre_event_minutes", "post_event_minutes", "segment_minutes",
                "confidence_threshold", "detection_timeout"]:
        if key in data:
            system_settings[key] = data[key]

    _save_json("system_settings.json", dict(system_settings))
    return {"success": True, "settings": system_settings}

# ── Recordings ────────────────────────────────────────────────────────────────

@router.get("/recordings")
def get_recordings():
    from core.recorder import get_recordings_list
    recs = get_recordings_list()
    return {"success": True, "count": len(recs), "recordings": recs}


@router.get("/recordings/active")
def get_active():
    from core.recorder import get_active_recordings
    return {"success": True, "active": get_active_recordings()}


@router.get("/recordings/download/{filename}")
def download_recording(filename: str):
    from core.config import get_recording_config
    filepath = os.path.join(get_recording_config()["events_path"], filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path=filepath, filename=filename, media_type="video/mp4")

# ── Graphs ────────────────────────────────────────────────────────────────────

@router.get("/graphs/summary")
def graph_summary():
    return {
        "success": True,
        "data": [
            {"class_name": cls, "count": count, "color": CLASS_COLORS.get(cls, "#ffffff")}
            for cls, count in detection_summary.items()
        ]
    }


def _get_bucket_mins(hours: int) -> int:
    if hours <= 1:  return 1
    if hours <= 5:  return 5
    if hours <= 12: return 15
    return 30


def _build_buckets(cutoff: datetime, now: datetime, bucket_mins: int) -> list:
    buckets, current = [], cutoff
    while current <= now:
        buckets.append(current.strftime("%H:%M"))
        current += timedelta(minutes=bucket_mins)
    return buckets


@router.get("/graphs/confidence")
def graph_confidence(hours: int = 1):
    now, cutoff = datetime.now(), datetime.now() - timedelta(hours=hours)
    bucket_mins = _get_bucket_mins(hours)
    buckets     = _build_buckets(cutoff, now, bucket_mins)
    class_data  = {cls: {b: [] for b in buckets} for cls in ALL_CLASSES}

    for det in detections:
        cls = det.get("class_name", "")
        if cls not in ALL_CLASSES:
            continue
        try:
            ts = datetime.strptime(det.get("timestamp", ""), "%Y-%m-%d %H:%M:%S")
            if ts < cutoff:
                continue
            idx = int((ts - cutoff).total_seconds() / 60 / bucket_mins)
            if idx < len(buckets):
                class_data[cls][buckets[idx]].append(det.get("confidence", 0))
        except Exception:
            continue

    result = {
        cls: [
            {"time_label": b, "confidence": round(sum(v) / len(v), 2) if v else 0.0}
            for b, v in class_data[cls].items()
        ]
        for cls in ALL_CLASSES
    }
    return {"success": True, "hours": hours, "bucket_mins": bucket_mins, "labels": buckets, "classes": result}


@router.get("/graphs/timeline")
def graph_timeline(hours: int = 1):
    now, cutoff = datetime.now(), datetime.now() - timedelta(hours=hours)
    bm_map      = {1: 2, 5: 10, 12: 30}
    bucket_mins = next((v for k, v in bm_map.items() if hours <= k), 60)

    buckets, current = {}, cutoff
    while current <= now:
        buckets[current.strftime("%H:%M")] = 0
        current += timedelta(minutes=bucket_mins)

    for det in detections:
        try:
            ts = datetime.strptime(det.get("timestamp", ""), "%Y-%m-%d %H:%M:%S")
            if ts < cutoff:
                continue
            idx   = int((ts - cutoff).total_seconds() / 60 / bucket_mins)
            label = (cutoff + timedelta(minutes=idx * bucket_mins)).strftime("%H:%M")
            if label in buckets:
                buckets[label] += 1
        except Exception:
            continue

    labels, counts = list(buckets.keys()), list(buckets.values())
    return {"success": True, "hours": hours, "bucket_mins": bucket_mins,
            "labels": labels, "counts": counts, "total": sum(counts)}

# ── Email ─────────────────────────────────────────────────────────────────────

@router.get("/email/config")
def get_email_config():
    safe = {k: v for k, v in email_config.items() if k != "sender_password"}
    safe["password_set"] = bool(email_config.get("sender_password", ""))
    return {"success": True, "config": safe}


@router.put("/email/config")
def update_email_config(data: dict):
    for key in ["enabled", "sender_email", "sender_password",
                "receiver_email", "detection_count", "cooldown_minutes"]:
        if key in data:
            email_config[key] = data[key]

    _save_json("email_config.json", dict(email_config))

    status = "enabled" if email_config.get("enabled") else "disabled"
    add_log(
        "INFO", "Email",
        f"Email alert config updated — Status: {status}, "
        f"Trigger: {email_config.get('detection_count', 3)} detections, "
        f"Cooldown: {email_config.get('cooldown_minutes', 30)} min"
    )
    return {"success": True, "message": "Email config saved"}


@router.post("/email/test")
def test_email():
    from core.email_alert import send_email_alert

    cfg = email_config
    if not cfg.get("sender_email") or not cfg.get("sender_password"):
        raise HTTPException(status_code=400, detail="Email credentials not configured")
    if not cfg.get("receiver_email"):
        raise HTTPException(status_code=400, detail="Receiver email not set")

    success = send_email_alert(
        sender_email    = cfg["sender_email"],
        sender_password = cfg["sender_password"],
        receiver_email  = cfg["receiver_email"],
        class_name      = "TEST",
        camera_name     = "Test Camera",
        confidence      = 0.95,
        detection_count = cfg["detection_count"],
        timestamp       = datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    )

    if success:
        add_log("SUCCESS", "Email", f"Test email sent successfully to {cfg['receiver_email']}")
        return {"success": True, "message": "Test email sent!"}
    else:
        add_log("ERROR", "Email", "Test email FAILED — check Gmail credentials")
        raise HTTPException(status_code=500, detail="Failed — check Gmail credentials")


@router.delete("/email/counters/reset")
def reset_email_counters():
    email_detection_counters.clear()
    return {"success": True, "message": "Counters reset"}

# ── Logs ──────────────────────────────────────────────────────────────────────

@router.get("/logs")
def get_logs(level: str = "all", module: str = "all", limit: int = 100, search: str = ""):
    filtered = system_logs.copy()
    if level  != "all": filtered = [l for l in filtered if l["level"].lower()  == level.lower()]
    if module != "all": filtered = [l for l in filtered if l["module"].lower() == module.lower()]
    if search:
        s = search.lower()
        filtered = [l for l in filtered if s in l["message"].lower() or s in l["module"].lower()]
    return {"success": True, "count": len(filtered), "logs": filtered[-limit:][::-1]}


@router.delete("/logs/clear")
def clear_logs():
    system_logs.clear()
    add_log("INFO", "System", "Logs cleared by user")
    return {"success": True, "message": "Logs cleared"}

# ── Class config ──────────────────────────────────────────────────────────────

@router.get("/classes/visibility")
def get_visibility():
    return {"success": True, "visibility": class_visibility}


@router.put("/classes/visibility")
def update_visibility(data: dict):
    for cls, enabled in data.items():
        if cls in class_visibility:
            class_visibility[cls] = bool(enabled)
            print(f"[Class] {cls} -> {'enabled' if enabled else 'disabled'}")

    _save_json("class_visibility.json", dict(class_visibility))
    return {"success": True, "visibility": class_visibility}


@router.get("/classes/thresholds")
def get_thresholds():
    return {"success": True, "thresholds": class_thresholds}


@router.put("/classes/thresholds")
def update_thresholds(data: dict):
    for cls, val in data.items():
        if cls in class_thresholds:
            class_thresholds[cls] = round(float(val), 2)
            print(f"[Threshold] {cls} -> {val}")

    _save_json("class_thresholds.json", dict(class_thresholds))
    return {"success": True, "thresholds": class_thresholds}
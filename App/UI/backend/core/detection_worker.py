import asyncio
import httpx
from datetime import datetime

_last_detection = {}
_detection_cooldown = 2.0

async def send_detection_to_api(
    camera_id: str,
    class_name: str,
    confidence: float,
    bbox: list
):
    now  = datetime.now().timestamp()
    last = _last_detection.get(camera_id)

    # Skip if same class within cooldown
    if last:
        same_class   = last["class_name"] == class_name
        within_time  = (now - last["timestamp"]) < _detection_cooldown
        if same_class and within_time:
            return

    _last_detection[camera_id] = {
        "class_name": class_name,
        "confidence": confidence,
        "timestamp":  now
    }

    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            await client.post(
                "http://localhost:8000/detections/",
                json={
                    "camera_id":  camera_id,
                    "class_name": class_name,
                    "confidence": confidence,
                    "bbox":       bbox
                }
            )
    except Exception as e:
        print(f"[Detection Worker] Failed: {e}")

def get_last_detection(camera_id: str):
    return _last_detection.get(camera_id, {})
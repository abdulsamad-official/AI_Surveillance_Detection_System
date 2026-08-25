from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import asyncio
import json
import psutil
# import psutil
import os
from datetime import datetime

from core.state import cameras, detections, alerts, detection_summary, system_stats

router = APIRouter(tags=["WebSocket"])

# Connected clients list
connected_clients: List[WebSocket] = []

async def broadcast(message: dict):
    """Send message to all connected WebSocket clients."""
    if not connected_clients:
        return
    data = json.dumps(message)
    disconnected = []
    for client in connected_clients:
        try:
            await client.send_text(data)
        except Exception:
            disconnected.append(client)
    for c in disconnected:
        connected_clients.remove(c)

async def system_stats_broadcaster():
    while True:
        try:
            cpu = psutil.cpu_percent(interval=None)
            mem = psutil.virtual_memory().percent
            net = psutil.net_io_counters()

            # ── Real disk usage ───────────────────────────────
            disk = psutil.disk_usage('C:\\')
            storage_used  = round(disk.used  / (1024**3), 1)  # GB
            storage_total = round(disk.total / (1024**3), 1)  # GB

            from core.state import camera_last_detection
            cam_detections = {}
            for cam_id in cameras:
                det = camera_last_detection.get(cam_id, {})
                cam_detections[cam_id] = {
                    "class_name": det.get("class_name", "Normal"),
                    "confidence": det.get("confidence", 0.0),
                    "boxes":      det.get("boxes", [])
                }

            from core.state import detection_summary
            graph_summary = [
                {"class_name": cls, "count": count}
                for cls, count in detection_summary.items()
            ]

            from core.optimizer import get_perf_stats
            perf = get_perf_stats()

            stats = {
                "type":              "system_stats",
                "cpu_usage":         round(cpu, 1),
                "memory_usage":      round(mem, 1),
                "fps":               perf["current_fps"] or 0,
                "storage_used":      storage_used,
                "storage_total":     storage_total,
                "network_mbps":      round(
                    (net.bytes_sent + net.bytes_recv) / 1024 / 1024, 1
                ),
                "timestamp":         datetime.now().strftime("%H:%M:%S"),
                "cameras_online":    sum(1 for c in cameras.values() if c["status"] == "online"),
                "cameras_total":     len(cameras),
                "total_detections":  sum(detection_summary.values()),
                "active_alerts":     sum(1 for a in alerts if not a.get("acknowledged", False)),
                "detection_summary": detection_summary,
                "camera_detections": cam_detections,
                "graph_summary":     graph_summary
            }
            await broadcast(stats)
        except Exception as e:
            print(f"[WS Broadcaster Error]: {e}")
        await asyncio.sleep(1)

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    print(f"[WS] Client connected. Total: {len(connected_clients)}")

    # Send initial state immediately on connect
    try:
        initial = {
            "type": "initial_state",
            "cameras": list(cameras.values()),
            "detection_summary": detection_summary,
            "recent_alerts": alerts[-5:][::-1],
            "recent_detections": detections[-10:][::-1]
        }
        await websocket.send_text(json.dumps(initial))

        # Keep connection alive
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                msg = json.loads(data)
                # Handle ping
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except asyncio.TimeoutError:
                # Send heartbeat
                await websocket.send_text(json.dumps({"type": "heartbeat"}))

    except WebSocketDisconnect:
        connected_clients.remove(websocket)
        print(f"[WS] Client disconnected. Total: {len(connected_clients)}")
    except Exception as e:
        print(f"[WS] Error: {e}")
        if websocket in connected_clients:
            connected_clients.remove(websocket)
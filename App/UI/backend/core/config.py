import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CONFIG = {
    "system": {
        "version": "1.0.0",
        "debug":   True
    },
    "cameras": {
        "max_cameras": 6,
        "frame_skip":  2,
        "input_size":  [416, 416]
    },
    "model": {
        "path":                 os.path.join(BASE_DIR, "../models/yolo11m.onnx"),
        "confidence_threshold": 0.50,
        "classes": [
            "Normal", "Phone", "Medical_Mask",
            "Fire",   "Smoke", "Gun",
            "Knife",  "Falling", "Violence", "Theft_Mask"
        ]
    },
    "recording": {
        "pre_event_minutes":    10,
        "post_event_minutes":   10,
        "segment_minutes":      10,
        "events_path":    os.path.join(BASE_DIR, "../recordings/events/"),
        "segments_path":  os.path.join(BASE_DIR, "../recordings/segments/"),
        "max_ram_frames": 900,    # 30fps x 30sec buffer per camera
        "fps":            15,
        "resolution":     (640, 480),
        "format":         "mp4v"
    },
    "alerts": {
        "high_threat_classes":   ["Fire", "Gun", "Knife", "Violence"],
        "medium_threat_classes": ["Smoke", "Falling", "Theft_Mask"],
        "low_threat_classes":    ["Phone", "Medical_Mask"]
    }
}

def get_config():
    return CONFIG

def get_recording_config():
    return CONFIG["recording"]
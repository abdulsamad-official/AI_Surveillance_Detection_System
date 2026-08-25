from datetime import datetime

cameras               = {}
detections            = []
alerts                = []
recordings            = []
camera_last_detection = {}

system_stats = {
    "cpu_usage":        0.0,
    "memory_usage":     0.0,
    "fps":              0.0,
    "storage_used_gb":  256,
    "storage_total_gb": 512,
    "network_mbps":     0.0,
    "start_time":       datetime.now().isoformat()
}


# ── Class visibility — user controls which classes are active ────
class_visibility = {
    "Normal":   True,
    "Phone":    True,
    "Medical_Mask":   True,
    "Fire":     True,
    "Smoke":    True,
    "Gun":      True,
    "Knife":    True,
    "Falling":  True,
    "Violence": True,
    "Theft_Mask":  True
}

# ── Per-class confidence thresholds ─────────────────────────────
class_thresholds = {
    "Normal":   0.50,
    "Phone":    0.50,
    "Medical_Mask":   0.50,
    "Fire":     0.50,
    "Smoke":    0.50,
    "Gun":      0.50,
    "Knife":    0.50,
    "Falling":  0.50,
    "Violence": 0.50,
    "Theft_Mask":  0.50
}
# ── Email alert config ───────────────────────────────────────────
email_config = {
    "enabled":          False,
    "sender_email":     "",      # Gmail address
    "sender_password":  "",      # Gmail App Password
    "receiver_email":   "",      # Alert receive karne wala
    "detection_count":  3,       # Kitne detections ke baad email
    "cooldown_minutes": 30,      # Email ke beech minimum gap
}

# Per-class detection counters for email
email_detection_counters = {}
# Format: { "camera_id_classname": { count, last_email_time } }

detection_summary = {
    "Falling":  0,
    "Fire":     0,
    "Gun":      0,
    "Knife":    0,
    "Normal":   0,
    "Smoke":    0,
    "Violence": 0,
    "Medical_Mask":   0,
    "Phone":    0,
    "Theft_Mask":  0
}

system_settings = {
    "pre_event_minutes":    2,
    "post_event_minutes":   2,
    "segment_minutes":      10,
    "confidence_threshold": 0.50,
    "detection_timeout":    10   # ← NEW — seconds before reset to Normal
}

# ── Alert configuration — user can customize ─────────────────────
alert_config = {
    "enabled_classes": {
        "Falling":  True,
        "Fire":     True,
        "Gun":      True,
        "Knife":    True,
        "Normal":   False,
        "Smoke":    True,
        "Violence": True,
        "Medical_Mask":   False,
        "Phone":    False,
        "Theft_Mask":  True,
    },
    "severity_map": {
        "Falling":  "Medium",
        "Fire":     "High",
        "Gun":      "High",
        "Knife":    "High",
        "Normal":   "Low",
        "Smoke":    "Medium",
        "Violence": "High",
        "Medical_Mask":   "Low",
        "Phone":    "Low",
        "Theft_Mask":  "Medium"
    },
    "sound_enabled":    True,
    "email_enabled":    False,
    "email_address":    "",
    "telegram_enabled": False,
    "telegram_token":   "",
    "telegram_chat_id": ""
}
# Add at bottom of state.py
system_logs = []   # List of log entries

def add_log(level: str, module: str, message: str):
    """Add a log entry."""
    from datetime import datetime
    system_logs.append({
        "id":        len(system_logs) + 1,
        "level":     level,    # INFO, WARNING, ERROR, SUCCESS
        "module":    module,
        "message":   message,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })
    # Keep last 500 logs
    if len(system_logs) > 500:
        system_logs.pop(0)


from datetime import datetime

def get_timestamp():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def get_severity(class_name: str) -> str:
    high   = ["Fire", "Gun", "Knife", "Violence"]
    medium = ["Smoke", "Falling", "Theft_Mask"]
    if class_name in high:
        return "High"
    elif class_name in medium:
        return "Medium"
    return "Low"

def get_threat_color(class_name: str) -> str:
    colors = {
        "Normal":   "#22c55e",
        "Phone":    "#60a5fa",
        "Medical_Mask":   "#34d399",
        "Fire":     "#fb923c",
        "Smoke":    "#94a3b8",
        "Gun":      "#f87171",
        "Knife":    "#facc15",
        "Falling":  "#a78bfa",
        "Violence": "#f43f5e",
        "Theft_Mask":  "#fbbf24"
    }
    return colors.get(class_name, "#ffffff")
def format_camera(camera: dict) -> dict:
    return {
        "id":         camera["id"],
        "name":       camera["name"],
        "source":     camera["source"],
        "status":     camera["status"],
        "location":   camera.get("location",   "Unknown"),
        "added_at":   camera.get("added_at",   get_timestamp()),
        "detections": camera.get("detections", 0),
        "last_class": camera.get("last_class", "Normal"),
        "last_conf":  camera.get("last_conf",  0.0)
    }
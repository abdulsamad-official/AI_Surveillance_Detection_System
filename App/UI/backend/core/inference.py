import cv2
import numpy as np
import time

from core.model import load_model, get_classes
from core.optimizer import record_inference_time, preprocess_frame_optimized

# ── Try importing per-class thresholds (graceful fallback) ────────────────────
try:
    from core.state import class_thresholds as _class_thresholds
except ImportError:
    _class_thresholds = {}

def _get_class_thresholds():
    """Always fetch the latest class_thresholds from core.state (live dict)."""
    try:
        from core.state import class_thresholds
        return class_thresholds
    except ImportError:
        return {}

# ── Visual config ─────────────────────────────────────────────────────────────
CLASS_COLORS = {
    "Normal":       (34,  197,  94),
    "Phone":        (96,  165, 250),
    "Medical_Mask": (52,  211, 153),
    "Fire":         (249, 115,  22),
    "Smoke":        (148, 163, 184),
    "Gun":          (248, 113, 113),
    "Knife":        (250, 204,  21),
    "Falling":      (167, 139, 250),
    "Violence":     (168,  85, 247),
    "Theft_Mask":   (251, 191,  36),
}

THREAT_CLASSES = [
    "Fire", "Gun", "Knife",
    "Violence", "Smoke", "Falling", "Theft_Mask"
]

THREAT_CLASSES_SET = set(THREAT_CLASSES)

# ── Smoothing state per camera ────────────────────────────────────────────────
_smooth_boxes: dict[str, list] = {}


def smooth_boxes(source: str, new_boxes: list, alpha: float = 0.5) -> list:
    """
    Exponential moving average smoothing on bounding box coordinates.
    alpha: 0.0 = fully old, 1.0 = fully new.
    If box count changes, resets to new_boxes immediately.
    """
    prev = _smooth_boxes.get(source, [])

    if not prev or len(prev) != len(new_boxes):
        _smooth_boxes[source] = new_boxes
        return new_boxes

    smoothed = []
    for i, nb in enumerate(new_boxes):
        pb = prev[i]
        smoothed.append({
            "class_name": nb["class_name"],
            "confidence": nb["confidence"],
            "bbox": [
                int(pb["bbox"][0] * (1 - alpha) + nb["bbox"][0] * alpha),
                int(pb["bbox"][1] * (1 - alpha) + nb["bbox"][1] * alpha),
                int(pb["bbox"][2] * (1 - alpha) + nb["bbox"][2] * alpha),
                int(pb["bbox"][3] * (1 - alpha) + nb["bbox"][3] * alpha),
            ],
        })

    _smooth_boxes[source] = smoothed
    return smoothed


# ── ONNX helpers ──────────────────────────────────────────────────────────────
def preprocess_onnx(frame: np.ndarray, input_size: int = 640) -> np.ndarray:
    img = cv2.resize(frame, (input_size, input_size))
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = img.astype(np.float32) / 255.0
    img = np.transpose(img, (2, 0, 1))
    return np.expand_dims(img, axis=0)


def postprocess_onnx(
    outputs,
    orig_shape,
    input_size: int = 640,
    conf_thresh: float = 0.50,
) -> list:
    classes    = get_classes()
    detections = []

    try:
        output = outputs[0]
        if output.ndim == 3:
            output = output[0]
        output = output.T

        h_orig, w_orig = orig_shape[:2]
        scale_x = w_orig / input_size
        scale_y = h_orig / input_size

        for row in output:
            scores     = row[4:]
            class_id   = int(np.argmax(scores))
            confidence = float(scores[class_id])

            if confidence < conf_thresh:
                continue

            cx, cy, bw, bh = row[:4]
            x1 = max(0, min(int((cx - bw / 2) * scale_x), w_orig))
            y1 = max(0, min(int((cy - bh / 2) * scale_y), h_orig))
            x2 = max(0, min(int((cx + bw / 2) * scale_x), w_orig))
            y2 = max(0, min(int((cy + bh / 2) * scale_y), h_orig))

            if x2 <= x1 or y2 <= y1:
                continue

            class_name = classes[class_id] if class_id < len(classes) else "Unknown"
            detections.append({
                "class_name": class_name,
                "confidence": round(confidence, 2),
                "bbox":       [x1, y1, x2, y2],
            })

    except Exception as e:
        print(f"[Postprocess] Error: {e}")

    return detections


# ── Main inference ────────────────────────────────────────────────────────────
def run_inference(
    frame,
    conf_thresh: float = 0.50,
    source_key: str = "default",
):
    """
    Run detection on a single frame.

    Per-class thresholds (from core.state.class_thresholds) override
    the global conf_thresh when available.  The model is queried at the
    minimum configured threshold so no detection is dropped too early.

    Returns
    -------
    annotated : np.ndarray  — frame with drawn detections
    detections : list[dict] — filtered, smoothed detections
    """
    model, model_type = load_model()
    if model is None:
        return frame, []

    class_thresholds = _get_class_thresholds()

    # Effective minimum threshold — use the lowest per-class value so the
    # model has a chance to surface every candidate before per-class filtering.
    if class_thresholds:
        min_thresh = min(class_thresholds.values())
    else:
        min_thresh = conf_thresh

    detections = []
    start_time = time.time()

    try:
        # ── PyTorch (.pt) path ────────────────────────────────────────────
        if model_type == "pt":
            results = model.predict(
                frame,
                conf=min_thresh,
                verbose=False,
                imgsz=640,
            )
            classes = get_classes()
            for result in results:
                for box in result.boxes:
                    class_id   = int(box.cls[0])
                    confidence = float(box.conf[0])
                    class_name = classes[class_id] if class_id < len(classes) else "Unknown"

                    # Per-class threshold filter
                    cls_thresh = class_thresholds.get(class_name, conf_thresh)
                    if confidence < cls_thresh:
                        continue

                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    detections.append({
                        "class_name": class_name,
                        "confidence": round(confidence, 2),
                        "bbox":       [x1, y1, x2, y2],
                    })

        # ── ONNX path ─────────────────────────────────────────────────────
        elif model_type == "onnx":
            input_name = model.get_inputs()[0].name
            inp        = preprocess_onnx(frame)
            outputs    = model.run(None, {input_name: inp})
            raw_dets   = postprocess_onnx(
                outputs, frame.shape, conf_thresh=min_thresh
            )

            # Per-class threshold filter
            for d in raw_dets:
                cls_thresh = class_thresholds.get(d["class_name"], conf_thresh)
                if d["confidence"] >= cls_thresh:
                    detections.append(d)

    except Exception as e:
        print(f"[Inference] Error: {e}")
        return frame, []

    # ── Timing ────────────────────────────────────────────────────────────────
    elapsed_ms = (time.time() - start_time) * 1000
    record_inference_time(elapsed_ms)

    # ── Smoothing (threats and normals tracked separately) ────────────────────
    if detections:
        threat_dets = [d for d in detections if d["class_name"] in THREAT_CLASSES_SET]
        normal_dets = [d for d in detections if d["class_name"] not in THREAT_CLASSES_SET]

        if threat_dets:
            threat_dets = smooth_boxes(source_key, threat_dets, alpha=0.6)

        detections = threat_dets + normal_dets
    else:
        _smooth_boxes.pop(source_key, None)

    annotated = draw_detections(frame.copy(), detections)
    return annotated, detections


# ── Drawing ───────────────────────────────────────────────────────────────────
def draw_detections(frame: np.ndarray, detections: list) -> np.ndarray:
    """Draw stable, styled bounding boxes with per-class colour and threat accents."""
    for det in detections:
        class_name = det["class_name"]
        confidence = det["confidence"]
        x1, y1, x2, y2 = det["bbox"]

        color     = CLASS_COLORS.get(class_name, (255, 255, 255))
        is_threat = class_name in THREAT_CLASSES_SET
        thickness = 3 if is_threat else 2

        # Main rectangle
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, thickness)

        # Corner accent lines for threat classes
        if is_threat:
            corner_len = min(20, (x2 - x1) // 4, (y2 - y1) // 4)
            corners = [
                ((x1, y1), ( 1,  1)),   # top-left
                ((x2, y1), (-1,  1)),   # top-right
                ((x1, y2), ( 1, -1)),   # bottom-left
                ((x2, y2), (-1, -1)),   # bottom-right
            ]
            for (cx, cy), (dx, dy) in corners:
                cv2.line(frame, (cx, cy), (cx + dx * corner_len, cy),           color, 3)
                cv2.line(frame, (cx, cy), (cx,           cy + dy * corner_len), color, 3)

        # Label
        label      = f"{class_name} {confidence:.2f}"
        font       = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.45
        font_thick = 1
        (tw, th), _ = cv2.getTextSize(label, font, font_scale, font_thick)

        pad = 4
        lx1 = x1
        ly1 = max(0, y1 - th - pad * 2)
        lx2 = x1 + tw + pad * 2
        ly2 = y1

        cv2.rectangle(frame, (lx1, ly1), (lx2, ly2), color, -1)
        cv2.putText(
            frame, label,
            (lx1 + pad, ly2 - pad),
            font, font_scale,
            (0, 0, 0),
            font_thick,
            cv2.LINE_AA,
        )

    return frame
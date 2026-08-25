import os
import cv2
import numpy as np

# ── Model state ──────────────────────────────────────────────────
_model      = None
_model_type = None   # "pt" or "onnx"
_classes = [
    "Falling", "Gun", "Knife", "Normal", "Violence", "Medical_Mask", "Phone", "Theft_Mask", "Fire",
    "Smoke"
]
#   0: Falling
#   1: Gun
#   2: Knife
#   3: Normal
#   4: Violence
#   5: Medical_Mask
#   6: Phone
#   7: Theft_Mask
#   8: Fire
#   9: Smoke

BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR  = os.path.join(BASE_DIR, "..", "models")

def get_model_path():
    """Find available model file — prefer ONNX for speed."""
    onnx_path = os.path.join(MODELS_DIR, "last.onnx")
    pt_path   = os.path.join(MODELS_DIR, r"C:\Users\Sami\Desktop\Samad Files\University\FYP\Project\final_system\UI\models\Updated_model\brawl_s.pt")

    if os.path.exists(onnx_path):
        return onnx_path, "onnx"
    elif os.path.exists(pt_path):
        return pt_path, "pt"
    return None, None

def load_model():
    global _model, _model_type

    if _model is not None:
        return _model, _model_type

    model_path, model_type = get_model_path()

    if model_path is None:
        print("[Model] WARNING: No model file found.")
        return None, None

    print(f"[Model] Loading {model_type.upper()}: {model_path}")

    try:
        if model_type == "pt":
            from ultralytics import YOLO
            _model = YOLO(model_path)

            # ── Speed optimizations ───────────────────────────
            _model.overrides['verbose'] = False
            _model.overrides['half']    = False  # CPU — no half precision

            _model_type = "pt"
            print("[Model] PT model loaded.")

        elif model_type == "onnx":
            import onnxruntime as ort
            opts = ort.SessionOptions()
            opts.graph_optimization_level = (
                ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            )
            opts.intra_op_num_threads = 4   # Use 4 CPU threads
            opts.inter_op_num_threads = 2

            _model = ort.InferenceSession(
                model_path,
                sess_options=opts,
                providers=["CPUExecutionProvider"]
            )
            _model_type = "onnx"
            print("[Model] ONNX model loaded.")

    except Exception as e:
        print(f"[Model] Failed: {e}")
        return None, None

    return _model, _model_type
def get_classes():
    return _classes

def is_model_loaded():
    return _model is not None
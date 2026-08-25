from ultralytics import YOLO

model = YOLO(r"C:\Users\Sami\Desktop\Samad Files\FYP\Project\final_system\UI\models\last.pt")
model.export(format="onnx")
from ultralytics import YOLO

# Load previous trained model
model = YOLO(r"C:\Users\Sami\Downloads\Brawl2.0\epoch125\last.pt")

# Continue training
results = model.train(
    data=r"C:\Users\Sami\Desktop\Samad Files\FYP\Project\final_system\Final_data\data.yaml",
    epochs=26,          # continue from 100 -> 125
    imgsz=640,
    batch=4,
    # device=[0, 1],

    # Important for resume-like behavior
    warmup_epochs=0
)
# 🚨 Brawl Detection System (Real-Time Video Threat Detection)

The **Brawl Detection System** is an AI-powered video analytics prototype designed for real-time safety and security monitoring. It transforms passive CCTV monitoring into an active decision-support system by detecting surveillance events—such as brawls, weapons, fire, and falls—using a custom YOLO11 model. 

The system accepts various video sources (Webcam, RTSP, HTTP, video files), processes frames in near real-time, and pushes structured alerts, evidence recordings, and email notifications directly to a React dashboard via WebSocket.

**Developed by:** Abdul Samad <br>


---

## 📑 Table of Contents
1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Installation](#installation)
6. [Usage](#usage)
7. [Screenshots/Demo](#screenshotsdemo)
8. [API Documentation](#api-documentation)
9. [Future Improvements](#future-improvements)

---

## 📖 Project Overview

Traditional CCTV systems rely heavily on human operators, who can suffer from fatigue and distraction when monitoring multiple feeds. The Brawl Detection System was built to solve this by analyzing every available frame and highlighting scenes that require immediate review.

**Model Evolution & Decision Making:**
The project initially started with an **LSTM-based action-recognition** approach. While conceptually strong, the sequence pipeline introduced a 3–5 second alert delay, failing the real-time requirement. 
Two experimental models were compared:
*   **Direct-Image Classifier:** High fight recall but too many false positives (115 FP).
*   **YOLO-Pose Skeleton Classifier:** Reduced false positives to 95 but added pose-extraction processing overhead.

**Final Selection:** **YOLO11** was chosen for the deployed architecture. It provides faster direct frame-based inference, localized bounding boxes, multi-class support, and seamless integration with the live dashboard.

### Detection Classes & Severity
| ID | Class | Severity | System Action |
|:---|:---|:---|:---|
| 0 | Normal | Low | Display and count |
| 1 | Phone | Low | Display and count |
| 2 | Medical Mask | Low | Display and count |
| 3 | Fire | **High** | Immediate alert, evidence recording, email |
| 4 | Smoke | Medium | Visible review alert |
| 5 | Gun | **High** | Immediate alert, evidence recording, email |
| 6 | Knife | **High** | Immediate alert, evidence recording, email |
| 7 | Falling | Medium | Visible review alert |
| 8 | Violence / Brawl | **High** | Immediate alert, evidence recording, email |
| 9 | Theft Mask | Medium | Visible review alert |

---

## ✨ Features

- **Multi-Source Input:** Supports webcams, RTSP streams, HTTP streams, and uploaded video files.
- **Real-Time YOLO11 Detection:** 10-class custom object/action detection with bounding boxes and confidence scores.
- **Live React Dashboard:** Responsive grid layout displaying live camera feeds, class labels, confidence levels, and timestamps.
- **Severity-Based Alerts:** Automated dashboard alerts for high/medium risk events with cooldown logic to prevent duplicate spam.
- **Evidence Recording:** Automatically saves video clips of high-risk incidents for operator review.
- **Email Notifications:** Configurable SMTP alerts sent directly to monitoring personnel with incident details.
- **Analytics & Charts:** Visual representation of detection counts and confidence trends using Chart.js.

---

## 🛠 Tech Stack

**Frontend**
- React.js
- Tailwind CSS
- Chart.js
- WebSocket (Client)

**Backend**
- Python
- FastAPI
- OpenCV (Frame capture & processing)
- NumPy
- WebSocket (Server)

**AI & Machine Learning**
- YOLO11 (Ultralytics)
- Kaggle GPU (Training environment)
- Custom 10-class dataset (Annotated in YOLO format)

**Environment**
- OS: Windows 11
- Hardware: Mechrevo Core i7

---

## 🏗 Architecture

The system follows a modular, layered architecture to ensure maintainability and near-real-time performance:

1. **Input Layer:** OpenCV captures frames from various registered video sources.
2. **Processing Layer:** Frames are resized/normalized and passed to the YOLO11 model for inference. Non-Maximum Suppression (NMS) and confidence thresholding filter the results.
3. **Application Layer:** FastAPI manages camera workers, applies severity rules, controls recording logic, and triggers email notifications.
4. **Communication Layer:** REST APIs handle discrete commands (add/remove cameras), while WebSocket handles continuous live-updates to the frontend without page refreshes.
5. **Presentation Layer:** React dashboard renders camera cards, alerts, graphs, and recordings.
6. **Storage Layer:** Stores `best.pt` model weights, configuration files, logs, and evidence clips.

---

## ⚙️ Installation

### Prerequisites
- **Python** (Supported version) & `pip`
- **Node.js** & `npm`
- **Git**
- Trained YOLO11 weight file (`best.pt`)

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/brawl-detection-system.git
cd brawl-detection-system
```

### Step 2: Backend Setup
Place your trained model at `runs/detect/train/weights/best.pt` or update the path in your configuration.

```bash
cd backend
python -m venv fyp
fyp\Scripts\activate       # On Windows
# source fyp/bin/activate # On Mac/Linux
pip install -r requirements.txt
```

**Environment Variables (`.env`):**
Create a `.env` file in the backend directory:
```env
MODEL_PATH=runs/detect/train/weights/best.pt
CONFIDENCE_THRESHOLD=0.50
BACKEND_PORT=8000
RECORDINGS_DIR=recordings
ALERT_EMAIL=monitor@example.com
EMAIL_COOLDOWN_SECONDS=60
# Add SMTP credentials securely
```

### Step 3: Frontend Setup
```bash
cd ../frontend
npm install
```

---

## 🚀 Usage

### 1. Start the Backend Server
From the `backend` directory (with your virtual environment activated):
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```
*Verify backend health by visiting `http://localhost:8000/health`.*

### 2. Start the Frontend Dashboard
From the `frontend` directory:
```bash
npm run dev   # or npm start
```
*Open the browser address provided (usually `http://localhost:3000`).*

### 3. Operating the Dashboard
1. Click **Add Camera**.
2. Enter a readable name (e.g., "Main Gate").
3. Choose the source type (Webcam, Video, RTSP, HTTP, Custom).
4. Provide the required path/URL/index.
5. Click **Add Camera** and monitor the live feed, alerts, and charts.
6. Trigger test events (e.g., using test videos containing fire or weapons) to see alerts, recordings, and email statuses in action.

---

## 📸 Screenshots/Demo

### 1. Dashboard Overview
![Dashboard Overview](https://z-cdn-media.chatglm.cn/files/3a54d0b7-31a1-4116-be69-93a4ca5aee32.png?auth_key=1887654413-75bf4cc45e5d420195c91126e4c63065-0-f9ce9a1c3bb354dc1d7f8ca62e23daf7)
*The integrated React dashboard showing live camera status, detection summaries, and alert panels in a clean, dark-themed UI.*

### 2. Multi-Camera Live Monitoring
![Multi-Camera Monitoring](https://z-cdn-media.chatglm.cn/files/3c9dc313-74a0-4e93-93da-0149ba35d5aa.png?auth_key=1887654413-43dac1053d9c404998fd4e5a8e837b1a-0-23c47e824d2e600b3f886777b4fd15b8)
*System actively monitoring multiple camera feeds (main, roadside, left_Corner) simultaneously, with active alerts and comprehensive detection statistics.*

### 3. Real-Time Detection Evidence (Fire & Knife)
![Detection Evidence](https://z-cdn-media.chatglm.cn/files/df3b3e88-4d9f-4529-a8a8-71b12aa77c61.png?auth_key=1887654413-e1b3e36386694165aefdfcd6f1fded09-0-fee890cffbdc18b896b08c42ad0911be)
*YOLO11 drawing bounding boxes for Fire (0.54 confidence) and Knife (0.67 confidence) in real-time.*

### 4. Add Camera Dialog
![Add Camera Dialog](https://z-cdn-media.chatglm.cn/files/7d859f13-5c5f-4986-acd8-db17760125f2.png?auth_key=1887654413-60d0012ac39e48b4b99ceda48279ccd2-0-2402f199ee46d1543f67099891302f0e)
*Source selection, webcam integration, and validation interface for adding new cameras to the monitoring grid.*

---

## 📡 API Documentation

The backend exposes the following REST endpoints and WebSocket channels:

| Endpoint / Channel | Method | Purpose | Expected Result |
|:---|:---|:---|:---|
| `/health` | `GET` | Check backend and model availability | System status response |
| `/cameras` | `POST` | Register a new camera source | Camera worker created |
| `/cameras` | `GET` | List configured sources | Camera states returned |
| `/cameras/{id}` | `DELETE` | Stop and remove a source | Resources released safely |
| `/ws` | `WebSocket` | Live camera & detection events | Dashboard updates without refresh |

**WebSocket Message Payload Example:**
```json
{
  "camera": "Main_Gate",
  "camera_id": "cam_01",
  "class": "Knife",
  "confidence": 0.67,
  "severity": "High",
  "timestamp": "2026-06-29 02:28:00",
  "recording": "clip_cam01_0228.mp4",
  "email_status": "sent"
}
```

---

## 🚀 Future Improvements

While the YOLO11 model successfully meets the real-time latency requirements, the following improvements are planned for future iterations:

- **Hybrid Verification System:** Implement a lightweight temporal or YOLO-Pose verifier to run *after* the initial YOLO11 alert to reduce false positives without delaying the first warning.
- **Person Tracking & Re-identification:** Track individuals across frames and multiple cameras.
- **Class-Specific Thresholds:** Fine-tune confidence thresholds independently for difficult classes (e.g., Smoke vs. Fire, Phone vs. Gun).
- **Dashboard Enhancements:** Role-based access control (RBAC), camera map locations, alert acknowledgement, and mobile push notifications.
- **Production Deployment:** Containerize the backend (Docker), deploy on dedicated GPU servers, and encrypt stored evidence.

---
*This project was submitted as a partial requirement for the degree of BS (Computer Science) at Allama Iqbal Open University.*
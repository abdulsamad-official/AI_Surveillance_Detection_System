import smtplib
import threading
import time
from email.mime.text       import MIMEText
from email.mime.multipart  import MIMEMultipart
from datetime              import datetime

# ── Email send lock ──────────────────────────────────────────────
_email_lock = threading.Lock()

def send_email_alert(
    sender_email:    str,
    sender_password: str,
    receiver_email:  str,
    class_name:      str,
    camera_name:     str,
    confidence:      float,
    detection_count: int,
    timestamp:       str
):
    """Send threat alert email via Gmail SMTP — free."""

    subject = f"🚨 BRAWL DETECTION ALERT — {class_name} Detected!"

    # ── HTML Email body ───────────────────────────────────────
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background:#0a0e1a; color:#e2e8f0; padding:20px;">

      <div style="max-width:600px; margin:0 auto; background:#111827;
                  border-radius:12px; overflow:hidden;
                  border:1px solid #1e2d47;">

        <!-- Header -->
        <div style="background:#ef4444; padding:20px; text-align:center;">
          <h1 style="color:#fff; margin:0; font-size:22px;">
            🚨 THREAT DETECTED
          </h1>
          <p style="color:#fca5a5; margin:5px 0 0; font-size:14px;">
            Real-Time Brawl Detection System
          </p>
        </div>

        <!-- Content -->
        <div style="padding:24px;">

          <!-- Alert box -->
          <div style="background:#450a0a; border:1px solid #7f1d1d;
                      border-radius:8px; padding:16px; margin-bottom:20px;">
            <h2 style="color:#f87171; margin:0 0 8px; font-size:18px;">
              ⚠ {class_name} Detected — {detection_count} Times
            </h2>
            <p style="color:#fca5a5; margin:0; font-size:13px;">
              This alert was triggered after {detection_count} consecutive detections.
            </p>
          </div>

          <!-- Details table -->
          <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
            <tr style="background:#151d2e;">
              <td style="padding:10px 14px; color:#94a3b8; font-size:12px; width:40%;">
                📷 Camera
              </td>
              <td style="padding:10px 14px; color:#e2e8f0; font-size:13px; font-weight:bold;">
                {camera_name}
              </td>
            </tr>
            <tr>
              <td style="padding:10px 14px; color:#94a3b8; font-size:12px;">
                🎯 Detection Class
              </td>
              <td style="padding:10px 14px; color:#f87171; font-size:13px; font-weight:bold;">
                {class_name}
              </td>
            </tr>
            <tr style="background:#151d2e;">
              <td style="padding:10px 14px; color:#94a3b8; font-size:12px;">
                📊 Confidence
              </td>
              <td style="padding:10px 14px; color:#e2e8f0; font-size:13px;">
                {confidence:.0%}
              </td>
            </tr>
            <tr>
              <td style="padding:10px 14px; color:#94a3b8; font-size:12px;">
                🔢 Detection Count
              </td>
              <td style="padding:10px 14px; color:#fbbf24; font-size:13px; font-weight:bold;">
                {detection_count} detections
              </td>
            </tr>
            <tr style="background:#151d2e;">
              <td style="padding:10px 14px; color:#94a3b8; font-size:12px;">
                🕐 Time
              </td>
              <td style="padding:10px 14px; color:#e2e8f0; font-size:13px;">
                {timestamp}
              </td>
            </tr>
          </table>

          <!-- Action note -->
          <div style="background:#1e3a5f; border:1px solid #253550;
                      border-radius:8px; padding:14px;">
            <p style="color:#60a5fa; margin:0; font-size:12px;">
              ℹ Please review the camera footage immediately.
              Log into the Brawl Detection System dashboard
              for more details and recordings.
            </p>
          </div>

        </div>

        <!-- Footer -->
        <div style="background:#0a0e1a; padding:14px; text-align:center;
                    border-top:1px solid #1e2d47;">
          <p style="color:#475569; margin:0; font-size:11px;">
            Real-Time Brawl Detection System v1.0.0
            — Automated Alert
          </p>
        </div>

      </div>
    </body>
    </html>
    """

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From']    = sender_email
        msg['To']      = receiver_email

        # Plain text fallback
        text = (
            f"THREAT ALERT: {class_name} detected {detection_count} times\n"
            f"Camera: {camera_name}\n"
            f"Confidence: {confidence:.0%}\n"
            f"Time: {timestamp}"
        )
        msg.attach(MIMEText(text, 'plain'))
        msg.attach(MIMEText(html, 'html'))

        # ── Send via Gmail SMTP ───────────────────────────────
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, receiver_email, msg.as_string())

        print(f"[Email] Sent: {class_name} alert to {receiver_email}")
        return True

    except smtplib.SMTPAuthenticationError:
        print("[Email] Auth failed — check Gmail App Password")
        return False
    except smtplib.SMTPException as e:
        print(f"[Email] SMTP error: {e}")
        return False
    except Exception as e:
        print(f"[Email] Failed: {e}")
        return False


def check_and_send_email(
    camera_id:   str,
    camera_name: str,
    class_name:  str,
    confidence:  float
):
    """
    Check detection count — send email if threshold reached.
    Called from fire_detection.
    """
    from core.state import (
        email_config,
        email_detection_counters,
        alert_config
    )

    # Email disabled
    if not email_config.get("enabled", False):
        return

    # Check class is enabled for alerts
    if not alert_config["enabled_classes"].get(class_name, False):
        return

    cfg           = email_config
    sender        = cfg.get("sender_email",    "")
    password      = cfg.get("sender_password", "")
    receiver      = cfg.get("receiver_email",  "")
    needed_count  = int(cfg.get("detection_count",  3))
    cooldown_mins = int(cfg.get("cooldown_minutes", 30))

    if not sender or not password or not receiver:
        return

    # ── Counter key per camera+class ─────────────────────────
    key = f"{camera_id}_{class_name}"
    now = time.time()

    with _email_lock:
        if key not in email_detection_counters:
            email_detection_counters[key] = {
                "count":           0,
                "last_email_time": 0,
                "window_start":    now
            }

        entry = email_detection_counters[key]

        # Reset counter if window expired (5 minutes)
        if now - entry["window_start"] > 300:
            entry["count"]        = 0
            entry["window_start"] = now

        entry["count"] += 1
        current_count   = entry["count"]

        # Check if we need to send
        if current_count < needed_count:
            return

        # Check cooldown
        time_since_last = now - entry["last_email_time"]
        if time_since_last < (cooldown_mins * 60):
            remaining = int((cooldown_mins * 60 - time_since_last) / 60)
            print(
                f"[Email] Cooldown active — {remaining}min left "
                f"for {class_name}"
            )
            return

        # ── Send email in background thread ──────────────────
        entry["last_email_time"] = now
        entry["count"]           = 0   # Reset counter
        entry["window_start"]    = now

    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def send_bg():
        success = send_email_alert(
            sender_email    = sender,
            sender_password = password,
            receiver_email  = receiver,
            class_name      = class_name,
            camera_name     = camera_name,
            confidence      = confidence,
            detection_count = needed_count,
            timestamp       = ts
    )

        # ── Add to system logs ────────────────────────────────
        try:
            from core.state import add_log
            if success:
                add_log(
                    "SUCCESS",
                    "Email",
                    f"Alert email sent — {class_name} detected "
                    f"{needed_count}x on '{camera_name}' "
                    f"(conf: {confidence:.0%}) → {receiver}"
                )
            else:
                add_log(
                    "ERROR",
                    "Email",
                    f"Email failed — {class_name} alert "
                    f"could not be sent to {receiver}"
                )
        except Exception:
            pass

    threading.Thread(target=send_bg, daemon=True).start()
    print(
        f"[Email] Triggered: {class_name} x{needed_count} "
        f"@ {camera_name}"
    )
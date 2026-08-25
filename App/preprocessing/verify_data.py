"""
YOLO Dataset Verification Script
==================================
- Draws bounding boxes on images for every annotation
- Shows 5 sample images per class
- Generates a self-contained HTML report you can open in any browser
- Also prints a summary: image counts, label counts, missing files, class distribution

Classes (after removing 'person'):
  0: Falling        1: Fire          2: Gun
  3: Knife          4: Normal        5: Phone
  6: Smoke          7: Violence      8: medicinal mask
  9: theft mask

HOW TO USE:
  1. Set DATASET_ROOT below
  2. Run: python verify_dataset.py
  3. Open  verify_report.html  in your browser
"""

import os
import random
import base64
import io
from pathlib import Path
from collections import defaultdict

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Installing Pillow...")
    os.system("pip install Pillow")
    from PIL import Image, ImageDraw, ImageFont

# ─── CONFIGURATION ─────────────────────────────────────────────────────────

DATASET_ROOT = r"C:\Users\Sami\Desktop\Samad Files\FYP\Project\final_system\dataset\Final_Mega_Data"   # <-- CHANGE THIS

# How many sample images to show per class
SAMPLES_PER_CLASS = 5

# Which splits to include
SPLITS = ["train", "valid", "test"]

# Output HTML report path
OUTPUT_HTML = os.path.join(DATASET_ROOT, "verify_report.html")

# Class names (nc=10 after removing 'person')
CLASS_NAMES = [
    "Falling",        # 0
    "Gun",           # 1
    "Knife",            # 2
    "Normal",         # 4
    "Violence",          # 5
    "Medical_Mask",          # 6
    "Phone", # 8
    "Theft_Mask",     # 9
    "Fire",           # 3
    "Smoke",          # 7
]

#  0: Falling
#   1: Gun
#   2: Knife
#   3: Normal
#   4: Violence
#   5: Medical_Mask
#   6: Phone
#   7: Theft_Mask
#   8: Fire
#   9: Smoke

# Distinct colors per class (BGR-style but we use RGB here)
COLORS = [
    (255, 56,  56),   # 0 Falling      - red
    (255, 157,  0),   # 1 Fire         - orange
    (255, 255,  0),   # 2 Gun          - yellow
    (0,   255, 56),   # 3 Knife        - green
    (0,   255, 255),  # 4 Normal       - cyan
    (0,   112, 255),  # 5 Phone        - blue
    (170,   0, 255),  # 6 Smoke        - purple
    (255,   0, 255),  # 7 Violence     - magenta
    (255, 128, 128),  # 8 med mask     - pink
    (128, 255, 128),  # 9 theft mask   - light green
]

IMG_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}

# ───────────────────────────────────────────────────────────────────────────


def load_label(lbl_path: Path):
    """Returns list of (class_id, cx, cy, w, h)."""
    anns = []
    if not lbl_path.exists():
        return anns
    with open(lbl_path) as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) == 5:
                anns.append((int(parts[0]), float(parts[1]), float(parts[2]),
                              float(parts[3]), float(parts[4])))
    return anns


def draw_boxes(img: Image.Image, anns, class_names, colors):
    """Draw YOLO bounding boxes on a PIL image."""
    draw = ImageDraw.Draw(img)
    W, H = img.size

    try:
        font = ImageFont.truetype("arial.ttf", max(12, H // 40))
    except:
        font = ImageFont.load_default()

    for (cid, cx, cy, bw, bh) in anns:
        x1 = int((cx - bw / 2) * W)
        y1 = int((cy - bh / 2) * H)
        x2 = int((cx + bw / 2) * W)
        y2 = int((cy + bh / 2) * H)

        color = colors[cid % len(colors)]
        label = class_names[cid] if cid < len(class_names) else f"cls{cid}"

        # Box
        draw.rectangle([x1, y1, x2, y2], outline=color, width=3)

        # Label background
        try:
            bbox = font.getbbox(label)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        except:
            tw, th = len(label) * 7, 12

        draw.rectangle([x1, y1 - th - 4, x1 + tw + 6, y1], fill=color)
        draw.text((x1 + 3, y1 - th - 2), label, fill=(0, 0, 0), font=font)

    return img


def img_to_base64(img: Image.Image, max_size=400) -> str:
    """Resize and convert PIL image to base64 string for HTML embedding."""
    img = img.copy()
    img.thumbnail((max_size, max_size), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()


def collect_data(dataset_root, splits):
    """
    Returns:
      class_samples: {class_id: [(img_path, lbl_path, split), ...]}
      stats: detailed counts
    """
    class_samples = defaultdict(list)
    stats = {
        "splits": {},
        "total_images": 0,
        "total_annotations": 0,
        "missing_labels": 0,
        "missing_images": 0,
        "class_counts": defaultdict(int),
        "invalid_class_ids": [],
    }

    root = Path(dataset_root)

    for split in splits:
        img_dir = root / split / "images"
        lbl_dir = root / split / "labels"

        if not img_dir.exists():
            continue

        images = sorted([p for p in img_dir.iterdir() if p.suffix.lower() in IMG_EXTENSIONS])
        split_stats = {"images": len(images), "labels": 0, "missing_labels": 0, "annotations": 0}

        for img_path in images:
            lbl_path = lbl_dir / (img_path.stem + ".txt")
            anns = load_label(lbl_path)

            if not lbl_path.exists():
                split_stats["missing_labels"] += 1
                stats["missing_labels"] += 1
            else:
                split_stats["labels"] += 1

            split_stats["annotations"] += len(anns)
            stats["total_annotations"] += len(anns)

            for ann in anns:
                cid = ann[0]
                if cid < len(CLASS_NAMES):
                    stats["class_counts"][cid] += 1
                    class_samples[cid].append((img_path, lbl_path, split))
                else:
                    stats["invalid_class_ids"].append((cid, str(img_path)))

        stats["splits"][split] = split_stats
        stats["total_images"] += len(images)

    return class_samples, stats


def build_html(class_samples, stats, samples_per_class, class_names, colors):
    """Build a self-contained HTML report."""

    # ── Summary table ──────────────────────────────────────────────────────
    split_rows = ""
    for split, s in stats["splits"].items():
        split_rows += f"""
        <tr>
          <td>{split}</td>
          <td>{s['images']}</td>
          <td>{s['labels']}</td>
          <td class="{'warn' if s['missing_labels'] else ''}">{s['missing_labels']}</td>
          <td>{s['annotations']}</td>
        </tr>"""

    class_rows = ""
    for cid, name in enumerate(class_names):
        count = stats["class_counts"].get(cid, 0)
        color = colors[cid % len(colors)]
        hex_color = "#{:02x}{:02x}{:02x}".format(*color)
        class_rows += f"""
        <tr>
          <td><span class="badge" style="background:{hex_color}">{cid}</span></td>
          <td>{name}</td>
          <td>{count}</td>
          <td>{'✅' if count > 0 else '❌ No samples!'}</td>
        </tr>"""

    invalid_warn = ""
    if stats["invalid_class_ids"]:
        invalid_warn = f"""
        <div class="alert">
          ⚠️ Found {len(stats['invalid_class_ids'])} annotations with INVALID class IDs
          (outside 0-{len(class_names)-1})! Check your label files.
        </div>"""

    # ── Per-class image grids ──────────────────────────────────────────────
    class_sections = ""
    for cid, name in enumerate(class_names):
        samples = class_samples.get(cid, [])
        color = colors[cid % len(colors)]
        hex_color = "#{:02x}{:02x}{:02x}".format(*color)

        if not samples:
            class_sections += f"""
            <div class="class-section">
              <h2 style="border-left:6px solid {hex_color}">
                <span class="badge" style="background:{hex_color}">{cid}</span> {name}
                <span class="no-data">No images found!</span>
              </h2>
            </div>"""
            continue

        # Pick up to SAMPLES_PER_CLASS random samples
        picked = random.sample(samples, min(samples_per_class, len(samples)))

        img_cards = ""
        for img_path, lbl_path, split in picked:
            try:
                img = Image.open(img_path).convert("RGB")
                anns = load_label(lbl_path)
                # Draw only the boxes for THIS class to keep it clean
                # (but show all boxes so context is visible)
                img = draw_boxes(img, anns, class_names, colors)
                b64 = img_to_base64(img)
                ann_count = sum(1 for a in anns if a[0] == cid)
                img_cards += f"""
                <div class="img-card">
                  <img src="data:image/jpeg;base64,{b64}" alt="{img_path.name}">
                  <div class="img-info">
                    <b>{img_path.name}</b><br>
                    Split: {split} | Annotations: {ann_count}
                  </div>
                </div>"""
            except Exception as e:
                img_cards += f'<div class="img-card error">Error loading {img_path.name}: {e}</div>'

        class_sections += f"""
        <div class="class-section">
          <h2 style="border-left:6px solid {hex_color}">
            <span class="badge" style="background:{hex_color}">{cid}</span>
            {name}
            <span class="count-pill">{stats['class_counts'].get(cid,0)} annotations</span>
          </h2>
          <div class="img-grid">{img_cards}</div>
        </div>"""

    # ── Assemble full HTML ─────────────────────────────────────────────────
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>YOLO Dataset Verification Report</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: 'Segoe UI', sans-serif;
    background: #0f1117;
    color: #e2e8f0;
    padding: 24px;
  }}
  h1 {{ font-size: 28px; margin-bottom: 6px; color: #f8fafc; }}
  .subtitle {{ color: #94a3b8; margin-bottom: 32px; font-size: 14px; }}
  h2 {{
    font-size: 20px; padding: 10px 16px;
    border-radius: 6px;
    background: #1e2230;
    margin-bottom: 14px;
    display: flex; align-items: center; gap: 10px;
    border-left-width: 6px; border-left-style: solid;
  }}
  .badge {{
    display: inline-block;
    padding: 2px 10px; border-radius: 20px;
    font-size: 13px; font-weight: 700; color: #000;
  }}
  .count-pill {{
    margin-left: auto; font-size: 13px;
    background: #2d3448; color: #94a3b8;
    padding: 3px 12px; border-radius: 20px;
  }}
  .no-data {{
    margin-left: auto; font-size: 13px; color: #f87171;
    background: #2d1a1a; padding: 3px 12px; border-radius: 20px;
  }}
  table {{
    width: 100%; border-collapse: collapse;
    background: #1e2230; border-radius: 8px;
    overflow: hidden; margin-bottom: 28px;
  }}
  th {{
    background: #2d3448; padding: 10px 16px;
    text-align: left; font-size: 13px;
    color: #94a3b8; text-transform: uppercase;
  }}
  td {{ padding: 10px 16px; border-top: 1px solid #2d3448; font-size: 14px; }}
  tr:hover td {{ background: #252b3b; }}
  .warn {{ color: #f87171; font-weight: 700; }}
  .alert {{
    background: #2d1a1a; border: 1px solid #f87171;
    color: #f87171; padding: 12px 16px;
    border-radius: 8px; margin-bottom: 20px;
  }}
  .class-section {{ margin-bottom: 40px; }}
  .img-grid {{
    display: flex; flex-wrap: wrap; gap: 12px;
  }}
  .img-card {{
    background: #1e2230; border-radius: 8px;
    overflow: hidden; width: 200px;
    border: 1px solid #2d3448;
  }}
  .img-card img {{ width: 100%; display: block; }}
  .img-info {{
    padding: 8px; font-size: 11px;
    color: #94a3b8; line-height: 1.5;
  }}
  .img-card.error {{
    padding: 12px; color: #f87171; font-size: 12px;
  }}
  .section-title {{
    font-size: 22px; font-weight: 700;
    margin: 32px 0 16px; color: #f8fafc;
    border-bottom: 1px solid #2d3448; padding-bottom: 8px;
  }}
</style>
</head>
<body>

<h1>🔍 YOLO Dataset Verification Report</h1>
<p class="subtitle">Dataset: {DATASET_ROOT} &nbsp;|&nbsp; {stats['total_images']} images &nbsp;|&nbsp; {stats['total_annotations']} annotations &nbsp;|&nbsp; {len(class_names)} classes</p>

{invalid_warn}

<div class="section-title">📊 Split Summary</div>
<table>
  <thead><tr><th>Split</th><th>Images</th><th>Label Files</th><th>Missing Labels</th><th>Annotations</th></tr></thead>
  <tbody>{split_rows}</tbody>
</table>

<div class="section-title">📋 Class Distribution</div>
<table>
  <thead><tr><th>ID</th><th>Class Name</th><th>Total Annotations</th><th>Status</th></tr></thead>
  <tbody>{class_rows}</tbody>
</table>

<div class="section-title">🖼️ Sample Images per Class ({samples_per_class} each)</div>
{class_sections}

</body>
</html>"""
    return html


def main():
    print("=" * 60)
    print("  YOLO Dataset Verification")
    print(f"  Root: {DATASET_ROOT}")
    print("=" * 60)

    root = Path(DATASET_ROOT)
    if not root.exists():
        print(f"\nERROR: Folder not found: {DATASET_ROOT}")
        print("Please update DATASET_ROOT in the script.")
        return

    print("\n📂 Scanning dataset...")
    class_samples, stats = collect_data(DATASET_ROOT, SPLITS)

    # Print console summary
    print(f"\n  Total images     : {stats['total_images']}")
    print(f"  Total annotations: {stats['total_annotations']}")
    print(f"  Missing labels   : {stats['missing_labels']}")

    print("\n  Class distribution:")
    for cid, name in enumerate(CLASS_NAMES):
        count = stats["class_counts"].get(cid, 0)
        bar = "█" * min(40, count // max(1, stats["total_annotations"] // 40))
        status = "✅" if count > 0 else "❌"
        print(f"    {status} [{cid:2d}] {name:<20s} {count:>6} {bar}")

    if stats["invalid_class_ids"]:
        print(f"\n  ⚠️  WARNING: {len(stats['invalid_class_ids'])} invalid class IDs found!")

    print("\n🖼️  Drawing bounding boxes and building HTML report...")
    html = build_html(class_samples, stats, SAMPLES_PER_CLASS, CLASS_NAMES, COLORS)

    with open(OUTPUT_HTML, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"\n✅ Report saved to:\n   {OUTPUT_HTML}")
    print("\nOpen verify_report.html in your browser to view it.")
    print("=" * 60)


if __name__ == "__main__":
    main()
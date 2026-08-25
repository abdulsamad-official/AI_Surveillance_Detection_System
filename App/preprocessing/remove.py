"""
Safe Class Removal Script for YOLO Dataset
==========================================
Removes the 'person' class (index 9) from your dataset and:
  1. Counts all images containing 'person' annotations
  2. Deletes those images + their label files
  3. Remaps remaining class indices so no class is skipped
  4. Updates the YAML file with the new class list

Original classes (11 total):
  0: Falling
  1: Fire
  2: Gun
  3: Knife
  4: Normal
  5: Phone
  6: Smoke
  7: Violence
  8: medicinal mask
  9: person          <-- REMOVING THIS
  10: theft mask

After removal (10 total):
  0: Falling
  1: Fire
  2: Gun
  3: Knife
  4: Normal
  5: Phone
  6: Smoke
  7: Violence
  8: medicinal mask
  9: theft mask      <-- was 10, now remapped to 9

HOW TO USE:
  1. Place this script anywhere on your machine
  2. Edit DATASET_ROOT below to point to your dataset folder
  3. Run:  python remove_class_safe.py
  4. Check the printed summary before the script deletes anything
     (dry_run=True by default — set to False to actually delete)
"""

import os
import shutil
import yaml
from pathlib import Path
from collections import defaultdict

# ─── CONFIGURATION ────────────────────────────────────────────────────────────

# Root folder that contains train/, valid/, test/ subfolders
DATASET_ROOT = r"C:\Users\Sami\Desktop\Samad Files\FYP\Project\final_system\Final_data"   # <-- CHANGE THIS

# Path to your data.yaml
YAML_PATH = os.path.join(DATASET_ROOT, "data.yaml")

# Class index to REMOVE
REMOVE_CLASS_INDEX = 9   # 'person'

# Set to False when you're ready to actually delete files
DRY_RUN = False

# ──────────────────────────────────────────────────────────────────────────────


def find_splits(dataset_root):
    """Find train/valid/test image+label directories."""
    splits = {}
    for split in ["train", "valid", "test"]:
        img_dir = Path(dataset_root) / split / "images"
        lbl_dir = Path(dataset_root) / split / "labels"
        if img_dir.exists():
            splits[split] = {"images": img_dir, "labels": lbl_dir}
    return splits


def get_label_path(img_path: Path, label_dir: Path) -> Path:
    """Return the label file path corresponding to an image."""
    return label_dir / (img_path.stem + ".txt")


def parse_label_file(label_path: Path):
    """Return list of (class_id, x, y, w, h) tuples."""
    annotations = []
    if not label_path.exists():
        return annotations
    with open(label_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split()
            if len(parts) == 5:
                annotations.append((int(parts[0]), *parts[1:]))
    return annotations


def remap_class(class_id: int, remove_idx: int) -> int | None:
    """
    Returns the new class id after removing remove_idx.
    Returns None if the annotation should be dropped (it IS the removed class).
    """
    if class_id == remove_idx:
        return None
    if class_id > remove_idx:
        return class_id - 1
    return class_id


def process_split(split_name, dirs, remove_idx, dry_run):
    img_dir: Path = dirs["images"]
    lbl_dir: Path = dirs["labels"]

    img_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}
    all_images = [p for p in img_dir.iterdir() if p.suffix.lower() in img_extensions]

    stats = {
        "total_images": len(all_images),
        "images_with_removed_class": 0,
        "images_deleted": 0,
        "labels_deleted": 0,
        "labels_rewritten": 0,
        "annotations_removed": 0,
    }

    images_to_delete = []
    labels_to_rewrite = {}   # img_path -> new label lines

    for img_path in all_images:
        lbl_path = get_label_path(img_path, lbl_dir)
        annotations = parse_label_file(lbl_path)

        has_removed = any(a[0] == remove_idx for a in annotations)
        remaining = [(remap_class(a[0], remove_idx), *a[1:]) for a in annotations]
        remaining = [a for a in remaining if a[0] is not None]

        if has_removed:
            stats["images_with_removed_class"] += 1
            stats["annotations_removed"] += sum(1 for a in annotations if a[0] == remove_idx)

        if has_removed and len(remaining) == 0:
            # Image only had 'person' annotations → delete image + label
            images_to_delete.append((img_path, lbl_path))
        else:
            # Rewrite the label file with remapped indices
            new_lines = [f"{a[0]} {a[1]} {a[2]} {a[3]} {a[4]}" for a in remaining]
            labels_to_rewrite[lbl_path] = new_lines

    # ── Execute ────────────────────────────────────────────────────────────────
    print(f"\n  [{split_name}] {stats['total_images']} images total")
    print(f"  [{split_name}] {stats['images_with_removed_class']} images contain 'person'")
    print(f"  [{split_name}] {len(images_to_delete)} images will be DELETED (only had 'person')")
    print(f"  [{split_name}] {len(labels_to_rewrite)} label files will be rewritten (class indices remapped)")

    if not dry_run:
        for img_path, lbl_path in images_to_delete:
            img_path.unlink(missing_ok=True)
            lbl_path.unlink(missing_ok=True)
            stats["images_deleted"] += 1
            stats["labels_deleted"] += 1

        for lbl_path, lines in labels_to_rewrite.items():
            with open(lbl_path, "w") as f:
                f.write("\n".join(lines) + ("\n" if lines else ""))
            stats["labels_rewritten"] += 1
    else:
        print(f"  [DRY RUN] No files modified. Set DRY_RUN=False to apply changes.")

    return stats


def update_yaml(yaml_path, remove_idx, dry_run):
    with open(yaml_path) as f:
        data = yaml.safe_load(f)

    old_names = data["names"]
    removed_name = old_names[remove_idx]
    new_names = [n for i, n in enumerate(old_names) if i != remove_idx]

    print(f"\n  [YAML] Removing class '{removed_name}' (index {remove_idx})")
    print(f"  [YAML] Old nc={data['nc']}, New nc={len(new_names)}")
    print(f"  [YAML] New class list:")
    for i, n in enumerate(new_names):
        print(f"         {i}: {n}")

    data["names"] = new_names
    data["nc"] = len(new_names)

    if not dry_run:
        # Backup original
        backup = yaml_path.replace(".yaml", "_BACKUP.yaml")
        shutil.copy(yaml_path, backup)
        print(f"  [YAML] Backed up original to {backup}")
        with open(yaml_path, "w") as f:
            yaml.dump(data, f, allow_unicode=True, sort_keys=False)
        print(f"  [YAML] Updated {yaml_path}")
    else:
        print(f"  [DRY RUN] YAML not modified.")


def main():
    print("=" * 60)
    print("  YOLO Class Removal Script")
    print(f"  Removing class index {REMOVE_CLASS_INDEX} ('person')")
    print(f"  DRY_RUN = {DRY_RUN}")
    print("=" * 60)

    if not os.path.exists(DATASET_ROOT):
        print(f"\nERROR: DATASET_ROOT not found: {DATASET_ROOT}")
        print("Please update DATASET_ROOT in this script and try again.")
        return

    splits = find_splits(DATASET_ROOT)
    if not splits:
        print("ERROR: No train/valid/test image folders found under DATASET_ROOT.")
        return

    total_person_images = 0
    for split_name, dirs in splits.items():
        stats = process_split(split_name, dirs, REMOVE_CLASS_INDEX, DRY_RUN)
        total_person_images += stats["images_with_removed_class"]

    update_yaml(YAML_PATH, REMOVE_CLASS_INDEX, DRY_RUN)

    print("\n" + "=" * 60)
    if DRY_RUN:
        print("  DRY RUN COMPLETE — no files were changed.")
        print("  Review the counts above, then set DRY_RUN=False and re-run.")
    else:
        print("  DONE. Dataset updated successfully.")
        print("  - 'person' class removed")
        print("  - 'theft mask' (was index 10) is now index 9")
        print("  - 'medicinal mask' stays at index 8")
        print("  - YAML updated with nc=10 and new names list")
    print("=" * 60)


if __name__ == "__main__":
    main()
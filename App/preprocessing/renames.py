"""
Dataset Rename Script
=====================
Renames all images and their corresponding label files to:
  i00001.jpg, i00001.txt
  i00002.jpg, i00002.txt
  ...

Structure expected:
  Final_data/
    train/images/  & train/labels/
    valid/images/  & valid/labels/
    test/images/   & test/labels/

Each split is numbered independently:
  train  → i00001 ... i0XXXX
  valid  → i00001 ... i0XXXX
  test   → i00001 ... i0XXXX

HOW TO USE:
  1. Set DATASET_ROOT to your Final_data folder path
  2. Run with DRY_RUN = True first to preview
  3. Set DRY_RUN = False to apply
"""

import os
from pathlib import Path

# ─── CONFIGURATION ────────────────────────────────────────────────────────────

DATASET_ROOT = r"C:\Users\Sami\Desktop\Samad Files\FYP\Project\final_system\Final_data"   # <-- CHANGE THIS

# Each split starts numbering from 1
# Set to False when ready to actually rename
DRY_RUN = False

# ──────────────────────────────────────────────────────────────────────────────

IMG_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}


def rename_split(split_name: str, img_dir: Path, lbl_dir: Path, dry_run: bool):
    if not img_dir.exists():
        print(f"  [{split_name}] images folder not found, skipping.")
        return

    # Get all images sorted for consistent ordering
    images = sorted([p for p in img_dir.iterdir() if p.suffix.lower() in IMG_EXTENSIONS])

    if not images:
        print(f"  [{split_name}] No images found.")
        return

    print(f"\n  [{split_name}] Found {len(images)} images")

    # ── Step 1: Rename to temp names first to avoid conflicts ─────────────────
    # e.g. if we rename i00001 → i00002, and i00002 already exists, we'd lose data
    # Solution: rename everything to a temp name first, then to final name

    temp_pairs = []   # (temp_img, temp_lbl, final_img_name, final_lbl_name)

    for idx, img_path in enumerate(images, start=1):
        final_name = f"i{idx:05d}"
        final_img  = final_name + img_path.suffix.lower()
        final_lbl  = final_name + ".txt"

        temp_img = img_dir / f"__temp_{idx:05d}{img_path.suffix.lower()}"
        temp_lbl = lbl_dir / f"__temp_{idx:05d}.txt"

        lbl_path = lbl_dir / (img_path.stem + ".txt")

        temp_pairs.append({
            "orig_img": img_path,
            "orig_lbl": lbl_path,
            "temp_img": temp_img,
            "temp_lbl": temp_lbl,
            "final_img": img_dir / final_img,
            "final_lbl": lbl_dir / final_lbl,
            "final_name": final_name,
        })

    if dry_run:
        print(f"  [{split_name}] DRY RUN — preview of first 5 renames:")
        for p in temp_pairs[:5]:
            print(f"    {p['orig_img'].name:40s} → {p['final_img'].name}")
            if p['orig_lbl'].exists():
                print(f"    {p['orig_lbl'].name:40s} → {p['final_lbl'].name}")
            else:
                print(f"    {'(no label file)':40s}")
        if len(temp_pairs) > 5:
            print(f"    ... and {len(temp_pairs) - 5} more")
        return

    # ── Step 2: Rename to temp ─────────────────────────────────────────────────
    for p in temp_pairs:
        p["orig_img"].rename(p["temp_img"])
        if p["orig_lbl"].exists():
            p["orig_lbl"].rename(p["temp_lbl"])

    # ── Step 3: Rename temp → final ────────────────────────────────────────────
    renamed_imgs = 0
    renamed_lbls = 0
    missing_lbls = 0

    for p in temp_pairs:
        p["temp_img"].rename(p["final_img"])
        renamed_imgs += 1

        if p["temp_lbl"].exists():
            p["temp_lbl"].rename(p["final_lbl"])
            renamed_lbls += 1
        else:
            missing_lbls += 1

    print(f"  [{split_name}] ✅ Renamed {renamed_imgs} images, {renamed_lbls} labels")
    if missing_lbls:
        print(f"  [{split_name}] ⚠️  {missing_lbls} images had no matching label file")


def main():
    root = Path(DATASET_ROOT)

    print("=" * 60)
    print("  Dataset Rename Script")
    print(f"  Root : {root}")
    print(f"  DRY_RUN = {DRY_RUN}")
    print("=" * 60)

    if not root.exists():
        print(f"\nERROR: Folder not found: {root}")
        print("Please update DATASET_ROOT and try again.")
        return

    splits = ["train", "valid", "test"]

    for split in splits:
        img_dir = root / split / "images"
        lbl_dir = root / split / "labels"
        rename_split(split, img_dir, lbl_dir, DRY_RUN)

    print("\n" + "=" * 60)
    if DRY_RUN:
        print("  DRY RUN COMPLETE — no files were changed.")
        print("  Set DRY_RUN = False and re-run to apply.")
    else:
        print("  ALL DONE! Files renamed to i00001, i00002, ...")
    print("=" * 60)


if __name__ == "__main__":
    main()
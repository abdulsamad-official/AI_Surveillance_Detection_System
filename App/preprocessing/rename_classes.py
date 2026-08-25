"""
Class Rename Script — data.yaml
================================
Renames:
  'medicinal mask'  -->  'medical_mask'
  'theft mask'      -->  'theft_mask'
"""

import os
import shutil
import yaml

# ── CHANGE THIS to your dataset path ──────────────────────────
DATASET_ROOT = r"C:\Users\Sami\Desktop\Samad Files\FYP\Project\final_system\Final_data"
YAML_PATH    = os.path.join(DATASET_ROOT, "data.yaml")
# ──────────────────────────────────────────────────────────────

RENAME_MAP = {
    "medicinal mask": "medical_mask",
    "theft mask":     "theft_mask",
}

with open(YAML_PATH) as f:
    data = yaml.safe_load(f)

names = data["names"]
print("Before:", names)

for i, name in enumerate(names):
    if name in RENAME_MAP:
        print(f"  Renaming class {i}: '{name}'  -->  '{RENAME_MAP[name]}'")
        names[i] = RENAME_MAP[name]

data["names"] = names

# Backup original
backup = YAML_PATH.replace(".yaml", "_BACKUP.yaml")
shutil.copy(YAML_PATH, backup)
print(f"\nBackup saved → {backup}")

with open(YAML_PATH, "w") as f:
    yaml.dump(data, f, allow_unicode=True, sort_keys=False)

print("After:", data["names"])
print("\nDone. data.yaml updated.")
import os
import glob

def fix_file(filepath):
    try:
        with open(filepath, "rb") as f:
            raw = f.read()
            
        try:
            raw.decode("utf-8")
            # Already UTF-8
            return
        except UnicodeDecodeError:
            pass
            
        content = raw.decode("windows-1252")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Fixed {filepath}")
    except Exception as e:
        print(f"Failed {filepath}: {e}")

for root, _, files in os.walk("app"):
    for file in files:
        if file.endswith(".ts") or file.endswith(".tsx"):
            fix_file(os.path.join(root, file))

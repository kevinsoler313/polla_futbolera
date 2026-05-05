import os
import glob

replacements = {
    "from app.core.config import": "from app.core.config import",
    "from app.core.database import": "from app.core.database import",
    "from app.core.seed import": "from app.core.seed import"
}

files = glob.glob("**/*.py", recursive=True)

for filepath in files:
    if "venv" in filepath:
        continue
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    modified = False
    for old, new in replacements.items():
        if old in content:
            content = content.replace(old, new)
            modified = True
            
    if modified:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {filepath}")

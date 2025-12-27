import json
import os

# Paths
# Paths
DOCS_DIR = '.' # Root directory
DATA_JS_PATH = os.path.join(DOCS_DIR, 'data.js')
EXAM_DIR = os.path.join(DOCS_DIR, 'exam')
CHAPTER_FILES = ['chuong_1.json', 'chuong_2.json', 'chuong_3.json']

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def update_data_js():
    print("Reading chapter JSON files...")
    all_data = {}
    
    for filename in CHAPTER_FILES:
        filepath = os.path.join(EXAM_DIR, filename)
        if os.path.exists(filepath):
            key = f"exam/{filename}"
            print(f"  Loading {key} from {filepath}...")
            data = load_json(filepath)
            all_data[key] = data
        else:
            print(f"  Warning: File not found: {filepath}")

    print("Constructing data.js content...")
    # Convert dict to JSON string with indentation
    json_str = json.dumps(all_data, ensure_ascii=False, indent=2)
    
    # Wrap in window.QUIZ_DATA = ...
    js_content = f"window.QUIZ_DATA = {json_str};"
    
    print(f"Writing to {DATA_JS_PATH}...")
    with open(DATA_JS_PATH, 'w', encoding='utf-8') as f:
        f.write(js_content)
        
    print("Done! data.js has been updated.")

if __name__ == "__main__":
    update_data_js()

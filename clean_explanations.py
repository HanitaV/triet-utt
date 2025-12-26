import json
import os
import re

# Paths - Adjusted for gh-pages root structure
EXAM_DIR = 'exam'
CHAPTER_FILES = ['chuong_1.json', 'chuong_2.json', 'chuong_3.json']

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

def clean_explanations():
    print("Cleaning explanations...")
    
    # Regex to match "Đáp án [A-D] đúng." or similar variations
    # Handles: "Đáp án A đúng.", "Đáp án B đúng, vì...", "Đáp án C là đúng..."
    pattern = re.compile(r"^Đáp án [A-D] (đúng|sai|là đúng|là sai)[.,;]?\s*", re.IGNORECASE)

    for filename in CHAPTER_FILES:
        filepath = os.path.join(EXAM_DIR, filename)
        if not os.path.exists(filepath):
            print(f"File not found: {filepath}")
            continue
            
        print(f"Processing {filename}...")
        data = load_json(filepath)
        count = 0
        
        for q in data['questions']:
            if 'explanation' in q and q['explanation']:
                original = q['explanation']
                cleaned = pattern.sub("", original)
                
                # Capitalize first letter of cleaned text if needed
                if cleaned and cleaned[0].islower():
                    cleaned = cleaned[0].upper() + cleaned[1:]
                    
                if original != cleaned:
                    q['explanation'] = cleaned
                    count += 1
        
        save_json(filepath, data)
        print(f"  Cleaned {count} explanations in {filename}")

if __name__ == "__main__":
    clean_explanations()

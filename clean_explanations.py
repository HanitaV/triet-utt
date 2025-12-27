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
            if 'explain' in q and q['explain']:
                original = q['explain']
                # Remove "Đáp án X", "Chọn X", "Phương án X" at start
                # Matches: "Đáp án A", "Đáp án đúng là A", "Câu trả lời là B", "Chọn C"
                cleaned = re.sub(r"^(Đáp án|Phương án|Câu|Chọn|Câu trả lời)(\s+(đúng|là|của bạn|sẽ|chính xác|nhất|cần chọn|trong câu hỏi này))*\s*[:.,-]?\s*[A-D]\s*([.:,;-]|\s+là\s+đúng|\s+đúng)?\s*", "", original, flags=re.IGNORECASE)
                
                # Remove intermediate sentences like "Vì vậy chọn A." or "Do đó đáp án B là đúng."
                cleaned = re.sub(r"(Vì vậy|Do đó|Suy ra|Tóm lại|Như vậy),?\s*(chọn|đáp án|phương án|câu trả lời)(\s+(đúng|là))?\s*[:.,-]?\s*[A-D]\s*(\.|là đúng\.?)?", "", cleaned, flags=re.IGNORECASE)

                # Remove standalone references like "(A)" or "A." if they seem to be labels
                cleaned = re.sub(r"^\s*[A-D]\.\s*", "", cleaned)

                # Fix double spaces and trimming
                cleaned = re.sub(r"\s+", " ", cleaned).strip()

                # Capitalize first letter of cleaned text if needed
                if cleaned and cleaned[0].islower():
                    cleaned = cleaned[0].upper() + cleaned[1:]
                    
                if original != cleaned:
                    q['explain'] = cleaned
                    count += 1
        
        save_json(filepath, data)

        print(f"  Cleaned {count} explanations in {filename}")

    # Verification
    print("\nVerifying...")
    for filename in CHAPTER_FILES:
        filepath = os.path.join(EXAM_DIR, filename)
        if not os.path.exists(filepath): continue
        data = load_json(filepath)
        found = 0
        for q in data['questions']:
            if 'explain' in q and q['explain']:
                if re.search(r"\b(đáp án|phương án|chọn)\s+[A-D]\b", q['explain'], re.IGNORECASE):
                    print(f"  [WARNING] Possible leftover in {filename} ID {q.get('id')}: {q['explain'][:50]}...")
                    found += 1
        if found == 0:
            print(f"  {filename}: Clean.")

if __name__ == "__main__":
    clean_explanations()

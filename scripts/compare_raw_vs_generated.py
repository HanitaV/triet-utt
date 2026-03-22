#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
So sánh số lượng câu hỏi giữa file raw và file generated (FIXED)
"""

import re
import json
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent.parent
RAW_DIR = BASE_DIR / "subjects" / "utt" / "ttHCM"
EXAM_DIR = RAW_DIR / "exam"

def count_questions_in_raw(raw_file):
    """Đếm số câu hỏi trong file raw markdown"""
    try:
        with open(raw_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        count = 0
        for line in lines:
            # Skip OCR metadata lines
            if line.strip().startswith("---"):
                continue
            
            # Match lines that start with "Câu X:" or "Câu X." (can have ** for bold)
            # Pattern: optional **, "Câu ", then digits, then : or . or ) or space
            if re.match(r'^\*{0,2}Câu\s+\d+[\s:.\)]', line):
                count += 1
        
        return count
    except FileNotFoundError:
        return None

def count_questions_in_json(json_file):
    """Đếm số câu hỏi trong file JSON generated"""
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return len(data.get('questions', []))
    except FileNotFoundError:
        return None

def main():
    print("=" * 70)
    print("SO SÁNH SỐ LƯỢNG CÂU HỎI: RAW vs GENERATED (UPDATED)")
    print("=" * 70)
    print()
    
    chapters = list(range(1, 7))
    total_raw = 0
    total_generated = 0
    differences = []
    
    for ch in chapters:
        raw_file = RAW_DIR / f"c{ch}_raw.md"
        json_file = EXAM_DIR / f"chuong_{ch}.json"
        
        raw_count = count_questions_in_raw(raw_file)
        json_count = count_questions_in_json(json_file)
        
        if raw_count is None or json_count is None:
            print(f"❌ Chương {ch}: File không tìm thấy")
            continue
        
        total_raw += raw_count
        total_generated += json_count
        diff = raw_count - json_count
        
        status = "✅" if diff == 0 else "⚠️"
        print(f"{status} Chương {ch}:")
        print(f"   - Raw:       {raw_count:3d} câu")
        print(f"   - Generated: {json_count:3d} câu")
        
        if diff != 0:
            print(f"   - Chênh lệch: {diff:+d} câu {'(THIẾU)' if diff > 0 else '(DỮ THỪA)'}")
            differences.append({
                'chapter': ch,
                'raw': raw_count,
                'generated': json_count,
                'diff': diff
            })
        print()
    
    print("=" * 70)
    print(f"TỔNG CỘNG:")
    print(f"   - Raw:       {total_raw:3d} câu")
    print(f"   - Generated: {total_generated:3d} câu")
    print(f"   - Chênh lệch: {total_raw - total_generated:+d} câu")
    print("=" * 70)
    
    if differences:
        print("\n🔍 CHI TIẾT CÁC CHƯƠNG CÓ CHÊNH LỆCH:\n")
        for item in differences:
            ch = item['chapter']
            print(f"Chương {ch}: {item['raw']} raw vs {item['generated']} generated ({item['diff']:+d})")
    else:
        print("\n✅ Tất cả các chương đều khớp!")

if __name__ == "__main__":
    main()

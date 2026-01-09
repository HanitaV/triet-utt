import csv
import json
import os
import difflib

# Default to 5 generic options if parsing fails
GENERIC_OPTIONS = [
    {"id": "A", "content": "Lựa chọn A"},
    {"id": "B", "content": "Lựa chọn B"},
    {"id": "C", "content": "Lựa chọn C"},
    {"id": "D", "content": "Lựa chọn D"},
    {"id": "E", "content": "Lựa chọn E"}
]

def load_file_lines(path):
    with open(path, 'r', encoding='utf-8') as f:
        return [line.strip() for line in f if line.strip()]

def find_best_match(target, lines, start_idx, range_len=15):
    best_ratio = 0
    best_idx = -1
    
    end_idx = min(start_idx + range_len, len(lines))
    
    for i in range(start_idx, end_idx):
        line = lines[i]
        # Calculate similarity
        ratio = difflib.SequenceMatcher(None, target, line).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_idx = i
            
    return best_idx, best_ratio

def create_questions():
    txt_path = r"c:\Users\eleven\triet-utt\subjects\utt\kth\docx_content.txt"
    csv_path = r"c:\Users\eleven\triet-utt\subjects\utt\kth\answer.csv"
    output_dir = r"c:\Users\eleven\triet-utt\subjects\utt\kth\exam"
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    lines = load_file_lines(txt_path)
    # Skip headers (first 4 lines usually)
    # Heuristic: Find first line that looks like a question or check manually
    # Based on view_file, line 5 (index 4) is the first question.
    current_line_idx = 4 
    
    questions = []
    
    print(f"Reading CSV: {csv_path}")
    with open(csv_path, encoding='utf-8') as f:
        reader = list(csv.DictReader(f))
        
    print(f"Total CSV rows: {len(reader)}")
    
    for row in reader:
        try:
            q_id = int(row['Câu số'])
            ans_char = row['Đáp án chọn'].lower() # a, b, c, d, e
            summary = row['Nội dung tóm tắt']
            explanation = row['Giải thích/Ghi chú']
            
            # 1. Attempt to find the summary in the next chunk of lines
            match_idx, ratio = find_best_match(summary, lines, current_line_idx)
            
            # Determine block start
            # Assuming 6-line blocks usually
            # But relying on match to re-sync
            
            block_start = current_line_idx
            
            if ratio > 0.6: # Decent match
                # Check if the match is likely the Answer Option or the Question
                # We can try to guess based on relative position to current_line_idx
                offset = match_idx - current_line_idx
                
                # If offset is small (0), it matches the first line -> Question text
                # If offset is 1-5, it matches an option
                
                # However, sometimes summary is just a substring.
                # Strategy: Assume block_start is match_idx IF the match is the Question.
                # If match is Option, backtrack.
                pass
            
            # fallback: assume 6 lines per question
            # Q is lines[current_line_idx]
            # Options are lines[current_line_idx+1 ... +5]
            
            if current_line_idx + 5 < len(lines):
                q_text = lines[current_line_idx]
                options_raw = lines[current_line_idx+1 : current_line_idx+6]
                
                # Check formatting:
                # If options_raw[4] (E) looks like the start of next question?
                # Hard to tell.
                
                # Construct Options
                opts = []
                letters = ['A', 'B', 'C', 'D', 'E']
                for i, txt in enumerate(options_raw):
                    opts.append({
                        "id": letters[i],
                        "content": txt
                    })
                    
                q_obj = {
                    "id": q_id,
                    "question": q_text,
                    "options": opts,
                    "answer": ans_char.upper(),
                    "explain": explanation
                }
                questions.append(q_obj)
                
                # Advance pointer
                current_line_idx += 6
            else:
                print(f"End of file reached before Q{q_id}")
                break

        except ValueError:
            print(f"Skipping invalid row: {row}")

    # Create chapter JSON
    chapter_data = {
        "title": "Tổng hợp câu hỏi trắc nghiệm",
        "total_questions": len(questions),
        "questions": questions
    }

    output_file = os.path.join(output_dir, "kth_questions.json")
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(chapter_data, f, ensure_ascii=False, indent=4)
        
    print(f"Created {output_file} with {len(questions)} questions.")

if __name__ == "__main__":
    create_questions()

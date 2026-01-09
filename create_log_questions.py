import json
import re
import os

# Read the extracted docx content
with open(r"c:\Users\eleven\triet-utt\subjects\utt\log\docx_content.txt", "r", encoding="utf-8") as f:
    content = f.read()

# Read the answer key from xlsx content
with open(r"c:\Users\eleven\triet-utt\subjects\utt\log\xlsx_content.txt", "r", encoding="utf-8") as f:
    xlsx_content = f.read()

# Parse answer key
answers = {}
for line in xlsx_content.split('\n'):
    if '|' in line:
        parts = [p.strip() for p in line.split('|')]
        for i in range(0, len(parts) - 1, 2):
            try:
                q_num = int(parts[i])
                ans = parts[i + 1]
                if ans in ['A', 'B', 'C', 'D']:
                    answers[q_num] = ans
            except:
                pass

print(f"Parsed {len(answers)} answers")

# Parse questions from docx content
lines = content.split('\n')
questions = []
current_q = None
current_q_text = []
current_options = []

def save_question():
    global current_q, current_q_text, current_options, questions
    if current_q is not None and len(current_options) >= 4:
        q_id = current_q
        answer = answers.get(q_id, 'A')
        full_question = '\n'.join(current_q_text).strip()
        questions.append({
            "id": q_id,
            "question": full_question,
            "options": current_options[:4],
            "answer": answer,
            "explain": ""
        })

for line in lines:
    line = line.strip()
    if not line:
        continue
    
    # Check if this is a NEW question line (number followed by period and space, e.g., "18. Sắp xếp...")
    # Important: Only match "XX. " pattern at the start (question number with period)
    q_match = re.match(r'^(\d+)\.\s+(.+)$', line)
    
    # Check if this is an option line (A. B. C. D.)
    opt_match = re.match(r'^([A-D])[.\s]+(.+)$', line)
    
    if q_match:
        # Save previous question
        save_question()
        
        # Start new question
        current_q = int(q_match.group(1))
        current_q_text = [q_match.group(2)]
        current_options = []
    elif opt_match and current_q is not None:
        # This is an option
        current_options.append({
            "id": opt_match.group(1),
            "content": opt_match.group(2)
        })
    elif current_q is not None and len(current_options) == 0:
        # This is part of the question text (before options start)
        # Could be numbered items like "1-Xác định nhu cầu..."
        current_q_text.append(line)

# Don't forget the last question
save_question()

print(f"Parsed {len(questions)} questions")

# Verify we have all 200 questions
for i in range(1, 201):
    found = any(q['id'] == i for q in questions)
    if not found:
        print(f"Missing question: {i}")

# Split into chapters
chapter_ranges = [
    (1, 40, "Tổng quan về Logistics"),
    (41, 80, "Quy trình và Chi phí Logistics"),
    (81, 120, "Tổ chức và Kiểm soát Logistics"),
    (121, 160, "Chuỗi cung ứng"),
    (161, 200, "Đo lường và Đánh giá")
]

exam_dir = r"c:\Users\eleven\triet-utt\subjects\utt\log\exam"

for chapter_num, (start, end, title) in enumerate(chapter_ranges, 1):
    chapter_questions = [q for q in questions if start <= q['id'] <= end]
    
    # Renumber questions within chapter (1-based)
    for i, q in enumerate(chapter_questions, 1):
        q['id'] = i
    
    chapter_data = {
        "title": f"CHƯƠNG {chapter_num}",
        "total_questions": len(chapter_questions),
        "questions": chapter_questions
    }
    
    output_file = os.path.join(exam_dir, f"chuong_{chapter_num}.json")
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(chapter_data, f, ensure_ascii=False, indent=4)
    
    print(f"Created {output_file} with {len(chapter_questions)} questions")

# Script tạo k76.json từ chuong_1.txt và chuong_1_answers.json

import json
import re

# Load answers from scan
with open('chuong_1_answers.json', 'r', encoding='utf-8') as f:
    answers_data = json.load(f)

# Build answer map: question number -> circled answer
answer_map = {q['question']: q['circled_answer'] for q in answers_data['questions']}

# Parse chuong_1.txt
with open('chuong_1.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Parse questions and options
questions = []
lines = content.split('\n')
current_q = None

for line in lines:
    line = line.strip()
    if not line:
        continue
    
    # Match question start: '1. Question text'
    q_match = re.match(r'^(\d+)\.\s*(.+)', line)
    if q_match:
        if current_q:
            questions.append(current_q)
        
        q_num = int(q_match.group(1))
        q_text = q_match.group(2)
        current_q = {
            'question': q_num,
            'text': q_text,
            'options': [],
            'correct_answer': answer_map.get(q_num, '')
        }
    elif re.match(r'^[abcd]\.\s*', line) and current_q:
        # Option line
        opt_match = re.match(r'^([abcd])\.\s*(.+)', line)
        if opt_match:
            current_q['options'].append({
                'letter': opt_match.group(1).upper(),
                'text': opt_match.group(2)
            })

if current_q:
    questions.append(current_q)

# Build output
output = {
    'chapter': 'Chương 1',
    'title': 'Triết học Mác-Lênin',
    'total_questions': len(questions),
    'questions': questions
}

# Save
with open('k76.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f'✓ Created k76.json with {len(questions)} questions')
print(f'  Answers mapped: {len([q for q in questions if q["correct_answer"]])} / {len(questions)}')

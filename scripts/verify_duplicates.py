
import re
import os
import json

def parse_markdown_quiz(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split into chapters
    chapters_raw = re.split(r'(CHƯƠNG \d+)', content)
    
    parsed_data = {}
    
    for i in range(1, len(chapters_raw), 2):
        chapter_header = chapters_raw[i].strip()
        chapter_content = chapters_raw[i+1]
        
        chapter_num = chapter_header.split()[-1]
        chapter_key = f"chuong_{chapter_num}"
        
        questions = []
        lines = chapter_content.split('\n')
        current_q = None
        
        for line in lines:
            line = line.strip()
            if not line: continue
                
            answer_match = re.match(r'^ANSWER:\s*([A-D])', line, re.IGNORECASE)
            if answer_match:
                if current_q:
                    current_q['answer'] = answer_match.group(1).upper()
                    questions.append(current_q)
                    current_q = None
                continue
            
            if current_q is None:
                q_match = re.match(r'^(\d+)\.\s*(.*)', line)
                if q_match:
                    current_q = {
                        "id": int(q_match.group(1)),
                        "question": q_match.group(2),
                        "options": [],
                        "answer": "",
                        "explain": ""
                    }
                continue
            
            option_match = re.match(r'^(\d+|[a-d])\.\s*(.*)', line, re.IGNORECASE)
            if option_match:
                opt_text = option_match.group(2)
                current_q['options'].append(opt_text)
            else:
                if not current_q['options']:
                    current_q['question'] += " " + line
                else:
                    current_q['options'][-1] += " " + line
        
        parsed_data.setdefault(chapter_key, {
            "title": chapter_header,
            "questions": []
        })
        parsed_data[chapter_key]["questions"].extend(questions)

    return parsed_data

def generate_duplicate_report():
    input_file = r'c:\Users\eleven\triet-utt\assets\triet.md'
    data = parse_markdown_quiz(input_file)
    output_file = r'c:\Users\eleven\triet-utt\duplicates_report.txt'
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("DEBUG: DUPLICATE CHECK REPORT\n")
        f.write("=============================\n\n")
        
        for chapter_key, content in data.items():
            f.write(f"--- {content['title']} ---\n")
            seen_questions = {} # map normalized_text -> full_question_obj
            duplicates_count = 0
            
            for q in content['questions']:
                # Normalize: lowercase, remove non-alphanumeric (keep basic punctuation), collapse spaces
                # Actually, strict exact match often fails due to minor typos. 
                # But let's stick to the logic used in previous script: collapse spaces + lowercase
                q_text_norm = re.sub(r'\s+', ' ', q['question']).strip().lower()
                
                if q_text_norm in seen_questions:
                    duplicates_count += 1
                    original = seen_questions[q_text_norm]
                    
                    f.write(f"[DUPLICATE FOUND]\n")
                    f.write(f"  Duplicate ID: {q['id']}\n")
                    f.write(f"  Original ID : {original['id']}\n")
                    f.write(f"  Question Text: {q['question']}\n")
                    f.write(f"  Compare Options:\n")
                    f.write(f"    Orig: {original['options']}\n")
                    f.write(f"    Dupe: {q['options']}\n")
                    f.write(f"---------------------------------------------------\n")
                else:
                    seen_questions[q_text_norm] = q
            
            if duplicates_count == 0:
                f.write("No duplicates found.\n")
            f.write("\n")
            
    print(f"Report generated: {output_file}")

if __name__ == "__main__":
    generate_duplicate_report()

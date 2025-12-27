
import re
import json
import os

def parse_markdown_quiz(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split into chapters
    # Assuming chapters start with "CHƯƠNG X"
    chapters_raw = re.split(r'(CHƯƠNG \d+)', content)
    
    parsed_data = {}
    
    current_chapter_title = ""
    
    # Iterate through split content. 
    # re.split includes the separators in the result list if capturing groups are used.
    # So it will be like: ['', 'CHƯƠNG 1', '\n\n1. Question...\n...', 'CHƯƠNG 2', ...]
    
    for i in range(1, len(chapters_raw), 2):
        chapter_header = chapters_raw[i].strip()
        chapter_content = chapters_raw[i+1]
        
        chapter_num = chapter_header.split()[-1]
        chapter_key = f"chuong_{chapter_num}"
        
        questions = []
        
        # Split by "ANSWER:" to find questions, but we need to be careful with the split.
        # A robust way is to iterate line by line or use regex to find blocks.
        # Looking at the file content:
        # 1. Question text?
        # 1. Option A
        # 2. Option B
        # ...
        #    ANSWER: X
        
        # Let's try splitting by the question number pattern "\n\d+\. "
        # But wait, options also start with numbers sometimes "1. ", "2. ".
        # However, question numbers seem to be at the start of a block.
        
        # Strategy:
        # Find all blocks that end with "ANSWER: [A-D]".
        # The start of such a block is the end of the previous one.
        
        # Let's normalize newlines first
        chapter_content = chapter_content.strip()
        
        # Regex to find individual questions. 
        # We look for a pattern that ends with ANSWER: [A-D]
        # And starts with a number followed by a dot.
        
        # Actually, let's just go line by line.
        lines = chapter_content.split('\n')
        
        current_q = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Check for Answer
            answer_match = re.match(r'^ANSWER:\s*([A-D])', line, re.IGNORECASE)
            if answer_match:
                if current_q:
                    current_q['answer'] = answer_match.group(1).upper()
                    questions.append(current_q)
                    current_q = None
                continue
            
            # Check for Question Start (e.g., "1. Triết học...")
            # We assume a question starts with a number and dot, AND we are not currently parsing options for an existing question 
            # OR we just finished a question.
            # But wait, options also look like "1. ...".
            # The difference is usually that options come after the question text.
            # And question text comes after an ANSWER (or at start).
            
            if current_q is None:
                # Start of a new question
                q_match = re.match(r'^(\d+)\\?\.\s*(.*)', line)
                if q_match:
                    current_q = {
                        "id": int(q_match.group(1)),
                        "question": q_match.group(2),
                        "options": [],
                        "answer": "",
                        "explain": "" # Default empty
                    }
                continue
            
            # If we have a current question, this line could be part of question text, an option, or continuation.
            
            # Check for Option (1. or a. or A.)
            # The file shows options like:
            # 1. ...
            # 2. ...
            # But also sometimes "a.", "b."? Need to check file content.
            # Viewed file shows: "1. Thế kỷ...", "2. ...", "3. ...", "4. ..."
            # And also: "ANSWER: A" (referring to 1=A, 2=B, 3=C, 4=D likely)
            
            option_match = re.match(r'^(\d+|[a-d])\.\s*(.*)', line, re.IGNORECASE)
            if option_match:
                opt_label_raw = option_match.group(1)
                opt_text = option_match.group(2)
                
                # Normalize label to A, B, C, D
                # If 1->A, 2->B, 3->C, 4->D
                label_map = {'1': 'A', '2': 'B', '3': 'C', '4': 'D', 
                             'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D',
                             'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D'}
                
                label = label_map.get(opt_label_raw.lower(), opt_label_raw.upper())
                
                current_q['options'].append({
                    "id": label,
                    "content": opt_text
                })
            else:
                # Append to question text if no options found yet, otherwise append to last option?
                # Actually, sometimes question text is multi-line.
                if not current_q['options']:
                    current_q['question'] += " " + line
                else:
                    # Append to last option
                    current_q['options'][-1]['content'] += " " + line
        
        parsed_data.setdefault(chapter_key, {
            "title": chapter_header,
            "total_questions": 0,
            "questions": []
        })
        
        parsed_data[chapter_key]["questions"].extend(questions)
        parsed_data[chapter_key]["total_questions"] += len(questions)

    return parsed_data

def main():
    input_file = r'c:\Users\eleven\triet-utt\assets\triet.md'
    data = parse_markdown_quiz(input_file)
    

    # Check for duplicates and write to individual files
    output_dir = r'c:\Users\eleven\triet-utt\exam'
    
    for chapter_key, content in data.items():
        # Duplicate detection
        seen_questions = {}
        unique_questions = []
        duplicates = []
        
        for q in content['questions']:
            # Normalize question text + options for comparison
            # This handles cases where the question text is generic (e.g., "Chọn đáp án đúng") but options differ.
            
            # Serialize options to a string for comparison
            options_str = "|".join([o['content'].strip().lower() for o in q['options']])
            q_text_norm = re.sub(r'\s+', ' ', q['question']).strip().lower()
            
            # Create a unique signature for the question
            question_signature = f"{q_text_norm}::{options_str}"
            
            if question_signature in seen_questions:
                duplicates.append((q['id'], seen_questions[question_signature])) # (Current ID, Original ID)
            else:
                seen_questions[question_signature] = q['id']
                unique_questions.append(q)
        
        # Report duplicates
        if duplicates:
            print(f"[{chapter_key}] Found {len(duplicates)} duplicates:")
            for curr_id, orig_id in duplicates:
                print(f"  - Question ID {curr_id} is a duplicate of ID {orig_id}")
        else:
            print(f"[{chapter_key}] No duplicates found.")
            
        # Update content with unique questions only? 
        # User said "scan xem có trùng câu không", implies checking. 
        # I will keep unique questions for the final file.
        content['questions'] = unique_questions
        content['total_questions'] = len(unique_questions)
        
        # Write to file
        output_filename = f"{chapter_key}.json"
        output_path = os.path.join(output_dir, output_filename)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(content, f, indent=2, ensure_ascii=False)
            
        print(f"Generated {output_path} with {content['total_questions']} questions.")

if __name__ == "__main__":
    main()

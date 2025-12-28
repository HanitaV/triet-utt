
import re
import json
import os

def parse_questions(md_content):
    units = []
    current_unit = None
    current_section = None
    
    lines = md_content.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Detect Unit
        unit_match = re.match(r'^# (UNIT \d+|REVIEW \d+ & \d+)(?:: (.+))?', line, re.IGNORECASE)
        if unit_match:
            unit_id_raw = unit_match.group(1).upper().replace(" ", "-")
            if "REVIEW" in unit_id_raw:
                # Normalize REVIEW 1 & 2 -> review-1
                # Actually, book uses 1&2 REVIEW 1. Let's strictly follow the header "1&2 REVIEW 1" -> "review-1"
                # But regex captured "REVIEW 1 & 2" ??
                # Let's just slugify whatever is there.
                pass
            
            current_unit = {
                "id": unit_id_raw.replace("&", "").replace("--", "-").lower(),
                "name": line.replace("# ", "").strip(),
                "sections": []
            }
            units.append(current_unit)
            current_section = None
            continue
            
        # Detect Section
        section_match = re.match(r'^## (.+)', line)
        if section_match and current_unit:
            current_section = {
                "name": section_match.group(1).strip(),
                "questions": []
            }
            current_unit["sections"].append(current_section)
            continue
            
        # Detect Questions (Header)
        q_header_match = re.match(r'^\*\*\s*(\d+)\.\s*(.+?)\*\*', line)
        if q_header_match and current_section:
            section_slug = current_section['name'].split(':')[0].strip().lower().replace(' ', '-')
            question_obj = {
                "id": f"{current_unit['id']}-{section_slug}-{q_header_match.group(1)}",
                "question_num": q_header_match.group(1),
                "instruction": q_header_match.group(2).strip(),
                "items": []
            }
            current_section["questions"].append(question_obj)
            continue
        
        # Detect simple question header e.g. "**3**"
        q_num_only_match = re.match(r'^\*\*\s*(\d+)\s*\*\*', line)
        if q_num_only_match and current_section:
            section_slug = current_section['name'].split(':')[0].strip().lower().replace(' ', '-')
            question_obj = {
                "id": f"{current_unit['id']}-{section_slug}-{q_num_only_match.group(1)}",
                "question_num": q_num_only_match.group(1),
                "instruction": "Choose the correct answer", # Default instruction
                "items": []
            }
            current_section["questions"].append(question_obj)
            continue

        # Detect Sub-items (Question content)
        item_match = re.match(r'^(\d+|[a-z])\.\s+(.+)', line)
        if item_match and current_section and current_section["questions"]:
            current_q = current_section["questions"][-1]
            current_q["items"].append({
                "label": item_match.group(1),
                "text": item_match.group(2).strip()
            })
            continue

    return units

def parse_answers(md_content):
    # Dictionary structure: UnitID -> SectionSlug -> QuestionNum -> { 'global': val, 'items': { itemLabel: val } }
    answers = {}
    
    current_unit_id = None
    current_section_slug = None
    current_q_num = None
    
    lines = md_content.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Unit Header
        if line.startswith("## UNIT") or "REVIEW" in line and line.startswith("## "):
            # Normalize to match parse_questions ID generation
            raw = line.replace("## ", "").strip()
            # Handle "1&2 REVIEW 1" -> review-1 if possible, or just exact match logic
            # Let's try to match the logic: "UNIT 1" -> "unit-1"
            if "UNIT" in raw:
                current_unit_id = raw.lower().replace(" ", "-")
            elif "REVIEW" in raw:
                # "review-1-&-2" -> "review-1--2" -> "review-1-2"
                current_unit_id = raw.lower().replace(" ", "-").replace("&", "").replace("--", "-")
            continue
            
        # Section Header
        if line.startswith("### "):
            raw_sec = line.replace("### ", "").split(":")[0].strip()
            current_section_slug = raw_sec.lower().replace(" ", "-")
            continue
            
        # Question Number
        # **1**, **2**, **3**
        # Sometimes **3** b (inline answer)
        q_num_match = re.match(r'^\*\*(\d+)\*\*\s*(.*)', line)
        if q_num_match:
            current_q_num = q_num_match.group(1)
            rest = q_num_match.group(2).strip()
            
            # Check if rest contains comma-separated list like "1 b, 2 c, 3 d"
            # Pattern: digit space something comma ...
            if rest and ',' in rest:
                 parts = rest.split(',')
                 for p in parts:
                     # 1 b
                     m = re.search(r'(\d+)\s+(.+)', p.strip())
                     if m:
                         lbl = m.group(1)
                         val = m.group(2).strip()
                         if current_unit_id not in answers: answers[current_unit_id] = {}
                         if current_section_slug not in answers[current_unit_id]: answers[current_unit_id][current_section_slug] = {}
                         if current_q_num not in answers[current_unit_id][current_section_slug]:
                              answers[current_unit_id][current_section_slug][current_q_num] = {'global': None, 'items': {}}
                         
                         answers[current_unit_id][current_section_slug][current_q_num]['items'][lbl] = val
            else:
                # Init storage for single global answer or multiline
                if current_unit_id and current_section_slug:
                    if current_unit_id not in answers: answers[current_unit_id] = {}
                    if current_section_slug not in answers[current_unit_id]: answers[current_unit_id][current_section_slug] = {}
                    
                    if current_q_num not in answers[current_unit_id][current_section_slug]:
                        answers[current_unit_id][current_section_slug][current_q_num] = {
                            'global': rest if rest else None,
                            'items': {}
                        }
            continue
            
        # Answer items
        # 1. a Anusha
        # 1. dancing
        # 1. I rarely drink
        item_match = re.match(r'^(\d+|[a-z])\s*[.)]\s*(.+)', line)
        if item_match and current_unit_id and current_section_slug and current_q_num:
            label = item_match.group(1)
            val = item_match.group(2).strip()
            # If not initialized yet (should have been by q_num line)
            if current_unit_id in answers and current_section_slug in answers[current_unit_id] and current_q_num in answers[current_unit_id][current_section_slug]:
                 answers[current_unit_id][current_section_slug][current_q_num]['items'][label] = val
            continue
            
    return answers


def determine_question_type(q, instruction):
    q_type = "multiple_choice"
    inst = instruction.lower()
    
    if "complete" in inst or "write" in inst and "correct form" in inst:
        q_type = "fill_blank"
    elif "answer" in inst:
        q_type = "fill_blank"
    elif "rewrite" in inst:
        q_type = "rewrite"
    elif "order" in inst:
        q_type = "ordering"
    elif "match" in inst:
        q_type = "matching"
    elif "true" in inst or "tick" in inst:
        q_type = "multiple_choice" # Often implemented as MC or distinct TF
        if "true" in inst and "false" in inst:
             q_type = "true_false"
    elif "choose" in inst:
        # Check if items look like "1. ... / ... " (inline)
        if q["items"] and "/" in q["items"][0]["text"]:
             q_type = "inline_choice"
        else:
             q_type = "multiple_choice"
             
    return q_type

def normalize_to_quiz_json(unit, answers_db):
    generated_questions = []
    
    unit_id = unit["id"]
    
    for section in unit["sections"]:
        section_slug = section["name"].split(':')[0].strip().lower().replace(' ', '-')
        
        for q in section["questions"]:
            q_num = q["question_num"]
            q_type = determine_question_type(q, q["instruction"])
            
            # Skip Listening questions
            if "listen" in q["instruction"].lower() or "listening" in section["name"].lower():
                continue
            
            # Find Answer Data
            ans_data = None
            if unit_id in answers_db:
                # Try exact section match
                if section_slug in answers_db[unit_id]:
                    ans_data = answers_db[unit_id][section_slug].get(q_num)
                # Fallback: try fuzzier match if section names differ slightly
                # (omitted for brevity, assume consistency for now)
            
            # CASE 1: Question has no items (Single MCAL or single answer)
            if not q["items"]:
                final_q = {
                    "id": q["id"],
                    "type": q_type,
                    "question": f"<b>[{section['name']}]</b><br>{q['instruction']}",
                    "text": f"<b>[{section['name']}]</b><br>{q['instruction']}", # Legacy support
                    "options": [], 
                    "correct_answer": "?",
                    "explanation": f"See Answer Key: {unit['name']} > {section['name']} > Q{q_num}"
                }
                
                # Try to fill answer
                if ans_data:
                    # If global answer exists "1. b" or just "b"
                    # Often format: "**3** b" -> global="b"
                    if ans_data['global']:
                        final_q['correct_answer'] = ans_data['global'].strip()
                        final_q['explanation'] = f"Answer: {ans_data['global'].strip()}"
                    elif ans_data['items']:
                        # Comma join items
                        combined = "; ".join([f"{k}. {v}" for k,v in ans_data['items'].items()])
                        final_q['correct_answer'] = combined
                        final_q['explanation'] = f"Answer: {combined}"
                        
                generated_questions.append(final_q)
                
            # CASE 2: Question has items (Group of sub-questions)
            else:
                for item in q["items"]:
                    sub_id = f"{q['id']}-{item['label']}"
                    item_text = item['text']
                    
                    # Try to find specific answer for this item
                    correct_val = "?"
                    if ans_data and item['label'] in ans_data['items']:
                        raw_ans = ans_data['items'][item['label']]
                        # Format "a Anusha" -> "a" is likely the letter choice if MCAL, "Anusha" is text
                        # Format "dancing" -> text
                        # Heuristic: if starts with single letter + space, assume letter is key? 
                        # Only if type is MCAL.
                        
                        match_letter = re.match(r'^([a-d])\s+(.*)', raw_ans, re.IGNORECASE)
                        if match_letter and (q_type == "multiple_choice" or q_type == "inline_choice"):
                             correct_val = match_letter.group(1).upper() # The letter
                             # We could also use the text to verify options??
                        else:
                             correct_val = raw_ans # The full text
                    
                    # Construct Question
                    final_q = {
                        "id": sub_id,
                        "type": q_type,
                        "question": f"<b>[{section['name']}]</b><br>{q['instruction']}<br><i>{item['label']}. {item_text}</i>",
                        "text": f"<b>[{section['name']}]</b><br>{q['instruction']}<br><i>{item['label']}. {item_text}</i>",
                        "correct_answer": correct_val,
                        "explanation": f"Answer: {correct_val}"
                    }
                    
                    # For Fill Blank, we need to handle the blank in text
                    if q_type == "fill_blank":
                        # item_text usually "________ lives by the sea."
                        # We keep it as is, UI renders input.
                        pass
                        
                    # For MCAL, usually the options are not listed in questions.md!
                    # They might be in the PDF images... 
                    # If we don't have options, we can't fully render MCAL.
                    # BUT, for "Inline Choice" or "Choose option", sometimes options are in text like "is/are".
                    if q_type == "inline_choice":
                         # "is/are" -> Options [is, are]
                         parts = re.findall(r'\b[\w\']+\/[\w\']+\b', item_text)
                         if parts:
                             # Taking the last one found? Or checking context?
                             # Simple split
                             opts = parts[0].split('/')
                             final_q['options'] = [ {'letter': o, 'text': o} for o in opts ]
                             # The correct answer in answer key might be the WORD.
                             
                    generated_questions.append(final_q)
                    
    return generated_questions

def main():
    base_dir = r"c:\Users\eleven\triet-utt\subjects\utt\English\exam"
    
    # Read Questions
    with open(os.path.join(base_dir, "questions.md"), "r", encoding="utf-8") as f:
        questions_md = f.read()
        
    # Read Answers
    try:
        with open(os.path.join(base_dir, "answer.md"), "r", encoding="utf-8") as f:
            answer_md = f.read()
    except:
        answer_md = ""
        
    # Parse
    units = parse_questions(questions_md)
    answers_db = parse_answers(answer_md)
    
    # Generate Files
    generated_files = []
    
    for unit in units:
        quiz_data = normalize_to_quiz_json(unit, answers_db)
        
        filename = f"{unit['id'].replace('&', 'and')}.json" # e.g. unit-1.json
        output_path = os.path.join(base_dir, filename)
        
        final_output = {
            "chapter": unit['id'], # String ID is fine now? Or map to number? 
            # App often expects integer for sorting. Let's try to extract number.
            "file": filename,
            "questions": quiz_data
        }
        
        # Use Unit ID as chapter identifier (string)
        # This aligns with the new study.js logic supporting string IDs
        final_output['chapter'] = unit['id']
            
        # Old logic: extracted int
        # num_match = re.search(r'\d+', unit['id'])
        # if num_match:
        #     final_output['chapter'] = int(num_match.group(0))
            
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(final_output, f, indent=4, ensure_ascii=False)
            
        generated_files.append(filename)
        print(f"Generated {filename} with {len(quiz_data)} questions.")
        
    print(f"Done. Files: {generated_files}")

if __name__ == "__main__":
    main()

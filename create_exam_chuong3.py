import json
import re

def parse_questions(txt_file):
    """Parse questions from chuong_3.txt"""
    with open(txt_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove image markers
    content = re.sub(r'--- IMG\d+\.jpg ---\r?\n?', '', content)
    content = re.sub(r'ANSWER:\r?\n?', '', content)
    
    questions = {}
    
    # Pattern to match questions: number. question text followed by options
    # Split by question numbers
    parts = re.split(r'\n(\d+)\.\s+', content)
    
    i = 1
    while i < len(parts):
        if parts[i].isdigit():
            q_num = int(parts[i])
            q_content = parts[i + 1] if i + 1 < len(parts) else ""
            
            # Split question text and options
            lines = q_content.strip().split('\n')
            
            # Find question text (everything before first option)
            question_text = ""
            options = []
            option_started = False
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                    
                # Check if line starts with option letter
                option_match = re.match(r'^([a-eA-E])[\.\)]\s*(.*)$', line)
                if option_match:
                    option_started = True
                    letter = option_match.group(1).upper()
                    text = option_match.group(2).strip()
                    options.append({
                        "letter": letter,
                        "text": text
                    })
                elif not option_started:
                    if question_text:
                        question_text += " " + line
                    else:
                        question_text = line
            
            if question_text and options:
                questions[q_num] = {
                    "question": q_num,
                    "text": question_text.strip(),
                    "options": options
                }
            
            i += 2
        else:
            i += 1
    
    return questions

def load_answers(json_file):
    """Load answers from chuong_3_answers.json"""
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    answers = {}
    for q in data['questions']:
        answers[q['question']] = q['circled_answer']
    
    return answers

def create_exam_json(questions, answers, output_file):
    """Create exam JSON file"""
    exam_data = {
        "chapter": "Chương 3",
        "title": "Triết học Mác-Lênin",
        "total_questions": len(questions),
        "questions": []
    }
    
    # Sort questions by number
    for q_num in sorted(questions.keys()):
        q = questions[q_num]
        q_data = {
            "question": q_num,
            "text": q["text"],
            "options": q["options"],
            "correct_answer": answers.get(q_num, "")
        }
        exam_data["questions"].append(q_data)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(exam_data, f, ensure_ascii=False, indent=2)
    
    return exam_data

def main():
    txt_file = r"chuong_3.txt"
    answers_file = r"chuong_3_answers.json"
    output_file = r"exam/chuong_3.json"
    
    print("Parsing questions from chuong_3.txt...")
    questions = parse_questions(txt_file)
    print(f"Found {len(questions)} questions")
    
    print("Loading answers from chuong_3_answers.json...")
    answers = load_answers(answers_file)
    print(f"Found {len(answers)} answers")
    
    print("Creating exam JSON...")
    exam_data = create_exam_json(questions, answers, output_file)
    print(f"Created {output_file} with {exam_data['total_questions']} questions")
    
    # Show questions without answers
    missing_answers = [q for q in questions.keys() if q not in answers]
    if missing_answers:
        print(f"\nQuestions without answers: {missing_answers}")
    
    # Show answers without questions
    missing_questions = [a for a in answers.keys() if a not in questions]
    if missing_questions:
        print(f"Answers without questions: {missing_questions}")

if __name__ == "__main__":
    main()

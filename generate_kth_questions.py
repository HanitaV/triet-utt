import re
import json
import os

def parse_remake_md(filepath):
    """Parse remake.md table format to extract questions."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    questions = []
    
    # Pattern to match table rows: | Câu | Content | Đ.Án | Nội dung đáp án | Giải thích | Nhóm |
    # But the Đ.Án column has format **d** so we capture that
    pattern = r'\|\s*(\d+)\s*\|([^|]+)\|\s*\*\*([a-e])\*\*\s*\|([^|]+)\|([^|]+)\|([^|]+)\|'
    
    for match in re.finditer(pattern, content, re.IGNORECASE):
        q_id = int(match.group(1))
        question_content = match.group(2).strip()
        answer = match.group(3).upper()
        answer_text = match.group(4).strip()
        explanation = match.group(5).strip()
        topic = match.group(6).strip()
        
        # Parse question content - format: "Question text:<br>a. Option A; b. Option B..."
        parts = question_content.split('<br>')
        question_text = parts[0].strip() if parts else question_content
        
        # Create options from remaining content
        options = []
        option_text = ' '.join(parts[1:]) if len(parts) > 1 else ''
        
        # Parse options like "a. text; b. text; c. text; d. text; e. text"
        opt_pattern = r'([a-e])\.\s*([^;]+?)(?:;|$)'
        opt_matches = re.findall(opt_pattern, option_text, re.IGNORECASE)
        
        if opt_matches:
            for opt_id, opt_content in opt_matches:
                options.append({
                    "id": opt_id.upper(),
                    "content": opt_content.strip()
                })
        else:
            # Create placeholder options if not parseable
            for opt_id in ['A', 'B', 'C', 'D', 'E']:
                options.append({"id": opt_id, "content": f"Xem đề gốc"})
        
        # Check if noShuffle needed (combined answers like "c và d", "a và b")
        no_shuffle = False
        answer_lower = answer_text.lower()
        if re.match(r'^[a-e]\s+và\s+[a-e]', answer_lower):
            no_shuffle = True
        if 'tất cả' in answer_lower or 'sai hết' in answer_lower or 'đúng hết' in answer_lower:
            no_shuffle = True
        
        q_data = {
            "id": q_id,
            "question": question_text,
            "options": options,
            "answer": answer,
            "explain": explanation,
            "topic": topic
        }
        
        if no_shuffle:
            q_data["noShuffle"] = True
            
        questions.append(q_data)
    
    return questions

def main():
    input_file = r"subjects/utt/kth/remake.md"
    output_file = r"subjects/utt/kth/exam/kth_questions.json"
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    print("Parsing remake.md...")
    questions = parse_remake_md(input_file)
    print(f"Found {len(questions)} questions")
    
    # Count noShuffle
    no_shuffle_count = sum(1 for q in questions if q.get("noShuffle"))
    print(f"Questions with noShuffle: {no_shuffle_count}")
    
    # Group by topic for analysis
    topics = {}
    for q in questions:
        topic = q.get("topic", "Unknown")
        if topic not in topics:
            topics[topic] = []
        topics[topic].append(q["id"])
    
    print("\nTopics found:")
    for topic, ids in sorted(topics.items()):
        print(f"  {topic}: {len(ids)} questions")
    
    # Create output
    output = {
        "title": "Đề cương ôn tập Kinh tế học",
        "total_questions": len(questions),
        "questions": questions
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=4)
    
    print(f"\nSaved to {output_file}")
    
    # Save topics mapping for study_data update
    with open(r"subjects/utt/kth/topics_mapping.json", 'w', encoding='utf-8') as f:
        json.dump(topics, f, ensure_ascii=False, indent=4)
    print("Saved topics mapping to topics_mapping.json")

if __name__ == "__main__":
    main()

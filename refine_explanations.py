import json
import os
import time
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("Error: GEMINI_API_KEY not found in .env")
    exit(1)

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.0-flash')

EXAM_DIR = 'exam'
CHAPTER_FILES = ['chuong_1.json', 'chuong_2.json', 'chuong_3.json']

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

def refine_explanation(question, options, correct_letter, current_explanation):
    # Find text of correct answer and distractors
    correct_text = ""
    distractors = []
    
    for opt in options:
        if opt['letter'] == correct_letter:
            correct_text = opt['text']
        else:
            distractors.append(opt['text'])
            
    prompt = f"""
    Bạn là một giảng viên Triết học Mác-Lênin. Hãy viết lại lời giải thích cho câu hỏi trắc nghiệm sau đây để phù hợp với việc xáo trộn đáp án.
    
    Yêu cầu quan trọng nhất:
    1. KHI GIẢI THÍCH, TUYỆT ĐỐI KHÔNG ĐƯỢC NHẮC ĐẾN "Đáp án A", "Đáp án B", "Câu C", "Phương án D"... hay bất kỳ ký tự chữ cái nào chỉ vị trí đáp án.
    2. Giải thích trực tiếp tại sao nội dung "{correct_text}" là đúng.
    3. Giải thích ngắn gọn tại sao các phương án sai (gồm: {', '.join(distractors)}) lại không chính xác (hoặc chúng thuộc về quan điểm/thời kỳ nào khác).
    4. Giọng văn học thuật, chuẩn xác, dễ hiểu.
    5. Chỉ trả về nội dung giải thích, không thêm tiêu đề.

    Câu hỏi: {question}
    Nội dung đúng: {correct_text}
    Giải thích cũ (đang bị lỗi tham chiếu A,B,C): {current_explanation}
    """
    
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Sanitize quotes
        text = text.replace('“', '"').replace('”', '"')
        text = text.replace('‘', "'").replace('’', "'")
        return text
    except Exception as e:
        print(f"  Error generating explanation: {e}")
        return None

def process_file(filename):
    filepath = os.path.join(EXAM_DIR, filename)
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    print(f"Processing {filename}...")
    data = load_json(filepath)
    changed_count = 0
    
    total = len(data['questions'])
    print(f"  Total questions: {total}")
    
    for i, q in enumerate(data['questions']):
        # Filter logic: regenerate if it contains references to letters or if we want to improve all.
        # Given user feedback, let's regenerate ALL to be safe and consistent, 
        # OR at least the ones that explicitly mention "Đáp án [A-D]" or "Câu [A-D]".
        # My previous script removed "Đáp án A đúng", but the content "Các đáp án A, B..." might still be there.
        
        explanation = q.get('explanation', '')
        # Check for lingering letter references
        needs_refining = False
        keywords = ["đáp án A", "đáp án B", "đáp án C", "đáp án D", 
                    "câu A", "câu B", "câu C", "câu D",
                   "phương án A", "phương án B", "phương án C", "phương án D"]
        
        if any(k in explanation.lower() for k in keywords):
            needs_refining = True
        
        # Also refine if explanation is missing or very short generic fallback
        if not explanation or len(explanation) < 20:
             needs_refining = True

        # Let's force refine for now to ensure quality as per user request "đọc lại toàn bộ"
        needs_refining = True 

        if needs_refining:
            print(f"    [{i+1}/{total}] Refining Q{q['question']}...")
            new_expl = refine_explanation(q['text'], q['options'], q['correct_answer'], explanation)
            
            if new_expl:
                q['explanation'] = new_expl
                changed_count += 1
                # Save periodically
                if changed_count % 5 == 0:
                    save_json(filepath, data)
                time.sleep(5) # Avoid rate limits
            else:
                print("    Skipped due to error.")
        
    save_json(filepath, data)
    print(f"  Completed {filename}. Refined {changed_count} explanations.")

if __name__ == "__main__":
    for f in CHAPTER_FILES:
        process_file(f)

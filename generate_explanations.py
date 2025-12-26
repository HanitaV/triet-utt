import json
import os
import time
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

EXAM_DIR = 'docs/exam'

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

def ask_gemini(prompt):
    headers = {'Content-Type': 'application/json'}
    params = {'key': API_KEY}
    data = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.3 # Low temperature for factual accuracy
        }
    }
    
    for attempt in range(3):
        try:
            response = requests.post(API_URL, headers=headers, params=params, json=data)
            response.raise_for_status()
            result = response.json()
            if 'candidates' not in result:
                print(f"Error: No candidates in response: {result}")
                return None
            content = result['candidates'][0]['content']['parts'][0]['text']
            # Clean potential markdown
            if content.startswith('```json'):
                content = content[7:]
            if content.endswith('```'):
                content = content[:-3]
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                 # fallback to raw string if single explanation (though we request JSON dict)
                 return content
        except Exception as e:
            print(f"Error calling Gemini (attempt {attempt+1}): {e}")
            time.sleep(2)
    return None

def main():
    chapters = [1, 2, 3] # Process all chapters
    
    for chapter in chapters:
        filename = f"chuong_{chapter}.json"
        filepath = os.path.join(EXAM_DIR, filename)
        
        if not os.path.exists(filepath):
            print(f"File not found: {filepath}")
            continue
            
        print(f"\nProcessing {filename}...")
        data = load_json(filepath)
        questions = data['questions']
        updated_count = 0
        
        # Batch process questions to be efficient
        BATCH_SIZE = 10
        for i in range(0, len(questions), BATCH_SIZE):
            batch = questions[i:i+BATCH_SIZE]
            
            # Filter batch to only those needing explanations (or overwrite all if preferred)
            # User wants to do ALL questions based on request "lý giải hết câu hỏi"
            
            # Prepare prompt
            q_list_text = ""
            for q in batch:
                options_text = "; ".join([f"{o['letter']}. {o['text']}" for o in q['options']])
                q_list_text += f"\nID: {q['question']}\nText: {q['text']}\nOptions: {options_text}\nCorrect Answer: {q['correct_answer']}\n"

            prompt = f"""
            Role: Expert Professor of Marxist-Leninist Philosophy.
            Source Material: Standard "Giáo trình Triết học Mác-Lênin" (Ministry of Education, Vietnam).
            
            Task: Provide a clear, concise, and academic explanation for each question below.
            - Explain WHY the correct answer is right based on the textbook.
            - Briefly explain why the distractors are wrong (if applicable).
            - Keep the tone formal and educational (Vietnamese).
            - Output strictly valid JSON format where keys are Question IDs (integers) and values are the explanation strings.
            
            Questions:
            {q_list_text}
            
            Example Output:
            {{
                "1": "Đáp án A đúng vì theo giáo trình (trang 50), vật chất quyết định ý thức...",
                "2": "Đáp án B đúng vì..."
            }}
            """
            
            print(f"  Generating batch {i//BATCH_SIZE + 1}/{len(questions)//BATCH_SIZE + 1}...")
            explanations = ask_gemini(prompt)
            
            if explanations and isinstance(explanations, dict):
                for q in batch:
                    q_id_str = str(q['question'])
                    if q_id_str in explanations:
                        q['explanation'] = explanations[q_id_str]
                        updated_count += 1
            else:
                print("    Failed or invalid response for batch.")
                
        # Save after each chapter
        save_json(filepath, data)
        print(f"  Saved {updated_count} explanations to {filename}")

    print("\nDone! Explanations generated.")

if __name__ == "__main__":
    main()

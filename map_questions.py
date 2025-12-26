import json
import os
import time
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

STUDY_DATA_FILE = 'docs/study_data.json'
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
        "generationConfig": {"response_mime_type": "application/json"}
    }
    
    for attempt in range(3):
        try:
            response = requests.post(API_URL, headers=headers, params=params, json=data)
            response.raise_for_status()
            result = response.json()
            content = result['candidates'][0]['content']['parts'][0]['text']
            # Clean potential markdown
            if content.startswith('```json'):
                content = content[7:]
            if content.endswith('```'):
                content = content[:-3]
            return json.loads(content)
        except Exception as e:
            print(f"Error calling Gemini (attempt {attempt+1}): {e}")
            time.sleep(2)
    return None

def main():
    study_data = load_json(STUDY_DATA_FILE)
    
    for section in study_data:
        chapter = section['chapter']
        print(f"\nProcessing Chapter {chapter}...")
        
        # Load questions for this chapter
        exam_file = os.path.join(EXAM_DIR, f"chuong_{chapter}.json")
        if not os.path.exists(exam_file):
            print(f"Exam file not found: {exam_file}")
            continue
            
        exam_data = load_json(exam_file)
        questions = exam_data['questions']
        
        # Prepare data for Gemini
        topics_info = []
        for idx, topic in enumerate(section['topics']):
            topics_info.append({
                "id": idx,
                "title": topic['title'],
                "theory_excerpt": topic['theory'][:200]  # First 200 chars for context
            })
            # Initialize questionIds if not present
            if 'questionIds' not in topic:
                topic['questionIds'] = []
            else:
                # Clear existing for full re-mapping
                topic['questionIds'] = []

        # Process questions in batches to avoid token limits
        BATCH_SIZE = 20
        for i in range(0, len(questions), BATCH_SIZE):
            batch_questions = questions[i:i+BATCH_SIZE]
            q_inputs = [{"id": q['question'], "text": q['text']} for q in batch_questions]
            
            prompt = f"""
            You are an expert philosophy teacher. 
            I have a list of Topics from Chapter {chapter} of Marxist-Leninist Philosophy.
            I have a list of Exam Questions.
            
            Task: Assign each Question to the MOST relevant Topic.
            Each question must belong to exactly one topic.
            
            Topics:
            {json.dumps(topics_info, ensure_ascii=False, indent=2)}
            
            Questions:
            {json.dumps(q_inputs, ensure_ascii=False, indent=2)}
            
            Return a JSON object where keys are the specific Topic IDs (integers 0, 1, etc.) and values are lists of Question IDs (integers) assigned to that topic.
            Example format:
            {{
                "0": [1, 4, 5],
                "1": [2, 3]
            }}
            """
            
            print(f"  Mapping batch {i//BATCH_SIZE + 1} ({len(batch_questions)} questions)...")
            mapping = ask_gemini(prompt)
            
            if mapping:
                for topic_idx_str, q_ids in mapping.items():
                    try:
                        t_idx = int(topic_idx_str)
                        if 0 <= t_idx < len(section['topics']):
                            section['topics'][t_idx]['questionIds'].extend(q_ids)
                            print(f"    Assigned {len(q_ids)} questions to Topic {t_idx}")
                    except ValueError:
                        pass
            else:
                print("    Failed to get mapping for batch.")

    save_json(STUDY_DATA_FILE, study_data)
    print("\nDone! Updated study_data.json with question mappings.")

if __name__ == "__main__":
    main()

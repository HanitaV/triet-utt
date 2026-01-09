
import json
import os
import sys

# Force UTF-8 encoding for stdout
sys.stdout.reconfigure(encoding='utf-8')

EXAM_DIR = r"c:\Users\YAYSOOSWhite\Documents\triet-utt\subjects\utt\triet-mac-lenin\exam"

def remove_invalid_questions():
    if not os.path.exists(EXAM_DIR):
        print(f"Directory not found: {EXAM_DIR}")
        return

    files = [f for f in os.listdir(EXAM_DIR) if f.endswith('.json')]
    total_removed = 0
    
    print(f"Processing files in: {EXAM_DIR}")
    print("-" * 50)
    
    for filename in files:
        filepath = os.path.join(EXAM_DIR, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            questions = data.get('questions', [])
            original_count = len(questions)
            
            # Filter questions to keep only those with exactly 4 choices
            valid_questions = [q for q in questions if len(q.get('options', [])) == 4]
            
            removed_count = original_count - len(valid_questions)
            
            if removed_count > 0:
                print(f"File: {filename} | Removing {removed_count} invalid questions.")
                total_removed += removed_count
                
                # Update data
                data['questions'] = valid_questions
                data['total_questions'] = len(valid_questions) # Update total count
                
                # Write back to file
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                print(f"  -> Saved changes to {filename}")
            else:
                print(f"File: {filename} | No invalid questions found.")

        except Exception as e:
            print(f"Error processing {filename}: {e}")

    print("-" * 50)
    print(f"Total Questions Removed: {total_removed}")

if __name__ == "__main__":
    remove_invalid_questions()

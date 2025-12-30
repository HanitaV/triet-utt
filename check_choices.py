
import json
import os
import sys

# Force UTF-8 encoding for stdout
sys.stdout.reconfigure(encoding='utf-8')

EXAM_DIR = r"c:\Users\YAYSOOSWhite\Documents\triet-utt\subjects\utt\triet-mac-lenin\exam"

def check_files():
    if not os.path.exists(EXAM_DIR):
        print(f"Directory not found: {EXAM_DIR}")
        return

    files = [f for f in os.listdir(EXAM_DIR) if f.endswith('.json')]
    total_checked = 0
    total_invalid = 0
    
    print(f"Checking files in: {EXAM_DIR}")
    print("-" * 50)
    
    for filename in files:
        filepath = os.path.join(EXAM_DIR, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            questions = data.get('questions', [])
            file_invalid_count = 0
            
            print(f"Processing {filename} ({len(questions)} questions)...")

            for q in questions:
                total_checked += 1
                options = q.get('options', [])
                if len(options) != 4:
                    print(f"  [FOUND] Question {q.get('question')} | Choices: {len(options)}")
                    file_invalid_count += 1
                    total_invalid += 1
            
            if file_invalid_count == 0:
                print(f"  -> All {len(questions)} questions have 4 choices.")
            else:
                 print(f"  -> Found {file_invalid_count} questions with != 4 choices.")

        except Exception as e:
            print(f"Error reading {filename}: {e}")

    print("-" * 50)
    print(f"Total Questions Checked: {total_checked}")
    print(f"Total Invalid Questions: {total_invalid}")

    # Generate Report
    report_path = r"c:\Users\YAYSOOSWhite\.gemini\antigravity\brain\65c0f59e-c09a-4522-9e8d-ff48d741920e\invalid_questions_report.md"
    
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write("# Invalid Questions Report\n\n")
        f.write("The following questions do not have exactly 4 choices.\n\n")
        
        for filename in files:
            filepath = os.path.join(EXAM_DIR, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as jf:
                    data = json.load(jf)
                questions = data.get('questions', [])
                
                header_written = False
                
                for q in questions:
                    options = q.get('options', [])
                    if len(options) != 4:
                        if not header_written:
                            f.write(f"## File: `{filename}`\n\n")
                            header_written = True
                        
                        f.write(f"### Question {q.get('question')}\n")
                        f.write(f"**Text:** {q.get('text')}\n\n")
                        f.write(f"**Choice Count:** {len(options)}\n\n")
                        f.write("**Options:**\n")
                        for idx, opt in enumerate(options):
                            f.write(f"- {idx+1}. ({opt.get('letter')}) {opt.get('text')}\n")
                        f.write("\n---\n\n")
            except:
                pass
    
    print(f"Report written to: {report_path}")

if __name__ == "__main__":
    check_files()

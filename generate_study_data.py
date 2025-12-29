import json
import os

def main():
    root_dir = r"c:\Users\eleven\triet-utt"
    # Target subject for default study data
    subject_dir = os.path.join(root_dir, "subjects", "utt", "triet-mac-lenin")
    subject_file = os.path.join(subject_dir, "subject.json")
    
    if not os.path.exists(subject_file):
        print(f"Subject file not found: {subject_file}")
        return

    with open(subject_file, "r", encoding="utf-8") as f:
        subject_conf = json.load(f)
        
    study_topics = []
    
    for chapter in subject_conf["chapters"]:
        # chapter: {id: "1", name: "Chương 1...", file: "chuong_1.json"}
        
        file_path = os.path.join(subject_dir, "exam", chapter["file"])
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            # Try root folder fallback (legacy structure)
            file_path = os.path.join(root_dir, chapter["file"])
            if not os.path.exists(file_path):
                 print(f"File strictly not found: {file_path}")
                 continue
            
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        questions = data.get("questions", [])
        q_ids = [q.get("id") for q in questions] # Use all questions for this chapter as one topic
        
        # Create a topic for the Chapter
        topic = {
            "title": chapter["name"],
            "icon": "📚", 
            "chapters": [chapter["id"]],
            "description": f"Ôn tập toàn bộ kiến thức {chapter['name']}",
            "questionIds": {
                str(chapter["id"]): q_ids
            },
            "videos": [], 
            "content": f"<h3>{chapter['name']}</h3><p>Tổng hợp câu hỏi trắc nghiệm {chapter['name']}.</p>",
            "goals": [
                f"Hoàn thành {len(questions)} câu hỏi",
                "Nắm vững kiến thức chương"
            ],
            "tips": [
                "Ôn lại giáo trình",
                "Luyện tập thường xuyên"
            ],
            "notebookUrl": "#" 
        }
        study_topics.append(topic)
        
    output_path = os.path.join(root_dir, "study_data.json")
    with open(output_path, "w", encoding="utf-8") as f: # Save to ROOT
        json.dump(study_topics, f, indent=4, ensure_ascii=False)
        
    print(f"Generated study_data.json with {len(study_topics)} topics.")

if __name__ == "__main__":
    main()

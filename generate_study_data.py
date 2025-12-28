import json
import os

def main():
    base_dir = r"c:\Users\eleven\triet-utt\subjects\utt\English"
    subject_file = os.path.join(base_dir, "subject.json")
    
    with open(subject_file, "r", encoding="utf-8") as f:
        subject_conf = json.load(f)
        
    study_topics = []
    
    for chapter in subject_conf["chapters"]:
        # chapter: {id: "unit-1", name: "...", file: "..."}
        
        file_path = os.path.join(base_dir, "exam", chapter["file"])
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            continue
            
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        questions = data.get("questions", [])
        
        # Group by Skill
        skills_map = {} # "Reading" -> [q_ids]
        
        for q in questions:
            # Extract skill from formatted text <b>[Skill]</b> or <b>[Skill: Detail]</b>
            # Default to "General"
            skill = "General"
            
            # Try to extract from bold tag
            # e.g. <b>[Reading]</b> or <b>[Grammar: Adverbs]</b>
            import re
            match = re.search(r'<b>\[(.*?)(?:\]|:)', q.get("question", ""))
            if match:
                skill = match.group(1).strip()
            else:
                # Fallback to parsing ID: unit-1-reading-1
                parts = q.get("id", "").split('-')
                # Heuristic: find known keywords in ID parts
                for p in parts:
                    if p in ["reading", "grammar", "vocabulary", "pronunciation", "speaking", "writing"]:
                        skill = p.title()
                        break
            
            if skill not in skills_map:
                skills_map[skill] = []
            skills_map[skill].append(q["id"])
            
        # Create a topic for each skill
        for skill, q_ids in skills_map.items():
            # Build nice title
            # If Unit 1 -> "Unit 1: Skill"
            # But chapter["name"] is "Unit 1: All about me"
            # Let's make it "Unit 1 - Reading" or just keep the full name + Skill?
            # User wants "Unit 1", "Unit 2" tabs?
            # Actually, study.js filters by chapter. The list shows "Topics".
            # So "Unit 1 - Reading", "Unit 1 - Grammar" is good.
            
            # Extract "Unit 1" prefix if possible for shorter title, or just use full name
            # "Unit 1: All about me" -> "Unit 1 - Reading" ?
            # Or "Unit 1: Reading" ?
            
            # Let's try to be smart:
            # chapter["name"] = "Unit 1: All about me"
            # title = "Reading (Unit 1)" ?
            
            # "Listening", "Speaking" often shorter.
            # Let's process chapter name to be a bit shorter if it's long?
            # No, keep it simple: "{Skill}: {Chapter Name}"
            # Examle: "Reading: Unit 1: All about me" (Too long?)
            # Maybe just "{Skill} - {Chapter ID}"? No, need human name.
            
            # Let's go with: "Unit 1 - {Skill}" if "Unit 1" is in name.
            base_title = chapter["name"]
            # If base title has ":", take the part before ":" as Short Name?
            if ":" in base_title:
                short_name = base_title.split(":")[0].strip() # "Unit 1"
                display_title = f"{short_name} - {skill}"
            else:
                display_title = f"{base_title} - {skill}"
                
            topic = {
                "title": display_title,
                "icon": "🇬🇧", # Could customize icon per skill? 📖 Reading, 🗣 Speaking, etc.
                "chapters": [chapter["id"]],
                "description": f"Ôn tập {skill} cho {chapter['name']}",
                "questionIds": {
                    chapter["id"]: q_ids
                },
                "videos": [], 
                "content": f"<h3>{skill}</h3><p>Bài tập và lý thuyết phần {skill} của {chapter['name']}.</p>",
                "goals": [
                    f"Hoàn thành các bài tập {skill}",
                    "Kiểm tra đáp án và xem giải thích"
                ],
                "tips": [
                    "Đọc kỹ hướng dẫn",
                    "Chú ý từ khóa quan trọng"
                ],
                "notebookUrl": "#" 
            }
            
            # Custom Icons
            if "Reading" in skill: topic["icon"] = "📖"
            elif "Grammar" in skill: topic["icon"] = "✍️"
            elif "Vocabulary" in skill: topic["icon"] = "🔤"
            elif "Listening" in skill: topic["icon"] = "🎧"
            elif "Speaking" in skill: topic["icon"] = "🗣"
            
            study_topics.append(topic)
        
    output_path = os.path.join(base_dir, "study_data.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(study_topics, f, indent=4, ensure_ascii=False)
        
    print(f"Generated study_data.json with {len(study_topics)} topics.")

if __name__ == "__main__":
    main()

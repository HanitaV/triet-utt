
import json
import os

files_to_update = [
    r"c:\Users\eleven\triet-utt\study_data.json",
    r"c:\Users\eleven\triet-utt\subjects\ptit\phap-luat-dai-cuong\study_data.json",
    r"c:\Users\eleven\triet-utt\subjects\utt\kth\study_data.json",
    r"c:\Users\eleven\triet-utt\subjects\utt\log\study_data.json",
    r"c:\Users\eleven\triet-utt\subjects\utt\triet-mac-lenin\study_data.json"
]

def update_file(file_path):
    if not os.path.exists(file_path):
        print(f"Skipping {file_path} (not found)")
        return

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        updated_count = 0
        for topic in data:
            title = topic.get('title', '')
            topic_id = topic.get('id')
            
            suffix = f" #{topic_id}"
            
            if topic_id is not None and not title.endswith(suffix):
                # Check if it already has A #ID format but maybe different spacing or something?
                # The user just wants to add #id. 
                # Let's simple check if the specific string " #{id}" is at the end.
                topic['title'] = f"{title}{suffix}"
                updated_count += 1
        
        if updated_count > 0:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=4)
            print(f"Updated {updated_count} topics in {file_path}")
        else:
            print(f"No changes needed for {file_path}")

    except Exception as e:
        print(f"Error updating {file_path}: {e}")

if __name__ == "__main__":
    for fp in files_to_update:
        update_file(fp)

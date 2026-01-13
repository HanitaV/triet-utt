
import json
import re

def format_content(text):
    # Basic cleanup
    lines = text.split('\n')
    html_parts = []
    
    # Add warning note
    html_parts.append('<div style="background-color: rgba(255, 193, 7, 0.1); border-left: 4px solid #ffc107; padding: 10px; margin-bottom: 20px; border-radius: 4px;">')
    html_parts.append('<b>⚠️ LƯU Ý QUAN TRỌNG:</b><br>')
    html_parts.append('Đây là phần giải bài tập tự luận dùng để <b>THAM KHẢO</b>.<br>')
    html_parts.append('Phần này <b>KHÔNG</b> có câu hỏi trắc nghiệm và không tính vào tiến độ học tập.')
    html_parts.append('</div>')
    
    current_list = False
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Format "Bài X" as headers
        if re.match(r'^Bài \d+', line):
            if current_list:
                html_parts.append('</ul>')
                current_list = False
            html_parts.append(f'<h3 style="color: var(--primary-color, #007bff); margin-top: 20px;">{line}</h3>')
            continue
            
        # Format "1)", "2)" as sub-headers/bold
        if re.match(r'^\d+\)', line):
            if current_list:
                html_parts.append('</ul>')
                current_list = False
            html_parts.append(f'<div style="margin-top: 10px;"><b>{line}</b></div>')
            continue
            
        # Format bullet points
        if line.startswith('•') or line.startswith('- '):
            if not current_list:
                html_parts.append('<ul>')
                current_list = True
            content = line.lstrip('•- ')
            # LaTeX cleanup
            content = content.replace(r'\frac', '')
            content = content.replace(r'\cdot', '.')
            content = content.replace(r'\Delta', 'Δ')
            content = content.replace(r'\sqrt', '√')
            content = content.replace('{', '').replace('}', '')
            # Try to fix some fraction formatting like 580-Q/15 -> (580-Q)/15 if possible, but simple strip is safer for now 
            # or just leave it as it's readable enough
            
            html_parts.append(f'<li>{content}</li>')
        else:
            if current_list:
                html_parts.append('</ul>')
                current_list = False
            html_parts.append(f'<p>{line}</p>')
            
    if current_list:
        html_parts.append('</ul>')
        
    return ''.join(html_parts)

def update_study_data():
    txt_path = r"c:\Users\eleven\triet-utt\subjects\utt\kth\tuluan.txt"
    json_path = r"c:\Users\eleven\triet-utt\subjects\utt\kth\study_data.json"
    
    try:
        with open(txt_path, 'r', encoding='utf-8') as f:
            txt_content = f.read()
            
        html_content = format_content(txt_content)
        
        with open(json_path, 'r', encoding='utf-8') as f:
            study_data = json.load(f)
            
        # Check if topic already exists to avoid duplicates (optional but good)
        # We'll just append a new one
        
        new_topic = {
            "id": 13,
            "title": "Giải bài tập Tự luận (Tham khảo)",
            "icon": "📝",
            "content": html_content,
            "goals": [
                "Tham khảo cách giải các dạng bài tập tự luận",
                "Hiểu rõ hơn về phương pháp tính toán",
                "Ôn tập kiến thức qua bài tập thực hành"
            ],
            "tips": [
                "💡 Đây chỉ là tài liệu tham khảo",
                "📌 Hãy tự làm bài trước khi xem đáp án",
                "🧠 Kết hợp với lý thuyết để hiểu sâu hơn"
            ],
            "keywords": [
                "tự luận",
                "bài tập",
                "tham khảo",
                "lời giải"
            ],
            "chapters": [
                1
            ],
            "videos": [],
            "questionIds": {
                "1": []
            }
        }
        
        # Remove existing topic 13 if it exists
        study_data = [t for t in study_data if t['id'] != 13]
        study_data.append(new_topic)
        
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(study_data, f, ensure_ascii=False, indent=4)
            
        print("Successfully updated study_data.json")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    update_study_data()

import json
import os

def create_study_data():
    questions_path = r"c:\Users\eleven\triet-utt\subjects\utt\kth\exam\kth_questions.json"
    output_path = r"c:\Users\eleven\triet-utt\subjects\utt\kth\study_data.json"
    
    with open(questions_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        questions = data['questions']
        
    # Split IDs
    micro_ids = [q['id'] for q in questions if q['id'] < 60]
    macro_ids = [q['id'] for q in questions if q['id'] >= 60]
    
    study_data = {
        "topics": [
            {
                "id": "topic-micro",
                "title": "Phần 1: Kinh tế Vi mô",
                "description": "Cung cầu, hành vi người tiêu dùng, chi phí sản xuất, cấu trúc thị trường.",
                "image": "assets/images/study/micro.png",
                "chapters": ["unit-1"],
                "questionIds": {
                    "unit-1": micro_ids
                },
                "goals": [
                    "Hiểu quy luật cung cầu",
                    "Nắm vững lý thuyết người tiêu dùng",
                    "Phân tích hành vi doanh nghiệp"
                ],
                "tips": [
                    "Chú ý phân biệt sự dịch chuyển và trượt dọc đường cầu"
                ],
                "videos": []
            },
            {
                "id": "topic-macro",
                "title": "Phần 2: Kinh tế Vĩ mô",
                "description": "Các chỉ tiêu vĩ mô, tổng cung tổng cầu, chính sách tài khóa và tiền tệ.",
                "image": "assets/images/study/macro.png",
                "chapters": ["unit-1"],
                 "questionIds": {
                    "unit-1": macro_ids
                },
                "goals": [
                    "Tính toán GDP, GNP, CPI",
                    "Hiểu mô hình IS-LM",
                    "Phân tích tác động chính sách"
                ],
                "tips": [
                    "Ghi nhớ các công thức tính GDP và số nhân"
                ],
                "videos": []
            }
        ]
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(study_data, f, ensure_ascii=False, indent=4)
        
    print(f"Created study_data.json with {len(micro_ids)} Micro and {len(macro_ids)} Macro questions.")

if __name__ == "__main__":
    create_study_data()

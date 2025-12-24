import re
from pathlib import Path

base_dir = Path(r'c:\Users\YAYSOOSWhite\Documents\triet-utt')

def clean_and_analyze(filename):
    filepath = base_dir / filename
    content = filepath.read_text(encoding='utf-8')
    
    # Remove image filename lines
    lines = content.split('\n')
    cleaned_lines = [line for line in lines if not line.strip().startswith('--- IMG')]
    cleaned_content = '\n'.join(cleaned_lines)
    
    # Remove ANSWER: lines
    cleaned_content = re.sub(r'^ANSWER:.*$', '', cleaned_content, flags=re.MULTILINE)
    
    # Remove excessive blank lines
    cleaned_content = re.sub(r'\n{3,}', '\n\n', cleaned_content)
    
    # Save cleaned file
    filepath.write_text(cleaned_content.strip(), encoding='utf-8')
    print(f"Cleaned: {filename}")
    
    # Count questions
    questions = re.findall(r'^\d+\.', cleaned_content, re.MULTILINE)
    
    # Find issues - questions missing options
    issues = []
    blocks = re.split(r'\n(?=\d+\.)', cleaned_content)
    
    for block in blocks:
        match = re.match(r'^(\d+)\.', block.strip())
        if match:
            q_num = match.group(1)
            has_a = 'a.' in block.lower() or 'a)' in block.lower()
            has_b = 'b.' in block.lower() or 'b)' in block.lower()
            has_c = 'c.' in block.lower() or 'c)' in block.lower()
            has_d = 'd.' in block.lower() or 'd)' in block.lower()
            
            missing = []
            if not has_a: missing.append('a')
            if not has_b: missing.append('b')
            if not has_c: missing.append('c')
            if not has_d: missing.append('d')
            
            if missing:
                preview = block[:80].replace('\n', ' ')
                issues.append((q_num, missing, preview))
    
    return issues, len(questions)

# Process files
all_issues = {}
total_q = 0

for f in ['chuong_1.txt', 'chuong_2.txt']:
    issues, count = clean_and_analyze(f)
    all_issues[f] = issues
    total_q += count
    print(f'{f}: {count} cau hoi, {len(issues)} loi')

# Create review markdown
review = f'''# 📋 OCR Review - Triết học Mác-Lênin

## Tổng quan
- **Tổng số câu hỏi phát hiện:** {total_q}
- **Chương 1:** chuong_1.txt  
- **Chương 2:** chuong_2.txt

## ⚠️ Các câu hỏi cần kiểm tra

'''

for f, issues in all_issues.items():
    review += f'### {f}\n\n'
    if issues:
        for q_num, missing, preview in issues:
            review += f'- **Câu {q_num}**: Thiếu `{", ".join(missing)}`\n'
            review += f'  - Preview: _{preview}..._\n'
    else:
        review += '✅ Không phát hiện lỗi rõ ràng\n'
    review += '\n'

review += '''
## 📝 Lưu ý
1. Một số câu hỏi có thể bị cắt giữa các ảnh
2. Các dòng chứa tên file và "ANSWER:" đã được loại bỏ
3. Kiểm tra lại các câu được liệt kê ở trên

---
*Review tự động*
'''

review_path = base_dir / 'review.md'
review_path.write_text(review, encoding='utf-8')
print(f'\nDa tao: review.md')

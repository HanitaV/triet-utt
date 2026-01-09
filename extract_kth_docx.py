import os
import sys

try:
    from docx import Document
except ImportError:
    print("python-docx not installed. Please run: pip install python-docx")
    sys.exit(1)

def extract_docx_text(docx_path, output_txt):
    if not os.path.exists(docx_path):
        print(f"File not found: {docx_path}")
        return

    print(f"Opening {docx_path}...")
    document = Document(docx_path)
    
    with open(output_txt, "w", encoding="utf-8") as f:
        for para in document.paragraphs:
            text = para.text.strip()
            if text:
                f.write(text + "\n")
                
    print(f"Extracted content to {output_txt}")

if __name__ == "__main__":
    docx_path = r"c:\Users\eleven\triet-utt\subjects\utt\kth\Đề cương ôn tập Kinh tế học.docx"
    output_txt = r"c:\Users\eleven\triet-utt\subjects\utt\kth\docx_content.txt"
    extract_docx_text(docx_path, output_txt)

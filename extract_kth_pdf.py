
import pypdf
import os

pdf_path = r"c:\Users\eleven\triet-utt\subjects\utt\kth\tuluan.pdf"
output_path = r"c:\Users\eleven\triet-utt\subjects\utt\kth\tuluan.txt"

if not os.path.exists(pdf_path):
    print(f"File not found: {pdf_path}")
    exit(1)

print(f"Extracting text from {pdf_path}...")
try:
    reader = pypdf.PdfReader(pdf_path)
    with open(output_path, "w", encoding="utf-8") as f:
        for page in reader.pages:
            text = page.extract_text()
            if text:
                f.write(text + "\n")
    print(f"Extracted text to {output_path}")
except Exception as e:
    print(f"Error extracting text: {e}")

import os

def extract_text(pdf_path, output_path):
    print(f"Attempting to extract text from {pdf_path}...")
    text = ""
    try:
        import pypdf
        print("Using pypdf...")
        reader = pypdf.PdfReader(pdf_path)
        for page in reader.pages:
            text += page.extract_text() + "\n"
    except ImportError:
        try:
            import PyPDF2
            print("pypdf not found, using PyPDF2...")
            reader = PyPDF2.PdfReader(pdf_path)
            for page in reader.pages:
                text += page.extract_text() + "\n"
        except ImportError:
            try:
                from pdfminer.high_level import extract_text as miner_extract
                print("PyPDF2 not found, using pdfminer...")
                text = miner_extract(pdf_path)
            except ImportError:
                print("Error: No PDF library found (pypdf, PyPDF2, pdfminer.six).")
                return False

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(text)
    
    print(f"Text extracted to {output_path}. Length: {len(text)} characters.")
    return True

if __name__ == "__main__":
    pdf_file = os.path.join("assets", "triet.pdf")
    txt_file = os.path.join("assets", "triet_raw.txt")
    if os.path.exists(pdf_file):
        extract_text(pdf_file, txt_file)
    else:
        print(f"File not found: {pdf_file}")


from pdfminer.high_level import extract_text
import pypdf

def analyze_pdf_miner(file_path):
    print(f"Analyzing {file_path}...")
    
    # Check for images using pypdf
    try:
        reader = pypdf.PdfReader(file_path)
        images_count = 0
        for page in reader.pages:
            images_count += len(page.images)
        print(f"Total Images Found: {images_count}")
    except Exception as e:
        print(f"pypdf error: {e}")

    # Extract text using pdfminer
    try:
        text = extract_text(file_path)
        if not text.strip():
            print("Extracted text is empty.")
            return

        print(f"Extracted Length: {len(text)} characters")
        print("\n--- TEXT SAMPLE (First 2000 chars) ---")
        print(text[:2000])
        
        print("\n--- TEXT SAMPLE (Middle 2000 chars) ---")
        mid = len(text) // 2
        print(text[mid:mid+2000])

        print("\n--- TEXT SAMPLE (Last 2000 chars) ---")
        print(text[-2000:])
        
    except Exception as e:
        print(f"pdfminer error: {e}")

if __name__ == "__main__":
    analyze_pdf_miner("subjects/utt/English/TACB.pdf")

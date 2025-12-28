
import pypdf
import random

def analyze_pdf(file_path):
    try:
        reader = pypdf.PdfReader(file_path)
        num_pages = len(reader.pages)
        print(f"Total Pages: {num_pages}")
        
        print("\n--- FIRST 5 PAGES ---")
        for i in range(min(5, num_pages)):
            print(f"\n[Page {i+1}]")
            print(reader.pages[i].extract_text())
            
        print("\n--- LAST 5 PAGES ---")
        for i in range(max(0, num_pages-5), num_pages):
            print(f"\n[Page {i+1}]")
            print(reader.pages[i].extract_text())
            
        print("\n--- RANDOM 5 PAGES ---")
        random_pages = random.sample(range(5, max(5, num_pages-5)), min(5, max(0, num_pages-10)))
        for i in sorted(random_pages):
            print(f"\n[Page {i+1}]")
            print(reader.pages[i].extract_text())

    except Exception as e:
        print(f"Error reading PDF: {e}")

if __name__ == "__main__":
    analyze_pdf("subjects/utt/English/TACB.pdf")

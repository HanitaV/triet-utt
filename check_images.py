
import pypdf

def check_images(file_path):
    print(f"Checking images in {file_path}...")
    try:
        reader = pypdf.PdfReader(file_path)
        total_images = 0
        for i, page in enumerate(reader.pages):
           count = len(page.images)
           total_images += count
           if count > 0:
               print(f"Page {i+1}: {count} images")
        
        print(f"Total Images: {total_images}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_images("subjects/utt/English/TACB.pdf")

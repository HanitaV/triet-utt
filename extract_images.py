
import pypdf
import os

def extract_images(pdf_path, output_dir):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    reader = pypdf.PdfReader(pdf_path)
    
    saved_count = 0
    for page_num, page in enumerate(reader.pages):
        for image_file in page.images:
            image_name = f"page_{page_num + 1}_{image_file.name}"
            image_path = os.path.join(output_dir, image_name)
            
            with open(image_path, "wb") as fp:
                fp.write(image_file.data)
                saved_count += 1
                print(f"Saved: {image_path}")
                
    print(f"Total images extracted: {saved_count}")

if __name__ == "__main__":
    extract_images("subjects/utt/English/TACB.pdf", "subjects/utt/English/images")

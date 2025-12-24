"""
OCR Script for Vietnamese Philosophy Exam Questions by Chapter
Uses OlmOCR-2-7B via LM Studio locally on port 1234
Resizes large images and uses shorter prompt to fit context window
"""

import os
import io
import base64
import requests
from pathlib import Path
from PIL import Image

# Configuration
LM_STUDIO_URL = "http://localhost:1234/v1/chat/completions"
IMAGES_DIR = Path(r"c:\Users\YAYSOOSWhite\Documents\triet-utt\cau_hoi")
OUTPUT_DIR = Path(r"c:\Users\YAYSOOSWhite\Documents\triet-utt")

CHAPTERS = ["chuong_3"]  # Process only chapter 3
PREVIEW_MODE = False  # Set to True to process only 1 image first
MAX_IMAGE_SIZE = 1600  # Larger size for better quality
MAX_FILE_SIZE_KB = 500  # Less compression

# Shortened OCR prompt to fit context window
OCR_PROMPT = "Trích xuất văn bản từ ảnh đề thi này. Bỏ qua dòng ANSWER và các ghi chú viết tay. Giữ nguyên câu hỏi và lựa chọn A,B,C,D."

def resize_and_compress_image(image_path: Path) -> str:
    """Resize and compress image, return base64 string."""
    img = Image.open(image_path)
    
    # Convert to RGB if necessary
    if img.mode in ('RGBA', 'P'):
        img = img.convert('RGB')
    
    # Resize if too large
    width, height = img.size
    if width > MAX_IMAGE_SIZE or height > MAX_IMAGE_SIZE:
        ratio = min(MAX_IMAGE_SIZE / width, MAX_IMAGE_SIZE / height)
        new_size = (int(width * ratio), int(height * ratio))
        img = img.resize(new_size, Image.LANCZOS)
        print(f"(resized {new_size[0]}x{new_size[1]})", end=" ")
    
    # Compress to JPEG
    buffer = io.BytesIO()
    quality = 70
    while quality > 20:
        buffer.seek(0)
        buffer.truncate()
        img.save(buffer, format='JPEG', quality=quality, optimize=True)
        size_kb = len(buffer.getvalue()) / 1024
        if size_kb <= MAX_FILE_SIZE_KB:
            break
        quality -= 10
    
    print(f"({size_kb:.0f}KB)", end=" ")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")

def ocr_image(image_path: Path) -> str:
    """OCR a single image using OlmOCR via LM Studio."""
    try:
        base64_image = resize_and_compress_image(image_path)
    except Exception as e:
        print(f"Error loading image: {e}")
        return f"[ERROR loading image: {str(e)}]"
    
    payload = {
        "model": "allenai/olmocr-2-7b",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}"
                        }
                    },
                    {
                        "type": "text",
                        "text": OCR_PROMPT
                    }
                ]
            }
        ],
        "max_tokens": 2048,
        "temperature": 0.1
    }
    
    try:
        response = requests.post(LM_STUDIO_URL, json=payload, timeout=300)
        response.raise_for_status()
        result = response.json()
        return result["choices"][0]["message"]["content"]
    except requests.exceptions.RequestException as e:
        print(f"\n  Error: {e}")
        return f"[ERROR: {str(e)}]"

def process_chapter(chapter_name: str):
    """Process all images in a chapter folder."""
    chapter_path = IMAGES_DIR / chapter_name
    output_file = OUTPUT_DIR / f"{chapter_name}.txt"
    
    if not chapter_path.exists():
        print(f"Directory not found: {chapter_path}")
        return 0
    
    image_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    image_files = sorted([
        f for f in chapter_path.iterdir() 
        if f.is_file() and f.suffix.lower() in image_extensions
    ])
    
    print(f"\n{'='*60}")
    print(f"Processing {chapter_name}: {len(image_files)} images")
    print(f"{'='*60}")
    
    all_text = []
    
    # In preview mode, only process 1 image
    if PREVIEW_MODE:
        image_files = image_files[:1]
        print("  [PREVIEW MODE] Processing only 1 image")
    
    for i, image_path in enumerate(image_files, 1):
        print(f"  [{i}/{len(image_files)}] {image_path.name}...", end=" ", flush=True)
        
        ocr_text = ocr_image(image_path)
        all_text.append(f"--- {image_path.name} ---\n{ocr_text}\n")
        
        print("Done")
        
        with open(output_file, "w", encoding="utf-8") as f:
            f.write("\n".join(all_text))
    
    print(f"  -> Saved to: {output_file}")
    return len(image_files)

def main():
    print("=" * 60)
    print("OCR Questions Extractor - OlmOCR via LM Studio")
    print("=" * 60)
    
    try:
        requests.get("http://localhost:1234/v1/models", timeout=5)
        print("✓ LM Studio is running")
    except requests.exceptions.RequestException:
        print("✗ ERROR: Cannot connect to LM Studio on port 1234")
        exit(1)
    
    total_images = 0
    for chapter in CHAPTERS:
        count = process_chapter(chapter)
        if count:
            total_images += count
    
    print(f"\n✓ Completed! Total: {total_images} images")

if __name__ == "__main__":
    main()

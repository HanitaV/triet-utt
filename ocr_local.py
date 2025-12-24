"""
OCR Script using Local LM Studio for Vietnamese Philosophy Exam Questions
No rate limits - runs locally
"""

import os
import io
import base64
import requests
from pathlib import Path
from PIL import Image

# Configuration
IMAGES_DIR = Path(r"c:\Users\YAYSOOSWhite\Documents\triet-utt\cau_hoi")
OUTPUT_DIR = Path(r"c:\Users\YAYSOOSWhite\Documents\triet-utt")
CHAPTERS = ["chuong_3"]

# LM Studio config
LM_STUDIO_URL = "http://localhost:1234/v1/chat/completions"

# Image settings
MAX_IMAGE_SIZE = 1600
MAX_FILE_SIZE_KB = 500

OCR_PROMPT = "Trích xuất văn bản từ ảnh đề thi này. Bỏ qua dòng ANSWER và các ghi chú viết tay. Giữ nguyên câu hỏi và lựa chọn A,B,C,D."


def resize_and_compress_image(image_path: Path) -> str:
    """Resize and compress image, return base64 string."""
    img = Image.open(image_path)
    
    if img.mode in ('RGBA', 'P'):
        img = img.convert('RGB')
    
    width, height = img.size
    if width > MAX_IMAGE_SIZE or height > MAX_IMAGE_SIZE:
        ratio = min(MAX_IMAGE_SIZE / width, MAX_IMAGE_SIZE / height)
        new_size = (int(width * ratio), int(height * ratio))
        img = img.resize(new_size, Image.LANCZOS)
        print(f"(resized {new_size[0]}x{new_size[1]})", end=" ")
    
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
    """OCR a single image using LM Studio."""
    try:
        base64_image = resize_and_compress_image(image_path)
    except Exception as e:
        return f"[ERROR loading image: {str(e)}]"
    
    payload = {
        "model": "allenai/olmocr-2-7b",
        "messages": [{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}},
                {"type": "text", "text": OCR_PROMPT}
            ]
        }],
        "max_tokens": 2048,
        "temperature": 0.1
    }
    
    try:
        response = requests.post(LM_STUDIO_URL, json=payload, timeout=300)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        return f"[ERROR LM Studio: {str(e)}]"


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
    
    total = len(image_files)
    print(f"\n{'='*60}")
    print(f"Processing {chapter_name}: {total} images (LOCAL)")
    print(f"{'='*60}")
    
    all_text = []
    
    for i, image_path in enumerate(image_files):
        print(f"  [{i+1}/{total}] {image_path.name}...", end=" ", flush=True)
        
        ocr_text = ocr_image(image_path)
        all_text.append(ocr_text)
        
        print("Done")
        
        # Save progress
        with open(output_file, "w", encoding="utf-8") as f:
            f.write("\n\n".join(all_text))
    
    print(f"  -> Saved to: {output_file}")
    return total


def main():
    print("=" * 60)
    print("OCR Questions Extractor - LOCAL LM Studio")
    print("=" * 60)
    
    # Check LM Studio
    try:
        requests.get("http://localhost:1234/v1/models", timeout=5)
        print("✓ LM Studio running")
    except:
        print("✗ LM Studio not running! Please start it first.")
        exit(1)
    
    total_images = 0
    for chapter in CHAPTERS:
        count = process_chapter(chapter)
        if count:
            total_images += count
    
    print(f"\n✓ Completed! Total: {total_images} images")


if __name__ == "__main__":
    main()

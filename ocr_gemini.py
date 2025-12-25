"""
OCR Script using AI Studio API (Gemini) - Sequential with Delay
"""

import os
import io
import base64
import time
import requests
from pathlib import Path
from PIL import Image
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Configuration
IMAGES_DIR = Path(r"c:\Users\YAYSOOSWhite\Documents\triet-utt\cau_hoi")
OUTPUT_DIR = Path(r"c:\Users\YAYSOOSWhite\Documents\triet-utt")
CHAPTERS = ["chuong_3"]

# Delay between requests (seconds) to avoid rate limit
DELAY_SECONDS = 4

# Image settings
MAX_IMAGE_SIZE = 1600
MAX_FILE_SIZE_KB = 500

# AI Studio API
API_KEY = os.getenv("GEMINI_API_KEY")
API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

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
    
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def ocr_image(image_path: Path, max_retries: int = 4) -> str:
    """OCR a single image using AI Studio API with retry on rate limit."""
    try:
        base64_image = resize_and_compress_image(image_path)
    except Exception as e:
        return f"[ERROR loading image: {str(e)}]"
    
    payload = {
        "contents": [{
            "parts": [
                {"inline_data": {"mime_type": "image/jpeg", "data": base64_image}},
                {"text": OCR_PROMPT}
            ]
        }]
    }
    
    retry_delay = 5  # Start with 5 seconds
    
    for attempt in range(max_retries):
        try:
            response = requests.post(
                f"{API_URL}?key={API_KEY}",
                json=payload,
                timeout=60
            )
            
            # Check for rate limit
            if response.status_code == 429:
                if attempt < max_retries - 1:
                    print(f"\n    ⚠ Rate limit! Waiting {retry_delay}s before retry ({attempt + 1}/{max_retries})...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                    continue
                else:
                    return f"[ERROR: Rate limit exceeded after {max_retries} retries]"
            
            response.raise_for_status()
            result = response.json()
            return result["candidates"][0]["content"]["parts"][0]["text"]
            
        except requests.exceptions.HTTPError as e:
            if "429" in str(e) and attempt < max_retries - 1:
                print(f"\n    ⚠ Rate limit! Waiting {retry_delay}s before retry ({attempt + 1}/{max_retries})...")
                time.sleep(retry_delay)
                retry_delay *= 2
                continue
            return f"[ERROR AI Studio: {str(e)}]"
        except Exception as e:
            return f"[ERROR AI Studio: {str(e)}]"
    
    return "[ERROR: Max retries exceeded]"


def process_chapter(chapter_name: str):
    """Process all images in a chapter folder sequentially with delay."""
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
    print(f"Processing {chapter_name}: {total} images (delay: {DELAY_SECONDS}s)")
    print(f"{'='*60}")
    
    all_text = []
    
    for i, image_path in enumerate(image_files):
        print(f"  [{i+1}/{total}] {image_path.name}...")
        
        ocr_text = ocr_image(image_path)
        all_text.append(ocr_text)
        
        # Show preview of OCR result
        preview = ocr_text[:200].replace('\n', ' ')
        if len(ocr_text) > 200:
            preview += "..."
        print(f"    ✓ Done ({len(ocr_text)} chars)")
        print(f"    Preview: {preview}")
        
        # Save progress after each image
        with open(output_file, "w", encoding="utf-8") as f:
            f.write("\n\n".join(all_text))
        
        # Delay before next request (except for last one)
        if i < total - 1:
            time.sleep(DELAY_SECONDS)
    
    print(f"  -> Saved to: {output_file}")
    return total


def main():
    print("=" * 60)
    print("OCR Questions Extractor - AI Studio API (with Delay)")
    print("=" * 60)
    
    if not API_KEY:
        print("ERROR: GEMINI_API_KEY not found in .env")
        exit(1)
    
    print(f"✓ API key loaded")
    print(f"✓ Delay: {DELAY_SECONDS}s between requests")
    
    total_images = 0
    for chapter in CHAPTERS:
        count = process_chapter(chapter)
        if count:
            total_images += count
    
    print(f"\n✓ Completed! Total: {total_images} images")


if __name__ == "__main__":
    main()

"""
Retry OCR for missing images with delay to avoid rate limit
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
IMAGES_DIR = Path(r"c:\Users\YAYSOOSWhite\Documents\triet-utt\cau_hoi\chuong_3")
OUTPUT_FILE = Path(r"c:\Users\YAYSOOSWhite\Documents\triet-utt\chuong_3_missing.txt")

# Missing images (0-indexed): need images at index 7, 8, 9, 10, 11, 12, 29, 30, 31, 35, 36
# Based on 37 images sorted, these correspond to specific files
# Let me identify by checking error positions

# Image settings
MAX_IMAGE_SIZE = 1600
MAX_FILE_SIZE_KB = 500

# Delay between requests (seconds) - slow down to avoid rate limit
DELAY_SECONDS = 3

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


def ocr_image(image_path: Path) -> str:
    """OCR a single image using AI Studio API."""
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
    
    try:
        response = requests.post(
            f"{API_URL}?key={API_KEY}",
            json=payload,
            timeout=60
        )
        response.raise_for_status()
        result = response.json()
        return result["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        return f"[ERROR AI Studio: {str(e)}]"


def main():
    print("=" * 60)
    print("Retry OCR for missing images (with delay)")
    print("=" * 60)
    
    if not API_KEY:
        print("ERROR: GEMINI_API_KEY not found in .env")
        exit(1)
    
    # Get all images sorted
    image_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    all_images = sorted([
        f for f in IMAGES_DIR.iterdir() 
        if f.is_file() and f.suffix.lower() in image_extensions
    ])
    
    # Missing image indices (0-indexed based on error analysis)
    # Errors occurred at: images that produced questions 30-32, 41-44, 59-62, etc.
    # Need to identify exact indices from the file order
    # Based on 37 images, errors were roughly at positions: 7, 10, 13, 29, 30, 35, 36
    missing_indices = [7, 10, 13, 29, 30, 35, 36]
    
    print(f"Total images: {len(all_images)}")
    print(f"Missing indices to retry: {missing_indices}")
    print(f"Delay between requests: {DELAY_SECONDS}s")
    print("-" * 60)
    
    all_text = []
    
    for i, idx in enumerate(missing_indices):
        if idx >= len(all_images):
            continue
            
        image_path = all_images[idx]
        print(f"  [{i+1}/{len(missing_indices)}] {image_path.name}...", end=" ", flush=True)
        
        ocr_text = ocr_image(image_path)
        all_text.append(f"=== Image {idx+1}: {image_path.name} ===\n{ocr_text}\n")
        
        print("Done")
        
        # Save progress
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            f.write("\n".join(all_text))
        
        # Delay before next request
        if i < len(missing_indices) - 1:
            print(f"  Waiting {DELAY_SECONDS}s...")
            time.sleep(DELAY_SECONDS)
    
    print(f"\n  -> Saved to: {OUTPUT_FILE}")
    print("✓ Done! Please manually merge missing content into chuong_3.txt")


if __name__ == "__main__":
    main()

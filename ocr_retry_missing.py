"""
Retry OCR for missing questions in chuong_3
Based on the errors, we need to retry specific images
"""

import os
import io
import base64
import time
import requests
from pathlib import Path
from PIL import Image

# API Keys - rotate through them
API_KEYS = [
    "AIzaSyCt9yvnq7BAH9_CFp_xOPvHU941N7achyg",
    "AIzaSyBWdOL6tPal6Wf2YPMbEAAt9Z6XeB2NtvM", 
    "AIzaSyAUfq2LyaUlJA025JEwUw8J_e_NahgyOy8",
    "AIzaSyADmYu8g6Zb39Y8ThqbClINQp9rmEffoJU",
]

API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

IMAGES_DIR = Path(r"c:\Users\YAYSOOSWhite\Documents\triet-utt\cau_hoi\chuong_3")
OUTPUT_FILE = Path(r"c:\Users\YAYSOOSWhite\Documents\triet-utt\chuong_3_retry.txt")

MAX_IMAGE_SIZE = 1600
MAX_FILE_SIZE_KB = 500

OCR_PROMPT = "Trích xuất văn bản từ ảnh đề thi này. Bỏ qua dòng ANSWER và các ghi chú viết tay. Giữ nguyên câu hỏi và lựa chọn A,B,C,D."

# Images that failed - based on the error log
# These are sorted by filename timestamp
FAILED_IMAGES = [
    "IMG20251225040643.jpg",  # key 3 error
    "IMG20251225040707.jpg",  # key 1 error
    "IMG20251225040710.jpg",  # key 2 error
    "IMG20251225040822.jpg",  # key 2 error
    "IMG20251225040833.jpg",  # key 1 error
    "IMG20251225040836.jpg",  # key 4 error
    "IMG20251225040844.jpg",  # key 3 error
    "IMG20251225040849.jpg",  # key 1 error
    "IMG20251225040906.jpg",  # key 3 error
    "IMG20251225040912.jpg",  # key 1 error
    "IMG20251225040915.jpg",  # key 2 error
    "IMG20251225041013.jpg",  # key 3 error
    "IMG20251225041020.jpg",  # key 2 error
]


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


def ocr_image(image_path: Path, api_key: str) -> str:
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
            f"{API_URL}?key={api_key}",
            json=payload,
            timeout=60
        )
        response.raise_for_status()
        result = response.json()
        return result["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        return f"[ERROR: {str(e)}]"


def main():
    print("=" * 60)
    print("Retry OCR for failed images - chuong_3")
    print("=" * 60)
    print(f"Total images to retry: {len(FAILED_IMAGES)}")
    print(f"Using {len(API_KEYS)} API keys")
    print()
    
    results = []
    key_idx = 0
    
    for i, filename in enumerate(FAILED_IMAGES):
        image_path = IMAGES_DIR / filename
        
        if not image_path.exists():
            print(f"[{i+1}/{len(FAILED_IMAGES)}] {filename} - NOT FOUND")
            continue
        
        # Rotate through API keys
        api_key = API_KEYS[key_idx]
        key_idx = (key_idx + 1) % len(API_KEYS)
        
        print(f"[{i+1}/{len(FAILED_IMAGES)}] {filename} (key {key_idx})...", end=" ", flush=True)
        
        text = ocr_image(image_path, api_key)
        
        if text.startswith("[ERROR"):
            print(f"✗ {text[:50]}...")
        else:
            print("✓")
            results.append(f"=== {filename} ===\n{text}")
        
        # Delay between requests
        time.sleep(2)
    
    # Save results
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write("\n\n".join(results))
    
    print()
    print(f"✓ Saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()

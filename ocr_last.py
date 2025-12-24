"""
Retry OCR for the last missing image: IMG20251225041020.jpg
"""

import io
import base64
import time
import requests
from pathlib import Path
from PIL import Image

# API Keys
API_KEYS = [
    "AIzaSyCt9yvnq7BAH9_CFp_xOPvHU941N7achyg",
    "AIzaSyBWdOL6tPal6Wf2YPMbEAAt9Z6XeB2NtvM",
    "AIzaSyAUfq2LyaUlJA025JEwUw8J_e_NahgyOy8",
    "AIzaSyADmYu8g6Zb39Y8ThqbClINQp9rmEffoJU",
]

API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

# The last missing image
IMAGE_PATH = Path(r"c:\Users\YAYSOOSWhite\Documents\triet-utt\cau_hoi\chuong_3\IMG20251225041020.jpg")
OUTPUT_FILE = Path(r"c:\Users\YAYSOOSWhite\Documents\triet-utt\chuong_3_last.txt")

OCR_PROMPT = "Trích xuất văn bản từ ảnh đề thi này. Bỏ qua dòng ANSWER và các ghi chú viết tay. Giữ nguyên câu hỏi và lựa chọn A,B,C,D."


def resize_image(image_path: Path) -> str:
    """Resize and compress image, return base64."""
    img = Image.open(image_path)
    if img.mode in ('RGBA', 'P'):
        img = img.convert('RGB')
    
    w, h = img.size
    ratio = min(1600/w, 1600/h)
    img = img.resize((int(w*ratio), int(h*ratio)), Image.LANCZOS)
    
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=60, optimize=True)
    return base64.b64encode(buf.getvalue()).decode('utf-8')


def main():
    print("=" * 60)
    print("Retry OCR for last missing image")
    print("=" * 60)
    print(f"Image: {IMAGE_PATH.name}")
    print()
    
    b64 = resize_image(IMAGE_PATH)
    
    for i, key in enumerate(API_KEYS):
        print(f"Trying key {i+1}/{len(API_KEYS)}...", end=" ", flush=True)
        
        try:
            payload = {
                "contents": [{
                    "parts": [
                        {"inline_data": {"mime_type": "image/jpeg", "data": b64}},
                        {"text": OCR_PROMPT}
                    ]
                }]
            }
            
            resp = requests.post(
                f"{API_URL}?key={key}",
                json=payload,
                timeout=60
            )
            resp.raise_for_status()
            text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
            
            print("SUCCESS!")
            print("=" * 60)
            print(text)
            
            # Save to file
            with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
                f.write(f"=== IMG20251225041020.jpg ===\n{text}")
            
            print()
            print(f"✓ Saved to: {OUTPUT_FILE}")
            return
            
        except Exception as e:
            print(f"FAILED: {str(e)[:60]}")
            time.sleep(3)
    
    print("\nAll keys failed!")


if __name__ == "__main__":
    main()

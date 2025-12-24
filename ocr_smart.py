"""
Smart OCR - Detect missing questions and fill them in
Uses LM Studio to scan images and find missing question numbers
"""

import os
import io
import re
import base64
import requests
from pathlib import Path
from PIL import Image

# Configuration
IMAGES_DIR = Path(r"c:\Users\YAYSOOSWhite\Documents\triet-utt\cau_hoi\chuong_3")
OUTPUT_FILE = Path(r"c:\Users\YAYSOOSWhite\Documents\triet-utt\chuong_3.txt")
MISSING_FILE = Path(r"c:\Users\YAYSOOSWhite\Documents\triet-utt\chuong_3_fill.txt")

# LM Studio config
LM_STUDIO_URL = "http://localhost:1234/v1/chat/completions"

# Image settings
MAX_IMAGE_SIZE = 1600
MAX_FILE_SIZE_KB = 500

OCR_PROMPT = "Trích xuất văn bản từ ảnh đề thi này. Bỏ qua dòng ANSWER và các ghi chú viết tay. Giữ nguyên câu hỏi và lựa chọn A,B,C,D."

DETECT_PROMPT = "Hãy liệt kê TẤT CẢ các số câu hỏi có trong ảnh này. Chỉ trả về các số, phân cách bằng dấu phẩy. Ví dụ: 1, 2, 3"


def get_existing_questions(filepath: Path) -> set:
    """Read existing file and extract question numbers."""
    if not filepath.exists():
        return set()
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Find all question numbers (e.g., "1.", "2.", "10.", "123.")
    pattern = r'(?:^|\n)\s*(\d{1,3})\s*[.\):]'
    matches = re.findall(pattern, content)
    return set(int(m) for m in matches)


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


def call_lm_studio(base64_image: str, prompt: str) -> str:
    """Call LM Studio with image and prompt."""
    payload = {
        "model": "allenai/olmocr-2-7b",
        "messages": [{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}},
                {"type": "text", "text": prompt}
            ]
        }],
        "max_tokens": 2048,
        "temperature": 0.1
    }
    
    response = requests.post(LM_STUDIO_URL, json=payload, timeout=300)
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]


def detect_questions(image_path: Path) -> set:
    """Detect question numbers in an image."""
    try:
        base64_image = resize_and_compress_image(image_path)
        result = call_lm_studio(base64_image, DETECT_PROMPT)
        
        # Extract numbers from response
        numbers = re.findall(r'\d+', result)
        return set(int(n) for n in numbers if 1 <= int(n) <= 200)
    except Exception as e:
        print(f"Error detecting: {e}")
        return set()


def ocr_image(image_path: Path) -> str:
    """OCR full content of an image."""
    try:
        base64_image = resize_and_compress_image(image_path)
        return call_lm_studio(base64_image, OCR_PROMPT)
    except Exception as e:
        return f"[ERROR: {str(e)}]"


def main():
    print("=" * 60)
    print("Smart OCR - Fill Missing Questions")
    print("=" * 60)
    
    # Check LM Studio
    try:
        requests.get("http://localhost:1234/v1/models", timeout=5)
        print("✓ LM Studio running")
    except:
        print("✗ LM Studio not running!")
        exit(1)
    
    # Get existing questions
    existing = get_existing_questions(OUTPUT_FILE)
    print(f"✓ Found {len(existing)} existing questions in chuong_3.txt")
    
    # Find all expected questions (1-145)
    expected = set(range(1, 146))
    missing = expected - existing
    print(f"✓ Missing questions: {sorted(missing)}")
    
    if not missing:
        print("✓ All questions present!")
        return
    
    # Get images
    image_extensions = {".jpg", ".jpeg", ".png"}
    image_files = sorted([
        f for f in IMAGES_DIR.iterdir() 
        if f.is_file() and f.suffix.lower() in image_extensions
    ])
    
    print(f"\n{'='*60}")
    print(f"Scanning {len(image_files)} images to find missing questions...")
    print(f"{'='*60}")
    
    filled_text = []
    
    for i, image_path in enumerate(image_files):
        print(f"  [{i+1}/{len(image_files)}] {image_path.name}...", end=" ", flush=True)
        
        # Detect questions in this image
        questions_in_image = detect_questions(image_path)
        
        # Check if any missing questions are in this image
        found_missing = questions_in_image & missing
        
        if found_missing:
            print(f"Found: {sorted(found_missing)}", end=" ", flush=True)
            
            # OCR the full content
            ocr_text = ocr_image(image_path)
            filled_text.append(f"=== {image_path.name} (câu {sorted(found_missing)}) ===\n{ocr_text}\n")
            
            # Update missing set
            missing -= found_missing
            print("✓ OCR done")
        else:
            print(f"No missing (has: {sorted(questions_in_image) if questions_in_image else 'none'})")
        
        # Save progress
        if filled_text:
            with open(MISSING_FILE, "w", encoding="utf-8") as f:
                f.write("\n".join(filled_text))
    
    print(f"\n{'='*60}")
    print(f"✓ Saved missing content to: {MISSING_FILE}")
    if missing:
        print(f"⚠ Still missing: {sorted(missing)}")
    else:
        print("✓ All missing questions filled!")


if __name__ == "__main__":
    main()

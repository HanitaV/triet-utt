# Simple MCQ Scanner using AI Studio API
# Fast scanning with API instead of CLI

import os
import io
import base64
import json
import re
import sys
import time
import tempfile
from pathlib import Path
from PIL import Image
from dotenv import load_dotenv
import requests

# Load .env file
load_dotenv()

# AI Studio API Configuration
API_KEY = os.getenv("GEMINI_API_KEY")
API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

# Image settings
MAX_IMAGE_SIZE = 1600
MAX_FILE_SIZE_KB = 500

# Delay between requests (seconds)
DELAY_SECONDS = 1


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


def call_api_for_mcq(image_path: Path) -> dict:
    """Call AI Studio API to extract circled MCQ answers."""
    try:
        base64_image = resize_and_compress_image(image_path)
    except Exception as e:
        return {"error": f"Image load error: {str(e)}"}
    
    prompt = """Phân tích ảnh đề thi trắc nghiệm này. Tìm tất cả câu trả lời được KHOANH TRÒN (bằng bút đỏ hoặc bút khác).
Trả về JSON array với format: [{"question": <số câu>, "answer": "<đáp án A/B/C/D>"}]
Chỉ trả về JSON array, không có text thêm."""
    
    payload = {
        "contents": [{
            "parts": [
                {"inline_data": {"mime_type": "image/jpeg", "data": base64_image}},
                {"text": prompt}
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
        text = result["candidates"][0]["content"]["parts"][0]["text"]
        return {"text": text}
    except Exception as e:
        return {"error": f"API error: {str(e)}"}


def scan_mcq_folder(folder_path: str, output_file: str = "answers.json", 
                    chapter: str = "", title: str = ""):
    """
    Scan all images in a folder for circled MCQ answers using AI Studio API.
    Also creates a tmp file listing images that contain questions.
    """
    folder = Path(folder_path)
    
    if not API_KEY:
        print("ERROR: GEMINI_API_KEY not found in .env")
        sys.exit(1)
    
    # Find images
    images = []
    for ext in ['*.jpg', '*.jpeg', '*.png']:
        images.extend(folder.glob(ext))
    images = sorted(images, key=lambda p: p.name.lower())
    
    if not images:
        print(f"No images found in {folder}")
        return
    
    print(f"✓ API key loaded")
    print(f"Found {len(images)} images")
    print("=" * 50)
    sys.stdout.flush()
    
    all_answers = {}
    images_with_questions = []  # Track images that have questions
    start_time = time.time()
    
    # Temp file to save progress
    tmp_file = Path(tempfile.gettempdir()) / f"mcq_progress_{folder.name}.json"
    tmp_images_file = Path(tempfile.gettempdir()) / f"mcq_images_{folder.name}.txt"
    
    for i, img_path in enumerate(images, 1):
        img_start = time.time()
        print(f"\n[{i}/{len(images)}] {img_path.name}...", end=" ", flush=True)
        
        result = call_api_for_mcq(img_path)
        
        if "error" in result:
            print(f"✗ {result['error']}", flush=True)
        else:
            response = result["text"]
            
            # Parse JSON from response
            json_match = re.search(r'\[[\s\S]*?\]', response)
            if json_match:
                try:
                    data = json.loads(json_match.group())
                    if len(data) > 0:
                        # This image has questions
                        images_with_questions.append({
                            "file": img_path.name,
                            "path": str(img_path.absolute()),
                            "questions_found": len(data),
                            "question_numbers": [item.get('question') for item in data]
                        })
                        
                    for item in data:
                        q = item.get('question')
                        a = item.get('answer', '').upper()
                        if isinstance(q, int) and a in ['A', 'B', 'C', 'D']:
                            all_answers[q] = {
                                "question": q,
                                "circled_answer": a,
                                "source_file": img_path.name,
                                "page": i
                            }
                    elapsed = time.time() - img_start
                    print(f"✓ {len(data)} answers ({elapsed:.1f}s)", flush=True)
                except json.JSONDecodeError:
                    print(f"✗ JSON parse error", flush=True)
            else:
                print(f"✗ No JSON found", flush=True)
        
        # Save progress to tmp file
        progress = {
            "processed": i,
            "total": len(images),
            "answers_found": len(all_answers),
            "answers": all_answers
        }
        with open(tmp_file, 'w', encoding='utf-8') as f:
            json.dump(progress, f, ensure_ascii=False, indent=2)
            
        # Save images with questions to tmp file
        with open(tmp_images_file, 'w', encoding='utf-8') as f:
            f.write(f"# Images with questions - {folder.name}\n")
            f.write(f"# Total: {len(images_with_questions)} files\n\n")
            for img_info in images_with_questions:
                f.write(f"{img_info['file']}: {img_info['questions_found']} câu - Câu số: {img_info['question_numbers']}\n")
        
        # Delay before next request
        if i < len(images):
            time.sleep(DELAY_SECONDS)
    
    total_time = time.time() - start_time
    print(f"\n{'=' * 50}")
    print(f"Total time: {total_time:.1f}s ({total_time/len(images):.1f}s per image)")
    
    # Build output
    questions = [all_answers[q] for q in sorted(all_answers.keys())]
    output = {
        "chapter": chapter,
        "title": title,
        "total_questions": len(questions),
        "questions": questions
    }
    
    # Write JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ Saved {len(questions)} answers to {output_file}")
    print(f"✓ Progress saved to: {tmp_file}")
    print(f"✓ Images with questions saved to: {tmp_images_file}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Scan MCQ images with AI Studio API')
    parser.add_argument('folder', help='Folder containing MCQ images')
    parser.add_argument('-o', '--output', default='answers.json', help='Output JSON file')
    parser.add_argument('--chapter', default='', help='Chapter name')
    parser.add_argument('--title', default='', help='Title')
    
    args = parser.parse_args()
    scan_mcq_folder(args.folder, args.output, args.chapter, args.title)

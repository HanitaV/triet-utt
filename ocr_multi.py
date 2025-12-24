"""
OCR Script using Multiple AI Studio API Keys for Parallel Processing
Rotates through API keys to avoid rate limits
"""

import os
import io
import base64
import time
import requests
import threading
from pathlib import Path
from PIL import Image
from concurrent.futures import ThreadPoolExecutor, as_completed
from queue import Queue
import tempfile
import json

# Configuration
IMAGES_DIR = Path(r"c:\Users\YAYSOOSWhite\Documents\triet-utt\cau_hoi")
OUTPUT_DIR = Path(r"c:\Users\YAYSOOSWhite\Documents\triet-utt")

# Multiple API Keys for load balancing
API_KEYS = [
    "AIzaSyCt9yvnq7BAH9_CFp_xOPvHU941N7achyg",
    "AIzaSyBWdOL6tPal6Wf2YPMbEAAt9Z6XeB2NtvM",
    "AIzaSyAUfq2LyaUlJA025JEwUw8J_e_NahgyOy8",
    "AIzaSyADmYu8g6Zb39Y8ThqbClINQp9rmEffoJU",
]

API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

# Delay between requests per key (seconds)
DELAY_PER_KEY = 1.5

# Image settings
MAX_IMAGE_SIZE = 1600
MAX_FILE_SIZE_KB = 500

# Thread-safe key rotation
key_lock = threading.Lock()
key_index = 0
key_last_used = {i: 0 for i in range(len(API_KEYS))}

OCR_PROMPT = "Trích xuất văn bản từ ảnh đề thi này. Bỏ qua dòng ANSWER và các ghi chú viết tay. Giữ nguyên câu hỏi và lựa chọn A,B,C,D."


def get_next_api_key():
    """Get the next available API key with proper delay."""
    global key_index
    with key_lock:
        # Find key with longest time since last use
        now = time.time()
        best_key_idx = 0
        best_wait_time = float('inf')
        
        for i in range(len(API_KEYS)):
            time_since_last = now - key_last_used[i]
            if time_since_last >= DELAY_PER_KEY:
                # This key is ready
                key_last_used[i] = now
                return i, API_KEYS[i]
            wait_time = DELAY_PER_KEY - time_since_last
            if wait_time < best_wait_time:
                best_wait_time = wait_time
                best_key_idx = i
        
        # Wait for best key
        time.sleep(best_wait_time)
        key_last_used[best_key_idx] = time.time()
        return best_key_idx, API_KEYS[best_key_idx]


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


def ocr_image(image_path: Path, image_index: int, total: int) -> tuple:
    """OCR a single image using AI Studio API."""
    key_idx, api_key = get_next_api_key()
    
    try:
        base64_image = resize_and_compress_image(image_path)
    except Exception as e:
        return image_index, image_path.name, f"[ERROR loading image: {str(e)}]", key_idx
    
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
        text = result["candidates"][0]["content"]["parts"][0]["text"]
        return image_index, image_path.name, text, key_idx
    except Exception as e:
        return image_index, image_path.name, f"[ERROR API key {key_idx+1}: {str(e)}]", key_idx


def process_chapter(chapter_name: str, max_workers: int = 4):
    """Process all images in a chapter folder using multiple API keys."""
    chapter_path = IMAGES_DIR / chapter_name
    output_file = OUTPUT_DIR / f"{chapter_name}.txt"
    tmp_file = Path(tempfile.gettempdir()) / f"ocr_progress_{chapter_name}.json"
    tmp_images_file = Path(tempfile.gettempdir()) / f"ocr_images_{chapter_name}.txt"
    
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
    print(f"Processing {chapter_name}: {total} images")
    print(f"Using {len(API_KEYS)} API keys with {max_workers} workers")
    print(f"Delay per key: {DELAY_PER_KEY}s")
    print(f"{'='*60}")
    
    # Results storage
    results = {}
    completed = 0
    start_time = time.time()
    images_with_questions = []
    
    # Process images in parallel
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(ocr_image, img_path, i, total): (i, img_path)
            for i, img_path in enumerate(image_files)
        }
        
        for future in as_completed(futures):
            idx, filename, text, key_idx = future.result()
            results[idx] = text
            completed += 1
            
            # Check if image has questions (contains "Câu" or numbered questions)
            if not text.startswith("[ERROR"):
                images_with_questions.append({
                    "file": filename,
                    "index": idx
                })
            
            elapsed = time.time() - start_time
            avg_time = elapsed / completed
            remaining = (total - completed) * avg_time
            
            status = "✓" if not text.startswith("[ERROR") else "✗"
            print(f"  [{completed}/{total}] {filename} {status} (key {key_idx+1}) "
                  f"[{elapsed:.1f}s / ~{remaining:.0f}s remaining]")
            
            # Save progress
            progress = {
                "completed": completed,
                "total": total,
                "elapsed_seconds": elapsed,
                "results": {k: v[:100] + "..." if len(v) > 100 else v for k, v in results.items()}
            }
            with open(tmp_file, 'w', encoding='utf-8') as f:
                json.dump(progress, f, ensure_ascii=False, indent=2)
    
    # Combine results in order
    all_text = [results[i] for i in range(total)]
    
    # Write output
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("\n\n".join(all_text))
    
    # Save images with questions
    with open(tmp_images_file, 'w', encoding='utf-8') as f:
        f.write(f"# Images with questions - {chapter_name}\n")
        f.write(f"# Total: {len(images_with_questions)} files\n\n")
        for img_info in images_with_questions:
            f.write(f"{img_info['file']}\n")
    
    total_time = time.time() - start_time
    print(f"\n{'='*60}")
    print(f"✓ Completed {chapter_name} in {total_time:.1f}s ({total_time/total:.1f}s per image)")
    print(f"✓ Output: {output_file}")
    print(f"✓ Progress: {tmp_file}")
    print(f"✓ Images list: {tmp_images_file}")
    
    return total


def main():
    import argparse
    parser = argparse.ArgumentParser(description='OCR with multiple API keys')
    parser.add_argument('chapter', help='Chapter folder name (e.g. chuong_3)')
    parser.add_argument('-w', '--workers', type=int, default=4, help='Number of parallel workers')
    parser.add_argument('-d', '--delay', type=float, default=1.5, help='Delay between requests per key')
    
    args = parser.parse_args()
    
    global DELAY_PER_KEY
    DELAY_PER_KEY = args.delay
    
    print("=" * 60)
    print("OCR Multi-Key Processor")
    print("=" * 60)
    print(f"✓ {len(API_KEYS)} API keys loaded")
    print(f"✓ Workers: {args.workers}")
    print(f"✓ Delay per key: {DELAY_PER_KEY}s")
    
    process_chapter(args.chapter, args.workers)


if __name__ == "__main__":
    main()

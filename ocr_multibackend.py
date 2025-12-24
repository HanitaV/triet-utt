"""
Multi-Backend OCR Script for Vietnamese Philosophy Exam Questions
Split workload across: Gemini CLI, AI Studio API, and Local LM Studio
"""

import os
import io
import base64
import requests
import subprocess
import json
from pathlib import Path
from PIL import Image
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Configuration
IMAGES_DIR = Path(r"c:\Users\YAYSOOSWhite\Documents\triet-utt\cau_hoi")
OUTPUT_DIR = Path(r"c:\Users\YAYSOOSWhite\Documents\triet-utt")
CHAPTERS = ["chuong_3"]

# LM Studio config
LM_STUDIO_URL = "http://localhost:1234/v1/chat/completions"

# AI Studio API config (loaded from .env)
AISTUDIO_API_KEY = os.getenv("GEMINI_API_KEY", "")
AISTUDIO_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

# Image settings
MAX_IMAGE_SIZE = 1600
MAX_FILE_SIZE_KB = 500

OCR_PROMPT = "Trích xuất văn bản từ ảnh đề thi này. Bỏ qua dòng ANSWER và các ghi chú viết tay. Giữ nguyên câu hỏi và lựa chọn A,B,C,D."


def resize_and_compress_image(image_path: Path) -> tuple[str, bytes]:
    """Resize and compress image, return base64 string and raw bytes."""
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
    
    raw_bytes = buffer.getvalue()
    base64_str = base64.b64encode(raw_bytes).decode("utf-8")
    return base64_str, raw_bytes


def ocr_local_lmstudio(image_path: Path) -> str:
    """OCR using local LM Studio."""
    try:
        base64_image, _ = resize_and_compress_image(image_path)
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


def ocr_aistudio_api(image_path: Path) -> str:
    """OCR using AI Studio API (Gemini)."""
    if not AISTUDIO_API_KEY:
        return "[ERROR: GEMINI_API_KEY not set in .env]"
    
    try:
        base64_image, _ = resize_and_compress_image(image_path)
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
            f"{AISTUDIO_URL}?key={AISTUDIO_API_KEY}",
            json=payload,
            timeout=60
        )
        response.raise_for_status()
        result = response.json()
        return result["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        return f"[ERROR AI Studio: {str(e)}]"


def ocr_gemini_cli(image_path: Path, idx: int) -> str:
    """OCR using Gemini CLI with stdin pipe."""
    try:
        # Save temp image with unique name to avoid conflicts
        base64_image, raw_bytes = resize_and_compress_image(image_path)
        temp_path = OUTPUT_DIR / f"temp_ocr_{idx}.jpg"
        with open(temp_path, "wb") as f:
            f.write(raw_bytes)
        
        # Use gemini CLI with pipe (cat file | gemini prompt)
        # Gemini CLI uses positional prompt and reads files via stdin
        cmd = f'type "{temp_path}" | gemini "{OCR_PROMPT}"'
        result = subprocess.run(
            cmd, 
            shell=True, 
            capture_output=True, 
            text=True, 
            timeout=120,
            cwd=str(OUTPUT_DIR)
        )
        
        # Clean up
        temp_path.unlink(missing_ok=True)
        
        if result.returncode == 0:
            return result.stdout.strip()
        else:
            return f"[ERROR CLI: {result.stderr.strip()}]"
    except subprocess.TimeoutExpired:
        return "[ERROR: Gemini CLI timeout]"
    except Exception as e:
        return f"[ERROR Gemini CLI: {str(e)}]"


def process_image(args) -> tuple[int, str, str]:
    """Process single image with assigned backend."""
    idx, image_path, backend = args
    
    if backend == "local":
        text = ocr_local_lmstudio(image_path)
        backend_name = "LM Studio"
    elif backend == "aistudio":
        text = ocr_aistudio_api(image_path)
        backend_name = "AI Studio"
    else:  # gemini_cli
        text = ocr_gemini_cli(image_path, idx)
        backend_name = "Gemini CLI"
    
    return idx, f"--- {image_path.name} [{backend_name}] ---\n{text}\n", image_path.name


def process_chapter_multibackend(chapter_name: str):
    """Process chapter using 3 backends in parallel."""
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
    print(f"Multi-Backend OCR: {chapter_name} ({total} images)")
    print(f"{'='*60}")
    
    # Split into 3 parts: 1/3 CLI, 1/3 API, 1/3 local
    third = total // 3
    assignments = []
    for i, img in enumerate(image_files):
        if i < third:
            backend = "gemini_cli"
        elif i < 2 * third:
            backend = "aistudio"
        else:
            backend = "local"
        assignments.append((i, img, backend))
    
    print(f"  Gemini CLI: {third} | AI Studio: {third} | Local: {total - 2*third}")
    print("-" * 60)
    
    results = [None] * total
    
    # Process in parallel with 3 workers
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(process_image, args): args[0] for args in assignments}
        
        for future in as_completed(futures):
            idx, text, name = future.result()
            results[idx] = text
            print(f"  ✓ [{idx+1}/{total}] {name}")
            
            # Save progress
            with open(output_file, "w", encoding="utf-8") as f:
                f.write("\n".join([r for r in results if r]))
    
    print(f"\n  -> Saved to: {output_file}")
    return total


def main():
    print("=" * 60)
    print("Multi-Backend OCR: Gemini CLI + AI Studio + LM Studio")
    print("=" * 60)
    
    # Check backends
    has_local = False
    has_api = bool(AISTUDIO_API_KEY)
    
    try:
        requests.get("http://localhost:1234/v1/models", timeout=5)
        has_local = True
        print("✓ LM Studio running")
    except:
        print("✗ LM Studio not available")
    
    print(f"✓ AI Studio API: {'key loaded from .env' if has_api else 'missing key'}")
    print(f"✓ Gemini CLI: assumed available")
    
    for chapter in CHAPTERS:
        process_chapter_multibackend(chapter)
    
    print("\n✓ All done!")


if __name__ == "__main__":
    main()

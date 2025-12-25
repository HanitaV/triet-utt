#!/usr/bin/env python3
"""
OCR Chapter 3 images using Gemini CLI
- Resizes images to max 1600px
- Processes sequentially with delay to avoid rate limits
- Outputs formatted text like chuong_1.txt
"""

import os
import subprocess
import tempfile
import time
from pathlib import Path
from PIL import Image

# Configuration
INPUT_DIR = Path("cau_hoi/chuong_3")
OUTPUT_FILE = Path("chuong_3.txt")
MAX_SIZE = 1600  # Max dimension in pixels
DELAY_SECONDS = 2  # Delay between API calls

PROMPT = """Hãy OCR ảnh này và trích xuất tất cả các câu hỏi trắc nghiệm.
Định dạng đầu ra như sau:

[Số câu]. [Nội dung câu hỏi]
a. [Đáp án a]
b. [Đáp án b]
c. [Đáp án c]
d. [Đáp án d]

Lưu ý:
- Chỉ trả về nội dung OCR thuần túy
- Giữ nguyên số thứ tự câu hỏi từ ảnh
- Không thêm giải thích hay chú thích
- Mỗi câu hỏi cách nhau bằng 1 dòng trống"""


def resize_image(input_path: Path, output_path: Path, max_size: int = 1600) -> Path:
    """Resize image to fit within max_size while maintaining aspect ratio."""
    with Image.open(input_path) as img:
        # Get original dimensions
        width, height = img.size
        
        # Calculate new dimensions
        if width > height:
            if width > max_size:
                new_width = max_size
                new_height = int(height * (max_size / width))
            else:
                new_width, new_height = width, height
        else:
            if height > max_size:
                new_height = max_size
                new_width = int(width * (max_size / height))
            else:
                new_width, new_height = width, height
        
        # Resize and save
        if (new_width, new_height) != (width, height):
            img_resized = img.resize((new_width, new_height), Image.LANCZOS)
            img_resized.save(output_path, "JPEG", quality=85)
            print(f"  Resized: {width}x{height} -> {new_width}x{new_height}")
        else:
            img.save(output_path, "JPEG", quality=85)
            print(f"  No resize needed: {width}x{height}")
    
    return output_path


def ocr_with_gemini(image_path: Path) -> str:
    """Run OCR on image using Gemini CLI."""
    cmd = [
        "gemini",
        "-p", PROMPT,
        "-f", str(image_path)
    ]
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
            encoding="utf-8"
        )
        
        if result.returncode != 0:
            print(f"  Error: {result.stderr}")
            return ""
        
        return result.stdout.strip()
    
    except subprocess.TimeoutExpired:
        print("  Timeout!")
        return ""
    except Exception as e:
        print(f"  Exception: {e}")
        return ""


def main():
    # Get all images
    images = sorted(INPUT_DIR.glob("*.jpg"))
    print(f"Found {len(images)} images in {INPUT_DIR}")
    
    if not images:
        print("No images found!")
        return
    
    # Create temp directory for resized images
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        all_text = ["CHƯƠNG 3\n"]
        
        for i, img_path in enumerate(images, 1):
            print(f"\n[{i}/{len(images)}] Processing: {img_path.name}")
            
            # Resize image
            resized_path = temp_path / f"resized_{img_path.name}"
            resize_image(img_path, resized_path, MAX_SIZE)
            
            # OCR
            print("  Running OCR...")
            text = ocr_with_gemini(resized_path)
            
            if text:
                all_text.append(text)
                all_text.append("")  # Empty line between images
                print(f"  ✓ Got {len(text)} characters")
            else:
                print(f"  ✗ No text extracted")
            
            # Delay to avoid rate limits (except for last image)
            if i < len(images):
                print(f"  Waiting {DELAY_SECONDS}s...")
                time.sleep(DELAY_SECONDS)
        
        # Write output
        output_text = "\n".join(all_text)
        OUTPUT_FILE.write_text(output_text, encoding="utf-8")
        print(f"\n✓ Output saved to: {OUTPUT_FILE}")
        print(f"  Total: {len(output_text)} characters")


if __name__ == "__main__":
    main()

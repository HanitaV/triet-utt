# OCR MCQ images using Gemini CLI
# Output in chuong_X.txt format with image compression

import subprocess
import sys
import time
import tempfile
from pathlib import Path
from PIL import Image


def compress_image(img_path: Path, max_size: int = 1000, quality: int = 80) -> Path:
    """
    Compress image for faster Gemini processing.
    Returns path to compressed temp file.
    """
    img = Image.open(img_path)
    orig_size = img_path.stat().st_size
    
    # Convert to RGB if needed
    if img.mode in ('RGBA', 'P'):
        img = img.convert('RGB')
    
    # Resize if too large
    w, h = img.size
    if max(w, h) > max_size:
        ratio = max_size / max(w, h)
        new_size = (int(w * ratio), int(h * ratio))
        img = img.resize(new_size, Image.Resampling.LANCZOS)
    
    # Save to temp file
    temp_path = Path(tempfile.gettempdir()) / f"ocr_temp_{img_path.stem}.jpg"
    img.save(temp_path, "JPEG", quality=quality, optimize=True)
    
    new_size_bytes = temp_path.stat().st_size
    ratio_pct = new_size_bytes / orig_size * 100
    print(f"       Compressed: {orig_size/1024:.0f}KB → {new_size_bytes/1024:.0f}KB ({ratio_pct:.0f}%)", flush=True)
    
    return temp_path


def ocr_image(img_path: Path, compress: bool = True) -> str:
    """OCR an image using Gemini CLI, return text content."""
    
    # Compress if requested
    if compress:
        img_path = compress_image(img_path)
    
    abs_path = str(img_path.absolute()).replace("\\", "/")
    
    prompt = f'''OCR this MCQ exam image @{abs_path}
Extract all questions with their options in this exact format:

1. [Question text]
a. [Option A]
b. [Option B]
c. [Option C]
d. [Option D]

2. [Next question...]

Rules:
- Number questions starting from their original numbers
- Each option on its own line starting with a., b., c., d.
- Keep original Vietnamese text exactly
- Separate questions with blank line
- Only output the questions, no other text'''

    try:
        result = subprocess.run(
            f'gemini "{prompt}"',
            capture_output=True,
            text=True,
            timeout=180,
            shell=True
        )
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        return "# TIMEOUT"
    except Exception as e:
        return f"# ERROR: {e}"


def ocr_folder(folder_path: str, output_file: str, chapter_header: str = ""):
    """OCR all images in a folder and combine into single txt file."""
    
    folder = Path(folder_path)
    
    # Find images
    images = []
    for ext in ['*.jpg', '*.jpeg', '*.png']:
        images.extend(folder.glob(ext))
    images = sorted(images, key=lambda p: p.name.lower())
    
    if not images:
        print(f"No images found in {folder}")
        return
    
    print(f"Found {len(images)} images")
    print("=" * 50)
    sys.stdout.flush()
    
    all_text = []
    if chapter_header:
        all_text.append(chapter_header)
    
    start_time = time.time()
    
    for i, img_path in enumerate(images, 1):
        img_start = time.time()
        print(f"\n[{i}/{len(images)}] {img_path.name}...", end=" ", flush=True)
        
        text = ocr_image(img_path, compress=True)
        
        elapsed = time.time() - img_start
        lines = len(text.split('\n'))
        print(f"✓ {lines} lines ({elapsed:.1f}s)", flush=True)
        
        all_text.append(f"\n# Page {i}: {img_path.name}\n")
        all_text.append(text)
    
    total_time = time.time() - start_time
    print(f"\n{'=' * 50}")
    print(f"Total time: {total_time:.1f}s ({total_time/len(images):.1f}s per image)")
    
    # Write output
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(all_text))
    
    print(f"✓ Saved to {output_file}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='OCR MCQ images with Gemini')
    parser.add_argument('folder', help='Folder containing MCQ images')
    parser.add_argument('-o', '--output', default='output.txt', help='Output txt file')
    parser.add_argument('--chapter', default='', help='Chapter header (e.g. "CHƯƠNG 3")')
    
    args = parser.parse_args()
    ocr_folder(args.folder, args.output, args.chapter)

"""
OCR Script for Vietnamese Philosophy Exam Questions
Uses OlmOCR-2-7B via LM Studio locally on port 1234
"""

import os
import json
import base64
import requests
from pathlib import Path

# Configuration
LM_STUDIO_URL = "http://localhost:1234/v1/chat/completions"
IMAGES_DIR = Path(r"c:\Users\YAYSOOSWhite\Documents\triet-utt\images")
OUTPUT_FILE = Path(r"c:\Users\YAYSOOSWhite\Documents\triet-utt\ocr_output.json")

def encode_image_to_base64(image_path: Path) -> str:
    """Encode an image file to base64 string."""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")

def get_image_mime_type(image_path: Path) -> str:
    """Get MIME type based on file extension."""
    suffix = image_path.suffix.lower()
    mime_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp"
    }
    return mime_types.get(suffix, "image/jpeg")

def ocr_image(image_path: Path) -> str:
    """OCR a single image using OlmOCR via LM Studio."""
    base64_image = encode_image_to_base64(image_path)
    mime_type = get_image_mime_type(image_path)
    
    payload = {
        "model": "allenai/olmocr-2-7b",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{base64_image}"
                        }
                    },
                    {
                        "type": "text",
                        "text": "Hãy đọc và trích xuất toàn bộ nội dung văn bản trong ảnh này. Đây là đề thi trắc nghiệm triết học. Hãy giữ nguyên định dạng câu hỏi và các lựa chọn A, B, C, D."
                    }
                ]
            }
        ],
        "max_tokens": 4096,
        "temperature": 0.1
    }
    
    try:
        response = requests.post(LM_STUDIO_URL, json=payload, timeout=120)
        response.raise_for_status()
        result = response.json()
        return result["choices"][0]["message"]["content"]
    except requests.exceptions.RequestException as e:
        print(f"Error OCR-ing {image_path.name}: {e}")
        return f"ERROR: {str(e)}"

def parse_question_text(ocr_text: str, image_name: str) -> dict:
    """Parse OCR text into structured question format (without correct answer)."""
    return {
        "image_file": image_name,
        "raw_text": ocr_text.strip(),
        "correct_answer": None  # To be filled later
    }

def process_all_images():
    """Process all images in the directory."""
    # Get all image files
    image_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    image_files = sorted([
        f for f in IMAGES_DIR.iterdir() 
        if f.is_file() and f.suffix.lower() in image_extensions
    ])
    
    print(f"Found {len(image_files)} images to process")
    
    results = {
        "title": "OCR Extracted Questions - Triết học",
        "total_images": len(image_files),
        "questions": []
    }
    
    for i, image_path in enumerate(image_files, 1):
        print(f"Processing [{i}/{len(image_files)}]: {image_path.name}")
        
        ocr_text = ocr_image(image_path)
        question_data = parse_question_text(ocr_text, image_path.name)
        question_data["question_index"] = i
        results["questions"].append(question_data)
        
        # Save progress after each image
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        
        print(f"  -> Saved progress to {OUTPUT_FILE}")
    
    print(f"\n✓ Completed! Output saved to: {OUTPUT_FILE}")
    return results

if __name__ == "__main__":
    print("=" * 60)
    print("OCR Questions Extractor - Using OlmOCR via LM Studio")
    print("=" * 60)
    print()
    
    # Check if LM Studio is running
    try:
        test_response = requests.get("http://localhost:1234/v1/models", timeout=5)
        print("✓ LM Studio is running")
    except requests.exceptions.RequestException:
        print("✗ ERROR: Cannot connect to LM Studio on port 1234")
        print("  Please make sure LM Studio is running with OlmOCR model loaded")
        exit(1)
    
    print()
    process_all_images()

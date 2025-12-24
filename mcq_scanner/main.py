# MCQ Scanner - Main CLI (Gemini CLI version)
# Entry point and processing pipeline using Gemini for image analysis

import os
import sys
import json
import argparse
from pathlib import Path
from typing import List, Dict

from .config import Config, DEFAULT_CONFIG
from .gemini_client import analyze_mcq_image, check_gemini_cli, MCQAnswer


def process_single_image(
    img_path: Path,
    page_num: int,
    debug: bool = False
) -> List[Dict]:
    """Process a single image using Gemini CLI."""
    answers = analyze_mcq_image(img_path, debug=debug)
    
    results = []
    for ans in answers:
        results.append({
            "question": ans.question,
            "circled_answer": ans.answer,
            "confidence": ans.confidence,
            "source_file": img_path.name,
            "page": page_num
        })
    
    return results


def process_folder(
    input_dir: Path,
    output_path: Path,
    debug: bool = False,
    chapter: str = "",
    title: str = ""
) -> None:
    """Process all images in a folder using Gemini CLI."""
    # Find all images
    extensions = ['*.jpg', '*.jpeg', '*.png']
    images_set = set()
    for ext in extensions:
        images_set.update(input_dir.glob(ext))
    
    images = list(images_set)
    
    if not images:
        print(f"No images found in {input_dir}")
        return
    
    # Sort by filename
    images = sorted(images, key=lambda p: p.name.lower())
    
    print(f"Found {len(images)} images")
    print()
    
    # Process images
    all_answers = {}  # question -> best result
    
    for i, img_path in enumerate(images):
        page_num = i + 1
        try:
            results = process_single_image(img_path, page_num, debug=debug)
            
            for r in results:
                q_num = r["question"]
                # Keep highest confidence for each question
                if q_num not in all_answers or r["confidence"] > all_answers[q_num]["confidence"]:
                    all_answers[q_num] = r
            
            print(f"  [{page_num}/{len(images)}] {img_path.name}: found {len(results)} answers")
            
        except Exception as e:
            print(f"  [{page_num}/{len(images)}] {img_path.name}: ERROR - {e}")
    
    # Build final JSON
    questions = [all_answers[q] for q in sorted(all_answers.keys())]
    
    result = {
        "chapter": chapter,
        "title": title,
        "total_questions": len(questions),
        "questions": questions
    }
    
    # Write output
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'='*50}")
    print(f"Results saved to: {output_path}")
    print(f"Total questions: {result['total_questions']}")


def main():
    parser = argparse.ArgumentParser(
        description='MCQ Scanner - Detect circled answers using Gemini AI'
    )
    parser.add_argument('--input', '-i', required=True,
                       help='Input directory containing images')
    parser.add_argument('--output', '-o', default='results.json',
                       help='Output JSON file (default: results.json)')
    parser.add_argument('--debug', '-d', action='store_true',
                       help='Show Gemini responses for debugging')
    parser.add_argument('--chapter', default='',
                       help='Chapter name (e.g. "CHƯƠNG 1")')
    parser.add_argument('--title', default='',
                       help='Title (e.g. "Triết học Mác-Lênin")')
    
    args = parser.parse_args()
    
    # Check Gemini CLI
    if not check_gemini_cli():
        print("ERROR: Gemini CLI not found!")
        print("Install with: npm install -g @google/gemini-cli")
        print("Then login: gemini")
        sys.exit(1)
    
    input_dir = Path(args.input)
    output_path = Path(args.output)
    
    if not input_dir.exists():
        print(f"Error: Input directory does not exist: {input_dir}")
        sys.exit(1)
    
    print("="*50)
    print("MCQ Scanner - Gemini AI version")
    print("="*50)
    print(f"Input: {input_dir}")
    print(f"Output: {output_path}")
    if args.chapter or args.title:
        print(f"Chapter: {args.chapter}")
        print(f"Title: {args.title}")
    print()
    
    process_folder(
        input_dir, output_path,
        debug=args.debug,
        chapter=args.chapter, title=args.title
    )


if __name__ == '__main__':
    main()

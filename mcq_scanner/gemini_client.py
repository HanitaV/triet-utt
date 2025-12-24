# MCQ Scanner - Gemini CLI Client
# Call Gemini CLI via subprocess to analyze MCQ images

import subprocess
import json
import re
import os
from pathlib import Path
from typing import List, Dict, Optional
from dataclasses import dataclass


@dataclass
class MCQAnswer:
    """A detected MCQ answer from Gemini"""
    question: int
    answer: str
    confidence: float = 1.0


def check_gemini_cli() -> bool:
    """Check if Gemini CLI is installed and accessible"""
    try:
        result = subprocess.run(
            ["gemini", "--version"],
            capture_output=True,
            text=True,
            timeout=10,
            shell=True
        )
        return result.returncode == 0
    except Exception:
        return False


def analyze_mcq_image(image_path: Path, debug: bool = False) -> List[MCQAnswer]:
    """
    Analyze an MCQ image using Gemini CLI.
    
    Args:
        image_path: Path to the image file
        debug: If True, print Gemini's raw response
        
    Returns:
        List of MCQAnswer objects with question numbers and answers
    """
    if not image_path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")
    
    # Prompt for Gemini to analyze the MCQ image
    prompt = """Analyze this multiple choice exam image. Find all questions where an answer (A, B, C, or D) has been circled or marked in red.

Return ONLY a JSON array with this exact format, no other text:
[
  {"question": 1, "answer": "A"},
  {"question": 2, "answer": "C"}
]

Rules:
- Only include questions where you can clearly see a circled/marked answer
- The answer must be A, B, C, or D (uppercase)
- Question numbers should be integers
- If no circled answers are found, return an empty array: []
"""
    
    # Build the gemini command
    # Use @filepath syntax to reference the image in the prompt
    abs_path = str(image_path.absolute()).replace("\\", "/")
    
    # Build prompt with file reference using @ syntax
    full_prompt = f"{prompt} @{abs_path}"
    
    try:
        # Run gemini CLI with positional prompt (not -p flag)
        result = subprocess.run(
            f'gemini "{full_prompt}"',
            capture_output=True,
            text=True,
            timeout=120,  # 2 minute timeout for API call
            shell=True,
            cwd=os.path.dirname(abs_path)
        )
        
        if result.returncode != 0:
            if debug:
                print(f"Gemini CLI error: {result.stderr}")
            return []
        
        response = result.stdout.strip()
        
        if debug:
            print(f"Gemini response for {image_path.name}:")
            print(response[:500] if len(response) > 500 else response)
            print("-" * 40)
        
        # Parse JSON from response
        answers = parse_gemini_response(response)
        return answers
        
    except subprocess.TimeoutExpired:
        print(f"Timeout analyzing {image_path.name}")
        return []
    except Exception as e:
        print(f"Error analyzing {image_path.name}: {e}")
        return []


def parse_gemini_response(response: str) -> List[MCQAnswer]:
    """Parse Gemini's response to extract MCQ answers"""
    answers = []
    
    # Try to find JSON array in the response
    # Look for [...] pattern
    json_match = re.search(r'\[[\s\S]*?\]', response)
    
    if json_match:
        try:
            data = json.loads(json_match.group())
            
            for item in data:
                if isinstance(item, dict):
                    q_num = item.get('question')
                    ans = item.get('answer', '').upper()
                    
                    # Validate
                    if isinstance(q_num, int) and q_num > 0 and ans in ['A', 'B', 'C', 'D']:
                        answers.append(MCQAnswer(
                            question=q_num,
                            answer=ans,
                            confidence=1.0
                        ))
        except json.JSONDecodeError:
            pass
    
    # Fallback: try to parse line by line if JSON failed
    if not answers:
        # Look for patterns like "1. A" or "Question 1: B" or "Câu 1: C"
        patterns = [
            r'[Cc]âu\s*(\d+)\s*[:.\-]\s*([ABCD])',
            r'[Qq]uestion\s*(\d+)\s*[:.\-]\s*([ABCD])',
            r'"question"\s*:\s*(\d+).*?"answer"\s*:\s*"([ABCD])"',
            r'(\d+)\s*[:.\-]\s*([ABCD])\b',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, response, re.IGNORECASE)
            for match in matches:
                q_num = int(match[0])
                ans = match[1].upper()
                if q_num > 0 and ans in ['A', 'B', 'C', 'D']:
                    # Avoid duplicates
                    if not any(a.question == q_num for a in answers):
                        answers.append(MCQAnswer(
                            question=q_num,
                            answer=ans,
                            confidence=0.8  # Lower confidence for fallback parsing
                        ))
    
    # Sort by question number
    answers.sort(key=lambda x: x.question)
    
    return answers


def analyze_folder(folder_path: Path, debug: bool = False) -> Dict:
    """
    Analyze all images in a folder.
    
    Returns:
        Dict with format matching chuong_1_answers.json
    """
    extensions = ['*.jpg', '*.jpeg', '*.png']
    images = set()
    for ext in extensions:
        images.update(folder_path.glob(ext))
    
    images = sorted(images, key=lambda p: p.name.lower())
    
    all_answers = {}  # question -> (answer, confidence, file, page)
    
    for page_num, img_path in enumerate(images, 1):
        print(f"  [{page_num}/{len(images)}] Analyzing {img_path.name}...")
        
        answers = analyze_mcq_image(img_path, debug=debug)
        
        for ans in answers:
            # Keep highest confidence answer for each question
            if ans.question not in all_answers or ans.confidence > all_answers[ans.question][1]:
                all_answers[ans.question] = (ans.answer, ans.confidence, img_path.name, page_num)
        
        found = len(answers)
        print(f"       Found {found} circled answers")
    
    # Build output format
    questions = []
    for q_num in sorted(all_answers.keys()):
        ans, conf, file, page = all_answers[q_num]
        questions.append({
            "question": q_num,
            "circled_answer": ans,
            "confidence": round(conf, 3),
            "source_file": file,
            "page": page
        })
    
    return {
        "chapter": "",
        "title": "",
        "total_questions": len(questions),
        "questions": questions
    }


if __name__ == "__main__":
    # Quick test
    import sys
    
    if not check_gemini_cli():
        print("Gemini CLI not found. Install with: npm install -g @google/gemini-cli")
        sys.exit(1)
    
    print("Gemini CLI is available!")
    
    # Test with an image if provided
    if len(sys.argv) > 1:
        img_path = Path(sys.argv[1])
        print(f"Testing with: {img_path}")
        answers = analyze_mcq_image(img_path, debug=True)
        print(f"\nFound {len(answers)} answers:")
        for ans in answers:
            print(f"  Q{ans.question}: {ans.answer}")

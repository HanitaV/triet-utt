# MCQ Scanner - Answer Matcher (Improved)
# Match circles to question numbers with better heuristics

import numpy as np
from dataclasses import dataclass
from typing import List, Optional, Tuple, Dict
from .config import Config, DEFAULT_CONFIG
from .red_circle_detector import Circle
from .ocr_utils import QToken


@dataclass
class MatchedAnswer:
    """A matched answer with question number"""
    question: Optional[int]
    answer: Optional[str]
    confidence: float
    circle: Circle
    notes: List[str]


def detect_columns(circles: List[Circle], image_width: int) -> Tuple[int, List[int]]:
    """
    Detect if page has multiple columns based on circle x-positions.
    Returns: (num_columns, column_split_positions)
    """
    if len(circles) < 4:
        return 1, []
    
    # Get x-centers
    x_positions = sorted([c.cx for c in circles])
    
    # Check for bimodal distribution using gap analysis
    gaps = []
    for i in range(1, len(x_positions)):
        gap = x_positions[i] - x_positions[i-1]
        gaps.append((gap, (x_positions[i] + x_positions[i-1]) // 2))
    
    if not gaps:
        return 1, []
    
    # Find the largest gap
    max_gap = max(gaps, key=lambda x: x[0])
    
    # If largest gap is significant (>20% of width), it's likely 2 columns
    if max_gap[0] > image_width * 0.2:
        return 2, [max_gap[1]]
    
    return 1, []


def assign_column(x: int, col_splits: List[int]) -> int:
    """Assign column index based on x position"""
    for i, split in enumerate(col_splits):
        if x < split:
            return i
    return len(col_splits)


def infer_question_from_position(circle: Circle, circles: List[Circle], 
                                  image_height: int, num_cols: int) -> Tuple[Optional[int], float]:
    """
    Infer question number from circle position when OCR fails.
    Assumes questions are numbered sequentially top-to-bottom, left-to-right.
    """
    if not circles:
        return None, 0.0
    
    # Sort circles by position
    sorted_circles = sorted(circles, key=lambda c: (c.cy, c.cx))
    
    # Find this circle's index
    try:
        idx = sorted_circles.index(circle)
    except ValueError:
        return None, 0.0
    
    # Question number is index + 1 (1-based)
    question = idx + 1
    
    # Confidence based on how well the circles are aligned
    confidence = 0.4  # Base confidence for positional inference
    
    return question, confidence


def match_circle_to_question(circle: Circle, tokens: List[QToken], 
                              col_splits: List[int], config: Config,
                              all_circles: List[Circle] = None,
                              image_height: int = 0) -> Tuple[Optional[int], float]:
    """
    Find the question number for a circle.
    Priority:
    1. OCR'd question number directly above
    2. Infer from position
    """
    if tokens:
        circle_col = assign_column(circle.cx, col_splits)
        
        # Filter tokens in same column and above (or at same level)
        candidates = []
        for token in tokens:
            token_col = assign_column(token.cx, col_splits)
            
            # Same column or close enough
            if abs(token_col - circle_col) <= 1:
                # Token should be above or at the circle level
                y_diff = circle.cy - token.cy
                if -config.roi.question_match_margin <= y_diff <= config.roi.question_match_margin * 3:
                    candidates.append((token, y_diff))
        
        if candidates:
            # Find the best match
            # Prefer tokens that are close above the circle
            best_token = None
            best_score = float('-inf')
            
            for token, y_diff in candidates:
                # Score: prefer tokens above and close
                if y_diff >= 0:  # Token is above
                    score = 100 - y_diff * 0.5
                else:  # Token is below (within margin)
                    score = 50 + y_diff  # Penalize tokens below
                
                # X distance penalty
                x_dist = abs(circle.cx - token.cx)
                score -= x_dist * 0.1
                
                # Confidence bonus
                score += token.confidence * 0.1
                
                if score > best_score:
                    best_score = score
                    best_token = token
            
            if best_token:
                # Calculate confidence
                y_dist = abs(circle.cy - best_token.cy)
                conf = max(0.5, min(1.0, 1.0 - y_dist / 200)) * (best_token.confidence / 100)
                return best_token.number, conf
    
    # Fallback: infer from position
    if all_circles and image_height > 0:
        return infer_question_from_position(circle, all_circles, image_height, len(col_splits) + 1)
    
    return None, 0.0


def match_answers(circles: List[Circle], tokens: List[QToken],
                  answers: List[Tuple[Optional[str], float]],
                  image_width: int, image_height: int = 0,
                  config: Config = DEFAULT_CONFIG) -> List[MatchedAnswer]:
    """Match all circles to questions and combine with OCR'd answers."""
    # Detect column layout
    num_cols, col_splits = detect_columns(circles, image_width)
    
    results = []
    
    for i, circle in enumerate(circles):
        notes = []
        
        # Get answer for this circle
        answer, answer_conf = answers[i] if i < len(answers) else (None, 0.0)
        
        # Match to question number
        question, match_conf = match_circle_to_question(
            circle, tokens, col_splits, config,
            all_circles=circles, image_height=image_height
        )
        
        # Build notes
        if question is None:
            notes.append("no_qnum")
        if answer is None:
            notes.append("no_ans")
        
        # Overall confidence
        if answer_conf > 0 and match_conf > 0:
            overall_conf = (answer_conf / 100 + match_conf) / 2
        elif answer_conf > 0:
            overall_conf = answer_conf / 100 * 0.5
        elif match_conf > 0:
            overall_conf = match_conf * 0.5
        else:
            overall_conf = 0.1
        
        results.append(MatchedAnswer(
            question=question,
            answer=answer,
            confidence=overall_conf,
            circle=circle,
            notes=notes
        ))
    
    return results


def consolidate_results(all_results: List[Tuple[str, int, List[MatchedAnswer]]]) -> List[Dict]:
    """
    Consolidate results across all pages.
    Group by question number and handle multiple answers.
    """
    rows = []
    
    # Group by (file, page, question)
    grouped = {}
    
    for filename, page_num, matches in all_results:
        for match in matches:
            key = (filename, page_num, match.question)
            
            if key not in grouped:
                grouped[key] = {
                    'file': filename,
                    'page': page_num,
                    'question': match.question,
                    'answers': [],
                    'confidences': [],
                    'notes': set()
                }
            
            if match.answer:
                grouped[key]['answers'].append(match.answer)
            grouped[key]['confidences'].append(match.confidence)
            grouped[key]['notes'].update(match.notes)
    
    # Convert to output format
    for key, data in sorted(grouped.items(), key=lambda x: (x[0][0], x[0][1], x[0][2] or 999)):
        answers = data['answers']
        
        # Handle multiple answers
        if len(answers) > 1:
            unique_answers = sorted(set(answers))
            answer_str = ','.join(unique_answers)
            data['notes'].add('multi_ans')
        elif len(answers) == 1:
            answer_str = answers[0]
        else:
            answer_str = ''
        
        # Average confidence
        avg_conf = sum(data['confidences']) / len(data['confidences']) if data['confidences'] else 0
        
        # Notes string
        notes_str = '|'.join(sorted(data['notes'])) if data['notes'] else ''
        
        rows.append({
            'file': data['file'],
            'page': data['page'],
            'question': data['question'] if data['question'] is not None else '',
            'answer': answer_str,
            'confidence': round(avg_conf, 3),
            'notes': notes_str
        })
    
    return rows


def consolidate_results_json(all_results: List[Tuple[str, int, List[MatchedAnswer]]], 
                              chapter: str = "", title: str = "") -> Dict:
    """
    Consolidate results into JSON format matching 75.json structure.
    Output format:
    {
        "chapter": "CHƯƠNG 1",
        "title": "Triết học Mác-Lênin",
        "total_questions": 50,
        "questions": [
            {
                "question": 1,
                "circled_answer": "A",
                "confidence": 0.95
            },
            ...
        ]
    }
    """
    # Collect all questions with circled answers
    questions_dict = {}
    
    for filename, page_num, matches in all_results:
        for match in matches:
            q_num = match.question
            if q_num is None:
                continue
            
            answer = match.answer.upper() if match.answer else None
            conf = match.confidence
            
            # If question already exists, keep the one with higher confidence
            if q_num not in questions_dict:
                questions_dict[q_num] = {
                    'question': q_num,
                    'circled_answer': answer,
                    'confidence': round(conf, 3),
                    'source_file': filename,
                    'page': page_num
                }
            else:
                # If we have a new answer with higher confidence, update
                if answer and conf > questions_dict[q_num]['confidence']:
                    questions_dict[q_num] = {
                        'question': q_num,
                        'circled_answer': answer,
                        'confidence': round(conf, 3),
                        'source_file': filename,
                        'page': page_num
                    }
                # If same question has multiple different answers, note it
                elif answer and questions_dict[q_num]['circled_answer'] and \
                     answer != questions_dict[q_num]['circled_answer']:
                    # Keep higher confidence but mark as uncertain
                    if conf > questions_dict[q_num]['confidence']:
                        questions_dict[q_num]['circled_answer'] = answer
                        questions_dict[q_num]['confidence'] = round(conf, 3)
                    questions_dict[q_num]['multiple_answers'] = True
    
    # Sort by question number
    sorted_questions = sorted(questions_dict.values(), key=lambda x: x['question'])
    
    # Build final JSON structure
    result = {
        'chapter': chapter,
        'title': title,
        'total_questions': len(sorted_questions),
        'questions': sorted_questions
    }
    
    return result

# MCQ Scanner - OCR Utilities (EasyOCR + Tesseract fallback)
# OCR for answer letters (a/b/c/d) and question numbers

import numpy as np
from PIL import Image
import re
from dataclasses import dataclass
from typing import List, Optional, Tuple
from .config import Config, DEFAULT_CONFIG
from .red_circle_detector import Circle

# Try to import EasyOCR
EASYOCR_AVAILABLE = False
_easyocr_reader = None

try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    pass

# Try to import Tesseract as fallback
TESSERACT_AVAILABLE = False
try:
    import pytesseract
    pytesseract.get_tesseract_version()
    TESSERACT_AVAILABLE = True
except:
    pass

# Track which OCR engine is active
_ocr_engine = None  # 'easyocr', 'tesseract', or None
_initialized = False


def init_ocr():
    """Initialize OCR engine (lazy initialization)"""
    global _easyocr_reader, _ocr_engine, _initialized
    
    if _initialized:
        return _ocr_engine
    
    _initialized = True
    
    # Try EasyOCR first
    if EASYOCR_AVAILABLE:
        try:
            _easyocr_reader = easyocr.Reader(['en', 'vi'], gpu=False, verbose=False)
            _ocr_engine = 'easyocr'
            print("Using EasyOCR engine")
            return _ocr_engine
        except Exception as e:
            print(f"EasyOCR failed to initialize: {e}")
    
    # Fallback to Tesseract
    if TESSERACT_AVAILABLE:
        _ocr_engine = 'tesseract'
        print("Using Tesseract OCR fallback")
        return _ocr_engine
    
    print("WARNING: No OCR engine available!")
    return None


@dataclass
class QToken:
    """Question number token"""
    number: int
    x: int
    y: int
    w: int
    h: int
    cx: int
    cy: int
    confidence: float


@dataclass
class OptionToken:
    """Answer option token (a/b/c/d)"""
    letter: str
    x: int
    y: int
    w: int
    h: int
    cx: int
    cy: int
    confidence: float


def pil_to_array(image) -> np.ndarray:
    """Convert PIL Image or numpy array to numpy array"""
    if isinstance(image, Image.Image):
        return np.array(image.convert('RGB'))
    return image


def enhance_for_ocr(roi: np.ndarray) -> np.ndarray:
    """Enhance ROI for better OCR (for Tesseract)"""
    from PIL import ImageEnhance, ImageFilter
    
    if roi is None or roi.size == 0:
        return roi
    
    # Convert to PIL
    pil_img = Image.fromarray(roi)
    
    # Convert to grayscale
    gray = pil_img.convert('L')
    
    # Enhance contrast
    enhancer = ImageEnhance.Contrast(gray)
    enhanced = enhancer.enhance(2.0)
    
    return np.array(enhanced)


def detect_all_option_letters(image, config: Config) -> List[OptionToken]:
    """
    Detect all a/b/c/d option letters on the page.
    Returns list of OptionToken with positions.
    """
    engine = init_ocr()
    if engine is None:
        return []
    
    options = []
    rgb = pil_to_array(image)
    
    try:
        if engine == 'easyocr' and _easyocr_reader is not None:
            # EasyOCR returns list of (bbox, text, confidence)
            results = _easyocr_reader.readtext(rgb, detail=1, paragraph=False)
            
            for (bbox, text, conf) in results:
                text = text.strip().lower()
                
                # Look for single letter a, b, c, d patterns
                match = re.match(r'^([abcd])[.\):\s]?$', text)
                if match:
                    letter = match.group(1)
                    
                    # bbox is [[x1,y1], [x2,y1], [x2,y2], [x1,y2]]
                    x1 = int(min(p[0] for p in bbox))
                    y1 = int(min(p[1] for p in bbox))
                    x2 = int(max(p[0] for p in bbox))
                    y2 = int(max(p[1] for p in bbox))
                    
                    box_w = x2 - x1
                    box_h = y2 - y1
                    
                    if conf > 0.2:
                        options.append(OptionToken(
                            letter=letter,
                            x=x1, y=y1, w=box_w, h=box_h,
                            cx=x1 + box_w // 2,
                            cy=y1 + box_h // 2,
                            confidence=conf * 100
                        ))
        
        elif engine == 'tesseract':
            # Use Tesseract
            pil_img = Image.fromarray(rgb)
            data = pytesseract.image_to_data(pil_img, config='--psm 11', output_type=pytesseract.Output.DICT)
            
            for i, text in enumerate(data['text']):
                text = text.strip().lower()
                
                match = re.match(r'^([abcd])[.\):\s]?$', text)
                if match:
                    letter = match.group(1)
                    x = data['left'][i]
                    y = data['top'][i]
                    box_w = data['width'][i]
                    box_h = data['height'][i]
                    conf = float(data['conf'][i]) if data['conf'][i] != '-1' else 50.0
                    
                    if conf > 20:
                        options.append(OptionToken(
                            letter=letter,
                            x=x, y=y, w=box_w, h=box_h,
                            cx=x + box_w // 2,
                            cy=y + box_h // 2,
                            confidence=conf
                        ))
    except Exception as e:
        print(f"OCR error: {e}")
    
    return options


def find_circled_option(circle: Circle, options: List[OptionToken], 
                        search_radius_mult: float = 2.5) -> Tuple[Optional[str], float]:
    """
    Find which option letter (a/b/c/d) is inside or near the circle.
    Returns (letter, confidence)
    """
    if not options:
        return None, 0.0
    
    # Calculate search radius based on circle size
    avg_radius = (circle.w + circle.h) / 4
    search_radius = avg_radius * search_radius_mult
    
    # Find options near or inside the circle
    candidates = []
    
    for opt in options:
        # Distance from option center to circle center
        dist = np.sqrt((opt.cx - circle.cx)**2 + (opt.cy - circle.cy)**2)
        
        # Check if option is inside or very close to circle
        if dist < search_radius:
            # Score based on proximity (closer is better)
            proximity_score = 1.0 - (dist / search_radius)
            total_score = proximity_score * (opt.confidence / 100)
            candidates.append((opt.letter, total_score, dist))
    
    if not candidates:
        return None, 0.0
    
    # Return the closest option with best score
    candidates.sort(key=lambda x: (-x[1], x[2]))  # Sort by score desc, then distance asc
    best = candidates[0]
    return best[0], best[1] * 100


def ocr_letter_inside_circle(image, circle: Circle, config: Config) -> Tuple[Optional[str], float]:
    """
    Fallback: Try to OCR the letter directly from inside/around the circle.
    """
    engine = init_ocr()
    if engine is None:
        return None, 0.0
    
    rgb = pil_to_array(image)
    h, w = rgb.shape[:2]
    results = []
    
    # Multiple ROI strategies around circle
    roi_configs = [
        (-0.2, 1.2, -0.2, 1.2),   # Just padded circle
        (-1.0, 0.3, -0.2, 1.2),   # Left side
        (0.7, 2.0, -0.2, 1.2),    # Right side  
        (-0.5, 1.5, -0.5, 1.5),   # Wider area
    ]
    
    for left_m, right_m, top_m, bottom_m in roi_configs:
        x1 = int(circle.x + circle.w * left_m)
        x2 = int(circle.x + circle.w * right_m)
        y1 = int(circle.y + circle.h * top_m)
        y2 = int(circle.y + circle.h * bottom_m)
        
        # Clamp
        x1 = max(0, x1)
        x2 = min(w, x2)
        y1 = max(0, y1)
        y2 = min(h, y2)
        
        if x2 <= x1 or y2 <= y1:
            continue
        
        roi = rgb[y1:y2, x1:x2]
        if roi.size == 0 or roi.shape[0] < 10 or roi.shape[1] < 10:
            continue
        
        try:
            if engine == 'easyocr' and _easyocr_reader is not None:
                ocr_results = _easyocr_reader.readtext(
                    roi, detail=1, allowlist='abcdABCD', paragraph=False
                )
                for (bbox, text, conf) in ocr_results:
                    text = text.strip().lower()
                    match = re.search(r'[abcd]', text)
                    if match:
                        results.append(match.group(0))
            
            elif engine == 'tesseract':
                enhanced = enhance_for_ocr(roi)
                pil_roi = Image.fromarray(enhanced)
                text = pytesseract.image_to_string(
                    pil_roi, config='--psm 10 -c tessedit_char_whitelist=abcdABCD'
                ).strip().lower()
                match = re.search(r'[abcd]', text)
                if match:
                    results.append(match.group(0))
        except Exception:
            continue
    
    if not results:
        return None, 0.0
    
    # Vote for most common letter
    from collections import Counter
    counts = Counter(results)
    best_letter, count = counts.most_common(1)[0]
    confidence = (count / len(results)) * 70  # Max 70% for fallback
    
    return best_letter, confidence


def get_answer_for_circle(image, circle: Circle, 
                          options: List[OptionToken] = None,
                          config: Config = DEFAULT_CONFIG) -> Tuple[Optional[str], float]:
    """
    Get the answer letter for a detected circle.
    Strategy:
    1. First try to match with detected option letters nearby
    2. Fallback to direct OCR of circle area
    """
    # Strategy 1: Match with detected options
    if options:
        letter, conf = find_circled_option(circle, options)
        if letter and conf > 30:
            return letter, conf
    
    # Strategy 2: Direct OCR
    letter, conf = ocr_letter_inside_circle(image, circle, config)
    return letter, conf


def detect_question_numbers(image, config: Config = DEFAULT_CONFIG) -> List[QToken]:
    """Detect question numbers"""
    engine = init_ocr()
    if engine is None:
        return []
    
    rgb = pil_to_array(image)
    h, w = rgb.shape[:2]
    tokens = []
    
    try:
        if engine == 'easyocr' and _easyocr_reader is not None:
            results = _easyocr_reader.readtext(rgb, detail=1, paragraph=False)
            
            for (bbox, text, conf) in results:
                text = text.strip()
                if not text:
                    continue
                
                patterns = [
                    r'^(\d{1,3})[.)\:]?$',
                    r'^[Cc][aâ]u\s*(\d{1,3})$',
                    r'^(\d{1,3})$'
                ]
                
                for pattern in patterns:
                    match = re.match(pattern, text)
                    if match:
                        num = int(match.group(1))
                        
                        if 1 <= num <= 500:
                            x1 = int(min(p[0] for p in bbox))
                            y1 = int(min(p[1] for p in bbox))
                            x2 = int(max(p[0] for p in bbox))
                            y2 = int(max(p[1] for p in bbox))
                            
                            box_w = x2 - x1
                            box_h = y2 - y1
                            
                            tokens.append(QToken(
                                number=num,
                                x=x1, y=y1, w=box_w, h=box_h,
                                cx=x1 + box_w // 2,
                                cy=y1 + box_h // 2,
                                confidence=max(conf * 100, 30.0)
                            ))
                        break
        
        elif engine == 'tesseract':
            pil_img = Image.fromarray(rgb)
            data = pytesseract.image_to_data(pil_img, config='--psm 11', output_type=pytesseract.Output.DICT)
            
            for i, text in enumerate(data['text']):
                text = text.strip()
                if not text:
                    continue
                
                patterns = [
                    r'^(\d{1,3})[.)\:]?$',
                    r'^[Cc][aâ]u\s*(\d{1,3})$',
                    r'^(\d{1,3})$'
                ]
                
                for pattern in patterns:
                    match = re.match(pattern, text)
                    if match:
                        num = int(match.group(1))
                        
                        if 1 <= num <= 500:
                            x = data['left'][i]
                            y = data['top'][i]
                            box_w = data['width'][i]
                            box_h = data['height'][i]
                            conf = float(data['conf'][i]) if data['conf'][i] != '-1' else 50.0
                            
                            tokens.append(QToken(
                                number=num,
                                x=x, y=y, w=box_w, h=box_h,
                                cx=x + box_w // 2,
                                cy=y + box_h // 2,
                                confidence=max(conf, 30.0)
                            ))
                        break
    except Exception as e:
        print(f"OCR error: {e}")
    
    # Remove duplicates
    unique_tokens = {}
    for token in tokens:
        key = (token.number, token.cy // 50)
        if key not in unique_tokens or token.confidence > unique_tokens[key].confidence:
            unique_tokens[key] = token
    
    tokens = list(unique_tokens.values())
    tokens = sorted(tokens, key=lambda t: (t.cy, t.cx))
    
    return tokens


def check_tesseract() -> bool:
    """Check if any OCR engine is available"""
    engine = init_ocr()
    return engine is not None

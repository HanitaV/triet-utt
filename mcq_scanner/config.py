# MCQ Scanner - Configuration
# Tham số dễ tune theo từng bộ ảnh

from dataclasses import dataclass, field
from typing import Tuple, List

@dataclass
class HSVConfig:
    """HSV ranges for red circle detection"""
    # Lower red range (H=0-10)
    lower_red1: Tuple[int, int, int] = (0, 60, 60)
    upper_red1: Tuple[int, int, int] = (10, 255, 255)
    
    # Upper red range (H=170-180)
    lower_red2: Tuple[int, int, int] = (170, 60, 60)
    upper_red2: Tuple[int, int, int] = (180, 255, 255)

@dataclass
class MorphologyConfig:
    """Morphological operation parameters"""
    close_kernel_size: int = 5
    open_kernel_size: int = 3
    dilate_iterations: int = 2
    erode_iterations: int = 1

@dataclass 
class CircleFilterConfig:
    """Circle contour filtering parameters"""
    # Area as fraction of image area
    min_area_ratio: float = 0.0003
    max_area_ratio: float = 0.025
    
    # Bounding box aspect ratio
    min_aspect_ratio: float = 0.3
    max_aspect_ratio: float = 3.0
    
    # Circularity threshold (4*pi*area / perimeter^2)
    min_circularity: float = 0.10
    
    # Merge distance for broken circles (as fraction of avg radius)
    merge_distance_ratio: float = 1.5

@dataclass
class ROIConfig:
    """ROI extraction parameters"""
    # Answer letter ROI (relative to circle bbox)
    answer_left_offset: float = -3.5  # x offset multiplier of width
    answer_right_offset: float = 0.3
    answer_top_offset: float = -0.3
    answer_bottom_offset: float = 1.3
    
    # Question number region (fraction of image width from left)
    question_margin_ratio: float = 0.40
    
    # Margin for matching circle to question (pixels)
    question_match_margin: int = 50

@dataclass
class OCRConfig:
    """OCR settings"""
    # Tesseract PSM modes
    single_char_psm: int = 10
    single_line_psm: int = 7
    sparse_psm: int = 11
    
    # Whitelist for answer letters
    answer_whitelist: str = "abcdABCD"
    
    # Confidence threshold
    min_confidence: float = 30.0

@dataclass
class PreprocessConfig:
    """Image preprocessing parameters"""
    # Canny edge detection
    canny_low: int = 50
    canny_high: int = 150
    
    # Gaussian blur kernel
    blur_kernel: int = 5
    
    # HoughLinesP parameters
    hough_threshold: int = 100
    hough_min_line_length: int = 100
    hough_max_line_gap: int = 10
    
    # Max angle for deskew (degrees)
    max_deskew_angle: float = 10.0

@dataclass
class Config:
    """Main configuration container"""
    hsv: HSVConfig = field(default_factory=HSVConfig)
    morphology: MorphologyConfig = field(default_factory=MorphologyConfig)
    circle_filter: CircleFilterConfig = field(default_factory=CircleFilterConfig)
    roi: ROIConfig = field(default_factory=ROIConfig)
    ocr: OCRConfig = field(default_factory=OCRConfig)
    preprocess: PreprocessConfig = field(default_factory=PreprocessConfig)
    
    # Output settings
    debug_overlay: bool = True
    debug_dir: str = "debug"
    
    # Processing
    max_workers: int = 4

# Default config instance
DEFAULT_CONFIG = Config()

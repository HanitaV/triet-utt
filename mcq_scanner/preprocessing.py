# MCQ Scanner - Image Preprocessing (Pillow + scikit-image)
# Perspective warp and deskew

import numpy as np
from PIL import Image
from typing import Optional, Tuple

from skimage import color, filters, feature, transform, morphology


def pil_to_array(image) -> np.ndarray:
    """Convert PIL Image or numpy array to numpy array"""
    if isinstance(image, Image.Image):
        return np.array(image.convert('RGB'))
    return image


def array_to_pil(array: np.ndarray) -> Image.Image:
    """Convert numpy array to PIL Image"""
    if array.dtype == np.float64 or array.dtype == np.float32:
        array = (array * 255).astype(np.uint8)
    return Image.fromarray(array)


def order_points(pts: np.ndarray) -> np.ndarray:
    """Order 4 points as: top-left, top-right, bottom-right, bottom-left"""
    rect = np.zeros((4, 2), dtype=np.float32)
    
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]  # top-left has smallest sum
    rect[2] = pts[np.argmax(s)]  # bottom-right has largest sum
    
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # top-right has smallest diff
    rect[3] = pts[np.argmax(diff)]  # bottom-left has largest diff
    
    return rect


def find_document_contour(image: np.ndarray, config) -> Optional[np.ndarray]:
    """Find the largest 4-point contour (document boundary)"""
    from skimage import measure
    
    # Convert to grayscale
    if len(image.shape) == 3:
        gray = color.rgb2gray(image)
    else:
        gray = image
    
    # Gaussian blur
    sigma = config.preprocess.blur_kernel / 3.0
    blurred = filters.gaussian(gray, sigma=sigma)
    
    # Edge detection
    edges = feature.canny(
        blurred,
        low_threshold=config.preprocess.canny_low / 255.0,
        high_threshold=config.preprocess.canny_high / 255.0
    )
    
    # Dilate edges to connect broken lines
    selem = morphology.disk(1)
    for _ in range(2):
        edges = morphology.binary_dilation(edges, selem)
    
    # Find contours
    contours = measure.find_contours(edges.astype(float), 0.5)
    
    if not contours:
        return None
    
    # Sort by length (approximate area)
    contours = sorted(contours, key=len, reverse=True)
    
    img_area = image.shape[0] * image.shape[1]
    
    for contour in contours[:5]:
        # Approximate polygon
        from skimage.measure import approximate_polygon
        approx = approximate_polygon(contour, tolerance=len(contour) * 0.02)
        
        if len(approx) == 5:  # approximate_polygon includes endpoint
            approx = approx[:-1]  # Remove duplicate endpoint
        
        if len(approx) == 4:
            # Calculate area using shoelace formula
            x = approx[:, 1]
            y = approx[:, 0]
            area = 0.5 * abs(np.dot(x, np.roll(y, 1)) - np.dot(y, np.roll(x, 1)))
            
            if area > 0.1 * img_area:
                # Return as (x, y) format
                return approx[:, ::-1].astype(np.float32)  # Swap columns
    
    return None


def perspective_warp(image: np.ndarray, pts: np.ndarray) -> np.ndarray:
    """Apply perspective transform to get flat document view"""
    rect = order_points(pts.astype(np.float32))
    (tl, tr, br, bl) = rect
    
    # Compute new image dimensions
    width_a = np.linalg.norm(br - bl)
    width_b = np.linalg.norm(tr - tl)
    max_width = int(max(width_a, width_b))
    
    height_a = np.linalg.norm(tr - br)
    height_b = np.linalg.norm(tl - bl)
    max_height = int(max(height_a, height_b))
    
    dst = np.array([
        [0, 0],
        [max_width - 1, 0],
        [max_width - 1, max_height - 1],
        [0, max_height - 1]
    ], dtype=np.float32)
    
    # Use scikit-image ProjectiveTransform
    tform = transform.ProjectiveTransform()
    tform.estimate(dst, rect)
    
    warped = transform.warp(
        image, tform,
        output_shape=(max_height, max_width),
        preserve_range=True
    )
    
    return warped.astype(np.uint8)


def compute_skew_angle(image: np.ndarray, config) -> float:
    """Compute skew angle using Hough lines"""
    from skimage.transform import hough_line, hough_line_peaks
    
    # Convert to grayscale
    if len(image.shape) == 3:
        gray = color.rgb2gray(image)
    else:
        gray = image
    
    # Edge detection
    edges = feature.canny(
        gray,
        low_threshold=config.preprocess.canny_low / 255.0,
        high_threshold=config.preprocess.canny_high / 255.0
    )
    
    # Hough line detection
    tested_angles = np.linspace(-np.pi / 4, np.pi / 4, 180)
    
    try:
        h, theta, d = hough_line(edges, theta=tested_angles)
        _, angles, _ = hough_line_peaks(h, theta, d, num_peaks=20)
    except Exception:
        return 0.0
    
    if len(angles) == 0:
        return 0.0
    
    # Convert to degrees and filter
    angles_deg = np.degrees(angles)
    
    # Only consider near-horizontal lines
    horizontal_angles = [a for a in angles_deg if abs(a) < 45]
    
    if not horizontal_angles:
        return 0.0
    
    # Use median angle to be robust against outliers
    median_angle = np.median(horizontal_angles)
    
    # Clamp to max deskew angle
    if abs(median_angle) > config.preprocess.max_deskew_angle:
        return 0.0
    
    return median_angle


def rotate_image(image: np.ndarray, angle: float) -> np.ndarray:
    """Rotate image by angle (degrees) around center"""
    if abs(angle) < 0.1:
        return image
    
    rotated = transform.rotate(
        image, angle, 
        resize=True, 
        preserve_range=True,
        mode='edge'
    )
    
    return rotated.astype(np.uint8)


def preprocess_image(image, config=None) -> np.ndarray:
    """
    Main preprocessing pipeline:
    1. Try perspective warp if document boundary found
    2. Otherwise, deskew rotate
    """
    from .config import DEFAULT_CONFIG
    if config is None:
        config = DEFAULT_CONFIG
    
    rgb = pil_to_array(image)
    
    # Try to find document boundary for perspective warp
    doc_pts = find_document_contour(rgb, config)
    
    if doc_pts is not None:
        try:
            warped = perspective_warp(rgb, doc_pts)
            # Additional deskew on warped image
            angle = compute_skew_angle(warped, config)
            if abs(angle) > 0.5:
                warped = rotate_image(warped, angle)
            return warped
        except Exception:
            pass  # Fall through to deskew only
    
    # Fallback: just deskew
    angle = compute_skew_angle(rgb, config)
    if abs(angle) > 0.5:
        return rotate_image(rgb, angle)
    
    return rgb


def deskew_roi(roi, config=None) -> np.ndarray:
    """Deskew a small ROI region"""
    from .config import DEFAULT_CONFIG
    if config is None:
        config = DEFAULT_CONFIG
    
    rgb = pil_to_array(roi)
    
    if rgb.shape[0] < 10 or rgb.shape[1] < 10:
        return rgb
    
    angle = compute_skew_angle(rgb, config)
    if abs(angle) > 0.5:
        return rotate_image(rgb, angle)
    return rgb

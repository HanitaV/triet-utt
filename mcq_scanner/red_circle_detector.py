# MCQ Scanner - Red Circle Detection (Pillow + scikit-image)
# Detect red-circled answers using HSV color space

import numpy as np
from PIL import Image
from dataclasses import dataclass
from typing import List, Tuple, Optional

from skimage import color, morphology, measure, draw
from skimage.transform import hough_circle, hough_circle_peaks

from .config import Config, DEFAULT_CONFIG


@dataclass
class Circle:
    """Detected red circle"""
    x: int  # bbox x
    y: int  # bbox y
    w: int  # bbox width
    h: int  # bbox height
    cx: int  # center x
    cy: int  # center y
    area: float
    circularity: float
    contour: np.ndarray


def pil_to_rgb_array(image) -> np.ndarray:
    """Convert PIL Image or numpy array to RGB numpy array"""
    if isinstance(image, Image.Image):
        return np.array(image.convert('RGB'))
    elif isinstance(image, np.ndarray):
        # If BGR (from legacy code), convert to RGB
        if len(image.shape) == 3 and image.shape[2] == 3:
            # Assume it could be BGR if coming from old code
            return image
        return image
    else:
        raise ValueError(f"Unsupported image type: {type(image)}")


def create_red_mask(image: np.ndarray, config: Config) -> np.ndarray:
    """Create binary mask for red regions using HSV with improved ranges"""
    # Convert RGB to HSV (scikit-image uses 0-1 range for H, S, V)
    rgb = pil_to_rgb_array(image)
    hsv = color.rgb2hsv(rgb)
    
    h = hsv[:, :, 0] * 360  # Convert to 0-360 range
    s = hsv[:, :, 1] * 255  # Convert to 0-255 range
    v = hsv[:, :, 2] * 255  # Convert to 0-255 range
    
    # Red range 1 (low hue: 0-15 degrees)
    lower1_h, lower1_s, lower1_v = config.hsv.lower_red1
    upper1_h, upper1_s, upper1_v = config.hsv.upper_red1
    mask1 = ((h >= lower1_h * 2) & (h <= upper1_h * 2) & 
             (s >= lower1_s) & (s <= upper1_s) &
             (v >= lower1_v) & (v <= upper1_v))
    
    # Red range 2 (high hue: 340-360 degrees)
    lower2_h, lower2_s, lower2_v = config.hsv.lower_red2
    upper2_h, upper2_s, upper2_v = config.hsv.upper_red2
    mask2 = ((h >= lower2_h * 2) & (h <= upper2_h * 2) &
             (s >= lower2_s) & (s <= upper2_s) &
             (v >= lower2_v) & (v <= upper2_v))
    
    # Additional ranges for different red shades
    # Orange-red (pen colors vary)
    mask3 = ((h >= 0) & (h <= 30) & (s >= 50) & (v >= 50))
    
    # Deep red
    mask4 = ((h >= 330) & (h <= 360) & (s >= 50) & (v >= 50))
    
    # Combine all masks
    combined = mask1 | mask2 | mask3 | mask4
    
    return combined.astype(np.uint8) * 255


def apply_morphology(mask: np.ndarray, config: Config) -> np.ndarray:
    """Apply morphological operations to clean up mask"""
    # Convert to binary
    binary = mask > 0
    
    # Create structuring elements
    close_selem = morphology.disk(config.morphology.close_kernel_size // 2)
    open_selem = morphology.disk(config.morphology.open_kernel_size // 2)
    dilate_selem = morphology.disk(1)
    
    # Close (fill small gaps in circles)
    binary = morphology.binary_closing(binary, close_selem)
    
    # Open (remove noise)
    binary = morphology.binary_opening(binary, open_selem)
    
    # Dilate to connect broken circles
    for _ in range(config.morphology.dilate_iterations):
        binary = morphology.binary_dilation(binary, dilate_selem)
    
    return (binary * 255).astype(np.uint8)


def filter_region(region, img_area: int, config: Config) -> Optional[Circle]:
    """Filter region properties and return Circle if valid"""
    area = region.area
    
    # Area filter (more lenient for various image sizes)
    min_area = max(100, config.circle_filter.min_area_ratio * img_area)
    max_area = config.circle_filter.max_area_ratio * img_area
    
    if area < min_area or area > max_area:
        return None
    
    # Bounding box
    minr, minc, maxr, maxc = region.bbox
    x, y = minc, minr
    w, h = maxc - minc, maxr - minr
    
    # Skip very small boxes
    if w < 10 or h < 10:
        return None
    
    # Aspect ratio filter (more lenient)
    aspect = w / h if h > 0 else 0
    if aspect < config.circle_filter.min_aspect_ratio or \
       aspect > config.circle_filter.max_aspect_ratio:
        return None
    
    # Circularity filter (more lenient for hand-drawn circles)
    perimeter = region.perimeter
    if perimeter == 0:
        return None
    circularity = 4 * np.pi * area / (perimeter ** 2)
    
    # Circles drawn by hand can be quite irregular
    if circularity < config.circle_filter.min_circularity:
        return None
    
    # Additional check: solidity
    if region.solidity < 0.3:  # Too fragmented
        return None
    
    # Get centroid
    cy, cx = region.centroid
    cx, cy = int(cx), int(cy)
    
    # Get contour points
    contour = region.coords
    
    return Circle(
        x=x, y=y, w=w, h=h,
        cx=cx, cy=cy,
        area=area,
        circularity=circularity,
        contour=contour
    )


def merge_nearby_circles(circles: List[Circle], config: Config) -> List[Circle]:
    """Merge circles that are close together (broken circles)"""
    if len(circles) <= 1:
        return circles
    
    # Sort by position for consistent merging
    circles = sorted(circles, key=lambda c: (c.cy, c.cx))
    
    merged = []
    used = set()
    
    for i, c1 in enumerate(circles):
        if i in used:
            continue
        
        # Find all circles close to this one
        group = [c1]
        used.add(i)
        
        avg_radius = (c1.w + c1.h) / 4
        merge_dist = avg_radius * config.circle_filter.merge_distance_ratio
        
        for j, c2 in enumerate(circles):
            if j in used:
                continue
            
            # Distance between centers
            dist = np.sqrt((c1.cx - c2.cx)**2 + (c1.cy - c2.cy)**2)
            
            # Also check if bboxes overlap significantly
            overlap_x = max(0, min(c1.x + c1.w, c2.x + c2.w) - max(c1.x, c2.x))
            overlap_y = max(0, min(c1.y + c1.h, c2.y + c2.h) - max(c1.y, c2.y))
            overlap_area = overlap_x * overlap_y
            min_area = min(c1.w * c1.h, c2.w * c2.h)
            
            if dist < merge_dist or (overlap_area > 0.3 * min_area):
                group.append(c2)
                used.add(j)
        
        if len(group) == 1:
            merged.append(c1)
        else:
            # Merge group into single circle
            all_coords = np.vstack([c.contour for c in group])
            x = min(c.x for c in group)
            y = min(c.y for c in group)
            x2 = max(c.x + c.w for c in group)
            y2 = max(c.y + c.h for c in group)
            w, h = x2 - x, y2 - y
            cx = sum(c.cx for c in group) // len(group)
            cy = sum(c.cy for c in group) // len(group)
            total_area = sum(c.area for c in group)
            avg_circularity = sum(c.circularity for c in group) / len(group)
            
            merged.append(Circle(
                x=x, y=y, w=w, h=h,
                cx=cx, cy=cy,
                area=total_area,
                circularity=avg_circularity,
                contour=all_coords
            ))
    
    return merged


def detect_circles_hough(mask: np.ndarray, config: Config) -> List[Circle]:
    """Alternative detection using Hough circles on the red mask"""
    binary = mask > 0
    
    # Try different radii
    hough_radii = np.arange(10, 100, 5)
    
    try:
        hough_res = hough_circle(binary, hough_radii)
        accums, cx_arr, cy_arr, radii = hough_circle_peaks(
            hough_res, hough_radii, 
            total_num_peaks=50,
            min_xdistance=20,
            min_ydistance=20
        )
    except Exception:
        return []
    
    result = []
    for cx, cy, r in zip(cx_arr, cy_arr, radii):
        x, y = cx - r, cy - r
        w = h = 2 * r
        
        result.append(Circle(
            x=int(x), y=int(y), w=int(w), h=int(h),
            cx=int(cx), cy=int(cy),
            area=np.pi * r * r,
            circularity=1.0,  # Perfect circle by definition
            contour=np.array([])
        ))
    
    return result


def detect_red_circles(image, config: Config = DEFAULT_CONFIG) -> List[Circle]:
    """
    Main detection pipeline with multiple strategies:
    1. Contour-based detection using regionprops
    2. Hough circle detection (fallback)
    """
    rgb = pil_to_rgb_array(image)
    h, w = rgb.shape[:2]
    img_area = h * w
    
    # Create red mask
    mask = create_red_mask(rgb, config)
    
    # Apply morphology
    mask = apply_morphology(mask, config)
    
    # Label connected components
    binary = mask > 0
    labeled = measure.label(binary)
    regions = measure.regionprops(labeled)
    
    # Filter regions
    circles = []
    for region in regions:
        circle = filter_region(region, img_area, config)
        if circle:
            circles.append(circle)
    
    # Merge nearby circles
    circles = merge_nearby_circles(circles, config)
    
    # If no circles found, try Hough detection
    if len(circles) == 0:
        circles = detect_circles_hough(mask, config)
    
    # Sort by position (top to bottom, left to right)
    # Account for 2-column layout: sort by row first
    row_height = h // 20  # Approximate row height
    circles = sorted(circles, key=lambda c: (c.cy // row_height, c.cx))
    
    return circles


def get_debug_mask(image, config: Config = DEFAULT_CONFIG) -> np.ndarray:
    """Get the red mask for debugging purposes"""
    rgb = pil_to_rgb_array(image)
    mask = create_red_mask(rgb, config)
    mask = apply_morphology(mask, config)
    return mask

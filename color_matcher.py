from colormath.color_objects import sRGBColor, LabColor
from colormath.color_conversions import convert_color
from colormath.color_diff import delta_e_cie2000
import numpy as np
from scipy.spatial import cKDTree
import json

# Fix for numpy compatibility with colormath
if not hasattr(np, 'asscalar'):
    np.asscalar = lambda x: x.item() if hasattr(x, 'item') else x

# Global cache for pre-computed LAB values and KD-tree
_thread_lab_cache = {}
_thread_lab_cache_shimmer = {}
_kd_tree = None
_kd_tree_shimmer = None
_thread_codes = []
_thread_codes_shimmer = []

def initialize_color_matcher(thread_colors_path='thread_colors.json'):
    """
    Pre-compute LAB values and build KD-tree for fast nearest neighbor search.
    This should be called once at application startup.
    """
    global _thread_lab_cache, _thread_lab_cache_shimmer
    global _kd_tree, _kd_tree_shimmer, _thread_codes, _thread_codes_shimmer
    
    with open(thread_colors_path, 'r') as f:
        thread_colors = json.load(f)
    
    # Pre-compute LAB values for normal and shimmer-adjusted colors
    lab_points = []
    lab_points_shimmer = []
    _thread_codes = []
    _thread_codes_shimmer = []
    
    for thread_code, thread_info in thread_colors.items():
        rgb = tuple(thread_info['rgb'])
        
        # Normal LAB conversion
        lab = rgb_to_lab_colormath(rgb)
        _thread_lab_cache[thread_code] = lab
        lab_points.append([lab.lab_l, lab.lab_a, lab.lab_b])
        _thread_codes.append(thread_code)
        
        # Shimmer-adjusted LAB conversion
        rgb_shimmer = adjust_for_shimmer(rgb)
        lab_shimmer = rgb_to_lab_colormath(rgb_shimmer)
        _thread_lab_cache_shimmer[thread_code] = lab_shimmer
        lab_points_shimmer.append([lab_shimmer.lab_l, lab_shimmer.lab_a, lab_shimmer.lab_b])
        _thread_codes_shimmer.append(thread_code)
    
    # Build KD-trees for fast nearest neighbor search
    _kd_tree = cKDTree(lab_points)
    _kd_tree_shimmer = cKDTree(lab_points_shimmer)
    
    print(f"Initialized color matcher with {len(_thread_codes)} thread colors")

def rgb_to_lab_colormath(rgb):
    """Convert RGB tuple to LAB using colormath library."""
    r, g, b = rgb
    rgb_obj = sRGBColor(r, g, b, is_upscaled=True)
    lab_obj = convert_color(rgb_obj, LabColor)
    return lab_obj

def find_closest_color(target_color, thread_colors=None, consider_shimmer=False, use_delta_e=True):
    """
    Find the closest thread color to the target color using optimized KD-tree search.
    
    Args:
        target_color: RGB tuple (r, g, b)
        thread_colors: Deprecated - kept for backward compatibility
        consider_shimmer: Whether to account for shimmer effect
        use_delta_e: Use Delta E 2000 for final ranking (more accurate)
    
    Returns:
        Thread code of closest match
    """
    global _kd_tree, _kd_tree_shimmer, _thread_codes, _thread_codes_shimmer
    
    # Use appropriate tree and cache based on shimmer setting
    kd_tree = _kd_tree_shimmer if consider_shimmer else _kd_tree
    thread_codes = _thread_codes_shimmer if consider_shimmer else _thread_codes
    lab_cache = _thread_lab_cache_shimmer if consider_shimmer else _thread_lab_cache
    
    if kd_tree is None:
        raise RuntimeError("Color matcher not initialized. Call initialize_color_matcher() first.")
    
    # Convert target color to LAB
    target_lab = rgb_to_lab_colormath(target_color)
    target_point = np.array([[target_lab.lab_l, target_lab.lab_a, target_lab.lab_b]])
    
    # Use KD-tree to find k nearest neighbors (k=10 for better accuracy with Delta E)
    k = min(10, len(thread_codes))
    distances, indices = kd_tree.query(target_point, k=k)
    
    # If using Delta E 2000, re-rank the candidates for better accuracy
    if use_delta_e:
        min_delta_e = float('inf')
        best_index = indices[0][0] if k == 1 else None
        
        for idx in indices[0]:
            thread_code = thread_codes[idx]
            thread_lab = lab_cache[thread_code]
            delta_e = delta_e_cie2000(target_lab, thread_lab)
            
            if delta_e < min_delta_e:
                min_delta_e = delta_e
                best_index = idx
        
        return thread_codes[best_index]
    else:
        # Use KD-tree result directly (faster but less accurate)
        return thread_codes[indices[0][0]]

def adjust_for_shimmer(rgb_color):
    """
    Adjust RGB values to account for polyester thread shimmer.
    """
    shimmer_factor = 1.07  # 7% brighter
    adjusted = tuple(min(255, int(c * shimmer_factor)) for c in rgb_color)
    return adjusted 
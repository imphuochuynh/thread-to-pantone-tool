def find_closest_color(target_color, thread_colors, consider_shimmer=False):
    """
    Find the closest thread color to the target color.
    """
    min_distance = float('inf')
    closest_color = None
    
    # Convert target color to Lab color space
    target_lab = rgb2lab(target_color)
    
    for thread_code, thread_info in thread_colors.items():
        thread_rgb = thread_info['rgb']
        
        # Apply shimmer adjustment if needed
        if consider_shimmer:
            thread_rgb = adjust_for_shimmer(thread_rgb)
            
        thread_lab = rgb2lab(thread_rgb)
        distance = color_distance(target_lab, thread_lab)
        
        if distance < min_distance:
            min_distance = distance
            closest_color = thread_code
            
    return closest_color

def adjust_for_shimmer(rgb_color):
    """
    Adjust RGB values to account for polyester thread shimmer.
    """
    shimmer_factor = 1.07  # 7% brighter
    adjusted = tuple(min(255, int(c * shimmer_factor)) for c in rgb_color)
    return adjusted 
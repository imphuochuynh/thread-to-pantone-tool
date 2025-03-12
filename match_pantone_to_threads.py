import csv
import json
import math

def load_pantone_colors(file_path):
    """Load Pantone colors from JSON file."""
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    pantone_colors = []
    for color in data['pantone_colors']:
        name = color.get('name', '')
        rgb = color.get('rgb', {})
        if name and rgb:
            r = rgb.get('r', 0)
            g = rgb.get('g', 0)
            b = rgb.get('b', 0)
            pantone_colors.append({
                'name': name,
                'rgb': (r, g, b)
            })
    
    print(f"Loaded {len(pantone_colors)} Pantone colors")
    return pantone_colors

def load_thread_colors(file_path):
    """Load embroidery thread colors from CSV file."""
    thread_colors = []
    with open(file_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            thread_colors.append({
                'code': row['Thread Code'],
                'rgb': (int(row['R']), int(row['G']), int(row['B']))
            })
    
    print(f"Loaded {len(thread_colors)} thread colors")
    return thread_colors

def rgb_distance(rgb1, rgb2):
    """Calculate Euclidean distance between two RGB colors."""
    r1, g1, b1 = rgb1
    r2, g2, b2 = rgb2
    return math.sqrt((r1 - r2)**2 + (g1 - g2)**2 + (b1 - b2)**2)

def rgb_to_xyz(rgb):
    """Convert RGB to XYZ color space."""
    r, g, b = rgb
    
    # Normalize RGB values
    r = r / 255.0
    g = g / 255.0
    b = b / 255.0
    
    # Apply gamma correction
    r = r ** 2.2 if r > 0.04045 else r / 12.92
    g = g ** 2.2 if g > 0.04045 else g / 12.92
    b = b ** 2.2 if b > 0.04045 else b / 12.92
    
    # Convert to XYZ
    x = r * 0.4124 + g * 0.3576 + b * 0.1805
    y = r * 0.2126 + g * 0.7152 + b * 0.0722
    z = r * 0.0193 + g * 0.1192 + b * 0.9505
    
    return (x * 100, y * 100, z * 100)

def xyz_to_lab(xyz):
    """Convert XYZ to CIELAB color space."""
    x, y, z = xyz
    
    # Reference values for D65 standard illuminant
    x_ref = 95.047
    y_ref = 100.0
    z_ref = 108.883
    
    # Normalize XYZ values
    x = x / x_ref
    y = y / y_ref
    z = z / z_ref
    
    # Apply transformation
    x = x ** (1/3) if x > 0.008856 else (7.787 * x) + (16 / 116)
    y = y ** (1/3) if y > 0.008856 else (7.787 * y) + (16 / 116)
    z = z ** (1/3) if z > 0.008856 else (7.787 * z) + (16 / 116)
    
    L = (116 * y) - 16
    a = 500 * (x - y)
    b = 200 * (y - z)
    
    return (L, a, b)

def rgb_to_lab(rgb):
    """Convert RGB to CIELAB color space."""
    xyz = rgb_to_xyz(rgb)
    return xyz_to_lab(xyz)

def lab_distance(lab1, lab2):
    """Calculate Euclidean distance between two CIELAB colors."""
    L1, a1, b1 = lab1
    L2, a2, b2 = lab2
    return math.sqrt((L1 - L2)**2 + (a1 - a2)**2 + (b1 - b2)**2)

def find_closest_thread(pantone_rgb, threads, method='rgb'):
    """Find the closest thread color to a given Pantone color using specified method."""
    closest_thread = None
    min_distance = float('inf')
    
    if method == 'lab':
        # Convert pantone RGB to LAB
        pantone_lab = rgb_to_lab(pantone_rgb)
        
        for thread in threads:
            # Convert thread RGB to LAB
            thread_lab = rgb_to_lab(thread['rgb'])
            distance = lab_distance(pantone_lab, thread_lab)
            
            if distance < min_distance:
                min_distance = distance
                closest_thread = thread
    else:
        # Default to RGB distance
        for thread in threads:
            distance = rgb_distance(pantone_rgb, thread['rgb'])
            if distance < min_distance:
                min_distance = distance
                closest_thread = thread
    
    return closest_thread, min_distance

def main():
    # Load Pantone colors and thread colors
    pantone_colors = load_pantone_colors('all_pantone_colors_with_rgb.json')
    thread_colors = load_thread_colors('Reformatted_Embroidery_Thread_Data.csv')
    
    # Match each Pantone color to the closest thread using both methods
    rgb_matches = []
    lab_matches = []
    
    for pantone in pantone_colors:
        # RGB matching
        rgb_closest_thread, rgb_distance_val = find_closest_thread(pantone['rgb'], thread_colors, 'rgb')
        
        rgb_matches.append({
            'Pantone Color': pantone['name'],
            'Pantone RGB': f"({pantone['rgb'][0]}, {pantone['rgb'][1]}, {pantone['rgb'][2]})",
            'Matched Thread Code': rgb_closest_thread['code'],
            'Matched RGB': f"({rgb_closest_thread['rgb'][0]}, {rgb_closest_thread['rgb'][1]}, {rgb_closest_thread['rgb'][2]})",
            'Distance': rgb_distance_val,
            'Method': 'RGB'
        })
        
        # LAB matching
        lab_closest_thread, lab_distance_val = find_closest_thread(pantone['rgb'], thread_colors, 'lab')
        
        lab_matches.append({
            'Pantone Color': pantone['name'],
            'Pantone RGB': f"({pantone['rgb'][0]}, {pantone['rgb'][1]}, {pantone['rgb'][2]})",
            'Matched Thread Code': lab_closest_thread['code'],
            'Matched RGB': f"({lab_closest_thread['rgb'][0]}, {lab_closest_thread['rgb'][1]}, {lab_closest_thread['rgb'][2]})",
            'Distance': lab_distance_val,
            'Method': 'LAB'
        })
    
    # Combine matches
    all_matches = rgb_matches + lab_matches
    
    # Sort matches by Pantone color name
    all_matches.sort(key=lambda x: x['Pantone Color'])
    
    # Write matches to CSV file
    with open('matched_Pantone_to_embroidery_threads.csv', 'w', newline='') as f:
        fieldnames = ['Pantone Color', 'Pantone RGB', 'Matched Thread Code', 'Matched RGB', 'Distance', 'Method']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_matches)
    
    print(f"Matched {len(all_matches)} Pantone colors to threads")
    
    # Check a few specific Pantone colors
    specific_pantones = ['PANTONE  186 C', 'PANTONE  1805 C', 'PANTONE  2034 C']
    for pantone_name in specific_pantones:
        match = next((m for m in all_matches if m['Pantone Color'] == pantone_name), None)
        if match:
            print(f"\nSpecial check for {pantone_name}:")
            print(f"  Matched with thread: {match['Matched Thread Code']}")
            print(f"  Pantone RGB: {match['Pantone RGB']}")
            print(f"  Thread RGB: {match['Matched RGB']}")
            print(f"  Distance: {match['Distance']}")
            print(f"  Method: {match['Method']}")

if __name__ == '__main__':
    main() 
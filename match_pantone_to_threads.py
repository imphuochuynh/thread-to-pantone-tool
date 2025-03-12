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

def find_closest_thread(pantone_rgb, threads):
    """Find the closest thread color to a given Pantone color."""
    closest_thread = None
    min_distance = float('inf')
    
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
    
    # Match each Pantone color to the closest thread
    matches = []
    for pantone in pantone_colors:
        closest_thread, distance = find_closest_thread(pantone['rgb'], thread_colors)
        
        matches.append({
            'Pantone Color': pantone['name'],
            'Pantone RGB': f"({pantone['rgb'][0]}, {pantone['rgb'][1]}, {pantone['rgb'][2]})",
            'Matched Thread Code': closest_thread['code'],
            'Matched RGB': f"({closest_thread['rgb'][0]}, {closest_thread['rgb'][1]}, {closest_thread['rgb'][2]})",
            'Distance': distance
        })
    
    # Sort matches by Pantone color name
    matches.sort(key=lambda x: x['Pantone Color'])
    
    # Write matches to CSV file
    with open('matched_Pantone_to_embroidery_threads.csv', 'w', newline='') as f:
        fieldnames = ['Pantone Color', 'Pantone RGB', 'Matched Thread Code', 'Matched RGB', 'Distance']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(matches)
    
    print(f"Matched {len(matches)} Pantone colors to threads")
    
    # Check a few specific Pantone colors
    specific_pantones = ['PANTONE  186 C', 'PANTONE  1805 C', 'PANTONE  2034 C']
    for pantone_name in specific_pantones:
        match = next((m for m in matches if m['Pantone Color'] == pantone_name), None)
        if match:
            print(f"\nSpecial check for {pantone_name}:")
            print(f"  Matched with thread: {match['Matched Thread Code']}")
            print(f"  Pantone RGB: {match['Pantone RGB']}")
            print(f"  Thread RGB: {match['Matched RGB']}")
            print(f"  Distance: {match['Distance']}")

if __name__ == '__main__':
    main() 
from flask import Flask, render_template, request, jsonify
from color_matcher import find_closest_color, initialize_color_matcher
import json
import os

app = Flask(__name__)

# Load thread colors at startup
_thread_colors = None

def load_thread_colors():
    """Load thread colors from JSON file."""
    global _thread_colors
    if _thread_colors is None:
        with open('thread_colors.json', 'r') as f:
            _thread_colors = json.load(f)
    return _thread_colors

# Initialize color matcher at application startup
# Use a flag to ensure initialization happens only once
_initialized = False

def initialize():
    global _initialized
    if not _initialized:
        initialize_color_matcher('thread_colors.json')
        load_thread_colors()
        _initialized = True

# Initialize on import for production, or use before_request for lazy loading
initialize()

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        # Get the color values from the form
        r = int(request.form.get('r', 0))
        g = int(request.form.get('g', 0))
        b = int(request.form.get('b', 0))
        consider_shimmer = request.form.get('consider_shimmer') == 'on'
        
        # Find the closest thread color
        target_color = (r, g, b)
        closest_thread_code = find_closest_color(target_color, consider_shimmer=consider_shimmer)
        
        # Get full thread color info
        thread_colors = load_thread_colors()
        closest_thread = thread_colors.get(closest_thread_code, {})
        
        return render_template('result.html', 
                             input_color=target_color,
                             thread_color=closest_thread,
                             thread_code=closest_thread_code,
                             consider_shimmer=consider_shimmer)
    
    return render_template('index.html')

if __name__ == '__main__':
    # Initialize before running
    initialize_color_matcher('thread_colors.json')
    app.run(debug=True) 
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
        closest_thread = find_closest_color(target_color, thread_colors, consider_shimmer)
        
        return render_template('result.html', 
                             input_color=target_color,
                             thread_color=closest_thread,
                             consider_shimmer=consider_shimmer)
    
    return render_template('index.html') 
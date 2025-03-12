# Minh Shyang to Pantone Color Matcher

A web-based tool for matching Minh Shyang embroidery thread colors to Pantone colors and vice versa. This application helps designers and embroiderers find the closest color matches between different color systems.

## Features

- **Unified Search**: Search by either thread code or Pantone color name
- **Comprehensive Color Database**: 
  - 1,800+ Minh Shyang embroidery thread colors
  - 2,100+ Pantone colors with RGB values
- **Alternative Matches**: Shows up to 2 alternative matches when an exact match isn't available
- **Color Visualization**: Visual swatches for all colors and matches
- **Distance Metrics**: Shows RGB distance between matched colors
- **Light and Dark Mode**: Toggle between light and dark themes with system preference detection
- **Responsive Design**: Works on desktop and mobile devices

## Usage

1. **Search for Colors**: Enter a thread code (e.g., "D538") or Pantone color (e.g., "186 C") in the search box
2. **View Matches**: See the primary match and alternative options for each color
3. **Toggle Theme**: Switch between light and dark mode using the toggle in the header
4. **Navigate Results**: Use pagination to browse through all colors

## Data Sources

This tool uses the following data sources:

- **Minh Shyang Thread Colors**: Reformatted embroidery thread data with RGB values
- **Pantone Colors**: Comprehensive collection of Pantone colors with RGB values
- **Match Data**: Pre-calculated matches between Pantone colors and embroidery threads

## Technical Details

- **Pure Frontend Application**: HTML, CSS, and JavaScript with no external dependencies
- **Color Matching Algorithm**: Uses RGB Euclidean distance to find the closest color matches
- **Data Format**: CSV and JSON files for color data and matches
- **Accessibility**: Supports light and dark modes for better readability

## Local Development

To run this application locally:

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/minh-shyang-to-pantone-matcher.git
   ```

2. Navigate to the project directory:
   ```
   cd minh-shyang-to-pantone-matcher
   ```

3. Start a local web server:
   ```
   python -m http.server 8000
   ```

4. Open your browser and visit:
   ```
   http://localhost:8000
   ```

## License

[MIT License](LICENSE)

## Acknowledgements

- Pantone® is a registered trademark of Pantone LLC
- Minh Shyang thread color data is used for educational and reference purposes
- This tool is not affiliated with or endorsed by Pantone LLC or Minh Shyang

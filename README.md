# Minh Shyang to Pantone Color Matcher

A web-based tool for matching Minh Shyang 100% Polyester Embroidery Thread colors to Pantone Solid Coated colors and vice versa. This application helps designers and embroiderers find the closest color matches between different color systems.

![Screenshot of the application](https://via.placeholder.com/800x450.png?text=Minh+Shyang+to+Pantone+Color+Matcher)

## Features

- **Unified Search**: Search by either thread code or Pantone color name
- **Comprehensive Color Database**: 
  - 1,800+ Minh Shyang 100% Polyester Embroidery Thread colors
  - 2,100+ Pantone Solid Coated colors with RGB values
- **Hex Color Input**: Find matches for any color by entering a hex code
- **Multiple Matching Methods**:
  - RGB (Basic): Simple Euclidean distance in RGB color space
  - CIELAB (Perceptual): Advanced matching using perceptually uniform color space
- **Alternative Matches**: Shows up to 2 alternative matches when an exact match isn't available
- **Color Visualization**: Visual swatches for all colors and matches
- **Distance Metrics**: Shows color distance between matched colors
- **Light and Dark Mode**: Toggle between light and dark themes with system preference detection
- **Responsive Design**: Works on desktop and mobile devices

## Usage

1. **Search for Colors**: Enter a thread code (e.g., "D538") or Pantone color (e.g., "186 C") in the search box
2. **Find by Hex Code**: Enter any hex color code to find the closest Pantone and thread matches
3. **Choose Matching Method**: Select between RGB (Basic) or CIELAB (Perceptual) color matching
4. **View Matches**: See the primary match and alternative options for each color
5. **Toggle Theme**: Switch between light and dark mode using the toggle in the header
6. **Navigate Results**: Use pagination to browse through all colors

## Data Sources

This tool uses the following data sources:

- **Minh Shyang Thread Colors**: Reformatted 100% Polyester Embroidery Thread data with RGB values
- **Pantone Colors**: Comprehensive collection of Pantone Solid Coated colors with RGB values
- **Match Data**: Pre-calculated matches between Pantone Solid Coated colors and embroidery threads

## Technical Details

- **Pure Frontend Application**: HTML, CSS, and JavaScript with PapaParse for CSV parsing
- **Color Matching Algorithms**: 
  - RGB Euclidean distance for basic color matching
  - CIELAB color space conversion for perceptually accurate matching
- **Data Format**: CSV and JSON files for color data and matches
- **Accessibility**: Supports light and dark modes for better readability
- **GitHub Pages Compatible**: Designed to work directly from GitHub Pages hosting

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

## Deployment

This application is designed to be deployed directly to GitHub Pages:

1. Push your changes to GitHub:
   ```
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

2. Enable GitHub Pages in your repository settings, selecting the main branch as the source.

3. Your application will be available at:
   ```
   https://yourusername.github.io/minh-shyang-to-pantone-matcher/
   ```

## License

[MIT License](LICENSE)

## Acknowledgements

- Pantone® is a registered trademark of Pantone LLC
- Minh Shyang thread color data is used for educational and reference purposes
- This tool is not affiliated with or endorsed by Pantone LLC or Minh Shyang
- [PapaParse](https://www.papaparse.com/) for CSV parsing

## Contact

For questions, suggestions, or issues, please [open an issue](https://github.com/yourusername/minh-shyang-to-pantone-matcher/issues) on GitHub.

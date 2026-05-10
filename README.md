# DecodingGaze

A data visualization project exploring gaze patterns and activity-based eye movement data.

## Overview

This project visualizes gaze tracking data collected from various daily activities. The visualizations help decode how people look at their environment during different tasks.

## Features

- Interactive gaze trail visualizations
- Activity-based centroid mapping
- Gender-based analysis views
- Marginal distribution charts
- Safe zone analysis
- AR designer components

## Data

The dataset includes:
- Gaze trails from activities: cooking, fresh air, game night, housekeeping, meal, relaxing, searching, workout
- Centroid calculations
- Density maps
- Representative trails
- Gender split analysis

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/DecodingGaze.git
   cd DecodingGaze
   ```

2. Run a local web server using Python:
   ```bash
   python -m http.server 8000
   ```

3. Open your browser and navigate to `http://localhost:8000/viz/` to explore the visualizations.

Alternatively, you can directly open `viz/index.html` in a web browser.

## Usage

Open `viz/index.html` in your browser to explore the visualizations. The interface includes various components for analyzing gaze data.

## Technologies

- HTML5
- CSS3
- JavaScript (ES6+)
- D3.js (assumed based on visualization components)

## Project Structure

- `data/`: Raw data files (JSON, CSV)
- `viz/`: Web visualization interface
  - `index.html`: Main page
  - `assets/`: Static assets
  - `css/`: Stylesheets
  - `js/`: JavaScript modules and components

## License

See LICENSE file for details.
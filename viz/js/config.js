/**
 * config.js
 * Global constants shared across all components.
 * Import this first. Nothing here has side effects.
 */

const CONFIG = {

  // ── Physical lens dimensions (millimetres) ──────────────────────────────
  lens: {
    widthMm:  55.0,
    heightMm: 30.0,
    radiusMm:  3.0,   // corner radius for rounded rectangle
  },

  // ── SVG rendering scale ─────────────────────────────────────────────────
  // 1 mm = 6 px  →  lens SVG = 330 × 180 px
  mmToPx: 6,

  // ── Activities ──────────────────────────────────────────────────────────
  // Ordered by median centroid Y, most downward first (see specification.md §13)
  activities: [
    "Cooking",       // −8.49 mm
    "Housekeeping",  // −7.17 mm
    "Game Night",    // −6.80 mm
    "Meal",          // −6.22 mm
    "Workout",       // −5.41 mm
    "Searching",     // −5.34 mm
    "Fresh Air",     // −4.64 mm
    "Relaxing",      // −3.30 mm
  ],

  // Maps display label → Nymeria script name (for data lookups)
  activityScripts: {
    "Cooking":      "S7-Cooking",
    "Housekeeping": "S10-Housekeeping",
    "Game Night":   "S12-Game_night",
    "Meal":         "S8-Having_a_meal",
    "Workout":      "S5-Workout",
    "Searching":    "S2-Where_is_X",
    "Fresh Air":    "S19-Fresh_air",
    "Relaxing":     "S1-Relax_at_home",
  },

  // ── Colors ──────────────────────────────────────────────────────────────
  // D3 schemeTableau10 — consistent across all views and Python plots
  activityColors: {
    "Cooking":      "#4e79a7",
    "Housekeeping": "#f28e2b",
    "Game Night":   "#e15759",
    "Meal":         "#76b7b2",
    "Workout":      "#59a14f",
    "Searching":    "#edc948",
    "Fresh Air":    "#b07aa1",
    "Relaxing":     "#9c755f",
  },

  genderColors: {
    "Female": "#e6a3c7",
    "Male":   "#8ecae6",
  },

  // Safe zone gradient: green (safe) → yellow (caution) → red (avoid)
  safeZoneColors: {
    safe:    "#2ca02c",
    caution: "#ffbb78",
    avoid:   "#d62728",
  },

  // ── UI palette ───────────────────────────────────────────────────────────
  ui: {
    background:   "#1a1a1a",
    lensFill:     "#111111",
    lensStroke:   "#ffffff",
    crosshair:    "#00bcd4",
    textPrimary:  "#f0f0f0",
    textSecondary:"#aaaaaa",
    tooltipBg:    "#333333",
  },

  // ── Lens coordinate ranges (mm) ─────────────────────────────────────────
  // Centred at (0,0): x in [-27.5, 27.5], y in [-15, 15]
  lensXRange: [-27.5,  27.5],
  lensYRange: [-15.0,  15.0],

  // ── Animation (gaze trail) ───────────────────────────────────────────────
  trail: {
    frameIntervalMs: 100,   // 100ms per frame = real-time 10Hz playback
    trailLength:      20,   // number of fading dots behind the current point
    dotRadius:         4,   // px, current position dot
    trailDotRadius:    2,   // px, fading trail dots
  },

  // ── Density grid ────────────────────────────────────────────────────────
  density: {
    bins: 50,
    // Threshold above which a cell is considered "high gaze density"
    // Used by the AR designer collision calculation
    highDensityThreshold: 0.3,
  },

  // ── AR designer defaults ─────────────────────────────────────────────────
  arOverlay: {
    defaultWidthMm:  15,
    defaultHeightMm:  8,
    defaultXMm:       0,   // centre of lens
    defaultYMm:       5,   // slightly above centre
  },

};

// Derived convenience values (computed once from CONFIG)
CONFIG.lens.svgWidth  = CONFIG.lens.widthMm  * CONFIG.mmToPx;   // 330
CONFIG.lens.svgHeight = CONFIG.lens.heightMm * CONFIG.mmToPx;   // 180
CONFIG.lens.svgRadius = CONFIG.lens.radiusMm * CONFIG.mmToPx;   //  18

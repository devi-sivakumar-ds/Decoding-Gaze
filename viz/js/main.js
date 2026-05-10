/**
 * main.js
 * Loads all data files and initializes visualization components.
 * Owns the shared state object — components never talk to each other directly.
 *
 * Components are uncommented below as they are built.
 */

// ── Shared state ─────────────────────────────────────────────────────────────
const state = {
  selectedActivity:  null,
  highlightedSession: null,
  gender:            "all",
  trailActivity:     CONFIG.activities[0],
  arOverlayPosition: { x: CONFIG.arOverlay.defaultXMm, y: CONFIG.arOverlay.defaultYMm },
  arOverlaySize:     { w: CONFIG.arOverlay.defaultWidthMm, h: CONFIG.arOverlay.defaultHeightMm },
};

// ── Data paths (relative to index.html) ──────────────────────────────────────
const DATA = {
  trails:    "../data/representative_trails.json",
  centroids: "../data/activity_centroids.json",
  sessions:  "../data/session_centroids.csv",
  densities: "../data/activity_densities.json",
  gender:    "../data/gender_split.json",
  dataset:   "../data/dataset_meta.json",
  frames:    "../data/frames_manifest.json",
};

// ── Bootstrap ─────────────────────────────────────────────────────────────────
Promise.all([
  d3.json(DATA.trails),
  d3.json(DATA.centroids),
  d3.csv(DATA.sessions),
  d3.json(DATA.densities),
  d3.json(DATA.gender),
  d3.json(DATA.dataset),
]).then(([trails, centroids, sessions, densities, genderData, datasetMeta]) => {

  // Coerce numeric columns from CSV
  sessions.forEach(d => {
    d.cx_mm  = +d.cx_mm;
    d.cy_mm  = +d.cy_mm;
    d.sx_mm  = +d.sx_mm;
    d.sy_mm  = +d.sy_mm;
    d.r90_mm = +d.r90_mm;
    d.jitter = +d.jitter;
  });

  console.log("Data loaded —",
    trails.length, "trails |",
    centroids.length, "activity centroids |",
    sessions.length, "sessions"
  );

  // ── Act 1 ────────────────────────────────────────────────────────────────
  GazeTrail.init(trails);
  // Load frames manifest separately — doesn't block the rest of the vis
  d3.json(DATA.frames).then(fm => GazeTrail.setFrames(fm)).catch(() => {});

  // ── The Dataset ──────────────────────────────────────────────────────────
  try {
    DatasetOverview.init(datasetMeta);
  } catch (e) {
    console.error("DatasetOverview failed:", e);
  }

  // ── Cross-filter handler ──────────────────────────────────────────────────
  function onActivitySelect(activity) {
    // Toggle: clicking the already-selected activity clears the selection
    if (state.selectedActivity === activity) {
      state.selectedActivity = null;
      CentroidMap.clear();
      MarginalDist.clear();
      GenderView.clear();
    } else {
      state.selectedActivity = activity;
      CentroidMap.highlight(activity);
      MarginalDist.highlight(activity);
      GenderView.highlight(activity);
    }
  }

  // Click anywhere on the page background clears the selection
  d3.select("main").on("click", (event) => {
    if (!event.target.closest(".cm-dot, .md-line, .md-area, .gv-dot")) {
      if (state.selectedActivity !== null) {
        state.selectedActivity = null;
        CentroidMap.clear();
        MarginalDist.clear();
        GenderView.clear();
      }
    }
  });

  // ── Act 2 ────────────────────────────────────────────────────────────────
  CentroidMap.init(centroids, onActivitySelect);
  StripChart.init(sessions);
  MarginalDist.init(sessions, onActivitySelect);

  // ── Act 3 ────────────────────────────────────────────────────────────────
  SafeZone.init(densities);
  ArDesigner.init(densities);
  GenderView.init(genderData, onActivitySelect);

}).catch(err => {
  console.error("Data load failed:", err);
  d3.select("main").insert("p", ":first-child")
    .style("color", "#d62728")
    .style("padding", "16px")
    .text(`Data load error: ${err.message}. Make sure you are running a local server (python3 -m http.server 8000).`);
});

/**
 * safeZone.js
 * Act 3 — Safe Zone Map (V5)
 *
 * Renders the activity gaze density as a traffic-light heatmap on the lens.
 * Green = low gaze (safe for AR overlays), Red = high gaze (avoid).
 *
 * density[x_idx][y_idx] — shape [50][50], values 0–1, normalised per activity.
 *
 * Public API:
 *   SafeZone.init(densities)
 */

const SafeZone = (() => {

  const { activities, activityColors, ui } = CONFIG;
  const { xPx, yPx } = LensScales;

  const BINS    = 50;
  const CELL_W  = CONFIG.lens.svgWidth  / BINS;   // 6.6 px
  const CELL_H  = CONFIG.lens.svgHeight / BINS;   // 3.6 px

  // Traffic-light color scale: 0 = green (safe) → 1 = red (avoid)
  const colorScale = d3.scaleLinear()
    .domain([0, 0.35, 1])
    .range(["#2ca02c", "#ffbb78", "#d62728"])
    .clamp(true);

  let _densities   = null;
  let _activity    = activities[0];
  let _cells       = null;   // d3 selection of all rect cells
  let _captionEl   = null;

  function init(densities) {
    _densities = densities;

    const { lensGroup } = LensFrame.create(
      "#safezone-lens-container", "safezone", { padPx: 16, crosshair: false }
    );

    // ── Heatmap cells ──────────────────────────────────────────────────────
    // Flatten density into array of {xi, yi, val} for d3 data join
    const act    = _densities[_activity];
    const flatData = _flatten(act);

    _cells = lensGroup.selectAll(".sz-cell")
      .data(flatData)
      .join("rect")
        .attr("class",  "sz-cell")
        .attr("x",      d => xPx(act.x_centers[d.xi]) - CELL_W / 2)
        .attr("y",      d => yPx(act.y_centers[d.yi]) - CELL_H / 2)
        .attr("width",  CELL_W)
        .attr("height", CELL_H)
        .attr("fill",   d => colorScale(d.val))
        .attr("opacity", 0.88);

    // ── Activity pills ─────────────────────────────────────────────────────
    d3.select("#safezone-activity-selector")
      .selectAll(".pill")
      .data(activities)
      .join("button")
        .attr("class", d => `pill${d === _activity ? " active" : ""}`)
        .style("color", d => activityColors[d])
        .text(d => d)
        .on("click", (_, d) => _switchActivity(d));

    _captionEl = d3.select("#safezone-caption");
    _updateCaption();
  }

  function _switchActivity(name) {
    if (!_densities[name]) return;
    _activity = name;

    d3.selectAll("#safezone-activity-selector .pill")
      .classed("active", d => d === name);

    const act      = _densities[name];
    const flatData = _flatten(act);

    _cells.data(flatData)
      .transition().duration(300)
        .attr("fill", d => colorScale(d.val));

    _updateCaption();
  }

  function _updateCaption() {
    const act     = _densities[_activity];
    const allVals = act.density.flat();
    const highPct = (allVals.filter(v => v > 0.35).length / allVals.length * 100).toFixed(0);
    _captionEl.html(
      `<strong>${_activity}</strong> — ${highPct}% of lens cells have elevated gaze density. ` +
      `<span style="color:#2ca02c">Green zones</span> are safe for AR overlays; ` +
      `<span style="color:#d62728">red zones</span> would obstruct natural gaze.`
    );
  }

  function _flatten(act) {
    const out = [];
    for (let xi = 0; xi < BINS; xi++) {
      for (let yi = 0; yi < BINS; yi++) {
        out.push({ xi, yi, val: act.density[xi][yi] });
      }
    }
    return out;
  }

  return { init };

})();

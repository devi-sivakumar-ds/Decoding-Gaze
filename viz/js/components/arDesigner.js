/**
 * arDesigner.js
 * Act 3 — AR Overlay Designer (V6)
 *
 * A draggable rectangle on the lens representing a UI overlay element.
 * Reads the density grid underneath and estimates the share of gaze-density
 * mass that overlaps the overlay.
 * Activity selector switches the background density.
 *
 * density[x_idx][y_idx] — shape [50][50], values 0–1.
 *
 * Public API:
 *   ArDesigner.init(densities)
 */

const ArDesigner = (() => {

  const { lens, ui, activityColors, activities, arOverlay, lensXRange, lensYRange } = CONFIG;
  const { xPx, yPx, xMm, yMm } = LensScales;

  const BINS   = 50;
  const CELL_W = lens.svgWidth  / BINS;
  const CELL_H = lens.svgHeight / BINS;

  const colorScale = d3.scaleLinear()
    .domain([0, 0.35, 1])
    .range(["#2ca02c", "#ffbb78", "#d62728"])
    .clamp(true);

  let _densities  = null;
  let _activity   = activities[0];

  // Overlay position/size in mm (physical lens coords)
  let _ox = arOverlay.defaultXMm;    // centre x
  let _oy = arOverlay.defaultYMm;    // centre y
  let _ow = arOverlay.defaultWidthMm;
  let _oh = arOverlay.defaultHeightMm;

  let _cells      = null;
  let _overlayRect = null;
  let _readoutEl  = null;
  let _svg        = null;
  let _lensGroup  = null;

  function init(densities) {
    _densities = densities;

    const { svg, lensGroup } = LensFrame.create(
      "#ar-lens-container", "ar", { padPx: 16, crosshair: true }
    );
    _svg       = svg;
    _lensGroup = lensGroup;

    // ── Background density heatmap (faint) ─────────────────────────────────
    const flatData = _flatten(_densities[_activity]);

    _cells = lensGroup.selectAll(".ar-cell")
      .data(flatData)
      .join("rect")
        .attr("class",   "ar-cell")
        .attr("x",       d => xPx(_densities[_activity].x_centers[d.xi]) - CELL_W / 2)
        .attr("y",       d => yPx(_densities[_activity].y_centers[d.yi]) - CELL_H / 2)
        .attr("width",   CELL_W)
        .attr("height",  CELL_H)
        .attr("fill",    d => colorScale(d.val))
        .attr("opacity", 0.45);

    // ── Draggable overlay rect ─────────────────────────────────────────────
    _overlayRect = lensGroup.append("rect")
      .attr("class",         "ar-overlay")
      .attr("rx",            3).attr("ry", 3)
      .attr("fill",          "rgba(255,255,255,0.15)")
      .attr("stroke",        "#ffffff")
      .attr("stroke-width",  2)
      .attr("cursor",        "move")
      .attr("pointer-events","all");

    _positionOverlay();

    // Drag behaviour
    const drag = d3.drag()
      .on("drag", function (event) {
        // Convert drag delta to mm
        const newCxMm = xMm(xPx(_ox) + event.dx);
        const newCyMm = yMm(yPx(_oy) + event.dy);
        // Clamp so overlay stays within lens
        _ox = Math.max(lensXRange[0] + _ow / 2,
               Math.min(lensXRange[1] - _ow / 2, newCxMm));
        _oy = Math.max(lensYRange[0] + _oh / 2,
               Math.min(lensYRange[1] - _oh / 2, newCyMm));
        _positionOverlay();
        _updateReadout();
      });

    _overlayRect.call(drag);

    // ── Activity pills ─────────────────────────────────────────────────────
    d3.select("#ar-activity-selector")
      .selectAll(".pill")
      .data(activities)
      .join("button")
        .attr("class", d => `pill${d === _activity ? " active" : ""}`)
        .style("color", d => activityColors[d])
        .text(d => d)
        .on("click", (_, d) => _switchActivity(d));

    _readoutEl = d3.select("#ar-collision-readout");
    _updateReadout();
  }

  function _switchActivity(name) {
    if (!_densities[name]) return;
    _activity = name;

    d3.selectAll("#ar-activity-selector .pill")
      .classed("active", d => d === name);

    const act      = _densities[name];
    const flatData = _flatten(act);

    _cells.data(flatData)
      .transition().duration(300)
        .attr("fill", d => colorScale(d.val));

    _updateReadout();
  }

  function _positionOverlay() {
    const svgX = xPx(_ox) - (_ow * 6) / 2;
    const svgY = yPx(_oy) - (_oh * 6) / 2;

    _overlayRect
      .attr("x",      svgX)
      .attr("y",      svgY)
      .attr("width",  _ow * 6)
      .attr("height", _oh * 6);
  }

  function _updateReadout() {
    const pct    = _computeCollision();
    const color  = pct < 5 ? "#2ca02c" : pct < 15 ? "#ffbb78" : "#d62728";
    const label  = pct < 5
      ? "Looks good here"
      : pct < 15
        ? "Careful: you may cover some gaze"
        : "Too busy: this sits in prime gaze space";
    const actCol = activityColors[_activity];

    _readoutEl.html(
      `<span class="collision-value" style="color:${color}">${pct.toFixed(1)}%</span>` +
      `estimated gaze-density overlap during ` +
      `<span style="color:${actCol};font-weight:600">${_activity}</span>` +
      `<br><span style="color:${color};font-size:11px">${label}</span>` +
      `<br><span style="color:#666;font-size:11px;margin-top:4px;display:block">` +
      `Overlay: ${_ow}×${_oh} mm at (${_ox.toFixed(1)}, ${_oy.toFixed(1)}) mm</span>`
    );
  }

  function _computeCollision() {
    const act = _densities[_activity];
    const xc  = act.x_centers;
    const yc  = act.y_centers;

    // Overlay bounds in mm
    const x0 = _ox - _ow / 2;
    const x1 = _ox + _ow / 2;
    const y0 = _oy - _oh / 2;
    const y1 = _oy + _oh / 2;

    let overlapDensity = 0;
    let totalDensity   = 0;

    for (let xi = 0; xi < BINS; xi++) {
      for (let yi = 0; yi < BINS; yi++) {
        const val = act.density[xi][yi];
        totalDensity += val;
        if (xc[xi] >= x0 && xc[xi] <= x1 && yc[yi] >= y0 && yc[yi] <= y1) {
          overlapDensity += val;
        }
      }
    }

    if (totalDensity === 0) return 0;
    // Estimated overlap = share of the smoothed density mass under the overlay.
    return (overlapDensity / totalDensity) * 100;
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

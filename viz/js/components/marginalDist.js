/**
 * marginalDist.js
 * Act 2 — Vertical Gaze Distribution (V4)
 *
 * Rotated KDE density plot. Y axis = lens vertical position in mm.
 * Each activity is a separate density curve extending rightward.
 * Computed in-browser via Gaussian KDE.
 *
 * Public API:
 *   MarginalDist.init(sessions, onSelect)   — onSelect(activity|null) called on click
 *   MarginalDist.highlight(activity)        — emphasise one curve, dim others
 *   MarginalDist.clear()                    — restore all curves
 */

const MarginalDist = (() => {

  const { activityColors, activities, lensYRange, ui } = CONFIG;

  let _areas      = new Map();   // activity → area path selection
  let _lines      = new Map();   // activity → line path selection
  let _legendTexts = new Map();  // activity → text selection

  function init(sessions, onSelect) {
    const W      = 680;
    const H      = 300;
    const margin = { top: 20, right: 160, bottom: 44, left: 60 };
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top  - margin.bottom;

    // Y scale: lens position -15..+15mm, top of chart = +15 (up on lens)
    const yScale = d3.scaleLinear()
      .domain([lensYRange[0], lensYRange[1]])   // -15 → +15
      .range([innerH, 0]);                       // bottom → top (flipped)

    // KDE evaluation grid along Y
    const N_PTS  = 200;
    const yMin   = lensYRange[0];
    const yMax   = lensYRange[1];
    const evalPts = d3.range(N_PTS).map(i => yMin + (yMax - yMin) * i / (N_PTS - 1));

    // Gaussian KDE: returns array of {y, density} for given values
    function kde(values, bw) {
      const n = values.length;
      return evalPts.map(x => {
        let sum = 0;
        for (let i = 0; i < n; i++) {
          const z = (x - values[i]) / bw;
          sum += Math.exp(-0.5 * z * z);
        }
        return { y: x, density: sum / (n * bw * Math.sqrt(2 * Math.PI)) };
      });
    }

    // Per-activity KDE (bandwidth 0.9mm — ~1 session std dev)
    const actKdes = activities.map(act => {
      const vals = sessions.filter(d => d.activity === act).map(d => d.cy_mm);
      return { activity: act, points: kde(vals, 0.9) };
    });

    const maxDensity = d3.max(actKdes, ak => d3.max(ak.points, p => p.density));

    const xScale = d3.scaleLinear()
      .domain([0, maxDensity])
      .range([0, innerW]);

    const svg = d3.select("#marginal-container")
      .append("svg")
        .attr("width",  W)
        .attr("height", H)
        .style("background", ui.background);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // ── Gridlines ─────────────────────────────────────────────────────────
    g.append("g")
      .attr("class", "grid")
      .call(
        d3.axisLeft(yScale).ticks(6)
          .tickSize(-innerW).tickFormat("")
      )
      .call(ax => ax.select(".domain").remove())
      .call(ax => ax.selectAll("line")
        .attr("stroke", "#2a2a2a")
        .attr("stroke-dasharray", "3,3"));

    // ── Y axis ────────────────────────────────────────────────────────────
    g.append("g")
      .attr("class", "axis")
      .call(d3.axisLeft(yScale).ticks(6).tickFormat(d => `${d} mm`))
      .call(ax => ax.select(".domain").remove());

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerH / 2).attr("y", -48)
      .attr("text-anchor", "middle")
      .attr("fill", "#888").attr("font-size", "11px")
      .text("Lens position — Y (mm)");

    // ── X axis ────────────────────────────────────────────────────────────
    g.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(4).tickFormat(d3.format(".2f")))
      .call(ax => ax.select(".domain").remove());

    g.append("text")
      .attr("x", innerW / 2).attr("y", innerH + 36)
      .attr("text-anchor", "middle")
      .attr("fill", "#888").attr("font-size", "11px")
      .text("Density");

    // ── Lens-centre reference line (y=0) ──────────────────────────────────
    g.append("line")
      .attr("x1", 0).attr("x2", innerW)
      .attr("y1", yScale(0)).attr("y2", yScale(0))
      .attr("stroke", "#00bcd4").attr("stroke-width", 0.75)
      .attr("stroke-dasharray", "4,3").attr("opacity", 0.4);

    g.append("text")
      .attr("x", innerW + 4).attr("y", yScale(0))
      .attr("dy", "0.35em")
      .attr("fill", "#00bcd4").attr("font-size", "9px")
      .text("centre");

    // ── KDE curves ────────────────────────────────────────────────────────
    const area = d3.area()
      .x0(0)
      .x1(d => xScale(d.density))
      .y(d => yScale(d.y))
      .curve(d3.curveBasis);

    const line = d3.line()
      .x(d => xScale(d.density))
      .y(d => yScale(d.y))
      .curve(d3.curveBasis);

    actKdes.forEach(({ activity, points }) => {
      const color = activityColors[activity];

      // Filled area
      const areaPath = g.append("path")
        .datum(points)
        .attr("class",   `md-area md-area-${activity.replace(/\s/g, "_")}`)
        .attr("fill",    color)
        .attr("opacity", 0.07)
        .attr("cursor",  "pointer")
        .attr("d",       area)
        .on("click", () => { if (onSelect) onSelect(activity); });
      _areas.set(activity, areaPath);

      // Stroke line
      const linePath = g.append("path")
        .datum(points)
        .attr("class",        `md-line md-line-${activity.replace(/\s/g, "_")}`)
        .attr("fill",         "none")
        .attr("stroke",       color)
        .attr("stroke-width", 1.5)
        .attr("opacity",      0.75)
        .attr("cursor",       "pointer")
        .attr("d",            line)
        .on("mouseover", (event) => {
          Tooltip.show(event, Tooltip.fmt.activity(activity));
        })
        .on("mousemove", Tooltip.move)
        .on("mouseout",  Tooltip.hide)
        .on("click", () => { if (onSelect) onSelect(activity); });
      _lines.set(activity, linePath);
    });

    // ── Legend (right margin) ─────────────────────────────────────────────
    // Place legend labels at each activity's median y position, spread if needed
    const medianYs = activities.map(act => {
      const vals = sessions.filter(d => d.activity === act).map(d => d.cy_mm);
      return { activity: act, median: d3.median(vals) };
    });

    // Spread labels so they don't overlap
    const rawLegendYs = medianYs.map(d => yScale(d.median));
    const spreadYs    = _spreadY(rawLegendYs, 14, 0, innerH);

    const legX = innerW + 8;

    medianYs.forEach((d, i) => {
      const color = activityColors[d.activity];
      const ly    = spreadYs[i];

      // Leader tick
      g.append("line")
        .attr("x1", innerW).attr("y1", yScale(d.median))
        .attr("x2", legX + 2).attr("y2", ly)
        .attr("stroke", color).attr("stroke-width", 0.6).attr("opacity", 0.5);

      const labelEl = g.append("text")
        .attr("x", legX + 4).attr("y", ly)
        .attr("dy", "0.35em")
        .attr("fill", color)
        .attr("font-size", "10px")
        .attr("cursor", "pointer")
        .attr("data-activity", d.activity)
        .text(d.activity)
        .on("click", () => { if (onSelect) onSelect(d.activity); });
      _legendTexts.set(d.activity, labelEl);
    });
  }

  // ── Public: highlight / clear ─────────────────────────────────────────────

  function highlight(activity) {
    activities.forEach(act => {
      const isSelected = act === activity;
      _lines.get(act)?.transition().duration(200)
        .attr("stroke-width", isSelected ? 3 : 1)
        .attr("opacity",      isSelected ? 1 : 0.1);
      _areas.get(act)?.transition().duration(200)
        .attr("opacity", isSelected ? 0.2 : 0.02);
      _legendTexts.get(act)?.transition().duration(200)
        .attr("opacity",     isSelected ? 1 : 0.2)
        .attr("font-weight", isSelected ? "700" : "400");
    });
  }

  function clear() {
    activities.forEach(act => {
      _lines.get(act)?.transition().duration(200)
        .attr("stroke-width", 1.5)
        .attr("opacity",      0.75);
      _areas.get(act)?.transition().duration(200)
        .attr("opacity", 0.07);
      _legendTexts.get(act)?.transition().duration(200)
        .attr("opacity",     1)
        .attr("font-weight", "400");
    });
  }

  // Simple iterative force-spread (same logic as centroidMap)
  function _spreadY(ys, minGap, yMin, yMax) {
    const idx = d3.range(ys.length).sort((a, b) => ys[a] - ys[b]);
    const pos  = idx.map(i => ys[i]);
    const n    = pos.length;
    for (let iter = 0; iter < 300; iter++) {
      let moved = false;
      for (let i = 0; i < n - 1; i++) {
        if (pos[i + 1] - pos[i] < minGap) {
          const mid  = (pos[i] + pos[i + 1]) / 2;
          pos[i]     = mid - minGap / 2;
          pos[i + 1] = mid + minGap / 2;
          moved = true;
        }
      }
      if (pos[0] < yMin)   { const s = yMin - pos[0];   pos.forEach((_, j) => { pos[j] += s; }); }
      if (pos[n-1] > yMax) { const s = pos[n-1] - yMax; pos.forEach((_, j) => { pos[j] -= s; }); }
      if (!moved) break;
    }
    const result = new Array(ys.length);
    idx.forEach((origI, sortedI) => { result[origI] = pos[sortedI]; });
    return result;
  }

  return { init, highlight, clear };

})();

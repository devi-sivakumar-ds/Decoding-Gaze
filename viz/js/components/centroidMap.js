/**
 * centroidMap.js
 * Act 2 — Activity Centroid Map (V2)
 *
 * One dot per activity showing where the mean gaze centroid falls on the lens.
 * ±1σ ellipses show spread across sessions.
 * Labels are force-spread to the right of the lens with leader lines.
 *
 * Public API:
 *   CentroidMap.init(centroids, onSelect)   — onSelect(activity|null) called on click
 *   CentroidMap.highlight(activity)         — dim all others, emphasise this one
 *   CentroidMap.clear()                     — restore all to default state
 */

const CentroidMap = (() => {

  const { lens, ui, activityColors, activities } = CONFIG;
  const { xPx, yPx } = LensScales;

  let _dots    = null;
  let _ellipses = null;
  let _labelTexts = null;

  function init(centroids, onSelect) {
    const padPx  = 16;
    const labelW = 160;

    const { svg, lensGroup, svgW, svgH } = LensFrame.create(
      "#centroid-lens-container", "centroid", { padPx, crosshair: true }
    );

    svg
      .attr("width", svgW + labelW)
      .attr("viewBox", `0 0 ${svgW + labelW} ${svgH}`)
      .attr("preserveAspectRatio", "xMinYMin meet");

    const sorted = activities
      .map(a => centroids.find(c => c.activity === a))
      .filter(Boolean);

    // ── 1σ ellipses ────────────────────────────────────────────────────────
    _ellipses = lensGroup.selectAll(".cm-ellipse")
      .data(sorted)
      .join("ellipse")
        .attr("class",   "cm-ellipse")
        .attr("cx",      d => xPx(d.cx_mm))
        .attr("cy",      d => yPx(d.cy_mm))
        .attr("rx",      d => d.sx_mm * 6)
        .attr("ry",      d => d.sy_mm * 6)
        .attr("fill",    d => activityColors[d.activity])
        .attr("opacity", 0.18)
        .attr("stroke",  "none");

    // ── Centroid dots ──────────────────────────────────────────────────────
    _dots = lensGroup.selectAll(".cm-dot")
      .data(sorted)
      .join("circle")
        .attr("class",        "cm-dot")
        .attr("cx",           d => xPx(d.cx_mm))
        .attr("cy",           d => yPx(d.cy_mm))
        .attr("r",            6)
        .attr("fill",         d => activityColors[d.activity])
        .attr("stroke",       ui.background)
        .attr("stroke-width", 1.5)
        .attr("cursor",       "pointer")
        .on("mouseover", (event, d) => {
          Tooltip.show(event,
            `${Tooltip.fmt.activity(d.activity)}<br>` +
            `${Tooltip.fmt.row("Centroid Y", Tooltip.fmt.mm(d.cy_mm))}<br>` +
            `${Tooltip.fmt.row("Spread ±1σ", Tooltip.fmt.mm(d.sy_mm))}<br>` +
            `${Tooltip.fmt.row("Sessions",   Tooltip.fmt.int(d.n))}`
          );
        })
        .on("mousemove", Tooltip.move)
        .on("mouseout",  Tooltip.hide)
        .on("click", (event, d) => {
          if (onSelect) onSelect(d.activity);
        });

    // ── Labels with leader lines ───────────────────────────────────────────
    const lensRightX  = padPx + lens.svgWidth;
    const labelStartX = lensRightX + 14;

    const dotRootYs = sorted.map(d => padPx + yPx(d.cy_mm));
    const spread     = _spreadY(dotRootYs, 15, padPx, padPx + lens.svgHeight);

    const labelG = svg.append("g").attr("class", "cm-labels");
    _labelTexts  = [];

    sorted.forEach((d, i) => {
      const dotRootY = dotRootYs[i];
      const labelY   = spread[i];
      const color    = activityColors[d.activity];

      labelG.append("line")
        .attr("class", `cm-leader cm-leader-${d.activity.replace(/\s/g, "_")}`)
        .attr("x1", lensRightX)    .attr("y1", dotRootY)
        .attr("x2", labelStartX - 3).attr("y2", labelY)
        .attr("stroke", color).attr("stroke-width", 0.75).attr("opacity", 0.55);

      labelG.append("circle")
        .attr("class", `cm-leader cm-leader-${d.activity.replace(/\s/g, "_")}`)
        .attr("cx", labelStartX - 3).attr("cy", labelY)
        .attr("r", 2).attr("fill", color).attr("opacity", 0.7);

      _labelTexts.push(
        labelG.append("text")
          .attr("class", `cm-label cm-label-${d.activity.replace(/\s/g, "_")}`)
          .attr("x", labelStartX + 2).attr("y", labelY).attr("dy", "0.35em")
          .attr("fill", color).attr("font-size", "11px").attr("font-weight", "500")
          .attr("cursor", "pointer")
          .attr("data-activity", d.activity)
          .text(`${d.activity}  ${d.cy_mm.toFixed(1)} mm`)
          .on("mouseover", (event) => {
            Tooltip.show(event, Tooltip.fmt.activity(d.activity));
          })
          .on("mousemove", Tooltip.move)
          .on("mouseout", Tooltip.hide)
          .on("click", (event) => {
            event.stopPropagation();
            if (onSelect) onSelect(d.activity);
          })
      );
    });

    _addYRuler(svg, padPx);
  }

  // ── Public: highlight / clear ─────────────────────────────────────────────

  function highlight(activity) {
    _dots.transition().duration(200)
      .attr("r",            d => d.activity === activity ? 9 : 5)
      .attr("stroke",       d => d.activity === activity ? "#ffffff" : ui.background)
      .attr("stroke-width", d => d.activity === activity ? 2.5 : 1.5)
      .attr("opacity",      d => d.activity === activity ? 1 : 0.2);

    _ellipses.transition().duration(200)
      .attr("opacity", d => d.activity === activity ? 0.35 : 0.04);

    _labelTexts.forEach(t => {
      const act = t.attr("data-activity");
      t.transition().duration(200)
        .attr("opacity", act === activity ? 1 : 0.2)
        .attr("font-weight", act === activity ? "700" : "500");
    });
  }

  function clear() {
    _dots.transition().duration(200)
      .attr("r",            6)
      .attr("stroke",       ui.background)
      .attr("stroke-width", 1.5)
      .attr("opacity",      1);

    _ellipses.transition().duration(200)
      .attr("opacity", 0.18);

    _labelTexts.forEach(t => {
      t.transition().duration(200)
        .attr("opacity", 1)
        .attr("font-weight", "500");
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

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

  function _addYRuler(svg, padPx) {
    const rulerX = padPx - 6;
    const ticks  = [-15, -10, -5, 0, 5, 10, 15];
    const rulerG = svg.append("g").attr("class", "cm-ruler");

    ticks.forEach(mm => {
      const py = padPx + yPx(mm);
      rulerG.append("line")
        .attr("x1", rulerX).attr("y1", py)
        .attr("x2", rulerX + 4).attr("y2", py)
        .attr("stroke", "#555").attr("stroke-width", 0.75);
      rulerG.append("text")
        .attr("x", rulerX - 2).attr("y", py).attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .attr("fill", "#666").attr("font-size", "9px")
        .text(`${mm}`);
    });

    rulerG.append("text")
      .attr("transform", `translate(${padPx + 18}, ${padPx + lens.svgHeight / 2}) rotate(-90)`)
      .attr("text-anchor", "middle")
      .attr("fill", "#aaa").attr("font-size", "10px").attr("font-weight", "600")
      .text("Lens Y (mm)");
  }

  return { init, highlight, clear };

})();

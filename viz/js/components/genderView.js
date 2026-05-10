/**
 * genderView.js
 * Act 3 — Gender Parallel View (V7)
 *
 * Two lens frames side by side: Female (left) | Male (right).
 * Centroid dots + 1σ ellipses per activity, same tab10 colours.
 * Clicking a dot draws the connecting line and propagates to linked views.
 *
 * Public API:
 *   GenderView.init(genderData, onSelect)   — onSelect(activity|null) called on click
 *   GenderView.highlight(activity)          — emphasise one activity, draw connector
 *   GenderView.clear()                      — restore all, remove connector
 */

const GenderView = (() => {

  const { lens, ui, activityColors, activities, genderColors } = CONFIG;
  const { xPx, yPx } = LensScales;

  let _data        = {};
  let _svg         = null;
  let _leftOffsetX = 0;
  let _rightOffsetX = 0;
  let _lensOffsetY  = 0;
  let _allDots     = null;
  let _allEllipses = null;

  function init(genderData, onSelect) {
    genderData.forEach(d => { _data[`${d.activity}|${d.gender}`] = d; });

    const pair = LensFrame.createPair(
      "#gender-container", "gender",
      { gapPx: 60, padPx: 16,
        leftLabel:  `Female (n=${_nTotal("Female")})`,
        rightLabel: `Male (n=${_nTotal("Male")})` }
    );

    const { svg, leftGroup, rightGroup,
            leftOffsetX, rightOffsetX, lensOffsetY } = pair;

    _svg          = svg;
    _leftOffsetX  = leftOffsetX;
    _rightOffsetX = rightOffsetX;
    _lensOffsetY  = lensOffsetY;

    // ── Ellipses ──────────────────────────────────────────────────────────
    const ellipseSelections = [];
    ["Female", "Male"].forEach(gender => {
      const grp     = gender === "Female" ? leftGroup : rightGroup;
      const actData = activities.map(a => _data[`${a}|${gender}`]).filter(Boolean);

      ellipseSelections.push(
        grp.selectAll(`.gv-ellipse-${gender}`)
          .data(actData)
          .join("ellipse")
            .attr("class",   `gv-ellipse gv-ellipse-${gender}`)
            .attr("cx",      d => xPx(d.cx_mm))
            .attr("cy",      d => yPx(d.cy_mm))
            .attr("rx",      d => d.sx_mm * 6)
            .attr("ry",      d => d.sy_mm * 6)
            .attr("fill",    d => activityColors[d.activity])
            .attr("opacity", 0.15)
      );
    });
    // Merge both gender ellipse selections for bulk transitions
    _allEllipses = ellipseSelections;

    // ── Centroid dots ─────────────────────────────────────────────────────
    const dotSelections = [];
    ["Female", "Male"].forEach(gender => {
      const grp     = gender === "Female" ? leftGroup : rightGroup;
      const actData = activities.map(a => _data[`${a}|${gender}`]).filter(Boolean);

      dotSelections.push(
        grp.selectAll(`.gv-dot-${gender}`)
          .data(actData)
          .join("circle")
            .attr("class",        `gv-dot gv-dot-${gender}`)
            .attr("cx",           d => xPx(d.cx_mm))
            .attr("cy",           d => yPx(d.cy_mm))
            .attr("r",            5)
            .attr("fill",         d => activityColors[d.activity])
            .attr("stroke",       ui.background)
            .attr("stroke-width", 1.5)
            .attr("cursor",       "pointer")
            .on("mouseover", (event, d) => {
              Tooltip.show(event,
                `${Tooltip.fmt.activity(d.activity)} — ${gender}<br>` +
                `${Tooltip.fmt.row("Centroid Y", Tooltip.fmt.mm(d.cy_mm))}<br>` +
                `${Tooltip.fmt.row("Sessions", Tooltip.fmt.int(d.n))}`
              );
            })
            .on("mousemove", Tooltip.move)
            .on("mouseout",  Tooltip.hide)
            .on("click", (event, d) => {
              if (onSelect) onSelect(d.activity);
            })
      );
    });
    _allDots = dotSelections;

    // ── Gender labels ─────────────────────────────────────────────────────
    [
      { grp: leftGroup,  label: "Female", color: genderColors["Female"] },
      { grp: rightGroup, label: "Male",   color: genderColors["Male"]   },
    ].forEach(({ grp, label, color }) => {
      grp.append("text")
        .attr("x", xPx(0)).attr("y", yPx(13))
        .attr("text-anchor", "middle")
        .attr("fill", color).attr("font-size", "10px")
        .attr("font-weight", "600").attr("opacity", 0.7)
        .text(label);
    });
  }

  // ── Public: highlight / clear ─────────────────────────────────────────────

  function highlight(activity) {
    _allDots.forEach(sel => {
      sel.transition().duration(200)
        .attr("r",       d => d.activity === activity ? 8 : 4)
        .attr("opacity", d => d.activity === activity ? 1 : 0.15);
    });
    _allEllipses.forEach(sel => {
      sel.transition().duration(200)
        .attr("opacity", d => d.activity === activity ? 0.3 : 0.04);
    });
    _drawConnectors(activity);
  }

  function clear() {
    _allDots.forEach(sel => {
      sel.transition().duration(200)
        .attr("r", 5).attr("opacity", 1);
    });
    _allEllipses.forEach(sel => {
      sel.transition().duration(200).attr("opacity", 0.15);
    });
    _svg.selectAll(".gv-connector").remove();
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  function _drawConnectors(activity) {
    _svg.selectAll(".gv-connector").remove();

    const f = _data[`${activity}|Female`];
    const m = _data[`${activity}|Male`];
    if (!f || !m) return;

    const fy = _lensOffsetY + yPx(f.cy_mm);
    const my = _lensOffsetY + yPx(m.cy_mm);
    const fx = _leftOffsetX  + lens.svgWidth;
    const mx = _rightOffsetX;

    _svg.append("line")
      .attr("class", "gv-connector")
      .attr("x1", fx).attr("y1", fy)
      .attr("x2", mx).attr("y2", my)
      .attr("stroke", activityColors[activity])
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4,3")
      .attr("opacity", 0.7)
      .attr("pointer-events", "none");

    const dy = (f.cy_mm - m.cy_mm).toFixed(1);
    _svg.append("text")
      .attr("class", "gv-connector")
      .attr("x", (fx + mx) / 2)
      .attr("y", (fy + my) / 2 - 6)
      .attr("text-anchor", "middle")
      .attr("fill", activityColors[activity])
      .attr("font-size", "10px")
      .text(`Δ${dy} mm`);
  }

  function _nTotal(gender) {
    return activities.reduce((sum, a) => {
      const d = _data[`${a}|${gender}`];
      return sum + (d ? d.n : 0);
    }, 0);
  }

  return { init, highlight, clear };

})();

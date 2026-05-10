/**
 * stripChart.js
 * Act 2 — All Sessions Strip Chart (V3)
 *
 * Each dot = one session. Activities on X axis (sorted downward-first).
 * Centroid Y on Y axis. IQR box + median line per activity.
 * Toggle to colour by gender instead of activity.
 *
 * Public API:
 *   StripChart.init(sessions)
 */

const StripChart = (() => {

  const { activityColors, genderColors, activities, ui } = CONFIG;

  let _dots      = null;
  let _colorMode = "activity";
  let _legendWrap = null;

  function init(sessions) {
    const W      = 760;
    const H      = 370;
    const margin = { top: 12, right: 78, bottom: 96, left: 58 };
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top  - margin.bottom;

    // Activities ordered downward-first (CONFIG order)
    const actOrder = activities;

    // Compute per-activity statistics
    const stats = new Map();
    actOrder.forEach(act => {
      const vals = sessions
        .filter(d => d.activity === act)
        .map(d => d.cy_mm)
        .sort(d3.ascending);
      if (vals.length === 0) return;
      stats.set(act, {
        median: d3.median(vals),
        q25:    d3.quantile(vals, 0.25),
        q75:    d3.quantile(vals, 0.75),
      });
    });

    const xScale = d3.scaleBand()
      .domain(actOrder)
      .range([0, innerW])
      .padding(0.25);

    const yExtent = d3.extent(sessions, d => d.cy_mm);
    const yScale  = d3.scaleLinear()
      .domain([Math.min(yExtent[0] - 0.5, -16), Math.max(yExtent[1] + 0.5, 1)])
      .range([innerH, 0])
      .nice();

    const bw = xScale.bandwidth();

    const container = d3.select("#strip-chart-container");
    container.selectAll("*").remove();

    const svg = container
      .append("svg")
        .attr("width",  W)
        .attr("height", H)
        .attr("viewBox", `0 0 ${W} ${H}`)
        .attr("preserveAspectRatio", "xMinYMin meet")
        .style("background", ui.background);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // ── Gridlines ─────────────────────────────────────────────────────────
    g.append("g")
      .attr("class", "grid")
      .call(
        d3.axisLeft(yScale).ticks(6)
          .tickSize(-innerW)
          .tickFormat("")
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
      .attr("x", -innerH / 2).attr("y", -46)
      .attr("text-anchor", "middle")
      .attr("fill", "#888").attr("font-size", "11px")
      .text("Centroid Y on lens (mm)");

    // ── X axis ────────────────────────────────────────────────────────────
    g.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).tickSize(0))
      .call(ax => ax.select(".domain").attr("stroke", "#444"))
      .selectAll("text")
        .attr("dy", "1.1em")
        .attr("transform", "rotate(-30)")
        .style("text-anchor", "end")
        .attr("fill", "#aaa")
        .attr("font-size", "11px");

    g.append("text")
      .attr("x", innerW / 2).attr("y", innerH + 78)
      .attr("text-anchor", "middle")
      .attr("fill", "#666").attr("font-size", "10px")
      .text("Activity, ordered from lower average gaze to higher average gaze");

    // ── IQR boxes ─────────────────────────────────────────────────────────
    actOrder.forEach(act => {
      const s = stats.get(act);
      if (!s) return;
      const cx = xScale(act) + bw / 2;
      g.append("rect")
        .attr("x",      cx - 5)
        .attr("y",      yScale(s.q75))
        .attr("width",  10)
        .attr("height", yScale(s.q25) - yScale(s.q75))
        .attr("fill",   activityColors[act])
        .attr("opacity", 0.2);
    });

    // ── Median lines ──────────────────────────────────────────────────────
    actOrder.forEach(act => {
      const s = stats.get(act);
      if (!s) return;
      const cx = xScale(act) + bw / 2;
      g.append("line")
        .attr("x1", cx - bw * 0.28).attr("x2", cx + bw * 0.28)
        .attr("y1", yScale(s.median)).attr("y2", yScale(s.median))
        .attr("stroke",       activityColors[act])
        .attr("stroke-width", 2.5);
    });

    // ── Session dots ──────────────────────────────────────────────────────
    _dots = g.selectAll(".sc-dot")
      .data(sessions)
      .join("circle")
        .attr("class", "sc-dot")
        .attr("cx", d => xScale(d.activity) + bw / 2 + d.jitter * bw * 0.9)
        .attr("cy", d => yScale(d.cy_mm))
        .attr("r",  2.5)
        .attr("fill",    d => activityColors[d.activity])
        .attr("opacity", 0.55)
        .attr("stroke",  "none")
        .on("mouseover", (event, d) => {
          Tooltip.show(event,
            `${Tooltip.fmt.activity(d.activity)}<br>` +
            `${Tooltip.fmt.row("Centroid Y",  Tooltip.fmt.mm(d.cy_mm))}<br>` +
            `${Tooltip.fmt.row("Participant", d.participant.replace(/_/g, " "))}<br>` +
            `${Tooltip.fmt.row("Gender",      d.gender)}`
          );
        })
        .on("mousemove", Tooltip.move)
        .on("mouseout",  Tooltip.hide);

    // ── Gender toggle ─────────────────────────────────────────────────────
    d3.select("#strip-gender-toggle").on("change", function () {
      _colorMode = this.checked ? "gender" : "activity";
      _dots.transition().duration(250)
        .attr("fill", d =>
          _colorMode === "gender"
            ? (genderColors[d.gender] ?? "#888")
            : activityColors[d.activity]
        );
      _renderLegend();
    });

    _legendWrap = container.append("div")
      .attr("class", "strip-legends")
      .attr("aria-live", "polite")
      .attr("aria-label", "Strip chart color legend");
    _renderLegend();
  }

  function _renderLegend() {
    if (!_legendWrap) return;
    _legendWrap.selectAll("*").remove();

    if (_colorMode === "gender") {
      _legendGroup(_legendWrap, "Gender", Object.entries(genderColors).map(([label, color]) => ({
        label,
        color,
      })));
    } else {
      _legendGroup(_legendWrap, "Activities", activities.map(activity => ({
        label: activity,
        color: activityColors[activity],
      })));
    }
  }

  function _legendGroup(parent, title, items) {
    const group = parent.append("div")
      .attr("class", "chart-legend");

    group.append("div")
      .attr("class", "chart-legend-title")
      .text(title);

    const itemWrap = group.append("div")
      .attr("class", "chart-legend-items");

    const item = itemWrap.selectAll(".chart-legend-item")
      .data(items)
      .join("span")
        .attr("class", "chart-legend-item");

    item.append("span")
      .attr("class", "chart-legend-swatch")
      .style("background", d => d.color);

    item.append("span")
      .text(d => d.label);
  }

  return { init };

})();

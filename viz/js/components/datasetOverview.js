/**
 * datasetOverview.js
 * The Dataset section — sits between Act 1 and Act 2.
 *
 * Renders three D3 charts:
 *   1. Gender distribution (horizontal bars)
 *   2. Age group distribution (horizontal bars)
 *   3. Sessions per activity — stacked Female / Male (horizontal bars)
 *
 * Also wires tooltip popups for .def-term spans in the section prose.
 *
 * Public API:
 *   DatasetOverview.init(data)
 */

const DatasetOverview = (() => {

  const { genderColors, ui } = CONFIG;

  // ── Public ──────────────────────────────────────────────────────────────

  function init(data) {
    console.log("DatasetOverview.init", data);
    _wireTermTooltips();
    _drawDemo(data.gender, data.ageGroup);
    _drawActivities(data.activities);
  }

  // ── Glossary term tooltips ───────────────────────────────────────────────

  function _wireTermTooltips() {
    d3.selectAll(".def-term")
      .on("mouseover", (event) => {
        const def = event.currentTarget.dataset.def;
        if (def) Tooltip.show(event, def);
      })
      .on("mousemove", Tooltip.move)
      .on("mouseout",  Tooltip.hide);
  }

  // ── Left panel: gender + age ─────────────────────────────────────────────

  function _drawDemo(genderData, ageData) {
    const W      = 340;
    const mLeft  = 72;
    const mRight = 56;
    const innerW = W - mLeft - mRight;

    // ── Gender ──────────────────────────────────────────────────────────
    const gInnerH = 52;
    const gH      = gInnerH + 32;   // +32 for title + top pad

    const gY = d3.scaleBand()
      .domain(genderData.map(d => d.label))
      .range([0, gInnerH]).padding(0.30);

    const gX = d3.scaleLinear()
      .domain([0, d3.max(genderData, d => d.participants) * 1.12])
      .range([0, innerW]);

    const gSvg = d3.select("#dataset-gender-container")
      .append("svg").attr("width", W).attr("height", gH)
      .style("background", "transparent");

    const gG = gSvg.append("g").attr("transform", `translate(${mLeft},26)`);

    _sectionLabel(gG, "GENDER");

    gG.selectAll(".gb")
      .data(genderData).join("rect").attr("class", "gb")
      .attr("x", 0).attr("y", d => gY(d.label))
      .attr("width", d => gX(d.participants)).attr("height", gY.bandwidth())
      .attr("fill", d => genderColors[d.label]).attr("rx", 2)
      .on("mouseover", (event, d) => {
        Tooltip.show(event,
          `${d.label}<br>${Tooltip.fmt.row("Participants", Tooltip.fmt.int(d.participants))}`
        );
      })
      .on("mousemove", Tooltip.move).on("mouseout", Tooltip.hide);

    gG.selectAll(".gl")
      .data(genderData).join("text").attr("class", "gl")
      .attr("x", -6).attr("y", d => gY(d.label) + gY.bandwidth() / 2)
      .attr("dy", "0.35em").attr("text-anchor", "end")
      .attr("fill", d => genderColors[d.label]).attr("font-size", "11px")
      .text(d => d.label);

    gG.selectAll(".gv")
      .data(genderData).join("text").attr("class", "gv")
      .attr("x", d => gX(d.participants) + 4)
      .attr("y", d => gY(d.label) + gY.bandwidth() / 2)
      .attr("dy", "0.35em").attr("fill", "#aaa").attr("font-size", "11px")
      .text(d => d.participants);

    // ── Age group ────────────────────────────────────────────────────────
    const aInnerH = 130;
    const aH      = aInnerH + 36;

    const aY = d3.scaleBand()
      .domain(ageData.map(d => d.label))
      .range([0, aInnerH]).padding(0.22);

    const aX = d3.scaleLinear()
      .domain([0, d3.max(ageData, d => d.participants) * 1.12])
      .range([0, innerW]);

    const aSvg = d3.select("#dataset-age-container")
      .append("svg").attr("width", W).attr("height", aH)
      .style("background", "transparent");

    const aG = aSvg.append("g").attr("transform", `translate(${mLeft},28)`);

    _sectionLabel(aG, "AGE GROUP");

    aG.selectAll(".ab")
      .data(ageData).join("rect").attr("class", "ab")
      .attr("x", 0).attr("y", d => aY(d.label))
      .attr("width", d => aX(d.participants)).attr("height", aY.bandwidth())
      .attr("fill", "#76b7b2").attr("opacity", 0.75).attr("rx", 2)
      .on("mouseover", (event, d) => {
        Tooltip.show(event,
          `Age ${d.label}<br>${Tooltip.fmt.row("Participants", Tooltip.fmt.int(d.participants))}`
        );
      })
      .on("mousemove", Tooltip.move).on("mouseout", Tooltip.hide);

    aG.selectAll(".al")
      .data(ageData).join("text").attr("class", "al")
      .attr("x", -6).attr("y", d => aY(d.label) + aY.bandwidth() / 2)
      .attr("dy", "0.35em").attr("text-anchor", "end")
      .attr("fill", "#aaa").attr("font-size", "11px")
      .text(d => d.label);

    aG.selectAll(".av")
      .data(ageData).join("text").attr("class", "av")
      .attr("x", d => aX(d.participants) + 4)
      .attr("y", d => aY(d.label) + aY.bandwidth() / 2)
      .attr("dy", "0.35em").attr("fill", "#aaa").attr("font-size", "11px")
      .text(d => d.participants);
  }

  // ── Right panel: sessions by activity (stacked female / male) ────────────

  function _drawActivities(actData) {
    const sorted = [...actData].sort((a, b) => b.sessions - a.sessions);

    const W       = 400;
    const H       = 290;
    const mLeft   = 108;
    const mRight  = 80;
    const mTop    = 28;
    const mBottom = 32;
    const innerW  = W - mLeft - mRight;
    const innerH  = H - mTop  - mBottom;

    const yScale = d3.scaleBand()
      .domain(sorted.map(d => d.activity))
      .range([0, innerH]).padding(0.22);

    const xScale = d3.scaleLinear()
      .domain([0, d3.max(sorted, d => d.sessions) * 1.08])
      .range([0, innerW]);

    const stack    = d3.stack().keys(["female", "male"]);
    const stacked  = stack(sorted);
    const barColor = { female: genderColors["Female"], male: genderColors["Male"] };

    const svg = d3.select("#dataset-activities-container")
      .append("svg").attr("width", W).attr("height", H)
      .style("background", "transparent");

    const g = svg.append("g").attr("transform", `translate(${mLeft},${mTop})`);

    _sectionLabel(g, "SESSIONS BY ACTIVITY");

    // Stacked bars
    stacked.forEach(layer => {
      g.selectAll(`.ab-${layer.key}`)
        .data(layer).join("rect")
        .attr("class", `ab-${layer.key}`)
        .attr("x",      d => xScale(d[0]))
        .attr("y",      d => yScale(d.data.activity))
        .attr("width",  d => Math.max(0, xScale(d[1]) - xScale(d[0])))
        .attr("height", yScale.bandwidth())
        .attr("fill",   barColor[layer.key])
        .attr("rx",     layer.key === "male" ? 2 : 0)
        .on("mouseover", (event, d) => {
          const label = layer.key === "female" ? "Female" : "Male";
          const n     = layer.key === "female" ? d.data.female : d.data.male;
          Tooltip.show(event,
            `${Tooltip.fmt.activity(d.data.activity)} — ${label}<br>` +
            `${Tooltip.fmt.row("Sessions", Tooltip.fmt.int(n))}`
          );
        })
        .on("mousemove", Tooltip.move).on("mouseout", Tooltip.hide);
    });

    // Activity labels on Y axis
    g.selectAll(".ay-label")
      .data(sorted).join("text").attr("class", "ay-label")
      .attr("x", -6).attr("y", d => yScale(d.activity) + yScale.bandwidth() / 2)
      .attr("dy", "0.35em").attr("text-anchor", "end")
      .attr("fill", "#ccc").attr("font-size", "11px")
      .text(d => d.activity);

    // Total count labels to the right
    g.selectAll(".at-val")
      .data(sorted).join("text").attr("class", "at-val")
      .attr("x", d => xScale(d.sessions) + 4)
      .attr("y", d => yScale(d.activity) + yScale.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("fill", "#888").attr("font-size", "10px")
      .text(d => d.sessions);

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(5).tickSize(-innerH).tickFormat(d3.format("d")))
      .call(ax => ax.select(".domain").remove())
      .call(ax => ax.selectAll("line")
        .attr("stroke", "#2a2a2a").attr("stroke-dasharray", "3,3"))
      .call(ax => ax.selectAll("text")
        .attr("fill", "#666").attr("font-size", "10px").attr("dy", "1.2em"));

    g.append("text")
      .attr("x", innerW / 2).attr("y", innerH + 28)
      .attr("text-anchor", "middle")
      .attr("fill", "#666").attr("font-size", "10px")
      .text("Sessions");

    // Legend
    const leg = g.append("g").attr("transform", `translate(${innerW + 10},0)`);
    [["Female", genderColors["Female"]], ["Male", genderColors["Male"]]].forEach(([label, color], i) => {
      leg.append("rect")
        .attr("x", 0).attr("y", i * 18).attr("width", 10).attr("height", 10)
        .attr("fill", color).attr("rx", 2);
      leg.append("text")
        .attr("x", 14).attr("y", i * 18 + 9)
        .attr("dy", "0.1em")
        .attr("fill", "#aaa").attr("font-size", "10px")
        .text(label);
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  function _sectionLabel(g, text) {
    g.append("text")
      .attr("x", 0).attr("y", -8)
      .attr("fill", "#666").attr("font-size", "9px").attr("font-weight", "600")
      .attr("letter-spacing", "1.2px")
      .text(text);
  }

  return { init };

})();

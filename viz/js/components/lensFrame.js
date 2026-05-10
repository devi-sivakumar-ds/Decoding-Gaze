/**
 * lensFrame.js
 * Reusable glasses lens SVG component.
 *
 * Renders a single lens outline (rounded rectangle) with:
 *   - dark fill
 *   - white stroke
 *   - faint cyan crosshair at centre (0,0)
 *   - a clip path so child content stays inside the lens
 *
 * Every other component that draws on a lens calls LensFrame.create()
 * first, then appends its own content inside the returned group.
 *
 * Usage:
 *   const { svg, lensGroup, clipId } = LensFrame.create("#container", "cooking-lens");
 *   lensGroup.append("circle").attr("cx", ...).attr("cy", ...);
 */

const LensFrame = (() => {

  const { lens, ui } = CONFIG;
  const { xPx, yPx }  = LensScales;

  let _idCounter = 0;

  /**
   * Create a lens SVG inside the given container.
   *
   * @param {string} containerSelector  — CSS selector for the parent element
   * @param {string} [idPrefix="lens"]  — prefix for generated element IDs (keep unique per page)
   * @param {object} [opts]             — optional overrides
   * @param {number} [opts.padPx=16]    — padding around lens inside the SVG
   * @param {boolean}[opts.crosshair=true] — show centre crosshair
   * @param {boolean}[opts.leftLabel]   — optional label above lens (e.g. "Left Eye")
   * @param {boolean}[opts.rightLabel]  — optional label above lens (e.g. "Right Eye")
   *
   * @returns {{ svg, lensGroup, clipId, width, height }}
   *   svg       — the root <svg> selection
   *   lensGroup — <g> clipped to lens bounds; append your content here
   *   clipId    — the clip-path id string (in case you need it)
   *   width     — total SVG width in px
   *   height    — total SVG height in px
   */
  function create(containerSelector, idPrefix = "lens", opts = {}) {
    const {
      padPx    = 16,
      crosshair = true,
      label    = null,
    } = opts;

    const uid     = `${idPrefix}-${_idCounter++}`;
    const clipId  = `clip-${uid}`;

    const svgW = lens.svgWidth  + padPx * 2;
    const svgH = lens.svgHeight + padPx * 2 + (label ? 24 : 0);

    const svg = d3.select(containerSelector)
      .append("svg")
      .attr("width",  svgW)
      .attr("height", svgH)
      .style("background", ui.background)
      .style("display", "block");

    // Optional label above lens
    if (label) {
      svg.append("text")
        .attr("x", svgW / 2)
        .attr("y", 16)
        .attr("text-anchor", "middle")
        .attr("fill", ui.textSecondary)
        .attr("font-size", "12px")
        .text(label);
    }

    const labelOffset = label ? 24 : 0;

    // Group positioned so lens top-left is at (padPx, padPx + labelOffset)
    const root = svg.append("g")
      .attr("transform", `translate(${padPx}, ${padPx + labelOffset})`);

    // ── Clip path ────────────────────────────────────────────────────────
    const defs = svg.append("defs");
    defs.append("clipPath")
      .attr("id", clipId)
      .append("rect")
        .attr("x",      0)
        .attr("y",      0)
        .attr("width",  lens.svgWidth)
        .attr("height", lens.svgHeight)
        .attr("rx",     lens.svgRadius)
        .attr("ry",     lens.svgRadius);

    // ── Lens background ──────────────────────────────────────────────────
    root.append("rect")
      .attr("class",  "lens-bg")
      .attr("x",      0)
      .attr("y",      0)
      .attr("width",  lens.svgWidth)
      .attr("height", lens.svgHeight)
      .attr("rx",     lens.svgRadius)
      .attr("ry",     lens.svgRadius)
      .attr("fill",   ui.lensFill);

    // ── Content group (clipped) ──────────────────────────────────────────
    const lensGroup = root.append("g")
      .attr("class",     "lens-content")
      .attr("clip-path", `url(#${clipId})`);

    // ── Crosshair ────────────────────────────────────────────────────────
    if (crosshair) {
      const cx = xPx(0);
      const cy = yPx(0);

      root.append("line")
        .attr("class",          "lens-crosshair")
        .attr("x1", cx).attr("y1", 0)
        .attr("x2", cx).attr("y2", lens.svgHeight)
        .attr("stroke",         ui.crosshair)
        .attr("stroke-width",   0.75)
        .attr("opacity",        0.4)
        .attr("pointer-events", "none");

      root.append("line")
        .attr("class",          "lens-crosshair")
        .attr("x1", 0).attr("y1", cy)
        .attr("x2", lens.svgWidth).attr("y2", cy)
        .attr("stroke",         ui.crosshair)
        .attr("stroke-width",   0.75)
        .attr("opacity",        0.4)
        .attr("pointer-events", "none");
    }

    // ── Lens outline (drawn last so it sits on top) ───────────────────────
    root.append("rect")
      .attr("class",        "lens-outline")
      .attr("x",            0)
      .attr("y",            0)
      .attr("width",        lens.svgWidth)
      .attr("height",       lens.svgHeight)
      .attr("rx",           lens.svgRadius)
      .attr("ry",           lens.svgRadius)
      .attr("fill",         "none")
      .attr("stroke",       ui.lensStroke)
      .attr("stroke-width", 2)
      .attr("pointer-events","none");

    return { svg, root, lensGroup, clipId, svgW, svgH };
  }

  /**
   * Create a paired glasses frame — left lens and right lens side by side.
   * Returns individual lensGroups for each eye.
   *
   * @param {string} containerSelector
   * @param {string} [idPrefix="glasses"]
   * @param {object} [opts]
   * @param {number} [opts.gapPx=48]    — gap between lenses (bridge area)
   * @param {number} [opts.padPx=16]
   * @param {string} [opts.leftLabel]   — label above left lens
   * @param {string} [opts.rightLabel]  — label above right lens
   *
   * @returns {{ svg, leftGroup, rightGroup, svgW, svgH }}
   */
  function createPair(containerSelector, idPrefix = "glasses", opts = {}) {
    const {
      gapPx        = 48,
      padPx        = 16,
      leftLabel    = "Left Eye",
      rightLabel   = "Right Eye",
      crosshair    = true,
      // Glasses PNG overlay — embed as SVG <image> so alignment is coordinate-exact.
      // imgX/imgY are SVG-canvas coords for the PNG top-left (usually negative).
      // imgH must match the actual PNG's aspect ratio — pass it explicitly.
      glassesImg   = null,
      glassesImgW  = 836,
      glassesImgH  = 263,   // = glassesImgW * (pngHeight / pngWidth)
      glassesImgX  = -12,
      glassesImgY  = -27,
      glassesImgOpacity = 0.4,
      lensBoxW     = lens.svgWidth,
      lensBoxH     = lens.svgHeight,
      lensBoxInsetX = 0,
      leftLensBoxInsetX = lensBoxInsetX,
      rightLensBoxInsetX = lensBoxInsetX,
      lensBoxInsetY = 0,
    } = opts;

    const labelH  = 24;
    const svgW    = lens.svgWidth * 2 + gapPx + padPx * 2;
    const svgH    = lens.svgHeight + padPx * 2 + labelH;

    const uid     = `${idPrefix}-${_idCounter++}`;

    const svg = d3.select(containerSelector)
      .append("svg")
      .attr("width",  svgW)
      .attr("height", svgH)
      .style("background", ui.background)
      .style("display", "block");

    const defs = svg.append("defs");

    function _makeLens(offsetX, clipId, label, boxInsetX) {
      const lensY = padPx + labelH;
      const scaleX = lensBoxW / lens.svgWidth;
      const scaleY = lensBoxH / lens.svgHeight;
      const boxCx  = boxInsetX + lensBoxW / 2;
      const boxCy  = lensBoxInsetY + lensBoxH / 2;

      // Clip path in outer group's LOCAL coords (0,0 = lens top-left).
      // Must NOT use clipPathUnits="userSpaceOnUse" with absolute coords when
      // the clip is applied to a transformed group — clip to local (0,0) instead.
      defs.append("clipPath")
        .attr("id", clipId)
        .append("rect")
          .attr("x",      boxInsetX)
          .attr("y",      lensBoxInsetY)
          .attr("width",  lensBoxW)
          .attr("height", lensBoxH)
          .attr("rx",     lens.svgRadius * scaleX)
          .attr("ry",     lens.svgRadius * scaleY);

      // Label above lens (placed in SVG root coords, before the outer group)
      svg.append("text")
        .attr("x", offsetX + boxCx)
        .attr("y", lensY - 6)
        .attr("text-anchor", "middle")
        .attr("fill", ui.textSecondary)
        .attr("font-size", "11px")
        .text(label);

      // Outer group — positions the lens; 0,0 inside = lens top-left on screen.
      const outer = svg.append("g")
        .attr("transform", `translate(${offsetX}, ${lensY})`);

      // Lens background
      outer.append("rect")
        .attr("x", boxInsetX).attr("y", lensBoxInsetY)
        .attr("width",  lensBoxW)
        .attr("height", lensBoxH)
        .attr("rx", lens.svgRadius * scaleX).attr("ry", lens.svgRadius * scaleY)
        .attr("fill", ui.lensFill);

      // Content group receives the same scale as the visible fitted lens box.
      // Children still use the canonical 55×30mm coordinate transform.
      const group = outer.append("g")
        .attr("clip-path", `url(#${clipId})`)
        .attr("transform", `translate(${boxInsetX},${lensBoxInsetY}) scale(${scaleX},${scaleY})`);

      // Crosshair — drawn in outer (unclipped) so lines reach the lens edge
      if (crosshair) {
        const cx = boxInsetX + xPx(0) * scaleX;
        const cy = lensBoxInsetY + yPx(0) * scaleY;
        outer.append("line")
          .attr("x1", cx).attr("y1", lensBoxInsetY)
          .attr("x2", cx).attr("y2", lensBoxInsetY + lensBoxH)
          .attr("stroke", ui.crosshair).attr("stroke-width", 0.75)
          .attr("opacity", 0.4).attr("pointer-events", "none");
        outer.append("line")
          .attr("x1", boxInsetX).attr("y1", cy)
          .attr("x2", boxInsetX + lensBoxW).attr("y2", cy)
          .attr("stroke", ui.crosshair).attr("stroke-width", 0.75)
          .attr("opacity", 0.4).attr("pointer-events", "none");
      }

      // Outline on top (unclipped, sits above content)
      outer.append("rect")
        .attr("x", boxInsetX).attr("y", lensBoxInsetY)
        .attr("width",  lensBoxW)
        .attr("height", lensBoxH)
        .attr("rx", lens.svgRadius * scaleX).attr("ry", lens.svgRadius * scaleY)
        .attr("fill",   "none")
        .attr("stroke", ui.lensStroke)
        .attr("stroke-width", 0.5)
        .attr("opacity", 0.5)
        .attr("pointer-events", "none");

      return group;
    }

    const leftOffsetX  = padPx;
    const rightOffsetX = padPx + lens.svgWidth + gapPx;

    const leftGroup  = _makeLens(leftOffsetX,  `clip-${uid}-left`,  leftLabel,  leftLensBoxInsetX);
    const rightGroup = _makeLens(rightOffsetX, `clip-${uid}-right`, rightLabel, rightLensBoxInsetX);

    // Bridge (decorative line between lenses — hidden by PNG nose bridge when glassesImg used)
    svg.append("line")
      .attr("x1", leftOffsetX + leftLensBoxInsetX + lensBoxW)
      .attr("y1", padPx + labelH + lensBoxInsetY + lensBoxH / 2)
      .attr("x2", rightOffsetX + rightLensBoxInsetX)
      .attr("y2", padPx + labelH + lensBoxInsetY + lensBoxH / 2)
      .attr("stroke", ui.lensStroke)
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.5);

    // Glasses image is drawn over the analytic coordinate rectangles so the
    // frame visually anchors the lens coordinate system to the glasses.
    if (glassesImg) {
      svg.style("overflow", "visible");
      svg.append("image")
        .attr("href",                glassesImg)
        .attr("x",                   glassesImgX)
        .attr("y",                   glassesImgY)
        .attr("width",               glassesImgW)
        .attr("height",              glassesImgH)
        .attr("opacity",             glassesImgOpacity)
        .attr("preserveAspectRatio", "none")
        .style("pointer-events",     "none");
    }

    return { svg, leftGroup, rightGroup, svgW, svgH,
             leftOffsetX, rightOffsetX,
             lensOffsetY: padPx + labelH + lensBoxInsetY };
  }

  return { create, createPair };

})();

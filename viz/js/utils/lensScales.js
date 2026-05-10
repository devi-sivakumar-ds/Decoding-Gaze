/**
 * lensScales.js
 * Shared mm → SVG px coordinate transforms for the lens frame.
 *
 * Physical coordinate system (from CPF / data exports):
 *   +x = left on lens,  range [-27.5, +27.5] mm
 *   +y = up   on lens,  range [-15.0, +15.0] mm
 *
 * SVG coordinate system:
 *   origin (0,0) = top-left corner of the lens SVG element
 *   +x = rightward (screen right)
 *   +y = downward  (screen down)  ← Y axis is flipped vs physical
 *
 * All components import this module and use these scales directly.
 * Never hardcode px values in components — always go through here.
 */

const LensScales = (() => {

  const { lensXRange, lensYRange, lens, mmToPx } = CONFIG;

  // ── Linear scales: physical mm → SVG px ──────────────────────────────────

  // x: -27.5 mm → 0 px,  +27.5 mm → 330 px
  const xScale = d3.scaleLinear()
    .domain(lensXRange)
    .range([0, lens.svgWidth]);

  // y: +15 mm → 0 px,  -15 mm → 180 px   (flipped — up in physics = up on screen)
  const yScale = d3.scaleLinear()
    .domain([lensYRange[1], lensYRange[0]])
    .range([0, lens.svgHeight]);

  // ── Convenience functions ─────────────────────────────────────────────────

  /** Physical mm → SVG px for x coordinate */
  const xPx = (xMm) => xScale(xMm);

  /** Physical mm → SVG px for y coordinate */
  const yPx = (yMm) => yScale(yMm);

  /** SVG px → physical mm for x (inverse, used by AR designer drag) */
  const xMm = (xPx) => xScale.invert(xPx);

  /** SVG px → physical mm for y (inverse, used by AR designer drag) */
  const yMm = (yPx) => yScale.invert(yPx);

  /** Convert a mm length to px (for widths, radii, etc. — no offset needed) */
  const mmToPxLen = (mm) => mm * mmToPx;

  /**
   * Lens centre in SVG px coordinates.
   * Physical (0, 0) maps to the centre of the SVG element.
   */
  const centre = {
    x: xPx(0),   // 165 px
    y: yPx(0),   //  90 px
  };

  /**
   * Returns a transform string to place an SVG group at the lens centre.
   * Useful for components that want to work in mm-centred coordinates.
   */
  const centreTransform = () =>
    `translate(${centre.x}, ${centre.y})`;

  /**
   * Clamp a physical mm value to the lens bounds.
   * Useful when dragging the AR overlay to keep it on the lens.
   */
  const clampX = (xMmVal) =>
    Math.max(lensXRange[0], Math.min(lensXRange[1], xMmVal));

  const clampY = (yMmVal) =>
    Math.max(lensYRange[0], Math.min(lensYRange[1], yMmVal));

  return {
    xScale,
    yScale,
    xPx,
    yPx,
    xMm,
    yMm,
    mmToPxLen,
    centre,
    centreTransform,
    clampX,
    clampY,
  };

})();

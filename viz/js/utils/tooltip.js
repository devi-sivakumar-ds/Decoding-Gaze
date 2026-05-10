/**
 * tooltip.js
 * Single shared tooltip instance used by all components.
 *
 * Usage:
 *   Tooltip.show(event, "<b>Cooking</b><br>−8.0 mm");
 *   Tooltip.hide();
 */

const Tooltip = (() => {

  // Create one div, appended to body, hidden by default
  const el = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position",       "absolute")
    .style("pointer-events", "none")
    .style("opacity",        0)
    .style("background",     CONFIG.ui.tooltipBg)
    .style("color",          CONFIG.ui.textPrimary)
    .style("padding",        "8px 10px")
    .style("border-radius",  "4px")
    .style("font-size",      "12px")
    .style("line-height",    "1.5")
    .style("max-width",      "220px")
    .style("box-shadow",     "0 2px 6px rgba(0,0,0,0.5)");

  const OFFSET_X = 14;
  const OFFSET_Y = -28;

  /**
   * Show the tooltip near the cursor with the given HTML content.
   * @param {MouseEvent} event  — the triggering DOM event
   * @param {string}     html   — inner HTML string for the tooltip body
   */
  function show(event, html) {
    el.html(html)
      .style("opacity", 1)
      .style("left", (event.pageX + OFFSET_X) + "px")
      .style("top",  (event.pageY + OFFSET_Y) + "px");
  }

  /**
   * Move the tooltip to follow the cursor (call from mousemove).
   * @param {MouseEvent} event
   */
  function move(event) {
    el.style("left", (event.pageX + OFFSET_X) + "px")
      .style("top",  (event.pageY + OFFSET_Y) + "px");
  }

  /** Hide the tooltip. */
  function hide() {
    el.style("opacity", 0);
  }

  /**
   * Format helpers — keep tooltip HTML consistent across components.
   */
  const fmt = {
    /** Bold label + plain value on one line */
    row: (label, value) =>
      `<span style="color:${CONFIG.ui.textSecondary}">${label}:</span> ${value}`,

    /** Colored activity name */
    activity: (name) =>
      `<span style="color:${CONFIG.activityColors[name] ?? '#fff'};font-weight:600">${name}</span>`,

    /** mm value rounded to 1 decimal */
    mm: (v) => `${v.toFixed(1)} mm`,

    /** Integer with thousands separator */
    int: (v) => v.toLocaleString(),
  };

  return { show, move, hide, fmt };

})();

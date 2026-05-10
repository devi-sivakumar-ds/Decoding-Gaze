/**
 * gazeTrail.js
 * Act 1 — Animated dual-lens gaze trail.
 *
 * Renders two lens frames (left eye / right eye) side by side.
 * Each lens shows an independent animated gaze dot with a fading trail.
 * A time slider below both lenses lets the user scrub through the recording.
 *
 * Public API:
 *   GazeTrail.init(trailsData)   — first render, binds all controls
 *   GazeTrail.setActivity(name)  — switch to a different activity's trail
 *   GazeTrail.play()
 *   GazeTrail.pause()
 */

const GazeTrail = (() => {

  const { trail, activityColors, activities } = CONFIG;
  const { xPx, yPx } = LensScales;

  // ── Internal state ──────────────────────────────────────────────────────
  let _data       = {};       // activity → trail object
  let _activity   = activities[0];
  let _frameIndex = 0;
  let _playing    = false;
  let _speed      = 1;
  let _timer      = null;

  // SVG elements — left lens
  let _leftGroup  = null;
  let _leftDot    = null;
  let _leftTrail  = [];

  // SVG elements — right lens
  let _rightGroup = null;
  let _rightDot   = null;
  let _rightTrail = [];

  // Offsets so we can place dots correctly inside the pair SVG
  let _leftOffsetX  = 0;
  let _rightOffsetX = 0;
  let _lensOffsetY  = 0;

  // Controls
  let _slider     = null;
  let _timeLabel  = null;
  let _captionEl  = null;

  // Filmstrip
  let _framesData       = {};   // activity → [url, url, ...]  (only 3 activities)
  let _filmstripWrap    = null;
  let _filmstripImgs    = [];
  let _featuredImg      = null;
  let _currentPhotoIdx  = -1;

  // ── Init ────────────────────────────────────────────────────────────────

  function init(trailsData) {
    trailsData.forEach(d => { _data[d.activity] = d; });

    _buildActivityPills();
    _buildDualLens();
    _buildFilmstrip();
    _buildSlider();
    _bindPlayPause();
    _bindSpeedButtons();

    _captionEl = d3.select("#trail-caption");
    setActivity(activities[0]);
  }

  // ── UI builders ─────────────────────────────────────────────────────────

  function _buildActivityPills() {
    d3.select("#trail-activity-selector")
      .selectAll(".pill")
      .data(activities)
      .join("button")
        .attr("class", d => `pill${d === _activity ? " active" : ""}`)
        .style("color", d => activityColors[d])
        .text(d => d)
        .on("click", (event, d) => setActivity(d));
  }

  function _buildDualLens() {
    const pair = LensFrame.createPair(
      "#trail-lens-container",
      "trail",
      { gapPx: 52, padPx: 16, leftLabel: "Left Eye", rightLabel: "Right Eye",
        glassesImg: "assets/metaglasses2.png",
        glassesImgW: 744, glassesImgH: 236, glassesImgX: 0, glassesImgY: 0,
        glassesImgOpacity: 0.35,
        lensBoxW: 238, lensBoxH: 126, lensBoxInsetY: 17,
        leftLensBoxInsetX: 64, rightLensBoxInsetX: 34 }
    );

    _leftGroup    = pair.leftGroup;
    _rightGroup   = pair.rightGroup;
    _leftOffsetX  = pair.leftOffsetX;
    _rightOffsetX = pair.rightOffsetX;
    _lensOffsetY  = pair.lensOffsetY;

    // Build dot + trail pool for each lens
    [
      { group: _leftGroup,  dotRef: "_leftDot",  trailRef: "_leftTrail"  },
      { group: _rightGroup, dotRef: "_rightDot", trailRef: "_rightTrail" },
    ].forEach(({ group, dotRef, trailRef }) => {
      const pool = [];
      for (let i = 0; i < trail.trailLength; i++) {
        pool.push(
          group.append("circle")
            .attr("r", trail.trailDotRadius)
            .attr("fill", "#ffffff")
            .attr("opacity", 0)
            .attr("pointer-events", "none")
        );
      }
      // Store into the module-level variables
      if (dotRef === "_leftDot") {
        _leftTrail = pool;
        _leftDot = group.append("circle")
          .attr("r", trail.dotRadius)
          .attr("fill", "#ffffff")
          .attr("opacity", 0)
          .attr("pointer-events", "none");
      } else {
        _rightTrail = pool;
        _rightDot = group.append("circle")
          .attr("r", trail.dotRadius)
          .attr("fill", "#ffffff")
          .attr("opacity", 0)
          .attr("pointer-events", "none");
      }
    });
  }

  function _buildSlider() {
    const container = d3.select("#trail-lens-container");

    // Wrapper div for slider row
    const row = container.append("div")
      .style("display",      "flex")
      .style("align-items",  "center")
      .style("gap",          "10px")
      .style("margin-top",   "10px")
      .style("padding",      "0 16px");

    // Time label left
    _timeLabel = row.append("span")
      .style("font-size",    "12px")
      .style("color",        "#aaa")
      .style("min-width",    "90px")
      .style("font-variant-numeric", "tabular-nums")
      .text("0:00 / 0:00");

    // Slider
    _slider = row.append("input")
      .attr("type",  "range")
      .attr("min",   0)
      .attr("value", 0)
      .style("flex", "1")
      .style("accent-color", "#76b7b2")
      .style("cursor", "pointer");

    // Scrubbing: pause while dragging, resume on release
    _slider.on("input", function () {
      const wasPaused = !_playing;
      pause();
      _frameIndex = +this.value;
      _renderFrame(_frameIndex);
      if (!wasPaused) {
        // brief delay so the render is visible before resuming
        setTimeout(play, 80);
      }
    });
  }

  function _buildFilmstrip() {
    const container = d3.select("#trail-lens-container");

    _filmstripWrap = container.append("div")
      .attr("class", "trail-filmstrip-wrap")
      .style("display", "none");

    _filmstripWrap.append("p").attr("class", "trail-filmstrip-label");

    // Featured frame — large, matches lens height
    _featuredImg = _filmstripWrap.append("img")
      .attr("class", "trail-featured-img")
      .attr("alt", "Current activity frame");

    _filmstripWrap.append("div").attr("class", "trail-filmstrip");
    // img elements are created dynamically in _populateFilmstrip()
  }

  // Rebuild img elements whenever the frame list changes (different activity or new manifest).
  function _populateFilmstrip(photoUrls, color) {
    if (!photoUrls || photoUrls.length === 0) {
      _filmstripWrap.style("display", "none");
      _filmstripImgs = [];
      return;
    }

    const count    = photoUrls.length;
    const interval = Math.round(300 / count);

    _filmstripWrap.select(".trail-filmstrip-label")
      .text(`First-person camera — one frame every ${interval} s`);

    const strip = _filmstripWrap.select(".trail-filmstrip");
    strip.selectAll("img").remove();

    _filmstripImgs = photoUrls.map((url, i) => {
      const t0 = i * interval;
      const t1 = t0 + interval;
      return strip.append("img")
        .attr("src",   url)
        .attr("alt",   `Frame ${i + 1}`)
        .attr("title", `t = ${t0}–${t1} s`)
        .classed("fs-active", i === 0)
        .style("border-color", i === 0 ? color : "transparent");
    });

    _currentPhotoIdx = 0;
    _featuredImg
      .attr("src", photoUrls[0])
      .style("border-color", color);
    _filmstripWrap.style("display", "block");
  }

  function _bindPlayPause() {
    d3.select("#trail-play-pause").on("click", () => {
      _playing ? pause() : play();
    });
  }

  function _bindSpeedButtons() {
    d3.selectAll(".btn-speed").on("click", function () {
      d3.selectAll(".btn-speed").classed("active", false);
      d3.select(this).classed("active", true);
      _speed = +this.dataset.speed;
      if (_playing) { pause(); play(); }
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  function _formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // Position a dot inside a lens group.
  // The group is already clipped to the lens; xPx/yPx give lens-local px.
  function _placeDot(dot, xMm, yMm) {
    dot.attr("cx", xPx(xMm)).attr("cy", yPx(yMm)).attr("opacity", 1);
  }

  function _placeTrail(pool, frames, currentIdx) {
    for (let i = 0; i < trail.trailLength; i++) {
      const pastIdx = ((currentIdx - i - 1) + frames.length) % frames.length;
      const past    = frames[pastIdx];
      const opacity = (1 - (i + 1) / trail.trailLength) * 0.55;
      pool[i]
        .attr("cx", xPx(past.lx ?? past.x))   // fallback to bino if null
        .attr("cy", yPx(past.ly ?? past.y))
        .attr("opacity", opacity);
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────

  function setActivity(name) {
    if (!_data[name]) return;
    const wasPlaying = _playing;
    pause();

    _activity   = name;
    _frameIndex = 0;

    // Update pills
    d3.selectAll("#trail-activity-selector .pill")
      .classed("active", d => d === name);

    // Recolor dots
    const color = activityColors[name] ?? "#ffffff";
    [_leftDot, _rightDot].forEach(d => d.attr("fill", color));
    [..._leftTrail, ..._rightTrail].forEach(d => d.attr("fill", color));

    // Update slider range
    const frames = _data[name].frames;
    _slider.attr("max", frames.length - 1).attr("value", 0);

    // Update caption
    const meta = _data[name];
    _captionEl.html(
      `Showing <strong style="color:${color}">${name}</strong> —
       ${meta.n_frames.toLocaleString()} gaze samples over
       ${(meta.duration_s / 60).toFixed(1)} min.
       Left and right lenses show each eye's independent gaze ray.
       Session lens centroid Y: <strong>${meta.bino_cy.toFixed(1)} mm</strong>
       (activity median: ${meta.activity_median_cy.toFixed(1)} mm).`
    );

    // Update filmstrip
    _populateFilmstrip(_framesData[name], activityColors[name] ?? "#76b7b2");

    _renderFrame(0);
    if (wasPlaying) play();
  }

  function play() {
    if (_playing) return;
    _playing = true;
    d3.select("#trail-play-pause").html("&#9646;&#9646;");

    const ms = trail.frameIntervalMs / _speed;
    _timer = setInterval(() => {
      const frames = _data[_activity]?.frames;
      if (!frames) return;
      _frameIndex = (_frameIndex + 1) % frames.length;
      _renderFrame(_frameIndex);
    }, ms);
  }

  function pause() {
    if (!_playing) return;
    _playing = false;
    d3.select("#trail-play-pause").html("&#9654;");
    if (_timer) { clearInterval(_timer); _timer = null; }
  }

  // ── Rendering ───────────────────────────────────────────────────────────

  function _renderFrame(idx) {
    const frames = _data[_activity]?.frames;
    if (!frames || frames.length === 0) return;

    const frame = frames[idx];

    // Left lens — uses lx, ly
    const lx = frame.lx ?? frame.x;
    const ly = frame.ly ?? frame.y;
    _placeDot(_leftDot, lx, ly);
    // Left trail uses left-eye coords
    for (let i = 0; i < trail.trailLength; i++) {
      const pi = ((idx - i - 1) + frames.length) % frames.length;
      const p  = frames[pi];
      const opacity = (1 - (i + 1) / trail.trailLength) * 0.55;
      _leftTrail[i]
        .attr("cx", xPx(p.lx ?? p.x))
        .attr("cy", yPx(p.ly ?? p.y))
        .attr("opacity", opacity);
    }

    // Right lens — uses rx, ry
    const rx = frame.rx ?? frame.x;
    const ry = frame.ry ?? frame.y;
    _placeDot(_rightDot, rx, ry);
    for (let i = 0; i < trail.trailLength; i++) {
      const pi = ((idx - i - 1) + frames.length) % frames.length;
      const p  = frames[pi];
      const opacity = (1 - (i + 1) / trail.trailLength) * 0.55;
      _rightTrail[i]
        .attr("cx", xPx(p.rx ?? p.x))
        .attr("cy", yPx(p.ry ?? p.y))
        .attr("opacity", opacity);
    }

    // Sync slider and time label
    _slider.property("value", idx);
    const t     = frame.t;
    const total = frames[frames.length - 1].t;
    _timeLabel.text(`${_formatTime(t)} / ${_formatTime(total)}`);

    // Advance filmstrip highlight
    const photoUrls = _framesData[_activity];
    if (photoUrls && photoUrls.length > 0) {
      const count    = photoUrls.length;
      const interval = 300 / count;                          // seconds per frame
      const photoIdx = Math.min(count - 1, Math.floor(t / interval));
      if (photoIdx !== _currentPhotoIdx) {
        _currentPhotoIdx = photoIdx;
        const color = activityColors[_activity] ?? "#76b7b2";
        _filmstripImgs.forEach((img, i) => {
          const active = i === photoIdx;
          img.classed("fs-active", active)
             .style("border-color", active ? color : "transparent");
        });
        // Update featured image
        _featuredImg
          .attr("src", photoUrls[photoIdx])
          .style("border-color", activityColors[_activity] ?? "#76b7b2");

        // Scroll active thumbnail into view
        const activeEl = _filmstripImgs[photoIdx]?.node();
        if (activeEl) activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }

  function setFrames(framesManifest) {
    _framesData = framesManifest ?? {};
    // Rebuild filmstrip for the currently shown activity
    _populateFilmstrip(_framesData[_activity], activityColors[_activity] ?? "#76b7b2");
  }

  return { init, setActivity, play, pause, setFrames };

})();

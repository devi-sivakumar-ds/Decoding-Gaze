/**
 * heroIntro.js
 * D3-powered entry animation: gaze dots sample a reference PNG and form the
 * glasses shape, then the start button scrolls into Act 1.
 */

const HeroIntro = (() => {
  const IMAGE_SRC = "../sideviewglass.png";
  const DOT_COUNT = 760;
  const TRAIL_COUNT = 20;
  const SAMPLE_STEP = 3;

  function init() {
    const hero = document.querySelector(".hero-intro");
    const svgNode = document.querySelector(".hero-gaze-field");
    const startButton = document.querySelector(".hero-start");

    if (!hero || !svgNode || !window.d3) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const svg = d3.select(svgNode);
    let ambientTimer = null;
    let ambientStartTimeout = null;
    let imagePoints = [];

    hero.classList.add("is-animating");

    loadImagePoints(IMAGE_SRC)
      .then(points => {
        imagePoints = points;
        draw();
      })
      .catch(() => {
        imagePoints = fallbackPoints();
        draw();
      });

    function size() {
      const rect = hero.getBoundingClientRect();
      svg.attr("viewBox", `0 0 ${rect.width} ${rect.height}`);
      return { width: rect.width, height: rect.height };
    }

    function imageBounds(width, height) {
      const imageAspect = 746 / 310;
      const imageW = Math.min(width * 0.5, 680);
      const imageH = imageW / imageAspect;
      const isMobile = width < 800;
      const marginX = isMobile ? 18 : Math.max(36, width * 0.04);
      const marginY = isMobile ? 28 : Math.max(44, height * 0.08);

      return {
        x: width - imageW - marginX,
        y: height - imageH - marginY,
        width: imageW,
        height: imageH,
      };
    }

    function mapPoint(point, bounds) {
      return {
        x: bounds.x + point.x * bounds.width,
        y: bounds.y + point.y * bounds.height,
      };
    }

    function edgeStart(width, height, i) {
      const side = i % 4;

      return {
        x: side === 0 ? -28 : side === 1 ? width + 28 : Math.random() * width,
        y: side === 2 ? -28 : side === 3 ? height + 28 : Math.random() * height,
      };
    }

    function draw() {
      const { width, height } = size();
      if (ambientTimer) ambientTimer.stop();
      window.clearTimeout(ambientStartTimeout);
      svgNode.dataset.motionStarted = "false";
      svg.selectAll("*").remove();

      const bounds = imageBounds(width, height);
      let mouse = null;

      const dots = d3.range(DOT_COUNT).map((_, i) => {
        const start = edgeStart(width, height, i);
        const sampled = imagePoints[Math.floor(Math.random() * imagePoints.length)];
        const target = mapPoint(sampled, bounds);

        return {
          ...start,
          baseX: target.x,
          baseY: target.y,
          phase: Math.random() * Math.PI * 2,
          speed: 0.0005 + Math.random() * 0.001,
          drift: 0.8 + Math.random() * 2.4,
          r: Math.random() * 1.35 + 0.65,
          delay: i * 2.2 + Math.random() * 360,
        };
      });

      svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "#020202");

      const trailLine = d3.line()
        .x(d => d.x)
        .y(d => d.y)
        .curve(d3.curveCatmullRom.alpha(0.55));

      svg.append("g")
        .attr("class", "hero-trails")
        .selectAll("path")
        .data(dots.slice(0, TRAIL_COUNT))
        .join("path")
          .attr("d", d => trailLine([
            { x: d.x, y: d.y },
            { x: (d.x + d.baseX) / 2 + d3.randomNormal(0, 44)(), y: (d.y + d.baseY) / 2 },
            { x: d.baseX, y: d.baseY },
          ]))
          .attr("fill", "none")
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 0.65)
          .attr("stroke-linecap", "round")
          .attr("opacity", reduceMotion ? 0.08 : 0);

      const dotSelection = svg.append("g")
        .selectAll("circle")
        .data(dots)
        .join("circle")
          .attr("cx", reduceMotion ? d => d.baseX : d => d.x)
          .attr("cy", reduceMotion ? d => d.baseY : d => d.y)
          .attr("r", d => d.r)
          .attr("fill", "#ffffff")
          .attr("opacity", reduceMotion ? 0.44 : 0);

      if (reduceMotion) {
        hero.classList.add("is-ready");
        return;
      }

      svg.selectAll(".hero-trails path")
        .transition()
        .delay(480)
        .duration(900)
        .attr("opacity", 0.09)
        .transition()
        .duration(900)
        .attr("opacity", 0.025);

      dotSelection
        .transition()
        .delay(d => d.delay)
        .duration(1500)
        .ease(d3.easeCubicOut)
        .attr("cx", d => d.baseX)
        .attr("cy", d => d.baseY)
        .attr("opacity", d => Math.min(0.72, 0.3 + d.r * 0.18))
        .transition()
        .duration(800)
        .attr("opacity", d => Math.min(0.54, 0.24 + d.r * 0.12));

      window.setTimeout(() => {
        hero.classList.add("is-ready");
      }, 1450);

      ambientStartTimeout = window.setTimeout(startAmbientMotion, 2850);

      function startAmbientMotion() {
        if (svgNode.dataset.motionStarted === "true") return;
        svgNode.dataset.motionStarted = "true";

        hero.onpointermove = (event) => {
          const [x, y] = d3.pointer(event, svgNode);
          mouse = { x, y };
        };

        hero.onpointerleave = () => {
          mouse = null;
        };

        ambientTimer = d3.timer((elapsed) => {
          dotSelection
            .attr("cx", d => {
              const driftX = Math.sin(elapsed * d.speed + d.phase) * d.drift;
              const pullX = cursorPull(d, mouse).x;
              return d.baseX + driftX + pullX;
            })
            .attr("cy", d => {
              const driftY = Math.cos(elapsed * d.speed * 0.9 + d.phase) * d.drift * 0.65;
              const pullY = cursorPull(d, mouse).y;
              return d.baseY + driftY + pullY;
            })
            .attr("opacity", d => {
              const pulse = (Math.sin(elapsed * 0.003 + d.phase) + 1) * 0.05;
              return Math.min(0.62, 0.25 + d.r * 0.11 + pulse);
            });
        });
      }
    }

    function cursorPull(d, mouse) {
      if (!mouse) return { x: 0, y: 0 };

      const dx = mouse.x - d.baseX;
      const dy = mouse.y - d.baseY;
      const dist = Math.hypot(dx, dy);
      const radius = 150;
      if (dist > radius || dist === 0) return { x: 0, y: 0 };

      const strength = (1 - dist / radius) * 14;
      return {
        x: dx / dist * strength,
        y: dy / dist * strength,
      };
    }

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      if (imagePoints.length === 0) return;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(draw, 150);
    });

    if (startButton) {
      startButton.addEventListener("click", () => {
        const selector = startButton.getAttribute("data-scroll-target");
        document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function loadImagePoints(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) throw new Error("Canvas context unavailable");

          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          ctx.drawImage(image, 0, 0);

          const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const points = [];

          for (let y = 0; y < height; y += SAMPLE_STEP) {
            for (let x = 0; x < width; x += SAMPLE_STEP) {
              const idx = (y * width + x) * 4;
              const alpha = data[idx + 3];
              const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

              if (alpha > 32 && brightness > 80) {
                points.push({ x: x / width, y: y / height });
              }
            }
          }

          if (points.length === 0) reject(new Error("No visible pixels sampled"));
          else resolve(points);
        } catch (error) {
          reject(error);
        }
      };
      image.onerror = reject;
      image.src = src;
    });
  }

  function fallbackPoints() {
    return d3.range(400).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random());
      return {
        x: 0.5 + Math.cos(angle) * radius * 0.45,
        y: 0.5 + Math.sin(angle) * radius * 0.22,
      };
    });
  }

  return { init };
})();

HeroIntro.init();

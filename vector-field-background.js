(function () {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: true });

  if (!context) return;

  canvas.className = "vector-field-background";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);

  const desktopConfig = {
    spacing: 16,
    lineLength: 3.4,
    sigma: 145,
    maxInfluence: 0.58,
    ease: 0.085,
    decayMs: 420,
    maxDpr: 2,
  };
  const mobileConfig = {
    spacing: 20,
    lineLength: 2.8,
    sigma: 120,
    maxInfluence: 0.46,
    ease: 0.075,
    decayMs: 360,
    maxDpr: 1.5,
  };
  const coarsePointer = window.matchMedia("(pointer: coarse)");

  const mouse = {
    x: 0,
    y: 0,
    strength: 0,
    lastMove: 0,
    hasMoved: false,
  };

  let width = 0;
  let height = 0;
  let dpr = 1;
  let cols = 0;
  let rows = 0;
  let count = 0;
  let pointsX = new Float32Array(0);
  let pointsY = new Float32Array(0);
  let currentX = new Float32Array(0);
  let currentY = new Float32Array(0);
  let baseX = new Float32Array(0);
  let baseY = new Float32Array(0);
  let animationFrame = 0;
  let resizeFrame = 0;
  let running = false;
  let reducedMotion = prefersReducedMotion.matches;
  let settleFrames = 0;
  let stroke = "#1f2937";
  let config = desktopConfig;

  const normalize = (x, y) => {
    const length = Math.hypot(x, y) || 1;
    return [x / length, y / length];
  };

  const baseVector = (x, y) => {
    const fx = Math.sin(y / 180) + 0.42 * Math.cos((x + y) / 260);
    const fy = -Math.sin(x / 180) + 0.42 * Math.sin((x - y) / 240);

    return normalize(fx, fy);
  };

  const updateStroke = () => {
    const styles = getComputedStyle(document.documentElement);
    stroke = styles.getPropertyValue("--dot").trim() || "#1f2937";
  };

  const updateConfig = () => {
    const mobileViewport = window.innerWidth <= 720 || coarsePointer.matches;
    config = mobileViewport ? mobileConfig : desktopConfig;
  };

  const getViewport = () => {
    const viewport = window.visualViewport;

    return {
      width: Math.ceil(viewport?.width || window.innerWidth),
      height: Math.ceil(viewport?.height || window.innerHeight),
    };
  };

  const resize = () => {
    updateStroke();
    const previousConfig = config;
    updateConfig();

    const viewport = getViewport();
    width = viewport.width;
    height = viewport.height;
    const nextDpr = Math.min(window.devicePixelRatio || 1, config.maxDpr);

    if (
      canvas.width > 0 &&
      width === canvas.clientWidth &&
      height === canvas.clientHeight &&
      nextDpr === dpr &&
      config === previousConfig
    ) {
      draw(true);
      return;
    }

    dpr = nextDpr;

    canvas.width = Math.ceil(width * dpr);
    canvas.height = Math.ceil(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    cols = Math.ceil(width / config.spacing) + 2;
    rows = Math.ceil(height / config.spacing) + 2;
    count = cols * rows;

    pointsX = new Float32Array(count);
    pointsY = new Float32Array(count);
    currentX = new Float32Array(count);
    currentY = new Float32Array(count);
    baseX = new Float32Array(count);
    baseY = new Float32Array(count);

    let index = 0;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = col * config.spacing;
        const y = row * config.spacing;
        const vector = baseVector(x, y);

        pointsX[index] = x;
        pointsY[index] = y;
        baseX[index] = vector[0];
        baseY[index] = vector[1];
        currentX[index] = vector[0];
        currentY[index] = vector[1];
        index += 1;
      }
    }

    draw(true);
  };

  const draw = (staticFrame) => {
    context.clearRect(0, 0, width, height);
    context.strokeStyle = stroke;
    context.globalAlpha = 0.72;
    context.lineWidth = 1;
    context.lineCap = "round";
    context.beginPath();

    const now = performance.now();

    if (!staticFrame && mouse.hasMoved) {
      const elapsed = now - mouse.lastMove;
      mouse.strength = Math.exp(-elapsed / config.decayMs);

      if (mouse.strength < 0.22) {
        mouse.strength = 0;
        mouse.hasMoved = false;
      }
    }

    for (let index = 0; index < count; index += 1) {
      const x = pointsX[index];
      const y = pointsY[index];
      let targetX = baseX[index];
      let targetY = baseY[index];

      if (!reducedMotion && mouse.strength > 0) {
        const dx = x - mouse.x;
        const dy = y - mouse.y;
        const distanceSquared = dx * dx + dy * dy;
        const falloff = Math.exp(
          -distanceSquared / (2 * config.sigma * config.sigma),
        );
        const influence = falloff * mouse.strength * config.maxInfluence;

        if (influence > 0.001) {
          const swirl = normalize(-dy, dx);

          targetX = baseX[index] * (1 - influence) + swirl[0] * influence;
          targetY = baseY[index] * (1 - influence) + swirl[1] * influence;

          const normalized = normalize(targetX, targetY);
          targetX = normalized[0];
          targetY = normalized[1];
        }
      }

      if (staticFrame || reducedMotion) {
        currentX[index] = targetX;
        currentY[index] = targetY;
      } else {
        currentX[index] += (targetX - currentX[index]) * config.ease;
        currentY[index] += (targetY - currentY[index]) * config.ease;

        const normalized = normalize(currentX[index], currentY[index]);
        currentX[index] = normalized[0];
        currentY[index] = normalized[1];
      }

      const half = config.lineLength / 2;
      const x1 = x - currentX[index] * half;
      const y1 = y - currentY[index] * half;
      const x2 = x + currentX[index] * half;
      const y2 = y + currentY[index] * half;

      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
    }

    context.stroke();
    context.globalAlpha = 1;
  };

  const animate = () => {
    if (!running) return;

    draw(false);

    if (!mouse.hasMoved && mouse.strength === 0) {
      settleFrames += 1;

      if (settleFrames > 30) {
        stop();
        return;
      }
    } else {
      settleFrames = 0;
    }

    animationFrame = window.requestAnimationFrame(animate);
  };

  const start = () => {
    if (running || reducedMotion || document.hidden) return;

    running = true;
    animationFrame = window.requestAnimationFrame(animate);
  };

  const stop = () => {
    running = false;
    window.cancelAnimationFrame(animationFrame);
  };

  const scheduleResize = () => {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(resize);
  };

  const onMediaQueryChange = (query, callback) => {
    if (query.addEventListener) {
      query.addEventListener("change", callback);
      return;
    }

    query.addListener(callback);
  };

  const handlePointerMove = (event) => {
    if (reducedMotion) return;

    mouse.x = event.clientX;
    mouse.y = event.clientY;
    mouse.strength = 1;
    mouse.lastMove = performance.now();
    mouse.hasMoved = true;
    settleFrames = 0;
    start();
  };

  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  window.addEventListener("pointerdown", handlePointerMove, { passive: true });
  window.addEventListener("resize", scheduleResize);
  onMediaQueryChange(coarsePointer, scheduleResize);

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", scheduleResize, {
      passive: true,
    });
    window.visualViewport.addEventListener("scroll", scheduleResize, {
      passive: true,
    });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
    } else {
      draw(true);
      if (mouse.hasMoved) start();
    }
  });

  onMediaQueryChange(prefersReducedMotion, (event) => {
    reducedMotion = event.matches;

    if (reducedMotion) {
      stop();
      mouse.strength = 0;
      mouse.hasMoved = false;
      draw(true);
    } else {
      start();
    }
  });

  resize();
})();

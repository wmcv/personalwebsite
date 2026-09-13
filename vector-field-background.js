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
  const hoverPointer = window.matchMedia("(hover: hover)");
  const hoverSelector = [
    ".topbar nav a",
    ".company-link",
    ".post-title",
    ".project-head a.animated-link",
    ".toc-link",
  ].join(", ");

  const mouse = {
    x: 0,
    y: 0,
    strength: 0,
    lastMove: 0,
    hasMoved: false,
  };
  const hover = {
    element: null,
    x: 0,
    y: 0,
    strength: 0,
    targetStrength: 0,
    rectDirty: false,
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

  const canUseHoverInfluence = () =>
    hoverPointer.matches && !coarsePointer.matches && !reducedMotion;

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

  const updateHoverRect = () => {
    if (!hover.element) return;

    const rect = hover.element.getBoundingClientRect();
    hover.x = rect.left + rect.width / 2;
    hover.y = rect.top + rect.height / 2;
    hover.rectDirty = false;
  };

  const blendVortex = (
    originX,
    originY,
    strength,
    maxInfluence,
    sigma,
    x,
    y,
    targetX,
    targetY,
  ) => {
    const dx = x - originX;
    const dy = y - originY;
    const distanceSquared = dx * dx + dy * dy;
    const falloff = Math.exp(-distanceSquared / (2 * sigma * sigma));
    const influence = falloff * strength * maxInfluence;

    if (influence <= 0.001) {
      return [targetX, targetY];
    }

    const swirl = normalize(-dy, dx);
    const mixedX = targetX * (1 - influence) + swirl[0] * influence;
    const mixedY = targetY * (1 - influence) + swirl[1] * influence;

    return normalize(mixedX, mixedY);
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

    if (!staticFrame && hover.element) {
      if (hover.rectDirty) updateHoverRect();

      hover.strength += (hover.targetStrength - hover.strength) * 0.075;

      if (hover.targetStrength === 0 && hover.strength < 0.01) {
        hover.strength = 0;
        hover.element = null;
      }
    }

    for (let index = 0; index < count; index += 1) {
      const x = pointsX[index];
      const y = pointsY[index];
      let targetX = baseX[index];
      let targetY = baseY[index];

      if (!reducedMotion && mouse.strength > 0) {
        const blended = blendVortex(
          mouse.x,
          mouse.y,
          mouse.strength,
          config.maxInfluence,
          config.sigma,
          x,
          y,
          targetX,
          targetY,
        );
        targetX = blended[0];
        targetY = blended[1];
      }

      if (!reducedMotion && hover.strength > 0) {
        const blended = blendVortex(
          hover.x,
          hover.y,
          hover.strength,
          config.maxInfluence * 0.34,
          config.sigma * 0.95,
          x,
          y,
          targetX,
          targetY,
        );
        targetX = blended[0];
        targetY = blended[1];
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

    if (!mouse.hasMoved && mouse.strength === 0 && hover.strength === 0) {
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
    if (hover.element) hover.rectDirty = true;
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

  const setHoverElement = (element) => {
    if (!canUseHoverInfluence()) return;

    hover.element = element;
    hover.targetStrength = 1;
    hover.rectDirty = true;
    settleFrames = 0;
    updateHoverRect();
    start();
  };

  const clearHoverElement = (element, relatedTarget) => {
    if (hover.element !== element) return;
    if (relatedTarget instanceof Node && element.contains(relatedTarget)) return;

    hover.targetStrength = 0;
    hover.rectDirty = false;
    settleFrames = 0;
    start();
  };

  const handlePointerOver = (event) => {
    if (!canUseHoverInfluence() || event.pointerType === "touch") return;

    const element = event.target.closest?.(hoverSelector);
    if (!element) return;

    setHoverElement(element);
  };

  const handlePointerOut = (event) => {
    if (!hover.element) return;

    const element = event.target.closest?.(hoverSelector);
    if (!element) return;

    clearHoverElement(element, event.relatedTarget);
  };

  const handleFocusIn = (event) => {
    const element = event.target.closest?.(hoverSelector);
    if (!element) return;

    setHoverElement(element);
  };

  const handleFocusOut = (event) => {
    if (!hover.element) return;

    const element = event.target.closest?.(hoverSelector);
    if (!element) return;

    clearHoverElement(element, event.relatedTarget);
  };

  const markHoverRectDirty = () => {
    if (!hover.element) return;

    hover.rectDirty = true;
    start();
  };

  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  window.addEventListener("pointerdown", handlePointerMove, { passive: true });
  document.addEventListener("pointerover", handlePointerOver, { passive: true });
  document.addEventListener("pointerout", handlePointerOut, { passive: true });
  document.addEventListener("focusin", handleFocusIn);
  document.addEventListener("focusout", handleFocusOut);
  window.addEventListener("scroll", markHoverRectDirty, { passive: true });
  window.addEventListener("resize", scheduleResize);
  onMediaQueryChange(coarsePointer, scheduleResize);
  onMediaQueryChange(hoverPointer, () => {
    hover.targetStrength = 0;
    hover.rectDirty = false;
    start();
  });

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
      hover.strength = 0;
      hover.targetStrength = 0;
      hover.element = null;
      draw(true);
    } else {
      start();
    }
  });

  resize();
})();

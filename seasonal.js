/* One switch restores the original site, including its vector-field styling. */
const CHRISTMAS_THEME_ENABLED = true;
(() => {
  if (!CHRISTMAS_THEME_ENABLED) return;
  const config = { enabled: true, snow: true, tree: true, fps: 30,
    treeParticles: { desktop: 6200, mobile: 3600 },
    treeDpr: 3, rotationSpeed: 0.048,
    ornamentCount: 18, spiralTurns: 4.5, glowOpacity: 0.18,
    treeScale: 1, snowIntensity: 1,
    grove: { desktopTrees: 7, mobileTrees: 4, scale: 1, spacing: 1, detail: 440 },
    towerScale: 1, snowmanScale: 1,
    snowmanPosition: { desktop: 0.225, mobile: 0.39 },
    weatherDurations: { approach: 5, blizzard: 15, recovery: 2 },
    weatherResponseSeconds: 0.8,
    defaultSnowDepth: { desktop: 290, mobile: 110 },
    driftGrowth: 6, embeddedFraction: 0.12,
    blizzardDensity: 1, windStrength: 245, fogIntensity: 0.6,
  };
  if (!config.enabled || window.portfolioWinter) return;
  document.documentElement.classList.add('winter-season');
  document.documentElement.style.setProperty('--winter-tree-scale', config.treeScale);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 1280px)');
  const snow = document.createElement('canvas');
  snow.className = 'winter-snow';
  snow.setAttribute('aria-hidden', 'true');
  const snowCtx = snow.getContext('2d');
  if (config.snow && snowCtx) document.body.prepend(snow);
  const tree = document.createElement('canvas');
  tree.className = 'winter-tree';
  tree.setAttribute('aria-hidden', 'true');
  const treeCtx = tree.getContext('2d');
  const homepage = Boolean(document.querySelector('#about'));
  const world = document.createElement('div');
  world.className = 'winter-world'; world.setAttribute('aria-hidden', 'true');
  const structures = document.createElement('canvas');
  structures.className = 'winter-structures'; structures.setAttribute('aria-hidden', 'true');
  const structuresCtx = structures.getContext('2d');
  if (homepage) {
    document.body.appendChild(world);
    world.appendChild(structures);
    if (config.tree && treeCtx) world.appendChild(tree);
  }
  const foreground = document.createElement('canvas');
  foreground.className = 'winter-accumulation';
  foreground.setAttribute('aria-hidden', 'true');
  const foregroundCtx = foreground.getContext('2d');
  if (config.snow && foregroundCtx) document.body.appendChild(foreground);
  let geometryDirty = true;
  let treeBounds = null, contentBounds = null, worldBounds = null;
  let snowOrigin = 0, baseSnowDepth = 0, worldDepth = 0;
  let driftObjects = [], snowContour = new Float32Array(0);
  let width = 0, height = 0, flakes = [], frame = 0, last = 0, elapsed = 0;
  let treeVisible = true, disposed = false;
  const abort = new AbortController();
  const events = { signal: abort.signal };
  let seed = 2731;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  // Logical scene dimensions are independent of both CSS size and backing pixels.
  const scene = { width: 360, height: 480, center: 180, top: 59, base: 395 };
  const points = [];
  const palette = ['#346b56', '#568f6b', '#76ab88', '#9bb99d'];
  const foliageCount = compact.matches ? config.treeParticles.mobile : config.treeParticles.desktop;
  const tiers = Array.from({ length: 7 }, (_, i) => ({
    top: 59 + i * 41, height: 66 + i * 3.5, radius: 22 + i * 14.5,
  }));
  // Seven overlapping, flared surfaces replace the old single conical shell.
  const surfaceRadius = (tier, t, angle) =>
    tier.radius * Math.pow(t, 0.72) * (1 + 0.045 * Math.cos(angle * 7 + tier.top));
  const radiusAt = t => {
    const y = scene.top + t * (scene.base - scene.top);
    let radius = 1;
    for (const tier of tiers) {
      const local = (y - tier.top) / tier.height;
      if (local >= 0 && local <= 1.04) radius = Math.max(radius, surfaceRadius(tier, Math.min(local, 1), 0));
    }
    return radius;
  };
  for (let level = 0; level < tiers.length; level++) {
    const tier = tiers[level];
    const count = Math.round(foliageCount * (0.55 + level * 0.16) / 7.21);
    for (let i = 0; i < count; i++) {
      const t = Math.sqrt((i + 0.5) / count);
      const angle = i * 2.3999632297 + level * 0.47;
      // Small radial clusters and faceted lips keep the geometry intentional.
      const radius = surfaceRadius(tier, t, angle) * (0.86 + random() * 0.14);
      points.push({ y: tier.top + t * tier.height + Math.pow(t, 7) * Math.cos(angle * 7) * 2.5,
        radius, angle, size: 0.65 + random() * 0.45, shine: random(), kind: 0,
        color: palette[(i + level) % palette.length] });
    }
    // The scalloped lower rim makes every tier legible at normal display size.
    for (let i = 0; i < 180; i++) {
      const angle = i / 180 * Math.PI * 2;
      points.push({ y: tier.top + tier.height + Math.cos(angle * 7) * 2.5,
        radius: surfaceRadius(tier, 1, angle), angle, size: 0.65,
        shine: 0.8, kind: 4, color: '#78a88a' });
    }
  }
  for (let i = 0; i <= 550; i++) {
    const t = 0.035 + i / 550 * 0.96;
    points.push({ y: scene.top + t * (scene.base - scene.top),
      radius: radiusAt(t) + 2, angle: t * Math.PI * 2 * config.spiralTurns,
      size: i % 22 === 0 ? 1.25 : 0.6, shine: 0.8,
      kind: i % 22 === 0 ? 1 : 3 });
  }
  for (let i = 0; i < config.ornamentCount; i++) {
    const tier = tiers[1 + i % 6];
    const t = 0.74 + (i % 3) * 0.06;
    const angle = i * 2.39996 + 0.6;
    points.push({ y: tier.top + t * tier.height,
      radius: surfaceRadius(tier, t, angle) + 2, angle,
      size: i % 3 === 0 ? 2.5 : 2.8, shine: 0.8, kind: 2,
      color: i % 3 === 0 ? '#c7b17c' : '#ac635b', gold: i % 3 === 0 });
  }
  for (const point of points) {
    point.modelX = Math.cos(point.angle) * point.radius;
    point.modelZ = Math.sin(point.angle) * point.radius;
  }
  const projected = points.map(point => ({ x: 0, y: 0, z: 0, alpha: 0, point }));
  const weatherTargets = {
    approach: { density: 0.5, wind: 65, speed: 1.45, opacity: 0.7, fog: 0.35 },
    blizzard: { density: config.blizzardDensity, wind: config.windStrength, speed: 2.6, opacity: 0.85, fog: 0.85 },
  };
  const weatherPhases = ['approach', 'blizzard', 'recovery'];
  let phaseIndex = 0;
  let phaseElapsed = 0;
  let recoveryStart = { ...weatherTargets.blizzard };
  const weather = { state: 'approach', ...weatherTargets.approach,
    remaining: config.weatherDurations.approach, forced: false, snowDepth: innerWidth <= 900 ? config.defaultSnowDepth.mobile : config.defaultSnowDepth.desktop };
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const mist = document.createElement('canvas');
  mist.width = 256; mist.height = 96;
  const mistCtx = mist.getContext('2d');
  if (mistCtx) {
    mistCtx.setTransform(1, 0, 0, 0.375, 0, 0);
    const gradient = mistCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(157,183,194,.22)');
    gradient.addColorStop(0.45, 'rgba(141,165,179,.10)');
    gradient.addColorStop(1, 'rgba(141,165,179,0)');
    mistCtx.fillStyle = gradient; mistCtx.fillRect(0, 0, 256, 256);
  }
  function updateWeather(dt) {
    const keys = ['density', 'wind', 'speed', 'opacity', 'fog'];
    if (weather.forced) {
      const target = weather.state === 'recovery' ? weatherTargets.approach : weatherTargets[weather.state];
      const blend = 1 - Math.exp(-dt / config.weatherResponseSeconds);
      for (const key of keys) weather[key] += (target[key] - weather[key]) * blend;
    } else {
      phaseElapsed += dt;
      while (phaseElapsed >= config.weatherDurations[weatherPhases[phaseIndex]]) {
        phaseElapsed -= config.weatherDurations[weatherPhases[phaseIndex]];
        phaseIndex = (phaseIndex + 1) % weatherPhases.length;
        if (weatherPhases[phaseIndex] === 'recovery') recoveryStart = { ...weatherTargets.blizzard };
      }
      weather.state = weatherPhases[phaseIndex];
      const duration = config.weatherDurations[weather.state];
      weather.remaining = duration - phaseElapsed;
      const t = Math.min(1, phaseElapsed / duration);
      // Smoothstep reaches both endpoints with zero slope: approach builds to
      // the full peak, and recovery finishes at the next moderate approach.
      const ease = t * t * (3 - 2 * t);
      const from = weather.state === 'recovery' ? recoveryStart : weatherTargets.approach;
      const to = weather.state === 'approach' || weather.state === 'blizzard'
        ? weatherTargets.blizzard : weatherTargets.approach;
      const mix = weather.state === 'blizzard' ? 1 : ease;
      for (const key of keys) weather[key] = from[key] + (to[key] - from[key]) * mix;
    }
    // This is a settled landscape; only a few pixels gather over time.
    const added = config.driftGrowth * (1 - Math.exp(-elapsed / 180));
    weather.snowDepth = baseSnowDepth + added;
  }
  function refreshGeometry() {
    worldBounds = world.isConnected ? world.getBoundingClientRect() : null;
    treeBounds = tree.isConnected ? tree.getBoundingClientRect() : null;
    contentBounds = document.querySelector('.page')?.getBoundingClientRect() || null;
    snowOrigin = innerWidth <= 900 && worldBounds ? worldBounds.bottom : height;
    geometryDirty = false;
  }
  function sizeCanvas(canvas, ctx, w, h, dpr) {
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function resize() {
    width = innerWidth; height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, compact.matches ? 1.5 : 2);
    if (snowCtx) sizeCanvas(snow, snowCtx, width, height, dpr);
    if (foregroundCtx) sizeCanvas(foreground, foregroundCtx, width, height, dpr);
    const mobile = innerWidth <= 900;
    baseSnowDepth = Math.min(config.defaultSnowDepth[mobile ? 'mobile' : 'desktop'], height * (mobile ? 0.2 : 0.38));
    document.documentElement.style.setProperty('--winter-ground-depth', `${baseSnowDepth}px`);
    // Bottom offset places the rendered branch base 12% below the ground.
    const treeWidth = tree.isConnected ? tree.getBoundingClientRect().width : 0;
    const treeHeight = treeWidth * scene.height / scene.width;
    const buried = treeHeight * (scene.base - 43) / scene.height * config.embeddedFraction;
    tree.style.bottom = `${baseSnowDepth - treeHeight * (1 - scene.base / scene.height) - buried}px`;
    refreshGeometry();
    if (structuresCtx && worldBounds) {
      worldDepth = worldBounds.height;
      sizeCanvas(structures, structuresCtx, worldBounds.width, worldDepth, dpr);
      renderStructures();
    } else {
      driftObjects = []; cacheSnowContour();
    }
    if (treeCtx && tree.isConnected) {
      const bounds = tree.getBoundingClientRect();
      const treeScale = Math.min(devicePixelRatio || 1, config.treeDpr) * bounds.width / scene.width;
      sizeCanvas(tree, treeCtx, scene.width, scene.height, treeScale);
    }
    const count = Math.min(compact.matches ? 140 : 420, Math.max(50, Math.round(width * height / (compact.matches ? 3600 : 4200))));
    flakes = Array.from({ length: count }, () => ({ x: random() * width, y: random() * height,
      r: 0.35 + random() * 1.2, speed: 12 + random() * 29, phase: random() * 6.28,
      alpha: 0.12 + random() * 0.32 }));
    renderTree(); renderSnow(0); start();
  }
  function cacheSnowContour() {
    const mobile = innerWidth <= 900;
    const step = 4;
    const field = new Float32Array(Math.ceil(width / step) + 1);
    const center = treeBounds ? treeBounds.left + treeBounds.width / 2 : width / 2;
    const profile = x => 2.5 * Math.sin(x / 125) + 1.5 * Math.cos(x / 67);
    const objects = [...driftObjects];
    if (treeBounds) objects.push({ x: center, spread: treeBounds.width * 0.24, rise: mobile ? 4 : 9 });
    if (homepage) objects.push({ x: width * config.snowmanPosition[mobile ? 'mobile' : 'desktop'],
      spread: mobile ? 19 : 28, rise: mobile ? 2.5 : 5 });
    let mean = 0;
    for (let i = 0; i < field.length; i++) {
      const x = i * step;
      let rise = 0;
      for (const object of objects) {
        const offset = (x - object.x) / Math.max(8, object.spread);
        rise += object.rise * Math.exp(-0.5 * offset * offset);
      }
      field[i] = Math.min(mobile ? 6 : 12, rise);
      mean += field[i];
    }
    mean /= field.length;
    // Zero-mean local buildup preserves the existing average snow coverage.
    for (let i = 0; i < field.length; i++) field[i] += profile(i * step) - profile(center) - mean;
    snowContour = field;
  }
  function snowbankHeight(x) {
    if (!snowContour.length) return weather.snowDepth;
    const sample = Math.max(0, Math.min(snowContour.length - 1, x / 4));
    const index = Math.floor(sample), fraction = sample - index;
    const a = snowContour[index], b = snowContour[Math.min(index + 1, snowContour.length - 1)];
    return weather.snowDepth + a + (b - a) * fraction;
  }
  function surfaceAt(x) { return snowOrigin - snowbankHeight(x); }
  function renderAccumulation() {
    if (!foregroundCtx || !config.snow) return;
    const ctx = foregroundCtx;
    ctx.clearRect(0, 0, width, height);
    const surface = surfaceAt(width / 2);
    if (surface > height + 8) return;
    // Opaque interior is painted after all decorative canvases; only the lip is soft.
    const bank = ctx.createLinearGradient(0, surface - 4, 0, Math.max(surface + 70, height));
    bank.addColorStop(0, '#3b4b56'); bank.addColorStop(0.06, '#2b3a45');
    bank.addColorStop(0.35, '#24333e'); bank.addColorStop(1, '#202d37');
    ctx.fillStyle = bank;
    for (let layer = 3; layer >= 0; layer--) {
      ctx.globalAlpha = layer === 0 ? 1 : 0.09;
      ctx.beginPath(); ctx.moveTo(0, height);
      for (let x = 0; x <= width + 6; x += 6) ctx.lineTo(x, surfaceAt(x) - layer);
      ctx.lineTo(width, height); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    renderSnowman(ctx);
    // A handful of near-field flakes drift in front of the landscape as well.
    if (!motion.matches) {
      ctx.fillStyle = '#dce7e9'; ctx.globalAlpha = 0.16;
      for (let i = 0; i < (innerWidth <= 900 ? 4 : 10); i++) {
        const x = ((i * 173 + elapsed * weather.wind * 0.25) % (width + 20)) - 10;
        const y = surfaceAt(x) + 12 + ((i * 43 + elapsed * 13) % Math.max(20, weather.snowDepth - 25));
        ctx.fillRect(x, y, 0.9, 0.9);
      }
      ctx.globalAlpha = 1;
    }
  }
  function drawFir(ctx, x, ground, height, index, decorated = false, depth = 1) {
    const noise = n => {
      const value = Math.sin((index + 1) * 127.1 + n * 311.7) * 43758.5453;
      return value - Math.floor(value);
    };
    ctx.save(); ctx.translate(x, ground + 3);
    ctx.globalAlpha = 0.48 + depth * 0.52;
    const halfWidth = height * (0.235 + noise(1) * 0.09);
    const lean = (noise(2) - 0.5) * height * 0.035;
    const shoulders = [];
    const tierCount = 6 + index % 2;
    for (let tier = 0; tier < tierCount; tier++) {
      const t = 0.20 + tier / (tierCount - 1) * 0.82 + (noise(tier + 3) - 0.5) * 0.032;
      shoulders.push({ y: -height + height * t,
        radius: halfWidth * Math.pow(t, 0.88) * (0.88 + noise(tier + 12) * 0.16),
        sag: height * (0.013 + noise(tier + 24) * 0.012) });
    }
    // One continuous, asymmetric outline: rounded branch shoulders, soft notches,
    // and a slender crown replace identical stacked triangles.
    const silhouette = new Path2D();
    silhouette.moveTo(lean, -height);
    for (let tier = 0; tier < shoulders.length; tier++) {
      const p = shoulders[tier];
      const side = 0.92 + noise(tier + 34) * 0.13;
      const tip = -p.radius * side;
      silhouette.bezierCurveTo(tip * 0.43, p.y - height * 0.085,
        tip * 0.68, p.y - p.sag, tip, p.y + p.sag);
      if (tier < shoulders.length - 1) silhouette.quadraticCurveTo(tip * 0.83,
        p.y + p.sag * 0.85, tip * 0.66, p.y + p.sag * 0.2);
    }
    const last = shoulders[shoulders.length - 1];
    silhouette.quadraticCurveTo(0, last.y + last.sag * 0.5, last.radius, last.y + last.sag);
    for (let tier = shoulders.length - 1; tier >= 0; tier--) {
      const p = shoulders[tier];
      const next = tier ? shoulders[tier - 1] : { radius: 0, y: -height, sag: 0 };
      silhouette.quadraticCurveTo(p.radius * 0.73, p.y - p.sag * 0.3,
        p.radius * 0.68, p.y - p.sag * 0.7);
      silhouette.bezierCurveTo(next.radius * 0.72, next.y + next.sag * 0.9,
        next.radius * 0.60, next.y - next.sag * 0.2,
        tier ? next.radius : lean, next.y + next.sag);
    }
    silhouette.closePath();
    const tone = ctx.createLinearGradient(-halfWidth, 0, halfWidth, 0);
    tone.addColorStop(0, '#172e28'); tone.addColorStop(0.45, '#2c4b3c');
    tone.addColorStop(1, '#19362d');
    ctx.fillStyle = tone; ctx.fill(silhouette);
    ctx.save(); ctx.clip(silhouette);
    for (let tier = 0; tier < shoulders.length; tier++) {
      const p = shoulders[tier];
      ctx.strokeStyle = 'rgba(137,168,145,.13)'; ctx.lineWidth = 0.55;
      ctx.beginPath(); ctx.moveTo(-p.radius, p.y + p.sag);
      ctx.bezierCurveTo(-p.radius * 0.45, p.y - p.sag,
        p.radius * 0.35, p.y - p.sag * 0.35, p.radius, p.y + p.sag * 0.8); ctx.stroke();
    }
    const particleColors = ['#6d9f81', '#8bb296', '#3d6d55'];
    for (let i = 0; i < config.grove.detail; i++) {
      const tier = Math.min(shoulders.length - 1, Math.floor(noise(i + 60) * shoulders.length));
      const p = shoulders[tier];
      const u = noise(i + 360), v = noise(i + 810);
      // Denser branch shoulders, with small quiet gaps under their overhangs.
      if (v > 0.62 + noise(tier + 500) * 0.32) continue;
      const px = (u * 2 - 1) * p.radius;
      const py = p.y - p.sag * (0.7 + v * 2.2) + noise(i + 1200) * height * 0.035;
      const size = 0.4 + noise(i + 1500) * 0.3;
      ctx.globalAlpha = (0.48 + depth * 0.52) * (0.18 + noise(i + 1800) * 0.22);
      ctx.fillStyle = particleColors[i % particleColors.length];
      ctx.fillRect(px, py, size, size * (i % 4 === 0 ? 1.4 : 1));
    }
    ctx.globalAlpha = 0.48 + depth * 0.52;
    if (decorated) {
      ctx.fillStyle = '#b3a171';
      for (let i = 0; i < 7; i++) {
        const t = 0.3 + i * 0.09;
        ctx.beginPath(); ctx.arc(Math.sin(i * 2.4) * halfWidth * t * 0.75,
          -height + height * t, 0.8, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore(); ctx.restore();
  }
  function renderStructures() {
    if (!structuresCtx || !worldBounds) return;
    const ctx = structuresCtx;
    const mobile = innerWidth <= 900;
    const scale = (mobile ? Math.min(0.72, width / 520) * 0.9 : Math.min(1, (width - 548) / 650)) * config.towerScale;
    const towerX = mobile ? width * 0.17 : (width - 548) * 0.24;
    const ground = worldDepth - baseSnowDepth;
    ctx.clearRect(0, 0, worldBounds.width, worldDepth);
    driftObjects = [{ x: towerX, spread: 49 * scale, rise: mobile ? 4.5 : 10 }];
    // Three uneven clusters and an isolated distant fir leave open snow between them.
    const desktopGrove = [
      [0.070, 78, 0.095, 0.55], [0.095, 126, 0.095, 0.92], [0.185, 84, 0.185, 1],
      [0.465, 32, 0.465, 0.35], [0.735, 66, 0.759, 0.50], [0.759, 116, 0.759, 0.95], [0.94, 144, 0.94, 0.80],
    ];
    const mobileGrove = [[0.035, 38, 0.17, 0.5], [0.295, 68, 0.17, 1], [0.54, 34, 0.69, 0.45], [0.925, 64, 0.78, 0.85]];
    const anchors = mobile ? mobileGrove : desktopGrove;
    const count = Math.max(0, Math.min(anchors.length, mobile ? config.grove.mobileTrees : config.grove.desktopTrees));
    const renderGroveTree = i => {
      const [position, size, cluster, depth] = anchors[i];
      const x = (cluster + (position - cluster) * config.grove.spacing) * width;
      const height = size * config.grove.scale * (mobile ? Math.min(1, width / 390) : Math.min(1, width / 1440));
      driftObjects.push({ x, spread: Math.max(12, height * 0.3),
        rise: (mobile ? 2 : 3.5) + depth * (mobile ? 1.5 : 3) });
      // Tiny distant trees stay below the existing footer, not behind its text.
      drawFir(ctx, x, ground + (depth < 0.7 ? -1 : 2), height, i, !mobile && i === 5, depth);
    };
    for (let i = 0; i < count; i++) if (mobile ? i !== 1 : i !== 2) renderGroveTree(i);
    ctx.save(); ctx.translate(towerX, ground + 42 * scale); ctx.scale(scale, scale);
    ctx.rotate(-9 * Math.PI / 180);
    const polygon = (points, fill) => {
      ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(...points[0]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i]);
      ctx.closePath(); ctx.fill();
    };
    // Tapered front and recessed side planes share perspective-mapped glazing.
    const facade = ctx.createLinearGradient(-40, 0, 38, 0);
    facade.addColorStop(0, '#1c2b36'); facade.addColorStop(0.65, '#2c3d49');
    facade.addColorStop(1, '#334651');
    polygon([[-40,-305],[31,-316],[38,28],[-40,28]], facade);
    polygon([[31,-316],[55,-298],[60,22],[38,28]], '#13212c');
    polygon([[-40,-305],[-19,-323],[55,-298],[31,-316]], '#4b5c65');
    polygon([[-19,-323],[10,-329],[29,-315],[-1,-311]], '#344650');
    polygon([[-19,-323],[-1,-311],[-1,-302],[-19,-312]], '#1d2c37');
    const point = (u, v) => ({ x: -40 + (71 + 7 * v) * u, y: (-305 - u * 11) * (1 - v) + 28 * v });
    const line = (a, b, color, weight = 0.65) => {
      ctx.strokeStyle = color; ctx.lineWidth = weight;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    };
    for (let col = 0; col <= 4; col++) line(point(0.10 + col * 0.20, 0.15), point(0.10 + col * 0.20, 0.98), '#52636e', 0.45);
    for (let row = 0; row < 14; row++) {
      const v = 0.17 + row * 0.056;
      line(point(0.07,v + 0.045), point(0.94,v + 0.045), '#41515c', 0.45);
      for (let col = 0; col < 4; col++) {
        const u = 0.13 + col * 0.20;
        const lit = (row === 2 && col === 2) || (row === 6 && col === 0) ||
          (row === 9 && col === 3) || (row === 11 && col === 1);
        const corners = [point(u,v), point(u + 0.135,v), point(u + 0.135,v + 0.034), point(u,v + 0.034)];
        polygon(corners.map(p => [p.x,p.y]), lit ? '#b8a777' : (row + col) % 5 === 0 ? '#344954' : '#172933');
        if (lit) line(corners[0], corners[1], '#d1c195', 0.8);
      }
      const sy = -281 + row * 20;
      polygon([[39,sy],[48,sy + 4],[48,sy + 12],[39,sy + 8]], '#263844');
    }
    line(point(0,0), point(1,0), '#a7b9be', 2.5);
    line({x:-19,y:-323},{x:10,y:-329},'#a6b8bd',2);
    line({x:31,y:-316},{x:55,y:-298},'#617680',1.3);
    for (const v of [0.39,0.73]) {
      line(point(-0.03,v), point(1.03,v), '#7d939b', 1.7);
      line(point(-0.03,v + 0.009), point(1.03,v + 0.009), '#15232d', 1.4);
    }
    line(point(0,0.02),point(0,0.98),'#617781',0.7);
    line(point(1,0),point(1,0.98),'#667c85',0.8);
    line({x:15,y:-327},{x:15,y:-346},'#7c8d95',0.8);
    ctx.save(); ctx.translate(-3,-275); ctx.rotate(-0.09);
    ctx.fillStyle = '#bdc7c9'; ctx.font = '500 12px Inter, sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('senpilot', 0, 0); ctx.restore();
    ctx.restore();
    // One foreground sapling nestles against the buried tower instead of a hard edge.
    if (mobile && count > 1) renderGroveTree(1);
    else if (count > 2) renderGroveTree(2);
    cacheSnowContour();
  }
  function renderSnowman(ctx) {
    if (!homepage || !worldBounds) return;
    const mobile = innerWidth <= 900;
    const x = width * config.snowmanPosition[mobile ? 'mobile' : 'desktop'];
    let ground = surfaceAt(x) + (mobile ? 19 : 23);
    if (!mobile && contentBounds && x > contentBounds.left - 20 && x < contentBounds.right + 20) {
      ground = Math.max(ground, contentBounds.bottom + 34);
    }
    if (ground > height - 12 || ground < -36) return;
    const scale = (mobile ? 0.95 : 1.05) * config.snowmanScale;
    ctx.save(); ctx.translate(x, ground); ctx.scale(scale, scale);
    // A small contact shadow and clipped lower edge seat both snowballs in snow.
    ctx.fillStyle = 'rgba(13,26,33,.25)';
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 1.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.rect(-14, -34, 30, 34); ctx.clip();
    const body = ctx.createRadialGradient(-3, -13, 1, 0, -8, 11);
    body.addColorStop(0, '#b2bec3'); body.addColorStop(1, '#8fa3ae');
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(0, -8, 10, 0, Math.PI * 2); ctx.fill();
    const head = ctx.createRadialGradient(-1, -25, 0.5, 1, -22.5, 6.1);
    head.addColorStop(0, '#c1cbd0'); head.addColorStop(1, '#9daeb8');
    ctx.fillStyle = head; ctx.beginPath(); ctx.arc(1, -22.5, 5.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#26343d';
    ctx.beginPath(); ctx.arc(-0.8, -24, 0.65, 0, Math.PI * 2);
    ctx.arc(2.6, -24, 0.65, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b49c6c'; ctx.beginPath(); ctx.moveTo(3.3, -22.4);
    ctx.lineTo(6.6, -21.7); ctx.lineTo(3.3, -21); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function renderSnow(dt, elapsedDt = dt) {
    if (!config.snow || !snowCtx) return;
    const ctx = snowCtx;
    ctx.clearRect(0, 0, width, height);
    if (geometryDirty) refreshGeometry();
    if (motion.matches) { updateWeather(0); renderAccumulation(); return; }
    updateWeather(elapsedDt);
    const gust = Math.sin(elapsed * 0.55) * 0.3 + Math.sin(elapsed * 0.19) * 0.2;
    const active = flakes.length * Math.min(1, weather.density * config.snowIntensity);
    ctx.fillStyle = '#dfebee'; ctx.strokeStyle = '#dfebee'; ctx.lineCap = 'round';
    for (let index = 0; index < flakes.length; index++) {
      const flake = flakes[index];
      const depth = 0.4 + flake.r * 0.55;
      const vx = weather.wind * depth * (1 + gust) + Math.sin(elapsed * 0.26 + flake.phase) * 5;
      const vy = flake.speed * weather.speed;
      flake.y += vy * dt;
      flake.x = (flake.x + vx * dt + width + 16) % (width + 16);
      const ground = Math.min(height + 4, surfaceAt(flake.x));
      if (flake.y >= ground) flake.y = -4 - random() * 12;
      const settling = clamp((ground - flake.y) / 7, 0, 1);
      const fade = clamp((active - index) / 10, 0, 1) * settling;
      if (!fade) continue;
      ctx.globalAlpha = flake.alpha * weather.opacity * fade;
      if (weather.wind > 90 && flake.r > 0.8) {
        ctx.lineWidth = flake.r * 0.65;
        ctx.beginPath(); ctx.moveTo(flake.x, flake.y);
        ctx.lineTo(flake.x - vx * 0.035, flake.y - vy * 0.035); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Cached low-resolution mist sprite, stretched softly along the ground.
    if (mistCtx) {
      ctx.globalAlpha = config.fogIntensity * weather.fog * (0.55 + Math.sin(elapsed * 0.09) * 0.25);
      const drift = Math.sin(elapsed * 0.035) * width * 0.18;
      ctx.drawImage(mist, -width * 0.25 + drift, surfaceAt(width * 0.25) - 80, width * 0.95, 110);
      ctx.drawImage(mist, width * 0.35 - drift, surfaceAt(width * 0.75) - 65, width * 0.85, 95);
    }
    ctx.globalAlpha = 1;
    renderAccumulation();
  }

  function renderTree() {
    if (!config.tree || !homepage || !treeCtx || !treeVisible) return;
    const ctx = treeCtx;
    ctx.clearRect(0, 0, scene.width, scene.height);
    const reveal = motion.matches ? 1 : Math.min(1, elapsed / 3.2);
    const rotation = motion.matches ? 0.4 : elapsed * config.rotationSpeed;
    ctx.globalAlpha = reveal;
    const ambient = ctx.createRadialGradient(scene.center, 290, 10, scene.center, 290, 145);
    ambient.addColorStop(0, 'rgba(168,145,86,.035)');
    ambient.addColorStop(1, 'rgba(168,145,86,0)');
    ctx.fillStyle = ambient; ctx.fillRect(20, 140, 320, 310);
    // Lower branches are occluded by the shared foreground snow surface.
    const cos = Math.cos(rotation), sin = Math.sin(rotation);
    for (const out of projected) {
      const p = out.point;
      const x = p.modelX, z = p.modelZ;
      out.z = z * cos + x * sin;
      const perspective = 1;
      out.x = scene.center + (x * cos - z * sin) * perspective;
      out.y = 234 + (p.y - 234 - out.z * 0.065) * perspective;
      out.alpha = Math.max(0, Math.min(1, (reveal - (1 - (p.y - scene.top) / 350) * 0.72) * 4));
    }
    projected.sort((a, b) => a.z - b.z);
    for (const out of projected) {
      const p = out.point;
      if (!out.alpha) continue;
      const depth = Math.max(0.22, Math.min(1, 0.65 + out.z / 190));
      const front = out.z > -p.radius * 0.12;
      if (p.kind && !front) continue;
      ctx.globalAlpha = out.alpha * (p.kind ? 1 : depth * (0.65 + p.shine * 0.35));
      if (p.kind === 2) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        if (p.gold) {
          ctx.moveTo(out.x, out.y - p.size); ctx.lineTo(out.x + p.size, out.y);
          ctx.lineTo(out.x, out.y + p.size); ctx.lineTo(out.x - p.size, out.y); ctx.closePath();
        } else ctx.arc(out.x, out.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 1) {
        // Constant light intensity keeps rotation as the only ongoing tree motion.
        ctx.fillStyle = '#c9b582';
        ctx.globalAlpha = out.alpha * config.glowOpacity;
        ctx.beginPath(); ctx.arc(out.x, out.y, 2.8, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = out.alpha * 0.8;
        ctx.beginPath(); ctx.arc(out.x, out.y, p.size * 0.7, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = p.kind === 3 ? '#9e8f6c' : p.color;
        if (p.kind === 3) ctx.globalAlpha *= 0.9;
        if (p.kind === 4) ctx.globalAlpha *= 0.52;
        const size = p.size * (0.86 + depth * 0.3);
        ctx.fillRect(out.x - size / 2, out.y - size / 2, size, size);
      }
    }
    // A thin four-point star echoes the site's small geometric section markers.
    ctx.globalAlpha = Math.max(0, (reveal - 0.7) / 0.3);
    const starY = scene.top - 12;
    const halo = ctx.createRadialGradient(scene.center, starY, 1, scene.center, starY, 15);
    halo.addColorStop(0, 'rgba(209,184,120,.18)');
    halo.addColorStop(1, 'rgba(209,184,120,0)');
    ctx.fillStyle = halo; ctx.fillRect(scene.center - 15, starY - 15, 30, 30);
    ctx.fillStyle = '#d3bf8b'; ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 4, r = i % 2 ? 1.8 : 6.5;
      const x = scene.center + Math.cos(a) * r, y = starY + Math.sin(a) * r;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  }
  function tick(now) {
    frame = 0;
    if (document.hidden || disposed) return;
    if (now - last >= 1000 / config.fps) {
      const elapsedDt = Math.max(0, (now - last) / 1000 || 0);
      const dt = Math.min(elapsedDt, 0.05);
      last = now; elapsed += elapsedDt;
      renderSnow(dt, elapsedDt); renderTree();
    }
    start();
  }
  function start() {
    if (!frame && !disposed && !document.hidden && !motion.matches) frame = requestAnimationFrame(tick);
  }
  function stop() { cancelAnimationFrame(frame); frame = 0; last = performance.now(); }
  function onVisibility() { stop(); if (!document.hidden) start(); }
  function onMotion() { stop(); renderSnow(0); renderTree(); start(); }
  let resizeTimer;
  function onResize() { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 120); }
  addEventListener('resize', onResize, events);
  addEventListener('scroll', () => { geometryDirty = true; if (motion.matches) renderSnow(0); }, { ...events, passive: true });
  document.addEventListener('visibilitychange', onVisibility, events);
  motion.addEventListener('change', onMotion, events);
  const observer = new IntersectionObserver(entries => {
    treeVisible = entries[0].isIntersecting;
    if (treeVisible) renderTree();
  });
  if (tree.isConnected) observer.observe(tree);
  window.portfolioWinter = {
    config,
    // Preview hooks also make weather transitions reproducible for browser QA.
    get weather() { return { ...weather }; },
    setWeather(state = 'auto') {
      if (state === 'auto') {
        recoveryStart = { ...weather }; phaseIndex = 2; phaseElapsed = 0;
        weather.forced = false; start(); return;
      }
      if (!weatherTargets[state] && state !== 'recovery') throw new Error('Unknown winter weather state');
      weather.state = state; weather.forced = true; start();
    },
    destroy() {
      disposed = true; stop(); clearTimeout(resizeTimer); abort.abort(); observer.disconnect();
      snow.remove(); world.remove(); foreground.remove(); document.documentElement.classList.remove('winter-season');
      document.documentElement.style.removeProperty('--winter-tree-scale');
      document.documentElement.style.removeProperty('--winter-ground-depth');
      delete window.portfolioWinter;
    },
  };
  addEventListener('pagehide', stop, events);
  addEventListener('pageshow', start, events);
  resize();
  document.fonts?.ready.then(() => {
    if (!disposed) { refreshGeometry(); renderStructures(); renderSnow(0); }
  });
})();

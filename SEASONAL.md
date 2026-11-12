# Frozen Christmas grove

The presentation is isolated in `seasonal.js` and `seasonal.css`. All seven HTML
pages load the same modules. Existing portfolio content, routes, font metrics,
container width, centering and spacing are unchanged.

## Master switch

At the very top of `seasonal.js`:

```js
const CHRISTMAS_THEME_ENABLED = true;
```

Change it to `false` and reload to restore the normal website. The module returns
before creating elements, classes, observers, timers or event listeners. The
original vector field remains active with its original opacity and colors. All
seasonal CSS (including small name icicles) is scoped to `winter-season`, which
is never added in disabled mode. No HTML or stylesheet changes are needed.

`portfolioWinter.destroy()` also removes the current scene, canvases, seasonal
class, CSS variables, observers, animation frames and listeners at runtime.

## Composition

The homepage has one world container: viewport-fixed on desktop and placed after
the complete portfolio (including its footer) on mobile. A cached structure
canvas draws the Senpilot tower and the smaller grove trees; the existing
particle-tree canvas remains the taller decorated tree on the right. Mobile uses the same scene, with smaller objects and a 360px decorative
area. Nothing inside the original `.page` is moved or resized.

The Senpilot tower now has a tapered front facade, recessed side plane, angled
roof and setback penthouse. Window panels and mullions map into the perspective
of the front face; the side has a separate dark glazing strip. Four warm window
panels, thin snow-covered ledges and a small wordmark preserve the abandoned
character. The tower stays tilted nine degrees, buried at its base, and static.

Desktop adds seven smaller trees: three on the left, three on the right, and one
tiny distant tree between the clusters. Including the animated main tree there
are eight trees total, with only two carrying lights. Mobile adds four smaller
trees for five total; only the main tree is decorated. The smaller firs use continuous curved silhouettes with six or seven varied
branch shoulders, seeded asymmetric taper and lean, and different slim/full
profiles. Muted directional shading, faint tier strokes, clipped surface points
and per-tree atmospheric opacity provide depth without realistic needles.
Tree pairs overlap around the tower and main tree, leaving open snow between
clusters; the tiny middle fir remains distant and darker. Their geometry is cached on the structures canvas, not animated
in separate loops. A small foreground sapling grows against the buried tower.
The tiny two-snowball snowman now sits beside the left cluster. A clearer neck,
slightly fuller lower snowball, distinct head, two dark eyes and a small muted
gold nose improve recognition. A faint contact shadow and clipped lower edge
seat it in the snow. Its size stays below about 30px at the default scale.

The tree retains its seven flared particle tiers, ornaments, garland and slow
0.048 rad/s rotation. Its bottom is raised to embed approximately 12% of the
branch height below the shared snow surface. The old detached base orbit is
removed. Neither the tower nor the tree has an exposed bottom edge.

## Ground and layers

Snow begins as a stable substantial field: configured depth 290px on desktop,
110px within the mobile world. Depth is capped relative to viewport height for
small screens. Only a subtle 6px maximum drift can gather over time; the former
90-second burial demonstration is removed.

Layer order:

1. Original vector field at z-index 0.
2. Tower and tree within `winter-world` at z-index 0.
3. Falling snow and ground mist at z-index 1.
4. Continuous opaque snow foreground and snowman at z-index 2.
5. Original portfolio content at z-index 3.

The snow is opaque cool grey-blue with a soft uneven lip and dark interior to
preserve contrast. There is no destination-out cutout, rounded content card or
mask halo. A few low-opacity foreground flakes add depth over the snowman and
field. Canvases and the world container all have pointer-events:none.

Two tiny geometric icicles beneath the existing name add a restrained accent.
They are absolutely positioned, do not affect text metrics, and disappear with
the seasonal class. The font family, size and weight remain unchanged.

## Configuration

Near the top of `seasonal.js`:

- `CHRISTMAS_THEME_ENABLED`: the complete presentation switch.
- `config.defaultSnowDepth.desktop` / `.mobile`: settled ground depth, 290 / 110px.
- `config.driftGrowth`: maximum additional snow, default 6px.
- `config.embeddedFraction`: tree branch height submerged, default 0.12.
- `config.treeScale`: main tree width multiplier, still limited by available side space.
- `config.grove.desktopTrees` / `.mobileTrees`: smaller-tree counts, default 7 / 4;
  these can be reduced down to 0 and are capped by the configured anchor slots.
- `config.grove.scale`: smaller-tree height multiplier, default 1.
- `config.grove.spacing`: spread within the clusters, default 1.
- `config.grove.detail`: surface points per smaller tree, default 440.
- `config.towerScale`: building scale, default 1.
- `config.snowmanScale`: snowman size multiplier, default 1.
- `config.snowmanPosition`: x position as a fraction of viewport width,
  desktop 0.225 / mobile 0.39 by default.
- `desktopGrove` / `mobileGrove` inside `renderStructures`: anchor lists of
  [horizontal fraction, height, cluster center, depth (0–1)] for exact composition adjustments.
- `config.treeParticles`: desktop / compact surface detail, 6200 / 3600 points.
- `config.rotationSpeed`: 0.048 radians/second.
- `config.spiralTurns`, `ornamentCount`, `glowOpacity`: tree decoration controls.
- `config.weatherDurations`: approach 5s, blizzard 15s, recovery 2s.
- `config.snowIntensity`, `blizzardDensity`, `windStrength`, `fogIntensity`: weather.

Weather repeats continuously without a calm phase. Smoothstep interpolation
connects moderate approach to a full 15-second peak and a two-second recovery.
Natural gusts and particle motion continue across phase boundaries.

Console previews:

```js
portfolioWinter.setWeather('blizzard'); // approach, recovery or auto also work
portfolioWinter.weather;
portfolioWinter.destroy();
```

## Performance and accessibility

One shared animation loop is capped at 30fps. Structure geometry is cached in its
own canvas and redrawn only on resize/font load. Tree model coordinates and mist
sprites are cached. Particle budgets are smaller on compact screens, and DPR is
capped. No new dependencies, external images, filters, audio or videos were added.
Hidden tabs pause animation. Reduced motion produces a static complete world
and snowfield without moving snow or fog. Resize and scroll refresh cached
scene bounds; cleanup removes the entire seasonal lifecycle.

## Verification

Chrome screenshots at 1440, 1728, 390 and 320px during full blizzard. Existing
page/header/nav/about/footer document-relative bounding rectangles compared with
the theme destroyed. No horizontal overflow. Long-running checks verify settled
snow growth. The false master switch was tested by serving the actual module
with just the flag changed: no seasonal elements/runtime/class, original vector
opacity. Cleanup and reduced motion were also checked. Physical iPhone/Safari
performance and battery usage are not profiled.

Grove revision verified at 1440, 1728, 390 and 320px during blizzard conditions:
all original content document positions matched after disabling the scene,
no horizontal overflow, no runtime errors, clean teardown, and the false master
flag restored the original vector field. Grove and tower are static cached art;
the existing shared weather/hero-tree loop and phase durations are unchanged.

Focused polish: tower geometry, decorated-tree renderer, snow depth, weather
cycle, original CSS and all HTML remain unchanged. Fir shoulders and fullness
were refined after the first screenshot review. Checks covered 1440, 1728,
390 and 320px during blizzard conditions, with final desktop/narrow-mobile
captures after the silhouette adjustment. Existing layout coordinates matched,
master disable and cleanup passed, and no overflow or runtime errors occurred.

## Final finishing pass

`index.html` permanently lists Senpilot (`https://www.senpilot.com/`) as the
current Engineering role. Previously: Lockheed Martin, 1851 Labs, WAT.ai, in
that order. The original Lockheed link/icon are retained and Senpilot follows
the same favicon pattern. These are plain HTML changes, independent of the
Christmas switch; Waterloo and other copy are unchanged.

Small fir outlines and anchors are unchanged in this pass. Seeded particles
cluster around existing branch shoulders, vary density per tier, and use subtle
evergreen tones. Particle detail defaults to 440 per small tree; artwork stays
cached in the structures canvas. Tower/hero tree/snowman geometry is unchanged.

Snow contour is cached as a four-pixel height field whenever scenery is built.
Broad Gaussian drifts follow the tower, each fir, hero tree and snowman. Local
buildup caps at 12px desktop / 6px mobile before a mean subtraction preserves
overall average coverage. Per-frame drawing/particle settling interpolates this
cached field. The continuous opaque snow retains its palette with a subtle
surface-to-bottom tonal gradient. No added full-screen loops or dependencies.

Reviewed browser captures at 320, 390, 768, 1440 and 1728px. Layout coordinates
match between theme-on/off modes, updated employers remain visible in both,
master-switch teardown passes, and no overflow/runtime errors were found. The
extra previous-experience entry naturally adds one row; no CSS layout or type
metrics were changed.

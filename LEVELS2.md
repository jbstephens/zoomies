# ZOOMIES! — expansion: THE BIG OUTSIDE (LOCKED 2026-09-27)

Status: **decided — implement as written, tune numbers for fun.**
Agents execute; they do not redesign. LAW = non-negotiable.
DESIGN.md still governs everything not amended here.

Two deliverables: (A) the **PATH-TURN ENGINE** — levels are no longer
straight lines; the route turns corners and climbs, Kirby-and-the-
Forgotten-Land style. (B) **FOUR new levels** (L4–L7) with four new
bosses, using the turns hard. John's ask: a Spider-Man-ish rooftop
level (L6) and "a ton more levels."

---

## A. The path-turn engine (the whole trick: sim never changes)

LAW: **the sim keeps running in track space** — exactly today's
coordinates: `z` = distance along the route, `x` = lateral offset,
`y` = height. Collision, bins, chunk records, enemies, bosses,
projectiles, checkpoints, the corridor solver, `groundAt` — ALL of it
stays in track space, untouched. What changes is the **mapping to
world space at render time**.

- Each level gets a `path`: an ordered list of straight runs and
  ±90° corners, e.g. `path: [s(90), t(+1), s(60), t(-1), s(120)]`
  (s = straight length in track-z; t = turn right/left). LAW: turns
  are multiples of 90° only — world geometry stays axis-aligned,
  skylines/fog/far meshes stay simple. A level with no `path` is one
  straight run (the existing three levels — they must ship
  pixel-identical to today).
- Corners have an arc: pivot + radius ~5m on the inside edge. Build a
  `trackToWorld(d, off, y)` transform: straight runs are translations/
  rotations; inside a corner the (d, off) pair maps through the pivot
  rotation (outer edge stretches, inner pinches — with chunky baked
  tiles this just reads as a curved corridor; it's fine).
- **Bake-time**: every static vertex is authored in track space and
  pushed through `trackToWorld` before it enters the merged band
  meshes. Zero per-frame cost for the world.
- **Per-frame**: dynamic things (cat, enemies, boss parts, pickups
  meshes, particles, glow sprites, blob shadow, laser dot) map their
  track-space position through `trackToWorld` when their Object3D is
  positioned. Their facing adds the segment heading. Keep a fast
  cached lookup (per-band precomputed heading + origin; corner bands
  precompute pivot) — no trig re-derivation per entity per frame
  beyond one segment lookup.
- **Camera**: follows in track space as today, then maps through
  `trackToWorld`; its yaw = heading at the cat's d, EASED through
  corners (smooth yaw interpolation across the corner arc ±4m). FOV/
  boom/pitch behavior unchanged.
- **Input**: stick X = lateral, stick Y = along-track — unchanged in
  track space, so controls feel identical and "always forward" is
  preserved around every corner.
- LAW (screen-space direction, amended): on any STRAIGHT run of any
  world heading (+Z, +X, −X, −Z), stick right ⇒ the cat's projected
  screen X increases. The harness must assert this on at least three
  different headings in a turning level (mid-corner is exempt — the
  yaw blend is the ambiguity every camera-relative platformer accepts).
- Vertical progression needs no new machinery (floors already carry
  heights). Add ONE new chunk op: `vent(x, z, r, power)` — an updraft
  (dryer/AC/steam) that carries the cat up while he's over it, with
  visible rising particles. Used for the big climbs; a gentle float,
  not a cannon.
- New traversal verb (L6/L7 only): **ZIPLINE**. `zip(x0,z0,x1,z1,y0,y1)`
  — jump within ~1.2m of the line to grab: cat dangles by front paws,
  auto-slides toward the lower end (~9 m/s), ✕ drops with a hop,
  auto-release at the end. Kid-proof: no balance, no button mashing.
  Reuses the clothesline art language from L3.
- Corners: keep them LIGHT — floor, deco, kibble arcs; no gaps, no
  bosses, at most one slow enemy. Platforming density lives on the
  straights (Kirby's own rule).
- Retrofit LAW: after the engine lands, ALL existing suites must pass
  unchanged (verify 105/105, bot 30/30, spawn-check 17/17) and L1–L3
  must look identical in screenshots (they are single-straight paths).

## B. The new levels — each ~2.5–3 min, checkpoints at thirds,
## 3 golden mice, one MILK saucer, path turns mandatory

### L4 — MARKET SWEEP (supermarket; teaches corners)
Route: entrance → aisle 1 → CORNER → back aisle → CORNER → aisle 2 →
freezer section → checkout. The aisle-corner-aisle shape IS the
tutorial for turns. Shelf-top platforming (two shelf tiers), rolling
cans and a melon that patrols an aisle, conveyor-belt movers at
checkout (moving floors — reuse `mover`), freezer = low-friction floor
patch + visible breath puffs, stacked-crate secret with a golden mouse
atop the shelving. Deli/PA gag banners ("CLEAN-UP, AISLE CAT").
Palette: bright fluorescent cream/mint, colorful shelf boxes.
**Boss — SIR MOPSALOT**: janitor robot with a spinning mop. Loop: mop-
spin charge (telegraphed) → he over-spins, slips on his OWN wet puddle
→ down flat, dizzy → POUNCE. 3 pounces. Between hits he mops a slick
puddle strip the cat must jump (slippery, not damaging). Never hurt:
ends up seated with a "WET FLOOR" cone on his head, waves.

### L5 — GREENHOUSE JUNGLE (the vertical one)
Route: greenhouse floor → CORNER → climb tier 1 → switchback CORNER →
tier 2 → vents up to the canopy walk → straight finish among the
tables. Giant leaf trampolines (tramp), watering-can arcs on timers
(sprinkler logic reskinned), bees that swoop (crow logic reskinned),
butterfly kibble-trails, terracotta pot stacks, one `vent` steam-riser
climb. Palette: lush greens + terracotta + glass glints, warm sun.
**Boss — QUEEN BEE**: hovers over the center bed. Lobs honey blobs
(slow arcs — TAIL-WHIP REFLECT ×3, the L3 skill with stickier
physics); between hits a wave of 3 drone bees sweeps; final hit she
plops into a flower, comes up dusted in pollen, gifts a honey jar
(pure kibble burst) and waves. Never hurt.

### L6 — SKYLINE SWING (John's Spider-Man level; the showstopper)
Daytime rooftops, blue-gold sky. Route: rooftop run → gap chain →
CORNER around the skyscraper ledge → ZIPLINE across the avenue →
crane platforms (movers) → vent-updraft between towers → CORNER →
final ridge run to the water-tower deck. Long ziplines are the star:
three of them, each crossing a real drop; awning bounces chained into
grabs. Pigeon flocks, AC-unit steam vents, window-washer platforms as
moving ledges. Falling = checkpoint, one heart (standard).
Palette: warm concrete + glass + gold light, kites in the sky.
**Boss — DELIVERY DRONE 9000**: quad-rotor package drone over the
rooftop arena. Drops boxes (dodge — boxes burst into packing peanuts),
then swoops low to steal kibble → lands 3s to recharge on its pad →
POUNCE it. 3 pounces; it sputters, parachutes its last package down —
the package is FULL of treats — and wobbles off into the sunset.

### L7 — DREAMLAND DELUXE (the finale — cat falls asleep on the couch)
Intro card: the cat curls up on the L1 couch… and wakes in the dream.
Pastel sky-void, floating cushion islands, giant yarn-ball planets
(rolling movers), fish that swim through the air in schools (kibble
trails), floatier gravity (jump gravity ×0.8 in this level only —
LAW: sim constant per level, harness-asserted), every earlier gimmick
remixed once: a dream sprinkler raining stars, a ghost-white vacuum,
zipline between cushion clouds, vents of sparkles. Route: cushions →
CORNER → yarn-planet hop → vertical sparkle-vent climb → CORNER →
the throne approach. Palette: cotton-candy pastels + deep indigo void
below (the void band already exists — recolor).
**Boss — THE CUCUMBER KING**: a giant crowned cucumber on a throne
platform ABOVE the arena. LAW: he cannot be damaged by scratch, whip,
roll, or reflected anything — the fight IS the cucumber-startle
mechanic: he plants ranks of minion cucumbers around the arena; the
only way up is to deliberately STARTLE-LAUNCH off them to reach his
crown platform and POUNCE THE CROWN. 3 crown pounces (he re-plants a
different cucumber layout each phase, teleporting his platform
higher). Final hit: he shatters into confetti pickle slices, the
crown drops, and the dream rains treats. Then the GOOD KITTY parade
(now with all 21 mice) — the finale moves from L3's clear to L7's.

## C. Flow, saves, menu (LAWS)

- Unlocks: L3 clear now unlocks L4 (credits no longer fire there);
  chain continues to L7; GOOD KITTY plays after L7.
- **Save migration LAW**: existing `zoomies_best` records (the boys'
  console save!) must load untouched — l1–l3 bests/mice/cleared kept,
  l4–l7 added locked-but-present, nothing wiped, no schema errors on
  either old→new or fresh installs. Harness-asserted with a seeded
  old-format save.
- Level select must present 7 cards pad-navigably (wrap the grid or
  page it — agent's layout call, screenshot-audited) with mice/best
  per card as today.
- Perf LAWS unchanged and non-negotiable: ≤60k tris in view, calls
  target ~40 / ceiling 120, merged static geometry, curated shadow
  casters (cat/enemies/boss only), one 1024 shadow, samples:0 post RT,
  lowfx = shadow off + post on, bake per level measured on the Pi and
  hidden behind the intro card. New palettes: market fluorescent,
  greenhouse lush, skyline day-gold, dream pastel. fx=full is already
  known not to hold 60 on the Pi — do not regress fx=low; do not chase
  fx=full.
- Audio (sfx-quality-bar): squeaky-clean market muzak-lite loop, jungle
  hum + bee buzz (LFO saw swarm), wind + city-day ambience, dream
  chimes; SIR MOPSALOT squeak-spin, drone rotor whir (detuned saws),
  Queen Bee buzz-crescendo, cucumber SPROING + confetti-pickle pop.
  All layered synthesis, lazy context, no 8-bit beeps on core actions.

## D. Verification additions (on top of DESIGN.md §12)

1. Direction law on ≥3 world headings in a turning level, through the
   live camera, straight-run sampled.
2. Bot clears L4–L7 + all four new bosses with real injected input:
   corner traversal, conveyor ride, vent climb, zipline grab/ride/
   drop, freezer slide, Cucumber-King launch chain each exercised.
3. Retrofit regression: verify 105/105, bot 30/30, spawn-check 17/17
   all green; L1–L3 screenshots visually unchanged.
4. Save migration: seeded v1 save loads; l1–l3 intact; fresh save OK.
5. Screenshots (1280x720, LOOKED at): each new level busy mid-run, a
   corner mid-turn, a zipline ride, each new boss, 7-card level
   select, GOOD KITTY with the parade. One 1180x820 touch shot in L6.
6. Perf counts per new level + new bosses, both fx paths, within
   budget; Pi verification at ship covers all SEVEN levels + the two
   heaviest new boss states + bake times (bar: 60fps lowfx, bakes
   behind the card).

## E. Build order (three sequential Opus agents — never parallel)

1. **Builder A — engine**: path-turn system + vent + zipline verbs +
   retrofit (all suites green, L1–L3 identical) + L4 MARKET SWEEP +
   SIR MOPSALOT complete, with direction-law-on-headings and corner/
   conveyor bot coverage added to the suites.
2. **Builder B — content**: L5, L6, L7 + their bosses + save
   migration + menu layout + GOOD KITTY move, on Builder A's engine,
   full suite extension per §D.
3. **Closer**: clean sequential full re-run of every suite, ship via
   the webroot pipeline, force Pi sync + CACHE-CHECK the running page
   (the ship string must be IN the live DOM — 9/27 lesson), Pi fps/
   bake pass across all seven levels, park the console on the menu.

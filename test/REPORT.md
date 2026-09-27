# ZOOMIES! build report — Opus builder, 2026-09-26

Built from DESIGN.md (locked). index.html 880KB via `bash test/build.sh`
(11 parts, 6,274 lines; three.js r147 vendored verbatim from
fairwayclassic). build.sh asserts bundler anchors (`</head>`,
ends `</body></html>`) and node --checks all 10 inline game blocks.

## Verification at handoff

| check | result |
|---|---|
| build + node --check (built file) | PASS (10 blocks) |
| pad flow: title→select→L1→damage→faint→respawn→pause/resume→boss1→results→L2 unlock; keyboard regression; P2 laser join/mesmerize/collect/leave | PASS, 0 console errors (test/verify.mjs, **105/105** on the final build) |
| bot clears 3 romps + 3 bosses, real injected input | **30/30** (test/bot.mjs, final build) |
| screen-space direction through live camera | PASS |
| perf per state, both fx paths | PASS — worst 72 GL calls / 26,873 tris (budget 120/60k); fx=low 23–58 calls; bake 8–26ms |
| idle theater (3 stages + wall-scratch) | PASS |
| screenshots reviewed | 18 shots in test/shots/, iterated |

Shadow casters 20 meshes / 2,228 tris, curated; terrain never casts.
fx=low = shadow OFF + post ON; fx=full = one 1024 map + post, MSAA off.

Closer's clean sequential re-run on the final build (2026-09-26, fresh
`bash test/build.sh`, 880,109 B): **bot 30/30** first try — including the
raccoon-minion reflect case that read 29/30 at handoff — and verify
**105/105** after the idle wall-scratch case was root-caused for real.
That case was a harness artifact (stale polled input across `step()`, now
law 3 below), NOT a game bug: instrumented probes show wall=true latching
at idleT=4.02s and the pose driver writing anim='wall-scratch' on the next
rendered frame. Only test/verify.mjs changed; index.html is untouched.

## Game bugs the harness caught (all fixed in source)
- scratch/tail-whip/pounce were never consumed from input edges (only
  jump was) — three of four attacks unreachable.
- pounceLand() only fired in the penetration branch of the Y solver;
  edge-probe landings bypassed shockwave AND trampolines. Landing now
  resolved once over all overlapping solids; tramp wins.
- vertex colors NaN (0xRRGGBB vs [r,g,b] in bake) — world rendered black.
- bake was a second lighting pass clipping to 1.0 → now a modulation
  ramp 0.60→1.0 (FC/PP recipe).
- missing palette key hard-crashed a level build (PAL_BASE + magenta
  fallback now).
- camera popped through ceilings/lintels; results lock-out ate a press;
  floor holes read solid.

## Harness laws (fixed in test/lib.mjs — keep)
1. controller.js seeds prev=curr on a pad's first observed frame; under
   SwiftShader (~200ms frames) connect+press same frame = press
   swallowed. pressPad waits for a released-state poll first.
2. CDP printable keyDown without `text` wedges Chrome's browser process
   solid (no error, no reply). Printable keys must carry text/
   unmodifiedText; non-printable use rawKeyDown. Headless also flips
   targets to hidden and stops rAF — pin focus + Page.setWebLifecycleState.
3. `__zoomies.step()` advances the sim with the LAST POLLED input.
   pollInput() runs only on a rendered frame, so stepping right after
   `__axis(i,a,0)` re-applies the previous PUSH for the entire step
   budget — the cat keeps walking and any "no input for N seconds"
   assertion is held at zero the whole time. After releasing input, wait
   for real sim ticks (a rendered frame) BEFORE using step(). This is
   what made the idle wall-scratch case look like a game bug across two
   closers; the mechanic itself latches wall=true at t=4.02s and the pose
   driver writes anim='wall-scratch' on the next rendered frame.
   Corollary: teleport() does not zero velocity, and idle only accrues
   below 0.35 m/s — step until the stage latches, never a flat budget.

## Tunables moved from DESIGN.md
WHIP_CD 0.30→0.24s; REFLECT_R 2.45m, reflect window f 0.06→0.94; camera
boom 6.6/2.75→6.1/2.55 (arenas 8.6/3.7), camera.x follow 0.72; doorways
4.5×3.0m; Rex ×1.45, MOTHER VACUUM ×3.8; invuln = pulse+warm glow (no
blink); fog 58/175, 62/215, 48/235; night fill 0.62 warm camera-side.

## Ship record (closer, 2026-09-26)
- Clean sequential re-run on the final build: bot 30/30, verify 105/105,
  zero console errors. One test-only fix (verify.mjs wall-scratch block).
- Ships via the TEMP WEBROOT pattern like Fairway Classic:
  gameconsole/zoomies/index.html is the source copy, games.json source =
  https://ses.q5labs.co/zoomies/index.html. Flip to a real Render service
  when one exists. Distinctive ship string: "A CAT IS LOOSE IN THE HOUSE".

---

# BUILDER A — THE BIG OUTSIDE: the path-turn engine + romp 4 (2026-09-27)

LEVELS2.md §A/§B/§E-1.  Scope delivered: the PATH-TURN ENGINE, the two new
traversal verbs (`vent`, `zip`), the retrofit guarantee, and **ROMP 4 —
MARKET SWEEP** with **SIR MOPSALOT**.  L5–L7 are Builder B's; everything
below is written for them.

## Verification on the final build (953,528 B, `bash test/build.sh`)

| suite | result |
|---|---|
| build + node --check | PASS (11 inline blocks) |
| `test/verify.mjs` | **105/105** — byte-for-byte the same suite as the v1 ship |
| `test/bot.mjs` | **56/56** (the 30 original assertions + 26 for romp 4) |
| `test/spawn-check.mjs` | **17/17** |
| `test/turns-check.mjs` (NEW) | **59/59** |
| console errors, every suite | 0 |
| screenshots | `test/shots2/` (15), reviewed and iterated |

Run them SEQUENTIALLY (parallel Chromes fake failures on this Mac).

Retrofit evidence beyond the green ticks: romps 1–3 declare no `path`, so
`TW.on === false` and every map below is the exact identity — turns-check §1
asserts that directly.  Their perf table is unchanged from the v1 handoff
(worst still `fx=full L2 z=56: 69 calls / 26,873 tris`), and
`test/shots2/30..34` reproduce the v1 camera spots for eyeball comparison
against `test/shots/`.

## Perf — romp 4, both fx paths (budget: 120 GL calls / 60k tris)

| state | fx=full calls/tris | fx=low calls/tris |
|---|---|---|
| aisle 1 | 52 / 25,493 | 43 / 24,281 |
| CORNER 1 | 35 / 15,052 | 27 / 13,764 |
| back aisle | 51 / 20,078 | 41 / 18,660 |
| CORNER 2 | 42 / 19,396 | 34 / 18,362 |
| aisle 2 (worst) | **61 / 23,214** | 50 / 21,754 |
| freezer | 55 / 15,512 | 48 / 14,540 |
| checkout | 47 / 20,851 | 39 / 19,871 |
| SIR MOPSALOT | 43 / 10,918 | 33 / 9,470 |

Level bake 13.9 ms (full) / 14.8 ms (low) — romp 4 is a 296 m level with a
doubled-back world footprint and still bakes faster than romp 2.  Shadow
casters stay curated (cat + enemies + boss).  **Not yet run on the Pi** —
that is the closer's job across all seven levels.

## What changed structurally

| file | change |
|---|---|
| **`test/src/p5b-path.html`** | NEW PART — the whole path-turn engine |
| `p2-head.html` | `#cards` wraps + a compact `many` grid past three romps |
| `p3-core.html` | `pushTri`/`pushTriRaw` map track→world; `glowAdd` + `drawPools` map; `market` theme |
| `p4-cat.html` | cat root + blob mapped; a ZIPLINE dangle pose |
| `p5-props.html` | WORLD lists for the new verbs; crates mapped; the market prop set; `makePuddle`, `buildCone` |
| `p6-ents.html` | every entity mesh write mapped; `can` + `melon`; reflect hit window (see flags) |
| `p7-levels.html` | `PAL_MARKET`, `lvlMarket()`, the new `A()` ops, tiled floors, corner-safe fascia/walls, `twBuild` in `buildLevel` |
| `p8-sim.html` | `vent`/`zip`/`slick` verbs, `updateWorldVerbs`, camera mapped, `WORLD.gravK` |
| `p9-boss.html` | boss meshes mapped + `B.yaw` (track-space facing); **SIR MOPSALOT** |
| `pa-audio.html` | market ambience + 10 new layered sfx |
| `pb-flow.html` | 4-card select, romp-4 card art, `__zoomies` additions, sky/stars mapped |

Part order is glob order and `p5b-path.html` sorts before `p7-levels.html`,
which is all that matters (romp 4 calls `TURN()` at load time).

## The engine, for Builder B

**The law: the sim never leaves track space.**  `z` = distance along the
route, `x` = lateral, `y` = height.  Collision, bins, `groundAt`, `corrHW`,
enemies, bosses, projectiles, checkpoints, the corridor solver — all of it
is exactly what it was.  Only the *mapping to world space* is new.

```js
TURN(dir, z0, z1)        // dir +1 = right, −1 = left; the corner occupies
                         // track z ∈ [z0,z1]; pivot Rp = (z1−z0)/(π/2)
// in the level record:
path: [TURN(1, 84, 102), TURN(1, 146, 164)]
```
Pick the span so that **Rp − corridor half-width ≈ 5 m** (romp 4: 18 m span,
Rp 11.46, hw 6.2, inner radius 5.26).  90° multiples only.  A level with no
`path` is one straight run and every call below is the identity.

```js
twBuild(L)                 // called by buildLevel BEFORE any geometry
twMap(d, off, y, out)      // → out[wx, wy, wz]   (the transform itself)
twHeading(d)               // world yaw of the route at track d
twYaw(d, face)             // a track-space facing → world yaw
twSeg(d)                   // the cached segment (4 m bucket table + locality)
twPos(obj, x, y, z)        // position an Object3D from track coords
twFace(obj, x, y, z, face) // …and give it the route's heading
twRaw(on)                  // bake-time bypass: push WORLD coords verbatim
twBounds(pad)              // the route's world AABB
twStraightRuns()           // straight runs + their headings (harness)
TW.on / TW.segs            // live state
```
`__zoomies.path()`, `.heading(d)`, `.toWorld(x,y,z)`, `.screenTrack(x,y,z)`
expose all of it to the harness.

Rules that follow from it:
- **Static geometry is free.**  Every prop builder already funnels through
  `pushTri`/`pushTriRaw`, so authoring in track space is all you do; the
  bend happens once, at bake.
- **Dynamics go through `twPos`/`twFace`.**  If you add an entity or a boss
  part, position it with those, never `mesh.position.set`.  A *pure `.y`*
  write is always safe (y is never remapped).
- **Boss facing lives in `B.yaw`** (track space); the mesh carries
  `twYaw(B.z, B.yaw)`.  Never read a facing back off the mesh.
- **Anything reaching far sideways must be bypassed.**  The void plane and
  the far backdrop are built inside `twRaw(true)` (±150 m would wrap through
  a corner pivot).  Romp 4 is an interior and uses `far: 'none'`; for L6's
  skyline, walk `TW.segs` and place the backdrop per straight in world space.
- **Corners stay light** — floor, deco, kibble arcs, at most one slow enemy.
  Keep `corr` half-width CONSTANT through a corner.
- The camera is mapped at both ends of its boom (`applyCam`), so the corner
  yaw ease comes out for free and cannot disagree with the cat.

### The new ops (levels stay pure data)

```js
a.vent(x, z, r, power, y0, h)   // updraft column: float at `power` m/s
                                // while inside, one air jump preserved
a.zip(x0, z0, x1, z1, y0, y1)   // zipline: grab within 1.25 m mid-air,
                                // auto-slide to the LOW end at 9 m/s,
                                // ✕ drops with a hop, auto-release at the end
a.slick(x, z0, z1, w, k, cold)  // low-friction floor; `cold` adds breath
                                // puffs.  NEVER damages.
a.pa(z, main, sub)              // one-shot PA gag as the cat passes z
a.shelf2 / endcap / freez / reg / conv / cart / sign / cone / doors
a.floor(z0, z1, y, w, xc, pat)  // pat: 'tile' | 'ice' (checkerboard tiles)
```
Sim hooks: `updateWorldVerbs(dt)` is the ONE call added to `tickSim`, right
after `moveCat`, and every branch early-outs on an empty `WORLD` list — that
is why romps 1–3 are bit-identical.  `CAT.onZip` short-circuits the tick into
`zipRide` + `simTail`, so the corridor solver itself was never touched.
`WORLD.gravK` is in place for romp 7's ×0.8 gravity (×1 is exact today).

Harness surface: `__zoomies.zip() / .vents() / .slick() / .movers() /
.says()`, plus `onZip / zipRides / ventRides / onMover / moverRides / slick`
on `.cat()`.

### Laws paid for in blood (all found in the shot/bot passes)

1. **The camera clamps under `ceilAt(z)`** — anything standable (or hangable)
   must sit well below the ceiling or the lens points at the light battens
   with the cat out of frame.  Romp 4 raised its ceilings to 4.4 m (5.6 m in
   the back aisle) for exactly this.
2. **A prop that spans a gap must not be solid** — the conveyor rails were,
   and the cat walked the rail instead of riding the belt.
3. **A dark slab over a hole makes the hole read as floor.**  The conveyor
   cradle now stops at the gap on both sides.
4. **The zip releases the cat 0.62 m UNDER the wire**, so the landing ledge
   must be *below* the far end or the solver ejects him off its side; and the
   masts are deco, never solids.
5. **Boxes resting on shelves get +0.02 clearance** or the coplanar faces
   z-fight.  Stripes on a sphere must stand PROUD of it (a buried stripe is
   invisible, a grazing one z-fights).
6. **`CYL()` builds about +Y.**  Passing a belt width as its height stood a
   3 m black post in the middle of the checkout.
7. **`__zoomies.teleport` now releases the zip** (the zip branch owns the
   cat's position and snapped him straight back), and `resetRun` drops it —
   `clearWorld` throws the zip records away and a stale one would be driven
   by the sim.

## Honest flags for Builder B and the closer

- **bot.mjs is 56/56, not 30/30.**  All 30 originals are still there; TWO of
  them moved: romp 3 now ends at LEVEL SELECT and GOOD KITTY plays after the
  LAST romp (LEVELS2 §C).  The KITTY pair is asserted at the end of romp 4.
  `curLevel === LEVELS.length - 1 → KITTY` is generic, so adding L5–L7 moves
  the credits to L7 with no code change.
- **One deliberate GAME change touches romps 1–3**: the reflected-projectile
  hit box in `updateProj` (p6) went from `e.h + 0.7` to `e.h + 1.6` vertical
  (and ±0.7 lateral), matching the boss version.  Traced with a per-tick
  projectile dump: a perfectly reflected trash bag sailed ~0.2 m OVER a
  raccoon's head at normal range, so "reflect it back at the thrower" — the
  ranged answer the design promises — visibly did nothing.  This is the
  mercy path; it is now as generous as the boss fight already was.  It is
  also what made the bot's raccoon-minion case flaky across three closers.
- `test/shots.mjs` (the v1 battery) was patched for the credits move; it now
  sets KITTY directly.  Run it with an out-dir argument if you want to keep
  `test/shots/` as the v1 baseline.
- `drawCardArt()` has branches for romps 1–4 only; romps 5+ currently fall
  through to the night art — add yours.  The select grid switches to `many`
  past three cards and `CARD_ROW = 4` drives up/down paging, which only
  engages past FOUR levels: **screenshot-audit the 7-card layout**, it has
  never been rendered.
- The zipline exists once in romp 4 (a secret route to golden mouse 2).  L6
  wants three long ones over real drops — the verb is ready, but the ride
  speed (9 m/s), the grab radius (1.25 m) and the two release speeds live in
  `p8-sim.html` as `ZIP_*` constants if a longer line needs a feel pass.
- Corner ceilings: the ceiling slab is authored at the corridor width, so on
  the OUTER edge of a bend it stretches and can leave a hairline against the
  wall top.  Invisible at 720p in the shots; worth knowing if you build a
  corner with a taller room.
- Nothing has been run on the Pi.  Bake times and fps for all seven levels
  are the closer's mandatory pass.

## Soft spots to watch on real hardware
- L1 corridor is wide (13.4m) — gap sections can feel sparse.
- Interior ceiling reads as a dark band at top of frame.
- Raccoon King arena is the only camera tilt-up — feel-check with Ben.

---

# BUILDER B — THE BIG OUTSIDE: romps 5–7 and the finale (2026-09-27)

LEVELS2.md §B/§C/§D and §E-2.  Scope delivered on Builder A's engine:
**ROMP 5 — GREENHOUSE JUNGLE** (QUEEN BEE), **ROMP 6 — SKYLINE SWING**
(DELIVERY DRONE 9000), **ROMP 7 — DREAMLAND DELUXE** (THE CUCUMBER KING),
the save migration to seven records, the seven-card level select, and the
GOOD KITTY finale moved from romp 3 to romp 7 with all 21 mice.

## Verification on the final build (1,072,680 B, `bash test/build.sh`)

Every number below was measured on that exact file; `index.html` is
byte-stable across a re-run of `build.sh`, and the only things touched after
the last game change were the three oscillating-sample fixes in `bot.mjs`
(laws 10 and 11 below), which were re-run to green.

| suite | result |
|---|---|
| build + node --check | PASS (11 inline blocks) |
| `test/verify.mjs` | **105/105** — byte-for-byte the v1 suite, untouched |
| `test/bot.mjs` | **109/109** (56 from Builder A + 53 for romps 5–7) |
| `test/spawn-check.mjs` | **37/37** (17 → 37: every romp's spawn + gravity) |
| `test/turns-check.mjs` | **185/185** (59 → the routes, the save, the select, perf) |
| console errors, every suite | 0 |
| screenshots | `test/shots2/` (46), reviewed and iterated five times |

Run them SEQUENTIALLY (parallel Chromes fake failures on this Mac).

## What the new suite coverage actually drives

Every one of these is REAL INJECTED INPUT through `pollInput`, not a
`__zoomies` shortcut — the shortcut is only ever used to put the cat at the
start of the thing being tested.

- **romp 5** — leaf trampoline bounce; pot-stack climb (hop by hop to the
  lid); the SWITCHBACK corner walked on the stick to a −Z heading; the steam
  vent ridden from the tier up past canopy height and stepped off ONTO the
  canopy walk; QUEEN BEE beaten with three tail-whip reflects of her own
  honey, with her drone-bee wave seen between hits.
- **romp 6** — the skyscraper corner walked to a +X heading; the long
  zipline grabbed off a ledge, ridden across a drop that is asserted to have
  no floor under it at all, and ✕-dropped mid-ride; the crane platform
  ridden and asserted to carry the cat WITH it; the tower updraft climbed;
  DELIVERY DRONE 9000 beaten with three pounces on its recharge pad, with
  the pad itself asserted never to hurt the cat.
- **romp 7** — `gravK === 0.8` asserted as a level constant AND measured:
  the same ✕ jump rises 2.76 m in the dream against 2.37 m on the rooftops,
  and the scale is asserted to RESET to 1 on leaving; the yarn planet ridden;
  the sparkle vent climbed; the cloud zipline grabbed; **THE CUCUMBER KING's
  IMMUNITY** delivered from on top of his own deck — scratch, tail-whip,
  roll and a reflected projectile, all four verbs, hp unchanged; then the
  full launch chain: three crown pounces, each one off a real startle-launch,
  through all three re-planted ranks and both platform lifts.
- **the finale** — GOOD KITTY fires after romp 7 and NOT after romp 3 or 4
  (both asserted), and the parade renders all 21 golden mice inside the
  900 px stage.
- **the migration** — a seeded v1 `zoomies_best` with only l1–l3 in it loads
  with l1–l3 byte-identical and l5/l6/l7 each added empty and uncleared; a
  fresh save has seven records; and the unlock chain is walked one romp at a
  time all the way to romp 7.
- **the direction law** — asserted again on romp 6's three world headings
  through the live camera, in a level built by a different hand from romp 4's.

## Perf — romps 5–7, both fx paths (budget: 120 GL calls / 60k tris)

Worst of the whole run: **61 GL calls** (fx=full L4 aisle 2, Builder A's) and
**42,988 tris** (fx=full L5 tier 2).  Nothing in romps 5–7 exceeds 59 calls.

| state | fx=full calls / tris | fx=low calls / tris |
|---|---|---|
| L5 glasshouse floor | 48 / 29,742 | 38 / 27,977 |
| L5 pot stacks | 44 / 24,155 | 33 / 22,199 |
| L5 CORNER 1 | 34 / 19,916 | 27 / 18,717 |
| L5 tier 1 | 48 / 36,462 | 38 / 34,890 |
| L5 CORNER 2 (switchback) | 39 / 31,018 | 30 / 29,195 |
| **L5 tier 2 — worst tris in the game** | **59 / 42,988** | 48 / 40,836 |
| L5 steam riser | 47 / 35,716 | 39 / 34,367 |
| L5 canopy walk | 47 / 29,261 | 38 / 27,517 |
| L5 QUEEN BEE | 33 / 19,015 | 26 / 17,531 |
| L6 rooftops | 56 / 16,658 | 47 / 15,256 |
| L6 gap chain | 45 / 13,760 | 37 / 12,472 |
| L6 CORNER (the skyscraper) | 35 / 12,958 | 28 / 11,944 |
| L6 far rooftop | 55 / 16,876 | 47 / 15,974 |
| L6 cranes | 55 / 16,850 | 47 / 15,698 |
| L6 CORNER 2 | 48 / 16,882 | 36 / 14,750 |
| L6 the ridge | 59 / 16,564 | 49 / 14,708 |
| L6 third crossing | 49 / 15,024 | 42 / 13,938 |
| L6 DELIVERY DRONE 9000 | 44 / 10,670 | 33 / 9,174 |
| L7 the couch | 54 / 12,759 | 43 / 10,863 |
| L7 cushions | 49 / 10,327 | 39 / 8,663 |
| L7 CORNER 1 | 42 / 9,033 | 32 / 7,229 |
| L7 yarn planets | 55 / 14,732 | 45 / 12,710 |
| L7 sparkle vents | 47 / 10,614 | 40 / 9,532 |
| L7 CORNER 2 | 44 / 11,013 | 33 / 9,069 |
| L7 throne approach | 56 / 13,513 | 45 / 11,565 |
| L7 throne room | 44 / 9,553 | 34 / 7,393 |
| L7 THE CUCUMBER KING | 45 / 9,915 | 31 / 6,987 |

Level bakes: L5 **28.7 ms** (the heaviest in the game — palms, canopy
clusters and a 16 m glass house), L6 15.3 ms, L7 14.8 ms.  All far inside the
260 ms the intro card covers.  Shadow casters stay curated everywhere (cat +
enemies + boss); L7's 17 caster meshes are the king plus his planted rank.

## What changed structurally

| file | change |
|---|---|
| `p2-head.html` | the compact select grid pinned to FOUR per row (`max-width`), card metrics retuned so 4 + 3 fits 720p with head and foot on screen |
| `p3-core.html` | `green` / `sky` / `dream` themes; `domeMD` takes an `emit` flag; stars for the dream |
| `p5-props.html` | the greenhouse set (leaf trampolines, leaning pot stacks, staging benches, ferns, palms, vines, the flower bed, canopy clusters), the skyline-day set (solid tower blocks, tower cranes, washer rigs, kites, a route-aware day skyline), the dream set (cushion skirts, yarn balls, sparkle rings, clouds, throne columns); `propGrate`/`propSparkleRing` take a base `y`; `clearWorld` disposes mover GROUPS |
| `p6-ents.html` | the four RESKINS (`look`: bee / can / star / ghost) and ONE new kind, `flit` (butterflies + air-swimming fish); `honey` and `box` projectiles; `peanutBurst` |
| `p7-levels.html` | `PAL_GREEN` / `PAL_SKY` / `PAL_DREAM`, fourteen new `A()` ops, the `glass` wall style, the void read from the THEME, `lvlGreen()` / `lvlSky()` / `lvlDream()`, `DREAM_PADS`, `WORLD.kingPads` |
| `p8-sim.html` | per-zipline ride speed (`zipSpeed`); rolling-mover spin; the arena camera pulls back and lifts for a boss more than 5 m overhead |
| `p9-boss.html` | **QUEEN BEE**, **DELIVERY DRONE 9000**, **THE CUCUMBER KING** (with his collision-only platform mover, pooled minion ranks and the crown pounce) |
| `pa-audio.html` | 17 new layered sfx and a per-theme AMBIENT BED (jungle hum + LFO saw swarm, city-day wind, dream shimmer) under the chord loop |
| `pb-flow.html` | card art for romps 5–7, the new boss glow tells, a parade that scales to 21 mice, `__zoomies.king()` / `.parade()` / `.gravK()` |

## Laws paid for in blood (all found in the shot or bot passes)

1. **An updraft column must rise through OPEN AIR.**  Romp 5's steam vent
   sat under a canopy board: the cat floated up, PINNED under it at y=10.76,
   and could neither climb nor drop.  The column is clear of every board now.
2. **A zipline's far end must sit OVER the landing floor, not at the lip of
   it.**  All four new lines first ended at the exact z their floor starts,
   and the gentle 0.3× step-off dropped the cat onto the FACE of the slab —
   one heart, every time, on the traversal that is supposed to be the safe
   way across.  (This is Builder A's law #4 with the *horizontal* half added.)
3. **NOTHING STANDABLE MAY HANG OVER THE CAMERA'S BOOM LINE.**  Romp 7's
   rank-C launch pad was at (0, 10, 233), dead centre and 2–5 m in front of
   an arena camera that sits at y≈8.4, z≈cat−11.  Its dark underside filled
   the top third of every frame of the boss fight, and it took four bisects
   (hide the boss, the bands, the far mesh, the sky) to prove it was geometry
   at all.  Rank C is out at the sides now.
4. **A vertical stack of pots is not climbable — a LEANING one is.**  Stacked
   dead vertical, each rim (and a lid wider than the pot under it) overhangs
   the ledge below, so the cat bonks his head on the way up and drops back.
   `propPotStack` fans the pots along the route now: a three-step staircase
   with nothing overhead, which is what it always looked like it was.
5. **An emissive room needs LESS light, not more.**  Romp 5's first pass
   (sun 0.74 + hemi 0.54 + amb 0.34 over emissive glass, then a gain-and-
   gamma lift) came back as one sheet of cream with no green in it at all.
   Every light came down, saturation went up, and the floor went to real
   damp brick.  Romp 6 had the same disease in beige.
6. **A dome with a NEGATIVE height is wound inside-out** and backface-culls
   into nothing — the dream's cushion undersides are tapered cylinders, and
   `domeMD` grew an `emit` flag because a LIT dome seen from below shades to
   0.60 with a cool tint and turns every pastel cloud into a dark umbrella.
7. **A sky gradient must be weighted for the band the camera actually
   frames.**  The lens looks slightly DOWN, so romp 6's zenith blue was a
   blue nobody ever saw, and romp 7's dark zenith cut a hard-edged wedge
   across the top of the arena frame that read as a ceiling in a level whose
   whole point is that there isn't one.
8. **ZOOMIES MODE survives a teleport** and drives the cat forward with no
   input for six seconds — a harness step that happens to run the cat over a
   MILK SAUCER hands the next step a rocket.  `calm()` in `bot.mjs`.
9. **tickSim's FAINT branch does not call `updateBoss`**, and a respawn goes
   to the last CHECKPOINT.  A cat who fainted on the way into an arena gets
   teleported in, faints his way back to z=0, and the boss can never engage.
   Wait for `!fainted` before an arena entry (`bot.mjs`, romp 7).
10. **An OSCILLATING mover or hazard cannot be sampled over a fixed window.**
   Three separate assertions read as broken mechanics because the window
   happened to open on a turnaround: romp 4's conveyor (belt 0.16 m, cat
   0.16 m — tracked to the centimetre and still "failed"), romp 6's crane
   platform (−0.09 / −0.09), and romp 3's wind gust, which also CYCLES and
   only reaches 4.6 m.  All three now sample until the thing is actually
   moving, then assert the cat goes with it.  Builder A's conveyor case was
   written with a fixed window and had simply been lucky.
11. **A mid-air ladder needs LESS lean the higher you are.**  The bot's
   pot-stack climb held a constant 0.30 forward: enough to carry the cat onto
   the first pot, too much to keep him on the lid from the third.  The lean
   drops to 0.14 above 1.3 m and the climb is now deterministic (verified
   three runs).

## Honest flags for the closer

- **Nothing has been run on the Pi.**  Bake times and fps across all SEVEN
  levels, plus the two heaviest new boss states, are still the closer's
  mandatory pass.  The two to watch are **L5 tier 2 (42,988 tris, the
  heaviest state in the game)** and **L5's 28.7 ms bake**.  Both are inside
  the laws (60k / 260 ms) and inside the measured Pi look budget (75k tris
  holds 60fps), but they are the new ceilings and they are romp 5's.
- **`drawCardArt()` now covers all seven romps** and the seven-card grid has
  been rendered and audited (`shots2/40..42`, `69`).  It is 4 + 3 at
  `max-width: 1002px`; that max-width is what pins it to four per row, and
  four per row is what `CARD_ROW = 4` assumes.  Change one and change both.
- **`ZIP_SPEED` is now a per-line default.**  Romp 4's price-check line still
  runs at 9 m/s (it passes no `sp`); romp 6's three avenue crossings run at
  12.5 and romp 7's cloud line at 10.0.  Builder A's flag is resolved.
- THE CUCUMBER KING's platform is a **collision-only mover** (`g: null`) —
  the deck MESH lives in the boss group.  Two owners of one Object3D is how
  a boss twitches between two positions every frame; if anyone adds a mesh to
  that mover record, `kingPose` and `updateMovers` will fight over it.
- His minions are **pooled** (`B.pool`).  A respawn re-plants, and pushing
  fresh entities each time would have grown `ENTS` without bound over a long
  fight.
- The **`flit`** entities (butterflies, air fish) are scaled 1.7–2.0× and
  must be kept away from the arena camera: a 2× fish 3 m from the lens is a
  blue boulder in the corner of the frame.  Romp 7's school swims across the
  FAR end of the throne room for exactly that reason.
- Romp 5's canopy clusters and 16 m glass house are what make it the
  heaviest level; if the Pi argues, the cheapest wins are `THEMES.green`'s
  `fogFar` (already pulled 148 → 104) and the canopy count.
- The **arena camera now pulls back to 11 m / lifts 4.4 m / widens to 66°
  when a boss is more than 5 m above the cat.**  No shipped boss is (the
  Raccoon King tops out at 4.18 m), so this is additive — but it is a change
  to shared camera code and worth one look on the Pi.
- `test/shots.mjs` (the v1 battery) is untouched; `test/shots2.mjs` is the
  one that now covers everything.  The frames worth opening first:
  `40..42` + `69` (the seven-card select, both rows, cursor visible),
  `45` (a corner mid-turn — the glass house genuinely bends),
  `48`/`49` (the steam riser and the canopy walk),
  `50` (QUEEN BEE over her flower bed),
  `54` (the ledge round the skyscraper), `55` (mid-zipline over the avenue),
  `58`/`59` (DELIVERY DRONE 9000 telegraphing, then down on its pad),
  `60` (the romp-7 intro beat), `62` (yarn planets),
  `65`/`66`/`67` (THE CUCUMBER KING at phase 1, phase 2, and confetti),
  `68` (GOOD KITTY with 21 mice) and `70` (the 1180×820 touch frame).

## Soft spots to watch with Ben
- Romp 6's three ziplines are the showstopper and they are FAST (12.5 m/s).
  If they read as too fast for a six-year-old, the knob is the `sp` argument
  on each `a.zip(...)` call — no code change.
- THE CUCUMBER KING's launch chain is the hardest thing in the game: it asks
  for a deliberate startle-launch, air steering, and ○ at the top. The
  mercies in place are a ±2.9 m crown window, a platform you can simply LAND
  on and pounce from, a rank that only ever grows, and a phase that survives
  a respawn.  Watch a cold player do phase 3.
- Romp 5 is the vertical one and its canopy walk is narrow (4–5.6 m boards
  over a 5.6 m drop to a safety floor).  Nothing there is fatal, but it is
  the most "don't fall" section in the game.

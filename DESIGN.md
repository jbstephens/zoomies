# ZOOMIES! — design (LOCKED 2026-09-26)

Status: **decided — implement as written, tune numbers for fun.** Agents
execute this design; they do not redesign it. Anything marked (tune) is a
starting value expected to move during feel passes. Anything marked LAW
is non-negotiable.

3D third-person **forward-corridor platformer**. References: **Astro Bot**
(camera, charm, moveset feedback), **Ratchet & Clank** (corridor-width
combat), **Kirby** (generosity, everything is friendly, mercy pacing).
Star: an orange tabby cat. Tone: household absurdity — the obstacles are
obstacles *because he's a cat*.

Built for Stephens Arcade: Pi 5 Chromium kiosk, 1280x720@60, PS4 pads,
kids at the controls. Kid-proof and 60fps-on-the-Pi are the two
non-negotiables (see gameconsole/CLAUDE.md — read it fully first).

---

## 1. Camera & world shape

- Levels are **corridors along +Z** ("always forward"). No camera stick,
  no yaw control. Camera sits behind + above the cat, facing down-corridor
  (+Z), smooth-follow with ~1.5m forward lead, gentle pitch-up when the
  route climbs, slight widen on arenas. FOV ~55 (tune).
- LAW (screen-space direction): stick RIGHT moves the cat RIGHT ON
  SCREEN. Camera is behind the cat looking +Z, so screen-right = world
  +X. The harness must assert this THROUGH THE LIVE CAMERA (project
  positions), not via world coordinates.
- Left stick: X = strafe, Y = forward/back. Free 3D movement inside the
  corridor (width varies 8–16m); soft invisible walls (nudge, never a
  hard snap). The cat can walk backward a bit but content only ever lies
  ahead; camera never turns around.
- Corridor is authored as a sequence of **CHUNK data records** (floor
  segments at heights, platforms, gaps, movers, hazard spawns, deco
  clusters, checkpoint arches, treat placements). A level = `{theme,
  palette, chunks:[...]}`. Levels are DATA, engine is shared — the
  Fairway Classic holes-as-data precedent. This is how 3 levels stays
  cheap and level 4+ stays possible.

## 2. The cat — moveset

Physics character controller (capsule vs. AABB/heightfield boxes; no
physics lib). Run max ~7 m/s (tune), snappy accel/decel, lean into turns.
Tail = 5-segment spring chain, always alive. Ears twitch. Squash on land,
stretch on jump.

- **Jump — South ✕**: variable height (hold = higher, ~1.2–2.4m). Double
  jump = mid-air **cat twist** (visible barrel-flip). Coyote time 0.12s,
  jump buffer 0.15s. LAW: kid-friendly forgiveness stays.
- **Scratch — West □**: fast two-swipe combo, short range, ~0.4s. Breaks
  crates, bonks enemies. Little claw-streak flash sprites.
- **Tail whip — North △**: 360° spin attack, hits all around, ~0.6s,
  0.3s cooldown. **Reflects projectiles** (water blobs, toast, trash)
  back at the shooter — this is the ranged answer.
- **Roll ("zoomies") — East ○ held (ground)**: curls into a ball Sonic-
  style but cat-style (tail wrapped, ears flat). +60% speed, smashes
  crates and small enemies on contact, wider turn radius, low profile —
  rolls UNDER tables/fences where walking can't go.
- **Pounce — East ○ (airborne)**: slam straight down, landing shockwave
  (small AoE), bounces off big/armored enemies. The boss-hit verb.
- **Idle theater** (REQUIRED, this is half the game's charm): 4s idle →
  sit + lick paw; 9s → full groom (paw lick, face wipe); 15s → lie down,
  tail curl, slow blink + audible purr; random ear flicks throughout;
  idle within 1m of a wall → scratches the wall instead. Any input
  cancels instantly (first frame). Idle anims are procedural bone/part
  transforms, not baked clips.

## 3. Health, damage, score, saves

- **3 hearts (paw icons)**. Hit = knockback + heart lost + 1.2s invuln
  flash. 0 hearts = dizzy faint (stars) → respawn at last checkpoint
  with 3 hearts + 1s mercy invuln. LAW: no lives, no game over —
  respawn, don't end. Falling off = instant respawn at checkpoint,
  costs 1 heart only.
- **Kibble** (glowing bits, the coin): score. Every 100 kibble → full
  heart refill + jingle + confetti puff.
- **Treats** (the power-ups):
  - **FISH** — refill all hearts.
  - **MILK SAUCER** — **ZOOMIES MODE**, 6s: auto speed burst,
    invulnerable, sparkle trail, everything you touch pops into kibble.
    Kirby-generous. Screen gets a subtle speed vignette.
  - **GOLDEN MOUSE ×3 per level** — hidden collectibles (fridge top,
    behind the doghouse, inside a chimney…). Shown on results + level
    select. Pure bragging rights.
- Checkpoints = arch + food bowl; touching one plays a happy chirp.
- localStorage **`zoomies_best`**: per-level {bestKibble, bestTime,
  mice[3], cleared}. Level select shows it.

## 4. Enemies — all bonk-not-die

Defeated = dizzy stars + pop into 3–5 kibble. Nothing bleeds, nothing
dies; dogs end up sitting, dizzy, tongue out.

- **House set**: robo-vacuum (patrols, charge telegraph, chargeable —
  pounce/scratch pops it); spray-bottle turret (lobs water blobs —
  tail-whip reflect kills the turret); toaster (pops toast in arcs);
  yarn ball (rolling hazard, can be scratched into a harmless tangle);
  **CUCUMBER** (stationary; touch → cat STARTLE-LAUNCHES straight up
  with a yowl — costs NO heart; it's a scare AND a tool: cucumber
  launches reach high ledges. Place some as puzzles).
- **Yard set**: sprinkler (rotating water arc, timing lane); yappy dog
  (burst-chases, bonk → sits dizzy); crow (swoop telegraph); garden
  gnome (tips over as you pass — fakeout hazard, blockable).
- **Roof set**: pigeon flock (scatters, blocks vision for a beat);
  raccoon minion (throws trash — reflectable); wind gust vent (pushes,
  timed); neon sign zapper (on/off timing).

## 5. Bosses — one per level, 3 hits, heavily telegraphed

1. **MOTHER VACUUM** (house): giant robo-vac. Loop: sucks kibble toward
   itself → charge telegraph (rattle + red glow) → charges → crashes
   into wall → stunned 3s with big red button exposed → **POUNCE the
   button**. Spawns 2 mini-vacs between hits. Kid mercy: charge is slow,
   stun is long.
2. **REX THE ROOMMATE** (yard): big goofy dog. Digs then SLAM (shockwave
   to jump); while he pants after the slam, bounce off the doghouse roof
   (it's a trampoline) to **bop his nose**. 3 bops → he flops over,
   tail wags, howls you a fanfare — Rex becomes a friend (sits at the
   level-exit gate wagging). LAW: dogs are never hurt, only befriended.
3. **THE RACCOON KING** (roof, night): atop the water tower. Throws
   trash bags (**tail-whip reflect** = a hit, x3), summons a pigeon wave
   between phases. On the third hit he slips on his own banana peel,
   tumbles into a dumpster (soft, cartoon), his little crown bounces to
   your paws = level end.

## 6. Levels (~2.5 min each for a kid, checkpoints at thirds)

1. **HOUSE CAT** — living room → kitchen → hallway. Couch/bookshelf/
   counter platforming, roll-under coffee tables, fridge-top golden
   mouse, toaster gauntlet, spray-bottle corners. Warm honey light
   through windows, dust motes.
2. **BACKYARD BLITZ** — porch → garden rows → fence-top balance run →
   park edge. Sprinkler timing lanes, the cucumber garden (launch
   puzzles), yappy-dog chase stretch, birdbath bounce. Green-gold
   afternoon.
3. **NIGHT ON THE TILES** — moonlit rooftops → clotheslines (ride the
   pulley) → neon signs → water tower. Chimney gaps, awning trampolines,
   wind gusts, city-glow vista with lit windows. Indigo night + neon.
   The showcase level — this is the screenshot.

Progression: L1 unlocked; finishing unlocks the next; all replayable
from level select. Finishing L3 → credits-ish "GOOD KITTY" screen with
every collected golden mouse parading by, then back to level select.

## 7. Two-player — LASER BUDDY (drop-in)

P2 (pad slot 1) presses anything → a **red laser dot** joins (P2 stick
moves it on the ground/walls, always within camera view). Laser: hover
an enemy 0.6s = it gets mesmerized and chases the dot (stun/kite);
sweep kibble = collects it (shared score); rest the dot in front of the
cat = the cat does a happy chirp + tail flick (zero gameplay effect,
pure joy — keep it). Drop in/out anytime; "P2: PRESS ✕ FOR LASER" hint
on title + pause. No second camera, near-zero perf cost.

## 8. The look — stretch the Pi, inside the measured budget

Use the FULL measured-free stack (gameconsole/CLAUDE.md "3D look
budget" + pi-look-budget laws — these came from the real kiosk):
- ACES tone mapping + sRGB output; MeshLambert lit pipeline; gradient
  sky/interior dome; baked **vertex AO** on all static geometry;
  ONE fullscreen post pass (vignette + warm grade + saturation) on a
  **samples:0** render target (LAW: MSAA-RT costs ~21fps — post pass
  and context-MSAA are mutually exclusive, pick the post pass).
- ONE 1024px directional shadow map. LAW: casters are CURATED — cat,
  enemies, boss only. Terrain/furniture/houses NEVER cast. Receivers
  everywhere is fine.
- ≤12 additive glow sprites in view (treats, checkpoints, neon).
- Budget: ≤60k tris in view, draw calls target ~40, hard ceiling 120.
  Static chunk geometry MERGED per chunk (one or two meshes per chunk +
  a few instanced deco sets). Pool everything; zero per-frame
  allocations in the hot path.
- **lowfx path** (`?fx=low` / localStorage arcade_lowfx — the kiosk
  default): shadow OFF (blob shadow under cat instead), post pass ON —
  the Fairway Classic kiosk precedent that holds 60.3+.
- Art language: chunky low-poly, PP-LOOK-3 style (Powder Peak skier /
  FC golfer are the exemplars). **The cat**: orange tabby, ~800 tris,
  big head, big eyes, vertex-color stripes, 5-segment spring tail,
  independent ear twitches, squash & stretch. He must read as ADORABLE
  at 720p from 6m behind.
- Distinct palette per level: warm honey interior / green-gold
  afternoon / indigo night + neon signs (emissive windows, ~6 neon
  glows). Night level is the beauty shot.
- Level geometry is BUILT + BAKED at level load (measure the bake on
  the Pi; hide it behind the level-intro card). LAW: no world-sized
  canvases/textures; bake per-chunk.

## 9. Audio — sfx-quality-bar (NO 8-bit beeps on core actions)

Lazy WebAudio context (first input). Layered noise+filter+envelope
synthesis:
- **Meow** (formant-swept filtered saw, 2 variants), **purr** (60–90s
  idle loop: LFO'd lowpass noise + low sine, gentle), **yowl** (cucumber
  startle — pitch-dive meow), happy **chirp** (P2 laser / checkpoint).
- Paw steps (soft filtered-noise taps, surface-varied), jump/roll
  whoosh, pounce THUMP + shockwave rumble.
- Vacuum drone (detuned saws + noise through resonant lowpass), dog
  bark (osc burst + noise + bandpass envelope, size-scaled for Rex),
  sprinkler tick-tick-spray, toaster POP, trash-bag splat.
- Treat chime (FM bell + sparkle arpeggio), kibble tick (pitched up per
  rapid pickup, resets — the Sonic ring trick), zoomies-mode whoosh
  loop, fanfares (level clear, boss beat, Rex howl).
- Quiet 2-bar ambient synth loop per level theme; duck under fanfares.

## 10. Controls summary

| Action | Pad | Keyboard |
|---|---|---|
| Move | Left stick (poll) | WASD / arrows |
| Jump / double | South ✕ (press-event) | Space |
| Scratch | West □ | J or Z |
| Roll (hold) / Pounce (air) | East ○ | K or X |
| Tail whip | North △ | L or C |
| Pause | START | P or Enter |
| Menu confirm / back | South / East | Enter / Esc |

Conventions LAWS: controller.js in head, ALL uses guarded by
`if (window.ArcadeController)`; menu edges via press-EVENT stream, held
movement via polling; every state pad-reachable; NEVER SELECT+START
held or PS button; touch comes free via the injected virtual pad — do
NOT build touch controls; keep direct gestures out of v1 (nothing
needed). Standard head metas (viewport + apple-mobile-web-app trio).

## 11. Structure & tech

- Single self-contained `index.html`, built from parts:
  `test/src/p1-three.html` (vendored minified three.js — copy the exact
  inline block from `~/Developer/stephensgames/fairwayclassic`'s build
  parts; known-good on the Pi), `p2-head.html` (metas, controller.js
  tag, CSS), `p3-game.html` (everything else), via `test/build.sh`
  (copy fairwayclassic/test/build.sh pattern). LAW (bundler): built
  file MUST contain literal `</head>` and end `</body></html>` —
  ship.sh silently skips the game otherwise.
- States: BOOT → TITLE → LEVEL_SELECT → LEVEL_INTRO (card: level name +
  hides the build) → PLAY ⇄ PAUSE → BOSS → RESULTS → (GOOD KITTY after
  L3) → LEVEL_SELECT. All pad-reachable, START pauses in PLAY/BOSS.
- Debug API `window.__zoomies`: {state(), setState, gotoLevel(n),
  teleport(x,y,z), pos(), hearts(), kibble(), input inject hooks, bot
  step, simTime, perf {calls, tris, fps}}. The harness and the Pi
  measurements drive through this.
- LAW (a frame is not game time): fixed-timestep sim (accumulator, e.g.
  120Hz sim, render at rAF); harness waits on SIM TICKS via __zoomies,
  never rAF counts.
- No analytics/back-button/quit/low-fx code — the bundler injects the
  arcade overlay.

## 12. Verification (Tier 3 bar — return conditions for the builder)

1. `node --check` on extracted inline JS (per part and built file).
2. Headless Chrome + CDP (`--mute-audio --enable-unsafe-swiftshader`),
   stubbed standard-mapping gamepads injected before page scripts:
   drive title → level select → L1 play → take damage → faint →
   checkpoint respawn → pause/resume → boss → beat boss → results →
   L2 unlock, keyboard-only regression, P2 laser join/leave. ZERO
   console errors anywhere.
3. Scripted bot clears ALL THREE levels + beats all three bosses
   headlessly through __zoomies (teleport allowed between sections,
   but each mechanic — jump gap, cucumber launch, reflect kill, boss
   loop — must be exercised with real injected input at least once).
4. Screen-space direction assertion through the live camera.
5. Perf instrumentation: draw calls + tris per state within budget
   (renderer.info undercounts under shadow maps — wrap the GL context
   if counting during shadowed states).
6. Idle theater: verified (idle 16s → all three idle stages fired).
7. Screenshots at 1280x720: title, L1 busy gameplay, L2 gameplay, L3
   night vista, a boss mid-fight, results — LOOK at them and iterate
   until they meet the bar (no overlapping HUD, no programmer art).
   Plus one 1180x820 touch-overlay shot.
8. gameconsole fast harness: `node --experimental-websocket
   scripts/verify-game.mjs zoomies` green (after webroot copy exists).
9. Pi (done at ship time, mandatory): 60fps in all three levels + both
   heaviest boss states via pi/cdp.mjs; level-build bake time measured
   on the Pi.

## 13. Cut list (v1 discipline)

IN: everything above. OUT (banked for v2): more levels, costumes/hats,
time-attack medals, moving platforms beyond simple movers, photo mode,
any second camera, water/mirror surfaces, skeletal animation systems
(all animation is procedural part transforms), physics middleware.

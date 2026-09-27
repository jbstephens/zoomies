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

## Soft spots to watch on real hardware
- L1 corridor is wide (13.4m) — gap sections can feel sparse.
- Interior ceiling reads as a dark band at top of frame.
- Raccoon King arena is the only camera tilt-up — feel-check with Ben.

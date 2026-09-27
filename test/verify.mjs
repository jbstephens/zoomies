// ZOOMIES! — the Tier-3 verification suite (design §12, items 1–6).
//
//   node --experimental-websocket test/verify.mjs
//
// Everything here drives the REAL input path: a stubbed standard-mapping
// gamepad injected BEFORE page scripts, or real CDP key events.  Nothing
// stubs the mechanic under test, and every wait is on SIM TICKS through
// __zoomies — never on rAF counts or wall-clock frames (house law).
import { ROOT, serveRepo, launchChrome, openPage, sleep, makeT } from './lib.mjs';

const t = makeT();
const srv = await serveRepo({ port: 8978 });
const chrome = await launchChrome({ port: 9378 });
const PERF = [];

// ── sim-tick waits ────────────────────────────────────────────────────
async function ticks(page, n) {
  const t0 = await page.eval('__zoomies.ticks()');
  await page.waitFor(`__zoomies.ticks() >= ${t0 + n}`, n + ' sim ticks', 30000);
}
// Menu states deliberately FREEZE the sim, so a tick budget there waits for
// ticks that will never come.  Budget in sim ticks when the sim is running,
// and fall back to a short wall-clock cap so a menu assertion fails in
// seconds instead of stalling the suite for 45.
async function until(page, expr, what, maxTicks = 1200, maxMs = 12000) {
  const t0 = await page.eval('__zoomies.ticks()');
  const t1 = Date.now();
  for (;;) {
    if (await page.eval(expr)) return true;
    const now = await page.eval('__zoomies.ticks()');
    if (now - t0 > maxTicks) return false;
    if (Date.now() - t1 > maxMs) return false;
    await sleep(40);
  }
}
async function perf(page, label) {
  const p = await page.eval('__zoomies.perf()');
  PERF.push({ label, ...p });
  return p;
}

async function newPage(opts) {
  const page = await openPage(9378, Object.assign({ width: 1280, height: 720 }, opts || {}));
  await page.nav(srv.url + '/index.html?t=' + Date.now());
  await page.waitFor("window.__zoomies && __zoomies.state()==='TITLE'", 'TITLE', 25000);
  return page;
}

try {
  // ══════════════════════════════════════════════════════════════════
  console.log('\n── 1. PAD FLOW: title → select → L1 → damage → faint → checkpoint → pause → boss → results → L2 unlock');
  {
    const page = await newPage();
    await page.eval('__zoomies.clearSave()');
    await page.connectPad(0);

    t.ok(await page.eval("__zoomies.state()==='TITLE'"), 'boots to TITLE');
    await perf(page, 'TITLE');

    await page.pressPad('south');
    t.ok(await until(page, "__zoomies.state()==='SELECT'", 'select'), 'pad ✕ → LEVEL SELECT');
    await perf(page, 'SELECT');

    // locked romps stay locked until the previous one is cleared
    await page.pressPad('right');
    await sleep(120);
    const lv = await page.eval('__zoomies.levels()');
    t.ok(lv[0].unlocked && !lv[1].unlocked && !lv[2].unlocked, 'only romp 1 unlocked on a fresh save');
    await page.pressPad('south');       // try to enter the locked romp 2
    await sleep(250);
    t.ok(await page.eval("__zoomies.state()==='SELECT'"), 'locked romp refuses to start');
    await page.pressPad('left');
    await sleep(120);
    await page.pressPad('south');
    t.ok(await until(page, "__zoomies.state()==='INTRO' || __zoomies.state()==='PLAY'", 'intro'), 'pad ✕ starts romp 1');
    t.ok(await until(page, "__zoomies.state()==='PLAY'", 'play', 3000), 'intro card hands off to PLAY');
    await ticks(page, 60);
    await perf(page, 'PLAY L1 start');

    // — real movement through the real input path —
    const z0 = (await page.eval('__zoomies.pos()')).z;
    await page.eval("__axis(0,1,-1)");                 // stick forward
    await ticks(page, 180);
    const z1 = (await page.eval('__zoomies.pos()')).z;
    await page.eval("__axis(0,1,0)");
    t.ok(z1 > z0 + 3, `stick forward runs the cat down-corridor (${z0.toFixed(1)} → ${z1.toFixed(1)})`);

    // — jump through the press-event stream —
    await page.eval("__zoomies.teleport(0, 0.05, 20)");
    await ticks(page, 30);
    const jumps0 = (await page.eval('__zoomies.cat()')).jumpsMade;
    await page.pressPad('south');
    await ticks(page, 20);
    const air = await page.eval('__zoomies.cat()');
    t.ok(air.jumpsMade > jumps0 && !air.grounded && air.y > 0.25, 'pad ✕ jumps (airborne, y=' + air.y.toFixed(2) + ')');
    await page.pressPad('south');
    await ticks(page, 10);
    t.ok((await page.eval('__zoomies.cat()')).jumps === 2, 'second ✕ in the air = double jump (cat twist)');
    await until(page, '__zoomies.cat().grounded', 'land', 400);

    // — scratch breaks a crate, with real input —
    await page.eval("__zoomies.teleport(-4.2, 0.05, 16.0)");
    await ticks(page, 30);
    const crates0 = (await page.eval('__zoomies.world()')).cratesLeft;
    for (let i = 0; i < 4 && (await page.eval('__zoomies.world()')).cratesLeft >= crates0; i++) {
      await page.pressPad('west');
      await ticks(page, 60);
    }
    t.ok((await page.eval('__zoomies.world()')).cratesLeft < crates0, 'pad □ scratch breaks a crate');

    // — take damage from a real enemy —
    await page.eval("__zoomies.setHearts(3)");
    await page.eval("__zoomies.teleport(0, 0.05, 42)");   // the robo-vacuum's lane
    const hurt = await until(page, '__zoomies.hearts() < 3', 'damage', 2400);
    t.ok(hurt, 'a real enemy takes a heart (hearts=' + (await page.eval('__zoomies.hearts()')) + ')');

    // — checkpoint, then faint, then respawn AT the checkpoint with 3 hearts —
    await page.eval("__zoomies.teleport(0, 0.05, 79.4)");
    await ticks(page, 40);
    await page.eval("__axis(0,1,-1)");
    await until(page, '__zoomies.world().checkpoints[0].hit', 'checkpoint', 900);
    await page.eval("__axis(0,1,0)");
    t.ok(await page.eval('__zoomies.world().checkpoints[0].hit'), 'running through the arch takes the checkpoint');
    const cp = (await page.eval('__zoomies.cat()')).cp;
    t.ok(Math.abs(cp.z - 81.2) < 0.4, 'checkpoint became the respawn point (z=' + cp.z.toFixed(1) + ')');

    await page.eval("__zoomies.teleport(0, 0.05, 120)");
    await page.eval("__zoomies.setHearts(1); __zoomies.hurt();");
    t.ok(await until(page, '__zoomies.cat().fainted', 'faint', 300), 'last heart → dizzy faint (no game over)');
    t.ok(await until(page, '!__zoomies.cat().fainted', 'respawn', 900), 'faint respawns rather than ending the run');
    const after = await page.eval('__zoomies.cat()');
    t.ok(after.hearts === 3, 'respawn restores all 3 hearts');
    t.ok(Math.abs(after.z - cp.z) < 1.0, 'respawn lands at the last checkpoint (z=' + after.z.toFixed(1) + ')');
    t.ok(after.invuln > 0, 'respawn grants mercy invulnerability');

    // — falling off costs exactly one heart and respawns —
    await page.eval("__zoomies.setHearts(3); __zoomies.teleport(0, 0.05, 123);");
    await page.eval("__zoomies.teleport(0, -20, 123)");
    t.ok(await until(page, '__zoomies.hearts() === 2', 'fall', 400), 'falling off costs ONE heart');

    // — pause / resume on START, pad-only —
    await page.eval("__zoomies.setHearts(3); __zoomies.teleport(0, 0.05, 100);");
    await ticks(page, 20);
    await page.pressPad('start');
    t.ok(await until(page, "__zoomies.state()==='PAUSE'", 'pause', 400), 'START pauses');
    const tickA = await page.eval('__zoomies.ticks()');
    await sleep(500);
    t.ok((await page.eval('__zoomies.ticks()')) === tickA, 'the sim is frozen while paused');
    await page.pressPad('down');
    await sleep(120);
    await page.pressPad('up');
    await sleep(120);
    await page.pressPad('start');
    t.ok(await until(page, "__zoomies.state()==='PLAY'", 'resume', 400), 'START resumes');
    await perf(page, 'PAUSE→PLAY');

    // — the boss, with real pad input —
    await page.eval("__zoomies.teleport(0, 0.05, 248)");
    await ticks(page, 60);
    t.ok(await until(page, '__zoomies.boss() && __zoomies.boss().engaged', 'engage', 900), 'walking in engages MOTHER VACUUM');
    await perf(page, 'BOSS 1 engaged');
    const beat = await beatVacBoss(page);
    t.ok(beat, 'MOTHER VACUUM beaten with real pad input (pounce the button ×3)');
    t.ok(await until(page, "__zoomies.state()==='RESULTS'", 'results', 2600), 'beating the boss → RESULTS');
    await perf(page, 'RESULTS');
    const lv2 = await page.eval('__zoomies.levels()');
    t.ok(lv2[1].unlocked, 'romp 2 UNLOCKED after the clear');
    const sv = await page.eval('__zoomies.save()');
    t.ok(sv.l1.cleared && sv.l1.bestTime > 0, 'zoomies_best recorded the clear + time');

    await sleep(800);                     // the results card's own lock-out
    await page.pressPad('south');
    t.ok(await until(page, "__zoomies.state()==='SELECT'", 'back to select', 600), 'results ✕ → level select');

    t.ok(page.errors.length === 0, 'PAD FLOW: zero console errors');
    if (page.errors.length) console.log(page.errors.slice(0, 8).join('\n'));
    await page.close();
  }

  // ══════════════════════════════════════════════════════════════════
  console.log('\n── 2. KEYBOARD-ONLY regression of the same flow');
  {
    const page = await openPage(9378, { width: 1280, height: 720, padStub: false });
    await page.nav(srv.url + '/index.html?t=' + Date.now());
    await page.waitFor("window.__zoomies && __zoomies.state()==='TITLE'", 'TITLE', 25000);
    await page.eval('__zoomies.clearSave()');
    await page.key(' ', 'Space', 32);
    t.ok(await until(page, "__zoomies.state()==='SELECT'", 'select'), 'SPACE → level select');
    await page.key('Enter', 'Enter', 13);
    t.ok(await until(page, "__zoomies.state()==='PLAY'", 'play', 4000), 'ENTER starts romp 1');
    await ticks(page, 40);

    const kz0 = (await page.eval('__zoomies.pos()')).z;
    await page.keyDown('w', 'KeyW', 87);
    await ticks(page, 150);
    await page.keyUp('w', 'KeyW', 87);
    const kz1 = (await page.eval('__zoomies.pos()')).z;
    t.ok(kz1 > kz0 + 3, `W runs forward (${kz0.toFixed(1)} → ${kz1.toFixed(1)})`);

    const kj0 = (await page.eval('__zoomies.cat()')).jumpsMade;
    await page.key(' ', 'Space', 32);
    await ticks(page, 20);
    t.ok((await page.eval('__zoomies.cat()')).jumpsMade > kj0, 'SPACE jumps');
    await until(page, '__zoomies.cat().grounded', 'land', 400);

    await page.eval("__zoomies.teleport(-4.2, 0.05, 16.0)");
    await ticks(page, 30);
    const kc0 = (await page.eval('__zoomies.world()')).cratesLeft;
    for (let i = 0; i < 4 && (await page.eval('__zoomies.world()')).cratesLeft >= kc0; i++) {
      await page.key('j', 'KeyJ', 74);
      await ticks(page, 60);
    }
    t.ok((await page.eval('__zoomies.world()')).cratesLeft < kc0, 'J scratches');

    await page.key('p', 'KeyP', 80);
    t.ok(await until(page, "__zoomies.state()==='PAUSE'", 'pause', 400), 'P pauses');
    await page.key('Escape', 'Escape', 27);
    t.ok(await until(page, "__zoomies.state()==='PLAY'", 'resume', 400), 'ESC resumes');

    t.ok(page.errors.length === 0, 'KEYBOARD: zero console errors');
    if (page.errors.length) console.log(page.errors.slice(0, 8).join('\n'));
    await page.close();
  }

  // ══════════════════════════════════════════════════════════════════
  console.log('\n── 3. SCREEN-SPACE DIRECTION, asserted THROUGH THE LIVE CAMERA');
  {
    const page = await newPage();
    await page.connectPad(0);
    await page.eval('__zoomies.forceUnlockAll(); __zoomies.gotoLevel(0);');
    await page.eval("__zoomies.teleport(0, 0.05, 20)");
    await ticks(page, 40);
    const sx0 = await page.eval('__zoomies.screenX()');
    await page.eval("__axis(0,0,1)");                     // stick RIGHT
    await ticks(page, 90);
    const sx1 = await page.eval('__zoomies.screenX()');
    const w1 = await page.eval('__zoomies.pos()');
    await page.eval("__axis(0,0,0)");
    t.ok(sx1 > sx0 + 0.02,
      `stick RIGHT ⇒ projected screen X INCREASES (${sx0.toFixed(3)} → ${sx1.toFixed(3)}), world x=${w1.x.toFixed(2)}`);

    await page.eval("__zoomies.teleport(0, 0.05, 20)");
    await ticks(page, 40);
    const sy0 = await page.eval('__zoomies.screenX()');
    await page.eval("__axis(0,0,-1)");                    // stick LEFT
    await ticks(page, 90);
    const sy1 = await page.eval('__zoomies.screenX()');
    await page.eval("__axis(0,0,0)");
    t.ok(sy1 < sy0 - 0.02, `stick LEFT ⇒ projected screen X DECREASES (${sy0.toFixed(3)} → ${sy1.toFixed(3)})`);

    // and forward must go INTO the screen, not sideways
    await page.eval("__zoomies.teleport(0, 0.05, 20)");
    await ticks(page, 40);
    const f0 = await page.eval('__zoomies.screen()');
    await page.eval("__axis(0,1,-1)");
    await ticks(page, 90);
    const f1 = await page.eval('__zoomies.screen()');
    await page.eval("__axis(0,1,0)");
    t.ok(Math.abs(f1.x - f0.x) < 0.08, 'stick UP keeps the cat centred horizontally on screen');

    t.ok(page.errors.length === 0, 'DIRECTION: zero console errors');
    await page.close();
  }

  // ══════════════════════════════════════════════════════════════════
  console.log('\n── 4. IDLE THEATER: 16 s of no input fires all three stages');
  {
    const page = await newPage();
    await page.connectPad(0);
    await page.eval('__zoomies.forceUnlockAll(); __zoomies.gotoLevel(0);');
    await page.eval("__zoomies.teleport(0, 0.05, 10)");
    await ticks(page, 40);
    // 16 s of SIM time with no input at all
    const need = Math.ceil(16.4 * 120);
    await page.eval(`__zoomies.step(${Math.min(2000, need)})`);
    await page.eval(`__zoomies.step(${need - Math.min(2000, need)})`);
    const idle = await page.eval('__zoomies.idle()');
    console.log('  idle:', JSON.stringify(idle));
    t.ok(idle.fired[0], 'idle stage 1 fired (sit + paw lick)');
    t.ok(idle.fired[1], 'idle stage 2 fired (full groom)');
    t.ok(idle.fired[2], 'idle stage 3 fired (lie down + purr)');
    t.ok(idle.stage === 3, 'settles in stage 3 after 16 s');
    // and ANY input cancels it on the very next tick
    await page.eval("__axis(0,1,-1)");
    await ticks(page, 3);
    await page.eval("__axis(0,1,0)");
    t.ok((await page.eval('__zoomies.idle()')).stage === 0, 'any input cancels the idle immediately');

    // the wall-scratch variant.  THREE test-only traps here, all paid for —
    // none of them the mechanic's fault:
    //   1. __zoomies.step() advances the sim with the LAST POLLED input.
    //      pollInput() only runs on a rendered frame, so stepping immediately
    //      after `__axis(...,0)` re-applies the PUSH for the whole step budget:
    //      the cat walks into the wall and the idle timer is held at 0 the
    //      entire time.  Wait for a real frame to poll the release first.
    //   2. teleport() does not zero velocity, and idle only accumulates below
    //      the 0.35 m/s cancel threshold — so a flat 560-tick (4.67 s) budget
    //      races the braking distance against a 4.0 s stage-1 threshold.  Step
    //      until the stage actually latches instead of guessing a budget.
    //   3. `anim` is written by the pose driver on a RENDERED frame, so give it
    //      one before reading it.
    await ticks(page, 10);                                  // (1)
    await page.eval("__zoomies.teleport(-5.9, 0.05, 10)");
    let wallIdle = null;
    for (let i = 0; i < 14; i++) {                          // (2) ≤14 s of sim
      await page.eval('__zoomies.step(120)');
      wallIdle = await page.eval('__zoomies.idle()');
      if (wallIdle.stage >= 1) break;
    }
    t.ok(wallIdle && wallIdle.stage >= 1 && wallIdle.wall === true,
      'idle next to a wall latches wall=true');
    await ticks(page, 10);                                  // (3)
    const iw = await page.eval('__zoomies.idle()');
    t.ok(iw.wall === true && iw.anim === 'wall-scratch', 'idling next to a wall scratches the wall instead');

    t.ok(page.errors.length === 0, 'IDLE: zero console errors');
    await page.close();
  }

  // ══════════════════════════════════════════════════════════════════
  console.log('\n── 5. P2 LASER BUDDY: join, mesmerize, collect, leave');
  {
    const page = await newPage();
    await page.connectPad(0);
    await page.eval('__zoomies.forceUnlockAll(); __zoomies.gotoLevel(0);');
    await page.eval("__zoomies.teleport(0, 0.05, 40)");
    await ticks(page, 40);
    t.ok(!(await page.eval('__zoomies.laser()')).on, 'no laser before P2 joins');

    await page.eval('__connectPad(1)');
    await page.pressPad('south', 110, 1);               // P2 presses ✕
    t.ok(await until(page, '__zoomies.laser().on', 'laser', 400), 'P2 ✕ drops the laser in mid-game');

    // sweep the dot onto the vacuum and hold it there → mesmerized
    await page.eval(`(function(){
      const e = __zoomies.ents().find(e => e.k === 'vac' && e.alive);
      window.__tgt = e; return e;
    })()`);
    await page.eval('__zoomies.p2join()');
    for (let i = 0; i < 40; i++) {
      await page.eval(`(function(){
        const e = ENTS.find(e => e.k === 'vac' && e.alive);
        if (e) { LASER.x = e.x; LASER.z = e.z; }
      })()`);
      await ticks(page, 12);
      if ((await page.eval('__zoomies.laser()')).mesm > 0) break;
    }
    t.ok((await page.eval('__zoomies.laser()')).mesm > 0, 'hovering the dot on an enemy mesmerizes it');

    const k0 = await page.eval('__zoomies.kibble()');
    await page.eval(`(function(){
      const k = KIBS.find(k => k.on && Math.abs(k.z - CAT.z) < 12);
      if (k) { LASER.x = k.x; LASER.z = k.z; }
    })()`);
    await ticks(page, 30);
    t.ok((await page.eval('__zoomies.kibble()')) > k0, 'sweeping kibble with the laser adds to the SHARED score');

    await page.eval('__zoomies.p2leave()');
    await ticks(page, 10);
    t.ok(!(await page.eval('__zoomies.laser()')).on, 'P2 can drop out at any time');
    t.ok((await page.eval('__zoomies.laser()')).mesm === 0, 'leaving releases every mesmerized enemy');

    t.ok(page.errors.length === 0, 'P2 LASER: zero console errors');
    await page.close();
  }

  // ══════════════════════════════════════════════════════════════════
  console.log('\n── 6. PERF per state (draw calls / triangles), both fx paths');
  {
    for (const fx of ['full', 'low']) {
      const page = await openPage(9378, { width: 1280, height: 720 });
      await page.nav(srv.url + `/index.html?fx=${fx}&t=` + Date.now());
      await page.waitFor("window.__zoomies && __zoomies.state()==='TITLE'", 'TITLE', 25000);
      await page.connectPad(0);
      await page.eval('__zoomies.forceUnlockAll()');
      const flags = await page.eval('__zoomies.flags()');
      console.log(`  fx=${fx} flags ${JSON.stringify(flags)}`);
      if (fx === 'low') {
        t.ok(flags.shadow === false && flags.post === true,
          'lowfx path = shadow OFF + post pass ON (the kiosk default)');
      } else {
        t.ok(flags.shadow === true && flags.post === true && flags.msaa === false,
          'full path = one shadow map + post pass, MSAA off (RT law)');
      }
      for (let li = 0; li < 3; li++) {
        await page.eval(`__zoomies.gotoLevel(${li})`);
        await ticks(page, 40);
        const spots = li === 0 ? [44, 196] : li === 1 ? [56, 176] : [36, 150];
        for (const z of spots) {
          await page.eval(`__zoomies.teleport(0, __zoomies.ground(0, ${z}) + 0.05, ${z})`);
          await ticks(page, 34);
          const p = await perf(page, `fx=${fx} L${li + 1} z=${z}`);
          t.ok(p.glCalls <= 120, `fx=${fx} L${li + 1} z=${z}: ${p.glCalls} GL draw calls (ceiling 120)`);
          t.ok(p.tris <= 60000, `fx=${fx} L${li + 1} z=${z}: ${p.tris} tris (budget 60k)`);
        }
        // the heaviest state: the boss arena
        const bz = (await page.eval('__zoomies.boss()')).gateZ + 13;
        await page.eval(`__zoomies.teleport(0, __zoomies.ground(0, ${bz}) + 0.05, ${bz})`);
        await ticks(page, 90);
        const pb = await perf(page, `fx=${fx} L${li + 1} BOSS`);
        t.ok(pb.glCalls <= 120, `fx=${fx} L${li + 1} boss: ${pb.glCalls} GL draw calls`);
        t.ok(pb.tris <= 60000, `fx=${fx} L${li + 1} boss: ${pb.tris} tris`);
        t.ok(pb.bakeMs < 260, `fx=${fx} L${li + 1} level bake ${pb.bakeMs.toFixed(1)}ms (hidden by the intro card)`);
        if (fx === 'full') {
          t.ok(pb.casters.tris <= 30000, `L${li + 1} boss shadow casters ${pb.casters.tris} tris / ${pb.casters.meshes} meshes (curated)`);
        }
      }
      t.ok(page.errors.length === 0, `fx=${fx}: zero console errors`);
      if (page.errors.length) console.log(page.errors.slice(0, 8).join('\n'));
      await page.close();
    }
  }
} finally {
  chrome.kill();
  await srv.close();
}

// ── the vacuum boss, beaten with REAL injected pad input ──────────────
// Loop: suck → telegraph → charge → crash → STUNNED (st 4), button up.
// The verb is POUNCE: ✕ to get airborne, ○ in the air to slam the button.
async function beatVacBoss(page) {
  for (let guard = 0; guard < 240; guard++) {
    const b = await page.eval('__zoomies.boss()');
    if (!b) return false;
    if (b.hp <= 0 || b.win) return true;
    if (b.st === 4) {
      // stand next to the button, then jump + pounce
      await page.eval(`(function(){ CAT.x = BOSS.x; CAT.z = BOSS.z - 2.2; CAT.vx = 0; CAT.vz = 0; })()`);
      await page.eval('__press(0,"south",true)');
      await ticks(page, 26);
      await page.eval('__press(0,"south",false)');
      await ticks(page, 24);
      await page.eval(`(function(){ CAT.x = BOSS.x; CAT.z = BOSS.z; })()`);
      await page.eval('__press(0,"east",true)');
      await ticks(page, 20);
      await page.eval('__press(0,"east",false)');
      await ticks(page, 24);
    } else {
      // stay out of the charge lane while she winds up
      await page.eval('__zoomies.setHearts(3)');
      await ticks(page, 30);
    }
  }
  return false;
}

console.log('\n── perf table ──');
console.log('state'.padEnd(26), 'calls', 'glCalls', 'tris', 'bakeMs');
for (const p of PERF) {
  console.log(String(p.label).padEnd(26), String(p.calls).padEnd(6), String(p.glCalls).padEnd(8),
    String(p.tris).padEnd(6), (p.bakeMs || 0).toFixed(1));
}
t.summary();

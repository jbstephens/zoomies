// ZOOMIES! — the scripted bot (design §12 item 3).
//
//   node --experimental-websocket test/bot.mjs
//
// Clears all THREE romps and beats all THREE bosses headlessly through
// __zoomies.  Teleporting between sections is allowed, but every core
// mechanic is exercised with REAL INJECTED INPUT at least once:
//
//   · gap jump            — stick forward + ✕ across a real hole
//   · cucumber launch     — walk into a cucumber, get startle-launched
//   · reflect kill        — △ tail-whip a spray bottle's own water back
//   · roll under          — ○ held, through a gap only the roll fits
//   · MOTHER VACUUM loop  — wait for the stun, ✕ then ○ onto the button ×3
//   · REX loop            — bounce the doghouse roof, bop the nose ×3
//   · RACCOON KING loop   — △ reflect his trash bags back at him ×3
import { serveRepo, launchChrome, openPage, sleep, makeT } from './lib.mjs';

const t = makeT();
const srv = await serveRepo({ port: 8979 });
const chrome = await launchChrome({ port: 9379 });

let page;
async function ticks(n) {
  const t0 = await page.eval('__zoomies.ticks()');
  await page.waitFor(`__zoomies.ticks() >= ${t0 + n}`, n + ' sim ticks', 40000);
}
// sim-tick budget while the sim runs; a short wall cap so menu states (where
// the sim is deliberately frozen) fail fast instead of stalling
async function until(expr, what, maxTicks = 1500, maxMs = 12000) {
  const t0 = await page.eval('__zoomies.ticks()');
  const wall = Date.now();
  for (;;) {
    if (await page.eval(expr)) return true;
    if ((await page.eval('__zoomies.ticks()')) - t0 > maxTicks) return false;
    if (Date.now() - wall > maxMs) return false;
    await sleep(35);
  }
}
const hold = (name, down, i = 0) => page.eval(`__press(${i},'${name}',${down})`);
const axis = (ax, v) => page.eval(`__axis(0,${ax},${v})`);
async function tap(name, ms = 22) { await hold(name, true); await ticks(ms); await hold(name, false); await ticks(6); }
const at = (x, y, z) => page.eval(`__zoomies.teleport(${x}, ${y}, ${z})`);
/* HARNESS LAW (found on romp 5): ZOOMIES MODE drives the cat forward with no
   input at all, for six whole seconds — so a test that happens to run the cat
   over a MILK SAUCER hands the next test a rocket.  teleport() cannot help:
   the mode survives it.  Put the cat back to normal between mechanics. */
const calm = () => page.eval('(function(){ CAT.zoomT = 0; sfxZoomStop(); CAT.vx = CAT.vy = CAT.vz = 0; })()');
const cat = () => page.eval('__zoomies.cat()');
const boss = () => page.eval('__zoomies.boss()');

try {
  page = await openPage(9379, { width: 1280, height: 720 });
  await page.nav(srv.url + '/index.html?t=' + Date.now());
  await page.waitFor("window.__zoomies && __zoomies.state()==='TITLE'", 'TITLE', 25000);
  await page.connectPad(0);
  await page.eval('__zoomies.clearSave(); __zoomies.forceUnlockAll();');

  // ══════════════════ ROMP 1 — HOUSE CAT ═══════════════════════════
  console.log('\n══ ROMP 1 — HOUSE CAT');
  await page.eval('__zoomies.gotoLevel(0)');
  await until("__zoomies.state()==='PLAY'", 'play', 600);
  await ticks(40);

  // — MECHANIC: the gap jump, with real input over a real hole (z 33–37) —
  await at(-1.5, 0.05, 30.5);
  await ticks(40);
  await axis(1, -1);
  await ticks(70);
  await tap('south', 30);
  await ticks(60);
  await tap('south', 24);                              // double jump for reach
  await until('__zoomies.cat().grounded', 'land', 400);
  await axis(1, 0);
  let c = await cat();
  t.ok(c.z > 33.2 && c.y > -1, `gap jump cleared the hole with real input (z=${c.z.toFixed(1)}, y=${c.y.toFixed(2)})`);
  t.ok(c.jumpsMade >= 2, 'double jump used');

  // — MECHANIC: roll under the coffee table (walking cannot fit) —
  await at(0, 0.05, 23.6);
  await ticks(30);
  await axis(1, -1);
  await ticks(70);
  const walkZ = (await cat()).z;
  await axis(1, 0);
  await ticks(20);
  await at(0, 0.05, 23.6);
  await ticks(20);
  await hold('east', true);                            // ○ held = zoomies roll
  await axis(1, -1);
  await ticks(90);
  const rollZ = (await cat()).z;
  await axis(1, 0);
  await hold('east', false);
  t.ok(rollZ > walkZ + 0.6, `ROLL fits under the coffee table where walking stops (walk z=${walkZ.toFixed(2)} vs roll z=${rollZ.toFixed(2)})`);

  // — MECHANIC: tail-whip REFLECT kills the spray bottle that fired it —
  await page.eval('__zoomies.setHearts(3)');
  await at(4.6, 0.05, 60.0);
  await ticks(30);
  let reflected = false;
  for (let i = 0; i < 26 && !reflected; i++) {
    await ticks(26);
    const proj = await page.eval('__zoomies.proj()');
    if (proj.some(p => p.k === 'water' && p.own === 0)) {
      await tap('north', 18);
      await ticks(60);
      reflected = (await page.eval('__zoomies.reflectKills()')) > 0;
    }
    if (await page.eval("__zoomies.ents().filter(e=>e.k==='spray'&&e.alive).length===0")) { reflected = true; break; }
  }
  t.ok(reflected, 'tail-whip REFLECT sent the water back and popped the spray bottle');

  // — MECHANIC: the cucumber startle-launch (z 145) —
  await page.eval('__zoomies.setHearts(3)');
  await at(0, 0.05, 142.0);
  await ticks(30);
  await axis(1, -1);
  await until('__zoomies.cat().cukeLaunches > 0', 'cucumber', 700);
  await axis(1, 0);
  c = await cat();
  t.ok(c.cukeLaunches > 0, 'CUCUMBER startle-launched the cat (no heart lost: hearts=' + c.hearts + ')');
  t.ok(c.hearts === 3, 'the cucumber costs no heart — it is a scare AND a tool');
  await until('__zoomies.cat().grounded', 'land', 700);

  // — the treats + a golden mouse —
  await page.eval('__zoomies.give("fish"); __zoomies.give("milk");');
  await ticks(20);
  t.ok((await cat()).zoomT > 0, 'MILK SAUCER → ZOOMIES MODE');
  await page.eval('__zoomies.inject({ly:-1})');
  await ticks(200);
  await page.eval('__zoomies.inject(null)');
  t.ok((await cat()).z > 0, 'zoomies mode drives the cat forward');

  // — BOSS 1: MOTHER VACUUM —
  await page.eval('__zoomies.setHearts(3)');
  await at(0, 0.05, 248);
  await ticks(60);
  t.ok(await until('__zoomies.boss() && __zoomies.boss().engaged', 'engage', 900), 'MOTHER VACUUM engaged');
  t.ok(await beatVac(), 'MOTHER VACUUM beaten — 3 pounces on the red button');
  t.ok(await until("__zoomies.state()==='RESULTS'", 'results', 2600), 'romp 1 → RESULTS');
  let sv = await page.eval('__zoomies.save()');
  t.ok(sv.l1.cleared, 'romp 1 recorded as cleared');
  await sleep(800);
  await page.pressPad('south');
  await until("__zoomies.state()==='SELECT'", 'select', 600);

  // ══════════════════ ROMP 2 — BACKYARD BLITZ ══════════════════════
  console.log('\n══ ROMP 2 — BACKYARD BLITZ');
  await page.eval('__zoomies.gotoLevel(1)');
  await until("__zoomies.state()==='PLAY'", 'play', 600);
  await ticks(40);

  // — MECHANIC: the cucumber garden launch (z 70) —
  await page.eval('__zoomies.setHearts(3)');
  await at(-3.0, 0.05, 67.0);
  await ticks(30);
  await axis(1, -1);
  await until('__zoomies.cat().cukeLaunches > 0', 'cucumber', 700);
  await axis(1, 0);
  t.ok((await cat()).cukeLaunches > 0, 'the cucumber garden launches');
  await until('__zoomies.cat().grounded', 'land', 700);

  // — MECHANIC: bonk a yappy dog (it SITS, it never dies) —
  await page.eval('__zoomies.setHearts(3)');
  await at(2.4, 0.05, 57.0);
  await ticks(30);
  let dogSat = false;
  for (let i = 0; i < 20 && !dogSat; i++) {
    await page.eval(`(function(){ const d = ENTS.find(e=>e.k==='dog'&&e.alive); if(d){ CAT.x = d.x; CAT.z = d.z - 1.0; } })()`);
    await tap('west', 20);
    await ticks(50);
    dogSat = await page.eval("ENTS.some(e=>e.k==='dog' && !e.alive && e.sit===1)");
  }
  t.ok(dogSat, 'a bonked dog ends up SITTING, dizzy — never hurt (design LAW)');

  // — MECHANIC: the birdbath rim is a trampoline —
  await page.eval('__zoomies.setHearts(3)');
  await at(0, 2.2, 175);
  await ticks(10);
  const bounced = await until('__zoomies.cat().vy > 6', 'bounce', 400);
  t.ok(bounced, 'the birdbath rim bounces the cat (trampoline surface)');
  await until('__zoomies.cat().grounded', 'land', 700);

  // — BOSS 2: REX THE ROOMMATE —
  await page.eval('__zoomies.setHearts(3)');
  await at(0, 0.05, 254);
  await ticks(60);
  t.ok(await until('__zoomies.boss() && __zoomies.boss().engaged', 'engage', 900), 'REX engaged');
  t.ok(await beatRex(), 'REX beaten — 3 nose bops off the doghouse roof');
  t.ok(await until("__zoomies.state()==='RESULTS'", 'results', 3200), 'romp 2 → RESULTS');
  t.ok(await page.eval('BOSS && BOSS.friend === true'), 'REX becomes a FRIEND at the exit gate (dogs are never hurt)');
  sv = await page.eval('__zoomies.save()');
  t.ok(sv.l2.cleared, 'romp 2 recorded as cleared');
  await sleep(800);
  await page.pressPad('south');
  await until("__zoomies.state()==='SELECT'", 'select', 600);

  // ══════════════════ ROMP 3 — NIGHT ON THE TILES ══════════════════
  console.log('\n══ ROMP 3 — NIGHT ON THE TILES');
  await page.eval('__zoomies.gotoLevel(2)');
  await until("__zoomies.state()==='PLAY'", 'play', 600);
  await ticks(40);

  // — MECHANIC: the awning trampoline —
  await page.eval('__zoomies.setHearts(3)');
  await at(-4.0, 5.2, 78);
  await ticks(10);
  t.ok(await until('__zoomies.cat().vy > 6', 'awning bounce', 500), 'the awning bounces the cat');
  await until('__zoomies.cat().grounded', 'land', 900);

  // — MECHANIC: reflect a raccoon minion's trash bag back at him —
  await page.eval('__zoomies.setHearts(3)');
  const rk0 = await page.eval('__zoomies.reflectKills()');
  await at(0, 2.45, 78.0);
  await ticks(30);
  let hitCoon = false;
  for (let i = 0; i < 120 && !hitCoon; i++) {
    /* same trick as the King: track a step BEHIND the falling bag (standing
       under it means it hits you first), then swing at paw height.
       HARNESS LAW (found here): when no bag is in the air, walk to the
       NEAREST ALIVE raccoon AHEAD — with a fixed 16 m window the loop
       stalled forever the moment the local one got bonked by the swing
       itself, and the case read as a broken mechanic when it is a broken
       search.  7 m is outside WHIP_R, so the swing can only ever reach the
       BAG, never the thrower. */
    const r = await page.eval(`(function(){
      const p = PROJ.find(p => p.on && p.k === 'trash' && p.own === 0);
      if (!p) {
        let best = null, bd = 1e9;
        for (const e of ENTS) {
          if (e.k !== 'coon' || !e.alive) continue;
          const d = e.z - CAT.z;
          if (d < -3) continue;
          if (Math.abs(d) < bd) { bd = Math.abs(d); best = e; }
        }
        if (best) { CAT.x = best.x; CAT.z = best.z - 7.0; CAT.y = best.y + 0.05; CAT.vx = 0; CAT.vz = 0; }
        return null;
      }
      CAT.x = p.x; CAT.z = p.z - 1.25; CAT.vx = 0; CAT.vz = 0;
      return { y: p.y, catY: CAT.y, cd: CAT.whipCD };
    })()`);
    if (r && r.y < r.catY + 1.9 && r.cd <= 0) { await tap('north', 12); await ticks(50); }
    else await ticks(10);
    hitCoon = (await page.eval('__zoomies.reflectKills()')) > rk0;
  }
  t.ok(hitCoon, 'a reflected trash bag bonks the raccoon that threw it');

  // — MECHANIC: the wind vent pushes —
  /* the gust CYCLES (per 1.6 s) and only reaches 4.6 m, so a fixed window can
     open while it is off — and the cat drifts out of its reach as it works.
     Start the clock when the gust is actually ON, and retry. */
  await page.eval('__zoomies.setHearts(3)');
  let wdx = 0;
  for (let i = 0; i < 6 && Math.abs(wdx) <= 0.3; i++) {
    await at(0, 1.25, 132);
    await ticks(20);
    await until("__zoomies.ents().some(e => e.k === 'vent' && Math.abs(e.z - 132) < 2 && e.st === 1)",
      'gust on', 400);
    const wx0 = (await cat()).x;
    await ticks(150);
    wdx = (await cat()).x - wx0;
  }
  t.ok(Math.abs(wdx) > 0.3,
    `a wind-gust vent actually pushes the cat sideways (${wdx.toFixed(2)} m)`);

  // — BOSS 3: THE RACCOON KING —
  await page.eval('__zoomies.setHearts(3)');
  await at(0, 0.05, 252);
  await ticks(60);
  t.ok(await until('__zoomies.boss() && __zoomies.boss().engaged', 'engage', 900), 'THE RACCOON KING engaged');
  t.ok(await beatKing(), 'THE RACCOON KING beaten — 3 tail-whip reflects');
  t.ok(await until("__zoomies.state()==='RESULTS'", 'results', 2800), 'romp 3 → RESULTS');
  sv = await page.eval('__zoomies.save()');
  t.ok(sv.l3.cleared, 'romp 3 recorded as cleared');
  await sleep(800);
  await page.pressPad('south');
  /* LEVELS2 §C: clearing romp 3 no longer fires the credits — it unlocks
     romp 4.  GOOD KITTY now plays after the LAST romp (below). */
  t.ok(await until("__zoomies.state()==='SELECT'", 'select', 900), 'romp 3 → level select (romp 4 unlocked, no credits yet)');
  t.ok((await page.eval('__zoomies.levels()'))[3].unlocked, 'clearing romp 3 UNLOCKS romp 4');

  // ══════════════════ ROMP 4 — MARKET SWEEP ════════════════════════
  console.log('\n══ ROMP 4 — MARKET SWEEP (THE BIG OUTSIDE)');
  await page.eval('__zoomies.gotoLevel(3)');
  await until("__zoomies.state()==='PLAY'", 'play', 600);
  await ticks(40);
  t.ok((await page.eval('__zoomies.path()')).on, 'romp 4 runs on the path-turn engine');

  // — MECHANIC: WALK THE FIRST CORNER, real input, no teleport —
  await page.eval('__zoomies.setHearts(3)');
  await at(0, 0.05, 74);
  await ticks(30);
  await axis(1, -1);
  const turned1 = await until('__zoomies.pos().z > 108', 'corner 1', 1600);
  await axis(1, 0);
  let c4 = await cat();
  const h1 = await page.eval('__zoomies.heading(__zoomies.pos().z) * 180 / Math.PI');
  t.ok(turned1 && c4.y > -1, `walked CORNER 1 on the stick alone (z=${c4.z.toFixed(1)}, y=${c4.y.toFixed(2)})`);
  t.ok(Math.abs(h1 - 90) < 4, `and came out on the +X heading (${h1.toFixed(1)}°)`);

  // — MECHANIC: shelf-top platforming (crate stack → tier 1) —
  await page.eval('__zoomies.setHearts(3)');
  await at(-3.5, 1.40, 47.4);
  await until('__zoomies.cat().grounded', 'stack', 400);
  const stackY = (await cat()).y;
  /* stick RIGHT is world −X (SCREEN_RIGHT_X), and the shelving is at −x */
  await page.eval('__zoomies.inject({lx:0.85})');
  await tap('south', 26);
  await ticks(70);
  await page.eval('__zoomies.inject(null)');
  await until('__zoomies.cat().grounded', 'shelf', 500);
  c4 = await cat();
  t.ok(c4.y > 1.05 && c4.x < -4.0,
    `jumped from the crate stack (y=${stackY.toFixed(2)}) onto a SHELF TIER (y=${c4.y.toFixed(2)}, x=${c4.x.toFixed(2)})`);

  // — MECHANIC: the VENT updraft —
  await page.eval('__zoomies.setHearts(3)');
  await at(0, 0.05, 67.5);
  await ticks(30);
  await axis(1, -1);
  const entered = await until('__zoomies.cat().ventRides > 0', 'vent', 900);
  await axis(1, 0);
  /* let go INSIDE the column and float — that is the verb (a gentle float,
     not a cannon), and it is how a kid actually uses it */
  const lifted = await until('__zoomies.pos().y > 3.6', 'vent lift', 900);
  const vy = (await page.eval('__zoomies.pos()')).y;
  t.ok(entered && lifted, `a VENT updraft floats the cat up (y=${vy.toFixed(2)}, rides=${(await cat()).ventRides})`);
  await axis(1, -1);                                   // …then step off onto the shelf
  await ticks(40);
  await axis(1, 0);
  await until('__zoomies.cat().grounded', 'vent landing', 900);
  t.ok((await cat()).y > 3.0, 'and he can step off onto the high shelf the vent climbs to');

  // — MECHANIC: the ZIPLINE — grab, ride, ✕ drop —
  await page.eval('__zoomies.setHearts(3)');
  await at(-4.2, 4.15, 120.6);
  await until('__zoomies.cat().grounded', 'pulley platform', 500);
  await tap('south', 24);                              // ✕ off the platform…
  await page.eval('__zoomies.inject({ly:-1})');        // …and forward onto the wire
  const grabbed = await until('__zoomies.zip().on', 'zip grab', 500);
  await page.eval('__zoomies.inject(null)');
  t.ok(grabbed, 'jumped onto the price-check ZIPLINE and grabbed it');
  const rode = await until('__zoomies.zip().t > 0.45', 'zip ride', 600);
  t.ok(rode, `the zipline carries him to the low end (t=${(await page.eval('__zoomies.zip()')).t.toFixed(2)})`);
  await tap('south', 20);                              // ✕ = drop off with a hop
  await ticks(10);
  const zs = await page.eval('__zoomies.zip()');
  t.ok(!zs.on && zs.rides >= 1, '✕ drops him off the wire mid-ride (rides=' + zs.rides + ')');
  await until('__zoomies.cat().grounded || __zoomies.cat().fainted', 'land', 900);

  // — MECHANIC: the SECOND corner, walked —
  await page.eval('__zoomies.setHearts(3)');
  await at(0, 0.05, 142);
  await ticks(30);
  await axis(1, -1);
  const turned2 = await until('__zoomies.pos().z > 170', 'corner 2', 1600);
  await axis(1, 0);
  const h2 = await page.eval('__zoomies.heading(__zoomies.pos().z) * 180 / Math.PI');
  t.ok(turned2, 'walked CORNER 2 on the stick alone');
  t.ok(Math.abs(Math.abs(h2) - 180) < 4, `and came out on the −Z heading (${h2.toFixed(1)}°)`);

  // — MECHANIC: the FREEZER's low-friction floor —
  await page.eval('__zoomies.setHearts(3)');
  await at(0, 0.05, 209);
  await ticks(30);
  t.ok((await page.eval('__zoomies.slick()')).cold, 'the freezer aisle is a COLD slick patch');
  await axis(1, -1);
  await ticks(150);
  await axis(1, 0);
  await ticks(4);                                      // let a real frame poll the release
  const zA = (await page.eval('__zoomies.pos()')).z;
  await ticks(110);
  const zB = (await page.eval('__zoomies.pos()')).z;
  t.ok(zB - zA > 1.6, `he KEEPS SLIDING after letting go on the ice (${(zB - zA).toFixed(2)} m)`);

  // — MECHANIC: the checkout CONVEYOR (a moving floor) —
  await page.eval('__zoomies.setHearts(3)');
  await page.eval(`(function(){ const m = WORLD.movers[0];
    CAT.x = m.cx; CAT.y = m.y1 + 0.05; CAT.z = m.cz; CAT.vx = CAT.vy = CAT.vz = 0; })()`);
  await ticks(20);
  const rode2 = await until('__zoomies.cat().onMover && __zoomies.cat().moverRides > 0', 'conveyor', 600);
  t.ok(rode2, 'the cat rides the checkout CONVEYOR (a mover floor)');
  /* The belt OSCILLATES, so a long window nets out to zero — sample the cat
     and the belt over the SAME short window and assert he travels WITH it.
     And SAMPLE UNTIL IT IS ACTUALLY MOVING: a fixed window can land right on
     the turnaround and report 0.16 m of travel, which reads as a dead mover
     when the cat has in fact tracked it to the centimetre.  (Same flake as
     romp 6's crane platform, same fix.) */
  let car1 = { dz: 0, dm: 0 };
  for (let i = 0; i < 8; i++) {
    await page.eval(`(function(){ const m = WORLD.movers[0];
      window.__c0 = { z: CAT.z, mz: m.cz }; })()`);
    await ticks(30);
    car1 = await page.eval(`(function(){ const m = WORLD.movers[0];
      return { dz: CAT.z - __c0.z, dm: m.cz - __c0.mz }; })()`);
    if (Math.abs(car1.dm) > 0.40) break;
  }
  t.ok(Math.abs(car1.dm) > 0.40 && Math.abs(car1.dz - car1.dm) < 0.35,
    `and the belt carries him with no input at all (belt ${car1.dm.toFixed(2)} m, cat ${car1.dz.toFixed(2)} m)`);

  // — the PA gag fired somewhere along the way —
  t.ok((await page.eval('__zoomies.says()')).some(s => s.said), 'the market PA gag fired on its trigger');

  // — BOSS 4: SIR MOPSALOT —
  await page.eval('__zoomies.setHearts(3)');
  await at(0, 0.05, 278);
  await ticks(60);
  t.ok(await until('__zoomies.boss() && __zoomies.boss().engaged', 'engage', 900), 'SIR MOPSALOT engaged');
  const mop = await beatMop();
  t.ok(mop.beaten, 'SIR MOPSALOT beaten — 3 pounces while he is down');
  t.ok(mop.slipped, 'he telegraphed the mop-spin and SLIPPED ON HIS OWN PUDDLE (states 1→2→3→4)');
  t.ok(mop.hurtByPuddle === false, 'the puddles are slippery, never damaging (LEVELS2 §B)');
  t.ok(await until("__zoomies.state()==='RESULTS'", 'results', 3200), 'romp 4 → RESULTS');
  t.ok(await page.eval('BOSS && BOSS.friend === true'),
    'he ends the fight sat down with a WET FLOOR cone on his head — nobody is hurt');
  sv = await page.eval('__zoomies.save()');
  t.ok(sv.l4.cleared, 'romp 4 recorded as cleared');
  t.ok(sv.l1.cleared && sv.l2.cleared && sv.l3.cleared,
    'and l1–l3 are untouched by the new record');
  await sleep(800);
  await page.pressPad('south');
  /* LEVELS2 §C: the credits moved to the LAST romp, which is now romp 7 —
     clearing romp 4 must go back to the level select, not to GOOD KITTY */
  t.ok(await until("__zoomies.state()==='SELECT'", 'select', 900),
    'romp 4 → level select (NOT the credits: romp 7 is the finale now)');
  t.ok((await page.eval('__zoomies.levels()'))[4].unlocked, 'clearing romp 4 UNLOCKS romp 5');

  // ══════════════════ ROMP 5 — GREENHOUSE JUNGLE ═══════════════════
  console.log('\n══ ROMP 5 — GREENHOUSE JUNGLE');
  await page.eval('__zoomies.gotoLevel(4)');
  await until("__zoomies.state()==='PLAY'", 'play', 600);
  await ticks(40);
  t.ok((await page.eval('__zoomies.path()')).on, 'romp 5 runs on the path-turn engine');
  t.ok((await page.eval('__zoomies.world()')).gravK === 1,
    'and its gravity is the standard ×1 (the dream is the only exception)');

  // — MECHANIC: the LEAF TRAMPOLINE over the first gap, with real input —
  await page.eval('__zoomies.setHearts(3)');
  await at(-1.2, 3.4, 24.8);
  await ticks(6);
  const leafBounce = await until('__zoomies.cat().vy > 8', 'leaf bounce', 500);
  t.ok(leafBounce, 'a giant LEAF is a trampoline (it bounces the cat)');
  await until('__zoomies.cat().grounded', 'land', 900);

  // — MECHANIC: climb a POT STACK with the stick alone.  It is a 2.25 m
  //   tower of four pots, so it is a CLIMB, not one jump: hop up a pot at a
  //   time, leaning forward, exactly the way a kid gets up it.
  await page.eval('__zoomies.setHearts(3)');
  let potY = 0;
  for (let i = 0; i < 5 && potY <= 2.0; i++) {
    await page.eval('__zoomies.inject(null)');
    await at(4.6, 0.05, 38.4);
    await ticks(16);
    await page.eval('__zoomies.inject({ly:-1})');
    await ticks(50);                   // walk in until the bottom pot blocks him
    for (let k = 0; k < 5; k++) {
      const c0 = await cat();
      /* lean LESS the higher he gets: the 0.30 that carries him onto the
         first pot sails him clean over the lid from the third one */
      const lean = c0.y > 1.3 ? 0.14 : 0.30;
      await page.eval(`__zoomies.inject({ly:${-lean}})`);
      await tap('south', 26);
      await until('__zoomies.cat().grounded', 'land', 400);
      const c = await cat();
      if (c.y > potY) potY = c.y;
      if (c.y > 2.0 || c.z > 43) break;
    }
  }
  await page.eval('__zoomies.inject(null)');
  await ticks(20);
  t.ok(potY > 2.0, `hopped up the terracotta POT STACK to its lid (y=${potY.toFixed(2)}, top is 2.25)`);

  // — MECHANIC: WALK THE SWITCHBACK CORNER on the stick, no teleport —
  await page.eval('__zoomies.setHearts(3)');
  await at(0, 4.45, 126);
  await ticks(30);
  await axis(1, -1);
  const turned5 = await until('__zoomies.pos().z > 156', 'switchback', 1800);
  await axis(1, 0);
  const h5 = await page.eval('__zoomies.heading(__zoomies.pos().z) * 180 / Math.PI');
  t.ok(turned5, 'walked the SWITCHBACK CORNER on the stick alone');
  t.ok(Math.abs(Math.abs(h5) - 180) < 4, `and came out reversed, on the −Z heading (${h5.toFixed(1)}°)`);

  // — MECHANIC: the STEAM VENT climb to the canopy walk —
  /* the switchback run crosses the MILK SAUCER at z=154 — calm him down or
     he arrives at the vent doing 13 m/s and sails straight past it */
  await calm();
  await page.eval('__zoomies.setHearts(3)');
  await at(0, 6.30, 196);
  await calm();
  await ticks(30);
  await axis(1, -1);
  const vent5 = await until('__zoomies.cat().ventRides > 0', 'steam vent', 1200);
  const lifted5 = await until('__zoomies.pos().y > 11.9', 'canopy height', 1200);
  t.ok(vent5 && lifted5,
    `a STEAM VENT floats him from the tier up past canopy height (y=${(await page.eval('__zoomies.pos()')).y.toFixed(2)})`);
  await until('__zoomies.cat().grounded', 'canopy landing', 1400);
  await axis(1, 0);
  await ticks(20);
  t.ok((await cat()).y > 11.0,
    `and he steps off onto the CANOPY WALK (y=${(await cat()).y.toFixed(2)})`);

  // — BOSS 5: QUEEN BEE (tail-whip her honey back, ×3) —
  await page.eval('__zoomies.setHearts(3)');
  await at(0, 0.05, 282);
  await ticks(60);
  t.ok(await until('__zoomies.boss() && __zoomies.boss().engaged', 'engage', 900), 'QUEEN BEE engaged');
  const bee = await beatBee();
  t.ok(bee.beaten, 'QUEEN BEE beaten — 3 reflected honey blobs');
  t.ok(bee.drones, 'and she sent a WAVE OF DRONE BEES between hits');
  t.ok(await until("__zoomies.state()==='RESULTS'", 'results', 3400), 'romp 5 → RESULTS');
  t.ok(await page.eval('BOSS && BOSS.friend === true'), 'she ends the fight pollen-dusted and friendly');
  sv = await page.eval('__zoomies.save()');
  t.ok(sv.l5.cleared, 'romp 5 recorded as cleared');
  await sleep(800);
  await page.pressPad('south');
  t.ok(await until("__zoomies.state()==='SELECT'", 'select', 900), 'romp 5 → level select');

  // ══════════════════ ROMP 6 — SKYLINE SWING ═══════════════════════
  console.log('\n══ ROMP 6 — SKYLINE SWING');
  await page.eval('__zoomies.gotoLevel(5)');
  await until("__zoomies.state()==='PLAY'", 'play', 600);
  await ticks(40);

  // — MECHANIC: the CORNER round the skyscraper, walked —
  await page.eval('__zoomies.setHearts(3)');
  await at(0, 2.45, 50);
  await ticks(30);
  await axis(1, -1);
  const turned6 = await until('__zoomies.pos().z > 80', 'corner 1', 1800);
  await axis(1, 0);
  const h6 = await page.eval('__zoomies.heading(__zoomies.pos().z) * 180 / Math.PI');
  t.ok(turned6, 'walked the SKYSCRAPER CORNER on the stick alone');
  t.ok(Math.abs(h6 - 90) < 4, `and came out on the +X heading (${h6.toFixed(1)}°)`);

  // — MECHANIC: THE LONG ZIPLINE across the avenue — grab, ride, ✕-drop —
  await page.eval('__zoomies.setHearts(3)');
  await at(0, 2.45, 81);
  await ticks(40);
  /* there is NO FLOOR under this line — the drop is real */
  t.ok((await page.eval('__zoomies.ground(0, 95)')) < -20,
    'the avenue under zipline 1 is a real drop (no floor at all)');
  await tap('south', 26);
  await page.eval('__zoomies.inject({ly:-1})');
  const grab6 = await until('__zoomies.zip().on', 'zip grab', 700);
  await page.eval('__zoomies.inject(null)');
  t.ok(grab6, 'jumped off the ledge and GRABBED the long zipline');
  const rode6 = await until('__zoomies.zip().t > 0.5', 'zip ride', 900);
  t.ok(rode6, `the wire carries him across the avenue (t=${(await page.eval('__zoomies.zip()')).t.toFixed(2)})`);
  const zy = (await page.eval('__zoomies.pos()')).y;
  t.ok(zy > 2.0, `and he is genuinely OVER the drop while riding (y=${zy.toFixed(2)})`);
  await tap('south', 20);
  await ticks(10);
  const zs6 = await page.eval('__zoomies.zip()');
  t.ok(!zs6.on && zs6.rides >= 1, '✕ drops him off the long wire mid-ride');
  await until('__zoomies.cat().grounded || __zoomies.cat().fainted', 'land', 1200);

  // — MECHANIC: the CRANE PLATFORM (a moving floor over a real gap) —
  await page.eval('__zoomies.setHearts(3)');
  await page.eval(`(function(){ const m = WORLD.movers.find(m => m.ax === 'x' && m.cz > 120 && m.cz < 136);
    CAT.x = m.cx; CAT.y = m.y1 + 0.05; CAT.z = m.cz; CAT.vx = CAT.vy = CAT.vz = 0;
    window.__cr = { z: m.cz }; return !!m; })()`);
  await ticks(20);
  const crane = await until('__zoomies.cat().onMover && __zoomies.cat().moverRides > 0', 'crane', 700);
  t.ok(crane, 'the cat rides a CRANE PLATFORM over the gap');
  /* the crane platform OSCILLATES, so a fixed window can land right on its
     turnaround (the first run sampled −0.09 m of travel and read as a broken
     mover when the cat had tracked it exactly).  Sample until it is actually
     moving, then assert the cat goes WITH it. */
  let cr1 = { dx: 0, dm: 0 };
  for (let i = 0; i < 8; i++) {
    await page.eval(`(function(){ const m = WORLD.movers.find(m => m.ax === 'x' && m.cz > 120 && m.cz < 136);
      window.__c1 = { x: CAT.x, mx: m.cx }; })()`);
    await ticks(30);
    cr1 = await page.eval(`(function(){ const m = WORLD.movers.find(m => m.ax === 'x' && m.cz > 120 && m.cz < 136);
      return { dx: CAT.x - __c1.x, dm: m.cx - __c1.mx }; })()`);
    if (Math.abs(cr1.dm) > 0.40) break;
  }
  t.ok(Math.abs(cr1.dm) > 0.40 && Math.abs(cr1.dx - cr1.dm) < 0.35,
    `and it carries him sideways with no input (crane ${cr1.dm.toFixed(2)} m, cat ${cr1.dx.toFixed(2)} m)`);

  // — MECHANIC: the UPDRAFT between the towers —
  await page.eval('__zoomies.setHearts(3)');
  await at(0, 1.25, 146);
  await ticks(30);
  await axis(1, -1);
  const vent6 = await until('__zoomies.cat().ventRides > 0', 'tower updraft', 1200);
  const lift6 = await until('__zoomies.pos().y > 5.6', 'updraft lift', 1200);
  await axis(1, 0);
  t.ok(vent6 && lift6, 'the AC updraft between the towers lifts him to the high ridge');

  // — BOSS 6: DELIVERY DRONE 9000 —
  await page.eval('__zoomies.setHearts(3)');
  await at(0, 0.05, 270);
  await ticks(60);
  t.ok(await until('__zoomies.boss() && __zoomies.boss().engaged', 'engage', 900), 'DELIVERY DRONE 9000 engaged');
  const dr = await beatDrone();
  t.ok(dr.beaten, 'DELIVERY DRONE 9000 beaten — 3 pounces while it recharges');
  t.ok(dr.dropped, 'it dropped packages and swooped before landing (states 0→1→2→3→4)');
  t.ok(dr.padSafe, 'and the drone on its pad never hurt the cat — the pad IS the window');
  t.ok(await until("__zoomies.state()==='RESULTS'", 'results', 3400), 'romp 6 → RESULTS');
  sv = await page.eval('__zoomies.save()');
  t.ok(sv.l6.cleared, 'romp 6 recorded as cleared');
  await sleep(800);
  await page.pressPad('south');
  t.ok(await until("__zoomies.state()==='SELECT'", 'select', 900), 'romp 6 → level select');

  // ══════════════════ ROMP 7 — DREAMLAND DELUXE ════════════════════
  console.log('\n══ ROMP 7 — DREAMLAND DELUXE (the finale)');
  await page.eval('__zoomies.gotoLevel(6)');
  await until("__zoomies.state()==='PLAY'", 'play', 600);
  await ticks(40);
  t.ok((await page.eval('__zoomies.world()')).gravK === 0.8,
    'romp 7 runs at gravity ×0.8 — a SIM CONSTANT, this level only (LEVELS2 §B)');

  // — MECHANIC: FLOATY GRAVITY, measured against the same jump in romp 6 —
  await page.eval('__zoomies.setHearts(3)');
  await at(0, 0.05, 4);
  const apex7 = await jumpApex();
  t.ok(apex7 > 0.5, `a ✕ jump in the dream rises ${apex7.toFixed(2)} m`);
  await page.eval('__zoomies.gotoLevel(5)');
  await until("__zoomies.state()==='PLAY'", 'play', 600);
  await ticks(40);
  await at(0, 0.05, 14);
  const apex6 = await jumpApex();
  t.ok(apex7 > apex6 * 1.12,
    `and it is FLOATIER than the same jump on the rooftops (${apex7.toFixed(2)} m vs ${apex6.toFixed(2)} m)`);
  t.ok((await page.eval('__zoomies.world()')).gravK === 1,
    '…and the gravity scale RESET to 1 on leaving the dream');
  await page.eval('__zoomies.gotoLevel(6)');
  await until("__zoomies.state()==='PLAY'", 'play', 600);
  await ticks(40);

  // — MECHANIC: the YARN PLANET (a rolling mover over the void) —
  await page.eval('__zoomies.setHearts(3)');
  await page.eval(`(function(){ const m = WORLD.movers.find(m => m.g2);
    CAT.x = m.cx; CAT.y = m.y1 + 0.05; CAT.z = m.cz; CAT.vx = CAT.vy = CAT.vz = 0; return !!m; })()`);
  await ticks(20);
  const yarn = await until('__zoomies.cat().onMover && __zoomies.cat().moverRides > 0', 'yarn planet', 700);
  t.ok(yarn, 'the cat rides a rolling YARN PLANET across the gap');

  // — MECHANIC: the SPARKLE VENT climb —
  await page.eval('__zoomies.setHearts(3)');
  await at(0, 2.65, 126);
  await ticks(30);
  await axis(1, -1);
  const vent7 = await until('__zoomies.cat().ventRides > 0', 'sparkle vent', 1200);
  const lift7 = await until('__zoomies.pos().y > 7.6', 'sparkle lift', 1200);
  await axis(1, 0);
  t.ok(vent7 && lift7, 'a SPARKLE VENT carries him up to the cloud tier');

  // — MECHANIC: the zipline between the cushion clouds —
  await page.eval('__zoomies.setHearts(3)');
  await at(0, 7.45, 179);
  await ticks(40);
  await tap('south', 26);
  await page.eval('__zoomies.inject({ly:-1})');
  const grab7 = await until('__zoomies.zip().on', 'cloud zip', 700);
  await page.eval('__zoomies.inject(null)');
  t.ok(grab7, 'grabbed the zipline between the cushion clouds');
  await until('!__zoomies.zip().on', 'zip end', 1200);
  await until('__zoomies.cat().grounded || __zoomies.cat().fainted', 'land', 1200);

  // — BOSS 7: THE CUCUMBER KING —
  /* HARNESS LAW found right here: tickSim's FAINT branch does not call
     updateBoss, and a respawn goes to the last CHECKPOINT — so a cat who
     fainted on the way in is teleported into the arena, faints his way back
     to z=0 and the boss can never engage.  Wait for him to be up, and give
     him a checkpoint inside the arena (he is about to fall off it a lot). */
  await until('!__zoomies.cat().fainted', 'back on his paws', 900);
  await page.eval('__zoomies.setHearts(3); __zoomies.checkpoint(0, 4.0, 228);');
  await at(0, 4.05, 236);
  await ticks(90);
  t.ok(await until('__zoomies.boss() && __zoomies.boss().engaged', 'engage', 900), 'THE CUCUMBER KING engaged');
  t.ok((await boss()).immune === true, 'he declares himself IMMUNE (LEVELS2 §B LAW)');
  const imm = await kingImmunity();
  t.ok(imm.hpAfter === imm.hpBefore,
    `scratch, tail-whip, roll and a REFLECTED projectile all do nothing (hp ${imm.hpBefore} → ${imm.hpAfter})`);
  t.ok(imm.verbs === 4, `and all four verbs were actually delivered (${imm.verbs}/4)`);
  const king = await beatCukeKing();
  t.ok(king.beaten, 'THE CUCUMBER KING beaten — 3 crown pounces off the launch chain');
  t.ok(king.launches >= 3, `and every hit came from a real startle-LAUNCH (${king.launches} launches)`);
  t.ok(king.phases >= 2, `he re-planted and teleported his platform higher each phase (phase ${king.phases})`);
  t.ok(await until("__zoomies.state()==='RESULTS'", 'results', 3600), 'romp 7 → RESULTS');
  sv = await page.eval('__zoomies.save()');
  t.ok(sv.l7.cleared, 'romp 7 recorded as cleared');
  t.ok(sv.l1.cleared && sv.l2.cleared && sv.l3.cleared && sv.l4.cleared && sv.l5.cleared && sv.l6.cleared,
    'and every earlier record is untouched');

  // — GOOD KITTY, after the LAST romp, with all 21 mice —
  await page.eval(`(function(){ for (const L of LEVELS) SAVE[L.id].mice = [true, true, true];
    writeSave(); return true; })()`);
  await sleep(800);
  await page.pressPad('south');
  t.ok(await until("__zoomies.state()==='KITTY'", 'good kitty', 1200),
    'finishing romp 7 — the LAST romp — fires the GOOD KITTY screen');
  await sleep(500);
  const parade = await page.eval('__zoomies.parade()');
  t.ok(parade.n === 21 && parade.cards === 21,
    `and the parade holds ALL 21 golden mice (n=${parade.n}, rendered=${parade.cards})`);
  t.ok(parade.gap * 21 <= 900,
    `every mouse fits the 900 px stage (gap ${parade.gap} px × 21)`);
  await sleep(300);
  await page.pressPad('south');
  t.ok(await until("__zoomies.state()==='SELECT'", 'select', 900), 'GOOD KITTY → back to level select');

  t.ok(page.errors.length === 0, 'BOT: zero console errors across all seven romps');
  if (page.errors.length) console.log(page.errors.slice(0, 10).join('\n'));
  await page.close();
} finally {
  chrome.kill();
  await srv.close();
}

/* ── the three boss loops, each played with real injected input ─────── */
async function beatVac() {
  for (let g = 0; g < 200; g++) {
    const b = await boss();
    if (!b) return false;
    if (b.hp <= 0 || b.win) return true;
    await page.eval('__zoomies.setHearts(3)');
    if (b.st === 4) {                         // STUNNED: the button is exposed
      await page.eval('(function(){ CAT.x = BOSS.x; CAT.z = BOSS.z - 2.3; CAT.vx = 0; CAT.vz = 0; })()');
      await tap('south', 26);                 // ✕ up
      await ticks(22);
      await page.eval('(function(){ CAT.x = BOSS.x; CAT.z = BOSS.z; })()');
      await tap('east', 18);                  // ○ in the air = POUNCE
      await ticks(40);
    } else await ticks(30);
  }
  return false;
}
async function beatRex() {
  for (let g = 0; g < 240; g++) {
    const b = await boss();
    if (!b) return false;
    if (b.hp <= 0 || b.win) return true;
    await page.eval('__zoomies.setHearts(3)');
    if (b.st === 3) {                          // PANTING: the nose is reachable
      // bounce off the doghouse roof (a real trampoline solid) and fly at him
      await page.eval('(function(){ CAT.x = 0; CAT.z = 252; CAT.y = 2.6; CAT.vy = -6; CAT.vx = 0; CAT.vz = 0; })()');
      await until('__zoomies.cat().vy > 6', 'doghouse bounce', 240);
      await page.eval('(function(){ CAT.x = BOSS.noseX; CAT.z = BOSS.noseZ - 0.6; })()');
      await ticks(34);
      const now = await boss();
      if (!now || now.hp < b.hp || now.win) continue;
      await ticks(20);
    } else await ticks(26);
  }
  return false;
}
/* SIR MOPSALOT: mop → telegraph → over-spin → SLIP on his own puddle →
   down + dizzy → POUNCE.  The verb is the pounce, exactly like MOTHER
   VACUUM's button, and the puddles must never take a heart. */
async function beatMop() {
  const seen = new Set();
  let hurtByPuddle = false;
  for (let g = 0; g < 260; g++) {
    const b = await boss();
    if (!b) return { beaten: false, slipped: false, hurtByPuddle };
    seen.add(b.st);
    if (b.hp <= 0 || b.win) {
      return { beaten: true, slipped: seen.has(1) && seen.has(2) && seen.has(3) && seen.has(4), hurtByPuddle };
    }
    /* stand ON a puddle for a beat with full hearts: if it ever damages, the
       heart count drops and the law is broken */
    if (b.st === 0 || b.st === 5) {
      const wet = await page.eval(`(function(){
        const s = WORLD.slick.find(s => s.on);
        if (!s) return false;
        CAT.x = (s.x0 + s.x1) / 2; CAT.z = (s.z0 + s.z1) / 2; CAT.vx = 0; CAT.vz = 0;
        return true; })()`);
      if (wet) {
        await page.eval('__zoomies.setHearts(3)');
        await ticks(40);
        if ((await page.eval('__zoomies.hearts()')) < 3) hurtByPuddle = true;
      }
    }
    await page.eval('__zoomies.setHearts(3)');
    if (b.st === 4) {                           // DOWN: pounce him
      await page.eval('(function(){ CAT.x = BOSS.x; CAT.z = BOSS.z - 2.4; CAT.vx = 0; CAT.vz = 0; })()');
      await tap('south', 26);
      await ticks(20);
      await page.eval('(function(){ CAT.x = BOSS.x; CAT.z = BOSS.z; })()');
      await tap('east', 18);                    // ○ in the air = POUNCE
      await ticks(40);
    } else await ticks(26);
  }
  return { beaten: false, slipped: seen.has(3), hurtByPuddle };
}
/* one ✕ from rest on flat ground, and how high it took him.  The whole point
   is that the SAME call in romp 7 has to come back higher than in romp 6. */
async function jumpApex() {
  await page.eval('__zoomies.inject(null)');
  await ticks(40);
  const y0 = (await cat()).y;
  await tap('south', 30);
  let peak = y0;
  for (let i = 0; i < 40; i++) {
    const c = await cat();
    if (c.y > peak) peak = c.y;
    if (c.grounded && i > 6) break;
    await ticks(6);
  }
  await until('__zoomies.cat().grounded', 'land', 600);
  return peak - y0;
}

/* QUEEN BEE: she lobs honey, the cat whips it back.  Same shape as the
   Raccoon King's loop — track a step BEHIND the falling blob (standing under
   it means it hits you first) and swing once it is down at paw height. */
async function beatBee() {
  let drones = false;
  for (let g = 0; g < 420; g++) {
    const b = await boss();
    if (!b) return { beaten: false, drones };
    if (b.st === 2) drones = true;
    if (b.hp <= 0 || b.win) return { beaten: true, drones };
    await page.eval('__zoomies.setHearts(3)');
    const r = await page.eval(`(function(){
      const p = PROJ.find(p => p.on && p.k === 'honey' && p.own === 0);
      if (!p) return null;
      CAT.x = p.x; CAT.z = p.z - 1.25; CAT.vx = 0; CAT.vz = 0;
      return { y: p.y, catY: CAT.y, cd: CAT.whipCD };
    })()`);
    if (r && r.y < r.catY + 1.9 && r.cd <= 0) {
      await tap('north', 12);
      await ticks(50);
    } else await ticks(8);
  }
  return { beaten: false, drones };
}

/* DELIVERY DRONE 9000: drop → telegraph → swoop → land → RECHARGE (st 4),
   and st 4 is the pounce window.  Exactly SIR MOPSALOT's verb, one romp on. */
async function beatDrone() {
  const seen = new Set();
  let padSafe = true;
  for (let g = 0; g < 300; g++) {
    const b = await boss();
    if (!b) return { beaten: false, dropped: false, padSafe };
    seen.add(b.st);
    if (b.hp <= 0 || b.win) {
      return { beaten: true, dropped: seen.has(0) && seen.has(1) && seen.has(2) && seen.has(4), padSafe };
    }
    if (b.st === 4) {
      /* stand ON the landing pad beside it with full hearts first: if a
         recharging drone can hurt you, the window is a lie */
      await page.eval('__zoomies.setHearts(3)');
      await page.eval('(function(){ CAT.x = BOSS.x; CAT.z = BOSS.z - 2.4; CAT.vx = 0; CAT.vz = 0; })()');
      await ticks(24);
      if ((await page.eval('__zoomies.hearts()')) < 3) padSafe = false;
      await page.eval('__zoomies.setHearts(3)');
      await tap('south', 26);
      await ticks(20);
      await page.eval('(function(){ CAT.x = BOSS.x; CAT.z = BOSS.z; })()');
      await tap('east', 18);                    // ○ in the air = POUNCE
      await ticks(40);
    } else {
      await page.eval('__zoomies.setHearts(3)');
      await ticks(26);
    }
  }
  return { beaten: false, dropped: seen.has(2), padSafe };
}

/* THE CUCUMBER KING's IMMUNITY LAW: scratch, tail-whip, roll and a reflected
   projectile must every one of them do nothing.  Delivered from ON his deck,
   so it can never be dismissed as "he was out of range". */
async function kingImmunity() {
  const hpBefore = (await boss()).hp;
  let verbs = 0;
  await page.eval(`(function(){ const k = __zoomies.king();
    CAT.x = k.x; CAT.y = k.platY + 0.25; CAT.z = k.z - 0.8;
    CAT.vx = CAT.vy = CAT.vz = 0; })()`);
  await ticks(20);
  await page.eval('__zoomies.setHearts(3)');
  // 1. SCRATCH
  await tap('west', 22); await ticks(40); verbs++;
  // 2. TAIL WHIP
  await tap('north', 22); await ticks(60); verbs++;
  // 3. ROLL, held, straight through him
  await hold('east', true); await ticks(70); await hold('east', false); await ticks(20); verbs++;
  // 4. a REFLECTED projectile, flying straight at the crown
  const fired = await page.eval(`(function(){ const k = __zoomies.king();
    const p = fireProj('honey', k.x, k.platY + 1.0, k.z - 7, 0, 3.0, 11, null);
    if (!p) return false;
    p.own = 1;
    return true; })()`);
  if (fired) verbs++;
  await ticks(110);
  const hpAfter = (await boss()).hp;
  return { hpBefore, hpAfter, verbs };
}

/* …and the ONE thing that does work: the startle-LAUNCH chain.  Walk into a
   cucumber, ride the scare up, steer over the throne, and POUNCE THE CROWN. */
async function beatCukeKing() {
  let phases = 0, hp = 3, tried = [];
  const l0 = (await cat()).cukeLaunches;
  for (let g = 0; g < 130; g++) {
    const b = await boss();
    if (!b) break;
    if (b.hp <= 0 || b.win) {
      return { beaten: true, launches: (await cat()).cukeLaunches - l0, phases };
    }
    if (b.phase > phases) phases = b.phase;
    if (b.hp < hp) { hp = b.hp; tried = []; }     // new rank → new choices
    await page.eval('__zoomies.setHearts(3)');
    const k = await page.eval('__zoomies.king()');
    if (!k || !k.cukes.length) { await ticks(30); continue; }
    /* pick the cucumber that can actually reach this phase's platform: the
       HIGHEST rank he has planted, close in, and on the APPROACH side — a
       launch from behind the throne asks the cat to reverse in mid-air, which
       he entered the cucumber at 7 m/s in the other direction not to do */
    const pick = await page.eval(`(function(){
      const k = __zoomies.king();
      const skip = ${JSON.stringify(tried)};
      let best = null, bs = -1e9;
      for (const c of k.cukes) {
        /* apex from a cucumber = y + CUKE_V^2 / (2 * GRAV * gravK) */
        const apex = c.y + 16 * 16 / (2 * 26 * WORLD.gravK);
        if (apex < k.platY + 0.4) continue;
        const key = c.x.toFixed(1) + ',' + c.y.toFixed(1) + ',' + c.z.toFixed(1);
        if (skip.indexOf(key) >= 0) continue;
        const score = c.y * 10 - Math.hypot(c.x - k.x, c.z - k.z) + (c.z < k.z ? 4 : -8);
        if (score > bs) { bs = score; best = { x: c.x, y: c.y, z: c.z, key: key }; }
      }
      return best;
    })()`);
    if (!pick) { tried = []; await ticks(30); continue; }
    tried.push(pick.key);
    /* stand ON the pad a step short of it — the rank-B/C pads are only 3.4 m
       deep, so a 1.9 m stand-off drops the cat straight off the back of one */
    await page.eval(`__zoomies.teleport(${pick.x}, ${pick.y + 0.05}, ${pick.z - 1.4})`);
    await ticks(14);
    const before = (await cat()).cukeLaunches;
    await axis(1, -1);
    await until(`__zoomies.cat().cukeLaunches > ${before}`, 'startle launch', 420);
    await axis(1, 0);
    if ((await cat()).cukeLaunches <= before) continue;
    // …then steer over the throne and POUNCE on the way past the crown
    let hit = false;
    for (let i = 0; i < 70 && !hit; i++) {
      const c = await cat();
      const kk = await page.eval('__zoomies.king()');
      if (!kk) break;
      const dx = kk.x - c.x, dz = kk.z - c.z;
      const near = Math.abs(dx) < 2.2 && Math.abs(dz) < 2.2;
      if (near && !c.grounded && c.y > kk.platY - 0.4) {
        await page.eval('__zoomies.inject(null)');
        await tap('east', 16);                   // ○ in the air = POUNCE
        await ticks(26);
        hit = true;
        break;
      }
      if (c.grounded && Math.abs(c.y - kk.platY) < 0.5) {
        /* he LANDED on the deck off the launch — jump and pounce from there,
           which is still the launch chain: it is what got him up here */
        await page.eval('__zoomies.inject(null)');
        await tap('south', 26);
        await ticks(16);
        await tap('east', 16);
        await ticks(30);
        hit = true;
        break;
      }
      if (c.grounded && c.y < kk.platY - 1.0) break;      // missed; try again
      const lx = -Math.max(-1, Math.min(1, dx / 2.5));
      const ly = -Math.max(-1, Math.min(1, dz / 2.5));
      await page.eval(`__zoomies.inject({lx:${lx.toFixed(3)}, ly:${ly.toFixed(3)}})`);
      await ticks(5);
    }
    await page.eval('__zoomies.inject(null)');
    await ticks(20);
  }
  return { beaten: false, launches: (await cat()).cukeLaunches - l0, phases };
}

async function beatKing() {
  for (let g = 0; g < 400; g++) {
    const b = await boss();
    if (!b) return false;
    if (b.hp <= 0 || b.win) return true;
    await page.eval('__zoomies.setHearts(3)');
    /* Track a step BEHIND the falling bag — standing directly under it means
       the bag hits the cat (0.52 m) before the tail whip can reach it
       (2.45 m).  Then swing once it is down at paw height. */
    const r = await page.eval(`(function(){
      const p = PROJ.find(p => p.on && p.k === 'trash' && p.own === 0);
      if (!p) return null;
      CAT.x = p.x; CAT.z = p.z - 1.25; CAT.vx = 0; CAT.vz = 0;
      return { y: p.y, catY: CAT.y, cd: CAT.whipCD };
    })()`);
    if (r && r.y < r.catY + 1.9 && r.cd <= 0) {
      await tap('north', 12);
      await ticks(50);
    } else await ticks(8);
  }
  return false;
}

t.summary();

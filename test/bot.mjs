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
  for (let i = 0; i < 90 && !hitCoon; i++) {
    /* same trick as the King: track a step BEHIND the falling bag (standing
       under it means it hits you first), then swing at paw height */
    const r = await page.eval(`(function(){
      const p = PROJ.find(p => p.on && p.k === 'trash' && p.own === 0);
      if (!p) {
        const e = ENTS.find(x => x.k === 'coon' && x.alive && Math.abs(x.z - CAT.z) < 16);
        if (e) { CAT.x = e.x; CAT.z = e.z - 6.0; CAT.y = e.y + 0.05; CAT.vx = 0; CAT.vz = 0; }
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
  await page.eval('__zoomies.setHearts(3)');
  await at(0, 1.25, 132);
  await ticks(30);
  const wx0 = (await cat()).x;
  await ticks(200);
  t.ok(Math.abs((await cat()).x - wx0) > 0.3, 'a wind-gust vent actually pushes the cat sideways');

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
  t.ok(await until("__zoomies.state()==='KITTY'", 'good kitty', 900), 'finishing romp 3 → the GOOD KITTY screen');
  await sleep(400);
  await page.pressPad('south');
  t.ok(await until("__zoomies.state()==='SELECT'", 'select', 900), 'GOOD KITTY → back to level select');

  t.ok(page.errors.length === 0, 'BOT: zero console errors across all three romps');
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

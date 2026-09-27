// ZOOMIES! — THE BIG OUTSIDE screenshot battery (LEVELS2 §D 5).
//
//   node --experimental-websocket test/shots2.mjs [outdir]     (default test/shots2)
//
// romp 4 busy mid-run, a corner MID-TURN (the camera half-way round), the
// freezer, SIR MOPSALOT mid-fight, the four-card level select — plus
// refreshed romp 1/2/3 frames from the SAME camera spots test/shots uses,
// so the retrofit can be eyeballed side by side.
import { ROOT, serveRepo, launchChrome, openPage, sleep } from './lib.mjs';

const OUT = (process.argv[2] || ROOT + '/test/shots2').replace(/\/$/, '');
const srv = await serveRepo({ port: 8973 });
const chrome = await launchChrome({ port: 9373 });
const errs = [];

try {
  const page = await openPage(9373, { width: 1280, height: 720 });
  const settle = async n => {
    const t0 = await page.eval('__zoomies.ticks()');
    await page.waitFor(`__zoomies.ticks() > ${t0 + (n || 60)}`, 'sim ticks', 20000);
  };
  await page.nav(srv.url + '/index.html?t=' + Date.now());
  await page.connectPad(0);
  await page.waitFor("window.__zoomies && __zoomies.state()==='TITLE'", 'TITLE', 20000);
  await page.eval('__zoomies.forceUnlockAll()');

  // ── the four-card level select ──
  await page.eval("__zoomies.setState('SELECT')");
  await sleep(400);
  await page.eval('__zoomies.edge("right"); __zoomies.edge("right"); __zoomies.edge("right");');
  await sleep(300);
  await page.screenshot(OUT + '/20-select-4cards.png');

  // ── romp 4 ──
  await page.eval('__zoomies.gotoLevel(3)');
  await page.waitFor("__zoomies.state()==='PLAY' && __zoomies.world().theme==='market'", 'PLAY L4', 15000);

  await page.eval('__zoomies.teleport(-0.8, 0.05, 16)');
  await settle(130);
  await page.screenshot(OUT + '/21-l4-aisle.png');

  await page.eval('__zoomies.teleport(-2.2, 0.05, 55)');
  await settle(120);
  await page.screenshot(OUT + '/22-l4-shelfrun.png');

  // MID-CORNER: parked half way round the first bend
  await page.eval('__zoomies.teleport(0, 0.05, 93)');
  await settle(140);
  console.log('corner heading', await page.eval('__zoomies.heading(93) * 180 / Math.PI'));
  await page.screenshot(OUT + '/23-l4-corner-midturn.png');

  await page.eval('__zoomies.teleport(-3.0, 0.05, 112)');
  await settle(120);
  await page.screenshot(OUT + '/24-l4-backaisle.png');

  // the zipline, mid-ride
  await page.eval('__zoomies.teleport(-4.2, 4.15, 120.6)');
  await settle(60);
  await page.eval('__zoomies.edge("jump"); __zoomies.inject({ly:-1});');
  await page.waitFor('__zoomies.zip().on', 'zip grab', 8000).catch(() => {});
  await page.eval('__zoomies.inject(null)');
  await settle(45);
  console.log('zip', JSON.stringify(await page.eval('__zoomies.zip()')));
  await page.screenshot(OUT + '/25-l4-zipline.png');

  await page.eval('__zoomies.teleport(0, 0.05, 214)');
  await settle(140);
  await page.screenshot(OUT + '/26-l4-freezer.png');

  /* z=243 is INSIDE the conveyor gap — the first pass parked the cat in the
     hole, fainted him, and shot the respawn instead of the checkout */
  await page.eval('__zoomies.setHearts(3); __zoomies.teleport(0, 0.05, 233)');
  await settle(120);
  await page.screenshot(OUT + '/27-l4-checkout.png');

  // ── SIR MOPSALOT mid-fight ──
  await page.eval('__zoomies.setHearts(3); __zoomies.teleport(0, 0.05, 279)');
  await settle(200);
  await page.eval('__zoomies.setHearts(3)');
  for (let i = 0; i < 40; i++) {
    const b = await page.eval('__zoomies.boss()');
    if (b && (b.st === 1 || b.st === 2)) break;
    await settle(20);
  }
  console.log('boss', JSON.stringify(await page.eval('__zoomies.boss()')));
  await page.screenshot(OUT + '/28-l4-mopsalot.png');
  // …and the moment he is down, which is the pounce window
  for (let i = 0; i < 60; i++) {
    const b = await page.eval('__zoomies.boss()');
    if (b && b.st === 4) break;
    await page.eval('__zoomies.setHearts(3)');
    await settle(20);
  }
  await page.screenshot(OUT + '/29-l4-mopsalot-down.png');

  // ── the retrofit check: romps 1–3 from test/shots' own camera spots ──
  await page.eval('__zoomies.gotoLevel(0)');
  await page.waitFor("__zoomies.state()==='PLAY'", 'PLAY L1', 15000);
  await page.eval('__zoomies.teleport(-1.0, 0.05, 44)');
  await settle(110);
  await page.screenshot(OUT + '/30-l1-gameplay.png');
  await page.eval('__zoomies.teleport(-0.6, 0.05, 15)');
  await settle(120);
  await page.screenshot(OUT + '/31-l1-couch.png');

  await page.eval('__zoomies.gotoLevel(1)');
  await page.waitFor("__zoomies.world().theme==='yard'", 'PLAY L2', 15000);
  await page.eval('__zoomies.teleport(0, 0.05, 56)');
  await settle(120);
  await page.screenshot(OUT + '/32-l2-gameplay.png');

  await page.eval('__zoomies.gotoLevel(2)');
  await page.waitFor("__zoomies.world().theme==='night'", 'PLAY L3', 15000);
  await page.eval('__zoomies.teleport(-1.2, 2.45, 56)');
  await settle(130);
  await page.screenshot(OUT + '/33-l3-night.png');
  await page.eval('__zoomies.teleport(0.8, 1.25, 130)');
  await settle(120);
  await page.screenshot(OUT + '/34-l3-neon.png');

  // ══════════════════════════════════════════════════════════════════
  // ── BUILDER B: romps 5–7, their bosses, the 7-card select, the parade ──
  // ══════════════════════════════════════════════════════════════════

  // ── the SEVEN-card level select.  CARD_ROW = 4, so this is 4 + 3 and the
  //    cursor has to be visible on BOTH rows (pad-reachable, house law).
  await page.eval("__zoomies.forceUnlockAll(); __zoomies.setState('SELECT')");
  await sleep(450);
  await page.eval("selIdx = 0; refreshCards();");
  await sleep(250);
  await page.screenshot(OUT + '/40-select-7cards-row1.png');
  await page.eval('__zoomies.edge("down")');          // CARD_ROW stride = 4
  await sleep(300);
  console.log('select row2 selIdx', await page.eval('selIdx'));
  await page.screenshot(OUT + '/41-select-7cards-row2.png');
  await page.eval("selIdx = 6; refreshCards();");
  await sleep(250);
  await page.screenshot(OUT + '/42-select-7cards-last.png');

  // ── ROMP 5 — GREENHOUSE JUNGLE ──
  await page.eval('__zoomies.gotoLevel(4)');
  await page.waitFor("__zoomies.state()==='PLAY' && __zoomies.world().theme==='green'", 'PLAY L5', 15000);
  await page.eval('__zoomies.teleport(-1.2, 0.05, 18)');
  await settle(140);
  await page.screenshot(OUT + '/43-l5-floor.png');
  await page.eval('__zoomies.teleport(3.2, 0.05, 41)');
  await settle(120);
  await page.screenshot(OUT + '/44-l5-potstacks.png');
  // MID-CORNER on the first left-hander
  await page.eval('__zoomies.teleport(0, 0.05, 71)');
  await settle(140);
  console.log('L5 corner heading', await page.eval('__zoomies.heading(71) * 180 / Math.PI'));
  await page.screenshot(OUT + '/45-l5-corner-midturn.png');
  await page.eval('__zoomies.teleport(-3.0, 3.6, 100)');
  await settle(120);
  await page.screenshot(OUT + '/46-l5-tier1.png');
  await page.eval('__zoomies.teleport(0, 6.3, 162)');
  await settle(120);
  await page.screenshot(OUT + '/47-l5-tier2.png');
  // the steam riser, mid-float
  await page.eval('__zoomies.setHearts(3); __zoomies.teleport(0, 6.3, 196)');
  await settle(30);
  await page.eval('__zoomies.inject({ly:-1})');
  await page.waitFor('__zoomies.cat().ventRides > 0', 'vent', 9000).catch(() => {});
  await page.waitFor('__zoomies.pos().y > 9.5', 'vent lift', 9000).catch(() => {});
  await page.eval('__zoomies.inject(null)');
  console.log('L5 vent y', JSON.stringify(await page.eval('__zoomies.pos()')));
  await page.screenshot(OUT + '/48-l5-steamvent.png');
  await page.eval('__zoomies.setHearts(3); __zoomies.teleport(-1.0, 11.85, 218)');
  await settle(130);
  await page.screenshot(OUT + '/49-l5-canopy.png');
  // ── QUEEN BEE ──
  await page.eval('__zoomies.setHearts(3); __zoomies.teleport(0, 0.05, 284)');
  await settle(200);
  for (let i = 0; i < 50; i++) {
    await page.eval('__zoomies.setHearts(3)');
    if ((await page.eval('__zoomies.proj()')).some(p => p.k === 'honey')) break;
    await settle(20);
  }
  console.log('bee', JSON.stringify(await page.eval('__zoomies.boss()')));
  await page.screenshot(OUT + '/50-l5-queenbee.png');
  await page.eval('__zoomies.bossKill()');
  await settle(90);
  await page.screenshot(OUT + '/51-l5-queenbee-win.png');

  // ── ROMP 6 — SKYLINE SWING ──
  await page.eval('__zoomies.gotoLevel(5)');
  await page.waitFor("__zoomies.state()==='PLAY' && __zoomies.world().theme==='sky'", 'PLAY L6', 15000);
  await page.eval('__zoomies.teleport(-1.0, 0.05, 14)');
  await settle(140);
  await page.screenshot(OUT + '/52-l6-rooftops.png');
  await page.eval('__zoomies.teleport(0, 1.25, 36)');
  await settle(120);
  await page.screenshot(OUT + '/53-l6-gapchain.png');
  // MID-CORNER round the skyscraper
  await page.eval('__zoomies.teleport(0, 2.45, 67)');
  await settle(140);
  console.log('L6 corner heading', await page.eval('__zoomies.heading(67) * 180 / Math.PI'));
  await page.screenshot(OUT + '/54-l6-corner-skyscraper.png');
  // THE ZIPLINE, mid-ride, over a real drop (no floor at all from 84 to 108)
  await page.eval('__zoomies.setHearts(3); __zoomies.teleport(0, 2.45, 81)');
  await settle(60);
  await page.eval('__zoomies.edge("jump"); __zoomies.inject({ly:-1});');
  await page.waitFor('__zoomies.zip().on', 'zip grab', 9000).catch(() => {});
  await page.eval('__zoomies.inject(null)');
  await page.waitFor('__zoomies.zip().t > 0.42', 'zip mid-ride', 9000).catch(() => {});
  console.log('L6 zip', JSON.stringify(await page.eval('__zoomies.zip()')),
    JSON.stringify(await page.eval('__zoomies.pos()')));
  await page.screenshot(OUT + '/55-l6-zipline-avenue.png');
  await page.eval('__zoomies.setHearts(3); __zoomies.teleport(0, 1.25, 119)');
  await settle(140);
  await page.screenshot(OUT + '/56-l6-cranes.png');
  await page.eval('__zoomies.setHearts(3); __zoomies.teleport(-1.0, 5.45, 168)');
  await settle(130);
  await page.screenshot(OUT + '/57-l6-ridge.png');
  // ── DELIVERY DRONE 9000 ──
  await page.eval('__zoomies.setHearts(3); __zoomies.teleport(0, 0.05, 270)');
  await settle(200);
  for (let i = 0; i < 60; i++) {
    await page.eval('__zoomies.setHearts(3)');
    const b = await page.eval('__zoomies.boss()');
    if (b && (b.st === 1 || b.st === 2)) break;
    await settle(20);
  }
  console.log('drone', JSON.stringify(await page.eval('__zoomies.boss()')));
  await page.screenshot(OUT + '/58-l6-drone9000.png');
  for (let i = 0; i < 80; i++) {
    await page.eval('__zoomies.setHearts(3)');
    const b = await page.eval('__zoomies.boss()');
    if (b && b.st === 4) break;
    await settle(20);
  }
  await page.screenshot(OUT + '/59-l6-drone-onpad.png');

  // ── ROMP 7 — DREAMLAND DELUXE ──
  await page.eval('__zoomies.gotoLevel(6)');
  await page.waitFor("__zoomies.state()==='PLAY' && __zoomies.world().theme==='dream'", 'PLAY L7', 15000);
  await page.eval('__zoomies.teleport(0, 0.05, 2)');
  await settle(150);
  await page.screenshot(OUT + '/60-l7-couch-intro.png');
  await page.eval('__zoomies.teleport(-1.0, 1.85, 36)');
  await settle(130);
  await page.screenshot(OUT + '/61-l7-cushions.png');
  await page.eval('__zoomies.teleport(0, 1.85, 80)');
  await settle(140);
  await page.screenshot(OUT + '/62-l7-yarnplanets.png');
  // the sparkle-vent climb, mid-float
  await page.eval('__zoomies.setHearts(3); __zoomies.teleport(0, 2.65, 126)');
  await settle(30);
  await page.eval('__zoomies.inject({ly:-1})');
  await page.waitFor('__zoomies.pos().y > 6.5', 'sparkle lift', 9000).catch(() => {});
  await page.eval('__zoomies.inject(null)');
  console.log('L7 vent y', JSON.stringify(await page.eval('__zoomies.pos()')));
  await page.screenshot(OUT + '/63-l7-sparklevent.png');
  await page.eval('__zoomies.setHearts(3); __zoomies.teleport(0, 7.45, 174)');
  await settle(130);
  await page.screenshot(OUT + '/64-l7-throne-approach.png');
  // ── THE CUCUMBER KING ──
  await page.eval('__zoomies.setHearts(3); __zoomies.teleport(0, 4.05, 236)');
  await settle(220);
  console.log('king', JSON.stringify(await page.eval('__zoomies.king()')));
  await page.screenshot(OUT + '/65-l7-cucumberking.png');
  // …and the same fight two phases in, with his platform teleported higher
  await page.eval('BOSS.hp = 2; BOSS.phase = 1; kingLift(1); kingPlant(1);');
  await settle(90);
  await page.eval('__zoomies.setHearts(3); __zoomies.teleport(0, 4.05, 240)');
  await settle(60);
  console.log('king p2', JSON.stringify(await page.eval('__zoomies.king()')));
  await page.screenshot(OUT + '/66-l7-king-phase2.png');
  await page.eval('BOSS.hp = 1; window.__zoomies.bossKill();');
  await settle(110);
  await page.screenshot(OUT + '/67-l7-king-confetti.png');

  // ── GOOD KITTY, with every mouse the boys ever found (21 of them) ──
  await page.eval(`(function(){
    for (const L of LEVELS) { const s = SAVE[L.id]; s.cleared = true; s.mice = [true,true,true];
      s.bestKibble = 400 + (L.seed % 90); s.bestTime = 150 + (L.seed % 40); }
    writeSave(); return true; })()`);
  await page.eval("__zoomies.setState('KITTY')");
  await sleep(1400);
  console.log('parade', JSON.stringify(await page.eval('__zoomies.parade()')));
  await page.screenshot(OUT + '/68-kitty-21mice.png');
  // and the 7-card select with every card cleared + every mouse
  await page.eval("selIdx = 4; __zoomies.setState('SELECT')");
  await sleep(500);
  await page.screenshot(OUT + '/69-select-7cards-full.png');

  errs.push(...page.errors);
  await page.close();

  // ── the TOUCH shot: 1180x820 in romp 6, with the injected virtual pad ──
  {
    const tp = await openPage(9373, { width: 1180, height: 820, touch: true });
    await tp.nav(srv.url + '/index.html?t=' + Date.now());
    await tp.waitFor("window.__zoomies && __zoomies.state()==='TITLE'", 'TITLE', 20000);
    await tp.eval('__zoomies.forceUnlockAll()');
    await tp.eval('__zoomies.gotoLevel(5)');
    await tp.waitFor("__zoomies.world().theme==='sky'", 'L6', 15000);
    await tp.eval('__zoomies.teleport(-1.0, 5.45, 166)');
    await tp.tap(590, 700);                      // first touch injects the pad
    await sleep(600);
    const t0 = await tp.eval('__zoomies.ticks()');
    await tp.waitFor(`__zoomies.ticks() > ${t0 + 120}`, 'ticks', 20000);
    console.log('touchpad present:', await tp.eval("!!document.getElementById('__arcade_touchpad')"));
    await tp.screenshot(OUT + '/70-l6-touch-1180x820.png');
    errs.push(...tp.errors);
    await tp.close();
  }
} finally {
  chrome.kill();
  await srv.close();
}
console.log('\nconsole errors:', errs.length);
for (const e of errs.slice(0, 20)) console.log('  -', e.slice(0, 300));
process.exitCode = errs.length ? 1 : 0;

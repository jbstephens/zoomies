// ZOOMIES! — the screenshot battery (design §12.7).
// 1280x720: title, L1 busy gameplay, L2 gameplay, L3 night vista, a boss
// mid-fight, results.  Plus one 1180x820 shot with the injected virtual touch
// pad engaged (no gamepad stub, CDP touch emulation, first tap engages
// #__arcade_touchpad).
// node --experimental-websocket test/shots.mjs [outdir]
import { ROOT, serveRepo, launchChrome, openPage, sleep } from './lib.mjs';

const OUT = (process.argv[2] || ROOT + '/test/shots').replace(/\/$/, '');
const srv = await serveRepo({ port: 8975 });
const chrome = await launchChrome({ port: 9375 });
const errs = [];

async function settle(page, ticks) {
  const t0 = await page.eval('__zoomies.ticks()');
  await page.waitFor(`__zoomies.ticks() > ${t0 + (ticks || 60)}`, 'sim ticks', 15000);
}

try {
  const page = await openPage(9375, { width: 1280, height: 720 });
  await page.nav(srv.url + '/index.html?t=' + Date.now());
  await page.connectPad(0);
  await page.waitFor("window.__zoomies && __zoomies.state()==='TITLE'", 'TITLE', 20000);
  await sleep(900);
  await page.screenshot(OUT + '/01-title.png');

  // level select (a state a kid has to read from the couch)
  await page.pressPad('south');
  await page.waitFor("__zoomies.state()==='SELECT'", 'SELECT');
  await sleep(350);
  await page.screenshot(OUT + '/02-select.png');
  await page.eval('__zoomies.forceUnlockAll()');
  await page.eval("__zoomies.setState('SELECT')");
  await page.eval('__zoomies.edge("right")');
  await sleep(200);
  await page.screenshot(OUT + '/02b-select-unlocked.png');

  // ── L1: a busy moment — vacuums, crates, the coffee table, kibble ──
  await page.eval('__zoomies.gotoLevel(0)');
  await page.waitFor("__zoomies.state()==='PLAY'", 'PLAY L1', 15000);
  await page.eval('__zoomies.teleport(-1.0, 0.05, 44)');
  await settle(page, 110);
  await page.screenshot(OUT + '/03-l1-gameplay.png');
  await page.eval('__zoomies.teleport(-0.6, 0.05, 15)');
  await settle(page, 120);
  await page.screenshot(OUT + '/03b-l1-couch.png');

  // boss 1 mid-fight
  await page.eval('__zoomies.teleport(0, 0.05, 244)');
  await settle(page, 150);
  await page.eval('__zoomies.inject({lx:0.2, ly:-1})');
  await settle(page, 150);
  await page.eval('__zoomies.inject(null)');
  await settle(page, 60);
  console.log('boss1', JSON.stringify(await page.eval('__zoomies.boss()')));
  await page.screenshot(OUT + '/04-boss1.png');

  // ── L2 ──
  await page.eval('__zoomies.gotoLevel(1)');
  await page.waitFor("__zoomies.state()==='PLAY' && __zoomies.world().theme==='yard'", 'PLAY L2', 15000);
  await page.eval('__zoomies.teleport(0, 0.05, 56)');
  await settle(page, 120);
  await page.screenshot(OUT + '/05-l2-gameplay.png');
  await page.eval('__zoomies.teleport(0, 2.15, 110)');
  await settle(page, 100);
  await page.screenshot(OUT + '/05b-l2-fencetop.png');
  await page.eval('__zoomies.teleport(0, 0.05, 254)');
  await settle(page, 180);
  console.log('boss2', JSON.stringify(await page.eval('__zoomies.boss()')));
  await page.screenshot(OUT + '/06-boss2.png');

  // ── L3 the beauty shot ──
  await page.eval('__zoomies.gotoLevel(2)');
  await page.waitFor("__zoomies.state()==='PLAY' && __zoomies.world().theme==='night'", 'PLAY L3', 15000);
  await page.eval('__zoomies.teleport(-1.2, 2.45, 56)');
  await settle(page, 130);
  await page.screenshot(OUT + '/07-l3-night.png');
  await page.eval('__zoomies.teleport(0.8, 1.25, 130)');
  await settle(page, 120);
  await page.screenshot(OUT + '/07b-l3-neon.png');
  await page.eval('__zoomies.teleport(0, 0.05, 252)');
  await settle(page, 200);
  console.log('boss3', JSON.stringify(await page.eval('__zoomies.boss()')));
  await page.screenshot(OUT + '/08-boss3.png');

  // ── results + good kitty ──
  await page.eval('__zoomies.give("mouse"); __zoomies.give("mouse");');
  for (let i = 0; i < 40; i++) await page.eval('__zoomies.give("kibble")');
  await page.eval('while(__zoomies.bossKill());');
  await page.waitFor("__zoomies.state()==='RESULTS'", 'RESULTS', 20000);
  await sleep(500);
  await page.screenshot(OUT + '/09-results.png');
  await page.pressPad('south');
  /* GOOD KITTY now plays after the LAST romp, not after romp 3 (LEVELS2 §C),
     so this battery asks for the screen directly */
  await sleep(600);
  await page.eval("__zoomies.setState('KITTY')");
  await page.waitFor("__zoomies.state()==='KITTY'", 'KITTY', 8000);
  await sleep(600);
  await page.screenshot(OUT + '/10-goodkitty.png');

  // pause overlay
  await page.eval('__zoomies.gotoLevel(0)');
  await page.waitFor("__zoomies.state()==='PLAY'", 'PLAY', 15000);
  await settle(page, 40);
  await page.pressPad('start');
  await page.waitFor("__zoomies.state()==='PAUSE'", 'PAUSE', 8000);
  await sleep(300);
  await page.screenshot(OUT + '/11-pause.png');

  errs.push(...page.errors);
  await page.close();

  // ── the touch-overlay shot: no gamepad stub, real touch emulation ──
  const tp = await openPage(9375, { width: 1180, height: 820, touch: true, padStub: false });
  await tp.nav(srv.url + '/index.html?t=' + Date.now());
  await tp.waitFor("window.__zoomies && __zoomies.state()==='TITLE'", 'TITLE touch', 20000);
  await tp.tap(590, 700);
  await tp.waitFor("!!document.getElementById('__arcade_touchpad')", 'touchpad injected', 8000);
  await tp.eval("__zoomies.forceUnlockAll(); __zoomies.gotoLevel(0)");
  await tp.waitFor("__zoomies.state()==='PLAY'", 'PLAY touch', 15000);
  await tp.eval('__zoomies.teleport(0.6, 0.05, 38)');
  await sleep(900);
  // hold the virtual stick over so the pad reads as live in the shot
  const st = await tp.rectCenter('#__arcade_touchpad .__atp-zone');
  if (st) { await tp.tStart(1, st.x + 30, st.y - 20); }
  await sleep(700);
  await tp.screenshot(OUT + '/12-touch-1180x820.png');
  if (st) await tp.tEnd(1);
  console.log('touchpad present:', await tp.eval("!!document.getElementById('__arcade_touchpad')"));
  errs.push(...tp.errors);
  await tp.close();
} finally {
  chrome.kill();
  await srv.close();
}
console.log('\nconsole errors:', errs.length);
for (const e of errs.slice(0, 20)) console.log('  -', e.slice(0, 300));
process.exitCode = errs.length ? 1 : 0;

// ZOOMIES! — SAVE SLOTS screenshot battery.
//
//   node --experimental-websocket test/shots3.mjs [outdir]   (default test/shots3)
//
// The four frames the save-slots change owes an eyeball pass:
//   40  ST.SLOTS 2×2 picker, cursor on a slot, four cats visibly distinct
//   41  the rename reel mid-edit
//   42  TITLE showing the active player + △ SWITCH PLAYER
//   43  LEVEL SELECT header showing the active player
import { ROOT, serveRepo, launchChrome, openPage, sleep } from './lib.mjs';

const OUT = (process.argv[2] || ROOT + '/test/shots3').replace(/\/$/, '');
const srv = await serveRepo({ port: 8971 });
const chrome = await launchChrome({ port: 9371 });

// seed four DISTINCT slots (names, colours, progress) so the grid is legible
const SEED = `(function(){
  __zoomies.wipeAllSlots();
  __zoomies.renameSlot(0, 'BEN', 4);       // GINGER, 3 romps
  __zoomies.renameSlot(1, 'SAM', 1);       // GREY, 1 romp
  __zoomies.renameSlot(2, 'P3', 2);        // SHADOW, new
  __zoomies.renameSlot(3, 'ACE', 5);       // SKY, new
  // give slots 0 and 1 real progress so the summaries read naturally
  SAVEV2.slots[0].used = true;
  SAVEV2.slots[0].levels.l1.cleared = true; SAVEV2.slots[0].levels.l1.mice = [true,true,false];
  SAVEV2.slots[0].levels.l2.cleared = true; SAVEV2.slots[0].levels.l2.mice = [true,false,false];
  SAVEV2.slots[0].levels.l3.cleared = true; SAVEV2.slots[0].levels.l3.mice = [true,true,true];
  SAVEV2.slots[1].used = true;
  SAVEV2.slots[1].levels.l1.cleared = true; SAVEV2.slots[1].levels.l1.mice = [true,false,false];
  writeSave();
  __zoomies.setSlot(0);
  return __zoomies.slotInfo();
})()`;

try {
  const page = await openPage(9371, { width: 1280, height: 720 });
  await page.nav(srv.url + '/index.html?t=' + Date.now());
  await page.connectPad(0);
  await page.waitFor("window.__zoomies && (__zoomies.state()==='TITLE' || __zoomies.state()==='SLOTS')", 'boot', 20000);
  console.log('seed:', JSON.stringify(await page.eval(SEED)));

  // 40 — the 2×2 picker, cursor moved onto slot 1 (SAM)
  await page.eval("__zoomies.setState('SLOTS')");
  await sleep(300);
  await page.pressPad('right');           // cursor 0 → 1
  await sleep(250);
  await page.screenshot(OUT + '/40-slots-picker.png');

  // 41 — the rename reel mid-edit (on SAM), a field focused
  await page.pressPad('west');            // □ open reel
  await sleep(200);
  await page.pressPad('right');           // move to field 1
  await sleep(150);
  await page.pressPad('up');              // change a glyph
  await sleep(200);
  await page.screenshot(OUT + '/41-rename-reel.png');
  await page.pressPad('east');            // cancel out
  await sleep(150);
  await page.pressPad('start');           // back to TITLE
  await sleep(200);

  // 42 — TITLE with the active player (BEN, ginger cat)
  await page.eval("__zoomies.setState('TITLE')");
  await sleep(500);
  await page.screenshot(OUT + '/42-title-player.png');

  // 43 — LEVEL SELECT header with the active player
  await page.eval("__zoomies.forceUnlockAll(); __zoomies.setState('SELECT')");
  await sleep(500);
  await page.screenshot(OUT + '/43-select-player.png');

  if (page.errors.length) console.log('ERRORS:', page.errors.slice(0, 8).join('\n'));
  console.log('shots written to', OUT);
  await page.close();
} finally {
  chrome.kill();
  await srv.close();
}

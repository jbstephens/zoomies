// ZOOMIES! — PER-PLAYER SAVE SLOTS regression (kid-proof coverage).
//
//   node --experimental-websocket test/slots-check.mjs
//
// The two boys share the console and used to overwrite each other's save.
// This suite proves the four-slot v2 store, the v1→v2 migration (which
// protects their real progress), slot isolation, the arcade rename reel and
// the fresh-install first-boot picker — driven BY PAD, and cross-checked
// against the persisted localStorage (both keys).  Every wait on a running
// sim is on SIM TICKS; menu states freeze the sim, so those poll on state.
import { serveRepo, launchChrome, openPage, sleep, makeT } from './lib.mjs';

const t = makeT();
const srv = await serveRepo({ port: 8985 });
const chrome = await launchChrome({ port: 9385 });
const URL = () => srv.url + '/index.html?t=' + Date.now();

// legacy save shaped EXACTLY like the shipped v1 wrote it — the boys' real
// console record is l1–l3 only (LEVELS2 §C), l4–l7 absent.
const LEGACY = {
  l1: { bestKibble: 412, bestTime: 141.5, mice: [true, true, false], cleared: true },
  l2: { bestKibble: 388, bestTime: 166.2, mice: [true, false, false], cleared: true },
  l3: { bestKibble: 501, bestTime: 188.9, mice: [true, true, true], cleared: true },
};

async function bootReady(page) {
  await page.waitFor("window.__zoomies && (__zoomies.state()==='TITLE' || __zoomies.state()==='SLOTS')", 'boot', 25000);
}
// reload the page with a chosen localStorage shape already in place
async function reloadWith(page, setup) {
  await page.eval(setup);
  await page.nav(URL());
  await bootReady(page);
}
async function state(page) { return page.eval('__zoomies.state()'); }

try {
  const page = await openPage(9385, { width: 1280, height: 720 });
  await page.nav(URL());
  await bootReady(page);
  await page.connectPad(0);

  // ══════════════════════════════════════════════════════════════════
  console.log('\n── (a) FRESH INSTALL: 4 empty slots, first boot lands in the picker');
  {
    // guarantee a genuinely fresh install regardless of profile order
    await reloadWith(page, "localStorage.removeItem('zoomies_save_v2'); localStorage.removeItem('zoomies_best');");
    t.ok(await state(page) === 'SLOTS', 'fresh install boots into ST.SLOTS (pick-a-cat first)');
    const sv = await page.eval('__zoomies.slots()');
    t.ok(sv.slots.length === 4, `the store holds exactly 4 slots (${sv.slots.length})`);
    t.ok(sv.slots.every(s => s.used === false), 'every fresh slot is unused (NEW GAME)');
    t.ok(sv.activeSlot === 0, 'activeSlot defaults to 0');
    t.ok(sv.slots.every(s => Object.keys(s.levels).length === 7 &&
      Object.values(s.levels).every(l => !l.cleared && l.bestKibble === 0)),
      'each fresh slot has 7 empty, uncleared level records');
    // v2 was written at boot; legacy stays absent on a true fresh install
    t.ok(!!(await page.eval("localStorage.getItem('zoomies_save_v2')")), 'v2 key written at first boot');
    t.ok((await page.eval("localStorage.getItem('zoomies_best')")) === null,
      'no legacy key is fabricated on a fresh install');
    // the NEW GAME summary is on screen and the grid shows 4 cards
    t.ok(await page.eval("document.querySelectorAll('#slotGrid .slot').length === 4"),
      'the picker renders a 4-card 2×2 grid');
    t.ok(await page.eval("[...document.querySelectorAll('#slotGrid .prog')].every(e => e.textContent === 'NEW GAME')"),
      'all four cards read NEW GAME');

    // pick a slot BY PAD → reaches LEVEL SELECT with that slot active
    await page.pressPad('right');           // move the cursor (2×2 nav)
    await sleep(120);
    await page.pressPad('down');
    await sleep(120);
    const cur = await page.eval('slotCur');
    t.ok(cur === 3, `d-pad walks the 2×2 grid to slot 3 (slotCur=${cur})`);
    await page.pressPad('south');           // ✕ = choose this cat
    await sleep(250);
    t.ok(await state(page) === 'SELECT', 'pad ✕ chooses the slot and reaches LEVEL SELECT');
    t.ok(await page.eval('__zoomies.slots().activeSlot') === 3, 'the chosen slot is now active');
    t.ok((await page.eval("localStorage.getItem('zoomies_save_v2')")).includes('"activeSlot":3'),
      'the active slot persisted to localStorage');
  }

  // ══════════════════════════════════════════════════════════════════
  console.log('\n── (b) MIGRATION: a real v1 zoomies_best folds into slot 0, verbatim');
  {
    await reloadWith(page,
      `localStorage.setItem('zoomies_best', ${JSON.stringify(JSON.stringify(LEGACY))});` +
      "localStorage.removeItem('zoomies_save_v2');");
    // the page booted with legacy present + v2 absent → migration ran at boot
    const sv = await page.eval('__zoomies.slots()');
    const s0 = sv.slots[0].levels;
    t.ok(JSON.stringify(s0.l1) === JSON.stringify(LEGACY.l1) &&
      JSON.stringify(s0.l2) === JSON.stringify(LEGACY.l2) &&
      JSON.stringify(s0.l3) === JSON.stringify(LEGACY.l3),
      'slot 0 levels l1–l3 === the legacy data EXACTLY (bests/mice/cleared byte-for-byte)');
    t.ok(s0.l4 && !s0.l4.cleared && s0.l4.bestKibble === 0 &&
      JSON.stringify(s0.l4.mice) === '[false,false,false]' && !!s0.l7,
      'l4–l7 are ADDED empty and uncleared — nothing wiped');
    t.ok(sv.slots[0].used === true && sv.slots[0].name === 'P1' && sv.activeSlot === 0,
      'slot 0 is named P1, marked used, and active');
    t.ok(sv.slots[1].used === false && sv.slots[2].used === false && sv.slots[3].used === false,
      'slots 1–3 stay empty — only the boys\' progress moved');
    // the legacy backup key is STILL there, byte-for-byte
    t.ok((await page.eval("localStorage.getItem('zoomies_best')")) === JSON.stringify(LEGACY),
      'legacy zoomies_best is PRESERVED byte-for-byte (never deleted, a backup)');
    t.ok(!!(await page.eval("localStorage.getItem('zoomies_save_v2')")),
      'v2 was written on migration');
    // and the game reads the migrated slot: romp 4 is unlocked, save() matches
    const lv = await page.eval('__zoomies.levels()');
    t.ok(lv[3].unlocked === true && lv[4].unlocked === false,
      'the unlock chain honours the migrated progress (romp 4 open, 5 locked)');
    const active = await page.eval('__zoomies.save()');
    t.ok(active.l1.bestKibble === 412 && active.l3.mice.join() === 'true,true,true',
      'save() (active slot) returns the migrated records to the game');
  }

  // ══════════════════════════════════════════════════════════════════
  console.log('\n── (c) IDEMPOTENT: re-loading v2 never re-migrates or clobbers');
  {
    // rename slot 0 away from the migrated default, then reload from v2
    await page.eval("__zoomies.renameSlot(0, 'ZZZ', 4)");
    await page.nav(URL());
    await bootReady(page);
    const sv = await page.eval('__zoomies.slots()');
    t.ok(sv.slots[0].name === 'ZZZ' && sv.slots[0].color === 4,
      'a v2 reload keeps the edited name/color (no re-migration overwrote them)');
    t.ok(sv.slots[0].levels.l1.bestKibble === 412 && sv.slots[0].levels.l1.cleared === true,
      'the migrated progress is intact and NOT re-folded/doubled on reload');
    // prove it: the legacy key is still present but was ignored this boot
    t.ok((await page.eval("localStorage.getItem('zoomies_best')")) === JSON.stringify(LEGACY),
      'legacy key still present but untouched by the idempotent reload');
  }

  // ══════════════════════════════════════════════════════════════════
  console.log('\n── (d) ISOLATION: two slots hold different progress; switching swaps the view');
  {
    await page.eval('__zoomies.wipeAllSlots()');
    // slot 0 → everything cleared; slot 1 → nothing cleared
    await page.eval('__zoomies.setSlot(0); __zoomies.forceUnlockAll();');
    await page.eval('__zoomies.setSlot(1); __zoomies.clearSave();');
    // now LOOK at the game through each active slot
    await page.eval('__zoomies.setSlot(0)');
    let lv = await page.eval('__zoomies.levels()');
    let sv = await page.eval('__zoomies.save()');
    t.ok(sv.l7.cleared === true && lv[6].unlocked === true,
      'with slot 0 active the game sees romp 7 cleared + unlocked');
    await page.eval('__zoomies.setSlot(1)');
    lv = await page.eval('__zoomies.levels()');
    sv = await page.eval('__zoomies.save()');
    t.ok(sv.l1.cleared === false && lv[1].unlocked === false,
      'with slot 1 active the SAME game sees a fresh save (romp 2 locked)');
    // and both persist independently in the one store
    const store = await page.eval('__zoomies.slots()');
    t.ok(store.slots[0].levels.l7.cleared === true && store.slots[1].levels.l1.cleared === false,
      'the persisted store keeps both slots\' progress side by side');
    t.ok((await page.eval("JSON.parse(localStorage.getItem('zoomies_save_v2')).slots[0].levels.l7.cleared")) === true,
      'slot 0 progress is durable in localStorage');
  }

  // ══════════════════════════════════════════════════════════════════
  console.log('\n── (e) RENAME REEL: pad-built 3-glyph tag persists');
  {
    await page.eval('__zoomies.wipeAllSlots()');          // slot 0 name = "P1"
    await page.eval("__zoomies.setState('SLOTS')");
    await sleep(150);
    t.ok(await page.eval('slotCur === 0'), 'the picker opens on the active slot');
    await page.pressPad('west');                          // □ = rename/recolor
    await sleep(150);
    t.ok(await page.eval("slotMode === 'rename'"), '□ opens the rename reel');
    t.ok(await page.eval("document.getElementById('slots').className.indexOf('editing') >= 0"),
      'the reel panel is shown');
    // default reel is "P1 " → move to field 3 and turn space into a letter so
    // the tag fills all three glyphs: P, 1, A
    await page.pressPad('right'); await sleep(90);        // field 1
    await page.pressPad('right'); await sleep(90);        // field 2 (the space)
    await page.pressPad('up'); await sleep(90);           // space → A
    const fld = await page.eval('reelField');
    t.ok(fld === 2, `left/right walks the fields (reelField=${fld})`);
    await page.pressPad('south'); await sleep(180);       // ✕ confirms
    t.ok(await page.eval("slotMode === 'grid'"), '✕ confirms and returns to the grid');
    const nm = await page.eval('__zoomies.slots().slots[0].name');
    t.ok(nm === 'P1A' && nm.length === 3, `the reel produced a 3-glyph tag ("${nm}")`);
    t.ok((await page.eval("JSON.parse(localStorage.getItem('zoomies_save_v2')).slots[0].name")) === 'P1A',
      'the renamed tag persisted to localStorage');
    // a full arcade tag via the API also round-trips and sanitises
    await page.eval("__zoomies.renameSlot(2, 'ben!', 5)");
    t.ok(await page.eval("__zoomies.slots().slots[2].name") === 'BEN',
      'a tag sanitises to ≤3 uppercase glyphs (ben! → BEN)');
    t.ok((await page.eval("JSON.parse(localStorage.getItem('zoomies_save_v2')).slots[2].color")) === 5,
      'the chosen color persisted');
    // cancel path: East backs out of the reel without saving
    await page.eval("__zoomies.setState('SLOTS'); slotCur = 0;");
    await sleep(100);
    await page.pressPad('west'); await sleep(120);        // open reel
    await page.pressPad('up'); await sleep(90);           // change field 0
    await page.pressPad('east'); await sleep(140);        // ○ cancels
    t.ok(await page.eval("slotMode === 'grid'") && await page.eval("__zoomies.slots().slots[0].name") === 'P1A',
      '○ cancels the reel and leaves the tag unchanged');
  }

  // ══════════════════════════════════════════════════════════════════
  console.log('\n── (f) clearing ONE slot leaves the others intact');
  {
    await page.eval('__zoomies.wipeAllSlots()');
    await page.eval('__zoomies.setSlot(0); __zoomies.forceUnlockAll();');
    await page.eval('__zoomies.setSlot(1); __zoomies.forceUnlockAll();');
    await page.eval('__zoomies.setSlot(2); __zoomies.forceUnlockAll();');
    await page.eval('__zoomies.setSlot(1); __zoomies.clearSave();');   // wipe ONLY slot 1
    const sv = await page.eval('__zoomies.slots()');
    t.ok(sv.slots[1].levels.l7.cleared === false && sv.slots[1].used === false,
      'the cleared slot (1) is wiped back to empty');
    t.ok(sv.slots[0].levels.l7.cleared === true && sv.slots[2].levels.l7.cleared === true,
      'slots 0 and 2 are untouched by the single-slot clear');
    // the legacy backup is never touched by any clear
    await page.eval(`localStorage.setItem('zoomies_best', ${JSON.stringify(JSON.stringify(LEGACY))})`);
    await page.eval('__zoomies.setSlot(0); __zoomies.clearSave(); __zoomies.wipeAllSlots();');
    t.ok((await page.eval("localStorage.getItem('zoomies_best')")) === JSON.stringify(LEGACY),
      'clearSave() and wipeAllSlots() NEVER delete the legacy backup');
  }

  t.ok(page.errors.length === 0, 'zero console errors across the whole suite');
  if (page.errors.length) console.log(page.errors.slice(0, 10).join('\n'));
  await page.close();
} catch (e) {
  console.error('SLOTS-CHECK CRASHED:', e);
  process.exitCode = 1;
} finally {
  chrome.kill();
  await srv.close();
}

t.summary();

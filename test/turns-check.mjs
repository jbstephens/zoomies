// ZOOMIES! — THE BIG OUTSIDE: the PATH-TURN ENGINE suite (LEVELS2 §D 1/3/4).
//
//   node --experimental-websocket test/turns-check.mjs
//
// What it proves:
//   1. romps 1–3 are still SINGLE STRAIGHT RUNS (path off → the transform is
//      the identity → the retrofit LAW holds by construction, not by hope)
//   2. romp 4's route is two 90° corners with a ~5 m inner radius, and the
//      track→world map is continuous and arc-length-honest across them
//   3. THE AMENDED DIRECTION LAW: on a straight run of ANY world heading,
//      stick RIGHT increases the cat's projected screen X — asserted on all
//      THREE headings romp 4 uses (+Z, +X, −Z) THROUGH THE LIVE CAMERA
//   4. the save migrates: a seeded old-format zoomies_best (l1–l3 only)
//      loads with l1–l3 untouched and l4 present-but-locked
//   5. the level select presents SEVEN cards, laid out 4 + 3, every one of
//      them pad-reachable, and the whole screen still fits 720p
//   6. romps 5–7 declare their own routes; the direction law again on romp 6
import { serveRepo, launchChrome, openPage, sleep, makeT } from './lib.mjs';

const t = makeT();
const PERF4 = [];
const srv = await serveRepo({ port: 8977 });
const chrome = await launchChrome({ port: 9377 });

let page;
async function ticks(n) {
  const t0 = await page.eval('__zoomies.ticks()');
  await page.waitFor(`__zoomies.ticks() >= ${t0 + n}`, n + ' sim ticks', 30000);
}
const axis = (ax, v) => page.eval(`__axis(0,${ax},${v})`);

try {
  page = await openPage(9377, { width: 1280, height: 720 });
  await page.nav(srv.url + '/index.html?t=' + Date.now());
  await page.waitFor("window.__zoomies && __zoomies.state()==='TITLE'", 'TITLE', 25000);
  await page.connectPad(0);
  await page.eval('__zoomies.clearSave(); __zoomies.forceUnlockAll();');

  // ══════════════════════════════════════════════════════════════════
  console.log('\n── 1. RETROFIT: romps 1–3 are single straight runs');
  for (let li = 0; li < 3; li++) {
    await page.eval(`__zoomies.gotoLevel(${li})`);
    await ticks(20);
    const p = await page.eval('__zoomies.path()');
    t.ok(p.on === false && p.segs.length === 0,
      `L${li + 1} has NO path — trackToWorld is the identity (segs=${p.segs.length})`);
  }

  // ══════════════════════════════════════════════════════════════════
  console.log('\n── 2. ROMP 4: the route');
  await page.eval('__zoomies.gotoLevel(3)');
  await ticks(30);
  const P = await page.eval('__zoomies.path()');
  t.ok(P.on === true, 'romp 4 declares a path');
  const turns = P.segs.filter(s => s.kind === 'turn');
  t.ok(turns.length === 2, `two 90° corners (${turns.length})`);
  t.ok(turns.every(s => s.dir === 1), 'both corners turn right (the supermarket U)');
  const hw = await page.eval('__zoomies.corrHW(92)');
  const inner = turns[0].Rp - hw;
  t.ok(inner > 4.0 && inner < 6.5,
    `corner inner radius ${inner.toFixed(2)} m (design: ~5 m, pivot ${turns[0].Rp.toFixed(2)})`);
  const runs = P.runs;
  t.ok(runs.length >= 3, `${runs.length} straight runs to platform on`);
  const degs = runs.map(r => ((r.deg % 360) + 360) % 360);
  t.ok(new Set(degs).size >= 3, `three distinct world headings: ${degs.join(', ')}`);

  // the map is continuous across every corner, and does not stretch or
  // squash the route (arc length ≈ track length along the centre line)
  const cont = await page.eval(`(function(){
    let maxJump = 0, arc = 0, prev = null;
    const d0 = ${turns[0].d0 - 6}, d1 = ${turns[0].d1 + 6};
    for (let d = d0; d <= d1; d += 0.25) {
      const w = __zoomies.toWorld(0, 0, d);
      if (prev) {
        const j = Math.hypot(w.x - prev.x, w.z - prev.z);
        arc += j;
        if (j > maxJump) maxJump = j;
      }
      prev = w;
    }
    return { maxJump, arc, track: d1 - d0 };
  })()`);
  t.ok(cont.maxJump < 0.30,
    `trackToWorld is continuous across the corner (max step ${cont.maxJump.toFixed(3)} m per 0.25 m)`);
  t.ok(Math.abs(cont.arc - cont.track) / cont.track < 0.06,
    `centre-line arc length ${cont.arc.toFixed(1)} m ≈ track length ${cont.track.toFixed(1)} m`);
  // heading is continuous too (a straight hands off to its corner cleanly)
  const hd = await page.eval(`(function(){
    let maxD = 0, prev = null;
    for (let d = ${turns[0].d0 - 4}; d <= ${turns[0].d1 + 4}; d += 0.25) {
      const h = __zoomies.heading(d);
      if (prev !== null) { const dd = Math.abs(h - prev); if (dd > maxD) maxD = dd; }
      prev = h;
    }
    return maxD;
  })()`);
  t.ok(hd < 0.06, `heading eases through the corner (max ${(hd * 180 / Math.PI).toFixed(2)}° per 0.25 m)`);

  // ══════════════════════════════════════════════════════════════════
  console.log('\n── 3. THE AMENDED DIRECTION LAW, through the live camera');
  // one sample per world heading, always on a STRAIGHT run (mid-corner is
  // exempt by design — the yaw blend is the accepted ambiguity)
  const spots = [
    /* each sample sits on a CLEAR stretch of its straight run — the first
       pass sampled z=40, which is the lip of the pallet gap, and the cat
       simply walked into a crate instead of sideways */
    { d: 12, name: '+Z (aisle 1)' },
    { d: 124, name: '+X (back aisle)' },
    { d: 182, name: '−Z (aisle 2)' },
  ];
  for (const s of spots) {
    const deg = Math.round(await page.eval(`__zoomies.heading(${s.d}) * 180 / Math.PI`));
    // — RIGHT —
    await page.eval(`__zoomies.teleport(0, __zoomies.ground(0, ${s.d}) + 0.05, ${s.d})`);
    await ticks(40);
    const x0 = await page.eval('__zoomies.screenX()');
    await axis(0, 1);
    await ticks(90);
    const x1 = await page.eval('__zoomies.screenX()');
    await axis(0, 0);
    t.ok(x1 > x0 + 0.02,
      `heading ${deg}° ${s.name}: stick RIGHT ⇒ screen X increases (${x0.toFixed(3)} → ${x1.toFixed(3)})`);
    // — LEFT —
    await page.eval(`__zoomies.teleport(0, __zoomies.ground(0, ${s.d}) + 0.05, ${s.d})`);
    await ticks(40);
    const y0 = await page.eval('__zoomies.screenX()');
    await axis(0, -1);
    await ticks(90);
    const y1 = await page.eval('__zoomies.screenX()');
    await axis(0, 0);
    t.ok(y1 < y0 - 0.02,
      `heading ${deg}° ${s.name}: stick LEFT ⇒ screen X decreases (${y0.toFixed(3)} → ${y1.toFixed(3)})`);
    // — FORWARD stays centred —
    await page.eval(`__zoomies.teleport(0, __zoomies.ground(0, ${s.d}) + 0.05, ${s.d})`);
    await ticks(40);
    const f0 = await page.eval('__zoomies.screen()');
    await axis(1, -1);
    await ticks(90);
    const f1 = await page.eval('__zoomies.screen()');
    await axis(1, 0);
    t.ok(Math.abs(f1.x - f0.x) < 0.10,
      `heading ${deg}° ${s.name}: stick UP keeps the cat centred (Δ${Math.abs(f1.x - f0.x).toFixed(3)})`);
  }
  // and the world really did turn: the camera's yaw differs per run
  const yaws = [];
  for (const s of spots) {
    await page.eval(`__zoomies.teleport(0, __zoomies.ground(0, ${s.d}) + 0.05, ${s.d})`);
    await ticks(30);
    yaws.push(await page.eval('camera.rotation.y * 180 / Math.PI'));
  }
  t.ok(Math.abs(yaws[0] - yaws[1]) > 60 && Math.abs(yaws[1] - yaws[2]) > 60,
    `the camera yaw follows the route (${yaws.map(y => y.toFixed(0) + '°').join(' / ')})`);

  // ══════════════════════════════════════════════════════════════════
  console.log('\n── 3b. ROMPS 5–7: the routes');
  for (const [li, name, dirs] of [[4, 'GREENHOUSE JUNGLE', [-1, -1]],
    [5, 'SKYLINE SWING', [1, 1]], [6, 'DREAMLAND DELUXE', [1, 1]]]) {
    await page.eval(`__zoomies.gotoLevel(${li})`);
    await ticks(30);
    const P2 = await page.eval('__zoomies.path()');
    t.ok(P2.on === true, `romp ${li + 1} ${name} declares a path`);
    const tn = P2.segs.filter(s => s.kind === 'turn');
    t.ok(tn.length === 2, `romp ${li + 1}: two 90° corners (${tn.length})`);
    t.ok(tn[0].dir === dirs[0] && tn[1].dir === dirs[1],
      `romp ${li + 1}: corner directions ${tn.map(s => s.dir > 0 ? 'R' : 'L').join(' then ')}`);
    const hwx = await page.eval(`__zoomies.corrHW(${(tn[0].d0 + tn[0].d1) / 2})`);
    const inner = tn[0].Rp - hwx;
    t.ok(inner > 4.0 && inner < 6.5,
      `romp ${li + 1}: corner inner radius ${inner.toFixed(2)} m (design: ~5 m)`);
    const dg = P2.runs.map(r => ((r.deg % 360) + 360) % 360);
    t.ok(new Set(dg).size >= 3, `romp ${li + 1}: three distinct world headings (${dg.join(', ')})`);
    // continuity of the map AND of the heading across BOTH corners
    for (let k = 0; k < 2; k++) {
      const c2 = await page.eval(`(function(){
        let maxJump = 0, maxH = 0, prev = null, ph = null;
        for (let d = ${tn[k].d0 - 5}; d <= ${tn[k].d1 + 5}; d += 0.25) {
          const w = __zoomies.toWorld(0, 0, d), h = __zoomies.heading(d);
          if (prev) { const j = Math.hypot(w.x - prev.x, w.z - prev.z); if (j > maxJump) maxJump = j; }
          if (ph !== null) { const dd = Math.abs(h - ph); if (dd > maxH) maxH = dd; }
          prev = w; ph = h;
        }
        return { maxJump, maxH };
      })()`);
      t.ok(c2.maxJump < 0.30 && c2.maxH < 0.06,
        `romp ${li + 1} corner ${k + 1}: the map and the heading are both continuous ` +
        `(${c2.maxJump.toFixed(3)} m, ${(c2.maxH * 180 / Math.PI).toFixed(2)}° per 0.25 m)`);
    }
    // the new verbs actually landed in the world
    const vb = {
      zips: (await page.eval('__zoomies.zip()')).count,
      vents: (await page.eval('__zoomies.vents()')).count,
      movers: (await page.eval('__zoomies.movers()')).count,
      mice: (await page.eval('__zoomies.picks()')).filter(p => p.k === 'mouse').length,
      milk: (await page.eval('__zoomies.picks()')).filter(p => p.k === 'milk').length,
      checks: (await page.eval('__zoomies.world()')).checkpoints.length,
    };
    t.ok(vb.mice === 3, `romp ${li + 1}: three golden mice (${vb.mice})`);
    t.ok(vb.milk >= 1, `romp ${li + 1}: at least one MILK saucer (${vb.milk})`);
    t.ok(vb.checks >= 3, `romp ${li + 1}: ${vb.checks} checkpoints (design: at thirds)`);
    console.log(`  romp ${li + 1} verbs:`, JSON.stringify(vb));
  }
  // and the three long ziplines romp 6 is built around
  await page.eval('__zoomies.gotoLevel(5)');
  await ticks(20);
  const zl = await page.eval('WORLD.zips.map(v => ({ len: v.len, sp: v.sp }))');
  t.ok(zl.length === 3, `romp 6 has THREE ziplines (${zl.length})`);
  t.ok(zl.every(v => v.len > 15), `and every one crosses a real span (${zl.map(v => v.len.toFixed(0) + 'm').join(', ')})`);
  t.ok(zl.every(v => v.sp > 9), `each runs at its own faster ride speed (${zl.map(v => v.sp).join(', ')})`);
  // …over REAL drops: there is no floor under any of them
  const drops = await page.eval(`WORLD.zips.map(function(v){
    const zm = (v.z0 + v.z1) / 2;
    return { z: zm, ground: __zoomies.ground(0, zm) };
  })`);
  for (const d of drops)
    t.ok(d.ground < -20, `romp 6 zipline at z=${d.z.toFixed(0)} crosses a REAL drop (ground ${d.ground})`);

  // ══════════════════════════════════════════════════════════════════
  console.log('\n── 3c. THE DIRECTION LAW again, on ROMP 6\'s three headings');
  // LEVELS2 §D 1: "≥ 3 world headings in a turning level, through the live
  // camera, straight-run sampled".  Romp 4 proves it; romp 6 proves it in a
  // level built by a different hand, on rooftops with nothing to walk into.
  const spots6 = [
    { d: 16, name: '+Z (rooftop run)' },
    { d: 116, name: '+X (far rooftop)' },
    { d: 178, name: '−Z (the ridge)' },
  ];
  for (const s of spots6) {
    const deg = Math.round(await page.eval(`__zoomies.heading(${s.d}) * 180 / Math.PI`));
    await page.eval(`__zoomies.setHearts(3); __zoomies.teleport(0, __zoomies.ground(0, ${s.d}) + 0.05, ${s.d})`);
    await ticks(40);
    const x0 = await page.eval('__zoomies.screenX()');
    await axis(0, 1);
    await ticks(90);
    const x1 = await page.eval('__zoomies.screenX()');
    await axis(0, 0);
    t.ok(x1 > x0 + 0.02,
      `romp 6 heading ${deg}° ${s.name}: stick RIGHT ⇒ screen X increases (${x0.toFixed(3)} → ${x1.toFixed(3)})`);
    await page.eval(`__zoomies.setHearts(3); __zoomies.teleport(0, __zoomies.ground(0, ${s.d}) + 0.05, ${s.d})`);
    await ticks(40);
    const y0 = await page.eval('__zoomies.screenX()');
    await axis(0, -1);
    await ticks(90);
    const y1 = await page.eval('__zoomies.screenX()');
    await axis(0, 0);
    t.ok(y1 < y0 - 0.02,
      `romp 6 heading ${deg}° ${s.name}: stick LEFT ⇒ screen X decreases (${y0.toFixed(3)} → ${y1.toFixed(3)})`);
  }

  t.ok(page.errors.length === 0, 'TURNS: zero console errors');
  if (page.errors.length) console.log(page.errors.slice(0, 8).join('\n'));
  await page.close();

  // ══════════════════════════════════════════════════════════════════
  console.log('\n── 4. SAVE MIGRATION: a seeded OLD-FORMAT zoomies_best');
  {
    const p2 = await openPage(9377, { width: 1280, height: 720 });
    await p2.nav(srv.url + '/index.html?t=' + Date.now());
    await p2.waitFor("window.__zoomies && __zoomies.state()==='TITLE'", 'TITLE', 25000);
    // write the boys' console save EXACTLY as the shipped v1 wrote it
    const old = {
      l1: { bestKibble: 412, bestTime: 141.5, mice: [true, true, false], cleared: true },
      l2: { bestKibble: 388, bestTime: 166.2, mice: [true, false, false], cleared: true },
      l3: { bestKibble: 501, bestTime: 188.9, mice: [true, true, true], cleared: true },
    };
    await p2.eval(`localStorage.setItem('zoomies_best', ${JSON.stringify(JSON.stringify(old))})`);
    await p2.eval('loadSave()');
    const sv = await p2.eval('__zoomies.save()');
    t.ok(sv.l1.bestKibble === 412 && sv.l1.bestTime === 141.5 && sv.l1.cleared === true,
      'l1 record loads UNTOUCHED (412 kibble / 141.5 s / cleared)');
    t.ok(JSON.stringify(sv.l2.mice) === '[true,false,false]' && sv.l2.bestKibble === 388,
      'l2 mice + best survive the migration');
    t.ok(sv.l3.cleared === true && sv.l3.bestKibble === 501, 'l3 record survives');
    t.ok(!!sv.l4 && sv.l4.cleared === false && sv.l4.bestKibble === 0 &&
      JSON.stringify(sv.l4.mice) === '[false,false,false]',
      'l4 is ADDED, empty and uncleared — nothing wiped, no schema error');
    /* THE BIG OUTSIDE part two: l5–l7 have to appear the same way.  This is
       THE migration case — the boys' real console save is a v1 record with
       only l1–l3 in it (LEVELS2 §C). */
    for (const id of ['l5', 'l6', 'l7']) {
      t.ok(!!sv[id] && sv[id].cleared === false && sv[id].bestKibble === 0 &&
        sv[id].bestTime === 0 && JSON.stringify(sv[id].mice) === '[false,false,false]',
        `${id} is ADDED locked-but-present by the migration`);
    }
    t.ok(Object.keys(sv).length === 7, `the migrated save holds seven records (${Object.keys(sv).length})`);
    const lv = await p2.eval('__zoomies.levels()');
    t.ok(lv.length === 7 && lv[3].unlocked === true && lv[4].unlocked === false,
      'clearing romp 3 unlocks romp 4 and NOTHING further (the chain continues one at a time)');

    // a FRESH install still works
    await p2.eval('__zoomies.clearSave()');
    const fresh = await p2.eval('__zoomies.save()');
    t.ok(Object.keys(fresh).length === 7 && fresh.l7 && !fresh.l1.cleared,
      'a fresh save has all seven records and only romp 1 playable');
    const lv2 = await p2.eval('__zoomies.levels()');
    t.ok(lv2[0].unlocked && !lv2[3].unlocked && !lv2[6].unlocked,
      'romps 4–7 are locked on a fresh save');
    // and the unlock CHAIN runs all the way to romp 7
    for (let i = 0; i < 6; i++) {
      await p2.eval(`(function(){ SAVE[LEVELS[${i}].id].cleared = true; writeSave(); })()`);
      const lvx = await p2.eval('__zoomies.levels()');
      t.ok(lvx[i + 1].unlocked, `clearing romp ${i + 1} unlocks romp ${i + 2}`);
    }
    await p2.eval('__zoomies.clearSave()');

    // ── the SEVEN-card level select, by pad alone ──
    await p2.connectPad(0);
    await p2.eval("__zoomies.forceUnlockAll(); __zoomies.setState('SELECT')");
    await sleep(250);
    const cards = await p2.eval("document.querySelectorAll('#cards .card').length");
    t.ok(cards === 7, `level select shows ${cards} cards`);
    t.ok(await p2.eval("document.getElementById('cards').className === 'many'"),
      'the grid switches to the compact layout past three romps');
    /* the grid must lay out as CARD_ROW per row, or up/down paging walks a
       stride the eye cannot see.  Compare the cards' top offsets. */
    const rows = await p2.eval(`(function(){
      const cs = [...document.querySelectorAll('#cards .card')];
      /* offsetTop, NOT getBoundingClientRect: the SELECTED card carries a
         translateY(-12px) lift, which makes the rect say it is on a row of
         its own and the layout read as 3 rows of 1 */
      const tops = cs.map(c => c.offsetTop);
      const uniq = [...new Set(tops)];
      return { nRows: uniq.length, firstRow: tops.filter(v => v === tops[0]).length,
        bottom: Math.max(...cs.map(c => c.getBoundingClientRect().bottom)),
        footBottom: document.querySelector('#select .foot').getBoundingClientRect().bottom };
    })()`);
    t.ok(rows.nRows === 2 && rows.firstRow === 4,
      `seven cards lay out 4 + 3 on two rows (rows=${rows.nRows}, first=${rows.firstRow})`);
    t.ok(rows.footBottom <= 722,
      `the whole select fits a 720p screen (foot bottom ${rows.footBottom.toFixed(0)}px)`);
    await p2.eval('selIdx = 0; refreshCards();');
    await sleep(120);
    for (let i = 0; i < 3; i++) { await p2.pressPad('right'); await sleep(90); }
    t.ok(await p2.eval("document.querySelectorAll('#cards .card')[3].className.indexOf('sel') >= 0"),
      'three ▶ presses select romp 4 (pad-reachable)');
    // ▼ walks the ROW — that is the only way row 2 is reachable by pad
    await p2.eval('selIdx = 0; refreshCards();');
    await sleep(120);
    await p2.pressPad('down');
    await sleep(150);
    t.ok(await p2.eval('selIdx === 4'),
      `▼ from romp 1 lands on romp 5, the first card of row 2 (selIdx=${await p2.eval('selIdx')})`);
    await p2.pressPad('right');
    await p2.pressPad('right');
    await sleep(150);
    t.ok(await p2.eval("selIdx === 6 && document.querySelectorAll('#cards .card')[6].className.indexOf('sel') >= 0"),
      'and ▶▶ reaches romp 7 — every card is pad-reachable (house law)');
    await p2.pressPad('up');
    await sleep(150);
    t.ok(await p2.eval('selIdx === 2'), '▲ walks back up a row');
    await p2.eval('selIdx = 3; refreshCards();');
    await sleep(120);
    await p2.pressPad('south');
    t.ok(await p2.eval(`new Promise(r => { const f = () => {
        if (__zoomies.state() === 'PLAY' || __zoomies.state() === 'INTRO') r(true);
        else setTimeout(f, 60); }; f(); })`), '✕ starts romp 4 from the card');
    await p2.waitFor("__zoomies.state()==='PLAY'", 'romp 4 PLAY', 12000);
    t.ok((await p2.eval('__zoomies.world()')).theme === 'market',
      'romp 4 builds the market');
    t.ok(p2.errors.length === 0, 'SAVE/SELECT: zero console errors');
    if (p2.errors.length) console.log(p2.errors.slice(0, 8).join('\n'));
    await p2.close();
  }

  // ══════════════════════════════════════════════════════════════════
  console.log('\n── 5. PERF: romps 4–7 per state + their four bosses, both fx paths');
  // (romps 1–3 keep their counts in verify.mjs §6 — these are the new levels)
  const LEVEL_SPOTS = [
    { li: 3, tag: 'L4', theme: 'market', boss: 278, bossName: 'MOPSALOT',
      spots: [[20, 'aisle 1'], [92, 'CORNER 1'], [124, 'back aisle'],
        [155, 'CORNER 2'], [182, 'aisle 2'], [216, 'freezer'], [244, 'checkout']] },
    { li: 4, tag: 'L5', theme: 'green', boss: 284, bossName: 'QUEEN BEE',
      spots: [[18, 'glasshouse floor'], [44, 'pot stacks'], [71, 'CORNER 1'],
        [100, 'tier 1'], [141, 'CORNER 2'], [164, 'tier 2'],
        [204, 'steam riser'], [218, 'canopy walk']] },
    { li: 5, tag: 'L6', theme: 'sky', boss: 272, bossName: 'DRONE 9000',
      spots: [[14, 'rooftops'], [36, 'gap chain'], [67, 'CORNER (skyscraper)'],
        [112, 'far rooftop'], [120, 'cranes'], [161, 'CORNER 2'],
        [176, 'the ridge'], [214, 'third crossing']] },
    { li: 6, tag: 'L7', theme: 'dream', boss: 240, bossName: 'CUCUMBER KING',
      spots: [[4, 'the couch'], [36, 'cushions'], [63, 'CORNER 1'],
        [80, 'yarn planets'], [122, 'sparkle vents'], [159, 'CORNER 2'],
        [176, 'throne approach'], [220, 'throne room']] },
  ];
  for (const fx of ['full', 'low']) {
    const p3 = await openPage(9377, { width: 1280, height: 720 });
    await p3.nav(srv.url + `/index.html?fx=${fx}&t=` + Date.now());
    await p3.waitFor("window.__zoomies && __zoomies.state()==='TITLE'", 'TITLE', 25000);
    await p3.connectPad(0);
    await p3.eval('__zoomies.forceUnlockAll()');
    const tk = async n => {
      const t0 = await p3.eval('__zoomies.ticks()');
      await p3.waitFor(`__zoomies.ticks() >= ${t0 + n}`, 'ticks', 30000);
    };
    for (const L of LEVEL_SPOTS) {
      await p3.eval(`__zoomies.gotoLevel(${L.li})`);
      await p3.waitFor(`__zoomies.world().theme==='${L.theme}'`, L.theme + ' built', 15000);
      await tk(40);
      for (const [z, nm] of L.spots) {
        await p3.eval(`__zoomies.setHearts(3); __zoomies.teleport(0, __zoomies.ground(0, ${z}) + 0.05, ${z})`);
        await tk(40);
        const p = await p3.eval('__zoomies.perf()');
        PERF4.push({ label: `fx=${fx} ${L.tag} ${nm}`, ...p });
        t.ok(p.glCalls <= 120 && p.tris <= 60000,
          `fx=${fx} ${L.tag} ${nm}: ${p.glCalls} GL calls / ${p.tris} tris (ceiling 120 / 60k)`);
      }
      // …and the heaviest state of all: the boss, engaged and mid-loop
      await p3.eval(`__zoomies.setHearts(3); __zoomies.teleport(0, __zoomies.ground(0, ${L.boss}) + 0.05, ${L.boss})`);
      await tk(120);
      await p3.eval('__zoomies.setHearts(3)');
      await tk(180);
      await p3.eval('__zoomies.setHearts(3)');
      const pb = await p3.eval('__zoomies.perf()');
      PERF4.push({ label: `fx=${fx} ${L.tag} ${L.bossName}`, ...pb });
      const bs = await p3.eval('__zoomies.boss()');
      t.ok(bs && bs.engaged, `fx=${fx}: ${L.bossName} engaged for the perf sample (st ${bs && bs.st})`);
      t.ok(pb.glCalls <= 120 && pb.tris <= 60000,
        `fx=${fx} ${L.tag} boss: ${pb.glCalls} GL calls / ${pb.tris} tris`);
      t.ok(pb.bakeMs < 260, `fx=${fx} ${L.tag} bake ${pb.bakeMs.toFixed(1)} ms (hidden by the intro card)`);
      if (fx === 'full') {
        t.ok(pb.casters.tris <= 30000,
          `${L.tag} boss shadow casters ${pb.casters.tris} tris / ${pb.casters.meshes} meshes (curated)`);
      }
    }
    t.ok(p3.errors.length === 0, `fx=${fx}: zero console errors across romps 4–7`);
    if (p3.errors.length) console.log(p3.errors.slice(0, 8).join('\n'));
    await p3.close();
  }
} finally {
  chrome.kill();
  await srv.close();
}

if (PERF4.length) {
  console.log('\n── romps 4–7 perf table ──');
  console.log('state'.padEnd(34), 'calls', 'glCalls', 'tris', 'bands', 'bakeMs');
  for (const p of PERF4) {
    console.log(String(p.label).padEnd(34), String(p.calls).padEnd(6), String(p.glCalls).padEnd(8),
      String(p.tris).padEnd(6), String(p.bandsVisible).padEnd(6), (p.bakeMs || 0).toFixed(1));
  }
  const worst = PERF4.reduce((a, b) => (b.glCalls > a.glCalls ? b : a));
  const heaviest = PERF4.reduce((a, b) => (b.tris > a.tris ? b : a));
  console.log(`\nworst calls: ${worst.label} ${worst.glCalls}`);
  console.log(`worst tris:  ${heaviest.label} ${heaviest.tris}`);
}

t.summary();

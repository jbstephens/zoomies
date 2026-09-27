/* Targeted regression for the elevated-floor spawn/checkpoint bug (found by
   John on the real console 2026-09-27): romp 2 opens on the porch deck at
   y=0.62 but the cat spawned at a flat y=0.05 — under the floor — and fell
   into the void.  Checkpoints had the same disease (registered at y=0 on
   raised floors: buried arch, un-touchable within |Δy|<2.4, and a
   through-the-floor respawn).  Night (romp 3) has the elevated checkpoints:
   z=62 and z=118 on the y=2.4 rooftop terraces. */
import { serveRepo, launchChrome, openPage, makeT } from './lib.mjs';

const t = makeT();
const srv = await serveRepo({ port: 8991 });
const chrome = await launchChrome({ port: 9391 });
try {
  const page = await openPage(9391, {});
  await page.nav('http://localhost:8991/index.html');
  await page.waitFor('!!window.__zoomies', 'boot');

  // every romp, not just the first three: THE BIG OUTSIDE added four more
  // opening floors (and romp 7 opens on a floating cushion over a void)
  const N = (await page.eval('__zoomies.levels()')).length;
  t.ok(N === 7, `seven romps present (${N})`);
  for (let li = 0; li < N; li++) {
    await page.eval(`__zoomies.gotoLevel(${li})`);
    const s0 = await page.eval('__zoomies.simTime()');
    await page.eval('__zoomies.step(300)');   // 2.5 sim-seconds, no input
    const s1 = await page.eval('__zoomies.simTime()');
    t.ok(s1 > s0 + 2, `L${li + 1} sim advanced (${(s1 - s0).toFixed(2)}s)`);
    const p = await page.eval('__zoomies.pos()');
    const h = await page.eval('__zoomies.hearts()');
    t.ok(p.y > -0.3, `L${li + 1} cat rests ON the first floor after 2.5s idle (y=${p.y.toFixed(2)})`);
    t.ok(h === 3, `L${li + 1} no hearts lost standing at spawn (${h})`);
    // LEVELS2 §B: the per-level gravity is a SIM CONSTANT, and it has to come
    // back to 1 on every level that is not the dream
    const g = (await page.eval('__zoomies.world()')).gravK;
    t.ok(li === 6 ? g === 0.8 : g === 1,
      `L${li + 1} gravity scale ${g} (${li === 6 ? 'the dream, ×0.8' : 'unchanged'})`);
  }

  // romp 2 (yard, index 1): spawn must rest ON the porch deck (floor top 0.62)
  await page.eval('__zoomies.gotoLevel(1)');
  const py = (await page.eval('__zoomies.pos()')).y;
  t.ok(Math.abs(py - 0.62) < 0.3, `yard spawn rests on the porch deck (y=${py.toFixed(2)} ≈ 0.62)`);

  // romp 3 (night, index 2): its checkpoints sit on the y=2.4 terraces
  await page.eval('__zoomies.gotoLevel(2)');
  const cks = await page.eval('WORLD.checkpoints.map(c => ({ z: c.z, y: c.y }))');
  t.ok(cks.length === 2, `night has 2 checkpoints (${cks.length})`);
  for (const c of cks) t.ok(Math.abs(c.y - 2.4) < 0.01, `night checkpoint z=${c.z} at terrace height (y=${c.y})`);

  // and they are now touchable: stand the cat at the z=62 arch
  await page.eval('__zoomies.teleport(0, 2.5, 61.5)');
  await page.eval('__zoomies.step(240)');
  const hit = await page.eval('WORLD.checkpoints[0].hit');
  t.ok(hit === true, 'standing at the night z=62 arch collects the checkpoint');

  // respawn through a STALE y=0 checkpoint still lands on a floor (belt-and-braces):
  // yard again, force cp back to the old buggy record
  await page.eval('__zoomies.gotoLevel(1)');
  await page.eval('__zoomies.checkpoint(0, 0, 0); respawn(true); 0');
  const rp = await page.eval('__zoomies.pos()');
  t.ok(rp.y > 0.4, `respawn with stale cp.y=0 clamps up to the porch (y=${rp.y.toFixed(2)})`);
  await page.eval('__zoomies.step(300)');
  const rp2 = await page.eval('__zoomies.pos()');
  t.ok(rp2.y > 0.4, `and he stays on the porch after settling (y=${rp2.y.toFixed(2)})`);

  const errs = page.errors;
  t.ok(errs.length === 0, `zero console errors (${errs.length})${errs.length ? ' — ' + errs[0] : ''}`);

  if (!t.summary()) process.exitCode = 1;
} finally {
  chrome.kill(); await srv.close();
}

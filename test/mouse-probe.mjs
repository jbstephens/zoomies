/* Ben's report 2026-09-27: GOLDEN MOUSE 1 in DREAMLAND (cushion at
   x=-5.4, z=92) is unreachable.  Probe every mouse in the game:
   (a) is there standable ground under/near it, (b) does standing at it
   collect it, (c) for Ben's mouse specifically, is the cushion itself
   standable and what does the approach geometry look like. */
import { serveRepo, launchChrome, openPage, makeT } from './lib.mjs';

const t = makeT();
const srv = await serveRepo({ port: 8993 });
const chrome = await launchChrome({ port: 9393 });
try {
  const page = await openPage(9393, {});
  await page.nav('http://localhost:8993/index.html');
  await page.waitFor('!!window.__zoomies', 'boot');

  for (let li = 0; li < 7; li++) {
    await page.eval(`__zoomies.gotoLevel(${li})`);
    const mice = await page.eval(
      'PICKS.filter(p => p.k === "mouse").map(p => ({ x: p.x, y: p.y, z: p.z }))');
    t.ok(mice.length === 3, `L${li + 1} has 3 mice (${mice.length})`);
    for (let mi = 0; mi < mice.length; mi++) {
      const m = mice[mi];
      // ground under the mouse position
      const g = await page.eval(`groundAt(${m.x}, ${m.z})`);
      // teleport the cat to stand at the mouse, settle, then report
      const r = await page.eval(`(function(){
        __zoomies.setHearts(3);
        __zoomies.teleport(${m.x}, ${Math.max(m.y - 0.4, 0)}, ${m.z});
        __zoomies.step(240);
        var got = CAT.mice.some(function(v){return v;});
        var p = __zoomies.pos();
        return JSON.stringify({ got: got, y: +p.y.toFixed(2), x: +p.x.toFixed(2), z: +p.z.toFixed(2) });
      })()`);
      const o = JSON.parse(r);
      // authoritative reachability-when-stood-at: teleport onto the mouse,
      // settle, and require it collected AND the cat not ejected far away
      // (the L7 GM3 bug: soft corridor wall shoved the cat 3m off the cushion)
      const ejected = Math.hypot(o.x - m.x, o.z - m.z);
      t.ok(o.got, `L${li + 1} mouse ${mi + 1} @(${m.x},${m.y},${m.z}) collects when stood at (cat y=${o.y}, ground=${(+g).toFixed(2)}, drift=${ejected.toFixed(2)}m)`);
      // reset mice for the next probe within the level
      await page.eval('CAT.mice[0]=CAT.mice[1]=CAT.mice[2]=false; hudMice(); 0');
    }
  }

  // Ben's mouse: a STATIC walkable chain must reach GM1's cushion (z=92)
  // from the z=102 isle without the swinging yarn-movers — the isle floor,
  // the new stepping cushion (z=95), and the mouse cushion (z=92), each a
  // hop-sized rise. (Asserted as ground heights, not a driven walk: inject()
  // feeds INJ which only merges through the rAF loop, never __zoomies.step().)
  await page.eval('__zoomies.gotoLevel(6)');
  const chain = JSON.parse(await page.eval(`JSON.stringify({
    isle: groundAt(-5.4, 100), step: groundAt(-5.6, 95), cushion: groundAt(-5.4, 92)
  })`));
  t.ok(chain.isle > 2 && chain.step > 2 && chain.cushion > 3,
    `L7 GM1 static chain present (isle ${chain.isle.toFixed(2)} → step ${chain.step.toFixed(2)} → cushion ${chain.cushion.toFixed(2)})`);
  t.ok(chain.step - chain.isle <= 0.8 && chain.step - chain.isle >= 0 &&
       chain.cushion - chain.step <= 0.8 && chain.cushion - chain.step >= 0,
    `L7 GM1 chain rises are hop-sized (+${(chain.step - chain.isle).toFixed(2)}, +${(chain.cushion - chain.step).toFixed(2)})`);

  const errs = page.errors;
  t.ok(errs.length === 0, `zero console errors (${errs.length})${errs.length ? ' — ' + errs[0] : ''}`);
  if (!t.summary()) process.exitCode = 1;
} finally {
  chrome.kill(); await srv.close();
}

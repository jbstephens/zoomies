// ZOOMIES! — fast boot smoke: load the built index.html headless, assert the
// game reached TITLE with zero console errors, and dump the perf counters.
// node --experimental-websocket test/smoke.mjs
import { ROOT, serveRepo, launchChrome, openPage, sleep, makeT } from './lib.mjs';

const t = makeT();
const srv = await serveRepo({ port: 8971 });
const chrome = await launchChrome({ port: 9371 });
try {
  const page = await openPage(9371, { width: 1280, height: 720 });
  await page.nav(srv.url + '/index.html');
  await page.connectPad(0);
  await page.waitFor("window.__zoomies && __zoomies.state() === 'TITLE'", 'TITLE', 20000);
  t.ok(true, 'booted to TITLE');
  const w = await page.eval('__zoomies.world()');
  console.log('  world:', JSON.stringify(w));
  const p = await page.eval('__zoomies.perf()');
  console.log('  perf:', JSON.stringify(p));
  t.ok(w.len > 200, 'level 1 length ' + w.len);
  t.ok(w.bands > 3, 'bands ' + w.bands);
  await sleep(600);
  t.ok(page.errors.length === 0, 'zero console errors');
  if (page.errors.length) console.log(page.errors.slice(0, 12).join('\n'));
  await page.screenshot(ROOT + '/test/shots/smoke-title.png');
  await page.close();
} finally {
  chrome.kill();
  await srv.close();
}
t.summary();

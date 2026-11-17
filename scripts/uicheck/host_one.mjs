#!/usr/bin/env node
// 1.6.22 (owner 17.11.2026: one way to our servers in every part of the launcher): the window in headless Chrome with a stand-in
// for Tauri (../screens/shot-shim.js + host-shim.js), driven over the DevTools protocol:
//   1. the window's host is the launcher's active host (site_host), links and pictures are built on it
//   2. Settings shows ONE list of our hosts, the active one "in use"
//   3. a picture that does not load from the active host (Moscow refused here) loads from the next one of the launcher's order
//   4. "host_active" (the launcher switched) moves the window's host at once
// Needs node 22+ (WebSocket), python3 and Chrome / Chromium (CHROME=... or on PATH).   node scripts/uicheck/host_one.mjs
import { spawn, execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = join(HERE, '..', '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const which = c => { try { return execFileSync('sh', ['-c', `command -v ${c}`]).toString().trim(); } catch (e) { return ''; } };
const CHROME = process.env.CHROME || which('chromium') || which('google-chrome') || which('chromium-browser');
if (!CHROME) { console.error('no Chrome: set CHROME=/path/to/chrome'); process.exit(2); }

const ui = mkdtempSync(join(tmpdir(), 'hostui-')), prof = mkdtempSync(join(tmpdir(), 'hostprof-'));
cpSync(join(ROOT, 'app', 'ui'), ui, { recursive: true });
cpSync(join(ROOT, 'scripts', 'screens', 'shot-shim.js'), join(ui, 'shot-shim.js'));
cpSync(join(HERE, 'host-shim.js'), join(ui, 'host-shim.js'));
const ix = join(ui, 'index.html');
writeFileSync(ix, readFileSync(ix, 'utf8').replace('<script src="app.js"></script>',
  '<script>try{localStorage.setItem("set.lang","en")}catch(e){}</script><script src="shot-shim.js"></script><script src="host-shim.js"></script><script src="app.js"></script>'));
const WEB = 8890 + Math.floor(Math.random() * 100), DBG = 9390 + Math.floor(Math.random() * 100);
const srv = spawn('python3', ['-m', 'http.server', String(WEB), '--bind', '127.0.0.1'], { cwd: ui, stdio: 'ignore' });
const chr = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${DBG}`, `--user-data-dir=${prof}`,
  '--window-size=1120,700', 'about:blank'], { stdio: 'ignore' });
const done = code => { try { chr.kill(); srv.kill(); } catch (e) {} setTimeout(() => { rmSync(ui, { recursive: true, force: true }); rmSync(prof, { recursive: true, force: true }); process.exit(code); }, 300); };
// a 1x1 PNG for the pictures of our hosts (nothing is fetched from them)
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

let ws, seq = 0; const waits = new Map(), errors = [];
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; waits.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };

try {
  let page = null;
  for (let i = 0; i < 50 && !page; i++) { await sleep(200); try { page = (await (await fetch(`http://127.0.0.1:${DBG}/json/list`)).json()).find(t => t.type === 'page'); } catch (e) {} }
  if (!page) throw new Error('Chrome did not start');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  ws.onmessage = m => {
    const d = JSON.parse(m.data);
    if (d.method === 'Fetch.requestPaused') {
      const u = d.params.request.url;
      if (u.startsWith('https://dow2ru.fintebtc.de/')) send('Fetch.failRequest', { requestId: d.params.requestId, errorReason: 'ConnectionReset' });
      else if (/^https:\/\/(dow2|rts)\.fintebtc\.de\//.test(u)) send('Fetch.fulfillRequest', { requestId: d.params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'image/png' }], body: PNG });
      else send('Fetch.continueRequest', { requestId: d.params.requestId });
      return;
    }
    if (d.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(d.params.exceptionDetails.exception && d.params.exceptionDetails.exception.description || d.params.exceptionDetails.text));
    const w = waits.get(d.id); if (w) { waits.delete(d.id); d.error ? w.rej(new Error(d.error.message)) : w.res(d.result); }
  };
  await new Promise(r => { ws.onopen = r; });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: 'https://*.fintebtc.de/*' }] });
  await send('Page.navigate', { url: `http://127.0.0.1:${WEB}/index.html` });
  await sleep(5000);
  const fails = [], res = {};
  // 1. the launcher's active host
  res.site = await ev(`siteBase()`);
  res.link = await ev(`siteUrl('/stats/?q=1')`);
  if (res.site !== 'https://dow2ru.fintebtc.de' || res.link !== 'https://dow2ru.fintebtc.de/stats/?q=1') fails.push(`site ${res.site} / ${res.link}: not the active host`);
  // 2. Settings: one list, the active host in use
  await ev(`renderNet(); 0`);
  res.rows = await ev(`[...document.querySelectorAll('#netList .net-r')].map(r => r.querySelector('.net-h').textContent + (r.querySelector('.chip') ? '*' : ''))`);
  if (JSON.stringify(res.rows) !== JSON.stringify(['dow2ru.fintebtc.de*', 'dow2.fintebtc.de', 'rts.fintebtc.de', 'pub-x.r2.dev'])) fails.push(`Settings: ${JSON.stringify(res.rows)}`);
  res.groups = await ev(`document.querySelectorAll('#netList .net-g').length`);
  if (res.groups !== 1) fails.push(`Settings: ${res.groups} lists, expected one`);
  // 3. a map picture: Moscow refuses, the next host of the launcher's order gives it
  res.pic = await ev(`new Promise(ok => { const i = new Image(); i.onload = () => ok(i.src + ' ' + i.naturalWidth); document.body.appendChild(i); i.src = siteUrl('/elite/assets/maps/x.png'); setTimeout(() => ok('timeout ' + i.src), 5000); })`);
  if (res.pic !== 'https://dow2.fintebtc.de/elite/assets/maps/x.png 1') fails.push(`picture: ${res.pic}`);
  // 4. the launcher switched: the window's host moves at once
  await ev(`__fire('host_active', { host: 'https://rts.fintebtc.de', site: 'https://rts.fintebtc.de' }); 0`);
  res.after = await ev(`siteUrl('/elite/assets/')`);
  if (res.after !== 'https://rts.fintebtc.de/elite/assets/') fails.push(`after host_active: ${res.after}`);
  res.leftovers = await ev(`[typeof RM === 'object' && 'host' in RM, typeof LR === 'object' && 'host' in LR]`);
  if (res.leftovers.some(Boolean)) fails.push(`a page keeps a host of its own: ${JSON.stringify(res.leftovers)}`);
  if (errors.length) fails.push('errors: ' + errors.join(' | '));
  console.log(JSON.stringify(res));
  console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'ok');
  done(fails.length ? 1 : 0);
} catch (e) { console.error(e); done(2); }

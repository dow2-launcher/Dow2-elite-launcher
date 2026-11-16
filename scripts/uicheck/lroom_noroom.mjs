#!/usr/bin/env node
// 1.6.19 (Malum 16.11.2026: "lroom get: no_room" every 2-3 s while in no lobby): the window in headless Chrome with a stand-in
// for Tauri (../screens/shot-shim.js + lroom-shim.js), driven over the DevTools protocol. A signed-in player in no lobby:
//   1. the window loads, the Lobbies tab is clicked 10 times, the window is reloaded 3 times (F5)  -> ONE "get" in all
//   2. he joins a lobby, the window is reloaded                                                 -> its view is asked for again
//   3. the lobby is gone on the server: the next "here" says no_room                            -> the room goes, no more "get"
// Needs node 22+ (WebSocket), python3 and Chrome / Chromium (CHROME=... or on PATH).
//   node scripts/uicheck/lroom_noroom.mjs
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

// the UI with the stand-ins in place of <script src="app.js">
const ui = mkdtempSync(join(tmpdir(), 'lrui-')), prof = mkdtempSync(join(tmpdir(), 'lrprof-'));
cpSync(join(ROOT, 'app', 'ui'), ui, { recursive: true });
cpSync(join(ROOT, 'scripts', 'screens', 'shot-shim.js'), join(ui, 'shot-shim.js'));
cpSync(join(HERE, 'lroom-shim.js'), join(ui, 'lroom-shim.js'));
const ix = join(ui, 'index.html');
writeFileSync(ix, readFileSync(ix, 'utf8').replace('<script src="app.js"></script>',
  '<script>try{localStorage.setItem("set.lang","en")}catch(e){}</script><script src="shot-shim.js"></script><script src="lroom-shim.js"></script><script src="app.js"></script>'));
const WEB = 8790 + Math.floor(Math.random() * 100), DBG = 9290 + Math.floor(Math.random() * 100);
const srv = spawn('python3', ['-m', 'http.server', String(WEB), '--bind', '127.0.0.1'], { cwd: ui, stdio: 'ignore' });
const chr = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${DBG}`, `--user-data-dir=${prof}`,
  '--window-size=1120,700', 'about:blank'], { stdio: 'ignore' });
const done = code => { try { chr.kill(); srv.kill(); } catch (e) {} setTimeout(() => { rmSync(ui, { recursive: true, force: true }); rmSync(prof, { recursive: true, force: true }); process.exit(code); }, 300); };

let ws, seq = 0; const waits = new Map();
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; waits.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
const count = v => ev(`+(localStorage.getItem('stub.${v}') || 0)`);
const tab = v => ev(`document.querySelector('.tab[data-view="${v}"]').click()`);

try {
  let page = null;
  for (let i = 0; i < 50 && !page; i++) { await sleep(200); try { page = (await (await fetch(`http://127.0.0.1:${DBG}/json/list`)).json()).find(t => t.type === 'page'); } catch (e) {} }
  if (!page) throw new Error('Chrome did not start');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  ws.onmessage = m => { const d = JSON.parse(m.data); const w = waits.get(d.id); if (w) { waits.delete(d.id); d.error ? w.rej(new Error(d.error.message)) : w.res(d.result); } };
  await new Promise(r => { ws.onopen = r; });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: `http://127.0.0.1:${WEB}/index.html` });
  await sleep(6500);
  await ev(`localStorage.removeItem('stub.inRoom'); 0`);
  const fails = [], res = {};
  res.load = await count('get');
  // 1. the Lobbies tab 10 times, 3 reloads (the last one back on the Lobbies tab)
  for (let i = 0; i < 10; i++) { await tab('rooms'); await sleep(250); await tab('home'); await sleep(250); }
  res.clicks = await count('get');
  await tab('rooms');
  for (let i = 0; i < 3; i++) { await send('Page.reload'); await sleep(6000); }
  res.reloads = await count('get');
  if (res.reloads !== 1) fails.push(`no lobby: ${res.reloads} "get" for a load, 10 clicks and 3 reloads (expected 1)`);
  // 2. in a lobby: a reload asks for its view and has it again
  await ev(`lrCall('join', { id: 'r1' }).then(() => 0)`);
  const g0 = await count('get');
  await send('Page.reload'); await sleep(6000);
  res.inRoomGets = (await count('get')) - g0;
  res.inRoomView = await ev(`LR.room ? LR.room.id : null`);
  if (res.inRoomGets !== 1 || res.inRoomView !== 'r1') fails.push(`in a lobby: after a reload ${res.inRoomGets} "get", room ${res.inRoomView} (expected 1, r1)`);
  // 3. the lobby is gone on the server: "here" (every 15 s) says no_room - the room goes, clicks and reloads ask nothing
  await ev(`localStorage.removeItem('stub.inRoom'); 0`);
  await sleep(17000);
  res.goneView = await ev(`LR.room ? LR.room.id : null`);
  const g1 = await count('get');
  for (let i = 0; i < 5; i++) { await tab('rooms'); await sleep(250); await tab('home'); await sleep(250); }
  await send('Page.reload'); await sleep(6000);
  res.goneGets = (await count('get')) - g1;
  if (res.goneView !== null || res.goneGets !== 0) fails.push(`lobby gone: room ${res.goneView}, ${res.goneGets} "get" after (expected null, 0)`);
  console.log(JSON.stringify(res));
  console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'ok');
  done(fails.length ? 1 : 0);
} catch (e) { console.error(e); done(2); }

// host_one.mjs: loaded after screens/shot-shim.js, before app.js. The launcher's side of the shared host (reach.rs) as the window
// sees it: site_host = Moscow, Settings' list Moscow (in use) - Germany (dow2) - rts - R2; listen() keeps the handlers so the test
// can send "host_active" as the launcher does. Nothing of the chat goes to our servers.
(function () {
  'use strict';
  var base = window.__TAURI__.core.invoke;
  var RU = 'https://dow2ru.fintebtc.de', DE = 'https://dow2.fintebtc.de', RTS = 'https://rts.fintebtc.de';
  var NET = { checked: true, active: RU, list: [
    { base: RU, ms: 120, err: '', api: true, files: true }, { base: DE, ms: 300, err: '', api: true, files: true },
    { base: RTS, ms: 310, err: '', api: true, files: true }, { base: 'https://pub-x.r2.dev', ms: 90, err: '', api: false, files: true }] };
  window.__EV = {};
  window.__TAURI__.event.listen = function (name, f) { (window.__EV[name] = window.__EV[name] || []).push(f); return Promise.resolve(function () {}); };
  window.__fire = function (name, payload) { (window.__EV[name] || []).forEach(function (f) { f({ payload: payload }); }); };
  window.__TAURI__.core.invoke = function (cmd, a) {
    if (cmd === 'site_host') return Promise.resolve(RU);
    if (cmd === 'net_status' || cmd === 'net_check') return Promise.resolve(NET);
    if (cmd === 'c_status') return Promise.resolve({ signed_in: false, configured: true });
    if (cmd === 'c_api') return Promise.resolve({ ok: true, msgs: [], users: {}, rooms: [], searching: [], ingame: [], launcher: [] });
    if (cmd === 'c_stream_up') return Promise.resolve(false);
    if (cmd === 'rooms_live') return Promise.resolve({ rooms: [] });
    if (cmd === 'lroom_list') return Promise.resolve({ rooms: [] });
    return base(cmd, a);
  };
})();

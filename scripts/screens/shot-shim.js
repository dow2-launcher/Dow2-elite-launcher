// Android viewer shim. Loaded BEFORE app.js. Stands in for Tauri's `window.__TAURI__` so the exact
// same launcher UI runs in a plain WebView.
//
//  - Chat, sign-in and the live "who is online" list go to the real servers (through the native
//    AndroidHost bridge, so there is no CORS to satisfy).
//  - Settings and the add-on checkboxes are kept locally (localStorage): you can look and poke, and
//    the ticks stay where you put them.
//  - Anything that would download, install, launch the game or touch files is a no-op: it just says
//    so. Nothing is downloaded from this app.
(function () {
  'use strict';

  var VER = '1.3.14';
  // Chat / ladder API hosts (tried in order); the config lives behind the same mirror token every
  // desktop build already ships, so it is not a secret.
  var HOSTS = ['https://dow2.fintebtc.de', 'https://rts.fintebtc.de'];
  var CONFIG_URLS = [
    'https://dow2.fintebtc.de/eu/zRJIS1ChDRA-7176/launcher.json',
    'https://rts.fintebtc.de/eu/zRJIS1ChDRA-7176/launcher.json'
  ];
  var NOPE = 'Только просмотр: в Android-версии ничего не скачивается и не запускается · Viewer only: the Android app does not download or launch anything';

  function L() { try { console.log.apply(console, ['SHIM:'].concat([].slice.call(arguments))); } catch (e) {} }

  // ---------------- native HTTP bridge (async) ----------------
  var pending = {}, reqId = 0;
  window.__httpResolve = function (id, status, body, err) {
    var p = pending[id]; if (!p) return; delete pending[id];
    if (err) p.reject(new Error(err)); else p.resolve({ status: status, body: body });
  };
  function httpRaw(method, url, body) {
    return new Promise(function (resolve, reject) {
      var id = ++reqId; pending[id] = { resolve: resolve, reject: reject };
      fetch(url, { method: method, body: body == null ? undefined : body, headers: body == null ? {} : { 'Content-Type': 'application/json' } })
        .then(function (r) { return r.text().then(function (t) { window.__httpResolve(id, r.status, t, null); }); })
        .catch(function (e) { window.__httpResolve(id, 0, null, String(e)); });
    });
  }
  // One API call, trying each host until one answers with JSON (a 4xx still carries the server's
  // JSON error, which the UI knows how to show).
  function api(method, path, bodyObj) {
    var body = bodyObj == null ? null : JSON.stringify(bodyObj);
    var i = 0, last = 'the server is not reachable';
    return new Promise(function (resolve, reject) {
      (function next() {
        if (i >= HOSTS.length) return reject(new Error(last));
        var host = HOSTS[i++];
        httpRaw(method, host + path, body).then(function (r) {
          if (r.status >= 200 && r.status < 500 && r.body) {
            try { var j = JSON.parse(r.body); j.__host = host; return resolve(j); }
            catch (e) { last = 'bad answer'; return next(); }
          }
          last = 'http ' + r.status; next();
        }).catch(function (e) { last = (e && e.message) || String(e); next(); });
      })();
    });
  }
  function fetchConfig() {
    var i = 0, last = 'offline';
    return new Promise(function (resolve, reject) {
      (function next() {
        if (i >= CONFIG_URLS.length) return reject(new Error(last));
        httpRaw('GET', CONFIG_URLS[i++], null).then(function (r) {
          if (r.status === 200 && r.body) {
            try { return resolve(JSON.parse(r.body)); } catch (e) { last = 'bad config'; return next(); }
          }
          last = 'http ' + r.status; next();
        }).catch(function (e) { last = (e && e.message) || String(e); next(); });
      })();
    });
  }

  // ---------------- local storage helpers ----------------
  function lg(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function ls(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lrm(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function ovBool(k, def) { var v = lg(k); return v == null ? def : v === '1'; }

  function token() { return lg('cToken') || ''; }
  function profile() {
    var t = token();
    return {
      signed_in: !!t, steam: lg('cSteam') || '', name: lg('cName') || '', avatar: lg('cAvatar') || '',
      configured: true, local_name: '', local_found: false
    };
  }
  function saveProfile(v) {
    ls('cToken', v.token || ''); ls('cSteam', v.steam || ''); ls('cName', v.name || ''); ls('cAvatar', v.avatar || '');
    return profile();
  }

  // ---------------- status from the signed config ----------------
  var CFG = null, lastErr = '';
  function mainChannel(cfg) {
    if (!cfg || !cfg.channels || !cfg.channels.length) return '';
    var d = cfg.channels.find(function (c) { return c.default; });
    return (d || cfg.channels[0]).id;
  }
  function buildComp(c) {
    var opts = (c.settings && c.settings.length ? c.settings : c.options) || [];
    return {
      id: c.id, name: c.name, description: c.description, latest: c.version, home: c.home || '',
      enabled: ovBool('comp.' + c.id, !!c.default),
      conflicts: [], installed: ovBool('comp.' + c.id, !!c.default) ? c.version : '',
      options: opts.map(function (o) {
        var k = c.id + '.' + o.id;
        var hasChoices = Array.isArray(o.choices) && o.choices.length > 0;
        var val = '';
        if (hasChoices) { var s = lg('cval.' + k); val = s != null ? s : (o.default_value != null ? o.default_value : (o.choices[0] || {}).value || ''); }
        return { id: o.id, name: o.name, group: o.group, on: ovBool('copt.' + k, !!o.default), choices: o.choices || [], value: val };
      })
    };
  }
  function status() {
    var cfg = CFG;
    return {
      launcher_version: VER, os: 'windows',
      lang: lg('set.lang') || '',
      in_game_dir: false, steam_found: true, game_dir: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Dawn of War II - Retribution', game_found: true,
      installed_version: (function () { var m = mainChannel(cfg); var ch = cfg && cfg.channels ? cfg.channels.find(function (c) { return c.id === m; }) : null; return ch ? ch.version : ''; })(),
      installed_channel: mainChannel(cfg),
      channel: mainChannel(cfg), target_version: '', update_available: false, launcher_update: null,
      busy: false, game_running: false, last_error: cfg ? '' : lastErr,
      cache_mb: Number(lg('set.cache_mb') || 0),
      extra_mirror: lg('set.extra_mirror') || '',
      dismissed: [],
      mirror_count: cfg && cfg.mirrors ? cfg.mirrors.length : 0,
      components: cfg && cfg.components ? cfg.components.map(buildComp) : [],
      usage_stats: ovBool('set.usage_stats', true),
      mute_mention: ovBool('set.mute_mention', false),
      close_quits: ovBool('set.close_quits', false),
      lan_share: ovBool('set.lan_share', true),
      release_news: [], costs: {}, prev_channel: null,
      main_channel: mainChannel(cfg),
      config: cfg || null, config_loaded: !!cfg
    };
  }

  function setSetting(key, value) {
    if (typeof value === 'boolean') ls('set.' + key, value ? '1' : '0');
    else ls('set.' + key, String(value));
  }

  // ---------------- sign-in (Steam OpenID in the system browser) ----------------
  // On a phone the browser opens on top of us and Chromium FREEZES the WebView's JS timers the whole
  // time the player is on the Steam page — a plain poll loop just stalls, and if Android frees our
  // backgrounded app the loop is gone for good. So: the nonce is kept in localStorage; one wakeable
  // claim loop runs; MainActivity.onResume pokes it awake the instant we return (window.__onResume);
  // and a fresh launch with a nonce still pending picks the sign-in back up on its own.
  var loginGen = 0, runningGen = -1, wake = null, waiters = [];
  function randHex(n) { var s = ''; for (var i = 0; i < n; i++) s += ((Math.random() * 256) | 0).toString(16).padStart(2, '0'); return s; }
  function clearPending() { lrm('pendNonce'); lrm('pendTs'); }
  function notifyWaiters() { var ws = waiters; waiters = []; ws.forEach(function (w) { try { w.resolve(profile()); } catch (e) {} }); }
  function failWaiters(msg) { var ws = waiters; waiters = []; ws.forEach(function (w) { try { w.reject(new Error(msg)); } catch (e) {} }); }

  // One claim attempt: 'done' (signed in), 'wait' (try again) or 'stop' (expired / bad nonce).
  function claimOnce(nonce) {
    return api('GET', '/ladder/api/c/claim?nonce=' + nonce, null).then(function (v) {
      if (v.ok === true) { saveProfile(v); clearPending(); L('signed in as ' + v.name); return 'done'; }
      if (v.error) { L('claim error ' + v.error); return 'stop'; }
      return 'wait';
    }).catch(function () { return 'wait'; });   // host hiccup: keep trying
  }

  // Keep claiming the pending nonce until signed in or it expires. Safe to call repeatedly — only one
  // loop per sign-in attempt runs; extra calls just wake the waiting loop so it retries at once.
  function runClaimLoop() {
    var gen = loginGen;
    if (!lg('pendNonce') || token()) return;
    if (runningGen === gen) { if (wake) wake(); return; }
    runningGen = gen;
    var nonce = lg('pendNonce'), ts = Number(lg('pendTs') || 0);
    (function step() {
      if (gen !== loginGen || !lg('pendNonce') || token()) { if (runningGen === gen) runningGen = -1; return; }
      if (Date.now() - ts > 600000) { clearPending(); if (runningGen === gen) runningGen = -1; failWaiters('timeout'); return; }
      claimOnce(nonce).then(function (r) {
        if (gen !== loginGen) { if (runningGen === gen) runningGen = -1; return; }
        if (r === 'done') { runningGen = -1; onSignedIn(); return; }
        if (r === 'stop') { clearPending(); runningGen = -1; failWaiters('timeout'); return; }
        new Promise(function (res) { wake = res; var t = setTimeout(res, 2500); })
          .then(function () { wake = null; step(); });
      });
    })();
  }

  // Signed in. If app.js is still awaiting our c_login promise (normal case, incl. return-from-browser),
  // resolve it and let app.js redraw. If not (a fresh launch finished a pending sign-in), app.js shows
  // "signed out" from a stale read, so reload once — chInit then re-reads the saved token via c_status.
  function onSignedIn() {
    if (waiters.length) notifyWaiters();
    else { try { location.reload(); } catch (e) {} }
  }

  function cLogin() {
    var nonce = randHex(24), host = HOSTS[0];
    loginGen++;                                  // invalidate any earlier attempt's loop
    ls('pendNonce', nonce); ls('pendTs', String(Date.now()));
    L('cLogin open nonce=' + nonce);
    try { AndroidHost.openUrl(host + '/ladder/api/c/login?nonce=' + nonce); }
    catch (e) { clearPending(); return Promise.reject(new Error(String(e))); }
    return new Promise(function (resolve, reject2) {
      waiters.push({ resolve: resolve, reject: reject2 });
      runClaimLoop();
    });
  }
  function cLogout() {
    var t = token();
    loginGen++; clearPending(); failWaiters('cancelled');
    lrm('cToken'); lrm('cSteam'); lrm('cName'); lrm('cAvatar');
    if (t) api('POST', '/ladder/api/c/logout', { token: t }).catch(function () {});
    return Promise.resolve(profile());
  }
  // Called from MainActivity.onResume and on tab-visible: finish a sign-in that was waiting while the
  // Steam browser had the foreground.
  window.__onResume = function () { if (!token() && lg('pendNonce')) runClaimLoop(); };

  // ---------------- feedback (developers) chat ----------------
  function fbUid() { var u = lg('fbUid'); if (!u || u.length < 16) { u = randHex(18); ls('fbUid', u); } return u; }

  // ---------------- the invoke() surface app.js expects ----------------
  function reject(msg) { return Promise.reject(new Error(msg)); }
  function invoke(cmd, args) {
    args = args || {};
    switch (cmd) {
      // --- status / config ---
      case 'get_status': return Promise.resolve(status());
      case 'refresh':
        return fetchConfig().then(function (c) { CFG = c; lastErr = ''; return status(); })
          .catch(function (e) { lastErr = 'offline: ' + ((e && e.message) || e); return status(); });

      // --- settings & add-on ticks (kept locally; look and poke, nothing downloads) ---
      case 'set_setting': setSetting(args.key, args.value); return Promise.resolve(null);
      case 'set_component': ls('comp.' + args.id, args.on ? '1' : '0'); return Promise.resolve(null);
      case 'set_comp_option': ls('copt.' + args.comp + '.' + args.opt, args.on ? '1' : '0'); return Promise.resolve(null);
      case 'set_comp_value': ls('cval.' + args.comp + '.' + args.opt, String(args.value)); return Promise.resolve(null);

      // --- players' chat, sign-in, who is online (real servers) ---
      case 'c_status': return Promise.resolve(profile());
      case 'c_login_local': return Promise.resolve({ signed_in: false, no_steam: true, error: 'no Steam client on Android' });
      case 'c_login': return cLogin();
      case 'c_login_cancel': loginGen++; clearPending(); failWaiters('cancelled'); if (wake) wake(); return Promise.resolve(null);
      case 'c_logout': return cLogout();
      case 'c_api': {
        var path = args.path, body = args.body, post = (body !== undefined && body !== null);
        if (post) { body = Object.assign({}, body); body.token = token(); }
        return api(post ? 'POST' : 'GET', '/ladder/api/c/' + path, post ? body : null);
      }
      case 'online_live':
        return api('GET', '/ladder/api/mm/live', null).then(function (v) { v.host = v.__host; return v; });

      // --- feedback chat with the developers ---
      case 'fb_info': return Promise.resolve({ uid: fbUid(), name: lg('fbName') || '', configured: true });
      case 'fb_set_name': ls('fbName', String(args.name || '').trim().slice(0, 48)); return Promise.resolve(null);
      case 'fb_send': {
        var uid = fbUid();
        return api('POST', '/ladder/api/fb/send', {
          uid: uid, name: lg('fbName') || '', text: args.text || '', images: args.images || [],
          launcher: VER, os: 'android', elite: ''
        }).then(function (v) { if (v.ok === true) return v; throw new Error(v.error || 'rejected'); });
      }
      case 'fb_thread': {
        var u = fbUid();
        return api('GET', '/ladder/api/fb/thread?uid=' + u, null).then(function (v) {
          v.img_base = (v.__host || HOSTS[0]) + '/ladder/api/fb/img/'; v.uid = u; return v;
        });
      }

      // --- opening a link in the system browser ---
      case 'open_url': try { AndroidHost.openUrl(args.url); } catch (e) {} return Promise.resolve(null);

      // --- quiet no-ops (nothing to do on a phone) ---
      case 'cancel_update':
      case 'set_tray_labels':
      case 'launcher_check': return Promise.resolve(null);

      // --- hotkeys live in the desktop launcher ---
      case 'hotkeys_get':
      case 'hotkeys_save':
      case 'hotkeys_reset':
        return reject('Горячие клавиши настраиваются в десктоп-версии · Hotkeys are set in the desktop launcher');

      // --- everything that would download / install / launch / touch files ---
      case 'start_update':
      case 'play':
      case 'switch_to':
      case 'pick_game_dir':
      case 'open_game_dir':
      case 'remove_conflicts':
      case 'clean_junk':
      case 'uninstall_elite':
      case 'launcher_install':
      case 'send_logs':
        return reject(NOPE);

      default:
        return reject('unknown call: ' + cmd);
    }
  }

  // listen(): the desktop pushes progress / game-running events; none of that happens here, so it is
  // a no-op that returns the unsubscribe function the API promises.
  function listen() { return Promise.resolve(function () {}); }

  window.__TAURI__ = { core: { invoke: invoke }, event: { listen: listen } };

  // Resume a sign-in left pending by a previous run (app was backgrounded on the Steam page, or freed
  // and relaunched), and whenever this tab becomes visible again.
  try { if (lg('pendNonce') && !token()) runClaimLoop(); } catch (e) {}
  document.addEventListener('visibilitychange', function () { if (!document.hidden && !token() && lg('pendNonce')) runClaimLoop(); });
})();

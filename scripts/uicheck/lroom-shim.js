// lroom_noroom.mjs: loaded after screens/shot-shim.js, before app.js. A signed-in player; the room calls are counted in
// localStorage (stub.<verb>, kept through reloads) and answered as lroom.py does: no_room while "stub.inRoom" is not set.
// Nothing goes to our servers from the chat or the rooms.
(function () {
  'use strict';
  var base = window.__TAURI__.core.invoke, ME = '76561190000000001';
  function inc(k) { localStorage.setItem(k, String(+(localStorage.getItem(k) || 0) + 1)); }
  function room() {
    return { id: 'r1', name: 'Test', game: 'elite', ver: '3.2', mode: '1v1', map: '', state: 'lobby', owner: ME, seq: 1, cseq: 0, chat: [], obs: [],
             slots: [{ steam: ME, name: 'Me', race: 'space_marines', hero: 0, ready: false }, null] };
  }
  window.__TAURI__.core.invoke = function (cmd, a) {
    a = a || {};
    if (cmd === 'c_status' || cmd === 'c_login_local') return Promise.resolve({ signed_in: true, steam: ME, name: 'Me', avatar: '', configured: true, local_found: true });
    if (cmd === 'c_api') return Promise.resolve({ ok: true, msgs: [], users: {}, rooms: [], searching: [], ingame: [], launcher: [] });
    if (cmd === 'c_stream_up') return Promise.resolve(true);
    if (cmd === 'lroom_list') return Promise.resolve({ rooms: [], host: '' });
    if (cmd === 'lroom_pings') return Promise.resolve({ pings: {}, raw: {} });
    if (cmd === 'lroom_api') {
      inc('stub.' + a.verb);
      var inRoom = localStorage.getItem('stub.inRoom') === '1';
      if (a.verb === 'join') { localStorage.setItem('stub.inRoom', '1'); return Promise.resolve({ ok: true, room: room() }); }
      if (!inRoom) return Promise.resolve({ ok: false, error: 'no_room' });
      if (a.verb === 'get') return Promise.resolve({ ok: true, room: room() });
      if (a.verb === 'here') return Promise.resolve({ ok: true, seq: 1, cseq: 0 });
      return Promise.resolve({ ok: true });
    }
    return base(cmd, a);
  };
})();

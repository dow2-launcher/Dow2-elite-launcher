// Home's Online block: who is looking for a game, who plays, who has the launcher open.
// Split out of app.js (1.6.17), its section as it was; app.js keeps the core (the status, render, the add-ons, the update).
'use strict';
// ---------- Online (home, above the add-ons): who is looking for a game, who is in a match ----------
// The same list the ladder page shows: /ladder/api/mm/live of the ladder service on the log hosts, every 15 seconds
// (every minute while the window is hidden). Only names here; the details are on the ladder page linked below the block.
// The Online block comes ready from the ladder server: the snapshot (online / c/live) and then only changes over the
// stream (presence, match, match_end, user). Each person is in one group only, the server sorts that out.
const LIVE = { users: {}, searching: [], ingame: [], launcher: [], host: '', ok: false, skew: 0 };
const ON = { err: false, shut: new Set(), t: null };
// the groups the player folded stay folded (only a convenience: without storage everything opens)
try { ON.shut = new Set(JSON.parse(localStorage.getItem('onShut') || '[]')); } catch (e) {}
const RACES = ['space_marines', 'chaos_marines', 'eldar', 'orks', 'tyranids', 'imperial_guard', 't_tau', 'z_unecron', 'ordo_malleus'];
// MMFind sends these three under their own names (the server passes the searching list on as is); "random" - a random race
const RACE_ALIAS = { chaos_space_marines: 'chaos_marines', tau: 't_tau', necron: 'z_unecron' };
const raceImg = r => {
  r = RACE_ALIAS[r] || r;
  if (r === 'random') return `<span class="race race-rnd" role="img" aria-label="${esc(t('race_random'))}" title="${esc(t('race_random'))}">?</span>`;
  return RACES.includes(r) ? `<img class="race" src="races/${r}.png" alt="${esc(t('race_' + r))}" title="${esc(t('race_' + r))}">` : '<span class="race"></span>';
};
// the 1v1 rating; none yet (no ladder games this season) - a dash, so the dots after it stay in one column
const onRt = r => r ? `<span class="rt">${Number(r) | 0}</span>` : `<span class="rt none" title="${esc(t('prNoGames'))}">—</span>`;
const onUser = s => LIVE.users[s] || {};
const onWho = s => `<button class="nm" data-steam="${esc(s)}" data-name="${esc(onUser(s).name || '')}">${esc(onUser(s).name || 'Player')}</button>`;
// the server sends unix times and its own clock with every snapshot: minutes count right even when the PC clock is off
const onMins = ts => t('onMin', { n: Math.max(0, Math.round((Date.now() / 1000 + LIVE.skew - ts) / 60)) });

// The snapshot of the Online block: /c/live; a ladder server without it yet (02.11: the live servers answer 404) - the
// same snapshot put together from the old answers, /mm/live (searching, matches) and /c/online (the launcher open)
async function liveSnapshot() {
  try { const d = await invoke('c_api', { path: 'live' }); if (d && d.users) return d; } catch (e) { /* the old way below */ }
  const [mm, on] = await Promise.all([invoke('mm_live'), invoke('c_api', { path: 'online' })]);
  const now = Math.floor(Date.now() / 1000), users = {}, sid = x => String(x || '');
  const put = p => { const s = sid(p && p.steam); if (s && !users[s]) users[s] = { name: p.name || 'Player', avatar: p.avatar || '', rating: p.rating }; return s; };
  (on.online || []).forEach(put);   // these carry the avatars: first
  const ingame = (mm.matches || []).map(m => ({
    id: m.id, mode: m.mode, map: m.map, state: m.state === 'playing' ? 'playing' : 'setup',
    started: m.state === 'playing' && m.since != null ? now - m.since : null,
    team1: (m.team1 || []).map(p => ({ steam: put(p), race: p.race })), team2: (m.team2 || []).map(p => ({ steam: put(p), race: p.race })),
    watchers: (m.watchers || []).map(put).filter(Boolean),
  }));
  const busy = new Set(ingame.flatMap(m => [...m.team1, ...m.team2].map(x => x.steam).concat(m.watchers)));
  const searching = (mm.searching || []).filter(p => p.steam && !busy.has(sid(p.steam)))
    .map(p => ({ steam: put(p), mode: p.mode, race: p.race, since: now - (p.waiting || 0) }));
  searching.forEach(p => busy.add(p.steam));
  const launcher = (on.online || []).filter(u => u.steam && !busy.has(sid(u.steam))).map(u => ({ steam: sid(u.steam), state: u.state || 'menu' }));
  return { now, host: mm.host, users, searching, ingame, launcher };
}

function onLive(d) {   // a full snapshot
  Object.assign(LIVE, { users: d.users || {}, searching: d.searching || [], ingame: d.ingame || [], launcher: d.launcher || [], ok: true });
  if (d.host) LIVE.host = d.host;
  if (d.now) LIVE.skew = d.now - Date.now() / 1000;
  if (Array.isArray(d.lrooms) && typeof lrFromLive === 'function') lrFromLive(d.lrooms);   // 1.4.25: the launcher rooms (lroom.js)
  ON.err = false; onSoon();
}
function onEvent(ev, d) {
  if (ev === 'online') return onLive(d);
  if (ev === 'user') { LIVE.users[d.steam] = { name: d.name, avatar: d.avatar, rating: d.rating }; if (CH.me && d.steam === CH.me.steam) chMe(); }
  else if (ev === 'presence') {
    // out of every group, then into the new one (ingame: the match event carries the teams)
    LIVE.searching = LIVE.searching.filter(p => p.steam !== d.steam);
    LIVE.launcher = LIVE.launcher.filter(p => p.steam !== d.steam);
    if (d.group === 'searching') LIVE.searching.push({ steam: d.steam, mode: d.mode, race: d.race, since: d.since });
    if (d.group === 'launcher') LIVE.launcher.push({ steam: d.steam, state: d.state });
  } else if (ev === 'match') {
    const i = LIVE.ingame.findIndex(m => m.id === d.id);
    if (i >= 0) LIVE.ingame[i] = d; else LIVE.ingame.push(d);
  } else if (ev === 'match_end') LIVE.ingame = LIVE.ingame.filter(m => m.id !== d.id);
  else return;
  onSoon();
}
function onSoon() {   // at most one redraw in 500 ms, however many events come
  if (ON.t) return;
  ON.t = setTimeout(() => { ON.t = null; onRender(); roomsJoinState(); }, 500);
}

function onRender() {
  if (!S) return;
  const group = (key, title, n, body) => {
    const open = !ON.shut.has(key);
    return `<div class="on-g ${key} ${open ? '' : 'shut'}"><button class="on-gh" data-g="${key}" aria-expanded="${open}" ${body ? '' : 'disabled'}>`
      + `<i></i>${esc(title)}<span>${esc(String(n))}</span>${body ? '<b class="chev"></b>' : ''}</button>${open ? body : ''}</div>`;
  };
  const look = LIVE.searching, matches = LIVE.ingame, inL = LIVE.launcher;
  const lrs = typeof lrOnRooms === 'function' ? lrOnRooms() : [];   // 1.4.25: the open launcher rooms (lroom.js)
  const players = matches.flatMap(m => [...m.team1, ...m.team2]);
  let html = '';
  // first load: grey rows in place of the names; no answer: say so
  if (!LIVE.ok) html = ON.err ? `<div class="on-empty">${esc(t('onOffline'))}</div>`
    : `<div class="on-skel" role="status" aria-label="${esc(t('onLoading'))}">${'<div><i></i><b></b></div>'.repeat(5)}</div>`;
  else {
    if (ON.err) html += `<div class="on-stale">${esc(t('onOffline'))}</div>`;   // the last list stays, marked as old
    if (!look.length && !matches.length && !inL.length) html += `<div class="on-empty">${esc(t('onNobody'))}</div>`;
    // looking for a game: avatar, name, race, mode (spectators marked); no time (owner 03.11.2026: not needed)
    if (look.length) html += group('look', t('onSearching'), look.length, look.map(p => `<div class="on-p">${avatar(onUser(p.steam).avatar)}${onWho(p.steam)}${raceImg(p.race)}`
      + `<span class="tag">${esc(p.mode === 'watch' ? t('onWatcher') : p.mode)}</span></div>`).join(''));
    // 1.5.0: no rooms group here - who is in the rooms is on the Rooms tab (owner 08.11.2026)
    // the launcher open: avatar, 1v1 rating, a dot for menu / game
    if (inL.length) html += group('launcher', t('chMembers'), inL.length, [...inL].sort((a, b) => (onUser(a.steam).name || '').localeCompare(onUser(b.steam).name || ''))
      .map(p => `<div class="on-p on-u">${avatar(onUser(p.steam).avatar)}${onWho(p.steam)}${onRt(onUser(p.steam).rating)}`
        + `<span class="st st-${esc(p.state)}" title="${esc(t('st_' + p.state))}"></span></div>`).join(''));
    // in a match, the last group and the biggest: a card per match - mode, map, getting ready / how long it plays -
    // team against team, the spectators
    const pl = x => `<div class="on-p">${avatar(onUser(x.steam).avatar)}${onWho(x.steam)}${raceImg(x.race)}${onRt(onUser(x.steam).rating)}</div>`;
    const map = m => String(m || '').replace(/^\d+p_/i, '').replace(/_/g, ' ');
    if (matches.length) html += group('match', t('onInMatchH'), players.length, matches.map(m => `<div class="on-mc"><div class="on-mh">`
      + `<span class="tag ${m.state === 'playing' ? 'playing' : 'creating'}">${esc(m.mode)}</span><span class="map">${esc(map(m.map))}</span>`
      + `<span class="since">${esc(m.state === 'playing' ? t('onStatePlaying') + (m.started ? ' · ' + onMins(m.started) : '') : t('onStateCreating'))}</span>`
      + (m.live ? `<button class="lvw" data-m="${esc(m.id)}" data-g="${esc(m.live)}" data-tip="${esc(t('lvTitle'))}" aria-label="${esc(t('lvTitle'))}">${ico('eye')}</button>` : '') + '</div>'
      + m.team1.map(pl).join('') + '<div class="vs">vs</div>' + m.team2.map(pl).join('')
      + (m.watchers.length ? `<div class="on-wt">${esc(t('onWatchers'))}: ${m.watchers.map(onWho).join(', ')}</div>` : '') + '</div>').join(''));
  }
  // "Online N" in the heading: everyone in the groups once, spectators too
  const ids = new Set([...look.map(p => p.steam), ...players.map(x => x.steam), ...matches.flatMap(m => m.watchers), ...inL.map(p => p.steam)]);
  $('onTotal').textContent = LIVE.ok ? String(ids.size) : '';
  $('onGroups').innerHTML = html;
  // a name: the menu (mention in the chat - the owner's 1.3.12 click - / stats / Steam); the avatar opens the Steam profile (1.3.12)
  // the name and the avatar of a player: the player menu (stats, Steam, mention in the chat)
  $('onGroups').querySelectorAll('.nm[data-steam]').forEach(b => nickBind(b, b.dataset.steam, b.dataset.name));
  $('onGroups').querySelectorAll('.on-p').forEach(r => { const n = r.querySelector('.nm[data-steam]');
    if (n) nickBind(r.querySelector('.av'), n.dataset.steam, n.dataset.name); });
  $('onGroups').querySelectorAll('.lvw[data-m]').forEach(b => b.onclick = () => liveWatch(b.dataset.m, b.dataset.g === 'vanilla' ? 'vanilla' : 'elite'));
  $('onGroups').querySelectorAll('.on-gh[data-g]').forEach(b => b.onclick = () => {
    ON.shut.has(b.dataset.g) ? ON.shut.delete(b.dataset.g) : ON.shut.add(b.dataset.g);
    try { localStorage.setItem('onShut', JSON.stringify([...ON.shut])); } catch (e) {}
    onRender();
  });
  if (typeof rLiveRender === 'function') rLiveRender();   // the Rooms tab's running matches
  tipCut($('onGroups'));
}
setInterval(() => LIVE.ok && onRender(), 30000);   // the minutes go on without any event

// 1.4.18 (owner 06.11.2026): "Watch" on a running match of our servers - the LiveReplay add-on opens it in the game as a replay
// that keeps growing, a few minutes behind (livewatch.rs; the game fetches the replay from the ladder itself)
const lvComp = () => (S && S.components || []).find(c => String(c.id).replace(/_(r\d+|off)$/, '') === 'livereplay');
async function liveWatch(id, game) {
  if (!S || (S.os !== 'windows' && S.os !== 'linux')) { toast(t('rjOnlyWin'), true); return; }
  if (meBusy()) { toast(t('lvBusy'), true); return; }
  const c = lvComp();
  if (game === 'vanilla' && !S.vanilla_offered) { rjModal(t('lvAsk'), [t('rjVanNo')]); return; }
  try {
    // 1.6.13 (siritos fb 1210): the add-on off - the same window as every button of an add-on (needaddon.js): turn it on and
    // watch; the game running - once it is closed the launcher turns it on, starts the game and watches (LiveReplay 3 and 4 take
    // the same "watch")
    if (!c || !c.enabled || (game === 'vanilla' && !c.vanilla_ok)) {
      if (!await naNeed('livereplay', 'na_livereplay', game, () => liveWatch(id, game))) return;
    }
    const p = await invoke('live_watch_probe') || {};
    const mine = (p.games || []).filter(g => !g.kind || g.kind === game);
    if (p.running && !mine.length && (p.games || []).length) { rjModal(t('lvAsk'), [t('lvWrongGame')]); return; }
    let wait = 0;
    if (!mine.length) {
      if (p.running) wait = 90;                                     // just started (its add-ons come later), or without the add-on
      else {
        wait = 240;
        if ((game === 'vanilla') !== VAN()) { try { S = await invoke('set_game_mode', { mode: game }); render(); } catch (e) { /* the chosen game then */ } }
        doPlay(false);
      }
    }
    toast(t(mine.length ? 'lvSent' : 'lvStarting'));
    await invoke('live_watch', { id, game, base: LIVE.host || 'https://rts.fintebtc.de', wait });
  } catch (e) { toast(String(e), true); }
}
listen('live_watch', e => {
  const v = e.payload || {};
  if (v.ev === 'waiting_game') toast(t('lvWaitGame'));
  else if (v.ev === 'accepted' || v.ev === 'fetching') toast(t('lvFetching'));
  else if (v.ev === 'starting' || v.ev === 'playing') toast(t('lvLoading'));
  else if (v.ev === 'failed') { const k = 'lvWhy_' + v.reason; rjModal(t('lvAsk'), [t('lvFailed', { why: T[lang][k] || T.en[k] ? t(k) : (v.reason || '?') })]); }
});

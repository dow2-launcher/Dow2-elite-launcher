// The Lobbies tab: the open custom games of the game (Relic's list through our ladder) and Join over RoomJoin.
// Split out of app.js (1.6.17), its section as it was; app.js keeps the core (the status, render, the add-ons, the update).
'use strict';
// 1.3.15 (owner 02.11.2026): the Lobbies tab - open custom games from Relic's list through our ladder server, every 15 s while shown
const RM = { timer: 0, host: '' };
// 1.5.0: the player's country as its two letters in a small badge (a flag emoji is letters anyway in WebView2 on Windows)
// 1.5.3 (owner 10.11): the map of a card - the minimap as a square on top (never stretched), its name under it, the same picture
// dimmed behind the rest of the column
const mmapHtml = (url, name) => `<div class="mmap"${url ? ` style="--mm:url('${esc(url)}')"` : ''}><i class="mm"></i><span>${esc(name || '')}</span></div>`;
const roomFlag = c => /^[a-z]{2}$/i.test(c || '') ? `<span class="fl" title="${esc(c.toUpperCase())}">${esc(c.toUpperCase())}</span>` : '';
// RoomJoin (experiment 03.11.2026): "Join" on an Elite room without a password while the add-on is on - the game starts (or is
// already running) and RoomJoin.dll walks into the room from the main menu; if it can't, the game shows the public games list
// 1.4.11 (owner 05.11.2026): vanilla lobbies too - from the launcher's vanilla game, with RoomJoin's copy for vanilla
const rjComp = () => (S && S.components || []).find(c => String(c.id).replace(/_(r\d+|off)$/, '') === 'roomjoin');
const roomJoinOn = game => {
  if (!S || (S.os !== 'windows' && S.os !== 'linux')) return false;
  const c = rjComp();
  if (game === 'vanilla') return !!(S.vanilla_offered && c && c.enabled && c.vanilla_ok);
  return !!(S.roomjoin_dll || (c && c.enabled));
};
const roomGame = r => r && r.game === 'vanilla' ? 'vanilla' : 'elite';
// 1.4.8 (review of RoomJoin 1, 03.11): no Join while I search or play (a Join then could break the match the automatch walks
// the menus to; RoomJoin 8 drops such a request too) - from the Online block's live lists, when signed in
const meBusy = () => {
  const me = CH.me && CH.me.signed_in ? String(CH.me.steam || '') : '';
  if (!me) return false;
  return LIVE.searching.some(p => String(p.steam) === me)
    || LIVE.ingame.some(m => [...(m.team1 || []), ...(m.team2 || [])].some(p => String(p.steam) === me) || (m.watchers || []).map(String).includes(me));
};
// the room's version (the ladder's exact type: the game's own mod name and version from Relic) against the installed Elite;
// "3.2" = "3.2.0"; an installed build that is not a plain number (a test channel) is not compared
const verParts = v => String(v || '').split(/[^0-9]+/).filter(Boolean).map(Number);
const verSame = (a, b) => { const x = verParts(a), y = verParts(b); while (x.length && !x[x.length - 1]) x.pop(); while (y.length && !y[y.length - 1]) y.pop(); return x.join('.') === y.join('.'); };
// 1.4.10 (siritos 05.11): the room's version is not shown on the card any more and does not hide Join. It comes with the list
// (no wait on the click). Another version than mine: no join - a window says so plainly and, when the launcher has that
// version, offers to switch to it ("Update to" a newer one, "Switch to" an older one). A version not known yet: Join as is,
// the game itself says "another version" then. '' = join, else the room's version
function roomJoinWhy(r) {
  if (!r.exact) return '';   // an older ladder without the exact fields, or the version is not known yet
  const mine = S && S.installed_version;
  return r.version && /^\d/.test(mine || '') && !verSame(r.version, mine) ? String(r.version) : '';
}
const verNewer = (a, b) => { const x = verParts(a), y = verParts(b); for (let i = 0; i < Math.max(x.length, y.length); i++) { if ((x[i] | 0) !== (y[i] | 0)) return (x[i] | 0) > (y[i] | 0); } return false; };
function roomVerOther(v) {
  const mine = S.installed_version;
  const ch = (S.config?.channels || []).find(c => verSame(c.version, v));
  const why = !ch ? t('roomsVerNoCh', { v }) : S.game_running ? t('roomsVerGame') : S.busy ? t('roomsVerBusy') : '';
  const up = verNewer(v, mine);
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="box"><h3>${esc(t('roomsVerAsk'))}</h3><p>${esc(t('roomsVerOther', { v, mine }))}</p>${why ? `<p class="note">${esc(why)}</p>` : ''}<div class="row">`
    + (ch && !why ? `<button class="btn gold" id="rvSw">${esc(t(up ? 'roomsVerUp' : 'roomsVerSw', { v }))}</button>` : '')
    + `<button class="btn" id="rvNo">${esc(t('roomsVerClose'))}</button></div></div>`;
  document.body.appendChild(m);
  m.querySelector('#rvNo').onclick = () => m.remove();
  m.onclick = e => { if (e.target === m) m.remove(); };
  const sw = m.querySelector('#rvSw');
  // 1.6.3 (owner 13.11.2026): no button takes the focus when a window opens (its ring read as a pressed button)
  if (sw) sw.onclick = () => { m.remove(); switchTo(ch.id); toast(t('roomsVerAfter', { v })); };
}
// the Join buttons follow my search / match at once (the list itself reloads every 15 s). 1.4.10 (siritos 05.11: "I started a
// search, pressed Join - nothing happened, and no word why"): not disabled any more - dimmed, and a click says why
function roomsJoinState() {
  const busy = meBusy();
  document.querySelectorAll('#roomsList .rjoin[data-room]').forEach(b => { b.classList.toggle('wait', busy); b.title = busy ? t('roomsJoinBusy') : t('roomsJoin'); });
}
// 1.6.13: Join / the eye need a system RoomJoin runs on (Windows, Linux); the add-on itself is asked for on the click
const roomJoinSys = () => !!S && (S.os === 'windows' || S.os === 'linux');
// the eye of a game's lobby (siritos fb 1210): into the lobby as an observer - RoomJoin's "as":"obs". The ladder's obs_free (from
// the game's own list): the open and empty observer seats; null / an older ladder - not known, the game itself says no_obs_slot then.
// 1.6.14 (siritos fb 1223): 0 - the host has none open (the game's default): the eye is crossed out and does not press (no window),
// its tip on hover stays. Not the disabled attribute: a disabled button gets no hover in every WebView, the tip would be lost.
const roomObsFree = r => r.obs_free == null ? null : Number(r.obs_free) | 0;
function roomObsBtn(r, cls) {
  const n = roomObsFree(r), none = n === 0, tip = none ? t('rObsNone') : n ? t('rObsTip', { n }) : t('rObsTip0');
  return `<button class="${cls} robs-b${none ? ' off' : ''}" data-obs="${esc(String(r.id))}" data-name="${esc(r.name || '')}"${none ? ' aria-disabled="true"' : ''} data-tip="${esc(tip)}" aria-label="${esc(tip)}">${ico(none ? 'eyeOff' : 'eye')}</button>`;
}
// 1.6.20 (owner 17.11.2026): Join of a lobby with no free seat - there, dimmed, not pressable (aria-disabled: a disabled button
// gets no hover in every WebView and its tip would be lost); the tip says the lobby is full
const roomFullBtn = cls => `<button class="${cls} full" aria-disabled="true" tabindex="-1" data-tip="${esc(t('lrFullTip'))}" aria-label="${esc(t('lrFullTip'))}">${ico('enter')}</button>`;
// the eye pressed: no free seat - nothing (the crossed-out eye and its tip say why); else the same Join as a player, with "as":"obs"
function roomObs(id, name, btn) {
  const r = roomById(id);
  if ((btn && btn.getAttribute('aria-disabled') === 'true') || (r && roomObsFree(r) === 0)) return;
  return roomTry(id, name, btn, 'obs');
}
function roomCard(r) {
  const A = (RM.host || siteBase()) + '/elite/assets/';
  const why = r.game === 'elite' ? roomJoinWhy(r) : '';
  const tag = r.game === 'elite' ? `<span class="tag elite">Elite</span>`
    : r.game === 'vanilla' ? `<span class="tag van">${esc(t('roomsVan'))}</span>`
    : r.game === 'other' ? `<span class="tag oth">${esc(t('roomsOther'))}</span>` : '';
  const cap = r.cap || (((r.map || '').match(/^(\d)p_/) || [])[1] | 0) || 0;
  const per = cap ? Math.max(1, Math.round(cap / 2)) : 0;
  // no race in the slot (Relic's slot info has 255 there: Random, or not picked yet): the "?" of the searching list (03.11.2026)
  // 1.6.20: the rating of the picked system (rating.js) - Relic's, or Elite's of the lobby's mode; the player's tip on the row
  const pl = p => `<div class="rp${p.host ? ' host' : ''}"${rtTipAttr(p.steam, p.name, p.rating, hlHours(p))}>`
    + (p.race ? `<img${p.hero != null ? '' : ' class="race"'} src="${esc(A)}${p.hero != null ? 'heroes/' + esc(p.race) + '_' + (p.hero | 0) : 'races/' + esc(p.race)}.png" alt="" data-fb="${esc(A)}races/${esc(p.race)}.png">`
       : raceImg('random'))
    + `${roomFlag(p.country)}${rtName(`<span class="nm" data-steam="${esc(p.steam || '')}" data-name="${esc(p.name || '')}">${esc(p.name)}</span>`, p.steam)}${rtCell(p.steam, r.mode, p.rating)}</div>`;
  // observers (03.11.2026, siritos: a slot of their own with its own icon, under the teams): the players the server marks as
  // observers or puts in no team, else only Relic's count of them
  const isObs = p => p.observer || !(p.team === 0 || p.team === 1 || p.team == null);
  const obsP = (r.players || []).filter(isObs), nObs = Math.max(r.observers | 0, obsP.length);
  const teams = [0, 1].map(tm => {
    const ps = (r.players || []).filter(p => !isObs(p) && (p.team | 0) === tm);
    // 1.5.0 (D): the team's heading with its average rating (1.6.20: of the picked system and the lobby's mode, as its rows); an
    // open seat as a row (an empty race square)
    const avg = rtAvg(ps.map(p => ({ steam: p.steam, mode: r.mode, relic: p.rating })));
    return `<div class="team"><div class="th"><span>${esc(t('rTeamShort', { n: tm + 1 }))}</span>${avg ? `<span>${esc(t('rAvg', { r: avg }))}</span>` : ''}</div>${ps.map(pl).join('')}`
      + `${Array(per ? Math.max(0, per - ps.length) : 0).fill(`<div class="rp free"><i class="sk"></i><span class="nm">${esc(t('roomsFree'))}</span></div>`).join('')}</div>`;
  }).join('');
  const EYE = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path fill="currentColor" d="M12 5C6.5 5 2.7 9.2 1.5 12c1.2 2.8 5 7 10.5 7s9.3-4.2 10.5-7C21.3 9.2 17.5 5 12 5zm0 11.5A4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 0 1 0 9zm0-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/></svg>';
  const obs = nObs ? `<div class="robs" title="${esc(t('roomsObs'))}">${EYE}`
    + (obsP.length ? obsP.map(p => `${roomFlag(p.country)}<span class="nm" data-steam="${esc(p.steam || '')}" data-name="${esc(p.name || '')}">${esc(p.name)}</span>`).join('<span class="sep">·</span>')
      + (nObs > obsP.length ? ` <span class="oc">+${nObs - obsP.length}</span>` : '') : `<span class="oc">${nObs}</span>`) + '</div>' : '';
  const map = r.map_title || String(r.map || '').replace(/^\d+p_/i, '').replace(/_/g, ' ');
  const full = r.free != null ? r.free <= 0 : false;
  const here = RM.mine && String(RM.mine.room) === String(r.id);
  // 1.6.13 (siritos fb 1210): Join is there whether "Lobby join" is on or not - a click on it asks for the add-on (needaddon.js);
  // the eye next to it joins as an observer (RoomJoin 14+), dimmed while the host has no free observer seat
  const canIn = (r.game === 'elite' || r.game === 'vanilla') && roomJoinSys() && !r.password && r.id;
  // 1.6.20 (owner 17.11.2026): a full lobby keeps its Join - dimmed, not pressable, its tip says why (roomFullBtn)
  const join = here ? `<span class="tag here">${esc(t('roomsHere'))}</span>`
    : canIn ? roomObsBtn(r, 'rjoin') + (!full
    ? `<button class="rjoin go${meBusy() ? ' wait' : ''}" data-tip="${esc(meBusy() ? t('roomsJoinBusy') : t('rJoinTip', { name: r.name || '' }))}" aria-label="${esc(t('roomsJoin'))}" data-room="${esc(String(r.id))}" data-name="${esc(r.name || '')}" data-why="${esc(why)}">${ico('enter')}</button>`
    : roomFullBtn('rjoin')) : '';
  // 1.5.0: the marks the Rooms tab's filters read (one list with the launcher's rooms, lroom.js rApplyFilter)
  const vok = r.game === 'elite' ? !why : r.game === 'vanilla' ? !!S.vanilla_offered : false;
  const dat = `data-kind="game" data-mode="${esc(r.mode || '')}" data-vok="${vok ? 1 : 0}" data-van="${r.game === 'vanilla' ? 1 : 0}" data-free="${!full && !r.password && (!cap || (r.players || []).filter(p => !isObs(p)).length < cap) ? 1 : 0}"`;
  return `<div class="room${vok ? '' : ' dim'}" ${dat} data-id="${esc(String(r.id || ''))}">${mmapHtml(r.minimap ? A + r.minimap : '', map)}<div class="rb">`
    // 1.5.0 (D): the name, a lock, the mode; the teams; the version (Elite x.y / vanilla / another mod), seats, the eye and Join
    // at the bottom (a lobby in the game carries no mark at the top - only the launcher's are marked)
    + `<div class="rh"><span class="rn" title="${esc(r.name || '')}">${esc(r.name || '—')}</span>${r.password ? `<span class="mu" title="${esc(t('roomsPw'))}">${ico('lock')}</span>` : ''}${r.mode ? `<span class="tag">${esc(r.mode)}</span>` : ''}</div>`
    + `<div class="teams">${teams}</div>${obs}`
    // 1.6.13 (siritos fb 1210): every version mark at the bottom - Elite's and vanilla (1.6.11 had moved vanilla into the title)
    + `<div class="rfoot2">${r.game === 'elite' ? (r.exact && r.version ? `<span class="tag ver">Elite ${esc(r.version)}</span>` : '<span class="tag ver">Elite</span>') : tag}`
    + `${cap ? `<span class="tag rcount">${(r.players || []).filter(p => !isObs(p)).length}/${cap}</span>` : ''}${join}</div></div></div>`;
}
// 1.4.10 (siritos 05.11): the lobby I am in - no Join on it ("You are here"), and Join on another one says "leave it first"
// (the game would refuse it too). From the list: my SteamID among its players (the ladder has them from Relic, the list is up
// to ~30 s old); right after a Join from here, the game's "in the lobby" until the list shows me in it - or 45 s without
// a name cut by its column: its whole text in the tip (data-tip), only then
function tipCut(box) {
  requestAnimationFrame(() => box.querySelectorAll('.nm').forEach(n => {
    const row = n.closest('.rp,.on-p') || n;          // the tip on the row: the name's own overflow would clip it
    if (n.scrollWidth > n.clientWidth + 1) row.dataset.tip = n.textContent; else if (row.dataset.tip === n.textContent) row.removeAttribute('data-tip');
  }));
}
function roomMine(R) {
  const me = CH.me && CH.me.signed_in ? String(CH.me.steam || '') : '';
  const gone = RM.gone && Date.now() < RM.gone.until ? RM.gone.room : '';   // the game said I left it: the late list is not believed
  const r = me && R.find(x => String(x.id) !== gone && (x.players || []).some(p => String(p.steam || '') === me));
  if (r) return { room: String(r.id), name: r.name || '', ts: Date.now(), list: true };
  if (me) return null;   // signed in: the list decides alone (05.11: the plaque stayed on a room I had left, its players right)
  const j = RJ.here;     // signed out: the game's "in the lobby" after a Join from here, 45 s
  return j && R.some(x => String(x.id) === j.room) && Date.now() - j.ts < 45000 ? j : null;
}
async function roomsLoad() {
  const box = $('roomsList'); if (!box) return;
  try {
    const d = await invoke('rooms_live'); RM.host = d.host || RM.host;
    const R = d.rooms || [];
    RM.last = R; RM.mine = roomMine(R);
    RM.err = false;
    roomsPaint();
  } catch (e) { RM.err = true; box.innerHTML = ''; }
  if (typeof rApplyFilter === 'function') rApplyFilter();
}
// the list drawn from the last answer (1.6.20: also when the rating system or the Elite table changes, rating.js)
function roomsPaint() {
  const box = $('roomsList'); if (!box || RM.err || !RM.last) return;
  box.innerHTML = RM.last.map(roomCard).join('');
  box.querySelectorAll('img[data-fb]').forEach(i => i.onerror = () => { i.onerror = null; i.src = i.dataset.fb; });   // no hero icon: the race's (CSP: no inline handlers)
  // a player with a SteamID (the server sends it from Relic's "/steam/<id64>"): the player menu on his name
  box.querySelectorAll('.rjoin[data-room]').forEach(b => b.onclick = () => roomTry(b.dataset.room, b.dataset.name, b));
  box.querySelectorAll('.rjoin[data-obs]').forEach(b => b.onclick = () => roomObs(b.dataset.obs, b.dataset.name, b));
  tipCut(box);   // the room's game from the list
  box.querySelectorAll('.rp .nm[data-name], .robs .nm[data-name]').forEach(n => nickBind(n, n.dataset.steam, n.dataset.name, false, true));   // the stats (by name until the server sends SteamIDs), Steam when there; no "mention"
}
// 1.4.9: Join talks to RoomJoin.dll (RoomJoin 9) in the game over its pipe (roomjoin.rs) - no request file any more. The game
// running without the pipe = without the add-on (or an older one): restart it with the add-on on. Not running: Play, then the
// launcher waits for the game's pipe. What the game says (accepted, walking, joining, in the lobby, why not) shows above the list.
const RJ = { room: '', name: '', hide: 0, here: null };
// 1.6.16 (owner 16.11.2026): an error of a join is a red strip on top as every error (notes.js errBar), not a line over the list
function rjShow(text, kind, cancel) {
  const b = $('rjStatus'); if (!b) return;
  clearTimeout(RJ.hide);
  if (kind === 'err' && typeof errBar === 'function') { b.classList.add('hidden'); errBar(text); return; }
  b.classList.remove('hidden', 'ok', 'err'); if (kind) b.classList.add(kind);
  $('rjText').textContent = text; $('rjCancel').classList.toggle('hidden', !cancel);
  if (kind) RJ.hide = setTimeout(() => b.classList.add('hidden'), kind === 'ok' ? 10000 : 30000);
}
// a window with a title, lines of text and buttons [{label, cls, val}]; resolves the button's val (null: closed)
function askBox(title, lines, buttons) {
  return new Promise(done => {
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div class="box"><h3>${esc(title)}</h3>${lines.filter(Boolean).map(l => `<p>${esc(l)}</p>`).join('')}<div class="row">`
      + buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}">${esc(b.label)}</button>`).join('') + '</div></div>';
    document.body.appendChild(m);
    const end = v => { m.remove(); done(v); };
    m.querySelectorAll('button[data-i]').forEach(b => b.onclick = () => end(buttons[+b.dataset.i].val));
    m.onclick = e => { if (e.target === m) end(null); };
  });
}
// 1.4.17 (owner 06.11.2026): the questions and the errors of a Join are siritos's small windows again (askBox) - "не перекрывать
// экран" was about RoomJoin's black screen in the game only (gone since RoomJoin 12). The status line keeps the progress.
// One error window at a time (a second failure replaces the text).
let RJ_MODAL = null;
function rjModal(title, lines) {
  if (RJ_MODAL) RJ_MODAL.remove();
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="box"><h3>${esc(title)}</h3>${lines.filter(Boolean).map(l => `<p>${esc(l)}</p>`).join('')}<div class="row"><button class="btn gold">${esc(t('roomsVerClose'))}</button></div></div>`;
  document.body.appendChild(m); RJ_MODAL = m;
  const end = () => { m.remove(); if (RJ_MODAL === m) RJ_MODAL = null; };
  m.querySelector('button').onclick = end; m.onclick = e => { if (e.target === m) end(); };
}
const roomById = id => (RM.last || []).find(x => String(x.id) === String(id));
const roomIHost = r => { const me = CH.me && CH.me.signed_in ? String(CH.me.steam || '') : ''; return !!(me && r && (r.players || []).some(p => p.host && String(p.steam || '') === me)); };
// Join on a room's card: its version first (another one: say so, offer to switch), then the join; seat 'obs' - as an observer
async function roomTry(id, name, btn, seat) {
  if (!S || (S.os !== 'windows' && S.os !== 'linux')) { rjShow(t('rjOnlyWin'), 'err'); return; }
  if (meBusy()) { rjShow(t('roomsJoinBusy'), 'err'); roomsJoinState(); return; }
  const r = roomById(id);
  const v = r && r.game === 'elite' ? roomJoinWhy(r) : '';
  if (v) { roomVerOther(v); return; }                               // another version: say so, offer to switch
  return roomJoin(id, (r && r.name) || name || '', btn, false, roomGame(r), seat);
}
// 1.4.11: the other game runs (Elite for a vanilla lobby or the other way round): the launcher never closes it - the player
// closes it, then the right game starts and the join goes on (game_running below)
async function rjWrongGame(id, name, want) {
  const ok = await askBox(t('rjWrongAsk'), [t(want === 'vanilla' ? 'rjWrongVan' : 'rjWrongElite')],
    [{ label: t('rjWrongGo'), cls: 'gold', val: 1 }, { label: t('rjCancel'), val: 0 }]);
  if (!ok) return;
  RJ.after = { id, name, want, seat: RJ.seat };
  rjShow(t('rjCloseGame', { game: want === 'vanilla' ? (L(S.vanilla?.name) || t('vanillaName')) : 'Elite', name }), '', true);
}
async function roomJoin(id, name, btn, leave, game, seat) {
  if (!S || (S.os !== 'windows' && S.os !== 'linux')) { rjShow(t('rjOnlyWin'), 'err'); return; }
  if (meBusy()) { rjShow(t('roomsJoinBusy'), 'err'); roomsJoinState(); return; }
  const room = Number(id); if (!Number.isSafeInteger(room) || room <= 0) return;
  if (btn) btn.disabled = true;
  setTimeout(() => { if (btn) btn.disabled = false; }, 2000);   // a double click only: a second Join for the same room just goes on
  RJ.room = String(room); RJ.name = name || ''; RJ.after = null; RJ.seat = seat === 'obs' ? 'obs' : '';
  const want = game === 'vanilla' ? 'vanilla' : game === 'elite' ? 'elite' : roomGame(roomById(id));
  RJ.want = want;
  if (want === 'vanilla' && !S.vanilla_offered) { rjShow(t('rjVanNo'), 'err'); return; }
  // 1.6.13 (siritos fb 1210): "Lobby join" off - a window offers to turn it on and the join goes on (no "turn it on in Add-ons")
  if (!roomJoinOn(want) && !await naNeed('roomjoin', RJ.seat ? 'na_roomjoin_obs' : 'na_roomjoin', want, () => roomJoin(id, name, null, leave, want, seat))) return;
  try {
    const p = await invoke('room_join_probe') || {};
    // the other game runs (its command line says): no join into it - close it first, then the right one starts
    const mine = (p.games || []).filter(g => !g.kind || g.kind === want);
    if (p.running && !mine.length && (p.running_kind && p.running_kind !== want || (p.games || []).length)) { rjWrongGame(id, name, want); return; }
    // the lobby I am in: the game itself says (its status, RoomJoin 9+), else the list (my SteamID in a room) while the game runs
    const g0raw = mine[0], st = (g0raw && g0raw.status) || {};
    const g0 = st.screen === 'unknown' ? null : g0raw;   // the game has not seen its menu yet: its room 0 says nothing, the list decides
    // the game answered: its word decides (0 = in no room, the list may still show me in one for 30 s); no answer: the list
    const inRoom = g0 ? (st.room ? String(st.room) : '') : p.running && RM.mine ? RM.mine.room : '';
    if (g0 && RM.mine && RM.mine.room !== inRoom) { RM.gone = { room: RM.mine.room, until: Date.now() + 40000 }; RM.mine = null; RJ.here = null; }   // the list is late: not there any more
    if (inRoom === String(room)) { RJ.here = { room: RJ.room, name: RJ.name, ts: Date.now() }; rjShow(t('rjInLobby', { name: RJ.name }), 'ok'); roomsLoad(); return; }
    if (inRoom && !leave) {                                         // 1.4.10 (siritos 05.11): offer to switch, the host warned
      const cur = roomById(inRoom), a = (cur && cur.name) || t('rjCurLobby');
      if (st.proto != null && st.proto < 2) { rjShow(t('rjSwitchOld', { a }), 'err'); return; }   // RoomJoin 10 and older can't leave
      const ok = await askBox(t('rjSwitchAsk'), [t('rjSwitchText', { a, b: RJ.name }), roomIHost(cur) ? t('rjSwitchHost') : ''],
        [{ label: t('rjSwitchGo'), cls: roomIHost(cur) ? 'red' : 'gold', val: 1 }, { label: t('rjCancel'), val: 0 }]);
      if (!ok) return;
      leave = true;
    }
    let wait = 0;
    if (!mine.length) {
      if (p.running && !p.young) { rjShow(t('rjNoPipe'), 'err'); return; }      // the heartbeat: a running game without the pipe
      if (p.running) { wait = 90; rjShow(t('rjWaitGame'), '', true); }          // just started: its add-ons are not in yet
      else {
        wait = 240; rjShow(t('rjStarting', { name: RJ.name }), '', true);
        // 1.4.11: the game of the lobby - vanilla for a vanilla one, Elite for an Elite one
        if ((want === 'vanilla') !== VAN()) { try { S = await invoke('set_game_mode', { mode: want }); render(); } catch (e) { /* the chosen game then */ } }
        doPlay(false);   // the add-ons synced first, then the game
      }
    }
    await invoke('room_join', { id: room, name: RJ.name, wait, leave: !!leave, game: want, seat: RJ.seat || null });
  } catch (e) { rjShow(errText(e), 'err'); }
}
listen('room_join', e => {
  const v = e.payload || {}; const name = RJ.name;
  if (v.room && String(v.room) !== RJ.room) return;
  switch (v.ev) {
    case 'waiting_game': rjShow(t('rjWaitGame'), '', true); break;
    case 'accepted': rjShow(t('rjAccepted', { name }), '', true); break;
    case 'walking': rjShow(t('rjWalking'), '', true); break;
    case 'leaving': rjShow(t('rjLeaving', { name }), '', true); break;
    case 'joining': rjShow(t('rjJoining', { name }), '', true); break;
    case 'in_lobby': rjShow(t(v.as === 'obs' ? 'rjInLobbyObs' : 'rjInLobby', { name }), 'ok'); RJ.here = { room: RJ.room, name, ts: Date.now() }; roomsLoad(); break;
    case 'failed': {
      // 1.6.13: an observer's join needs RoomJoin 14+ - the game has an older one (its status line): nothing was sent
      if (v.reason === 'old_addon') { const a = { id: RJ.room, name, want: RJ.want, seat: RJ.seat }; rjShow(t('rjCancelled'), 'ok');
        naOld('roomjoin', 'na_roomjoin_obs', v.need || '14', v.have, () => roomJoin(a.id, a.name, null, false, a.want, a.seat)); break; }
      if (v.reason === 'no_pipe') { rjShow(t('rjNoPipe'), 'err'); break; }
      if (v.reason === 'wrong_game') { rjWrongGame(RJ.room, name, RJ.want || 'elite'); break; }
      const why = T[lang]['rjWhy_' + v.reason] || T.en['rjWhy_' + v.reason] ? t('rjWhy_' + v.reason) : t('rjWhy_error');
      // 1.4.13: no answer from the room while our game servers carry the games - say which ticks to try without
      const relays = (S.components || []).filter(c => /^relay(_r\d+|_fwd)?$/.test(String(c.id)) && c.enabled && (!VAN() || c.vanilla_ok));
      const hint = (v.reason === 'timeout' || v.reason === 'no_answer') && relays.length ? ' ' + t('rjHintRelay', { list: relays.map(c => '«' + (L(c.name) || c.id) + '»').join(', ') }) : '';
      const msg = t('rjFailed', { name, why }) + (v.text ? ' (' + v.text + ')' : '');
      // 1.6.16 (owner 16.11.2026): a failed join is the red strip on top (it was a small window and a line over the list)
      rjShow(msg + hint, v.reason === 'cancelled' ? 'ok' : 'err');
      break; }
  }
});
$('rjCancel').onclick = async () => { RJ.after = null; await invoke('room_join_cancel').catch(() => {}); rjShow(t('rjCancelled'), 'ok'); };
// elite://join/<id>?name=... (the ladder site's Join): the Lobbies tab and the same Join, if the add-on is on
async function roomLink() {
  if (!S) return;                                     // the window takes it once its status is there (below)
  const l = await invoke('room_link_take').catch(() => null); if (!l) return;
  const tab = document.querySelector('.tab[data-view="rooms"]'); if (tab) tab.click();
  if (S.os !== 'windows' && S.os !== 'linux') { rjShow(t('rjOnlyWin'), 'err'); return; }
  // 1.4.11: the lobby's game - the link's own word, else the room in the list (a vanilla lobby opens vanilla)
  let game = l.game;
  if (!game) { try { const d = await invoke('rooms_live'); RM.last = d.rooms || RM.last; } catch (e) { /* the last list then */ } game = roomGame(roomById(l.id)); }
  roomJoin(l.id, l.name, null, false, game);
}
listen('room_link', roomLink);
function roomsWatch() {
  clearInterval(RM.timer); RM.timer = 0;
  // 1.6.11: on Home too - its list of the open lobbies (hlobby.js)
  const shown = id => $(id) && !$(id).classList.contains('hidden');
  if (shown('rooms') || shown('home')) { roomsLoad(); RM.timer = setInterval(() => { if (!document.hidden) roomsLoad(); }, 15000); }
}
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', roomsWatch));

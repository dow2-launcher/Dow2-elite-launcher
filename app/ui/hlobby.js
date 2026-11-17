// 1.6.11 (owner 14.11.2026): the open lobbies on Home instead of the news (the news: (i) after the version, notes.js).
// Short cards: the name over the whole width, under it the marks (launcher / vanilla, the mode, a version that is not yours),
// both teams, at the bottom the observers and Watch / Join - the same calls as the Lobbies tab. A running match is no open
// lobby: not shown. No map name and no "3/4" (the seats are in the teams). A click on a card opens the Lobbies tab, scrolls to
// that lobby and lights it until the mouse comes to it (or to the tab's menu). The data: LR.list (the launcher's lobbies,
// lroom.js) and RM.last (the game's, app.js roomsLoad - polled on Home too since 1.6.11).
Object.assign(T.en, { lrFullTip: 'The lobby is full: no free seat', hlAll: 'All ›', hlOpen: '{n} open', hlNone: 'No open lobbies right now', hlNoneHint: 'A new one shows up here as soon as somebody opens it', hlCard: '{name}: open in the Lobbies tab', hlTipH: '{h} h played' });
Object.assign(T.ru, { lrFullTip: 'Лобби заполнено: свободных мест нет', hlAll: 'Все ›', hlOpen: '{n} открыто', hlNone: 'Сейчас открытых лобби нет', hlNoneHint: 'Как только кто-то откроет лобби, оно появится здесь', hlCard: '{name}: открыть во вкладке «Лобби»', hlTipH: '{h} ч в игре' });
Object.assign(T.es, { lrFullTip: 'La sala está llena: no hay plazas libres', hlAll: 'Todas ›', hlOpen: '{n} abiertas', hlNone: 'Ahora no hay salas abiertas', hlNoneHint: 'En cuanto alguien abra una, aparecerá aquí', hlCard: '{name}: abrir en la pestaña Salas', hlTipH: '{h} h jugadas' });
Object.assign(T.fr, { lrFullTip: 'Le salon est plein : aucune place libre', hlAll: 'Tous ›', hlOpen: '{n} ouverts', hlNone: 'Aucun salon ouvert pour le moment', hlNoneHint: 'Dès que quelqu\'un en ouvre un, il apparaît ici', hlCard: '{name} : ouvrir dans l\'onglet Salons', hlTipH: '{h} h de jeu' });
Object.assign(T.de, { lrFullTip: 'Der Raum ist voll: kein freier Platz', hlAll: 'Alle ›', hlOpen: '{n} offen', hlNone: 'Gerade keine offenen Räume', hlNoneHint: 'Sobald jemand einen öffnet, erscheint er hier', hlCard: '{name}: im Tab Räume öffnen', hlTipH: '{h} Std. gespielt' });

const HL = { lit: '', soon: 0 };
const HL_EYE = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
// a player's row; the second team mirrored (as on the tab's cards). 1.6.13 (siritos fb 1210): the name's micro tooltip on Home
// carries the rating too (a narrow card has no room for it) and the hours played when the server sends them (hours / playtime_h).
// 1.6.20: the tip is the player's tip of rating.js (the picked system whole), the number the lobby's mode's; the warboss / nobs
const hlHours = p => { const h = p && (p.hours != null ? p.hours : p.playtime_h); return h != null && isFinite(h) && h > 0 ? Math.round(h) : 0; };
const hlRow = (pic, p, mode, host, hours) => `<div class="rp hl-p${host ? ' host' : ''}"${p.steam ? rtTipAttr(p.steam, p.name, p.rating, hours) : ` data-tip="${esc(p.name || '?')}"`}>`
  + `${pic}${rtName(`<span class="nm">${esc(p.name || '?')}</span>`, p.steam)}${rtCell(p.steam, mode, p.rating)}</div>`;
const hlFree = () => `<div class="rp hl-p free"><i class="sk"></i><span class="nm">${esc(t('roomsFree'))}</span></div>`;
const hlTeams = (a, b) => `<div class="hl-teams"><div class="hl-team">${a}</div><div class="hl-team r">${b}</div></div>`;
function hlCard(o) {   // o: {kind, id, name, map, mm, lock, tags, teams, obs, acts, dim}
  return `<div class="hl-c${o.dim ? ' dim' : ''}" tabindex="0" role="button" data-kind="${o.kind}" data-id="${esc(o.id)}" aria-label="${esc(t('hlCard', { name: o.name }))}">`
    + `<div class="hl-h"><i class="hl-mm"${o.mm ? ` style="--mm:url('${esc(o.mm)}')"` : ''} title="${esc(o.map || '')}"></i><div class="hl-hb"><div class="hl-n"><b>${esc(o.name || '—')}</b>${o.lock ? `<span class="hl-lock">${ico('lock')}</span>` : ''}</div>`
    + `<div class="hl-tags">${o.tags}</div></div></div>${o.teams}`
    + (o.obs || o.acts ? `<div class="hl-f">${o.obs ? `<div class="hl-obs">${HL_EYE}<span>${esc(o.obs)}</span></div>` : '<span></span>'}<div class="hl-acts">${o.acts}</div></div>` : '') + '</div>';
}
// a launcher lobby (lroom.js lrCardHtml, short)
function hlLr(x) {
  const A = lrAssets(), mine = LR.room && LR.room.id === x.id && lrMine(LR.room), free = (x.cap || 0) - (x.players || 0);
  const vok = x.game === 'vanilla' ? !!(S && S.vanilla_offered) : !x.ver || !S || !/^\d/.test(S.installed_version || '') || verSame(x.ver, S.installed_version);
  const pic = p => !p.race || p.race === 'random' ? raceImg('random') : p.hero >= 0
    ? `<img src="${A}heroes/${esc(p.race)}_${p.hero | 0}.png" alt="" data-fb="${A}races/${esc(p.race)}.png">` : raceImg(p.race);
  const per = Math.max(1, Math.round((x.cap || 2) / 2)), sl = Array.isArray(x.slots) && x.slots.length ? x.slots : null;
  const team = k => sl.slice(k * per, k * per + per).map(p => p ? hlRow(pic(p), p, x.mode, p.steam === x.owner, hlHours(p) || hlHours(onUser(p.steam))) : hlFree()).join('');
  const oc = x.obs_cap != null ? x.obs_cap : Math.max(0, 8 - (x.cap || 2)), on = (x.obs || []).length;
  // 1.6.20 (owner 17.11.2026): a full lobby keeps Join, dimmed and not pressable (rooms.js roomFullBtn); its eye stays
  const acts = mine ? `<span class="tag here">${esc(t('roomsHere'))}</span>`
    : (on < oc ? `<button class="hl-eye" data-lr-watch="${esc(x.id)}" data-tip="${esc(t('lrWatchJoin', { n: on, m: oc }))}" aria-label="${esc(t('lrWatchJoin', { n: on, m: oc }))}">${HL_EYE}</button>` : '')
      + (free <= 0 ? roomFullBtn('rjoin') : `<button class="rjoin${vok ? ' go' : ''}" data-lr-join="${esc(x.id)}" data-tip="${esc(t('rJoinTip', { name: x.name }))}" aria-label="${esc(t('rJoinTip', { name: x.name }))}">${ico('enter')}</button>`);
  return hlCard({ kind: 'lr', id: x.id, name: x.name, map: x.map_name || x.map, mm: `${A}maps/${encodeURIComponent(x.map || '')}.png`, dim: !vok,
    // 1.6.13 (siritos fb 1210): on Home every mark at the top, by the mode - the version (always, not only another one) and the launcher's
    tags: `<span class="tag">${esc(x.mode || '')}</span>` + (x.game === 'vanilla' ? `<span class="tag van">${esc(t('roomsVan'))}</span>` : `<span class="tag ver">Elite${x.ver ? ' ' + esc(x.ver) : ''}</span>`)
      + `<span class="tag lr">${esc(t('rTagLr'))}</span>`,
    teams: sl ? hlTeams(team(0), team(1)) : `<div class="hl-names">${esc((x.names || []).join(', '))}</div>`,
    obs: (x.obs || []).map(o => o.name).join(', '), acts });
}
// a lobby of the game (app.js roomCard, short)
function hlGame(r) {
  const A = (RM.host || siteBase()) + '/elite/assets/';
  const why = r.game === 'elite' ? roomJoinWhy(r) : '', vok = r.game === 'elite' ? !why : r.game === 'vanilla' ? !!(S && S.vanilla_offered) : false;
  const cap = r.cap || (((r.map || '').match(/^(\d)p_/) || [])[1] | 0) || 0, per = cap ? Math.max(1, Math.round(cap / 2)) : 0;
  const isObs = p => p.observer || !(p.team === 0 || p.team === 1 || p.team == null);
  // the race and the hero come from the server's list: escaped, the hero a number
  const pic = p => { if (!p.race) return raceImg('random'); const r = esc(p.race), h = p.hero != null ? '_' + (p.hero | 0) : null;
    return `<img${h != null ? '' : ' class="race"'} src="${esc(A)}${h != null ? 'heroes/' + r + h : 'races/' + r}.png" alt="" data-fb="${esc(A)}races/${r}.png">`; };
  const team = tm => { const ps = (r.players || []).filter(p => !isObs(p) && (p.team | 0) === tm);
    return ps.map(p => hlRow(pic(p), p, r.mode, p.host, hlHours(p) || hlHours(onUser(p.steam)))).join('') + Array(per ? Math.max(0, per - ps.length) : 0).fill(hlFree()).join(''); };
  const obsP = (r.players || []).filter(isObs), nObs = Math.max(r.observers | 0, obsP.length);
  const full = r.free != null ? r.free <= 0 : false, here = RM.mine && String(RM.mine.room) === String(r.id);
  // 1.6.13 (siritos fb 1210): Join whether "Lobby join" is on or not (the click asks for it), the eye - into the lobby as an observer
  const acts = here ? `<span class="tag here">${esc(t('roomsHere'))}</span>`
    : (r.game === 'elite' || r.game === 'vanilla') && roomJoinSys() && !r.password && r.id
      ? roomObsBtn(r, 'hl-eye') + (!full ? `<button class="rjoin go${meBusy() ? ' wait' : ''}" data-room="${esc(String(r.id))}" data-name="${esc(r.name || '')}" data-tip="${esc(meBusy() ? t('roomsJoinBusy') : t('rJoinTip', { name: r.name || '' }))}" aria-label="${esc(t('roomsJoin'))}">${ico('enter')}</button>` : roomFullBtn('rjoin')) : '';
  return hlCard({ kind: 'game', id: String(r.id || ''), name: r.name, map: r.map_title || String(r.map || '').replace(/^\d+p_/i, '').replace(/_/g, ' '), mm: r.minimap ? A + r.minimap : '', lock: r.password, dim: !vok,
    // 1.6.13: the mode, then the version always (Elite x.y / vanilla / another mod), all at the top
    tags: (r.mode ? `<span class="tag">${esc(r.mode)}</span>` : '')
      + (r.game === 'vanilla' ? `<span class="tag van">${esc(t('roomsVan'))}</span>` : r.game === 'other' ? `<span class="tag oth">${esc(t('roomsOther'))}</span>`
        : r.game === 'elite' ? `<span class="tag ver">Elite${r.exact && r.version ? ' ' + esc(r.version) : ''}</span>` : ''),
    teams: hlTeams(team(0), team(1)), obs: obsP.length ? obsP.map(p => p.name).join(', ') + (nObs > obsP.length ? ` +${nObs - obsP.length}` : '') : nObs ? String(nObs) : '', acts });
}
function hlRender() {
  const box = $('hlList'); if (!box || !S) return;
  const lrs = (LR.list || []).filter(x => x.state === 'lobby' || x.state === 'countdown'), games = RM.last || [];
  const n = lrs.length + games.length;
  $('hlN').textContent = n ? t('hlOpen', { n }) : '';
  // 1.6.16 (owner 16.11.2026): no lobby - a sigil of battle in the block's middle with interference (as the Replays' empty pane),
  // no plate, no Create button. 1.6.17: always Catachan's (1.6.16 picked one of five at the start); drawn once while empty
  box.classList.toggle('empty', !n);
  if (!n) {
    if (!box.querySelector('.zero')) box.innerHTML = zeroPane('s-battle', t('hlNone'), t('hlNoneHint'));
    return;
  }
  box.innerHTML = lrs.map(hlLr).join('') + games.map(hlGame).join('');
  box.querySelectorAll('img[data-fb]').forEach(i => i.onerror = () => { i.onerror = null; i.src = i.dataset.fb; });
  box.querySelectorAll('[data-lr-join]').forEach(b => b.onclick = e => { e.stopPropagation(); lrCall('join', { id: b.dataset.lrJoin }); });
  box.querySelectorAll('[data-lr-watch]').forEach(b => b.onclick = e => { e.stopPropagation(); lrCall('join', { id: b.dataset.lrWatch, as: 'obs' }); });
  box.querySelectorAll('[data-room]').forEach(b => b.onclick = e => { e.stopPropagation(); roomTry(b.dataset.room, b.dataset.name, b); });
  box.querySelectorAll('[data-obs]').forEach(b => b.onclick = e => { e.stopPropagation(); roomObs(b.dataset.obs, b.dataset.name, b); });
  box.querySelectorAll('.hl-c').forEach(c => {
    c.onclick = () => hlGo(c.dataset.kind, c.dataset.id);
    c.onkeydown = e => { if (e.target === c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); hlGo(c.dataset.kind, c.dataset.id); } };
  });
}
// the Lobbies tab with that lobby lit
function hlGo(kind, id) {
  const tab = document.querySelector('.tab[data-view="rooms"]'); if (tab) tab.click();
  if (typeof RV !== 'undefined' && RV.view !== 'open') rShow('open');
  if (!kind) return;
  HL.lit = kind + ':' + id; hlLit();
  const c = document.querySelector(`#rCards .room[data-kind="${kind}"][data-id="${CSS.escape(id)}"]`);
  if (c) setTimeout(() => c.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60);
  clearTimeout(HL.soon);
  HL.soon = setTimeout(() => {   // the mouse that clicked is still somewhere: armed a moment later
    const off = () => { HL.lit = ''; hlLit(); };
    document.querySelectorAll('#rCards .room').forEach(x => x.addEventListener('mouseenter', off, { once: true }));
    const nav = document.querySelector('#rooms .rnav'); if (nav) nav.addEventListener('mouseenter', off, { once: true });
  }, 700);
}
function hlLit() { document.querySelectorAll('#rCards .room').forEach(c => c.classList.toggle('hl-lit', !!HL.lit && `${c.dataset.kind}:${c.dataset.id}` === HL.lit)); }
// the tab's lists are re-rendered on every change of the lobbies: Home's list and the light follow them
['lrList', 'roomsList'].forEach(id => { const e = $(id); if (e) new MutationObserver(() => { hlRender(); if (HL.lit) hlLit(); }).observe(e, { childList: true }); });
$('hlAll').onclick = () => hlGo();
// Home is the first page: the game's lobbies polled from the start (app.js roomsWatch, once the status is there)
(function hlStart() { if (S) { roomsWatch(); hlRender(); } else setTimeout(hlStart, 500); })();

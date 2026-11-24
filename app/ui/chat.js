// The players' chat, the Steam sign-in and the player's card (the ladder's /ladder/api/c/*).
// Split out of app.js (1.6.17), its section as it was; app.js keeps the core (the status, render, the add-ons, the update).
'use strict';
// ---------- players' chat, Steam sign-in and the player's card (ladder service /ladder/api/c/*) ----------
// Rooms General / RU / EN (the server's all / ru / en) next to the developers' chat.
// 1.6.11: the chat's header (the language menu, Logs) and Online's links - here, the first render needs them
Object.assign(T.en, { lnkElite: 'Discord Elite', lnkDiscord: 'Discord DoW2', lnkStats: 'Player stats', lnkLadder: 'Ladder: the Elite rating table', chLang: 'Language of the messages', chLangH: 'Show the messages', chOrigShort: 'Orig.', chAsWritten: 'as written', chTranslated: 'translated', logsShort: 'Logs' });
Object.assign(T.ru, { lnkElite: 'Discord Elite', lnkDiscord: 'Discord DoW2', lnkStats: 'Статистика игроков', lnkLadder: 'Ладдер: таблица рейтинга Elite', chLang: 'Язык сообщений', chLangH: 'Показывать сообщения', chOrigShort: 'Ориг.', chAsWritten: 'как написали', chTranslated: 'перевод', logsShort: 'Логи' });
Object.assign(T.es, { lnkElite: 'Discord de Elite', lnkDiscord: 'Discord DoW2', lnkStats: 'Estadísticas de jugadores', lnkLadder: 'Ladder: tabla del rating Elite', chLang: 'Idioma de los mensajes', chLangH: 'Mostrar los mensajes', chOrigShort: 'Orig.', chAsWritten: 'tal como se escribió', chTranslated: 'traducido', logsShort: 'Registros' });
Object.assign(T.fr, { lnkElite: 'Discord d\'Elite', lnkDiscord: 'Discord DoW2', lnkStats: 'Statistiques des joueurs', lnkLadder: 'Ladder : tableau du classement Elite', chLang: 'Langue des messages', chLangH: 'Afficher les messages', chOrigShort: 'Orig.', chAsWritten: 'tel qu\'écrit', chTranslated: 'traduit', logsShort: 'Journaux' });
Object.assign(T.de, { lnkElite: 'Elite-Discord', lnkDiscord: 'Discord DoW2', lnkStats: 'Spielerstatistiken', lnkLadder: 'Ladder: Tabelle der Elite-Wertung', chLang: 'Sprache der Nachrichten', chLangH: 'Nachrichten anzeigen', chOrigShort: 'Orig.', chAsWritten: 'wie geschrieben', chTranslated: 'übersetzt', logsShort: 'Logs' });
// 1.6.32: the tray icon's tip while its yellow dot says a mention of me waits unseen (chMark)
Object.assign(T.en, { trayMention: 'DoW Launcher - you were mentioned in the chat' });
Object.assign(T.ru, { trayMention: 'DoW Launcher — вас упомянули в чате' });
Object.assign(T.es, { trayMention: 'DoW Launcher: te mencionaron en el chat' });
Object.assign(T.fr, { trayMention: 'DoW Launcher : on vous a mentionné dans le chat' });
Object.assign(T.de, { trayMention: 'DoW Launcher – du wurdest im Chat erwähnt' });
// 1.6.11 (owner 14.11.2026): one players' tab (General) - RU / EN are the language of its messages (a menu, the original by
// default: CH.lang), the developers' tab apart on the right
const CH = { room: 'all', lang: 'all', msgs: {}, out: [], unread: {}, full: {}, me: null, prof: null, waiting: false, features: [], replyTo: null, lobby: false };
try { CH.lang = localStorage.getItem('chLang') || 'all'; CH.room = localStorage.getItem('chRoom') === 'dev' ? 'dev' : CH.lang; } catch (e) {}
// 1.6.17 (owner 16.11.2026): CH.lobby - the "Lobby" tab (my lobby's chat, lchat.js) right after General while I am in a lobby; the
// language switch is General's and the Lobby's both
function chShowRoom() {
  document.querySelectorAll('.ch-tab').forEach(b => b.classList.toggle('on', b.dataset.room === 'lobby' ? !!CH.lobby : !CH.lobby && (b.dataset.room === 'dev') === (CH.room === 'dev')));
  $('chLangCur').textContent = CH.lang === 'all' ? '' : CH.lang.toUpperCase();   // 1.6.32: the globe; a translation shows its language on it
  $('chLangBtn').classList.toggle('tr', CH.lang !== 'all');
  $('chLangBtn').parentElement.classList.toggle('off', CH.room === 'dev' && !CH.lobby);
  document.querySelectorAll('#chLangMenu [data-lang]').forEach(b => { b.classList.toggle('on', b.dataset.lang === CH.lang); b.setAttribute('aria-checked', String(b.dataset.lang === CH.lang)); });
  $('chatPane').classList.toggle('hidden', CH.room === 'dev' || !!CH.lobby);
  $('devPane').classList.toggle('hidden', CH.room !== 'dev' || !!CH.lobby);
  $('lobbyPane').classList.toggle('hidden', !CH.lobby);
  if (CH.room !== 'dev' && !CH.lobby) { CH.chatRoom = CH.room; CH.unread[chKey(CH.room)] = 0; chRender(true); if (!CH.msgs[chKey(CH.room)]) chLoad(chKey(CH.room)); }
  if (typeof lcPaint === 'function') { lcPaint(true); if (CH.lobby) lcStick(LC.home); }   // the lobby's chat in the language picked
  chUnread(); FB.open = CH.room === 'dev' && !CH.lobby; fbWatch(); CH.dirty = false; chMarkCheck();
  chReplyBar();   // 1.6.3: the Reply strip only over the chat's own input
}
// 1.5.0: the profile is a plate in the header (the online dot, the name); a click opens its menu - the avatar, the name with the
// sign-out icon on its line, my stats, my Steam profile. Signed out - the Steam button in the header; waiting for the browser - a
// line and Cancel.
// 1.6.20 (owner 17.11.2026, before the Elite rating): no rating on the plate (three of them, which one?); in the menu under the
// name the rating system's tick (Elite / Relic, rating.js - no settings page for it), under the line the picked system whole:
// Elite - every mode with its number and place, the calibration as 2/5, a dash without games (the statistics are the site's);
// Relic - its one number. My stats and Steam side by side; my badges of the Elite table's top three by my name.
function chMeRatings(me) {
  if (!rtElite()) {
    const r = (CH.prof || {}).rating || (LIVE.users[me.steam] || {}).rating;
    return `<div class="me-rts"><div class="me-rh"><span>${esc(t('rtRelic'))}</span></div>`
      + `<div class="me-rr relic"><span class="v">${r ? Number(r) | 0 : '—'}</span><small>${esc(t('rtRelicNote'))}</small></div></div>`;
  }
  // 1.6.20 (owner 17.11.2026): an (i) by the season - the page about the rating and its (pre)season (rating.js rtInfoUrl)
  const head = `<div class="me-rh"><span>${esc(t('rtElite'))}${RT.own ? ' · ' + esc(rtSeasonName()) : ''}`
    + `<button class="me-ri" id="meInfo" data-tip="${esc(t('rtInfoT'))}" aria-label="${esc(t('rtInfoT'))}">${ico('info')}</button></span>`
    + `<button class="link-btn" id="meTable" data-tip="${esc(t('rtTableT'))}">${esc(t('rtTable'))}</button></div>`;
  if (!RT.own) return `<div class="me-rts">${head}<div class="me-rr off">${esc(t(RT.err ? 'rtOff' : 'rtWait'))}</div></div>`;
  const k = RT.own.cal_games || 5;
  // a mode: its number and my place; otherwise its calibration - skulls and "2/5" (0/5 without games, 1.6.26). No games / wins otherwise (owner
  // 17.11.2026: the statistics are the site's - "Table ›" and My stats)
  const rows = RT_MODES.map(m => {
    const e = rtOwn(me.steam, m);
    // 1.6.20 (SirItos): a mode's row opens my page on the site in that mode (rating.js data-rtp)
    const go = ` data-rtp="${esc(me.steam)}" data-rtm="${m}" data-tip="${esc(t('rtMineT'))}"`;
    if (e && e.c != null) return `<div class="me-rr go"${go}><b>${m}</b><span class="v">${e.c}</span><span class="pl">${esc(t('rtPlace', { n: e.rank }))}</span><span class="g"></span></div>`;
    // SirItos 17.11.2026: the calibration as skulls (played bright) and k/5 - the words in the tip.
    // 1.6.26 (SirItos 18.11.2026): always - a mode without my data (no games yet, not in the table) is its calibration at 0/k,
    // not a dash; the tips in the online block stay as they are
    { const g = Math.min((e && e.g) || 0, k);
      return `<div class="me-rr cal go" data-rtp="${esc(me.steam)}" data-rtm="${m}" data-tip="${esc(t('rtCal', { g, k }) + '\n' + t('rtMineT'))}"><b>${m}</b><span class="c"><span class="csks" aria-hidden="true">${Array.from({ length: k }, (_, i) => `<i class="csk${i < g ? ' on' : ''}"></i>`).join('')}</span>${g}/${k}</span><span class="g"></span></div>`; }
  }).join('');
  // 1.6.20 (SirItos 17.11.2026): under the modes - the rules ("Table ›" is in the head; a mode's row opens my page - no "My matches",
  // the match history is not the launcher's business)
  const links = `<div class="me-rl"><button class="link-btn" id="meRules" data-tip="${esc(t('rtRulesT'))}">${esc(t('rtRules'))}</button></div>`;
  return `<div class="me-rts">${head}${rows}${links}</div>`;
}
function chMe() {
  diagNameFromProfile();
  const me = CH.me && CH.me.signed_in ? CH.me : null, plate = $('mePlate'), box = $('meBox');
  $('hdrMe').classList.toggle('hidden', !CH.me || CH.me.configured === false);
  if (me) {
    plate.innerHTML = `<button class="me-chip" id="meChip" aria-haspopup="menu" aria-expanded="${!box.classList.contains('hidden')}"><i class="me-dot"></i>`
      + `<span class="me-nr">${fmSeal(me.steam, me.name)}<span class="me-n">${esc(me.name || me.steam)}</span>${rtBadge(me.steam)}</span><b class="chev"></b></button>`;
    box.innerHTML = `<div class="me-head">${avatar(me.avatar, 'me-av')}<div class="me-info"><div class="me-top">${fmSeal(me.steam, me.name)}<span class="me-name${String(me.name || me.steam).length > 14 ? ' long' : ''}">${esc(me.name || me.steam)}</span>`
      + `${rtBadge(me.steam)}<button class="me-out" id="chOut" data-tip="${esc(t('chLogout'))}" aria-label="${esc(t('chLogout'))}">${ico('out')}</button></div>`
      + `<label class="chk me-sys" data-tip="${esc(t('rtUseT'))}"><input type="checkbox" id="meSys"${rtElite() ? ' checked' : ''}><span>${esc(t('rtUse'))}</span></label></div></div>`
      + chMeRatings(me)
      + `<div class="me-acts"><button class="me-item" id="meStats" role="menuitem">${ico('bars')}<span>${esc(t('myStats'))}</span></button>`
      + `<button class="me-item" id="meSteam" role="menuitem">${ico('steam')}<span>${esc(t('nickSteam'))}</span></button></div>`;
    $('meChip').onclick = e => { e.stopPropagation(); box.classList.toggle('hidden'); $('meChip').setAttribute('aria-expanded', String(!box.classList.contains('hidden'))); };
    $('chOut').onclick = () => { box.classList.add('hidden'); chLogout(); };
    // the menu stays open, its block redrawn - after the click is through (a redraw inside it would take the clicked tick out of
    // the page, and the click outside the menu below would close it)
    $('meSys').onchange = e => { const on = e.target.checked; setTimeout(() => rtSet(on ? 'elite' : 'relic')); };
    if ($('meInfo')) $('meInfo').onclick = () => { box.classList.add('hidden'); open(rtInfoUrl()); };
    // 1.6.20 (SirItos): "Table ›" - the site's table in the mode I hold a place in (else 1v1); the rules (rating.js)
    if ($('meTable')) $('meTable').onclick = () => { box.classList.add('hidden'); open(rtTableUrl(RT_MODES.find(m => (rtOwn(me.steam, m) || {}).rank) || '1v1')); };
    if ($('meRules')) $('meRules').onclick = () => { box.classList.add('hidden'); open(rtRulesUrl()); };
    $('meStats').onclick = () => { box.classList.add('hidden'); open(siteUrl('/stats/?q=') + encodeURIComponent(me.steam) + '&lang=' + encodeURIComponent(lang)); };
    $('meSteam').onclick = () => { box.classList.add('hidden'); open('https://steamcommunity.com/profiles/' + me.steam); };
  } else {
    box.classList.add('hidden'); box.innerHTML = '';
    // waiting for the browser: a line and Cancel (a new click on the chat's button opens Steam again)
    plate.innerHTML = CH.waiting ? `<span class="me-wait">${esc(t('chWaitingShort'))}</span><button class="btn small ghost" id="chCancel">${esc(t('chCancel'))}</button>`
      : chInBtn();
    if ($('chIn')) $('chIn').onclick = chLogin;
    if ($('chCancel')) $('chCancel').onclick = () => { invoke('c_login_cancel').catch(() => {}); CH.waiting = false; chMe(); };
  }
  $('chLoginRow').classList.toggle('hidden', !!me);
  $('chSendRow').classList.toggle('hidden', !me);
  if (typeof grpRender === 'function') grpRender();   // 1.6.32: the group shows for a signed-in player (grp.js, a prototype)
}
// 1.6.7: "Sign in as <the Steam name>" - a long name is cut with "…" (the whole line in the tip), the header keeps its room
function chInBtn() {
  const nm = CH.me && CH.me.local_name || '', label = nm ? t('chLoginAs', { name: nm }) : t('chLogin');
  return `<button class="btn gold small me-in" id="chIn"${nm.length > 14 ? ` data-tip="${esc(label)}"` : ''}>${ico('steam')}<span>${esc(label)}</span></button>`;
}
// a click anywhere else closes the profile menu
document.addEventListener('click', e => { const b = $('meBox'); if (b && !b.classList.contains('hidden') && !e.target.closest('#hdrMe')) { b.classList.add('hidden'); const c = $('meChip'); if (c) c.setAttribute('aria-expanded', 'false'); } });
async function chLogin() {
  // the Steam account of this computer first: no browser (the Steam page does not open everywhere)
  let r = null;
  try { r = await invoke('c_login_local'); } catch (e) { r = { error: String(e) }; }
  try { localStorage.removeItem('chNoAuto'); } catch (e) {}
  if (r && r.signed_in) { CH.me = r; CH.waiting = false; chMe(); chHello(); chProfile(); toast(t('chSignedIn', { name: CH.me.name })); return; }
  // then the browser: the button stays live (a new click starts over), Cancel stops the wait
  CH.waiting = true; chMe();
  toast(r && r.need_browser ? t('chNeedBrowser') : r && r.no_steam ? t('chNoSteam') : t('chWaitLogin'));
  try {
    CH.me = await invoke('c_login'); CH.waiting = false; chMe(); chHello(); chProfile();
    toast(t('chSignedIn', { name: CH.me.name }));
  } catch (e) {
    if (String(e) === 'cancelled') return;   // a newer click or Cancel took over
    CH.waiting = false; chMe(); toast(t('chLoginFail') + ' ' + errText(e), true);
  }
}
async function chLogout() { try { localStorage.setItem('chNoAuto', '1'); } catch (e) {} try { CH.me = await invoke('c_logout'); } catch (e) {} CH.prof = null; chMe(); }
async function chProfile() {
  if (!CH.me || !CH.me.signed_in) return;
  try { const d = await invoke('c_api', { path: 'me', body: {} }); if (d.ok) CH.prof = d; } catch (e) { return; }
  chMe();
}
// 1.3.12 (owner): a short beep when someone tags me (@my name) in the chat; Settings: "No sound when someone mentions me"
// 1.6.32 (memory): the audio context sleeps between the beeps (it was woken by every click and kept the sound device busy for good)
let chAudio = null, chAudioNap = 0;
function chBeep() {
  if (S && S.mute_mention) return;
  try {
    chAudio = chAudio || new (window.AudioContext || window.webkitAudioContext)();
    const play = () => {
      const t0 = chAudio.currentTime;
      [[880, 0], [1320, 0.12]].forEach(([f, d]) => {
        const o = chAudio.createOscillator(), g = chAudio.createGain();
        o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(chAudio.destination);
        g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(0.25, t0 + d + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.11); o.start(t0 + d); o.stop(t0 + d + 0.12);
      });
      clearTimeout(chAudioNap); chAudioNap = setTimeout(() => { try { chAudio.suspend(); } catch (e) {} }, 1500);
    };
    if (chAudio.state === 'running') play(); else chAudio.resume().then(play, () => {});
  } catch (e) {}
}
// the first click unlocks the sound for the page (the autoplay rule); the context is made then and put to sleep at once
document.addEventListener('pointerdown', () => { if (chAudio) return; try { chAudio = new (window.AudioContext || window.webkitAudioContext)(); chAudio.suspend(); } catch (e) {} });
// 1.6.32 (owner 24.11.2026): @all tags everybody in the chat - every launcher open counts it as a mention of its player (the sound,
// unless Settings' "no sound when someone mentions me" is on; the tray's dot). A word of its own: "@all," yes, "@allies" no
const CH_ALL = /(^|[^\p{L}\p{N}_])@all(?![\p{L}\p{N}_])/iu;
const chAtAll = html => html.replace(new RegExp(CH_ALL.source, 'giu'), '$1<span class="ch-at me all">@all</span>');
function chMentionsMe(m) {
  const me = CH.me && CH.me.signed_in ? CH.me : null;
  if (!me || !me.name || m.steam === me.steam) return false;
  if (m.reply && !m.reply.deleted && String(m.reply.steam) === String(me.steam)) return true;   // 1.6.3: a reply to me
  const tx = String(chOrig(m) || '');
  return tx.toLowerCase().includes('@' + me.name.toLowerCase()) || CH_ALL.test(tx);
}
// Two kinds of server (siritos 02.11: on the live, older one the tabs changed nothing):
// - the new one (ladder 9f6817f) keeps one common chat: every message carries orig / ru / en, General shows the original,
//   RU and EN its translation - one list ("feed") for all three tabs, the tab only picks the language;
// - the older one has three rooms of their own (all / ru / en) and no translations - a list per tab, as in 1.3.15.
// Which one: the first messages tell (an "orig" field); until then the rooms of their own.
const chKey = room => CH.feed ? 'feed' : (room === 'ru' || room === 'en' ? room : 'all');
const chKeys = () => CH.feed ? ['feed'] : ['all', 'ru', 'en'];
function chFeedSeen(ms) {   // a message with "orig": the new server - the room lists become the one feed
  if (CH.feed || !(ms || []).some(m => m && m.orig !== undefined)) return;
  CH.feed = true;
  const all = [].concat(CH.msgs.all || [], CH.msgs.ru || [], CH.msgs.en || []);
  CH.msgs = {}; CH.full = {};
  chPut('feed', all.filter((m, i) => all.findIndex(x => x.id === m.id) === i));
  CH.unread = {}; chUnread();
}
const chOrig = m => m.orig || m.text;
const chText = m => CH.room === 'ru' ? (m.ru || chOrig(m)) : CH.room === 'en' ? (m.en || chOrig(m)) : chOrig(m);
// live: messages that just came (the stream, or the poll while it is down), not history - a mention of me beeps once (1.3.12)
function chPut(key, ms, live) {   // messages into a list in id order, each once; ours waiting in the queue are confirmed by their cid
  const list = CH.msgs[key] || (CH.msgs[key] = []);
  let changed = false, ping = false;
  CH.pinged = CH.pinged || new Set();
  for (const m of ms) {
    const i = list.findIndex(x => x.id === m.id);
    if (i >= 0) { list[i] = m; continue; }
    let j = list.length; while (j > 0 && list[j - 1].id > m.id) j--;
    list.splice(j, 0, m); changed = true;
    // ours waiting grey in the queue: confirmed by the cid (a new server), by the id the "say" answer gave, or - a server
    // that keeps neither - by our own text sent in the last minute
    const mine = CH.me && CH.me.signed_in && String(m.steam) === String(CH.me.steam);
    const done = o => (m.cid && o.cid === m.cid) || (o.id && o.id === m.id)
      || (o.state === 'sent' && mine && chOrig(m) === o.text && Math.abs((m.ts || 0) - o.ts) < 120);
    if (CH.out.some(done)) { const o = CH.out.find(done); CH.out = CH.out.filter(x => x !== o); chOutSave(); }
    if (live && chMentionsMe(m) && !CH.pinged.has(m.id)) { CH.pinged.add(m.id); ping = true; }
  }
  if (ping) { chBeep(); if (!chSeen()) chMark(true); }
  if (live) chTrim(key);
  return changed;
}
// 1.6.32 (memory, owner 24.11.2026): the chat kept every message it ever got (and every page scrolled up to) and drew all of them
// again for each new one - a launcher left in the tray for days grew without end. The list keeps the last CH_MAX while the reader
// is at the bottom (or not looking); scrolled up, nothing is cut (the history he reads); older ones come back by scrolling up.
const CH_MAX = 300;
function chTrim(key) {
  const list = CH.msgs[key]; if (!list || list.length <= CH_MAX) return;
  const box = $('chMsgs'), shown = chShown() && chKey(CH.room) === key;
  if (shown && box.scrollTop + box.clientHeight < box.scrollHeight - 30) return;
  list.splice(0, list.length - CH_MAX); CH.full[key] = false;
}
// the players' chat on the screen: the window seen, Home open, its General tab (not the lobby's, not the developers')
const chShown = () => !pageHidden() && !$('home').classList.contains('hidden') && !$('chatPane').classList.contains('hidden');
// a new message is drawn when it can be seen; else once the chat shows again (no redraw of the whole list in the tray)
function chRenderSoon() { if (chShown()) { CH.dirty = false; chRender(); } else CH.dirty = true; }
function chFlush() { if (CH.dirty && chShown()) { CH.dirty = false; chRender(); } chMarkCheck(); }
// 1.6.32 (owner 24.11.2026): a mention of me (@my name, a reply to me, @all) I have not seen yet - a yellow dot over the tray's icon
// (lroom tray.rs tray_mark, the news dot's colour); gone once the chat is on the screen with the window in front
const chSeen = () => chShown() && document.hasFocus();
function chMark(on) {
  if (!!CH.mark === on) return; CH.mark = on;
  invoke('tray_mark', { on, tip: on ? t('trayMention') : '' }).catch(() => {});
}
function chMarkCheck() { if (CH.mark && chSeen()) chMark(false); }
// history: the last 100 at start, 100 older when scrolled to the top; after an id while the stream is down
async function chLoad(key, how) {
  // the feed is asked as "all": the server would cut a translated tab at the first message still being translated, here
  // the original shows until its msg_tr comes; a room of its own is asked as itself
  const room = key === 'feed' ? 'all' : key, list = CH.msgs[key] || [];
  const q = how === 'older' ? `limit=100&before=${list[0].id}` : how === 'new' && list.length ? `after=${list[list.length - 1].id}` : 'limit=100';
  let d; try { d = await invoke('c_api', { path: `msgs?room=${room}&${q}` }); } catch (e) { return; }
  chFeatures(d);
  if (!CH.feed && key !== 'feed') { chFeedSeen(d.msgs); if (CH.feed) key = 'feed'; }
  let changed = chPut(key, d.msgs || [], how === 'new');
  if ((d.deleted || []).length) { const n = CH.msgs[key].length; CH.msgs[key] = CH.msgs[key].filter(m => !d.deleted.includes(m.id)); changed = changed || n !== CH.msgs[key].length; }
  if (how === 'older') CH.full[key] = (d.msgs || []).length < 100;
  if ((changed || !CH.shown) && chKey(CH.room) === key) chRender(false, how === 'older');
}
// 1.6.3 (owner 13.11.2026, variant A): Reply - the arrow next to the sender's name and the time, seen on hover (a highlight, no
// frame), only on a server that says it can (hello / msgs: features ["reply"], ladder feat/chat-reply) - an older server keeps
// the chat as it was. The box shows "Reply to <name>: ..." over the input (Esc or x cancels); the message goes with reply_to and
// comes back with the quote of its original (reply: {id, steam, name, text, ru, en} or {id, deleted}); a click on the quote
// scrolls to the original (older pages loaded for it, up to 5) and lights it up. A reply to me counts as a mention.
Object.assign(T.en, { chReply: 'Reply', chReplyTo: 'Reply to', chReplyCancel: 'Cancel the reply (Esc)', chQuoteDel: 'The message was deleted', chQuoteGo: 'Show the message' });
Object.assign(T.ru, { chReply: 'Ответить', chReplyTo: 'Ответ', chReplyCancel: 'Отменить ответ (Esc)', chQuoteDel: 'Сообщение удалено', chQuoteGo: 'Показать сообщение' });
Object.assign(T.es, { chReply: 'Responder', chReplyTo: 'Respuesta a', chReplyCancel: 'Cancelar la respuesta (Esc)', chQuoteDel: 'El mensaje fue borrado', chQuoteGo: 'Mostrar el mensaje' });
Object.assign(T.fr, { chReply: 'Répondre', chReplyTo: 'Réponse à', chReplyCancel: 'Annuler la réponse (Échap)', chQuoteDel: 'Le message a été supprimé', chQuoteGo: 'Afficher le message' });
Object.assign(T.de, { chReply: 'Antworten', chReplyTo: 'Antwort an', chReplyCancel: 'Antwort abbrechen (Esc)', chQuoteDel: 'Die Nachricht wurde gelöscht', chQuoteGo: 'Nachricht zeigen' });
const CH_ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5A5.5 5.5 0 0 1 20 14.5v0A5.5 5.5 0 0 1 14.5 20H12"/></svg>';
function chFeatures(d) {
  if (!d || !Array.isArray(d.features)) return;
  const was = chReplyOn(); CH.features = d.features;
  if (was !== chReplyOn()) { if (!chReplyOn()) CH.replyTo = null; chReplyBar(); if (CH.shown) chRender(); }
}
const chReplyOn = () => (CH.features || []).includes('reply') && !!(CH.me && CH.me.signed_in) && CH.room !== 'dev';
const chQuoteText = q => (CH.room === 'ru' ? q.ru : CH.room === 'en' ? q.en : null) || q.text || '';
function chReplyBar() {
  const b = $('chReply'); if (!b) return;
  const r = chReplyOn() ? CH.replyTo : null;
  b.classList.toggle('hidden', !r);
  if (!r) { b.innerHTML = ''; return; }
  b.innerHTML = `${CH_ARROW}<span class="rb-t">${esc(t('chReplyTo'))} <b>${esc(r.name)}</b>: <span>${esc(r.text)}</span></span>`
    + `<button type="button" id="chReplyX" title="${esc(t('chReplyCancel'))}" aria-label="${esc(t('chReplyCancel'))}">×</button>`;
  $('chReplyX').onclick = () => { CH.replyTo = null; chReplyBar(); $('chText').focus(); };
}
function chReplyStart(id) {
  const m = (CH.msgs[chKey(CH.room)] || []).find(x => String(x.id) === String(id)); if (!m) return;
  CH.replyTo = { id: m.id, name: m.name || '', text: chText(m) };
  chReplyBar(); $('chText').focus();
}
async function chGoto(id) {
  const box = $('chMsgs'), key = chKey(CH.room);
  for (let i = 0; i < 6; i++) {
    const el = box.querySelector(`.ch-m[data-id="${CSS.escape(String(id))}"]`);
    if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); return; }
    const list = CH.msgs[key] || [];
    if (CH.full[key] || !list.length || list[0].id < id) return;   // not in the history any more
    await chLoad(key, 'older');
  }
}
function chRender(force, older) {
  const box = $('chMsgs'), key = chKey(CH.room), list = CH.msgs[key] || [];
  const atEnd = box.scrollTop + box.clientHeight > box.scrollHeight - 30, h0 = box.scrollHeight, top0 = box.scrollTop;
  const time = ts => new Date(ts * 1000).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  // a heading for every day: Today, Yesterday, 29 October (with the year when it is not this one)
  const dayKey = ts => { const d = new Date(ts * 1000); return d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate(); };
  const dayName = ts => {
    const d = new Date(ts * 1000), now = new Date(), y = new Date(now); y.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return t('chToday');
    if (d.toDateString() === y.toDateString()) return t('chYesterday');
    return d.toLocaleDateString(lang, d.getFullYear() === now.getFullYear() ? { day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const me = CH.me && CH.me.signed_in ? CH.me : null, mine = me ? me.steam : '';
  const myName = me ? (me.name || '') : '';
  // @mentions: the names of the players in this room (longest first, so "@Ab Cd" wins over "@Ab"), escaped like the text
  const names = [...new Set(list.map(m => m.name).filter(Boolean))].sort((a, b) => b.length - a.length);
  const mention = html => names.reduce((h, n) => h.split('@' + esc(n)).join(`\u0000${n === myName ? 1 : 0}${esc(n)}\u0001`), html)
    .replace(/\u0000([01])([^\u0001]*)\u0001/g, (_, me, n) => `<span class="ch-at${me === '1' ? ' me' : ''}">@${n}</span>`);
  const mentionAll = html => chAtAll(mention(html));   // 1.6.32: @all
  let prev = null;
  const replyOn = chReplyOn();
  const quote = q => !q ? '' : q.deleted ? `<div class="rq del"><i>${esc(t('chQuoteDel'))}</i></div>`
    : `<div class="rq" data-goto="${esc(String(q.id))}" role="button" tabindex="0" title="${esc(t('chQuoteGo'))}"><b>${esc(q.name || '')}</b><i>${esc(chQuoteText(q))}</i></div>`;
  const row = (m, extra, tail) => {
    const k = dayKey(m.ts), head = k !== prev ? `<div class="ch-day"><span>${esc(dayName(m.ts))}</span></div>` : ''; prev = k;
    const text = chText(m), tr = text !== chOrig(m);   // translated: the original on hover
    const toMe = mine && m.reply && !m.reply.deleted && String(m.reply.steam) === String(mine) && m.steam !== mine;
    const rpl = replyOn && m.id && m.steam !== mine && !extra ? `<button class="rpl" data-reply="${esc(String(m.id))}" title="${esc(t('chReply'))}" aria-label="${esc(t('chReply'))}">${CH_ARROW}</button>` : '';
    return head + `<div class="ch-m ${m.steam === mine ? 'mine' : ''} ${toMe ? 'tome' : ''} ${extra}"${m.id ? ` data-id="${esc(String(m.id))}"` : ''}><span class="ch-av" data-steam="${esc(m.steam)}" data-name="${esc(m.name || '')}">` + avatar(m.avatar) + `</span>`
      + `<div><div class="w">${fmSeal(m.steam, m.name)}<b data-name="${esc(m.name)}" data-steam="${esc(m.steam || '')}"${rtTipAttr(m.steam, m.name)}>${esc(m.name)}</b>${rtBadge(m.steam)}<span title="${esc(new Date(m.ts * 1000).toLocaleString(lang))}">${time(m.ts)}</span>${rpl}${tail}</div>`
      + quote(m.reply)
      + `<div class="tx ${tr ? 'tr' : ''}" ${tr ? `title="${esc(t('chOrig') + ': ' + chOrig(m))}"` : ''}>${linkify(text, p => mentionAll(esc(p)), linkA)}</div></div></div>`;
  };
  const sent = list.map(m => row(m, '', '')).join('');   // first: the day headings run on into the queue
  // ours not confirmed yet stay at the bottom: a clock while sending, "Not sent · Retry · Delete" when it failed
  const quoteOf = id => { const q = id && list.find(x => x.id === id); return q ? { id: q.id, steam: q.steam, name: q.name, text: chOrig(q), ru: q.ru, en: q.en } : null; };
  const out = CH.out.filter(o => chKey(o.room) === key).map(o => row({ ts: o.ts, steam: mine, name: me ? me.name : '', avatar: me ? me.avatar : '', orig: o.text, reply: quoteOf(o.reply_to) }, o.state === 'failed' ? 'failed' : o.state === 'sent' ? '' : 'sending',
    o.state === 'sent' ? '' : o.state === 'failed' ? `<span class="ch-fail">${esc(t('chNotSent'))} · <button data-retry="${esc(o.cid)}">${esc(t('chRetry'))}</button> · <button data-drop="${esc(o.cid)}">${esc(t('chDelete'))}</button></span>`
      : `<span class="ch-wait" title="${esc(t('chSending'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span>`));
  const html = sent + out.join('');
  box.innerHTML = html || `<div class="ch-empty">${esc(t('chEmpty'))}</div>`;
  // the owner's 1.3.6 behaviour stays in the chat: a name tags the player, the avatar opens the Steam profile
  box.querySelectorAll('.ch-av[data-steam]').forEach(a => nickBind(a, a.dataset.steam, a.dataset.name));
  // the chat: a click on a name mentions the player (1.3.6), a right click and the avatar open the player menu
  box.querySelectorAll('b[data-name]').forEach(b => nickBind(b, b.dataset.steam, b.dataset.name, true));
  box.querySelectorAll('[data-retry]').forEach(b => b.onclick = () => { const o = CH.out.find(x => x.cid === b.dataset.retry); if (o) { o.state = 'sending'; o.tries = 0; chOutSave(); chRender(); chPump(); } });
  box.querySelectorAll('[data-drop]').forEach(b => b.onclick = () => { CH.out = CH.out.filter(x => x.cid !== b.dataset.drop); chOutSave(); chRender(); });
  box.querySelectorAll('[data-reply]').forEach(b => b.onclick = () => chReplyStart(b.dataset.reply));
  box.querySelectorAll('.rq[data-goto]').forEach(q => {
    q.onclick = () => chGoto(Number(q.dataset.goto));
    q.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); chGoto(Number(q.dataset.goto)); } };
  });
  if (older) box.scrollTop = box.scrollHeight - h0 + top0;   // older messages added on top: the view stays where it was
  else if (atEnd || force || !CH.shown) box.scrollTop = box.scrollHeight;
  CH.shown = true;
}
function chMention(name) {                                     // a click on a name in the chat tags that player in my message
  const el = $('chText'); if (!el || !name) return;
  const at = '@' + name + ' ', s0 = el.selectionStart ?? el.value.length, s1 = el.selectionEnd ?? s0;
  const before = el.value.slice(0, s0), pre = before && !/\s$/.test(before) ? ' ' : '';
  el.value = before + pre + at + el.value.slice(s1);
  const pos = (before + pre + at).length; el.focus(); el.setSelectionRange(pos, pos);
}
// unread messages on a tab the player is not looking at (RU and EN together: one feed)
function chUnread() {
  // rooms of their own: each tab its own number; one feed: the number on one tab only - the open one, or the last chat
  // tab while the developers' chat is open
  const at = CH.room === 'dev' ? (CH.chatRoom || CH.lang) : CH.room;
  document.querySelectorAll('.ch-tab').forEach(b => {
    if (b.dataset.room === 'lobby') return;                       // the lobby's count: lchat.js lcSignals
    const r = b.dataset.room === 'chat' ? at : b.dataset.room;
    b.dataset.n = r === 'dev' ? '' : CH.feed ? (r === at ? (CH.unread.feed || '') : '') : (CH.unread[chKey(r)] || '');
  });
}
// sending: the message is in the feed at once with a clock, the box is cleared, the button never locks. One sender for
// all, in order; the same cid on every try, so a retry never makes a duplicate. The queue survives a restart.
function chOutSave() {
  try { localStorage.setItem('chOut', JSON.stringify(CH.out.map(({ cid, room, text, ts, state, id, reply_to }) => ({ cid, room, text, ts, state, id, reply_to })))); } catch (e) {}
}
function chSay() {
  if (CH.room === 'dev') return;
  const el = $('chText'), text = el.value.trim(); if (!text) return;
  const cid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  const reply_to = chReplyOn() && CH.replyTo ? CH.replyTo.id : undefined;
  CH.out.push({ cid, room: CH.room, text, ts: Math.floor(Date.now() / 1000), state: 'sending', tries: 0, reply_to });
  CH.replyTo = null; chReplyBar();
  el.value = ''; chOutSave(); chRender(true); chPump();
}
const chSleep = ms => new Promise(r => setTimeout(r, ms));
async function chPump() {
  if (CH.pumping) return; CH.pumping = true;
  try {
    for (let o; (o = CH.out.find(x => x.state === 'sending'));) {
      let r; try { r = await invoke('c_api', { path: 'say', body: { room: o.room, text: o.text, cid: o.cid, ...(o.reply_to ? { reply_to: o.reply_to } : {}) } }); } catch (e) { r = { ok: false, error: String(e), retry: true }; }
      if (!CH.out.includes(o)) continue;                      // deleted, or confirmed by the stream meanwhile
      if (r.ok && r.msg) { CH.out = CH.out.filter(x => x !== o); chPut(chKey(o.room), [r.msg]); }
      else if (r.ok) {
        // accepted, the answer has no message (an older server): the copy is not dropped - it just turns normal at once
        // (siritos 02.11: it blinked out and came back seconds later); the server's copy takes its place quietly
        const me = CH.me || {};
        if (r.id) {
          CH.out = CH.out.filter(x => x !== o);
          chPut(chKey(o.room), [{ id: r.id, room: o.room, steam: me.steam, name: me.name, avatar: me.avatar, text: o.text, orig: o.text, ts: o.ts, cid: o.cid }]);
          chOutSave(); chRender();
          continue;
        }
        o.state = 'sent'; chOutSave(); chRender();
        await chLoad(chKey(o.room), 'new');
        setTimeout(() => { if (CH.out.includes(o) && o.state === 'sent') { CH.out = CH.out.filter(x => x !== o); chOutSave(); chRender(); } }, 300000);
        continue;
      }
      else if (r.retry_after) await chSleep(r.retry_after);    // too fast: wait as long as the server says
      else if (r.retry) {                                      // no answer (network, the 30 s of the check): 3 more tries, then "Not sent"
        o.tries = (o.tries || 0) + 1;
        if (o.tries > 3) o.state = 'failed'; else await chSleep([2000, 5000, 10000][o.tries - 1]);
      } else {                                                 // rejected (moderation, ban, signed out): the text back in the box, why in a toast
        CH.out = CH.out.filter(x => x !== o);
        if (!$('chText').value.trim()) $('chText').value = o.text;
        toast(r.error || 'error', true);
      }
      chOutSave(); chRender();
    }
  } finally { CH.pumping = false; }
}
// stream events of the chat and the own card
function chEvent(ev, d) {
  if (ev === 'msg') {
    chFeedSeen([d]);
    const key = chKey(d.room);
    if (!chPut(key, [d], true)) return;
    if (key !== chKey(CH.room) || CH.room === 'dev' || CH.lobby || pageHidden()) { CH.unread[key] = (CH.unread[key] || 0) + 1; chUnread(); }
    if (key === chKey(CH.room)) chRenderSoon();
  } else if (ev === 'msg_tr') {
    const m = (CH.msgs[chKey(CH.room)] || []).find(x => x.id === d.id);
    if (m) { m.ru = d.ru; m.en = d.en; if (CH.room === 'ru' || CH.room === 'en') chRenderSoon(); }
  } else if (ev === 'msg_del') {
    for (const k of Object.keys(CH.msgs)) {
      CH.msgs[k] = CH.msgs[k].filter(m => m.id !== d.id);
      CH.msgs[k].forEach(m => { if (m.reply && m.reply.id === d.id) m.reply = { id: d.id, deleted: true }; });
    }
    if (CH.replyTo && CH.replyTo.id === d.id) { CH.replyTo = null; chReplyBar(); }
    chRenderSoon();
  } else if (ev === 'reset') { CH.msgs[chKey(d.room)] = []; chLoad(chKey(d.room)); }
  else if (ev === 'me') { CH.prof = { ok: true, rating: d.rating, stats: { games: d.games, wins: d.wins, losses: d.losses } }; chMe(); }
}
// "I'm here" with menu / game: at start and when that changes (the stream itself keeps the presence)
async function chHello() {
  let d; try { d = await invoke('c_api', { path: 'hello', body: { state: S && S.game_running ? 'game' : 'menu' } }); } catch (e) { return; }
  chFeatures(d);
  if (d.signed_in === false && CH.me && CH.me.signed_in) { CH.me = await invoke('c_logout'); CH.prof = null; chMe(); }   // the session is gone on the server
}
// without the stream (not up in 30 s, or down): Online every 15 s and the chat every 5 s while the window is seen
const STREAM = { up: false, timer: null, poll: null, n: 0 };
function streamState(up) {
  STREAM.up = up; clearTimeout(STREAM.timer);
  if (up) { clearInterval(STREAM.poll); STREAM.poll = null; return; }
  STREAM.timer = setTimeout(() => {
    if (STREAM.up || STREAM.poll) return;
    STREAM.poll = setInterval(async () => {
      const n = STREAM.n++;
      // 1.6.32: in the tray - every 30 s "I'm here" and the chat's new messages (a mention, @all too, still beeps and marks the
      // tray's icon), no Online; seen - as before
      if (pageHidden()) { if (n % 6 === 0) { chHello(); chKeys().forEach(k => chLoad(k, 'new')); } return; }
      // without the stream the server does not see that the launcher is open: "I'm here" every 30 s (it forgets in 90)
      if (n % 6 === 0) chHello();
      if (n % 3 === 0) { try { onLive(await liveSnapshot()); } catch (e) { ON.err = true; onRender(); } }
      chKeys().forEach(k => chLoad(k, 'new'));
    }, 5000);
  }, 30000);
}
async function chInit() {
  try { CH.me = await invoke('c_status'); } catch (e) {}
  // the queue of the last run; one already accepted ("sent") is in the history by now - dropped after 10 minutes
  try { CH.out = JSON.parse(localStorage.getItem('chOut') || '[]').map(o => ({ ...o, tries: 0 })).filter(o => o.state !== 'sent' || Date.now() / 1000 - o.ts < 600); } catch (e) {}
  listen('c_ev', e => { const { e: ev, d } = e.payload; onEvent(ev, d); chEvent(ev, d); });
  listen('c_stream', e => { if (e.payload.host) LIVE.host = e.payload.host; streamState(e.payload.up); });   // LIVE.host: where the stream is (always the active host)
  document.querySelectorAll('.ch-tab').forEach(b => b.onclick = () => {
    if (b.dataset.room === 'lobby') { CH.lobby = true; if (CH.room === 'dev') CH.room = CH.lang; chShowRoom(); return; }   // not kept: the lobby passes
    CH.lobby = false; CH.room = b.dataset.room === 'dev' ? 'dev' : CH.lang; try { localStorage.setItem('chRoom', CH.room); } catch (e) {} chShowRoom();
  });
  // the language of the messages: a menu by the players' tab
  // 1.6.20: the tabs' row scrolls sideways in a narrow window, the menu is fixed and placed under its button when it opens
  const lb = $('chLangBtn'), lm = $('chLangMenu'), lmShow = on => {
    lm.classList.toggle('hidden', !on); lb.setAttribute('aria-expanded', String(on));
    // 1.6.32: the globe is the header's last button - the menu's right edge under its right edge
    if (on) { const r = lb.getBoundingClientRect(); lm.style.left = Math.max(8, Math.min(innerWidth - lm.offsetWidth - 8, r.right + 6 - lm.offsetWidth)) + 'px'; lm.style.top = (r.bottom + 6) + 'px'; }
  };
  $('chTabs').parentElement.addEventListener('scroll', () => lmShow(false), { passive: true });
  addEventListener('resize', () => lmShow(false));
  lb.onclick = e => { e.stopPropagation(); lmShow(lm.classList.contains('hidden')); };
  lm.querySelectorAll('[data-lang]').forEach(b => b.onclick = e => {
    e.stopPropagation(); lmShow(false); CH.lang = b.dataset.lang;
    if (CH.room !== 'dev') CH.room = CH.lang;
    try { localStorage.setItem('chLang', CH.lang); localStorage.setItem('chRoom', CH.room); } catch (e2) {}
    chShowRoom();
  });
  document.addEventListener('click', () => lmShow(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') lmShow(false); });
  $('chIn2').onclick = chLogin;
  $('chSend').onclick = chSay;
  $('chText').onkeydown = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chSay(); }
    else if (e.key === 'Escape' && CH.replyTo) { e.preventDefault(); CH.replyTo = null; chReplyBar(); }
  };
  $('chMsgs').onscroll = () => {   // at the top: 100 older ones
    const key = chKey(CH.room), box = $('chMsgs');
    if (box.scrollTop < 40 && !CH.full[key] && !CH.older && (CH.msgs[key] || []).length) { CH.older = true; chLoad(key, 'older').finally(() => { CH.older = false; }); }
  };
  document.addEventListener('visibilitychange', () => { if (!pageHidden()) { CH.unread[chKey(CH.room)] = 0; chUnread(); } chFlush(); });
  addEventListener('focus', chFlush);
  document.addEventListener('viewchange', chFlush);
  chMe(); chShowRoom();
  // signed in by itself with the Steam account of this computer (no button, no browser, quiet on failure);
  // not after the player pressed "Sign out" - until they sign in again by hand
  let noAuto = false; try { noAuto = localStorage.getItem('chNoAuto') === '1'; } catch (e) {}
  if (!(CH.me && CH.me.signed_in) && CH.me && CH.me.local_found && CH.me.configured !== false && !noAuto) {
    try { const r = await invoke('c_login_local'); if (r && r.signed_in) { CH.me = r; chMe(); } } catch (e) {}
  }
  // the stream may already be up: the snapshot, the card and the history are read once here, the rest comes as events
  try { onLive(await liveSnapshot()); } catch (e) { ON.err = true; onRender(); }
  try { streamState(await invoke('c_stream_up')); } catch (e) { streamState(false); }
  chHello(); chProfile();
  chKeys().forEach(k => chLoad(k));
  if (CH.out.some(o => o.state === 'sending')) chPump();
}
chInit();

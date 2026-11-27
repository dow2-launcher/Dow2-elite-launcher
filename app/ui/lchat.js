// The lobby's chat (owner 16.11.2026, launcher 1.6.17): the general chat in a room of its own for the people of my lobby (its
// players and observers) - the same messages (the original or its translation by Home's language switch, the original on hover),
// replies with the quote, @name by a click on a name, the player's menu by a right click. No day headings: a lobby lives 15-20
// minutes. Its feed carries the lobby's own lines too - who came in, left, moved (the ladder sends the kind and the player, the
// words are here). Shown in two places: the lobby's right column (a tab next to "Map and settings") and Home's chat (a "Lobby" tab
// right after General while I am in a lobby). What others wrote while the chat was not in view is counted on those tabs and on
// the header's "Lobbies".
// The feed: "chat" in the room's answers (create / join / get - lroom.js lrSet hands it here), the stream's lroom_msg (a line) and
// lroom_msg_tr (its translation); the room's "cseq" ahead of the last line here - something was missed, the room again (get).
const LC = { id: '', list: [], side: 'conf', readId: -1, unread: 0, reply: null, el: null, home: null, catchT: 0 };
const LC_MAX = 200;
const LC_IN = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>';
const LC_OUT = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>';
// a line of the lobby: [its look, its icon]; the words: lrSys_<kind>
const LC_SYS = { open: ['in', 'crown'], join: ['in', 'in'], join_obs: ['obs', 'eye'], leave: ['out', 'out'], gone: ['out', 'out'], kick: ['out', 'out'],
  to_obs: ['obs', 'eye'], to_seat: ['in', 'in'], host: ['in', 'crown'] };
Object.assign(T.en, { lrTabConf: 'Map and settings', lrTabChat: 'Lobby chat', lrChatPh: 'Message to the lobby… (Enter to send)', lrChatNone: 'No messages yet. Say hi!',
  lrChatNew: 'New messages', lrChatObs: 'observer', lrObsFree: 'Free', lrObsGo: 'Go here', lrObsGoTip: 'Watch the match as an observer: your player seat is freed',
  lrObsYou: 'you', lrObsMe: 'You are an observer. To play, press Sit here on a free team seat.',
  lrSys_open: '— host, the lobby is open', lrSys_join: 'is in the lobby now', lrSys_join_obs: 'is watching as an observer', lrSys_leave: 'is no longer in the lobby',
  lrSys_gone: 'is no longer in the lobby — connection lost', lrSys_kick: 'is no longer in the lobby — removed by the host', lrSys_to_obs: 'is an observer now',
  lrSys_to_seat: 'is in team {team} now', lrSys_host: 'is the lobby host now', n_to_obs: '{who} moved to the observers.',
  e_premod: 'Not sent: the message did not pass moderation. Please rephrase it.', e_too_fast: 'Too fast — wait a second.', e_banned: 'You cannot write in the chat.',
  e_empty: 'The message is empty.', chLobby: 'Lobby', chLobbyTip: 'The chat of your lobby "{name}"' });
Object.assign(T.ru, { lrTabConf: 'Карта и настройки', lrTabChat: 'Чат лобби', lrChatPh: 'Сообщение лобби… (Enter — отправить)', lrChatNone: 'Сообщений пока нет — напишите первым',
  lrChatNew: 'Новые сообщения', lrChatObs: 'наблюдатель', lrObsFree: 'Свободно', lrObsGo: 'Перейти сюда', lrObsGoTip: 'Смотреть матч наблюдателем: ваше место игрока освободится',
  lrObsYou: 'вы', lrObsMe: 'Вы наблюдатель. Чтобы играть — «Сесть сюда» на свободном месте команды.',
  lrSys_open: '— хост, лобби открыто', lrSys_join: 'теперь в лобби', lrSys_join_obs: 'смотрит как наблюдатель', lrSys_leave: 'больше не в лобби',
  lrSys_gone: 'больше не в лобби — нет связи', lrSys_kick: 'больше не в лобби — по решению хоста', lrSys_to_obs: 'теперь наблюдатель',
  lrSys_to_seat: 'теперь в команде {team}', lrSys_host: 'теперь хост лобби', n_to_obs: '{who} перешёл в наблюдатели.',
  e_premod: 'Не отправлено: сообщение не прошло модерацию. Переформулируйте по делу.', e_too_fast: 'Слишком часто — подождите секунду.', e_banned: 'Вам нельзя писать в чат.',
  e_empty: 'Пустое сообщение.', chLobby: 'Лобби', chLobbyTip: 'Чат вашего лобби «{name}»' });
Object.assign(T.es, { lrTabConf: 'Mapa y ajustes', lrTabChat: 'Chat de la sala', lrChatPh: 'Mensaje a la sala… (Enter para enviar)', lrChatNone: 'Aún no hay mensajes. ¡Saluda!',
  lrChatNew: 'Mensajes nuevos', lrChatObs: 'observador', lrObsFree: 'Libre', lrObsGo: 'Ir aquí', lrObsGoTip: 'Ver la partida como observador: tu plaza de jugador queda libre',
  lrObsYou: 'tú', lrObsMe: 'Eres observador. Para jugar, pulsa «Sentarse aquí» en una plaza libre de un equipo.',
  lrSys_open: '— anfitrión, la sala está abierta', lrSys_join: 'ahora está en la sala', lrSys_join_obs: 'mira como observador', lrSys_leave: 'ya no está en la sala',
  lrSys_gone: 'ya no está en la sala: sin conexión', lrSys_kick: 'ya no está en la sala: decisión del anfitrión', lrSys_to_obs: 'ahora es observador',
  lrSys_to_seat: 'ahora está en el equipo {team}', lrSys_host: 'ahora es el anfitrión de la sala', n_to_obs: '{who} pasó a observador.',
  e_premod: 'No enviado: el mensaje no pasó la moderación. Reformúlalo.', e_too_fast: 'Demasiado rápido: espera un segundo.', e_banned: 'No puedes escribir en el chat.',
  e_empty: 'El mensaje está vacío.', chLobby: 'Sala', chLobbyTip: 'El chat de tu sala «{name}»' });
Object.assign(T.fr, { lrTabConf: 'Carte et réglages', lrTabChat: 'Chat du salon', lrChatPh: 'Message au salon… (Entrée pour envoyer)', lrChatNone: 'Pas encore de messages. Dites bonjour !',
  lrChatNew: 'Nouveaux messages', lrChatObs: 'observateur', lrObsFree: 'Libre', lrObsGo: 'Aller ici', lrObsGoTip: 'Regarder la partie en observateur : votre place de joueur se libère',
  lrObsYou: 'vous', lrObsMe: 'Vous êtes observateur. Pour jouer : « S\'asseoir ici » sur une place libre d\'une équipe.',
  lrSys_open: '— hôte, le salon est ouvert', lrSys_join: 'est maintenant dans le salon', lrSys_join_obs: 'regarde en observateur', lrSys_leave: 'n\'est plus dans le salon',
  lrSys_gone: 'n\'est plus dans le salon — connexion perdue', lrSys_kick: 'n\'est plus dans le salon — décision de l\'hôte', lrSys_to_obs: 'est maintenant observateur',
  lrSys_to_seat: 'est maintenant dans l\'équipe {team}', lrSys_host: 'est maintenant l\'hôte du salon', n_to_obs: '{who} est passé en observateur.',
  e_premod: 'Non envoyé : le message n\'a pas passé la modération. Reformulez-le.', e_too_fast: 'Trop rapide — attendez une seconde.', e_banned: 'Vous ne pouvez pas écrire dans le chat.',
  e_empty: 'Le message est vide.', chLobby: 'Salon', chLobbyTip: 'Le chat de votre salon « {name} »' });
Object.assign(T.de, { lrTabConf: 'Karte und Einstellungen', lrTabChat: 'Lobby-Chat', lrChatPh: 'Nachricht an die Lobby… (Enter zum Senden)', lrChatNone: 'Noch keine Nachrichten. Sag hallo!',
  lrChatNew: 'Neue Nachrichten', lrChatObs: 'Zuschauer', lrObsFree: 'Frei', lrObsGo: 'Hierher wechseln', lrObsGoTip: 'Das Spiel als Zuschauer ansehen: dein Spielerplatz wird frei',
  lrObsYou: 'du', lrObsMe: 'Du bist Zuschauer. Zum Spielen: „Hier setzen" auf einem freien Teamplatz.',
  lrSys_open: '— Host, die Lobby ist offen', lrSys_join: 'ist jetzt in der Lobby', lrSys_join_obs: 'schaut als Zuschauer zu', lrSys_leave: 'ist nicht mehr in der Lobby',
  lrSys_gone: 'ist nicht mehr in der Lobby – Verbindung verloren', lrSys_kick: 'ist nicht mehr in der Lobby – vom Host entfernt', lrSys_to_obs: 'ist jetzt Zuschauer',
  lrSys_to_seat: 'ist jetzt in Team {team}', lrSys_host: 'ist jetzt Host der Lobby', n_to_obs: '{who} ist zu den Zuschauern gewechselt.',
  e_premod: 'Nicht gesendet: Die Nachricht hat die Moderation nicht bestanden. Bitte umformulieren.', e_too_fast: 'Zu schnell – warte eine Sekunde.', e_banned: 'Du darfst im Chat nicht schreiben.',
  e_empty: 'Die Nachricht ist leer.', chLobby: 'Lobby', chLobbyTip: 'Der Chat deiner Lobby „{name}"' });

const lcRoom = () => (LR.room && lrMine(LR.room) ? LR.room : null);
const lcLast = () => (LC.list.length ? LC.list[LC.list.length - 1].id : 0);
function lcReset(id) { LC.id = id || ''; LC.list = []; LC.readId = -1; LC.unread = 0; LC.reply = null; LC.side = 'conf'; }
// the room's answer with its feed (create / join / get): the whole feed, the lines here kept by id
function lcFeed(room) {
  if (!room || !Array.isArray(room.chat)) return;
  if (LC.id !== room.id) lcReset(room.id);
  const by = new Map(LC.list.map(m => [m.id, m])); room.chat.forEach(m => by.set(m.id, m));
  LC.list = [...by.values()].sort((a, b) => a.id - b.id).slice(-LC_MAX);
}
function lcAdd(m) {
  if (!m || LC.list.some(x => x.id === m.id)) return;
  LC.list.push(m); LC.list.sort((a, b) => a.id - b.id); if (LC.list.length > LC_MAX) LC.list.shift();
  lcSync();
}
// the room's view says the feed has more than here (a line missed while the stream was down): the room again, once in 3 s at most
function lcCatchUp(cseq) {
  if (!cseq || cseq <= lcLast() || Date.now() - LC.catchT < 3000) return;
  LC.catchT = Date.now(); setTimeout(() => { if (lcRoom() && cseq > lcLast()) lrCall('get'); }, 1200);
}
listen('c_ev', e => {
  const { e: ev, d } = e.payload || {};
  const r = lcRoom(); if (!r || !d || d.id !== r.id) return;
  if (ev === 'lroom_msg') { if (LC.id !== d.id) lcReset(d.id); lcAdd(d.m); }
  else if (ev === 'lroom_msg_tr') {
    const m = LC.list.find(x => x.id === d.mid); if (!m) return;
    m.lang = d.lang; m.ru = d.ru; m.en = d.en; lcPaint(true);
  }
});

// ---- the messages: the general chat's rows (lc-* for the lobby's own lines)
const lcOrig = m => m.orig || m.text || '';
const lcText = m => (CH.lang === 'ru' ? m.ru || lcOrig(m) : CH.lang === 'en' ? m.en || lcOrig(m) : lcOrig(m));
const lcQuote = q => (CH.lang === 'ru' ? q.ru : CH.lang === 'en' ? q.en : null) || q.text || '';
function lcRows(r) {
  const me = lrMe(), people = r ? (r.slots || []).filter(Boolean).concat(r.obs || []) : [];
  const myName = (people.find(p => p.steam === me) || {}).name || (CH.me && CH.me.name) || '';
  const names = [...new Set(people.map(p => p.name).concat(LC.list.map(m => m.name)).filter(Boolean))].sort((a, b) => b.length - a.length);
  const mention = html => names.reduce((h, n) => h.split('@' + esc(n)).join(`\u0000${n === myName ? 1 : 0}${esc(n)}\u0001`), html)
    .replace(/\u0000([01])([^\u0001]*)\u0001/g, (_, mm, n) => `<span class="ch-at${mm === '1' ? ' me' : ''}">@${n}</span>`);
  const mentionAll = html => chAtAll(mention(html));   // 1.6.32: @all (chat.js)
  const time = ts => new Date(ts * 1000).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  if (!LC.list.length) return `<div class="ch-empty">${esc(t('lrChatNone'))}</div>`;
  let who = null;   // 1.6.36: one author's messages in a row are a stack (as the general chat, chat.js chRender); an event ends it
  return LC.list.map(m => {
    if (m.sys) {
      who = null;
      const k = LC_SYS[m.sys] || LC_SYS.join, icon = k[1] === 'in' ? LC_IN : k[1] === 'out' ? LC_OUT : ico(k[1]);
      return `<div class="lc-sys ${k[0]}" data-id="${esc(String(m.id))}"><span class="sx">${icon}</span><span class="st"><b>${esc(m.name || '')}</b> ${esc(t('lrSys_' + m.sys, { team: m.team || '' }))}</span>`
        + `<span class="sw">${time(m.ts)}</span></div>`;
    }
    // the observer's eye goes with his role at the time: a move into the seats (or out of them) starts a new stack
    const by = String(m.steam || '') + (m.obs ? '/obs' : ''), cont = who === by; who = by;
    const text = lcText(m), tr = text !== lcOrig(m), toMe = m.reply && !m.reply.deleted && String(m.reply.steam) === String(me) && m.steam !== me;
    const rpl = m.steam !== me ? `<button class="rpl" data-reply="${esc(String(m.id))}" title="${esc(t('chReply'))}" aria-label="${esc(t('chReply'))}">${CH_ARROW}</button>` : '';
    const q = m.reply ? (m.reply.deleted ? `<div class="rq del"><i>${esc(t('chQuoteDel'))}</i></div>`
      : `<div class="rq" data-goto="${esc(String(m.reply.id))}" role="button" tabindex="0" title="${esc(t('chQuoteGo'))}"><b>${esc(m.reply.name || '')}</b><i>${esc(lcQuote(m.reply))}</i></div>`) : '';
    const when = esc(new Date(m.ts * 1000).toLocaleString(lang));
    const body = q + `<div class="tx ${tr ? 'tr' : ''}"${tr ? ` title="${esc(t('chOrig') + ': ' + lcOrig(m))}"` : ''}>${linkify(text, p => mentionAll(esc(p)), linkA)}</div>`;
    const cls = `ch-m ${m.steam === me ? 'mine' : ''} ${toMe ? 'tome' : ''}`;
    if (cont) return `<div class="${cls} cont" data-id="${esc(String(m.id))}"><span class="ch-gt" title="${when}">${chTimeShort(m.ts)}</span><div>${body}</div>${rpl}</div>`;
    return `<div class="${cls}" data-id="${esc(String(m.id))}"><span class="ch-av" data-steam="${esc(m.steam)}" data-name="${esc(m.name || '')}">${avatar(m.avatar)}</span>`
      + `<div><div class="w">${m.obs ? `<i class="lc-ome" data-tip="${esc(t('lrChatObs'))}">${ico('eye')}</i>` : ''}`
      + `${fmSeal(m.steam, m.name)}<b class="${r && m.steam === r.owner ? 'lc-host' : ''}" data-name="${esc(m.name || '')}" data-steam="${esc(m.steam)}"${rtTipAttr(m.steam, m.name)}>${esc(m.name || '')}</b>${rtBadge(m.steam)}`
      + `<span title="${when}">${time(m.ts)}</span></div>${body}</div>${rpl}</div>`;
  }).join('');
}
// one of the two places (the lobby's column, Home's pane): its messages, the reply strip, the input
function lcBody(el, ta) {
  el.innerHTML = `<div class="lc-body"><div class="ch-msgs lc-msgs"></div><button class="lc-pill hidden">${esc(t('lrChatNew'))} ↓</button></div>`
    + `<div class="ch-rbar lc-rbar hidden" role="status"></div>`
    + `<div class="ch-send lc-send"><textarea id="${ta}" rows="2" maxlength="300"></textarea><button class="btn-gold"></button></div>`;
  const msgs = el.querySelector('.lc-msgs'), area = el.querySelector('textarea'), pill = el.querySelector('.lc-pill');
  msgs.onscroll = () => { msgs._stick = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 30; msgs._top = msgs.scrollTop; if (msgs._stick) pill.classList.add('hidden'); };
  pill.onclick = () => { msgs.scrollTop = msgs.scrollHeight; };
  el.querySelector('.lc-send .btn-gold').onclick = () => lcSend(area);
  area.onkeydown = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); lcSend(area); }
    else if (e.key === 'Escape' && LC.reply) { LC.reply = null; lcBars(); }
  };
  return el;
}
function lcEl() { return LC.el || (LC.el = lcBody(Object.assign(document.createElement('section'), { className: 'lc-chat' }), 'lcText')); }
function lcFill(el, force) {
  if (!el) return;
  const box = el.querySelector('.lc-msgs'), r = lcRoom(), key = CH.lang + ':' + LC.list.length + ':' + lcLast() + ':' + lang;
  el.querySelector('textarea').placeholder = t('lrChatPh'); el.querySelector('.lc-send .btn-gold').textContent = t('fbSend');
  el.querySelector('.lc-pill').textContent = t('lrChatNew') + ' ↓';
  if (!force && box.dataset.key === key && box.childElementCount) return;
  const grew = box.dataset.key && box.dataset.key.split(':')[2] !== String(lcLast()); box.dataset.key = key;
  box.innerHTML = lcRows(r);
  const area = el.querySelector('textarea');
  box.querySelectorAll('.ch-av[data-steam]').forEach(a => nickBind(a, a.dataset.steam, a.dataset.name));
  box.querySelectorAll('b[data-name]').forEach(b => {                // a name: @name into this input; a right click: the menu
    nickBind(b, b.dataset.steam, b.dataset.name);
    b.onclick = e => {
      e.stopPropagation(); popClose();
      const at = '@' + b.dataset.name + ' ', s0 = area.selectionStart ?? area.value.length, s1 = area.selectionEnd ?? s0;
      const before = area.value.slice(0, s0), pre = before && !/\s$/.test(before) ? ' ' : '';
      area.value = before + pre + at + area.value.slice(s1); const pos = (before + pre + at).length; area.focus(); area.setSelectionRange(pos, pos);
    };
  });
  box.querySelectorAll('[data-reply]').forEach(b => b.onclick = () => {
    const m = LC.list.find(x => String(x.id) === b.dataset.reply); if (!m) return;
    LC.reply = { id: m.id, name: m.name || '', text: lcText(m) }; lcBars(); area.focus();
  });
  box.querySelectorAll('.rq[data-goto]').forEach(q => {
    const go = () => { const to = box.querySelector(`[data-id="${CSS.escape(q.dataset.goto)}"]`); if (!to) return;
      to.scrollIntoView({ block: 'center', behavior: 'smooth' }); to.classList.remove('flash'); void to.offsetWidth; to.classList.add('flash'); };
    q.onclick = go; q.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
  });
  if (box._stick !== false) box.scrollTop = box.scrollHeight;
  else if (grew) el.querySelector('.lc-pill').classList.remove('hidden');
}
function lcStick(el) { const m = el && el.querySelector('.lc-msgs'); if (m) m.scrollTop = m._stick !== false ? m.scrollHeight : (m._top || 0); }
function lcBars() {
  [LC.el, LC.home].forEach(el => {
    if (!el) return; const b = el.querySelector('.lc-rbar'), q = LC.reply;
    b.classList.toggle('hidden', !q);
    b.innerHTML = !q ? '' : `${CH_ARROW}<span class="rb-t">${esc(t('chReplyTo'))} <b>${esc(q.name)}</b>: <span>${esc(q.text)}</span></span>`
      + `<button type="button" title="${esc(t('chReplyCancel'))}" aria-label="${esc(t('chReplyCancel'))}">×</button>`;
    if (q) b.querySelector('button').onclick = () => { LC.reply = null; lcBars(); };
  });
}
function lcPaint(force) { lcFill(LC.el, force); lcFill(LC.home, force); lcBars(); lcSignals(); }
async function lcSend(area) {
  const text = area.value.trim(); if (!text || !lcRoom()) return;
  const cid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10), rp = LC.reply;
  area.value = ''; LC.reply = null; lcBars();
  [LC.el, LC.home].forEach(el => { const m = el && el.querySelector('.lc-msgs'); if (m) m._stick = true; });
  const r = await lrCall('say', rp ? { text, cid, reply_to: rp.id } : { text, cid });   // lrCall shows the refusal (e_<error>)
  if (r && r.ok && r.m) lcAdd(r.m);
  else { if (!area.value) area.value = text; LC.reply = rp; lcBars(); }   // not sent: the text and the reply back to retry
}

// ---- the lobby's right column: "Map and settings" | "Lobby chat" (lroom.js lrRoomHtml draws the tabs, lrBind calls this)
function lcSideBind(side) {
  if (!side) return;
  const el = lcEl(); side.appendChild(el);
  const tab = () => {
    side.classList.toggle('lr-onchat', LC.side === 'chat');
    side.querySelectorAll('.lr-stab').forEach(b => { const on = b.dataset.s === LC.side; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
  };
  side.querySelectorAll('.lr-stab').forEach(b => b.onclick = () => { LC.side = b.dataset.s; tab(); lcStick(el); lcSignals(); if (LC.side === 'chat') el.querySelector('textarea').focus(); });
  tab(); lcFill(el); lcStick(el); lcSignals();
}

// ---- Home: the chat's "Lobby" tab (index.html #chLobbyTab, right after General) and its pane (#lobbyPane) while I am in a lobby
function lcHome() {
  const tab = $('chLobbyTab'), pane = $('lobbyPane'), r = lcRoom(); if (!tab || !pane) return;
  tab.classList.toggle('hidden', !r);
  if (!r) { if (CH.lobby) { CH.lobby = false; chShowRoom(); } return; }
  tab.dataset.tip = t('chLobbyTip', { name: r.name });
  if (!LC.home) LC.home = lcBody(pane, 'lcHomeText');
}

// ---- after every redraw of the rooms (lroom.js lrRender): the feed of my lobby (or none), Home's tab, the messages, the counts
function lcSync() {
  const r = lcRoom();
  if (!r && LC.id) lcReset('');
  else if (r && LC.id !== r.id) lcReset(r.id);
  lcHome(); lcPaint(false);
}
// what others wrote since I last had the chat in view: the lobby's chat tab, Home's Lobby tab, the header's "Lobbies"; a glow when
// the count grows. The lobby's own lines are not counted.
function lcSeen() {
  const vis = el => !!(el && el.getClientRects().length);
  return (vis($('rooms')) && vis($('lrRoom')) && LC.side === 'chat') || (vis($('home')) && CH.lobby && !!lcRoom());
}
function lcSignals() {
  // 1.6.32 (memory): every 600 ms - nothing while the window is in the tray (nothing is read there), nothing once no lobby is left
  // and its counts are cleared; a count is written only when it changed
  if (pageHidden()) return;
  const r = lcRoom(), me = lrMe();
  if (!r && LC.sigIdle) return;
  LC.sigIdle = !r;
  if (r && LC.readId < 0) LC.readId = lcLast();                       // what was said before I got here: history, not news
  if (r && lcSeen() && !pageHidden()) LC.readId = lcLast();
  const n = r ? LC.list.filter(m => m.id > LC.readId && m.steam !== me && !m.sys).length : 0, grew = n > LC.unread;
  LC.unread = n;
  const ping = el => { if (!el || !grew) return; el.classList.remove('lc-ping'); void el.offsetWidth; el.classList.add('lc-ping'); };
  const ct = document.querySelector('#lrRoom .lr-stab[data-s="chat"]');
  const nv = n ? String(n) : '';
  if (ct) { const c = ct.querySelector('.lr-cnt'); if (c && c.textContent !== nv) c.textContent = nv; if (LC.side !== 'chat') ping(ct); }
  const ht = $('chLobbyTab'); if (ht) { if (ht.dataset.n !== nv) ht.dataset.n = nv; if (!CH.lobby) ping(ht); }
  const nav = document.querySelector('.tab[data-view="rooms"]');
  if (nav) {
    let nb = nav.querySelector('.tab-n'); if (!nb) { nb = document.createElement('b'); nb.className = 'tab-n'; nav.appendChild(nb); }
    const away = !($('rooms') && $('rooms').getClientRects().length);
    const bv = n && away ? nv : ''; if (nb.textContent !== bv) nb.textContent = bv; if (away) ping(nb);
  }
}
setInterval(lcSignals, 600);                                          // a page switched, a tab opened: what is in view now is read

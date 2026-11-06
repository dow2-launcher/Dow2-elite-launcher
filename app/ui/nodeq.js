// ---------- Node quality per player (1.4.24, owner 06.11.2026) ----------
// "At 30-40 % loss nothing helps - keep it and openly offer not to use that server for that player." The ladder keeps, per
// player, how each of our nodes did for him (his connection checks - sent silently after each run - and his real matches) and
// the matchmaker does not put his games on a node that is bad for him (losses >= 10 %, stuck / pauses >= 1 s, a cut stream or
// DPI, by his 2 newest measurements; one good one clears it). Here: the mark at that node in Settings -> Online play and in the
// connection check window ("not used for you: losses 35% (06.11 14:12) - Check again" + "use it anyway" for 24 h), and the same
// mark at the player in a room's ping table (lroom.js asks nqRoomTitle). Loaded after app.js / nettest.js / lroom.js.
'use strict';
Object.assign(T.en, {
  nqOff: 'not used for you: {why} ({when})', nqAgain: 'Check again', nqAnyway: 'use it anyway', nqForced: 'used for you anyway until {until} ({why})', nqUndo: 'stop using it',
  nqTip: 'Matchmaking does not put your games on this server (by your recent connection checks and matches). One good check clears the mark; “use it anyway” lifts it for 24 h.',
  nqW_loss: 'losses {n}%', nqW_stall: 'stuck up to {s} s', nqW_cut: 'the connection broke', nqW_dpi: 'the stream is stopped on the way (DPI)', nqInMatch: 'in a match',
  nqRoom: 'not used for {name}: {why} ({when})', nqRoomTag: 'not used', nqRoomNote: '“not used”: the server is skipped for that player - his connection to it was bad lately.',
  nqRoomIgnored: 'Every server that fits is bad for one of the players - the match takes the best one anyway.', nqErr: 'The server did not answer - try again later.',
});
Object.assign(T.ru, {
  nqOff: 'для тебя не используется: {why} ({when})', nqAgain: 'Проверить снова', nqAnyway: 'всё равно использовать', nqForced: 'используется по твоему выбору до {until} ({why})', nqUndo: 'не использовать',
  nqTip: 'Подбор не ставит твои игры на этот сервер (по последним проверкам связи и матчам). Одна хорошая проверка снимает пометку; «всё равно использовать» — на 24 ч.',
  nqW_loss: 'потери {n}%', nqW_stall: 'застревала до {s} с', nqW_cut: 'связь обрывалась', nqW_dpi: 'поток режется по дороге (DPI)', nqInMatch: 'в матче',
  nqRoom: 'для {name} не используется: {why} ({when})', nqRoomTag: 'не исп.', nqRoomNote: '«не исп.»: сервер не используется для этого игрока — связь с ним у него в последнее время плохая.',
  nqRoomIgnored: 'Каждый подходящий сервер плох для кого-то из игроков — матч всё равно пойдёт через лучший.', nqErr: 'Сервер не ответил — попробуйте позже.',
});
Object.assign(T.es, {
  nqOff: 'no se usa para ti: {why} ({when})', nqAgain: 'Comprobar de nuevo', nqAnyway: 'usarlo igualmente', nqForced: 'se usa para ti igualmente hasta {until} ({why})', nqUndo: 'dejar de usarlo',
  nqTip: 'El emparejamiento no pone tus partidas en este servidor (por tus últimas comprobaciones y partidas). Una comprobación buena quita la marca; «usarlo igualmente» la quita 24 h.',
  nqW_loss: 'pérdidas {n}%', nqW_stall: 'atascada hasta {s} s', nqW_cut: 'la conexión se cortó', nqW_dpi: 'el flujo se corta por el camino (DPI)', nqInMatch: 'en una partida',
  nqRoom: 'no se usa para {name}: {why} ({when})', nqRoomTag: 'no se usa', nqRoomNote: '«no se usa»: el servidor se salta para ese jugador: su conexión con él fue mala últimamente.',
  nqRoomIgnored: 'Cada servidor posible es malo para algún jugador: la partida usa el mejor igualmente.', nqErr: 'El servidor no respondió: inténtalo más tarde.',
});
Object.assign(T.fr, {
  nqOff: 'pas utilisé pour toi : {why} ({when})', nqAgain: 'Vérifier à nouveau', nqAnyway: 'l’utiliser quand même', nqForced: 'utilisé pour toi quand même jusqu’au {until} ({why})', nqUndo: 'ne plus l’utiliser',
  nqTip: 'Le matchmaking ne met pas tes parties sur ce serveur (d’après tes dernières vérifications et parties). Une bonne vérification enlève la marque ; « l’utiliser quand même » la lève pour 24 h.',
  nqW_loss: 'pertes {n} %', nqW_stall: 'bloquée jusqu’à {s} s', nqW_cut: 'la connexion a coupé', nqW_dpi: 'le flux est coupé en route (DPI)', nqInMatch: 'en partie',
  nqRoom: 'pas utilisé pour {name} : {why} ({when})', nqRoomTag: 'pas utilisé', nqRoomNote: '« pas utilisé » : le serveur est évité pour ce joueur - sa connexion avec lui était mauvaise ces derniers temps.',
  nqRoomIgnored: 'Chaque serveur possible est mauvais pour un des joueurs - la partie prend le meilleur quand même.', nqErr: 'Le serveur n’a pas répondu - réessaie plus tard.',
});
Object.assign(T.de, {
  nqOff: 'für dich nicht genutzt: {why} ({when})', nqAgain: 'Erneut prüfen', nqAnyway: 'trotzdem nutzen', nqForced: 'für dich trotzdem genutzt bis {until} ({why})', nqUndo: 'nicht mehr nutzen',
  nqTip: 'Das Matchmaking legt deine Spiele nicht auf diesen Server (nach deinen letzten Verbindungsprüfungen und Matches). Eine gute Prüfung hebt die Markierung auf; „trotzdem nutzen“ für 24 h.',
  nqW_loss: 'Verluste {n} %', nqW_stall: 'hing bis {s} s', nqW_cut: 'die Verbindung brach ab', nqW_dpi: 'der Strom wird unterwegs gestoppt (DPI)', nqInMatch: 'im Match',
  nqRoom: 'für {name} nicht genutzt: {why} ({when})', nqRoomTag: 'nicht genutzt', nqRoomNote: '„nicht genutzt“: der Server wird für diesen Spieler übersprungen - seine Verbindung dorthin war zuletzt schlecht.',
  nqRoomIgnored: 'Jeder passende Server ist für einen der Spieler schlecht - das Match nimmt trotzdem den besten.', nqErr: 'Der Server hat nicht geantwortet - versuch es später.',
});

const NQ = { marks: {}, t: 0 };
const nqWhen = ts => (typeof ntTime === 'function' ? ntTime(ts) : new Date(ts * 1000).toLocaleString());
// the reasons of the newest bad measurement, in words: "losses 35%", "stuck up to 3 s", "the connection broke", "DPI"
function nqWhy(m) {
  const w = (m.why || []).map(k => k === 'loss' ? t('nqW_loss', { n: Math.round(m.loss || 0) }) : k === 'stall' ? t('nqW_stall', { s: Math.max(1, Math.round((m.stall_ms || 0) / 1000)) }) : t('nqW_' + k));
  return w.join(', ') + (m.src === 'match' ? ' ' + t('nqInMatch') : '');
}
function nqTake(marks) { NQ.marks = marks || {}; NQ.t = Date.now(); nqRedraw(); }
async function nqLoad() {
  if (!(CH.me && CH.me.signed_in)) { if (Object.keys(NQ.marks).length) nqTake({}); return; }
  try { const r = await invoke('nq_api', { verb: 'marks' }); if (r && r.ok) nqTake(r.marks); } catch (e) {}
}
function nqRedraw() {
  try { if ($('gnList') && typeof renderGameNet === 'function') renderGameNet(); } catch (e) {}
  try { if ($('ntBox') && typeof NT !== 'undefined' && !NT.busy) ntRender(); } catch (e) {}
}
// the mark under a node (Settings -> Online play, the connection check window): '' when the node is fine for this player
window.nqMark = function (ip) {
  const m = NQ.marks[ip]; if (!m || !m.bad) return '';
  if (!m.avoid && m.forced_until) return `<div class="nq-mark forced"><span>${esc(t('nqForced', { until: nqWhen(m.forced_until), why: nqWhy(m) }))}</span> <button class="link-btn" data-nq-undo="${esc(ip)}">${esc(t('nqUndo'))}</button></div>`;
  return `<div class="nq-mark" title="${esc(t('nqTip'))}"><span>${esc(t('nqOff', { why: nqWhy(m), when: nqWhen(m.t) }))}</span> — `
    + `<button class="link-btn" data-nq-again="1"${S && S.game_running ? ' disabled' : ''}>${esc(t('nqAgain'))}</button> <button class="link-btn" data-nq-force="${esc(ip)}">${esc(t('nqAnyway'))}</button></div>`;
};
window.nqAvoided = ip => !!(NQ.marks[ip] && NQ.marks[ip].avoid);
// the connection check's "matchmaking picks this" without the nodes not used for this player (elite_core matchmaker_pick: usable,
// ping above 0, the lowest; the first on a tie); null when none is left (then the ladder ignores the marks too)
window.nqPickTest = function (ns) {
  let best = null;
  (ns || []).forEach(n => { const ms = (n.ping && n.ping.relay_ms) || -1; if (n.burst && n.burst.usable && ms > 0 && !nqAvoided(n.ip) && (!best || ms < best.ping.relay_ms)) best = n; });
  return best;
};
// the room's ping table: the title of a node not used for that player (null when it is used)
window.nqRoomTitle = function (q, name) { return q && q.avoid ? t('nqRoom', { name, why: nqWhy(q), when: nqWhen(q.t) }) : null; };
document.addEventListener('click', async e => {
  const b = e.target.closest && e.target.closest('[data-nq-force],[data-nq-undo],[data-nq-again]'); if (!b) return;
  e.preventDefault();
  if (b.dataset.nqAgain) {                                   // the connection check, at once when nothing stops it
    if (typeof ntOpen === 'function') { ntOpen(); if (typeof ntRun === 'function' && !(S && S.game_running) && !NT.busy) ntRun(); }
    return;
  }
  b.disabled = true;
  try {
    const r = await invoke('nq_api', { verb: 'force', body: { ip: b.dataset.nqForce || b.dataset.nqUndo, on: !!b.dataset.nqForce } });
    if (r && r.ok) nqTake(r.marks); else toast(t('nqErr'), true);
  } catch (err) { toast(t('nqErr'), true); }
  b.disabled = false;
});
setTimeout(nqLoad, 4000);                                    // after the sign-in check of the start
setInterval(() => { if (!document.hidden) nqLoad(); }, 5 * 60 * 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - NQ.t > 60000) nqLoad(); });

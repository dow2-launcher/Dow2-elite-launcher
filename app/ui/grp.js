// 1.6.32 (owner 24.11.2026): a group of up to 3 players - a LAYOUT PROTOTYPE, no function yet and not shown to the players: it is
// on only after Ctrl+Shift+G in the window (localStorage grpProto; the design stand: #grp=b). The owner's pick of round 10 is
// variant B: the group's avatars left of Play in the footer (every tab); the leader carries the lobby host's mark (the chaplain's
// skull), every avatar a dot of where he is (green: the launcher, gold: a game, grey: gone); a free place is the lobby's empty
// seat (the dimmed skull avatar) with a plus in its corner - "Invite": the launcher's players, anybody (owner 24.11.2026). Picking
// one adds him HERE only (nothing is sent; kept in localStorage grpProtoM to look at the states); the leader's x takes him out.
'use strict';
Object.assign(T.en, { grpInvite: 'Invite to the group', grpLead: 'group leader', grpIn: 'in the launcher', grpGame: 'in a game', grpOff: 'not in the launcher',
  grpOut: 'Remove from the group', grpFind: 'Find a player', grpNone: 'Nobody else is in the launcher right now.', grpNoMatch: 'Nobody by that name.',
  grpProto: 'Prototype: nothing is sent - the player shows in your group only here.', grpProtoOn: 'Group prototype: on (Ctrl+Shift+G turns it off)', grpProtoOff: 'Group prototype: off' });
Object.assign(T.ru, { grpInvite: 'Позвать в группу', grpLead: 'лидер группы', grpIn: 'в лаунчере', grpGame: 'в игре', grpOff: 'не в лаунчере',
  grpOut: 'Убрать из группы', grpFind: 'Найти игрока', grpNone: 'Сейчас в лаунчере больше никого нет.', grpNoMatch: 'Никого с таким именем.',
  grpProto: 'Прототип: ничего не отправляется — игрок появляется в группе только у вас.', grpProtoOn: 'Прототип группы: включён (Ctrl+Shift+G — выключить)', grpProtoOff: 'Прототип группы: выключен' });
Object.assign(T.es, { grpInvite: 'Invitar al grupo', grpLead: 'líder del grupo', grpIn: 'en el launcher', grpGame: 'en una partida', grpOff: 'fuera del launcher',
  grpOut: 'Quitar del grupo', grpFind: 'Buscar jugador', grpNone: 'Ahora no hay nadie más en el launcher.', grpNoMatch: 'Nadie con ese nombre.',
  grpProto: 'Prototipo: no se envía nada; el jugador aparece en tu grupo solo aquí.', grpProtoOn: 'Prototipo de grupo: activado (Ctrl+Shift+G lo desactiva)', grpProtoOff: 'Prototipo de grupo: desactivado' });
Object.assign(T.fr, { grpInvite: 'Inviter dans le groupe', grpLead: 'chef du groupe', grpIn: 'dans le launcher', grpGame: 'en partie', grpOff: 'hors du launcher',
  grpOut: 'Retirer du groupe', grpFind: 'Trouver un joueur', grpNone: 'Personne d\'autre dans le launcher pour le moment.', grpNoMatch: 'Personne avec ce nom.',
  grpProto: 'Prototype : rien n\'est envoyé, le joueur n\'apparaît dans votre groupe qu\'ici.', grpProtoOn: 'Prototype de groupe : activé (Ctrl+Maj+G pour le couper)', grpProtoOff: 'Prototype de groupe : désactivé' });
Object.assign(T.de, { grpInvite: 'In die Gruppe einladen', grpLead: 'Gruppenleiter', grpIn: 'im Launcher', grpGame: 'im Spiel', grpOff: 'nicht im Launcher',
  grpOut: 'Aus der Gruppe nehmen', grpFind: 'Spieler suchen', grpNone: 'Gerade ist sonst niemand im Launcher.', grpNoMatch: 'Niemand mit diesem Namen.',
  grpProto: 'Prototyp: Es wird nichts gesendet - der Spieler erscheint nur hier in deiner Gruppe.', grpProtoOn: 'Gruppen-Prototyp: an (Strg+Umschalt+G schaltet ihn aus)', grpProtoOff: 'Gruppen-Prototyp: aus' });

const GRP = { on: false, members: [], pick: false, find: '' };
try { GRP.on = localStorage.getItem('grpProto') === '1'; GRP.members = JSON.parse(localStorage.getItem('grpProtoM') || '[]').map(String).slice(0, 2); } catch (e) {}
const grpSave = () => { try { localStorage.setItem('grpProto', GRP.on ? '1' : '0'); localStorage.setItem('grpProtoM', JSON.stringify(GRP.members)); } catch (e) {} };
const grpMe = () => (CH.me && CH.me.signed_in ? String(CH.me.steam || '') : '');
// where a player is: a game, the launcher, gone (the snapshot of Online)
function grpWhere(st) {
  const p = (LIVE.launcher || []).find(x => x && String(x.steam) === String(st));
  return !p ? 'off' : p.state === 'game' ? 'game' : 'menu';
}
function grpBox() {
  let b = $('grpFoot');
  if (!b) { const w = $('playWrap'); if (!w) return null; b = document.createElement('div'); b.id = 'grpFoot'; b.className = 'grp-foot'; w.parentElement.insertBefore(b, w); }
  return b;
}
function grpRender() {
  const me = grpMe(), b = grpBox(); if (!b) return;
  // shown: the prototype on and a signed-in player (a group is of Steam accounts)
  const show = GRP.on && !!me;
  b.classList.toggle('hidden', !show);
  if (!show) { GRP.pick = false; grpPickShow(); setHtml(b, ''); return; }
  const ppl = [me, ...GRP.members.filter(s => s !== me)].slice(0, 3);
  const where = { menu: t('grpIn'), game: t('grpGame'), off: t('grpOff') };
  const tile = (st, i) => {
    const u = st === me ? { name: CH.me.name, avatar: CH.me.avatar } : onUser(st), w = st === me ? 'menu' : grpWhere(st), lead = i === 0;
    const tip = (u.name || 'Player') + '\n' + (lead ? t('grpLead') + ' · ' : '') + where[w];
    return `<div class="grp-f${st === me ? ' me' : ''}" data-tip="${esc(tip)}"><span class="gp">${avatar(u.avatar)}`
      + (lead ? `<i class="gld" aria-hidden="true">${ico('crown')}</i>` : '') + `<i class="gst ${w}" aria-hidden="true"></i>`
      + (!lead ? `<button class="gx" data-gx="${esc(st)}" title="${esc(t('grpOut'))}" aria-label="${esc(t('grpOut'))}">${ico('x')}</button>` : '') + '</span></div>';
  };
  const add = `<button class="grp-f add" id="grpAdd" data-tip="${esc(t('grpInvite'))}" aria-label="${esc(t('grpInvite'))}" aria-haspopup="dialog" aria-expanded="${GRP.pick}">`
    + `<span class="gp"><i class="av sk-av"></i><i class="gplus" aria-hidden="true">${ico('plus')}</i></span></button>`;
  const html = ppl.map(tile).join('') + Array.from({ length: 3 - ppl.length }, () => add).join('');
  if (setHtml(b, html)) {
    b.querySelectorAll('.grp-f.add').forEach(x => x.onclick = e => { e.stopPropagation(); GRP.pick = !GRP.pick; GRP.find = ''; grpPickShow(x); });
    b.querySelectorAll('[data-gx]').forEach(x => x.onclick = e => { e.stopPropagation(); GRP.members = GRP.members.filter(s => s !== x.dataset.gx); grpSave(); grpRender(); });
  }
  if (GRP.pick) grpPickShow(b.querySelector('.grp-f.add'));
}
// the list of whom to call: the launcher's players (anybody, owner 24.11.2026), not in a game, not in the group; a search on top
function grpPickShow(anchor) {
  let m = $('grpPick');
  if (!GRP.pick || !anchor) { if (m) m.remove(); GRP.pick = false; const a = $('grpAdd'); if (a) a.setAttribute('aria-expanded', 'false'); return; }
  if (!m) { m = document.createElement('div'); m.id = 'grpPick'; m.className = 'me-box grp-pick'; m.setAttribute('role', 'dialog'); m.onclick = e => e.stopPropagation(); document.body.appendChild(m);
    m.innerHTML = `<input id="grpFind" autocomplete="off"><div class="ii-list" id="grpList"></div><p class="note grp-pnote"></p>`;
    $('grpFind').oninput = e => { GRP.find = e.target.value; grpPickList(); };
    $('grpFind').onkeydown = e => { if (e.key === 'Escape') { GRP.pick = false; grpPickShow(); } }; }
  $('grpFind').placeholder = t('grpFind'); m.querySelector('.grp-pnote').textContent = t('grpProto');
  grpPickList();
  const r = anchor.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px';
  m.style.top = Math.max(8, r.top - h - 8) + 'px';
  if (document.activeElement !== $('grpFind')) $('grpFind').focus();
}
function grpPickList() {
  const me = grpMe(), f = GRP.find.trim().toLowerCase(), inG = new Set([me, ...GRP.members]);
  const ppl = (LIVE.launcher || []).filter(p => p && p.state !== 'game' && !inG.has(String(p.steam)) && onUser(p.steam).name && (!f || onUser(p.steam).name.toLowerCase().includes(f)))
    .sort((a, b) => (onUser(a.steam).name || '').localeCompare(onUser(b.steam).name || ''));
  const list = $('grpList'); if (!list) return;
  list.innerHTML = ppl.length ? ppl.map(p => { const u = onUser(p.steam);
    return `<button class="ii" data-gadd="${esc(p.steam)}">${avatar(u.avatar)}${fmSeal(p.steam, u.name)}${rtName(`<span class="nm">${esc(u.name)}</span>`, p.steam)}${rtCell(p.steam, null, u.rating)}<span class="ii-st">${esc(t('grpInvite'))}</span></button>`; }).join('')
    : `<div class="note">${esc(t(f ? 'grpNoMatch' : 'grpNone'))}</div>`;
  list.querySelectorAll('[data-gadd]').forEach(x => x.onclick = () => {
    if (GRP.members.length < 2 && !GRP.members.includes(x.dataset.gadd)) GRP.members.push(x.dataset.gadd);
    GRP.pick = false; grpSave(); grpPickShow(); grpRender();
  });
}
document.addEventListener('click', () => { if (GRP.pick) { GRP.pick = false; grpPickShow(); } });
addEventListener('resize', () => { if (GRP.pick) { GRP.pick = false; grpPickShow(); } });
// Ctrl+Shift+G: the prototype on / off (only who knows the keys sees it)
document.addEventListener('keydown', e => {
  if (!(e.ctrlKey && e.shiftKey && (e.code === 'KeyG'))) return;
  e.preventDefault(); GRP.on = !GRP.on; grpSave(); grpRender(); toast(t(GRP.on ? 'grpProtoOn' : 'grpProtoOff'));
});
grpRender();

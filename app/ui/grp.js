// 1.6.32 (owner 24.11.2026): a group of up to 3 players - only its layout for now, no function: there are no groups yet, so it is
// never shown (the block shows from 2 players in the group; GRP.members comes with the groups' feature, the design stand fills it).
// The owner's pick of round 10 is variant B: the group's avatars left of Play in the footer (every tab); the leader carries the lobby
// host's skull (gold, over his portrait where a crown would be); every avatar a dot of where he is (green: the launcher, gold: a
// game, grey: gone); a free place is the lobby's empty seat (the dimmed skull) with a plus inside the square.
'use strict';
Object.assign(T.en, { grpInvite: 'Invite to the group', grpLead: 'group leader', grpIn: 'in the launcher', grpGame: 'in a game', grpOff: 'not in the launcher' });
Object.assign(T.ru, { grpInvite: 'Позвать в группу', grpLead: 'лидер группы', grpIn: 'в лаунчере', grpGame: 'в игре', grpOff: 'не в лаунчере' });
Object.assign(T.es, { grpInvite: 'Invitar al grupo', grpLead: 'líder del grupo', grpIn: 'en el launcher', grpGame: 'en una partida', grpOff: 'fuera del launcher' });
Object.assign(T.fr, { grpInvite: 'Inviter dans le groupe', grpLead: 'chef du groupe', grpIn: 'dans le launcher', grpGame: 'en partie', grpOff: 'hors du launcher' });
Object.assign(T.de, { grpInvite: 'In die Gruppe einladen', grpLead: 'Gruppenleiter', grpIn: 'im Launcher', grpGame: 'im Spiel', grpOff: 'nicht im Launcher' });

// members: SteamIDs, the leader first (empty: no group)
const GRP = { members: [] };
// where a player is: a game, the launcher, gone (the snapshot of Online)
function grpWhere(st) {
  const p = (LIVE.launcher || []).find(x => x && String(x.steam) === String(st));
  return !p ? 'off' : p.state === 'game' ? 'game' : 'menu';
}
function grpBox() {
  let b = $('grpFoot');
  if (!b) { const w = $('playWrap'); if (!w) return null; b = document.createElement('div'); b.id = 'grpFoot'; b.className = 'grp-foot hidden'; w.parentElement.insertBefore(b, w); }
  return b;
}
function grpRender() {
  const me = CH.me && CH.me.signed_in ? String(CH.me.steam || '') : '', b = grpBox(); if (!b) return;
  const ppl = GRP.members.map(String).slice(0, 3);
  const show = !!me && ppl.length >= 2;   // a group is 2 players or more; alone - no block
  b.classList.toggle('hidden', !show);
  if (!show) { setHtml(b, ''); return; }
  const where = { menu: t('grpIn'), game: t('grpGame'), off: t('grpOff') };
  const tile = (st, i) => {
    const u = st === me ? { name: CH.me.name, avatar: CH.me.avatar } : onUser(st), w = st === me ? 'menu' : grpWhere(st), lead = i === 0;
    const tip = (u.name || 'Player') + '\n' + (lead ? t('grpLead') + ' · ' : '') + where[w];
    return `<div class="grp-f${st === me ? ' me' : ''}" data-tip="${esc(tip)}"><span class="gp">${avatar(u.avatar)}`
      + (lead ? `<i class="gld" aria-hidden="true">${ico('crown')}</i>` : '') + `<i class="gst ${w}" aria-hidden="true"></i></span></div>`;
  };
  const add = `<div class="grp-f add" data-tip="${esc(t('grpInvite'))}"><span class="gp"><i class="av sk-av"></i><i class="gplus" aria-hidden="true">${ico('plus')}</i></span></div>`;
  setHtml(b, ppl.map(tile).join('') + Array.from({ length: 3 - ppl.length }, () => add).join(''));
}
grpRender();

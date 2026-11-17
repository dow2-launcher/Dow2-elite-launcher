// 1.6.20 (owner 17.11.2026, before the Elite rating's preseason): one rating system on every screen, the player's pick - Relic's
// (one Elo for every mode: the number Relic keeps from the custom games, the same LobbyStats shows) or Elite's own (our season,
// our servers, a rating per mode: 1v1 / 2v2 / 3v3, the first 5 games of a mode are its calibration). The pick is a tick in the
// profile's menu (chat.js chMe); it is only what is shown (owner 17.11.2026): every game of our Find a Game counts for the Elite
// rating whatever the tick, the matchmaking and the site are the server's.
//  - a list shows one number per player: Online the 1v1, a lobby the lobby's mode, a running match its mode; no number (Relic
//    has none, Elite's calibration or no games) - a dash, the same in both (owner 17.11.2026: not a "classified" stamp);
//  - the tip of a player (layer.js, data-ptip on his row / name): every rating - Elite's modes (the number, or the calibration
//    "2/5", or a dash) and Relic's number, the picked system first; his badges' titles; the hours played where the list has them.
//    No games or wins anywhere but in the calibration (owner 17.11.2026: the statistics are the site's);
//  - the Elite table's top three of each mode by the name, for everybody whichever system he picked - each mode its own army (owner 17.11.2026: three
//    warbosses were too many): 1v1 the Space Marines (the Reclusiarch, the Veterans), 2v2 the Imperial Guard (the Lord General,
//    the Commissars), 3v3 the Orks (the Warboss - the horned skull, the Nobs - Gork's head); 1st gold, 2nd silver, 3rd bronze; one badge per mode he is in.
// The Elite table comes whole from the ladder (/ladder/api/own/all, lroom.rs own_get), every 2 min whichever system is picked - the
// badges are everybody's (the site recomputes the table every 5).
'use strict';
Object.assign(T.en, { rtInfoT: 'About the Elite rating and its season', rtNoneT: 'No Elite rating in {mode} yet: calibration or no games', rtElite: 'Elite rating', rtRelic: 'Relic rating',
  rtUse: 'Elite rating', rtUseT: 'On: the launcher shows the Elite rating everywhere - our season, our servers, a rating per mode. Off: the Relic rating. Only the display changes: every game through our Find a Game counts for the Elite rating either way.',
  rtPre: 'preseason', rtSeason: 'season {s}', rtLine: '{mode} — {r}', rtCalLine: '{mode} — calibration: {g}/{k}',
  rtNoneLine: '{mode} — no games yet', rtRelicLine: 'Relic rating: {r}', rtNoRelic: 'Relic rating: none', rtRelicNote: 'one number for every mode: Relic\'s Elo of the custom games',
  rtOff: 'Elite rating: the server did not answer', rtWait: 'Elite rating: loading…', rt1v1a: 'Reclusiarch of the Elite rating · 1v1', rt1v1b: 'Veteran · place {n} in 1v1 · after the Reclusiarch\'s place', rt2v2a: 'Lord General of the Elite rating · 2v2', rt2v2b: 'Commissar · place {n} in 2v2 · after the Lord General\'s place', rt3v3a: 'Warboss of the Elite rating · 3v3', rt3v3b: 'Nob · place {n} in 3v3 · after the Warboss\'s place',
  rtTable: 'Table ›', rtTableT: 'My Elite rating on the site: the table and my matches', rtPlace: 'place {n}', rtCal: 'calibration: {g}/{k}' });
Object.assign(T.ru, { rtInfoT: 'О рейтинге Elite и его сезоне', rtNoneT: 'Рейтинга Elite в {mode} пока нет: калибровка или ещё нет игр', rtElite: 'Рейтинг Elite', rtRelic: 'Рейтинг Relic',
  rtUse: 'Рейтинг Elite', rtUseT: 'Включено: лаунчер везде показывает рейтинг Elite — наш сезон, наши серверы, свой рейтинг в каждом режиме. Выключено — рейтинг Relic. Меняется только отображение: все игры через наш Find a Game идут в рейтинг Elite в любом случае.',
  rtPre: 'предсезон', rtSeason: 'сезон {s}', rtLine: '{mode} — {r}', rtCalLine: '{mode} — калибровка: {g}/{k}',
  rtNoneLine: '{mode} — игр ещё нет', rtRelicLine: 'Рейтинг Relic: {r}', rtNoRelic: 'Рейтинг Relic: нет', rtRelicNote: 'одно число на все режимы: Elo Relic по кастомным играм',
  rtOff: 'Рейтинг Elite: сервер не ответил', rtWait: 'Рейтинг Elite: загружается…', rt1v1a: 'Реклюзиарх элитного рейтинга · 1v1', rt1v1b: 'Ветеран · {n}-е место в 1v1 · кандидат в реклюзиархи', rt2v2a: 'Лорд-генерал элитного рейтинга · 2v2', rt2v2b: 'Комиссар · {n}-е место в 2v2 · кандидат в Лорд-генералы', rt3v3a: 'Варбосс элитного рейтинга · 3v3', rt3v3b: 'Ноб · {n}-е место в 3v3 · кандидат подсидеть варбосса',
  rtTable: 'Таблица ›', rtTableT: 'Мой рейтинг Elite на сайте: таблица и мои матчи', rtPlace: 'место {n}', rtCal: 'калибровка: {g}/{k}' });
Object.assign(T.es, { rtInfoT: 'Sobre el rating Elite y su temporada', rtNoneT: 'Aún sin rating Elite en {mode}: calibración o sin partidas', rtElite: 'Rating Elite', rtRelic: 'Rating de Relic',
  rtUse: 'Rating Elite', rtUseT: 'Activado: el launcher muestra en todas partes el rating Elite: nuestra temporada, nuestros servidores, un rating por modo. Desactivado: el rating de Relic. Solo cambia lo que se muestra: todas las partidas de nuestro Find a Game cuentan para el rating Elite de todos modos.',
  rtPre: 'pretemporada', rtSeason: 'temporada {s}', rtLine: '{mode} — {r}', rtCalLine: '{mode} — calibración: {g}/{k}',
  rtNoneLine: '{mode} — aún sin partidas', rtRelicLine: 'Rating de Relic: {r}', rtNoRelic: 'Rating de Relic: ninguno', rtRelicNote: 'un número para todos los modos: el Elo de Relic de las partidas personalizadas',
  rtOff: 'Rating Elite: el servidor no respondió', rtWait: 'Rating Elite: cargando…', rt1v1a: 'Reclusiarca del rating Elite · 1v1', rt1v1b: 'Veterano · puesto {n} en 1v1 · aspira al puesto del Reclusiarca', rt2v2a: 'Lord General del rating Elite · 2v2', rt2v2b: 'Comisario · puesto {n} en 2v2 · aspira al puesto del Lord General', rt3v3a: 'Kaudillo del rating Elite · 3v3', rt3v3b: 'Noble · puesto {n} en 3v3 · aspira al puesto del Kaudillo',
  rtTable: 'Tabla ›', rtTableT: 'Mi rating Elite en el sitio: la tabla y mis partidas', rtPlace: 'puesto {n}', rtCal: 'calibración: {g}/{k}' });
Object.assign(T.fr, { rtInfoT: 'À propos du classement Elite et de sa saison', rtNoneT: 'Pas encore de classement Elite en {mode} : calibrage ou aucune partie', rtElite: 'Classement Elite', rtRelic: 'Classement Relic',
  rtUse: 'Classement Elite', rtUseT: 'Activé : le launcher affiche partout le classement Elite - notre saison, nos serveurs, un classement par mode. Désactivé : le classement Relic. Seul l\'affichage change : toutes les parties de notre Find a Game comptent pour le classement Elite dans tous les cas.',
  rtPre: 'présaison', rtSeason: 'saison {s}', rtLine: '{mode} — {r}', rtCalLine: '{mode} — calibrage : {g}/{k}',
  rtNoneLine: '{mode} — aucune partie', rtRelicLine: 'Classement Relic : {r}', rtNoRelic: 'Classement Relic : aucun', rtRelicNote: 'un seul nombre pour tous les modes : l\'Elo Relic des parties personnalisées',
  rtOff: 'Classement Elite : le serveur n\'a pas répondu', rtWait: 'Classement Elite : chargement…', rt1v1a: 'Reclusiarque du classement Elite · 1v1', rt1v1b: 'Vétéran · place {n} en 1v1 · vise la place du Reclusiarque', rt2v2a: 'Lord Général du classement Elite · 2v2', rt2v2b: 'Commissaire · place {n} en 2v2 · vise la place du Lord Général', rt3v3a: 'Boss de guerre du classement Elite · 3v3', rt3v3b: 'Nob · place {n} en 3v3 · vise la place du Boss',
  rtTable: 'Tableau ›', rtTableT: 'Mon classement Elite sur le site : le tableau et mes parties', rtPlace: 'place {n}', rtCal: 'calibrage : {g}/{k}' });
Object.assign(T.de, { rtInfoT: 'Über die Elite-Wertung und ihre Saison', rtNoneT: 'Noch keine Elite-Wertung in {mode}: Kalibrierung oder keine Spiele', rtElite: 'Elite-Wertung', rtRelic: 'Relic-Wertung',
  rtUse: 'Elite-Wertung', rtUseT: 'An: Der Launcher zeigt überall die Elite-Wertung - unsere Saison, unsere Server, eine Wertung pro Modus. Aus: die Relic-Wertung. Nur die Anzeige ändert sich: Jedes Spiel über unser Find a Game zählt so oder so für die Elite-Wertung.',
  rtPre: 'Vorsaison', rtSeason: 'Saison {s}', rtLine: '{mode} — {r}', rtCalLine: '{mode} — Kalibrierung: {g}/{k}',
  rtNoneLine: '{mode} — noch keine Spiele', rtRelicLine: 'Relic-Wertung: {r}', rtNoRelic: 'Relic-Wertung: keine', rtRelicNote: 'eine Zahl für alle Modi: Relics Elo der Custom-Spiele',
  rtOff: 'Elite-Wertung: Der Server hat nicht geantwortet', rtWait: 'Elite-Wertung: wird geladen…', rt1v1a: 'Reclusiarch der Elite-Wertung · 1v1', rt1v1b: 'Veteran · Platz {n} in 1v1 · will den Platz des Reclusiarchen', rt2v2a: 'Lord-General der Elite-Wertung · 2v2', rt2v2b: 'Kommissar · Platz {n} in 2v2 · will den Platz des Lord-Generals', rt3v3a: 'Waaaghboss der Elite-Wertung · 3v3', rt3v3b: 'Nob · Platz {n} in 3v3 · will den Platz des Bosses',
  rtTable: 'Tabelle ›', rtTableT: 'Meine Elite-Wertung auf der Website: die Tabelle und meine Spiele', rtPlace: 'Platz {n}', rtCal: 'Kalibrierung: {g}/{k}' });

const RT = { sys: 'relic', own: null, err: false, busy: false };
try { RT.sys = localStorage.getItem('ratingSys') === 'elite' ? 'elite' : 'relic'; } catch (e) {}
const RT_MODES = ['1v1', '2v2', '3v3'];
const rtElite = () => RT.sys === 'elite';
// a mode of a lobby / a match as the table names them ("2v2"); anything else (4v4, FFA, "watch") has no Elite rating
const rtMode = m => { const k = String(m || '').toLowerCase().replace(/\s+/g, ''); return RT_MODES.includes(k) ? k : null; };
const rtOwn = (steam, mode) => ((RT.own && RT.own.players && RT.own.players[String(steam || '')]) || {})[mode] || null;
// the number a list shows: Elite of the mode (null: none / not known yet), else the Relic number the list carries
function rtNum(steam, mode, relic) {
  if (!rtElite()) return relic ? Number(relic) | 0 : null;
  const e = rtOwn(steam, rtMode(mode) || '1v1');
  return e && e.c != null ? e.c : null;
}
// the rating's cell of a row: the number, or a dash - Relic without one, Elite in calibration / without games (its tip says
// which mode has none) or a mode Elite has no table for (4v4)
function rtCell(steam, mode, relic) {
  if (!rtElite()) return relic ? `<span class="rt">${Number(relic) | 0}</span>` : '<span class="rt none">—</span>';
  const m = mode == null ? '1v1' : rtMode(mode), e = m && steam ? rtOwn(steam, m) : null;
  if (e && e.c != null) return `<span class="rt el">${e.c}</span>`;
  return m && RT.own ? `<span class="rt none" data-tip="${esc(t('rtNoneT', { mode: m }))}">—</span>` : '<span class="rt none">—</span>';
}
// a team's average on the same scale as its rows (the players with a number only)
function rtAvg(list) {   // list: [{steam, relic}], mode in each
  const v = list.map(p => rtNum(p.steam, p.mode, p.relic)).filter(x => x != null && x > 0);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
}
// the top three of the Elite table: every mode the player holds a place 1-3 in, in the modes' order
function rtTop(steam) {
  if (!RT.own) return [];
  return RT_MODES.map(m => { const e = rtOwn(steam, m); return e && e.rank && e.rank <= 3 ? { rank: e.rank, mode: m } : null; }).filter(Boolean);
}
const rtTopText = b => t('rt' + b.mode + (b.rank === 1 ? 'a' : 'b'), { n: b.rank });
// the badges by the name (a sigil each, its own tip): the mode's army, the place's metal
const rtBadge = steam => rtTop(steam).map(b => { const txt = rtTopText(b);
  return `<i class="rt-b m${b.mode} r${b.rank}" data-tip="${esc(txt)}" aria-label="${esc(txt)}"></i>`; }).join('');
// a name with the badge right after it, in rows where the name takes the free width (the lobby cards): one box for both, so the
// badge does not go to the row's far end; no badge - the name as it was
const rtName = (nameHtml, steam) => { const b = rtBadge(steam); return b ? `<span class="nmw">${nameHtml}${b}</span>` : nameHtml; };
// the (i) by the season in the profile: the page the ladder names (own_season.json "info", /own/all), else the site's Elite tab
const rtInfoUrl = () => (RT.own && RT.own.info) || (LIVE.host || 'https://dow2.fintebtc.de') + '/ladder/?lang=' + encodeURIComponent(lang) + '#elite';
const rtSeasonName = () => RT.own ? (RT.own.preseason ? t('rtPre') : t('rtSeason', { s: RT.own.season || '' })) : '';
// the tip of a player: his name, then the picked system whole; the hours played when the list knows them
function rtTipText(steam, name, relic, hours) {
  const out = [name || onUser(steam).name || 'Player'];
  // every rating in every tip (owner 17.11.2026): the player may have an Elite rating while the viewer shows Relic - the picked
  // system first, then the other; Elite each mode (the number / the calibration's games / none), Relic its one number
  const r = relic || onUser(steam).rating, rl = r ? t('rtRelicLine', { r: Number(r) | 0 }) : t('rtNoRelic'), el = [];
  if (RT.own) {
    el.push(t('rtElite') + ' · ' + rtSeasonName());
    const k = RT.own.cal_games || 5;
    for (const m of RT_MODES) {
      const e = rtOwn(steam, m);
      el.push(e && e.c != null ? t('rtLine', { mode: m, r: e.c })
        : e && e.cal > 0 ? t('rtCalLine', { mode: m, g: e.g || 0, k }) : t('rtNoneLine', { mode: m }));
    }
  } else if (rtElite()) el.push(t(RT.err ? 'rtOff' : 'rtWait'));
  if (rtElite()) out.push(...el, rl); else out.push(rl, ...el);
  if (RT.own) rtTop(steam).forEach(b => out.push(rtTopText(b)));   // the badges are everybody's
  if (hours) out.push(t('hlTipH', { h: hours }));
  return out.join('\n');
}
// data-ptip on an element: layer.js asks rtTipOf for its text when the mouse comes (always the current table)
const rtTipAttr = (steam, name, relic, hours) => steam ? ` data-ptip="${esc(String(steam))}" data-pname="${esc(name || '')}"${relic ? ` data-prt="${Number(relic) | 0}"` : ''}${hours ? ` data-ph="${esc(String(hours))}"` : ''}` : '';
window.rtTipOf = a => rtTipText(a.dataset.ptip, a.dataset.pname, a.dataset.prt ? Number(a.dataset.prt) : null, a.dataset.ph || null);

// the table from the ladder: at the start and every 2 min; a change redraws what shows ratings
async function rtLoad() {
  if (RT.busy) return; RT.busy = true;
  let d = null;
  try { d = await invoke('own_get'); } catch (e) { d = null; }
  RT.busy = false;
  if (d && d.players) { const same = JSON.stringify(d) === JSON.stringify(RT.own); RT.own = d; RT.err = false; if (!same) rtRepaint(); }   // the badges: both systems
  else if (!RT.own) { RT.err = true; if (rtElite()) rtRepaint(); }
}
function rtRepaint() {
  if (typeof chMe === 'function') chMe();
  if (typeof onRender === 'function' && LIVE.ok) onRender();
  if (typeof roomsPaint === 'function') { roomsPaint(); if (typeof rApplyFilter === 'function') rApplyFilter(); }
  if (typeof lrRender === 'function') lrRender();
  if (typeof hlRender === 'function') hlRender();
  if (typeof chRender === 'function') chRender();   // not forced: a reader up in the history stays where he is
  if (typeof lcPaint === 'function') lcPaint(true);
}
function rtSet(sys) {
  RT.sys = sys === 'elite' ? 'elite' : 'relic';
  try { localStorage.setItem('ratingSys', RT.sys); } catch (e) {}
  if (!RT.own) rtLoad();
  rtRepaint();
}
rtLoad();
setInterval(() => { if (!document.hidden) rtLoad(); }, 120000);

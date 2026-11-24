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
//    warbosses were too many): 1v1 the Space Marines (the Captain, the Veterans; 1.6.31 SirItos 20.11: was the Reclusiarch), 2v2 the Imperial Guard (the Lord General,
//    the Commissars), 3v3 the Orks (the Warboss - the horned skull, the Nobs - Gork's head); 1st gold, 2nd silver, 3rd bronze; one badge per mode he is in.
//    1.6.32 (owner 24.11.2026): their texts - the title and the place only ("Ноб · 2-е место в 3v3")
// The Elite table comes whole from the ladder (/ladder/api/own/all, lroom.rs own_get), every 2 min whichever system is picked - the
// badges are everybody's (the site recomputes the table every 5).
'use strict';
Object.assign(T.en, { rtMineT: 'Click: my Elite rating page on the site', rtRules: 'How it is counted ›', rtRulesT: 'How the Elite rating works: what a win, a loss and a leave give, calibration, the first 3 minutes, how opponents are found', rtOpenT: 'Click: this player\'s Elite page on the site', rtTopT: 'Click: the {mode} table on the site', lnkTable: 'Elite rating table' });   // 1.6.20 (SirItos): the site's links
Object.assign(T.en, { rtInfoT: 'About the Elite rating and its season', rtNoneT: 'No Elite rating in {mode} yet: calibration or no games', rtElite: 'Elite rating', rtRelic: 'Relic rating',
  rtUse: 'Elite rating', rtUseT: 'On: the launcher shows the Elite rating everywhere - our season, our servers, a rating per mode. Off: the Relic rating. Only the display changes: every game through our Find a Game counts for the Elite rating either way.',
  rtPre: 'preseason', rtSeason: 'season {s}', rtLine: '{mode} — {r}', rtCalLine: '{mode} — calibration: {g}/{k}',
  rtNoneLine: '{mode} — no games yet', rtRelicLine: 'Relic rating: {r}', rtNoRelic: 'Relic rating: none', rtRelicNote: 'one number for every mode: Relic\'s Elo of the custom games',
  rtOff: 'Elite rating: the server did not answer', rtWait: 'Elite rating: loading…', rt1v1a: 'Captain · place 1 in 1v1', rt1v1b: 'Veteran · place {n} in 1v1', rt2v2a: 'Lord General · place 1 in 2v2', rt2v2b: 'Commissar · place {n} in 2v2', rt3v3a: 'Warboss · place 1 in 3v3', rt3v3b: 'Nob · place {n} in 3v3',
  rtTable: 'Table ›', rtTableT: 'The Elite rating table on the site', rtPlace: 'place {n}', rtCal: 'calibration: {g}/{k}' });
Object.assign(T.ru, { rtMineT: 'Клик — моя страница рейтинга Elite на сайте', rtRules: 'Как считается ›', rtRulesT: 'Как работает рейтинг Elite: что дают победа, поражение и уход, калибровка, первые 3 минуты, как подбираются соперники', rtOpenT: 'Клик — страница игрока в рейтинге Elite на сайте', rtTopT: 'Клик — таблица {mode} на сайте', lnkTable: 'Таблица рейтинга Elite' });   // 1.6.20 (SirItos): the site's links
Object.assign(T.ru, { rtInfoT: 'О рейтинге Elite и его сезоне', rtNoneT: 'Рейтинга Elite в {mode} пока нет: калибровка или ещё нет игр', rtElite: 'Рейтинг Elite', rtRelic: 'Рейтинг Relic',
  rtUse: 'Рейтинг Elite', rtUseT: 'Включено: лаунчер везде показывает рейтинг Elite — наш сезон, наши серверы, свой рейтинг в каждом режиме. Выключено — рейтинг Relic. Меняется только отображение: все игры через наш Find a Game идут в рейтинг Elite в любом случае.',
  rtPre: 'предсезон', rtSeason: 'сезон {s}', rtLine: '{mode} — {r}', rtCalLine: '{mode} — калибровка: {g}/{k}',
  rtNoneLine: '{mode} — игр ещё нет', rtRelicLine: 'Рейтинг Relic: {r}', rtNoRelic: 'Рейтинг Relic: нет', rtRelicNote: 'одно число на все режимы: Elo Relic по кастомным играм',
  rtOff: 'Рейтинг Elite: сервер не ответил', rtWait: 'Рейтинг Elite: загружается…', rt1v1a: 'Капитан · 1-е место в 1v1', rt1v1b: 'Ветеран · {n}-е место в 1v1', rt2v2a: 'Лорд-генерал · 1-е место в 2v2', rt2v2b: 'Комиссар · {n}-е место в 2v2', rt3v3a: 'Варбосс · 1-е место в 3v3', rt3v3b: 'Ноб · {n}-е место в 3v3',
  rtTable: 'Таблица ›', rtTableT: 'Таблица рейтинга Elite на сайте', rtPlace: 'место {n}', rtCal: 'калибровка: {g}/{k}' });
Object.assign(T.es, { rtMineT: 'Clic: mi página del rating Elite en el sitio', rtRules: 'Cómo se calcula ›', rtRulesT: 'Cómo funciona el rating Elite: qué dan una victoria, una derrota y un abandono, la calibración, los primeros 3 minutos, cómo se buscan rivales', rtOpenT: 'Clic: la página Elite de este jugador en el sitio', rtTopT: 'Clic: la tabla {mode} en el sitio', lnkTable: 'Tabla del rating Elite' });   // 1.6.20 (SirItos): the site's links
Object.assign(T.es, { rtInfoT: 'Sobre el rating Elite y su temporada', rtNoneT: 'Aún sin rating Elite en {mode}: calibración o sin partidas', rtElite: 'Rating Elite', rtRelic: 'Rating de Relic',
  rtUse: 'Rating Elite', rtUseT: 'Activado: el launcher muestra en todas partes el rating Elite: nuestra temporada, nuestros servidores, un rating por modo. Desactivado: el rating de Relic. Solo cambia lo que se muestra: todas las partidas de nuestro Find a Game cuentan para el rating Elite de todos modos.',
  rtPre: 'pretemporada', rtSeason: 'temporada {s}', rtLine: '{mode} — {r}', rtCalLine: '{mode} — calibración: {g}/{k}',
  rtNoneLine: '{mode} — aún sin partidas', rtRelicLine: 'Rating de Relic: {r}', rtNoRelic: 'Rating de Relic: ninguno', rtRelicNote: 'un número para todos los modos: el Elo de Relic de las partidas personalizadas',
  rtOff: 'Rating Elite: el servidor no respondió', rtWait: 'Rating Elite: cargando…', rt1v1a: 'Capitán · puesto 1 en 1v1', rt1v1b: 'Veterano · puesto {n} en 1v1', rt2v2a: 'Lord General · puesto 1 en 2v2', rt2v2b: 'Comisario · puesto {n} en 2v2', rt3v3a: 'Kaudillo · puesto 1 en 3v3', rt3v3b: 'Noble · puesto {n} en 3v3',
  rtTable: 'Tabla ›', rtTableT: 'La tabla del rating Elite en el sitio', rtPlace: 'puesto {n}', rtCal: 'calibración: {g}/{k}' });
Object.assign(T.fr, { rtMineT: 'Clic : ma page du classement Elite sur le site', rtRules: 'Comment c\'est calculé ›', rtRulesT: 'Comment fonctionne le classement Elite : ce que rapportent une victoire, une défaite et un abandon, le calibrage, les 3 premières minutes, la recherche d\'adversaires', rtOpenT: 'Clic : la page Elite de ce joueur sur le site', rtTopT: 'Clic : le tableau {mode} sur le site', lnkTable: 'Tableau du classement Elite' });   // 1.6.20 (SirItos): the site's links
Object.assign(T.fr, { rtInfoT: 'À propos du classement Elite et de sa saison', rtNoneT: 'Pas encore de classement Elite en {mode} : calibrage ou aucune partie', rtElite: 'Classement Elite', rtRelic: 'Classement Relic',
  rtUse: 'Classement Elite', rtUseT: 'Activé : le launcher affiche partout le classement Elite - notre saison, nos serveurs, un classement par mode. Désactivé : le classement Relic. Seul l\'affichage change : toutes les parties de notre Find a Game comptent pour le classement Elite dans tous les cas.',
  rtPre: 'présaison', rtSeason: 'saison {s}', rtLine: '{mode} — {r}', rtCalLine: '{mode} — calibrage : {g}/{k}',
  rtNoneLine: '{mode} — aucune partie', rtRelicLine: 'Classement Relic : {r}', rtNoRelic: 'Classement Relic : aucun', rtRelicNote: 'un seul nombre pour tous les modes : l\'Elo Relic des parties personnalisées',
  rtOff: 'Classement Elite : le serveur n\'a pas répondu', rtWait: 'Classement Elite : chargement…', rt1v1a: 'Capitaine · place 1 en 1v1', rt1v1b: 'Vétéran · place {n} en 1v1', rt2v2a: 'Lord Général · place 1 en 2v2', rt2v2b: 'Commissaire · place {n} en 2v2', rt3v3a: 'Boss de guerre · place 1 en 3v3', rt3v3b: 'Nob · place {n} en 3v3',
  rtTable: 'Tableau ›', rtTableT: 'Le tableau du classement Elite sur le site', rtPlace: 'place {n}', rtCal: 'calibrage : {g}/{k}' });
Object.assign(T.de, { rtMineT: 'Klick: meine Seite der Elite-Wertung auf der Website', rtRules: 'Wie gezählt wird ›', rtRulesT: 'So funktioniert die Elite-Wertung: was Sieg, Niederlage und Verlassen bringen, Kalibrierung, die ersten 3 Minuten, wie Gegner gesucht werden', rtOpenT: 'Klick: die Elite-Seite dieses Spielers auf der Website', rtTopT: 'Klick: die {mode}-Tabelle auf der Website', lnkTable: 'Tabelle der Elite-Wertung' });   // 1.6.20 (SirItos): the site's links
Object.assign(T.de, { rtInfoT: 'Über die Elite-Wertung und ihre Saison', rtNoneT: 'Noch keine Elite-Wertung in {mode}: Kalibrierung oder keine Spiele', rtElite: 'Elite-Wertung', rtRelic: 'Relic-Wertung',
  rtUse: 'Elite-Wertung', rtUseT: 'An: Der Launcher zeigt überall die Elite-Wertung - unsere Saison, unsere Server, eine Wertung pro Modus. Aus: die Relic-Wertung. Nur die Anzeige ändert sich: Jedes Spiel über unser Find a Game zählt so oder so für die Elite-Wertung.',
  rtPre: 'Vorsaison', rtSeason: 'Saison {s}', rtLine: '{mode} — {r}', rtCalLine: '{mode} — Kalibrierung: {g}/{k}',
  rtNoneLine: '{mode} — noch keine Spiele', rtRelicLine: 'Relic-Wertung: {r}', rtNoRelic: 'Relic-Wertung: keine', rtRelicNote: 'eine Zahl für alle Modi: Relics Elo der Custom-Spiele',
  rtOff: 'Elite-Wertung: Der Server hat nicht geantwortet', rtWait: 'Elite-Wertung: wird geladen…', rt1v1a: 'Captain · Platz 1 in 1v1', rt1v1b: 'Veteran · Platz {n} in 1v1', rt2v2a: 'Lord-General · Platz 1 in 2v2', rt2v2b: 'Kommissar · Platz {n} in 2v2', rt3v3a: 'Waaaghboss · Platz 1 in 3v3', rt3v3b: 'Nob · Platz {n} in 3v3',
  rtTable: 'Tabelle ›', rtTableT: 'Die Tabelle der Elite-Wertung auf der Website', rtPlace: 'Platz {n}', rtCal: 'Kalibrierung: {g}/{k}' });

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
  const go = steam && m ? ` data-rtp="${esc(String(steam))}" data-rtm="${m}"` : '';   // 1.6.20: his page on the site (rtPlayerUrl)
  if (e && e.c != null) return `<span class="rt el go"${go}>${e.c}</span>`;
  return m && RT.own ? `<span class="rt none go"${go} data-tip="${esc(t('rtNoneT', { mode: m }) + '\n' + t('rtOpenT'))}">—</span>` : '<span class="rt none">—</span>';
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
  // 1.6.32 (owner 24.11.2026): the tip is just the title and the place ("Ноб · 2-е место в 3v3") - no "candidate", no "click"
  // (a click still opens that mode's table on the site)
  return `<i class="rt-b m${b.mode} r${b.rank} go" data-rtt="${b.mode}" data-tip="${esc(txt)}" aria-label="${esc(txt)}"></i>`; }).join('');
// a name with the badge right after it, in rows where the name takes the free width (the lobby cards): one box for both, so the
// badge does not go to the row's far end; no badge - the name as it was
const rtName = (nameHtml, steam) => { const b = rtBadge(steam); return b ? `<span class="nmw">${nameHtml}${b}</span>` : nameHtml; };
// 1.6.32 (owner 24.11.2026): the players of the Hall of Fame carry a purity seal LEFT of their name wherever a name shows (the
// rating's badges stay on its right); its tip is what the hall says of them - their title and what for; a click opens the hall at
// their entry (fame.js fameGo). The hall is /elite/fame.json (lroom.rs fame_get): at the start (the last copy from localStorage
// at once) and every 30 min. A person is found by the SteamID the hall gives ("steam": "7656..." or a list of them) - else by the
// name (letter case and the spaces at the ends aside); a person with a SteamID is never matched by the name.
const FAME_ORDER = '<svg viewBox="0 0 20 30" aria-hidden="true"><path d="M6.4 14.5L4.6 29.2l2.3-1.3 1.6 1.7 1-14.3z" fill="#e7dab8" stroke="#6f5f3c" stroke-width=".5"/><path d="M10.6 15.3l1 14.3 1.6-1.7 2.3 1.3-1.8-14.7z" fill="#d9c79b" stroke="#6f5f3c" stroke-width=".5"/><path d="M5.9 18.6h3.2M5.6 21h3.3M5.4 23.4h3.4M5.2 25.8h3.4M11.1 18.6h3.2M11.3 21h3.3M11.5 23.4h3.4M11.7 25.8h3.3" stroke="#6b5a37" stroke-width=".45"/><path d="M10.00 0.70L12.70 2.18L15.72 2.78L16.84 5.65L18.76 8.05L17.78 10.97L17.71 14.05L15.08 15.65L13.04 17.96L10.00 17.50L6.96 17.96L4.92 15.65L2.29 14.05L2.22 10.97L1.24 8.05L3.16 5.65L4.28 2.78L7.30 2.18z" fill="#a3221d" stroke="#4e0b09" stroke-width=".6"/><circle cx="10" cy="9.6" r="5.5" fill="#8a1814" stroke="#cf4b3f" stroke-width=".6"/><path d="M7.6 6.6h4.8M7.6 12.6h4.8M10 6.6v6" stroke="#e8786a" stroke-width="1.25" fill="none"/><circle cx="10" cy="9.6" r="1.1" fill="#e8786a"/></svg>';
const FM = { data: null, at: 0, busy: null, bySteam: new Map(), byName: new Map() };
const fmKey = n => String(n || '').trim().toLowerCase();
function fmIndex(d) {
  FM.data = d; FM.bySteam = new Map(); FM.byName = new Map();
  for (const p of (d && d.people) || []) {
    const ids = [].concat(p.steam || []).map(String).filter(x => /^\d{1,20}$/.test(x));
    ids.forEach(x => FM.bySteam.set(x, p));
    if (!ids.length && fmKey(p.name)) FM.byName.set(fmKey(p.name), p);
  }
}
try { const raw = localStorage.getItem('fameCache'), c = JSON.parse(raw || 'null'); if (c && c.people) { fmIndex(c); FM.str = raw; } } catch (e) {}
function fmLoad(force) {
  if (FM.busy) return FM.busy;
  if (!force && FM.at && Date.now() - FM.at < 1800000) return Promise.resolve(FM.data);
  FM.busy = (async () => {
    let d = null; try { d = await invoke('fame_get'); } catch (e) { d = null; }
    if (d && Array.isArray(d.people)) {
      const s = JSON.stringify(d), same = s === FM.str; FM.at = Date.now(); FM.str = s; fmIndex(d);
      if (!same) { try { localStorage.setItem('fameCache', s); } catch (e) {} rtRepaint(); }
    }
    return FM.data;
  })().finally(() => { FM.busy = null; });
  return FM.busy;
}
const fmFind = (steam, name) => (steam && FM.bySteam.get(String(steam))) || FM.byName.get(fmKey(name)) || null;
function fmSeal(steam, name) {
  const p = fmFind(steam, name); if (!p) return '';
  const tx = o => o ? (o[lang] || o.en || o.ru || '') : '';
  const role = tx(p.role), tip = t('fameTitle') + (role ? ': ' + role : '') + (tx(p.short) ? '\n' + tx(p.short) : '');
  return `<i class="fm-seal" data-fame="${esc(p.name)}" data-tip="${esc(tip)}" role="link" aria-label="${esc(t('fameTitle') + (role ? ': ' + role : ''))}">${FAME_ORDER}</i>`;
}
// a click on a seal opens the hall - before the row's own click (a chat name tags, a lobby card joins); inside a button the button wins
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('[data-fame]');
  if (!a || (a.closest('button') && !a.matches('button'))) return;
  e.preventDefault(); e.stopPropagation();
  if (typeof fameGo === 'function') fameGo(a.dataset.fame);
}, true);
// 1.6.20 (SirItos 17.11.2026): the site's Elite pages wherever the Elite rating shows - the table (/ladder/table?mode=), a player's
// page (/ladder/player/<steam>: his rating in every mode) and the rules (the table's "How the rating works",
// #how). The site speaks ru / en; 1.6.21: on the mirror the launcher uses now (app.js siteBase; every mirror serves /ladder/).
const rtSite = () => siteBase();
const rtLang = () => (lang === 'ru' ? 'ru' : 'en');
const rtTableUrl = m => `${rtSite()}/ladder/table?mode=${rtMode(m) || '1v1'}&lang=${rtLang()}`;
const rtPlayerUrl = (steam, m) => `${rtSite()}/ladder/player/${encodeURIComponent(steam)}?${rtMode(m) ? 'mode=' + rtMode(m) + '&' : ''}lang=${rtLang()}`;
const rtRulesUrl = () => `${rtSite()}/ladder/table?lang=${rtLang()}#how`;
// the (i) by the season in the profile: the page the ladder names (own_season.json "info", /own/all), else the rules on the site
const rtInfoUrl = () => (RT.own && RT.own.info) || rtRulesUrl();
// a click on an Elite number / dash (data-rtp = his SteamID, data-rtm = the mode) opens his page, on a top-3 badge (data-rtt = the
// mode) that mode's table - before the row's own click (a Home card, a chat name); inside a button (an invite) the button wins
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('[data-rtp],[data-rtt]');
  if (!a || (a.closest('button') && !a.matches('button'))) return;
  e.preventDefault(); e.stopPropagation();
  open(a.dataset.rtp ? rtPlayerUrl(a.dataset.rtp, a.dataset.rtm) : rtTableUrl(a.dataset.rtt));
}, true);
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
  // 1.6.32 (memory): the table stringified once (the last one's text kept), not both sides on every load
  if (d && d.players) { const s = JSON.stringify(d), same = s === RT.ownStr; RT.own = d; RT.ownStr = s; RT.err = false; if (!same) rtRepaint(); }   // the badges: both systems
  else if (!RT.own) { RT.err = true; if (rtElite()) rtRepaint(); }
}
function rtRepaint() {
  if (typeof chMe === 'function') chMe();
  if (typeof onRender === 'function' && LIVE.ok) onRender();
  if (typeof roomsPaint === 'function') { roomsPaint(); if (typeof rApplyFilter === 'function') rApplyFilter(); }
  if (typeof lrRender === 'function') lrRender();
  if (typeof hlRender === 'function') hlRender();
  if (typeof chRenderSoon === 'function') chRenderSoon();   // not forced: a reader up in the history stays where he is; 1.6.32: not while unseen
  if (typeof lcPaint === 'function') lcPaint(true);
  if (typeof rpRender === 'function' && typeof RP !== 'undefined' && RP.loaded) rpRender();   // 1.6.32: the seals by the replays' names
}
function rtSet(sys) {
  RT.sys = sys === 'elite' ? 'elite' : 'relic';
  try { localStorage.setItem('ratingSys', RT.sys); } catch (e) {}
  rtTellGame();
  if (!RT.own) rtLoad();
  rtRepaint();
}
// 1.6.20 (owner 17.11.2026): the in-game add-ons (LobbyStats 0.12, LoadingRatings 5) show the same rating - the launcher writes
// the pick into their LobbyStats.ini (addons.rs rating_sys_set), at the start and on a change; Play writes it again
function rtTellGame() { invoke('rating_sys_set', { sys: RT.sys }).catch(() => {}); }
rtTellGame();
rtLoad();
setInterval(() => { if (!pageHidden()) rtLoad(); }, 120000);
fmLoad(true);
setInterval(() => { if (!pageHidden()) fmLoad(); }, 600000);

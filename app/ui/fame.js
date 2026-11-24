// The Hall of Fame (owner 14.11.2026): a tab of Settings with the players who helped the launcher
// most - on top the one who helped most recently, 1-5 orders relative to the best one in the hall (no sorting by them), a click on
// a name opens what they did and what we changed thanks to it. The list lives on our server (/elite/fame.json, the site's
// /elite/fame/ shows the same) - edited there, no release needed. Texts of the list: en and ru, the rest fall back to en.
Object.assign(T.en, { fameTitle: 'Hall of Fame', fameSub: 'players who helped the launcher most', fameOpen: 'Open', fameLead: 'On top is the one who helped most recently. Click a name to see what they did and what changed thanks to them.', fameLast: 'last: {d}', fameChanged: 'What we changed:', fameOrders: 'Orders: {n} of 5, compared with the others in the hall', fameNone: 'The list did not load - try later.', fameSite: 'On the site' });
Object.assign(T.ru, { fameTitle: 'Зал славы', fameSub: 'игроки, которые больше всех помогли лаунчеру', fameOpen: 'Открыть', fameLead: 'Сверху — тот, кто помогал последним. Нажмите на имя: что сделано и что мы изменили благодаря этому.', fameLast: 'последний вклад: {d}', fameChanged: 'Что мы изменили:', fameOrders: 'Ордена: {n} из 5 — по сравнению с остальными в зале', fameNone: 'Список не загрузился — попробуйте позже.', fameSite: 'На сайте' });
Object.assign(T.es, { fameTitle: 'Salón de la fama', fameSub: 'los jugadores que más ayudaron al launcher', fameOpen: 'Abrir', fameLead: 'Arriba, quien ayudó más recientemente. Pulsa un nombre para ver qué hizo y qué cambió gracias a ello.', fameLast: 'último: {d}', fameChanged: 'Qué cambiamos:', fameOrders: 'Órdenes: {n} de 5, comparado con los demás', fameNone: 'La lista no se cargó; inténtalo más tarde.', fameSite: 'En la web' });
Object.assign(T.fr, { fameTitle: 'Panthéon', fameSub: 'les joueurs qui ont le plus aidé le launcher', fameOpen: 'Ouvrir', fameLead: 'En haut, celui qui a aidé le plus récemment. Cliquez sur un nom pour voir ce qui a été fait et ce que nous avons changé.', fameLast: 'dernier : {d}', fameChanged: 'Ce que nous avons changé :', fameOrders: 'Ordres : {n} sur 5, par rapport aux autres', fameNone: 'La liste ne s\'est pas chargée ; réessayez plus tard.', fameSite: 'Sur le site' });
Object.assign(T.de, { fameTitle: 'Ruhmeshalle', fameSub: 'die Spieler, die dem Launcher am meisten geholfen haben', fameOpen: 'Öffnen', fameLead: 'Oben steht, wer zuletzt geholfen hat. Einen Namen anklicken: was getan wurde und was sich dadurch geändert hat.', fameLast: 'zuletzt: {d}', fameChanged: 'Was wir geändert haben:', fameOrders: 'Orden: {n} von 5 im Vergleich zu den anderen', fameNone: 'Die Liste wurde nicht geladen – später erneut versuchen.', fameSite: 'Auf der Website' });

// 1.6.11 (owner 14.11.2026): the orders are purity seals - FAME_ORDER, rating.js since 1.6.32 (the seal by the names)
const fameTx = o => o ? (o[lang] || o.en || o.ru || '') : '';
const fameLast = p => (p.events || []).reduce((m, e) => (e.date > m ? e.date : m), '');
const fameScore = p => (p.events || []).reduce((s, e) => s + (e.changed ? 2 : 1), 0);
const fameDay = d => { try { return new Date(d + 'T12:00:00').toLocaleDateString(lang === 'en' ? 'en-GB' : lang, { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return d; } };
// 1.6.10: a tab of Settings (#setFame) instead of a window; loaded when the tab opens, again after 10 minutes
// 1.6.32: the list is the one rating.js keeps for the seals by the names (fmLoad: at the start, every 30 min); one draw at a time
let FAME_AT = 0, FAME_P = null;
function fameLoad(force) { return FAME_P || (FAME_P = fameDraw(force).finally(() => { FAME_P = null; })); }
async function fameDraw(force) {
  const box = document.getElementById('fameList'); if (!box) return;
  if (!force && FAME_AT && Date.now() - FAME_AT < 600000 && box.childElementCount) return;
  if (!box.childElementCount) box.innerHTML = '<div class="spin"></div>';
  const d = await fmLoad(force || !FM.at || Date.now() - FM.at > 600000);
  const ppl = ((d && d.people) || []).slice().sort((a, b) => fameLast(b).localeCompare(fameLast(a)));
  if (!ppl.length) { box.innerHTML = `<p class="note">${esc(t('fameNone'))}</p>`; return; }
  FAME_AT = Date.now();
  const best = Math.max(1, ...ppl.map(fameScore));
  box.innerHTML = ppl.map((p, i) => {
    const n = Math.max(1, Math.min(5, Math.round(5 * fameScore(p) / best)));
    const ords = Array.from({ length: 5 }, (_, k) => k < n ? FAME_ORDER : FAME_ORDER.replace('<svg ', '<svg class="off" ')).join('');
    const ev = (p.events || []).slice().sort((a, b) => b.date.localeCompare(a.date));
    return `<details class="fame-p" data-name="${esc(p.name)}"><summary><span class="fame-n">${i + 1}</span><span class="fame-h"><b>${esc(p.name)}</b>`
      + `<span class="fame-o" data-tip="${esc(t('fameOrders', { n }))}">${ords}</span><em>${esc(fameTx(p.role))}</em></span>`
      + `<span class="fame-d">${esc(t('fameLast', { d: fameDay(fameLast(p)) }))}</span><span class="fame-s">${esc(fameTx(p.short))}</span></summary>`
      + `<ul>${ev.map(e => `<li><span class="fame-dt">${esc(fameDay(e.date))}</span><div>${esc(fameTx(e.did))}</div>`
        + (e.changed ? `<div class="fame-c"><b>${esc(t('fameChanged'))}</b> ${esc(fameTx(e.changed))}</div>` : '') + '</li>').join('')}</ul></details>`;
  }).join('');
}
// 1.6.32 (owner 24.11.2026): a click on the seal by a name (rating.js fmSeal) - Settings › Hall of Fame, his entry open and lit
async function fameGo(name) {
  const tab = document.querySelector('.tab[data-view="settings"]'); if (tab) tab.click();
  const st = document.querySelector('.set-tab[data-set="setFame"]'); if (st) st.click();   // draws the list (fameLoad)
  await fameLoad();
  const el = [...document.querySelectorAll('#fameList .fame-p')].find(x => x.dataset.name === name); if (!el) return;
  document.querySelectorAll('#fameList .fame-p[open]').forEach(x => { if (x !== el) x.open = false; });
  el.open = true; el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
}
(() => { const b = document.getElementById('fameSite'); if (b) b.onclick = () => invoke('open_url', { url: siteUrl('/elite/fame/?lang=' + lang) }).catch(() => {}); })();

// The Hall of Fame (owner 14.11.2026): a tab of Settings with the players who helped the launcher
// most - on top the one who helped most recently, 1-5 orders relative to the best one in the hall (no sorting by them), a click on
// a name opens what they did and what we changed thanks to it. The list lives on our server (/elite/fame.json, the site's
// /elite/fame/ shows the same) - edited there, no release needed. Texts of the list: en and ru, the rest fall back to en.
Object.assign(T.en, { fameTitle: 'Hall of Fame', fameSub: 'players who helped the launcher most', fameOpen: 'Open', fameLead: 'On top is the one who helped most recently. Click a name to see what they did and what changed thanks to them.', fameLast: 'last: {d}', fameChanged: 'What we changed:', fameOrders: 'Orders: {n} of 5, compared with the others in the hall', fameNone: 'The list did not load - try later.', fameSite: 'On the site' });
Object.assign(T.ru, { fameTitle: 'Зал славы', fameSub: 'игроки, которые больше всех помогли лаунчеру', fameOpen: 'Открыть', fameLead: 'Сверху — тот, кто помогал последним. Нажмите на имя: что сделано и что мы изменили благодаря этому.', fameLast: 'последний вклад: {d}', fameChanged: 'Что мы изменили:', fameOrders: 'Ордена: {n} из 5 — по сравнению с остальными в зале', fameNone: 'Список не загрузился — попробуйте позже.', fameSite: 'На сайте' });
Object.assign(T.es, { fameTitle: 'Salón de la fama', fameSub: 'los jugadores que más ayudaron al launcher', fameOpen: 'Abrir', fameLead: 'Arriba, quien ayudó más recientemente. Pulsa un nombre para ver qué hizo y qué cambió gracias a ello.', fameLast: 'último: {d}', fameChanged: 'Qué cambiamos:', fameOrders: 'Órdenes: {n} de 5, comparado con los demás', fameNone: 'La lista no se cargó; inténtalo más tarde.', fameSite: 'En la web' });
Object.assign(T.fr, { fameTitle: 'Panthéon', fameSub: 'les joueurs qui ont le plus aidé le launcher', fameOpen: 'Ouvrir', fameLead: 'En haut, celui qui a aidé le plus récemment. Cliquez sur un nom pour voir ce qui a été fait et ce que nous avons changé.', fameLast: 'dernier : {d}', fameChanged: 'Ce que nous avons changé :', fameOrders: 'Ordres : {n} sur 5, par rapport aux autres', fameNone: 'La liste ne s\'est pas chargée ; réessayez plus tard.', fameSite: 'Sur le site' });
Object.assign(T.de, { fameTitle: 'Ruhmeshalle', fameSub: 'die Spieler, die dem Launcher am meisten geholfen haben', fameOpen: 'Öffnen', fameLead: 'Oben steht, wer zuletzt geholfen hat. Einen Namen anklicken: was getan wurde und was sich dadurch geändert hat.', fameLast: 'zuletzt: {d}', fameChanged: 'Was wir geändert haben:', fameOrders: 'Orden: {n} von 5 im Vergleich zu den anderen', fameNone: 'Die Liste wurde nicht geladen – später erneut versuchen.', fameSite: 'Auf der Website' });

// 1.6.11 (owner 14.11.2026): the orders are purity seals - red wax with an embossed I, two parchment strips of a litany
const FAME_ORDER = '<svg viewBox="0 0 20 30" aria-hidden="true"><path d="M6.4 14.5L4.6 29.2l2.3-1.3 1.6 1.7 1-14.3z" fill="#e7dab8" stroke="#6f5f3c" stroke-width=".5"/><path d="M10.6 15.3l1 14.3 1.6-1.7 2.3 1.3-1.8-14.7z" fill="#d9c79b" stroke="#6f5f3c" stroke-width=".5"/><path d="M5.9 18.6h3.2M5.6 21h3.3M5.4 23.4h3.4M5.2 25.8h3.4M11.1 18.6h3.2M11.3 21h3.3M11.5 23.4h3.4M11.7 25.8h3.3" stroke="#6b5a37" stroke-width=".45"/><path d="M10.00 0.70L12.70 2.18L15.72 2.78L16.84 5.65L18.76 8.05L17.78 10.97L17.71 14.05L15.08 15.65L13.04 17.96L10.00 17.50L6.96 17.96L4.92 15.65L2.29 14.05L2.22 10.97L1.24 8.05L3.16 5.65L4.28 2.78L7.30 2.18z" fill="#a3221d" stroke="#4e0b09" stroke-width=".6"/><circle cx="10" cy="9.6" r="5.5" fill="#8a1814" stroke="#cf4b3f" stroke-width=".6"/><path d="M7.6 6.6h4.8M7.6 12.6h4.8M10 6.6v6" stroke="#e8786a" stroke-width="1.25" fill="none"/><circle cx="10" cy="9.6" r="1.1" fill="#e8786a"/></svg>';
const fameTx = o => o ? (o[lang] || o.en || o.ru || '') : '';
const fameLast = p => (p.events || []).reduce((m, e) => (e.date > m ? e.date : m), '');
const fameScore = p => (p.events || []).reduce((s, e) => s + (e.changed ? 2 : 1), 0);
const fameDay = d => { try { return new Date(d + 'T12:00:00').toLocaleDateString(lang === 'en' ? 'en-GB' : lang, { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return d; } };
// 1.6.10: a tab of Settings (#setFame) instead of a window; loaded when the tab opens, again after 10 minutes
let FAME_AT = 0;
async function fameLoad(force) {
  const box = document.getElementById('fameList'); if (!box) return;
  if (!force && FAME_AT && Date.now() - FAME_AT < 600000 && box.childElementCount) return;
  if (!box.childElementCount) box.innerHTML = '<div class="spin"></div>';
  let d = null; try { d = await invoke('fame_get'); } catch (e) { d = null; }
  const ppl = ((d && d.people) || []).slice().sort((a, b) => fameLast(b).localeCompare(fameLast(a)));
  if (!ppl.length) { box.innerHTML = `<p class="note">${esc(t('fameNone'))}</p>`; return; }
  FAME_AT = Date.now();
  const best = Math.max(1, ...ppl.map(fameScore));
  box.innerHTML = ppl.map((p, i) => {
    const n = Math.max(1, Math.min(5, Math.round(5 * fameScore(p) / best)));
    const ords = Array.from({ length: 5 }, (_, k) => k < n ? FAME_ORDER : FAME_ORDER.replace('<svg ', '<svg class="off" ')).join('');
    const ev = (p.events || []).slice().sort((a, b) => b.date.localeCompare(a.date));
    return `<details class="fame-p"><summary><span class="fame-n">${i + 1}</span><span class="fame-h"><b>${esc(p.name)}</b>`
      + `<span class="fame-o" data-tip="${esc(t('fameOrders', { n }))}">${ords}</span><em>${esc(fameTx(p.role))}</em></span>`
      + `<span class="fame-d">${esc(t('fameLast', { d: fameDay(fameLast(p)) }))}</span><span class="fame-s">${esc(fameTx(p.short))}</span></summary>`
      + `<ul>${ev.map(e => `<li><span class="fame-dt">${esc(fameDay(e.date))}</span><div>${esc(fameTx(e.did))}</div>`
        + (e.changed ? `<div class="fame-c"><b>${esc(t('fameChanged'))}</b> ${esc(fameTx(e.changed))}</div>` : '') + '</li>').join('')}</ul></details>`;
  }).join('');
}
(() => { const b = document.getElementById('fameSite'); if (b) b.onclick = () => invoke('open_url', { url: siteUrl('/elite/fame/?lang=' + lang) }).catch(() => {}); })();

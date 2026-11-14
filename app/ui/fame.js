// The Hall of Fame (owner 14.11.2026): Settings > About > Hall of Fame opens a window with the players who helped the launcher
// most - on top the one who helped most recently, 1-5 orders relative to the best one in the hall (no sorting by them), a click on
// a name opens what they did and what we changed thanks to it. The list lives on our server (/elite/fame.json, the site's
// /elite/fame/ shows the same) - edited there, no release needed. Texts of the list: en and ru, the rest fall back to en.
Object.assign(T.en, { fameTitle: 'Hall of Fame', fameSub: 'players who helped the launcher most', fameOpen: 'Open', fameLead: 'On top is the one who helped most recently. Click a name to see what they did and what changed thanks to them.', fameLast: 'last: {d}', fameChanged: 'What we changed:', fameOrders: 'Orders: {n} of 5, compared with the others in the hall', fameNone: 'The list did not load - try later.', fameSite: 'On the site' });
Object.assign(T.ru, { fameTitle: 'Зал славы', fameSub: 'игроки, которые больше всех помогли лаунчеру', fameOpen: 'Открыть', fameLead: 'Сверху — тот, кто помогал последним. Нажмите на имя: что сделано и что мы изменили благодаря этому.', fameLast: 'последний вклад: {d}', fameChanged: 'Что мы изменили:', fameOrders: 'Ордена: {n} из 5 — по сравнению с остальными в зале', fameNone: 'Список не загрузился — попробуйте позже.', fameSite: 'На сайте' });
Object.assign(T.es, { fameTitle: 'Salón de la fama', fameSub: 'los jugadores que más ayudaron al launcher', fameOpen: 'Abrir', fameLead: 'Arriba, quien ayudó más recientemente. Pulsa un nombre para ver qué hizo y qué cambió gracias a ello.', fameLast: 'último: {d}', fameChanged: 'Qué cambiamos:', fameOrders: 'Órdenes: {n} de 5, comparado con los demás', fameNone: 'La lista no se cargó; inténtalo más tarde.', fameSite: 'En la web' });
Object.assign(T.fr, { fameTitle: 'Panthéon', fameSub: 'les joueurs qui ont le plus aidé le launcher', fameOpen: 'Ouvrir', fameLead: 'En haut, celui qui a aidé le plus récemment. Cliquez sur un nom pour voir ce qui a été fait et ce que nous avons changé.', fameLast: 'dernier : {d}', fameChanged: 'Ce que nous avons changé :', fameOrders: 'Ordres : {n} sur 5, par rapport aux autres', fameNone: 'La liste ne s\'est pas chargée ; réessayez plus tard.', fameSite: 'Sur le site' });
Object.assign(T.de, { fameTitle: 'Ruhmeshalle', fameSub: 'die Spieler, die dem Launcher am meisten geholfen haben', fameOpen: 'Öffnen', fameLead: 'Oben steht, wer zuletzt geholfen hat. Einen Namen anklicken: was getan wurde und was sich dadurch geändert hat.', fameLast: 'zuletzt: {d}', fameChanged: 'Was wir geändert haben:', fameOrders: 'Orden: {n} von 5 im Vergleich zu den anderen', fameNone: 'Die Liste wurde nicht geladen – später erneut versuchen.', fameSite: 'Auf der Website' });

const FAME_ORDER = '<svg viewBox="0 0 22 26" aria-hidden="true"><path d="M8 0h6l-1 2h-4z" fill="#8e1b1b"/><path d="M7 2h8v3H7z" fill="#b8252a"/>'
  + '<path d="M11 5l3 4 5-2-2 5 4 2-4 2 2 5-5-2-3 4-3-4-5 2 2-5-4-2 4-2-2-5 5 2z" fill="#d9b25f" stroke="#5a4214" stroke-width=".8"/>'
  + '<circle cx="11" cy="14" r="3.6" fill="#f3ead8" stroke="#5a4214" stroke-width=".6"/><circle cx="9.7" cy="13.6" r=".9" fill="#2a1d0e"/><circle cx="12.3" cy="13.6" r=".9" fill="#2a1d0e"/><path d="M10.2 16.3h1.6" stroke="#2a1d0e" stroke-width=".7"/></svg>';
const fameTx = o => o ? (o[lang] || o.en || o.ru || '') : '';
const fameLast = p => (p.events || []).reduce((m, e) => (e.date > m ? e.date : m), '');
const fameScore = p => (p.events || []).reduce((s, e) => s + (e.changed ? 2 : 1), 0);
const fameDay = d => { try { return new Date(d + 'T12:00:00').toLocaleDateString(lang === 'en' ? 'en-GB' : lang, { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return d; } };
async function fameShow() {
  const m = document.createElement('div'); m.className = 'modal fame-modal';
  m.innerHTML = `<div class="box"><h3>${esc(t('fameTitle'))}</h3><p class="fame-lead">${esc(t('fameLead'))}</p><div class="fame-list"><div class="spin"></div></div>`
    + `<div class="row"><button class="btn gold" data-x="1">${esc(t('roomsVerClose'))}</button><button class="btn ghost" data-site="1">${esc(t('fameSite'))}</button></div></div>`;
  document.body.appendChild(m);
  const end = () => m.remove();
  m.querySelector('[data-x]').onclick = end; m.onclick = e => { if (e.target === m) end(); };
  m.querySelector('[data-site]').onclick = () => invoke('open_url', { url: 'https://rts.fintebtc.de/elite/fame/?lang=' + lang }).catch(() => {});
  let d = null; try { d = await invoke('fame_get'); } catch (e) { d = null; }
  const box = m.querySelector('.fame-list');
  const ppl = ((d && d.people) || []).slice().sort((a, b) => fameLast(b).localeCompare(fameLast(a)));
  if (!ppl.length) { box.innerHTML = `<p>${esc(t('fameNone'))}</p>`; return; }
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
(() => { const b = document.getElementById('fameOpen'); if (b) b.onclick = fameShow; })();

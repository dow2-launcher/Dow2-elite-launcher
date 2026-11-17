// 1.6.11 (owner 14.11.2026): what the launcher tells the player outside the pages -
//  - the news in a dropdown from (i) after the version (the list app.js renders into #news), a dot on (i) while the newest
//    item is unread, the items of the version just installed marked "new";
//  - the "launcher updated" strip under the header, once per version (not after a fresh install): the first line of the
//    version's notes, More opens the news;
//  - the errors as red strips on top instead of the toast at the bottom (it went too fast to read): 30 s each, the timer
//    stops while the mouse is on it, three at most, the same text again restarts its strip.
Object.assign(T.en, { ntcLabel: 'Incoming message', newsAllVer: 'All launcher versions', newsNew: 'new', updDone: 'Launcher updated to {v}', updMore: 'More', closeX: 'Close', errSecs: '{n} sec' });
Object.assign(T.ru, { ntcLabel: 'Входящее сообщение', newsAllVer: 'Все версии лаунчера', newsNew: 'новое', updDone: 'Лаунчер обновлён до {v}', updMore: 'Подробнее', closeX: 'Закрыть', errSecs: '{n} с' });
Object.assign(T.es, { ntcLabel: 'Mensaje entrante', newsAllVer: 'Todas las versiones del launcher', newsNew: 'nuevo', updDone: 'Launcher actualizado a {v}', updMore: 'Más', closeX: 'Cerrar', errSecs: '{n} seg' });
Object.assign(T.fr, { ntcLabel: 'Message entrant', newsAllVer: 'Toutes les versions du launcher', newsNew: 'nouveau', updDone: 'Launcher mis à jour vers {v}', updMore: 'Plus', closeX: 'Fermer', errSecs: '{n} s' });
Object.assign(T.de, { ntcLabel: 'Eingehende Nachricht', newsAllVer: 'Alle Launcher-Versionen', newsNew: 'neu', updDone: 'Launcher auf {v} aktualisiert', updMore: 'Mehr', closeX: 'Schließen', errSecs: '{n} Sek.' });

// a fresh install has nothing in its storage yet (read before the start writes anything): no "updated" strip then
const NOTES = { fresh: (() => { try { return localStorage.length === 0; } catch (e) { return false; } })(), key: '', upd: false };

// ---------- the news dropdown ----------
// the version in a title, whole: "1.6.1" is not in "Launcher 1.6.11"
const newsHasVer = (title, v) => new RegExp('(^|[^\\d.])' + String(v).replace(/\./g, '\\.') + '(?![\\d.]*\\d)').test(title || '');
function newsMark() {   // after every render of the news (app.js render), and once here: the first render can come first
  const first = document.querySelector('#news .news-item');
  NOTES.key = first ? first.dataset.k || '' : '';
  let seen = ''; try { seen = localStorage.getItem('newsSeen') || ''; } catch (e) {}
  $('newsBtn').classList.toggle('unread', !!NOTES.key && seen !== NOTES.key);
  const v = S && S.launcher_version;
  if (v) document.querySelectorAll('#news .news-item').forEach(it => {
    const tt = it.querySelector('.t'); if (!tt || tt.querySelector('.nd-new') || !newsHasVer(tt.textContent, v)) return;
    it.classList.add('is-new'); tt.insertAdjacentHTML('beforeend', ` <span class="nd-new">${esc(t('newsNew'))}</span>`);
  });
  if (!NOTES.upd) { NOTES.upd = true; updDone(); } else updDoneText();
}
function newsShow(on) {
  const dd = $('newsDd'), b = $('newsBtn');
  dd.classList.toggle('hidden', !on); b.classList.toggle('on', on); b.setAttribute('aria-expanded', String(on));
  if (!on) return;
  try { localStorage.setItem('newsSeen', NOTES.key); } catch (e) {}
  b.classList.remove('unread');
  $('newsSub').textContent = [S && S.launcher_version ? 'DoW Launcher ' + S.launcher_version : '', S && /^\d/.test(S.installed_version || '') ? 'Elite ' + S.installed_version : ''].filter(Boolean).join(' · ');
  if (typeof newsFolds === 'function') newsFolds();
}
$('newsBtn').onclick = e => { e.stopPropagation(); newsShow($('newsDd').classList.contains('hidden')); };
$('newsX').onclick = () => newsShow(false);
$('newsDd').onclick = e => e.stopPropagation();
$('newsAll').onclick = () => open('https://github.com/dow2-launcher/Dow2-elite-launcher/releases');
document.addEventListener('click', () => { if (!$('newsDd').classList.contains('hidden')) newsShow(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('newsDd').classList.contains('hidden')) newsShow(false); });

// ---------- "launcher updated" ----------
function updDone() {
  const v = S && S.launcher_version; if (!v) { NOTES.upd = false; return; }
  let last = null; try { last = localStorage.getItem('lastVer'); localStorage.setItem('lastVer', v); } catch (e) { return; }
  if (last === v || (!last && NOTES.fresh)) return;
  updDoneText();
  $('updDone').classList.remove('hidden');
  $('ntcBar').classList.add('hidden');            // 1.6.20: the incoming message waits until this one is closed
}
function updDoneText() {
  const v = S && S.launcher_version; if (!v) return;
  const rel = (S.release_news || []).find(n => n.kind !== 'patches' && n.version === v), items = rel ? ((lang === 'ru' && (rel.items_ru || []).length ? rel.items_ru : rel.items) || []) : [];
  $('updDoneT').textContent = t('updDone', { v });
  $('updDoneS').textContent = items[0] || '';
  if (NTC.d) ntcShow();                           // another language picked: the message's own
}
$('updDoneX').onclick = () => { $('updDone').classList.add('hidden'); ntcShow(true); };
$('updDoneMore').onclick = e => { e.stopPropagation(); $('updDone').classList.add('hidden'); newsShow(true); ntcShow(true); };

// ---------- 1.6.20 (owner 17.11.2026): an incoming message ----------
// A message to the players: /elite/notice.json on our hosts (lroom.rs notice_get) - {id, ru: {title, short, full}, en: {...}, ...},
// edited there, no release needed; a new id shows it again. It comes after the "launcher updated" strip is closed (or when there is
// none): the same strip - the aquila, "Incoming message", two lines of it (short, else its first paragraph), More = a window with
// the whole text (paragraphs, "- " lists, **bold**, [a link](https://...), {badge:<mode>:<place>}); its cross or the window read
// through: not shown again.
// Owner 17.11.2026: it must reach everybody - it waits while the "launcher updated" strip is up, comes 0.8 s after that one is
// closed, sliding in (not in the same click), and its buttons take no click in its first 1.5 s (a double click on the update's
// cross must not close it unread); until its cross or its window it shows again at every start.
const NTC = { d: null, at: 0, t: 0 };
const NTC_DELAY = 800, NTC_GUARD = 1500;
const ntcText = () => { const d = NTC.d; if (!d || !d.id) return null; const x = d[lang] || d.en || d.ru; return x && (x.short || x.full) ? x : null; };
const ntcSeen = () => { try { return localStorage.getItem('noticeSeen') || ''; } catch (e) { return ''; } };
function ntcDone() { try { localStorage.setItem('noticeSeen', String(NTC.d && NTC.d.id || '')); } catch (e) {} if (typeof barHide === 'function') barHide($('ntcBar')); else $('ntcBar').classList.add('hidden'); }
function ntcShow(late) {
  const x = ntcText(), el = $('ntcBar');
  clearTimeout(NTC.t);
  if (!x || ntcSeen() === String(NTC.d.id) || !$('updDone').classList.contains('hidden')) { el.classList.add('hidden'); return; }
  $('ntcS').textContent = x.short || String(x.full).split(/\n\s*\n/)[0];
  if (!el.classList.contains('hidden')) return;
  const show = () => { NTC.at = Date.now(); if (typeof barShow === 'function') barShow(el); else el.classList.remove('hidden'); };
  if (late) NTC.t = setTimeout(show, NTC_DELAY); else show();
}
const ntcGuard = () => Date.now() - NTC.at < NTC_GUARD;
// {badge:2v2:3} - a badge of the Elite table's top three as the names carry it (rating.js rtBadge): the mode's army, the place's metal
const ntcInline = l => esc(l).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
  .replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g, (_, txt, url) => `<a href="#" data-url="${url}">${txt}</a>`)
  .replace(/\{badge:(1v1|2v2|3v3):([123])\}/g, (_, mode, n) => { const tip = typeof rtTopText === 'function' ? esc(rtTopText({ mode, rank: +n })) : '';
    return `<i class="rt-b m${mode} r${n}" data-tip="${tip}" aria-label="${tip}"></i>`; });
const ntcMd = s => String(s || '').trim().split(/\n\s*\n/).map(par => {
  const lines = par.split('\n');
  if (lines.every(l => /^\s*[-•]\s+/.test(l))) return `<ul>${lines.map(l => `<li>${ntcInline(l.replace(/^\s*[-•]\s+/, ''))}</li>`).join('')}</ul>`;
  return `<p>${lines.map(ntcInline).join('<br>')}</p>`;
}).join('');
function ntcOpen() {
  const x = ntcText(); if (!x) return;
  const m = document.createElement('div'); m.className = 'modal ntc-m';
  m.innerHTML = `<div class="box" role="dialog" aria-modal="true"><h3>${esc(x.title || t('ntcLabel'))}</h3><div class="ntc-full">${ntcMd(x.full || x.short)}</div>`
    + `<div class="row"><button class="btn gold">${esc(t('closeX'))}</button></div></div>`;
  document.body.appendChild(m);
  m.querySelectorAll('a[data-url]').forEach(a => a.onclick = e => { e.preventDefault(); open(a.dataset.url); });
  const end = () => { m.remove(); ntcDone(); };
  m.querySelector('.row .btn').onclick = end; m.onclick = e => { if (e.target === m) end(); };
}
$('ntcX').onclick = () => { if (!ntcGuard()) ntcDone(); };
$('ntcMore').onclick = e => { e.stopPropagation(); if (!ntcGuard()) ntcOpen(); };
(async () => { try { NTC.d = await invoke('notice_get'); } catch (e) { NTC.d = null; } ntcShow(); })();

// ---------- errors: red strips on top ----------
// 1.6.16 (owner 16.11.2026): the sigil with interference (style.css .gli) - the same pieces as the "launcher updated" aquila's
const GLI = '<i class="sig"></i><b class="gl-s"><i class="sig"></i></b><i class="sig gl-b"></i>';
const ERR_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
function errBar(msg) {
  const box = $('errBars'); if (!box) return;
  const text = String(msg || '');
  [...box.children].forEach(b => { if (b.dataset.msg === text) b.remove(); });   // the same error again: one strip, its timer anew
  const el = document.createElement('div');
  el.className = 'ubar err-bar'; el.setAttribute('role', 'alert'); el.dataset.msg = text;
  el.innerHTML = `<i class="ub-ico gli" aria-hidden="true">${GLI}</i><div class="ub-items"><div class="ub-it"><b>${esc(text)}</b></div></div><span class="eb-n"></span>`
    + `<span class="bn-act"><button class="btn small ghost eb-logs">${esc(t('sendLogs'))}</button><button class="x-btn eb-x" title="${esc(t('closeX'))}" aria-label="${esc(t('closeX'))}">${ERR_X}</button></span><i class="eb-tm" aria-hidden="true"></i>`;
  box.prepend(el);
  while (box.children.length > 3) box.lastElementChild.remove();
  let left = 30000, t0 = Date.now();
  const n = el.querySelector('.eb-n');
  const tick = () => {
    if (!el.isConnected) { clearInterval(tm); return; }
    if (!el.matches(':hover')) left -= Date.now() - t0;
    t0 = Date.now();
    n.textContent = t('errSecs', { n: Math.max(0, Math.ceil(left / 1000)) });
    if (left <= 0) { clearInterval(tm); el.remove(); }
  };
  const tm = setInterval(tick, 250); tick();
  el.querySelector('.eb-x').onclick = () => { clearInterval(tm); el.remove(); };
  el.querySelector('.eb-logs').onclick = () => { const s = $('sendLogsHome'); if (s) s.click(); };
}
if (S) newsMark();

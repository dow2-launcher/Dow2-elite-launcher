// Elite Launcher UI. Draws itself from the status the Rust side returns (get_status) and the
// signed launcher.json inside it. Rule: Play is never blocked by a new version — it is only offered.
'use strict';
const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;
const $ = id => document.getElementById(id);

let S = null;          // last status from Rust
let lang = 'en';
// the system's language (WebView2 takes the Windows display language): the first of ours among the preferred ones, else en
const LANG_NAMES = { en: 'English', ru: 'Русский', es: 'Español', fr: 'Français', de: 'Deutsch' };   // i18n-ok: each language by its own name
function sysLang() {
  for (const l of (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'])) {
    const c = String(l).slice(0, 2).toLowerCase(); if (LANG_NAMES[c]) return c;
  }
  return 'en';
}
let prog = null;       // last progress event

const t = (k, vars = {}) => (T[lang][k] || T.en[k] || k).replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? '');
const L = x => x == null ? '' : typeof x === 'string' ? x : (x[lang] || x.en || Object.values(x)[0] || '');
const mb = b => b >= 1e9 ? (b / 1e9).toFixed(2) + ' GB' : (b / 1e6).toFixed(b < 1e7 ? 2 : 1) + ' MB';
const mbps = b => b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB/s' : Math.max(1, Math.round(b / 1e3)) + ' KB/s';
// a round avatar: the picture over the default figure, which shows while it loads, when it fails or when there is none
const NEWS_OPEN = new Set();   // news items the player unfolded (date|title), for this run only
// "Read all" only where there is more to read: a text cut at 4 lines, or more than 3 items in the list. Measured only
// while the news are on screen (siritos 02.11: the window is redrawn also on another tab - a hidden text measures 0 and
// every button went), and again whenever the list shows up or changes its size.
function newsFolds() {
  const box = $('news');
  if (!box || !box.offsetWidth) return;   // not on screen: keep what was measured, the observer comes back
  box.querySelectorAll('.news-item').forEach(el => {
    const x = el.querySelector('.x'), b = el.querySelector('.news-fold');
    b.classList.toggle('hidden', !(el.classList.contains('open') || b.dataset.more === '1' || (x && x.scrollHeight > x.clientHeight + 1)));
  });
}
try { new ResizeObserver(() => newsFolds()).observe(document.getElementById('news')); } catch (e) {}
if (document.fonts) document.fonts.ready.then(() => newsFolds());
// the footer links' icons, by where they lead: Discord, ModDB (the mod's news), our stats / ladder (a chart), else a link
// 1.6.11: the useful links in Online's heading, in this order; launcher.json's own addresses win, ModDB is left out
// 1.6.16 (owner 16.11.2026): Discord is the DoW II server itself (not its Elite Mode channel), the Elite one is the E
const ON_LINKS = [['elite', /discord\.gg\//i, 'https://discord.gg/elitemod', 'lnkElite'], ['discord', /discord\.com\/channels\//i, 'https://discord.com/channels/285867613953851393', 'lnkDiscord'],
  ['stats', /\/stats\b/i, '/stats/', 'lnkStats'], ['ladder', /\/ladder\b/i, '/ladder/', 'lnkLadder']];
// 1.6.20 (SirItos 17.11.2026): "Ladder" leads to the Elite rating's table - /ladder/ shows it first (the games are a tab of that page),
// one link, not a second one for /ladder/table; no "match history" in its tip. Our pages open in the launcher's language: the
// ladder speaks ru / en, the stats every language (unknown - English)
const onLinkUrl = u => /^https:\/\/[^/]+\/(ladder|stats)\b/.test(u) && !/[?&]lang=/.test(u)
  ? u.replace(/(#.*)?$/, m => (u.includes('?') ? '&' : '?') + 'lang=' + (/\/ladder\b/.test(u) ? (lang === 'ru' ? 'ru' : 'en') : lang) + m) : u;
function onLinks(cfgLinks) {
  const box = $('onLinks'); if (!box) return;
  const ls = ON_LINKS.map(([, re, def, tip]) => ({ url: ((cfgLinks || []).find(l => re.test(l.url || '')) || {}).url || (def[0] === '/' ? siteUrl(def) : def), tip: t(tip) }));
  box.innerHTML = ls.map((l, i) => `<button class="foot-link" data-i="${i}" data-tip="${esc(l.tip)}" aria-label="${esc(l.tip)}">${linkIcon(l.url)}</button>`).join('');
  box.querySelectorAll('button').forEach(b => b.onclick = () => open(onLinkUrl(ls[+b.dataset.i].url)));
}
function linkIcon(url) {
  const u = String(url || '').toLowerCase();
  const svg = (body, fill) => `<svg viewBox="0 0 24 24" aria-hidden="true" class="${fill ? 'fill' : ''}">${body}</svg>`;
  if (u.includes('discord.gg/elitemod')) return '<b class="lnk-e" aria-hidden="true">E</b>';   // 1.6.11: the Elite Discord - its letter
  if (/\/ladder\b/.test(u)) return '<i class="sig s-cup" aria-hidden="true"></i>';   // the ladder = the Elite rating's table: the 40k chalice (the Absolvers')
  if (u.includes('discord')) return svg('<path d="M19.6 5.3A17 17 0 0 0 15.4 4l-.5 1.1a15.7 15.7 0 0 0-5.8 0L8.6 4a17 17 0 0 0-4.2 1.3C1.7 9.3 1 13.2 1.3 17a17.2 17.2 0 0 0 5.2 2.6l1.1-1.8a11 11 0 0 1-1.7-.8l.4-.3a12.2 12.2 0 0 0 11.4 0l.4.3a11 11 0 0 1-1.7.8l1.1 1.8a17.2 17.2 0 0 0 5.2-2.6c.4-4.4-.6-8.3-3.1-11.7zM8.7 14.7c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1zm6.6 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1z"/>', true);
  if (u.includes('moddb')) return svg('<path d="M4 5h13a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2V5z"/><path d="M19 9h1a1 1 0 0 1 1 1v8a1 1 0 0 1-2 0"/><path d="M7 9h8M7 12h8M7 15h5"/>');
  if (/\/(stats|ladder)\b/.test(u)) return '<i class="sig s-stats" aria-hidden="true"></i>';   // 1.6.16: a list, skulls for its bullets
  return svg('<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>');
}

// ---------- the events, a slider above the news (siritos 02.11) ----------
// launcher.json "events": [{id, title, start, end?, place?, url?}] (title / place: a string or {en, ru, ...}; start / end:
// ISO time with its zone). Shown: what goes on now and what starts in the next 14 days, one card at a time, as high as
// the player's card; the arrows, the dots or a swipe go to the next. The date is the main thing; "in 25 min" / "on now"
// only in the last 2 hours before the start.
// Where they come from (siritos 02.11): launcher.json "events" when the owner sets them; else events.json of the
// launcher repository, edited in git (events_get: GitHub, jsDelivr, the last copy, the built-in one), every 15 minutes.
let EVENTS = [];
function eventsLoad() { invoke('events_get').then(d => { EVENTS = (d && Array.isArray(d.events)) ? d.events : []; renderEvents(); }).catch(() => {}); }
eventsLoad();
setInterval(eventsLoad, 15 * 60000);
const EV = { i: 0, n: 0 };
function renderEvents() {
  const box = $('evBox'); if (!box || !S) return;
  const real = Array.isArray((S.config || {}).events), now = Date.now(), soon = now + 14 * 86400000;
  const list = (real ? S.config.events : EVENTS).map(e => ({ ...e, s: Date.parse(e.start), e: Date.parse(e.end || e.start) || Date.parse(e.start) }))
    .filter(e => e.s && e.e >= now && e.s <= soon).sort((a, b) => a.s - b.s);
  box.classList.toggle('hidden', !list.length);
  if (!list.length) return;
  EV.n = list.length; EV.i = Math.min(EV.i, EV.n - 1);
  // siritos 02.11: the card must say what and when - the title large (two lines), the day, the time from - to, the place;
  // big buttons on the sides to go to the next one
  const mins = e => Math.max(1, Math.round((e.s - now) / 60000));
  const soonTag = e => e.s <= now ? `<span class="ev-tag now">${esc(t('evNow'))}</span>`
    : e.s - now < 2 * 3600000 ? `<span class="ev-tag">${esc(mins(e) < 60 ? t('evInM', { n: mins(e) }) : t('evInH', { n: Math.round(mins(e) / 60) }))}</span>` : '';
  const d = ms => new Date(ms), hm = ms => d(ms).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  // the points under the title: "info" - a list, or {ru: [...], en: [...]}; an older event's "place" as one point
  const info = e => { const i = e.info, arr = Array.isArray(i) ? i : (i && typeof i === 'object' ? (i[lang] || i.en || []) : []);
    return (arr.length ? arr : e.place ? [L(e.place)] : []).slice(0, 3); };
  const card = e => `<div class="ev-card"><div class="ev-date"><b>${d(e.s).getDate()}</b><span>${esc(d(e.s).toLocaleDateString(lang, { month: 'short' }).replace('.', ''))}</span><i>${esc(hm(e.s))}</i></div>`
    + `<div class="ev-body"><div class="ev-t"><span title="${esc(L(e.title))}">${esc(L(e.title))}</span>${soonTag(e)}`
    + (e.url ? `<button class="news-link ev-link" data-url="${esc(e.url)}" title="${esc(t('newsLink'))}" aria-label="${esc(t('newsLink'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg></button>` : '') + '</div>'
    + (info(e).length ? `<ul class="ev-info">${info(e).map(x => `<li title="${esc(x)}">${esc(x)}</li>`).join('')}</ul>` : '') + '</div>'
    + '</div>';
  const side = dir => EV.n > 1 ? `<button class="ev-side" data-d="${dir}" aria-label="${dir < 0 ? '‹' : '›'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${dir < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}"/></svg></button>` : '';
  box.innerHTML = `<div class="ev-head"><span class="ev-h">${esc(t('evTitle'))}</span>${EV.n > 1 ? `<span class="ev-count">${EV.i + 1} / ${EV.n}</span>` : ''}</div>`
    + `<div class="ev-stage">${side(-1)}<div class="ev-view"><div class="ev-track" style="transform:translateX(-${EV.i * 100}%)">${list.map(card).join('')}</div></div>${side(1)}</div>`;
  const go = i => { EV.i = (i + EV.n) % EV.n; renderEvents(); };
  box.querySelectorAll('.ev-side').forEach(b => b.onclick = () => go(EV.i + Number(b.dataset.d)));
  box.querySelectorAll('[data-url]').forEach(b => b.onclick = () => open(b.dataset.url));
  // a swipe (mouse or touch) to the side: the next / the previous
  const view = box.querySelector('.ev-view'); let x0 = null;
  view.onpointerdown = e => { x0 = e.clientX; };
  view.onpointerup = e => { if (x0 != null && Math.abs(e.clientX - x0) > 40 && EV.n > 1) go(EV.i + (e.clientX < x0 ? 1 : -1)); x0 = null; };
}
setInterval(renderEvents, 60000);   // "in 25 min" goes on counting
const avatar = (url, cls = '') => `<i class="av ${cls}"${url ? ` style="--av:url('${String(url).replace(/['"()\\\s<>&]/g, encodeURIComponent)}')"` : ''}></i>`;
// 1.5.0: the D look's line icons (stroke = currentColor, sized by .ico)
const ICO = {
  steam: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="15" cy="9" r="3"/><circle cx="8" cy="16" r="2"/><path d="M3 13l5 3M12.5 10.5L9.5 14.5"/></svg>',
  bars: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V10M12 20V4M19 20v-7"/></svg>',
  out: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
  upload: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></svg>',
  info: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  enter: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5M10 17l5-5-5-5M15 12H3"/></svg>',
  eye: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M3 3l18 18"/></svg>',
  door: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21h16M6 21V4h9v17M15 6h3v15M12 12h.01"/></svg>',
  plus: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  crown: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/></svg>',
  lock: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  x: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  up: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  invite: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="4"/><path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1M19 8v6M16 11h6"/></svg>',
  seat: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 11V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6M4 11h16v5H4zM6 16v4M18 16v4"/></svg>',
  mail: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14"/><path d="M3 6l9 7 9-7"/></svg>',
  bell: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/></svg>',
};
// 1.5.0: an icon by name - the game's own (img/ui/icons/<name>.png, listed in img/ui/art.js by scripts/game-art) when it was
// extracted, else the line icon above
const ico = name => (window.ART_ICONS || []).includes(name) ? `<img class="ico art" src="img/ui/icons/${name}.png" alt="" aria-hidden="true">` : ICO[name] || '';
// 1.6.16 (owner 16.11.2026): the icons in the Warhammer 40k style - the sigils of sigils.css (github.com/Certseeds/wh40k-icon, the
// same library as the strips' sigils), sized as the line icons (.ico) and coloured by color. The line icons stay for the controls
// (close, arrows, the check, plus, the list's look, reload, upload / download, sign out, Join, the observer's eye, the bell of a call,
// the trash of Delete, the map of On the map) and the brands (Steam, Discord); the gear, the (i) by the version and the header's connection bars too. A lobby:
// the gate of Cadia (and the players' chat, 1.6.17: the Officio Prefectus' wide emblem was too big there); the host: the chaplain's skull; a seat: Troops; invite: the banner; stats: a list with skulls for its bullets.
const w40 = k => `<i class="ico sig s-${k}" aria-hidden="true"></i>`;
// 1.6.17 (owner 16.11.2026): an empty list - a sigil in the block's middle over a title and a hint, no plate: Home's lobbies and
// the Lobbies tab's open lobbies (Catachan's skull over blades), its running matches (the swords). 1.6.20 (owner 17.11.2026): all
// of them still - the interference is for what comes "on the screen" (the strips under the header), it looked out of place here
const zeroPane = (sig, title, hint, more) => `<div class="rp-none zero"><i class="sig zsig ${sig}" aria-hidden="true"></i>`
  + `<b>${esc(title)}</b>${hint ? `<span>${esc(hint)}</span>` : ''}${more || ''}</div>`;
// nothing under the filters: the same middle of the block, the line in the pane's title size, no sigil
const fltPane = () => `<div class="rp-none zero flt"><b>${esc(t('rNoneFilter'))}</b></div>`;
Object.assign(ICO, { door: w40('gate'), crown: w40('host'), invite: w40('banner'), seat: w40('seat'), bars: w40('stats'), up: w40('up'),
  purge: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13M10 11v5.5M14 11v5.5"/></svg>' });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const open = url => url && invoke('open_url', { url }).catch(e => toast(e, true));
// 1.6.21 (owner 17.11.2026): our site on the mirror the launcher uses now; open_url moves any link to our site (launcher.json,
// notice.json, the server's) onto that mirror too. 1.6.22: the ONE host of the window - links, the pictures of the maps, races and
// heroes, the live replay - is the launcher's active host (reach.rs, main.rs site_host; "host_active" when it changes), the same
// one the files, the chat and every other call use; no part of the window keeps a host of its own. A picture that does not load
// from it is asked from the next of our hosts in the launcher's order.
const SITE_RE = /^https?:\/\/(rts|dow2|dow2ru)\.fintebtc\.de(:443)?(?=[/?#]|$)/i;
let SITE_BASE = 'https://rts.fintebtc.de';
let SITE_LIST = [];   // our site's hosts in the launcher's order (Settings' list), for the pictures' fallback
const siteSet = h => { if (SITE_RE.test(h || '')) SITE_BASE = h.replace(/\/+$/, ''); };
const siteRefresh = () => invoke('site_host').then(siteSet).catch(() => {});
const siteBase = () => SITE_BASE;
const siteUrl = path => siteBase() + path;
const siteList = d => { const l = ((d && d.list) || []).map(r => String(r.base || '')).filter(b => SITE_RE.test(b)); if (l.length) SITE_LIST = l; };
siteRefresh();
listen('host_active', e => siteSet(e.payload && e.payload.site));
invoke('net_status').then(siteList).catch(() => {});
listen('net_rank', e => siteList(e.payload));
document.addEventListener('error', ev => {
  const i = ev.target;
  if (!(i instanceof HTMLImageElement) || (i.dataset.fb && i.onerror)) return;   // its own fallback first (a hero's icon -> the race's)
  const m = SITE_RE.exec(i.src || '');
  if (!m) return;
  const tried = (i.dataset.hosts || '').split(' ').filter(Boolean).concat(m[0].toLowerCase().replace(/:443$/, ''));
  const next = [SITE_BASE].concat(SITE_LIST).find(b => !tried.includes(b.toLowerCase()));
  if (!next) return;
  i.dataset.hosts = tried.join(' ');
  i.src = next + i.src.slice(m[0].length);
}, true);
// Windows long-path prefix from canonicalize() is noise for the player: \\?\G:\Steam → G:\Steam
const winPath = p => String(p || '').replace(/\\\\\?\\/g, '');
const day = d => {
  const x = new Date(String(d).slice(0, 10) + 'T12:00:00');
  return isNaN(x) ? d : x.toLocaleDateString(lang, { day: 'numeric', month: 'long', year: x.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
};

// 1.5.10: the errors of the Rust side and of our servers come as English text (a few as Russian): in the player's language
// here. A row: the pattern, the key, the names of its groups ({p}, {e}...); the technical tail (an OS or network message)
// stays as it came. Unknown texts are shown as they are. scripts/i18n_check.py checks every error text of the Rust code
// has its row.
const ERR_TXT = [
  // update::Error: "Network: ..." / "Disk: ..." around the cause (the cause is translated too)
  [/^Network: ([^]*)$/, 'errNet', ['e']],
  [/^Disk: ([^]*)$/, 'errDisk', ['e']],
  [/^files are being updated, wait a few seconds$/, 'errBusy'],
  [/^game folder not found$/, 'errNoGameDir'],
  [/^this is not the game folder$/, 'errNotGameDir'],
  [/^(\S+) not found in this folder$/, 'errNotFound', ['p']],
  [/^(.+): ([^]*) \(is the game running\?\)$/, 'errFileBusy', ['f', 'e']],
  [/^(.+): checksum mismatch after download$/, 'errChecksum', ['f']],
  [/^(\w+): "(.*)" is not a key the game knows$/, 'errHkKey', ['k', 'v']],
  [/^the game is running: close it to change add-ons or update$/, 'errGameRunning'],
  [/^already running$/, 'errUpdRunning'],
  [/^the game is already running$/, 'errGameAlready'],
  [/^unsupported link$/, 'errLink'],
  // macOS native game (1.5.12): a required add-on, a Mac add-on's dylib that differs from its manifest, the free space check
  [/^this add-on is required and cannot be turned off$/, 'errAddonRequired'],
  [/^(\S+): (.+) differs from the manifest$/, 'errMacDylib', ['c', 'f']],
  [/^not enough disk space: ([\d.]+) GB needed, ([\d.]+) GB free on the game's disk$/, 'errNoSpace', ['need', 'free']],
  [/^no connection to the update server yet$/, 'errNoConfig'],
  [/^no log files found yet/, 'errNoLogs'],
  [/^(log upload|the server) is not configured in this build$|^no mirrors configured$/, 'errNoHosts'],
  [/^could not send logs: ([^]*)$/, 'errLogs', ['e']],
  [/^cannot start (.+?) through Proton: ([^]*)$/, 'errStartProton', ['p', 'e']],
  [/^cannot start (.+?) as administrator: ([^]*)$/, 'errStartAdmin', ['p', 'e']],
  [/^cannot start (.+?): ([^]*)$/, 'errStart', ['p', 'e']],
  [/^no Proton prefix (.+) - start the game once from Steam$/, 'errNoPrefix', ['p']],
  [/^the game is not in a Steam library$/, 'errNotSteamLib'],
  [/^Steam not found$/, 'errNoSteam'],
  [/^no Proton found \(Steam maps the game to (.*)\)$/, 'errNoProton', ['e']],
  [/^no launcher update (on our hosts|found)$/, 'errNoLauncherUpd'],
  [/^the server does not answer$/, 'errNoAnswer'],
  [/^not on this system$/, 'errOs'],
  [/^the game has not written its key settings yet/, 'errNoKeys'],
  [/^Documents folder not found$/, 'errNoDocs'],
  [/^configuration\.lua is not what we expect$|^configuration\.lua: \w+ has no value$/, 'errCfgOdd'],
  [/^(configuration\.lua|keydefaults\.lua): ([^]*)$/, 'errGameFile', ['f', 'e']],
  [/^UI scale: (\d+)\.\.(\d+)$/, 'errUiScale', ['a', 'b']],
  [/^[Cc]ancelled$/, 'cancelled'],
  [/^offline: /, 'offline'],
  [/^timeout$/, 'errTimeout'],
  [/^(launcher\.json signature is invalid|manifest .+: signature is invalid)/, 'errSig'],
  [/^(launcher\.json: .+|bad version id|bad version|manifest version mismatch|manifest truncated|not an Elite manifest|unsafe path in manifest: .+|bad path in the archive: .+|the archive is too big|no index\.html in the archive|size \d+ instead of \d+|the checksum does not match)$/, 'errBadData', ['e']],
  [/^(unknown call|no room id|no room|no match|bad server|internal|secret key must be 32 bytes)$/, 'errInternal', ['e']],
  // the players' chat (community.py say) and the developers' chat (ladder.py fb/send)
  [/^sign in with Steam to write$/, 'chErrSignIn'],
  [/^you cannot write in the chat$/, 'chErrBanned'],
  [/^too fast$/, 'chErrFast'],
  [/^(blocked|rejected)$/, 'chErrModeration'],
  [/^(size|status code 413)$/, 'fbTooBig'],   // 1.6.20: fb/send refused the pictures (feedback.rs: a refusal is not sent to the next mirror)
];
// the servers' Russian texts (shown as they are in Russian, by their key in the other languages)
const SRV_TEXT_RU = { 'Не отправлено: сообщение не прошло модерацию': 'chErrModeration', 'Сообщение не отправлено: не прошло модерацию': 'fbModeration' };
const srvRuKey = s => { const k = Object.keys(SRV_TEXT_RU).find(p => s.startsWith(p)); return k ? SRV_TEXT_RU[k] : ''; };
function errText(e) {
  const s = String(e && e.message ? e.message : e == null ? '' : e).trim();
  const ru = srvRuKey(s);
  if (ru) return lang === 'ru' ? s : t(ru);
  for (const [re, key, names] of ERR_TXT) {
    const m = s.match(re); if (!m) continue;
    // {e} is a message of its own (the cause): translated too when it is one of these; never the whole text again
    const vars = {}; (names || []).forEach((n, i) => { const v = m[i + 1] != null ? m[i + 1] : m[0]; vars[n] = n === 'e' && v.length < s.length ? errText(v) : v; });
    return t(key, vars);
  }
  return s;
}
function toast(msg, err) {
  if (err && typeof errBar === 'function') return errBar(errText(msg));   // 1.6.11: a red strip on top for 30 s (notes.js)
  const el = $('toast'); el.textContent = err ? errText(msg) : String(msg); el.className = 'toast' + (err ? ' err' : '');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.add('hidden'), 4500);
}

function channelOf(id) { return (S.config?.channels || []).find(c => c.id === id); }

function verOpen(on) {
  $('verList').classList.toggle('hidden', !on);
  $('verBtn').classList.toggle('on', on);
}

// the add-on name in front of the number goes ("lobbystats-0.10.1" -> 0.10.1; the ids got "_r2"/"_r3" on 30.10 and no longer matched)
const verNum = x => String(x || '').replace(/^[a-z_]+-(?=[0-9])/i, '');
// what the last check changed, per add-on (siritos 02.11: marked on the add-on itself, not one line for all): new / ver / opts
const COMP_CHG = {};
// the Add-ons tab: what the last check changed, next to the name (the versions are in the line under the description)
function compChips(c) {
  const k = COMP_CHG[c.id];
  return '<span class="addon-chips">'
    + (k ? `<span class="chip hot">${esc(t(k === 'new' ? 'chipNew' : k === 'ver' ? 'chipUpdated' : 'chipOpts'))}</span>` : '')
    + '</span>';
}
// "Version 0.7.0", plus the one the next update brings
function compVer(c) {
  const v = verNum;
  if (VAN()) return !c.vanilla_ok ? t('eliteOnlyNote') : c.vanilla_installed ? t('vanillaCopy', { v: v(c.vanilla_installed) }) : c.latest ? t('addonVer', { v: v(c.latest) }) : '';
  return c.installed ? t('addonVer', { v: v(c.installed) }) + (c.latest && c.latest !== c.installed ? ', ' + t('addonNext', { v: v(c.latest) }) : '')
    : c.latest ? t('addonVer', { v: v(c.latest) }) : '';
}

// an add-on's options: ticks, or a list when the option has choices; the options of one group in a block under its heading
function optsHtml(c, lock) {
  const one = o => {
    const data = `data-comp="${esc(c.id)}" data-opt="${esc(o.id)}" ${lock ? 'disabled' : ''}`;
    return (o.choices || []).length
      ? `<label class="addon-opt pick"><span>${esc(L(o.name) || o.id)}</span><select ${data}>`
        + o.choices.map(ch => `<option value="${esc(ch.value)}" ${ch.value === o.value ? 'selected' : ''}>${esc(L(ch.name) || ch.value)}</option>`).join('') + '</select></label>'
      : `<label class="addon-opt"><input type="checkbox" ${data} ${o.on ? 'checked' : ''}>${esc(L(o.name) || o.id)}</label>`;
  };
  const parts = [];
  c.options.forEach(o => { const g = L(o.group), last = parts[parts.length - 1]; last && last.g === g ? last.list.push(o) : parts.push({ g, list: [o] }); });
  return parts.map(p => p.g ? `<div class="addon-sub"><div class="addon-grp">${esc(p.g)}</div>${p.list.map(one).join('')}</div>` : p.list.map(one).join('')).join('');
}

// The groups of the Add-ons tab, in this order. 1.4.8 (siritos 04.11): each add-on names its group and its place in it in
// its own launcher.json entry - "category" and "order" (a number, smaller = higher; Dow2-patches addons.json / store-texts.json).
// COMP_GROUPS is only the fallback for an entry without them (the store before those fields: the forwarding servers jumped
// between groups there); ids without the "_r2"/"_r3" ends
// 09.11.2026 (owner): "performance" - every speed-up add-on in its own group, marked as an experiment
// 1.6.24 (owner 18.11.2026): "debug" - the testers' and debugging group (speed measurements, trials, extra logging), last.
// A category this list does not know (a newer store) goes to "experiment" (compCat) - an add-on is never hidden by it
const COMP_CATS = ['network', 'interface', 'gameplay', 'fixes', 'performance', 'experiment', 'debug'];
const COMP_GROUPS = {
  network: ['relay', 'relay_fwd', 'automatch', 'steamkeep', 'ownlobby'],
  interface: ['matchtimer', 'apm', 'cooldowns', 'lobbystats', 'loadingratings', 'joinsound', 'rusifikator'],
  gameplay: ['reverse', 'jumpretry', 'reinforcefix'],
  fixes: ['elitefix_wmic', 'obsfix', 'crashlog'],
  performance: [],
  experiment: ['roomjoin', 'netprobe'],
  debug: [],
};
const compBase = c => String(c.id).replace(/_(r\d+|off)$/, '');
// 1.6.23 (owner 17.11.2026: "Hero bar fix" twice on a Mac): the add-on lists the launcher shows - the real ones (on macOS
// from components_macos) and, on macOS only, the Windows showcase (components_preview) minus every entry whose add-on has a
// Mac build already (herolabelfix vs herolabelfix_mac, nohints vs nohints_mac: the same base id without "_mac")
const macBase = c => compBase(c).replace(/_mac$/, '');
function compAll() {
  const real = (S && S.components || []).filter(compShown);
  if (!S || S.os !== 'macos') return real;
  const have = new Set(real.map(macBase));
  return real.concat((S.components_preview || []).filter(compShown).filter(c => !have.has(macBase(c))));
}
// an entry with "order" is a new one: its category is trusted; an old entry (no "order") keeps the old category only for an
// id this list does not know
const compCat = c => (Number.isFinite(c.order) && COMP_CATS.includes(c.category) && c.category)
  || COMP_CATS.find(k => COMP_GROUPS[k].includes(compBase(c)))
  || (COMP_CATS.includes(c.category) ? c.category : 'experiment');
const compRank = c => {
  if (Number.isFinite(c.order)) return c.order;
  const i = (COMP_GROUPS[compCat(c)] || []).indexOf(compBase(c));
  return i < 0 ? 1e6 : (i + 1) * 10;
};
// the groups the player folded (only a convenience: without storage everything is open)
const COMP_SHUT = new Set();
try { JSON.parse(localStorage.getItem('compShut') || '[]').forEach(k => COMP_SHUT.add(k)); } catch (e) {}
// an add-on taken away from everyone (its version "...-off": the old AI, the developers' diagnostics) is not shown at all
const compShown = c => !/(^|-)off$/i.test(String(c.latest || ''));
// 09.11.2026: the add-ons a ticked one does not work with (either side lists the other) and the ones it needs; a warning
// only - the player decides, nothing is unticked
function compWarns(c) {
  if (!c.enabled || c.preview) return [];
  const all = compAll(), b = compBase(c), nm = x => L(x.name) || x.id, out = [];
  const ex = all.filter(x => x !== c && x.enabled && ((c.excludes || []).includes(compBase(x)) || (x.excludes || []).includes(b)));
  if (ex.length) out.push(t('addonExcl', { names: ex.map(nm).join(', ') }));
  const rq = (c.requires || []).map(id => all.find(x => compBase(x) === id)).filter(Boolean);
  if (rq.length && !rq.some(x => x.enabled)) out.push(t('addonReq', { names: rq.map(nm).join(' / ') }));
  return out;
}
// 1.5.3 (owner 10.11: "an add-on that works only with another - turn the main one off and the second must go off at once"):
// the ticked add-ons left with none of the add-ons they need once `id` is off - and the ones that need those, in turn
function compDependentsOff(id) {
  const all = (S && S.components || []), me = all.find(c => c.id === id), off = new Set([compBase(me || { id })]), out = [];
  for (let more = true; more;) {
    more = false;
    for (const c of all) {
      if (!c.enabled || out.includes(c) || off.has(compBase(c))) continue;
      const rq = (c.requires || []).map(r => all.find(x => compBase(x) === r)).filter(Boolean);
      if (rq.length && rq.every(x => !x.enabled || off.has(compBase(x)))) { out.push(c); off.add(compBase(c)); more = true; }
    }
  }
  return out;
}
const compWarnHtml = (c, cls) => compWarns(c).map(w => `<div class="${cls}">${esc(w)}</div>`).join('');
const compWarnMark = c => compWarns(c).length ? `<span class="addon-warn" title="${esc(compWarns(c).join('; '))}">!</span>` : '';
// 1.4.11 (owner 05.11.2026): Play starts vanilla Retribution - the add-ons for Elite only are grey there, their switch locked
const VAN = () => !!(S && S.game_mode === 'vanilla');
// 1.6.5: a mod version with add-ons of its own game (IG Rework, status addon_game): the ones not made for it are grey too
// 1.6.23: a macOS showcase entry (preview: a Windows add-on, never installed) is grey too, its tick empty and locked
const naHere = c => !!c.preview || (VAN() && !c.vanilla_ok) || c.game_ok === false;
const naChip = c => c.preview ? `<span class="chip na" title="${esc(t('winOnlyNote'))}">${esc(t('winOnly'))}</span>`
  : c.game_ok === false && !VAN() ? `<span class="chip na" title="${esc(t('notThisModNote'))}">${esc(t('notThisMod'))}</span>`
  : `<span class="chip na" title="${esc(t('eliteOnlyNote'))}">${esc(t('eliteOnly'))}</span>`;
// add-on rows: a switch each and its own options under it once it is on; the details behind "?" on the home screen,
// written out on the Add-ons tab (full)
function compList(box, list, full) {
  // the game holds the add-on files while it runs; 1.5.4: a version that takes no add-ons (launcher.json "addons": false)
  const noAddons = !!(S.addons_blocked || S.addons_blocked_next);
  const lock = S.busy || S.game_running || noAddons;
  const nameHtml = c => { const n = L(c.name) || c.id, m = n.match(/^(.+?)\s*\(([^()]+)\)$/); return m ? `${esc(m[1])}<small>${esc(m[2])}</small>` : esc(n); };
  const card = c => `<div class="addon ${c.enabled && !naHere(c) ? '' : 'off'} ${naHere(c) ? 'na' : ''}"><div class="addon-row"><span class="addon-name" title="${esc(L(c.name) || c.id)}">${nameHtml(c)}</span>`
      + (full ? compChips(c) : '') + (naHere(c) ? naChip(c) : '')
      + (c.enabled && (c.conflicts || []).length ? `<span class="addon-warn" title="${esc(t('conflictActive'))}">!</span>` : '') + compWarnMark(c)
      + (full ? '' : `<button class="qm ${$('pop').dataset.id === c.id ? 'on' : ''}" data-info="${esc(c.id)}" aria-label="${esc(t('addonInfo', { name: L(c.name) || c.id }))}">?</button>`)
      + `<label class="switch"><input type="checkbox" role="switch" data-id="${esc(c.id)}" aria-label="${esc(L(c.name) || c.id)}" ${c.enabled && !c.preview ? 'checked' : ''} ${lock || naHere(c) || c.required ? 'disabled' : ''}><i></i></label></div>`
      + (full ? (L(c.description) ? `<p class="addon-desc">${esc(L(c.description))}</p>` : '')
          + `<div class="addon-ver">${esc([compVer(c), t('addonLater')].filter(Boolean).join(' · '))}</div>`
          + (c.enabled && (c.conflicts || []).length ? `<div class="addon-note">${esc(t('conflictActive'))}</div>` : '') + compWarnHtml(c, 'addon-note') : '')
      // the Add-ons tab: no box around the options (siritos 02.11) - "Settings" and the list under it
      + (c.enabled && !naHere(c) && (c.options || []).length ? '<div class="addon-opts">' + (full ? `<div class="addon-opts-h">${esc(t('addonSettings'))}</div>` : '') + optsHtml(c, lock) + '</div>' : '')
      + '</div>';
  // the Add-ons tab in groups (siritos 02.11): launcher.json "category" when the owner sets it, else by the add-on id
  const groups = full ? COMP_CATS.map(k => ({ k, list: list.filter(c => compCat(c) === k).map((c, i) => [c, i]).sort((a, b) => compRank(a[0]) - compRank(b[0]) || a[1] - b[1]).map(x => x[0]) })).filter(g => g.list.length) : null;
  // 1.5.0 (D): on the Add-ons tab every group is a panel; the panels go into 1 / 2 / 3 columns by the window's width, whole,
  // the columns about equally tall; an add-on is a row - a checkbox on the left (a click on the row ticks it), the name with
  // its marks, the description, its settings; the version on the right
  const row = c => `<div class="arow ${c.enabled && !naHere(c) ? '' : 'off'} ${naHere(c) ? 'na' : ''} ${lock || naHere(c) ? 'lock' : ''}">`
      + `<input type="checkbox" data-id="${esc(c.id)}" aria-label="${esc(L(c.name) || c.id)}" ${c.enabled && !c.preview ? 'checked' : ''} ${lock || naHere(c) || c.required ? 'disabled' : ''}>`
      + `<div class="arow-b"><div class="arow-n"><b>${nameHtml(c)}</b>${naHere(c) ? naChip(c) : ''}${compChips(c)}`
      + (c.enabled && (c.conflicts || []).length ? `<span class="addon-warn" title="${esc(t('conflictActive'))}">!</span>` : '') + compWarnMark(c) + '</div>'
      + (L(c.description) ? `<p class="addon-desc">${esc(L(c.description))}</p>` : '')
      + (c.enabled && (c.conflicts || []).length ? `<div class="addon-note">${esc(t('conflictActive'))}</div>` : '') + compWarnHtml(c, 'addon-note')
      + (c.enabled && !naHere(c) && (c.options || []).length ? '<div class="addon-opts">' + optsHtml(c, lock) + '</div>' : '')
      + `</div><div class="arow-v">${esc(compVer(c))}</div></div>`;
  let cols = '';
  if (full) {
    const n = window.innerWidth < 1000 ? 1 : window.innerWidth < 1600 ? 2 : 3, col = Array.from({ length: n }, () => ({ h: 0, g: [] }));
    // by the group's place in COMP_CATS, not by its height: a group never jumps to another column when the list changes
    groups.forEach(g => col[COMP_CATS.indexOf(g.k) % n].g.push(g));
    compList.cols = n;
    // a group folds on a click on its heading (kept for the next start); the heading says how many are on
    cols = `<div class="ag-cols">${col.map(c => `<div class="ag-col">${c.g.map(g => { const shut = COMP_SHUT.has(g.k), on = g.list.filter(x => x.enabled && !naHere(x)).length;
      return `<section class="ag-panel ${shut ? 'shut' : ''}"><button class="addon-gh" data-cat="${g.k}" aria-expanded="${!shut}">${esc(t('cat_' + g.k))}<span>${esc(t('addonsOnOf', { n: on, m: g.list.length }))}</span><b class="chev"></b></button>`
        + (shut ? '' : g.list.map(row).join('')) + '</section>'; }).join('')}</div>`).join('')}</div>`;
  }
  box.innerHTML = (S.game_running ? `<div class="addon-note">${esc(t('gameRunningAddons'))}</div>` : '')
    + (noAddons ? `<div class="addon-note">${esc(t('addonsOffVersion'))}</div>` : '') + (full ? cols : list.map(card).join(''));
  box.querySelectorAll('.arow').forEach(r => r.onclick = e => { if (e.target.closest('input,select,label,button,a,option')) return; const cb = r.querySelector('input[data-id]'); if (cb && !cb.disabled) cb.click(); });
  box.querySelectorAll('.addon-gh[data-cat]').forEach(b => b.onclick = () => {
    COMP_SHUT.has(b.dataset.cat) ? COMP_SHUT.delete(b.dataset.cat) : COMP_SHUT.add(b.dataset.cat);
    try { localStorage.setItem('compShut', JSON.stringify([...COMP_SHUT])); } catch (e) {}
    render();
  });
  box.querySelectorAll('.qm').forEach(b => b.onclick = e => { e.stopPropagation(); popAddon(b, list.find(c => c.id === b.dataset.info)); });
  box.querySelectorAll('input[data-opt]').forEach(cb => cb.onchange = () =>
    invoke('set_comp_option', { comp: cb.dataset.comp, opt: cb.dataset.opt, on: cb.checked }).then(reload).catch(e => toast(e, true)));
  box.querySelectorAll('select[data-opt]').forEach(sel => sel.onchange = () =>
    invoke('set_comp_value', { comp: sel.dataset.comp, opt: sel.dataset.opt, value: sel.value }).then(reload).catch(e => toast(e, true)));
  box.querySelectorAll('input[data-id]').forEach(cb => cb.onchange = async () => {
    const deps = cb.checked ? [] : compDependentsOff(cb.dataset.id);
    await invoke('set_component', { id: cb.dataset.id, on: cb.checked });
    for (const d of deps) await invoke('set_component', { id: d.id, on: false });
    if (deps.length) toast(t('addonDepsOff', { names: deps.map(x => L(x.name) || x.id).join(', ') }));
    if (S.installed_version || VAN()) { try { await invoke('start_update', { repair: false, componentsOnly: true }); S.busy = true; render(); } catch (e) { toast(e, true); } }
    else reload();
  });
}

// details of an add-on next to its "?": description, version, a hand-installed copy in the game folder
addEventListener('resize', () => { const n = window.innerWidth < 1000 ? 1 : window.innerWidth < 1600 ? 2 : 3; if (S && compList.cols && n !== compList.cols) render(); });
function popAddon(btn, c) {
  const pop = $('pop');
  if (!c || (pop.dataset.id === c.id && !pop.classList.contains('hidden'))) return popClose();
  pop.innerHTML = `<b>${esc(L(c.name) || c.id)}</b>` + (L(c.description) ? `<p>${esc(L(c.description))}</p>` : '')
    + `<div class="v">${esc([compVer(c), t('addonLater')].filter(Boolean).join(' · '))}</div>`
    + (c.enabled && (c.conflicts || []).length ? `<div class="w">${esc(t('conflictActive'))}</div>` : '') + compWarnHtml(c, 'w');
  pop.dataset.id = c.id;
  pop.classList.remove('nick');
  pop.classList.remove('hidden');
  document.querySelectorAll('.qm.on').forEach(x => x.classList.remove('on'));
  btn.classList.add('on');
  // to the left of the add-on panel, level with the row, so it covers none of the switches
  const r = btn.getBoundingClientRect(), panel = btn.closest('.panel').getBoundingClientRect();
  pop.style.left = Math.max(8, panel.left - pop.offsetWidth - 8) + 'px';
  pop.style.top = Math.max(8, Math.min(window.innerHeight - pop.offsetHeight - 8, r.top - 12)) + 'px';
}
function popClose() {
  $('pop').classList.add('hidden');
  $('pop').dataset.id = '';
  document.querySelectorAll('.qm.on').forEach(x => x.classList.remove('on'));
}

// the player menu (Online, chat, rooms, own card): mention him in the chat (signed in, not me, the name known), his stats
// on our site (the page finds him by SteamID and opens his card) or his Steam profile. Only the SteamID is needed.
function nickMenu(btn, steam, name, noTag) {
  // no SteamID (a player in the rooms while the server sends none): the stats found by his name, no Steam profile
  const pop = $('pop'), q = steam || name, id = 'nick:' + q;
  if (!q || (pop.dataset.id === id && !pop.classList.contains('hidden'))) return popClose();
  const urls = [siteUrl('/stats/?q=') + encodeURIComponent(q) + '&lang=' + encodeURIComponent(lang), steam ? 'https://steamcommunity.com/profiles/' + steam : ''];
  // noTag: a player who is not in our chat (the rooms: Relic's players) - no "mention"
  const tag = !noTag && name && CH.me && CH.me.signed_in && String(CH.me.steam) !== String(steam);
  pop.innerHTML = '<div class="nick-menu">' + (tag ? `<button data-tag="1">${esc(t('onTag'))}</button>` : '')
    + `<button data-u="0">${esc(t('nickStats'))}</button>` + (steam ? `<button data-u="1">${esc(t('nickSteam'))}</button>` : '') + '</div>';
  pop.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { popClose(); open(urls[b.dataset.u]); });
  pop.querySelectorAll('[data-tag]').forEach(b => b.onclick = () => { popClose(); chMention(name); });
  pop.dataset.id = id;
  pop.classList.add('nick');
  pop.classList.remove('hidden');
  // under the name, kept inside the window
  const r = btn.getBoundingClientRect();
  pop.style.left = Math.max(8, Math.min(window.innerWidth - pop.offsetWidth - 8, r.left)) + 'px';
  pop.style.top = (r.bottom + 4 + pop.offsetHeight > window.innerHeight - 8 ? r.top - pop.offsetHeight - 4 : r.bottom + 4) + 'px';
}
// a player's name or avatar: the menu on a click and on a right click; mention = a name in the chat, where a click
// mentions him (the owner's 1.3.6 / 1.3.12) and only the right click opens the menu
function nickBind(el, steam, name, mention, noTag) {
  if (!el) return;
  const menu = e => { e.preventDefault(); e.stopPropagation(); nickMenu(el, steam, name, noTag); };
  if (steam || name) { el.oncontextmenu = menu; el.style.cursor = 'pointer'; }
  if (mention && name) el.onclick = e => { e.stopPropagation(); popClose(); chMention(name); };
  else if (steam || name) el.onclick = menu;
}

// launcher self-update, offered and never forced. LU: a newer launcher this copy can install itself (launcher_check);
// without it the launcher_update of launcher.json links to the download page, as before.
let LU = null;
function renderLauncherBanner() {
  const lu = S.launcher_update, v = LU ? LU.version : lu?.version;
  // the launcher sits in the game folder: a banner under the header, it breaks the game
  $('launcherBanner').classList.toggle('hidden', !S.in_game_dir);
  if (S.in_game_dir) $('launcherText').textContent = t('inGameDir');
  // 1.5.0: a newer launcher is offered in the footer next to Play, as a newer Elite is; its download runs in the footer's bar
  // (launcher_progress). launcher.json already names a newer launcher and the updater has not found it yet (the mirrors copy a
  // release a little later): ask again every minute, not every 15, so Update comes without a restart (owner 03.11.2026)
  if (lu && (!LU || versionNewer(lu.version, LU.version))) launcherRetrySoon();
  // 1.5.3 (owner 10.11): the offer is a line of the strip under the header (renderUpdBar), not a box next to Play
  UPD.lu = !v || S.in_game_dir ? null : LU && LU.installing ? { b: t('launcherUpdatingTo', { v }) + (LU.pct ? ' ' + LU.pct : ''), busy: true }
    : { b: t('launcherNew', { v }), small: LU ? t('launcherRestarts') : '', run: LU ? launcherInstall : () => open(lu.url), get: !LU };
  renderUpdBar();
}
// the strip of updates: every update this copy has, in one line, and one button for them all - Elite first (a download in
// the footer's bar), then the launcher (it restarts). An Update of the launcher alone while a game runs or Elite downloads: off.
const UPD = { lu: null, elite: null, then: '' };
// 1.5.13 (owner 12.11.2026): the strips under the header (a ping, an invitation, the updates) slide open and shut
function barShow(el) {
  if (!el) return;
  if (el.classList.contains('shut') && !el.classList.contains('hidden')) { clearTimeout(el._bt); el.classList.remove('shut'); el.style.maxHeight = '140px'; el._bt = setTimeout(() => { el.classList.remove('anim'); el.style.maxHeight = ''; }, 320); return; }
  if (!el.classList.contains('hidden')) return;
  clearTimeout(el._bt); el.classList.remove('hidden'); el.classList.add('anim', 'shut'); el.style.maxHeight = '0px'; void el.offsetHeight;
  el.classList.remove('shut'); el.style.maxHeight = '140px';
  el._bt = setTimeout(() => { el.classList.remove('anim'); el.style.maxHeight = ''; }, 320);
}
function barHide(el) {
  if (!el || el.classList.contains('hidden') || el.classList.contains('shut')) return;
  clearTimeout(el._bt); el.style.maxHeight = el.offsetHeight + 'px'; el.classList.add('anim'); void el.offsetHeight;
  el.classList.add('shut'); el.style.maxHeight = '0px';
  el._bt = setTimeout(() => { el.classList.add('hidden'); el.classList.remove('anim', 'shut'); el.style.maxHeight = ''; }, 300);
}
function renderUpdBar() {
  const bar = $('updBar'); if (!bar || !S) return;
  const its = [UPD.elite, UPD.lu].filter(Boolean);
  if (!its.length) { barHide(bar); return; }
  barShow(bar);
  bar.querySelector('.ub-ico').innerHTML = ico('up');
  $('updItems').innerHTML = its.map(x => `<span class="ub-it${x.busy ? ' busy' : ''}"><b>${esc(x.b)}</b>${x.small ? `<small>${esc(x.small)}</small>` : ''}</span>`).join('');
  const todo = its.filter(x => x.run && !x.busy), b = $('updAll');
  b.classList.toggle('hidden', !todo.length);
  b.textContent = UPD.then ? t('ubBusy') : todo.length > 1 ? t('ubAll') : todo[0] && todo[0].get ? t('launcherGet') : t('ubOne');
  b.disabled = !!UPD.then || !!S.game_running || (!!S.busy && !UPD.elite);
  b.onclick = () => {
    if (UPD.elite && UPD.lu && UPD.lu.run && !UPD.lu.get) UPD.then = 'launcher';   // the launcher after Elite (render)
    (UPD.elite || todo[0]).run();
    renderUpdBar();
  };
}
// 1.4.2 (owner 03.11.2026): Relic's game servers checked at start (relic_probe); players with a bad way to them are OFFERED our
// forwarding servers (add-on relay_fwd, off by default) - never turned on for them. "Not now" hides the offer for this month.
let FWD = null;
function renderFwdBanner() {
  const b = $('fwdBanner'); if (!b) return;
  const c = (S?.components || []).find(x => x.id === 'relay_fwd');
  const key = 'fwdoffer:' + new Date().toISOString().slice(0, 7);
  const show = FWD && FWD.problem && c && !c.enabled && !(S.dismissed || []).includes(key) && !S.in_game_dir;
  b.classList.toggle('hidden', !show);
  if (!show) return;
  $('fwdText').textContent = t('fwdOffer', { why: relicWhy(FWD) }); b.title = $('fwdText').textContent;
  $('fwdBtn').textContent = t('fwdOn'); $('fwdLater').textContent = t('fwdLater');
  $('fwdBtn').disabled = !!S.busy || !!S.game_running;
  $('fwdBtn').onclick = fwdTurnOn;
  $('fwdLater').onclick = async () => { try { await invoke('set_setting', { key: 'dismiss', value: key }); } catch (e) {} FWD = null; reload(); };
}
// the reason in the player's language, from the check's fields (its "why" is the English line of the log)
function relicWhy(r) {
  if (!r) return '';
  if (r.closed > 0) return t('gnWhyClosed', { n: r.closed, m: (r.relays || r.relays_ms || []).length || 3 });
  if (r.stream_ok === false) return t('gnWhyStream', { kb: r.stream_kb || 0 });
  if (r.median_ms > 200) return t('gnWhySlow', { n: r.median_ms });
  if (r.old_bridge) return t('gnWhyBridge');
  return r.why || '';
}
async function fwdTurnOn() {
  try {
    await invoke('set_component', { id: 'relay_fwd', on: true });
    if (S.installed_version) { await invoke('start_update', { repair: false, componentsOnly: true }); S.busy = true; }
    toast(t('fwdDone')); FWD = null; reload();
  } catch (e) { toast(e, true); }
}
var FWD_LAST = null;   // the last Relic check that ran (the banner's FWD is cleared once the player answers it)
async function relicProbe() {
  try { FWD = await invoke('relic_probe'); } catch (e) { FWD = null; }
  if (FWD && !FWD.skipped) FWD_LAST = FWD;
  if (S) { renderFwdBanner(); renderGameNet(); }
}
let luRetry = null, luTries = 0;
function launcherRetrySoon() {
  if (luRetry || luTries >= 60) return;          // an hour at most (a portable copy never finds one: no self-update)
  luRetry = setTimeout(() => { luRetry = null; luTries++; launcherCheck(); }, luTries ? 60000 : 0);   // the first one at once
}
// "1.4.10" > "1.4.9"
function versionNewer(a, b) {
  const x = String(a || '').split('.').map(n => parseInt(n, 10) || 0), y = String(b || '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); }
  return false;
}
async function launcherCheck() {
  try { const r = await invoke('launcher_check'); if (r && !LU?.installing) LU = r; } catch (e) { /* offline: try again later */ }
  if (S) renderLauncherBanner();
}
async function launcherInstall() {
  LU.installing = true; LU.pct = ''; renderLauncherBanner(); viewKeep();
  try { await invoke('launcher_install'); }   // the launcher restarts into the new version
  catch (e) { LU.installing = false; renderLauncherBanner(); toast(t('launcherFail', { e: errText(e) }), true); try { localStorage.removeItem('viewKeep'); } catch (x) {} }
}

let trayLang = '';
function syncTrayLabels() {
  if (trayLang === lang) return;
  trayLang = lang;
  invoke('set_tray_labels', { open: t('trayOpen'), quit: t('trayQuit') }).catch(() => {});
}

// 1.6.3: the first render() can come before the scripts after this one are read (the status answered while the page still
// loaded replays.js), and the keys they add showed as they are ("replaysTab", "rpMine"). render() leaves a text whose key is
// not there yet empty; once every script ran, the empty ones (or still showing their key) get their text - only after the
// first render(), else they wait for it (no English flash before the player's language is known).
let textsShown = false;
const tHas = k => T[lang][k] != null || T.en[k] != null;
document.addEventListener('DOMContentLoaded', () => {
  if (!textsShown) return;
  const bare = (v, k) => !v || v === k;
  document.querySelectorAll('[data-t]').forEach(e => { if (bare(e.textContent, e.dataset.t)) e.textContent = t(e.dataset.t); });
  document.querySelectorAll('[data-tp]').forEach(e => { if (bare(e.placeholder, e.dataset.tp)) e.placeholder = t(e.dataset.tp); });
  document.querySelectorAll('[data-ta]').forEach(e => { if (bare(e.title, e.dataset.ta)) { e.title = t(e.dataset.ta); e.setAttribute('aria-label', e.title); } });
});
function render() {
  // the player's pick in Settings; none - the system's language (siritos 02.11), English when we have no translation
  lang = S.lang || sysLang();
  if (!T[lang]) lang = 'en';
  document.documentElement.lang = lang;
  syncTrayLabels();
  document.querySelectorAll('[data-t]').forEach(e => { if (tHas(e.dataset.t)) e.textContent = t(e.dataset.t); });
  renderFwdBanner();
  document.querySelectorAll('[data-tp]').forEach(e => { if (tHas(e.dataset.tp)) e.placeholder = t(e.dataset.tp); });
  document.querySelectorAll('[data-ta]').forEach(e => { if (tHas(e.dataset.ta)) { e.title = t(e.dataset.ta); e.setAttribute('aria-label', e.title); } });   // icon buttons
  textsShown = true;
  const cfg = S.config || {};

  renderLauncherBanner();

  // announcements
  const today = new Date().toISOString().slice(0, 10);
  $('announcements').innerHTML = (cfg.announcements || [])
    .filter(a => !(S.dismissed || []).includes(a.id) && (!a.until || a.until >= today))
    .map(a => `<div class="ann ${esc(a.style)}" data-url="${esc(a.url)}"><span class="tx">${esc(L(a.text))}</span>${a.id ? `<span class="cl" data-id="${esc(a.id)}">✕</span>` : ''}</div>`).join('');
  $('announcements').querySelectorAll('.ann').forEach(el => el.onclick = e => {
    if (e.target.dataset.id) { invoke('set_setting', { key: 'dismiss', value: e.target.dataset.id }).then(reload); return; }
    open(el.dataset.url);
  });

  // news: the team's posts from launcher.json and the release notes of the launcher and the patches, newest first
  // 02.11 (siritos): newest first also within one day (by the version in the title: 1.3.16 above 1.3.15); a release is
  // left out when the team wrote its own post about that version (in the player's language); a release has no link
  // (its GitHub page is not news for a player) and its title says "Launcher 1.3.16" / "Add-ons 0.1.6" in his language
  const verOf = s => (String(s || '').match(/(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
  const cmpVer = (a, b) => { for (let i = 0; i < 3; i++) { const d = (b[i] || 0) - (a[i] || 0); if (d) return d; } return 0; };
  // a link only when it leads somewhere about the post: the site's front page (".../elite/", what the launcher version
  // posts carry) is no link at all
  const posts = (cfg.news || []).map(n => ({ date: n.date || '', title: L(n.title), text: L(n.text), url: /^https?:\/\//.test(n.url || '') && !/^https?:\/\/[^/]+\/elite\/?$/.test(n.url) ? n.url : '' }));
  const told = new Set(posts.map(p => verOf(p.title).join('.')).filter(Boolean));
  const rel = (S.release_news || []).filter(n => !(n.kind !== 'patches' && told.has(verOf(n.version || n.title).join('.'))))
    .map(n => ({ date: n.date, ts: n.ts, title: n.version ? t(n.kind === 'patches' ? 'newsRelPatches' : 'newsRelLauncher', { v: n.version }) : n.title, items: (lang === 'ru' && (n.items_ru || []).length ? n.items_ru : n.items) || [] }));
  const news = posts.concat(rel)
    .sort((x, y) => String(y.date).localeCompare(String(x.date)) || cmpVer(verOf(x.title), verOf(y.title)) || String(y.ts || '').localeCompare(String(x.ts || '')))
    .slice(0, 12);
  // a news item is plain text (siritos 02.11: the whole item as a link led nowhere and cut the text): the link, when
  // there is one, is an icon next to the title; a long text or list folds open and shut under "Read all / Collapse"
  const nkey = n => n.date + '|' + n.title;
  $('news').innerHTML = news.map(n => {
    const isOpen = NEWS_OPEN.has(nkey(n)), items = n.items || [];
    return `<div class="news-item ${isOpen ? 'open' : ''}" data-k="${esc(nkey(n))}"><div class="nt"><div class="t">${esc(n.title)}</div>`
      + (n.url ? `<button class="news-link" data-url="${esc(n.url)}" title="${esc(t('newsLink'))}" aria-label="${esc(t('newsLink'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg></button>` : '')
      + '</div>' + (n.date ? `<div class="d">${esc(day(n.date))}</div>` : '')
      + (n.text ? `<div class="x">${esc(n.text)}</div>` : '')
      + (items.length ? `<ul>${(isOpen ? items : items.slice(0, 3)).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '')
      + `<button class="news-fold hidden" data-more="${items.length > 3 ? 1 : 0}">${esc(t(isOpen ? 'newsLess' : 'newsAll'))}</button></div>`;
  }).join('') || `<div class="news-empty">${esc(S.config_loaded ? t('noNews') : t('connecting'))}</div>`;
  $('news').querySelectorAll('.news-link').forEach(b => b.onclick = () => open(b.dataset.url));
  $('news').querySelectorAll('.news-item').forEach(el => {
    el.querySelector('.news-fold').onclick = () => { const k = el.dataset.k; NEWS_OPEN.has(k) ? NEWS_OPEN.delete(k) : NEWS_OPEN.add(k); render(); };
  });
  newsFolds();
  renderEvents();

  // links (siritos 02.11): no block of their own and no "All news on ModDB" under the news - icons in the footer, where
  // "Elite 3.2 is ready" and the game folder used to stand (the version is on the version button anyway)
  // 1.6.11 (owner 14.11.2026): in Online's heading - E (the Elite Discord), Discord (the Elite Mode channel), the stats, the
  // ladder (a cup); no ModDB. The addresses from launcher.json "links" when it has them, else ours
  onLinks(cfg.links || []);
  if (typeof newsMark === 'function') newsMark();

  // game / steam missing → guide the player
  const setup = $('setup');
  let setupHidden = false; try { setupHidden = localStorage.getItem('setupHidden') === '1'; } catch (e) {}
  // 1.5.0: "Hide" folds the block into a one-line banner under the header, Buy on Steam at its end; "More" opens it again
  $('gameBanner').classList.toggle('hidden', S.game_found || !setupHidden);
  if (!S.game_found && setupHidden) {
    const g = cfg.game || {};
    // 17.11.2026, macOS: never the catalog's "GOG and the macOS port are not supported" (the owner's 1.6.19 showed it) -
    // what is missing there: the Mac Steam and/or the native game
    $('gameBannerText').innerHTML = `<b>${esc(t('noGame'))}</b> — ${esc(S.os === 'macos' ? macFound() : (L(g.requirements) || t('noGameText')))}`;
    $('gameBannerMore').textContent = t('setupMore'); $('gameBannerBuy').textContent = t('getGame');
    $('gameBannerMore').onclick = () => { try { localStorage.removeItem('setupHidden'); } catch (e) {} render(); };
    $('gameBannerBuy').onclick = () => open(g.store_url || 'steam://store/56400');
    setup.classList.add('hidden');
  } else if (!S.game_found) {
    const g = cfg.game || {};
    // 16.11.2026, macOS: the native game (Feral) is what the launcher starts there - not the catalog's "the macOS port is not
    // supported" - and a line of what it found of Steam and the game
    const req = S.os === 'macos' ? t('macNoGameText') : (L(g.requirements) || t('noGameText'));
    setup.innerHTML = `<div class="setup-h"><h2>${esc(t('noGame'))}</h2><button class="btn small ghost" id="setupHide">${esc(t('setupHide'))}</button></div><p>${esc(req)}</p>${S.os === 'macos' ? `<p>${esc(macFound())}</p>` : ''}<div class="row">
      ${S.steam_found ? '' : `<button class="btn red" id="getSteam">${esc(t('getSteam'))}</button>`}
      <button class="btn gold" id="getGame">${esc(t('getGame'))}</button>
      <button class="btn" id="pick">${esc(t('browse'))}</button><button class="btn ghost" id="rescan">${esc(t('rescan'))}</button></div>`;
    setup.classList.remove('hidden');
    $('getGame').onclick = () => open(g.store_url || 'steam://store/56400');
    if ($('getSteam')) $('getSteam').onclick = () => open('https://store.steampowered.com/about/');
    $('pick').onclick = pickDir; $('rescan').onclick = reload;
    $('setupHide').onclick = () => { try { localStorage.setItem('setupHidden', '1'); } catch (e) {} render(); };
  } else setup.classList.add('hidden');

  // versions: a picker next to Play at the bottom; the main one marked, the installed one ticked, any other one switches in one click
  // 16.11.2026: macOS - only the native vanilla game (Elite's Windows DLLs do not load in Feral's game), no Elite versions
  const chans = S.os === 'macos' ? [] : (cfg.channels || []);
  const activeCh = chans.find(c => c.version === S.installed_version && c.id === S.installed_channel) || chans.find(c => c.version === S.installed_version);
  const mainCh = chans.find(c => c.id === S.main_channel);
  const locked = S.busy || S.game_running || !S.game_found || !S.config_loaded;
  // 1.4.11: in vanilla no Elite version is the one Play starts: the installed one is a click back to Elite (no download)
  const item = c => {
    const isActive = !VAN() && activeCh && c.id === activeCh.id, isMain = c.id === S.main_channel;
    const cost = (S.costs || {})[c.version];
    const hint = isActive ? '✓' : (activeCh && c.id === activeCh.id) ? t('installedTag') : cost === undefined ? t('needDl') : cost === 0 ? t('instant') : t('upTo', { s: mb(cost) });
    const tags = (isMain ? `<span class="tag main">${esc(t('main'))}</span>` : '') + (L(c.badge) && !isMain ? `<span class="tag beta">${esc(L(c.badge))}</span>` : '');
    const note = isMain ? t('mainNote') : L(c.description);
    return `<button class="vi ${isActive ? 'act' : ''}" data-id="${esc(c.id)}" ${isActive || locked ? 'disabled' : ''}><span class="nm"><b>${esc(L(c.name) || c.id)}</b>${tags}`
      + `${note ? `<small>${esc(note)}</small>` : ''}</span><span class="cost ${isActive || cost === 0 ? 'ok' : ''}"${isActive ? ` title="${esc(t('installedTag'))}"` : ''}>${esc(hint)}</span></button>`;
  };
  const live = chans.filter(c => !c.archive), arch = chans.filter(c => c.archive);
  const vanName = L(S.vanilla?.name) || t('vanillaName');
  const vanItem = S.vanilla_offered ? `<div class="lh">${esc(t('vanillaH'))}</div><button class="vi ${VAN() ? 'act' : ''}" data-game="vanilla" ${VAN() || S.busy || S.game_running || !S.game_found ? 'disabled' : ''}>`
    + `<span class="nm"><b>${esc(vanName)}</b><small>${esc(L(S.vanilla?.description) || t('vanillaNote'))}</small></span><span class="cost ok">${VAN() ? '✓' : ''}</span></button>` : '';
  $('verList').innerHTML = `<div class="lh">${esc(t('versions'))}</div>` + live.map(item).join('')
    + (arch.length ? `<div class="lh">${esc(t('archiveH'))}</div>` + arch.map(item).join('') : '') + vanItem;
  $('verList').querySelectorAll('.vi:not(:disabled)').forEach(b => b.onclick = async () => {
    verOpen(false);
    if (b.dataset.id && typeof lrVerAsk === 'function' && !(await lrVerAsk(b.querySelector('.nm b') ? b.querySelector('.nm b').textContent : b.dataset.id))) return;
    if (b.dataset.game === 'vanilla') return setGame('vanilla');
    if (VAN() && activeCh && b.dataset.id === activeCh.id) return setGame('elite');   // back to the installed Elite
    switchTo(b.dataset.id);
  });
  const shown = activeCh || (!S.installed_version && mainCh);
  if (VAN()) $('verBtn').innerHTML = `<b title="${esc(t('vanillaTag'))}">${esc(vanName)}</b>`;
  else $('verBtn').innerHTML = shown
    ? `<b>${esc(L(shown.name) || shown.id)}</b><small class="${activeCh ? 'ok' : ''}">${esc(activeCh ? '✓ ' + t('installedTag') : t('notInstalledShort'))}</small>`
    // the installed version is in no channel any more (the main one moved on): "3.2" → "Elite 3.2"
    : `<b>${esc(/^\d/.test(S.installed_version) ? 'Elite ' + S.installed_version : S.installed_version || '—')}</b>${S.installed_version ? `<small class="ok">✓ ${esc(t('installedTag'))}</small>` : ''}`;
  $('verBtn').disabled = !chans.length && !S.vanilla_offered;
  if (!chans.length && !S.vanilla_offered) verOpen(false);
  const notMain = !VAN() && activeCh && mainCh && activeCh.id !== mainCh.id;
  $('verWarn').classList.toggle('hidden', !notMain && !VAN());
  if (VAN()) $('verWarn').textContent = t('vanillaWarn');
  else if (notMain) $('verWarn').textContent = t('youPlay', { name: L(activeCh.name) }) + ' ' + t('notMain', { name: L(mainCh.name) });

  // add-ons: only the game server on the home screen (or what launcher.json marks "home"), all of them on the Add-ons tab
  // 1.6.9 (owner 14.11.2026): on macOS the Windows add-ons too, as a showcase (components_preview: shown, never installed)
  const comps = compAll();
  const pinned = comps.some(c => c.home) ? comps.filter(c => c.home)
    : comps.filter(c => c.id === 'relay');   // until launcher.json marks them
  $('compBox').classList.toggle('hidden', !pinned.length);
  compList($('components'), pinned, false);
  compList($('allCompList'), comps, true);

  // Play
  const play = $('play');
  play.classList.remove('install');
  $('cancel').classList.toggle('hidden', !S.busy);
  if (S.busy) { play.textContent = t('updating'); play.classList.add('install'); play.disabled = true; }
  else if (S.game_running) { play.textContent = t('running'); play.disabled = true; }
  else if (!S.game_found) { play.textContent = t('play'); play.disabled = true; }
  else if (!S.installed_version && !VAN()) { play.textContent = t('install'); play.classList.add('install'); play.disabled = !S.config_loaded; }
  else { play.textContent = t('play'); play.disabled = false; }
  play.onclick = () => (S.installed_version || VAN() ? doPlay() : switchTo(S.main_channel || S.channel));

  // a newer version of the installed one: offered at the bottom of the home screen's right column, never forced
  const target = channelOf(S.installed_channel) || channelOf(S.channel);
  const showUpd = !!(S.os !== 'macos' && S.game_found && target && S.installed_version && target.version !== S.installed_version && !S.busy && !S.game_running && !S.last_error);
  if (showUpd) {
    const cost = (S.costs || {})[target.version];
    UPD.elite = { b: (L(cfg.update_text) || t('switchTo', { name: '{name}' })).replace('{name}', L(target.name)).replace('{version}', target.version),
      small: cost ? t('upTo', { s: mb(cost) }) : '', run: () => switchTo(target.id) };
  } else UPD.elite = null;
  // Update all: Elite is done (no download any more) - now the launcher
  if (UPD.then === 'launcher' && !S.busy && !UPD.elite) { UPD.then = ''; if (LU && !LU.installing) launcherInstall(); }
  renderUpdBar();

  // status line
  if (!S.busy && !LU?.installing) {
    $('bar').classList.add('hidden');
    $('statusText').classList.toggle('err', !!(S.last_error && S.config_loaded));
    $('statusText').innerHTML = S.last_error && !S.config_loaded ? esc(t('offline'))
      : S.last_error ? esc(winPath(errText(S.last_error)))
      : VAN() ? esc(t('readyVanilla'))
      : S.installed_version ? esc(t('ready', { v: activeCh ? L(activeCh.name).replace(/^Elite\s+/i, '') : S.installed_version })) : (S.config_loaded ? '' : esc(t('connecting')));
    // the launch hint is about starting Elite; never on a Mac (17.11.2026: launch.macos's hint was CrossOver's)
    const hint = VAN() || S.os === 'macos' ? '' : L(cfg.launch?.[S.os]?.hint);
    $('statusMeta').textContent = [hint, winPath(S.game_dir)].filter(Boolean).join(' · ');
    // all is well (ready, no launch hint): the line steps aside for the links (siritos 02.11: "Elite 3.2 is ready" and the
    // game folder are not news); any download, check or error writes the line again and it comes back (CSS :has)
    if (!S.last_error && (S.installed_version || VAN()) && !hint) { $('statusText').innerHTML = ''; $('statusMeta').textContent = ''; }
  }

  // settings
  $('gameDir').textContent = winPath(S.game_dir) || '—';
  $('macFound').classList.toggle('hidden', S.os !== 'macos');
  if (S.os === 'macos') $('macFound').textContent = macFound();
  $('lang').value = S.lang || '';
  $('lang').options[0].textContent = t('langDefault', { name: LANG_NAMES[sysLang()] });   // "Default (English)": what the system gives
  $('cache').value = String(S.cache_mb);
  $('usage').checked = S.usage_stats !== false;
  $('lanShare').checked = S.lan_share !== false;
  $('muteMention').checked = !!S.mute_mention; $('closeQuits').checked = !!S.close_quits;
  $('mirror').value = S.extra_mirror || '';
  $('mirrorInfo').textContent = t('mirrors', { n: S.mirror_count });
  renderNet();
  renderGameNet();
  $('repair').disabled = S.busy || S.game_running || !S.installed_version;
  $('junk').disabled = S.busy || S.game_running || !S.installed_version;
  // 1.5.0: About - the launcher and the OS, what is installed, What's new (the releases), the open code and the community links
  $('about').textContent = `DoW Launcher ${S.launcher_version} · ${({ windows: 'Windows', linux: 'Linux', macos: 'macOS' })[S.os] || S.os}`;
  $('aboutVer').textContent = [S.installed_version ? (/^\d/.test(S.installed_version) ? 'Elite ' + S.installed_version : S.installed_version) : '',
    ((S.release_news || []).find(n => n.kind === 'patches') || {}).version ? t('newsRelPatches', { v: (S.release_news || []).find(n => n.kind === 'patches').version }) : ''].filter(Boolean).join(' · ') || '—';
  const REPO = 'https://github.com/dow2-launcher/Dow2-elite-launcher';
  $('aboutNews').onclick = () => open(REPO + '/releases');
  $('aboutLinks').innerHTML = [['GitHub', REPO], ...(cfg.links || []).map(l => [L(l.title), l.url])].map(([n, u], i) => `<button class="lnk" data-i="${i}">${esc(n)}</button>`).join('');
  const aboutUrls = [REPO, ...(cfg.links || []).map(l => l.url)];
  $('aboutLinks').querySelectorAll('.lnk').forEach(b => b.onclick = () => open(aboutUrls[+b.dataset.i]));
  $('hdrVer').textContent = S.launcher_version ? 'v' + S.launcher_version : '';
  if (CH.me) chMe();   // the header's profile plate in the player's language
  onRender();
  if (typeof lrPlay === 'function') lrPlay();   // 1.5.0: in a launcher lobby Play is the lobby's (lroom.js)
}

function renderProgress(p) {
  $('bar').classList.remove('hidden');
  const pct = p.bytes_total ? Math.min(100, Math.round(100 * p.bytes_done / p.bytes_total)) : 0;
  $('barFill').style.width = pct + '%';
  let spd = '';
  if (p.phase !== 'checking') {
    const now = performance.now();
    if (dlPrev && p.downloaded >= dlPrev.b) {
      const dt = (now - dlPrev.t) / 1000;
      if (dt >= 0.25) { const bps = (p.downloaded - dlPrev.b) / dt; speedEMA = speedEMA ? speedEMA * 0.65 + bps * 0.35 : bps; dlPrev = { b: p.downloaded, t: now }; }
    } else { dlPrev = { b: p.downloaded, t: now }; }
    if (speedEMA > 0) spd = ` · ${mbps(speedEMA)}`;
  }
  $('statusText').classList.remove('err');
  // 1.5.4 (owner 10.11.2026: a switch stood on one file for half an hour, nothing told it was alive): what is done to the
  // file now, the file's own MB (a big one grows while it is built), N/M files, the time left of the phase
  const name = (p.file || '').split('/').pop(), st = p.stage && t('stage_' + p.stage) !== 'stage_' + p.stage ? t('stage_' + p.stage) : '';
  const fileMb = p.file_size >= 4e6 && p.stage && p.stage !== 'cache' && p.stage !== 'lan' ? ` · ${mb(p.file_done || 0)} / ${mb(p.file_size)}` : '';
  const nOfM = p.files_total > 1 ? ` (${Math.min(p.files_done + 1, p.files_total)}/${p.files_total})` : '';
  const etaS = p.eta_s > 0 ? ` · ${esc(t('etaLeft', { t: p.eta_s >= 90 ? Math.round(p.eta_s / 60) + ' min' : p.eta_s + ' s' }))}` : '';
  $('statusText').innerHTML = (p.phase === 'checking'
    ? esc(t('checking', { p: pct })) + (p.stage === 'check' && p.file_size >= 64e6 ? esc(` · ${name}${fileMb}`) : '')
    : esc((st ? `${st} ${name}` : t('downloading', { file: name })) + nOfM + fileMb) + ` <b>${pct}%</b>`) + spd + etaS;
  $('statusMeta').textContent = t('meta', { dl: mb(p.downloaded), re: mb(p.reused), fc: mb(p.from_cache), m: p.mirror });
}

async function reload() { S = await invoke('get_status'); render(); }
// 1.3.13 (owner): "check add-ons for updates" - what the fresh launcher.json changed is told, also after the automatic checks
const compSnap = cfg => Object.fromEntries(((cfg && cfg.components) || []).map(c => [c.id, { v: c.version, n: L(c.name) || c.id,
  o: ((c.settings && c.settings.length ? c.settings : c.options) || []).map(o => o.id + ':' + (o.choices || []).map(x => x.value).join('/')).join(',') }]));
// -> [{id, k: new | ver | opts | gone, text}]
function compDiff(a, b) {
  const out = [];
  for (const id in b) {
    if (!a[id]) out.push({ id, k: 'new', text: t('addonNew', { name: b[id].n }) });
    else if (a[id].v !== b[id].v) out.push({ id, k: 'ver', text: t('addonChgVer', { name: b[id].n, from: verNum(a[id].v), to: verNum(b[id].v) }) });
    else if (a[id].o !== b[id].o) out.push({ id, k: 'opts', text: t('addonOpts', { name: b[id].n }) });
  }
  for (const id in a) if (!b[id]) out.push({ id, k: 'gone', text: t('addonGone', { name: a[id].n }) });
  return out;
}
async function refresh() {
  const before = S && S.config ? compSnap(S.config) : null;
  try { S = await invoke('refresh'); } catch (e) { toast(e, true); return null; }
  const changes = before && S.config ? compDiff(before, compSnap(S.config)) : [];
  changes.forEach(c => { if (c.k !== 'gone') COMP_CHG[c.id] = c.k; });   // the marks on the add-ons stay until the launcher closes
  render();
  if (changes.length) {
    // the count here and in a toast, what changed is marked on each add-on (a removed one is named: it is not in the list)
    const gone = changes.filter(c => c.k === 'gone').map(c => c.text);
    const msg = t('addonChangedN', { n: changes.length }) + (gone.length ? ' · ' + gone.join('; ') : '');
    const note = $('addonCheckNote'); if (note) note.textContent = msg;
    toast(msg);
  }
  // add-ons follow their checkboxes on their own: install missing ones, remove unticked ones
  const comps = S.components || [];
  if ((S.installed_version || VAN()) && !S.busy && !S.game_running && compsNeedSync()) {
    try { await invoke('start_update', { repair: false, componentsOnly: true }); S.busy = true; render(); } catch (e) { /* will retry next refresh */ }
  }
  return changes;
}
// 16.11.2026, macOS: "Steam: found · DoW2 (Feral 1.0.3): found at …" - what the launcher found (Browse picks the folder by hand)
function macFound() {
  const m = S.mac || {};
  return [t(m.steam || S.steam_found ? 'macSteamOk' : 'macSteamNo'),
    S.game_found ? t('macGameOk', { v: m.version || '?', path: S.game_dir || '' }) : t('macGameNo')].join(' · ');
}
async function pickDir() { try { S = await invoke('pick_game_dir'); render(); } catch (e) { toast(e, true); } }

async function switchTo(id) {
  const c = channelOf(id);
  try { await invoke('switch_to', { id }); S.busy = true; render(); if (c) $('statusText').textContent = t('switching', { name: L(c.name) }); }
  catch (e) { toast(e, true); }
}

async function startUpdate(repair) {
  try { await invoke('start_update', { repair }); S.busy = true; render(); }
  catch (e) { toast(e, true); }
}

// the add-ons differ from what the launcher wants: one that is on is missing or older than the catalog's, one that is off
// is still installed, or an old hand-installed copy of ours is in the game folder (the sync puts it aside - owner
// 03.11.2026: one copy of every patch, the launcher's latest, nothing asked)
// 1.4.11: mode_sync - the game folder is not yet as the chosen game wants it (vanilla: its loader and copies; Elite: the
// vanilla loader still next to DOW2.exe); in vanilla the Elite installs of the add-ons are not looked at
const compsNeedSync = () => (S.old_copies || []).length > 0 || !!S.mode_sync || (!VAN() && (S.components || []).some(c => {
  if ((c.conflicts || []).length) return true;
  return !!c.enabled !== !!c.installed || (c.enabled && c.latest && c.installed && c.installed !== c.latest);
}));
// pick the game Play starts and bring the add-ons for it right away (vanilla: the copies and the loader; Elite: Automatch's
// early loader back) - the same bar as an update; the game is not started
async function setGame(mode) {
  try { S = await invoke('set_game_mode', { mode }); render(); } catch (e) { toast(e, true); return; }
  if (compsNeedSync() && (S.installed_version || VAN())) {
    try { await invoke('start_update', { repair: false, componentsOnly: true }); S.busy = true; render(); if (VAN()) $('statusText').textContent = t('toVanilla'); }
    catch (e) { toast(e, true); }
  }
}
let playAfterSync = false;
// 1.4.2 (owner 03.11.2026): Play with the add-ons out of sync runs the same process as an update - the bar, Play waits -
// and the game starts by itself when it is done; the launcher also clears the leftovers of our DLLs before the start
async function doPlay(synced) {
  try { await reload(); } catch (e) { /* the last status then */ }   // what is in the game folder now, not when the window last looked
  if (!synced && (S.installed_version || VAN()) && !S.busy && compsNeedSync()) {
    try { await invoke('start_update', { repair: false, componentsOnly: true }); S.busy = true; playAfterSync = true; render(); toast(t('playAfterSync')); return; }
    catch (e) { /* not now: start with what is there */ }
  }
  try {
    const g = await invoke('play') || {};
    // the check before the start (launch_guard): what was taken out of the game's list, a stray stand-alone loader
    const said = [(g.off || []).length ? t('guardOff', { list: g.off.join(', ') }) : '', g.loader ? t('guardLoader') : '',
      g.vanilla_loader_missing ? t('guardVanillaLoader') : '',
      ...(g.mac_warn || []).map(w => t('macWarn_' + w, { v: g.mac_game_version || '' }))].filter(Boolean);
    toast(said.length ? t('starting') + ' ' + said.join(' ') : t('starting'), !!(g.loader || g.vanilla_loader_missing || (g.mac_warn || []).length));
  } catch (e) { toast(e, true); }
}

let netActive = false;
let dlPrev = null, speedEMA = 0;
listen('net', e => {
  const a = String(e.payload).split('\t');
  if (a[0] === 'start') { netActive = true; dlPrev = null; speedEMA = 0; if (S) S.busy = true; $('bar').classList.add('hidden'); $('statusText').textContent = t('netChecking'); $('statusMeta').textContent = ''; }
  else if (a[0] === 'try') { if (netActive) $('statusText').textContent = t('netTry', { host: a[1], k: a[2], n: a[3] }); }
  else if (a[0] === 'fail') { $('statusText').textContent = t('netFail', { host: a[1] }); }
});
listen('launcher_progress', e => {
  if (!LU) return;
  const { done, total } = e.payload;
  const pct = total ? Math.min(100, Math.round(100 * done / total)) : 0;
  LU.pct = total ? pct + '%' : mb(done);
  renderLauncherBanner();
  // the same bar at the bottom as for Elite and add-on updates
  $('bar').classList.remove('hidden');
  $('barFill').style.width = pct + '%';
  $('statusText').classList.remove('err');
  $('statusText').innerHTML = esc(t('launcherUpdatingTo', { v: LU.version || '' })) + ` <b>${esc(LU.pct)}</b>`;
  $('statusMeta').textContent = (total ? `${mb(done)} / ${mb(total)}` : mb(done)) + ' · ' + t('launcherAfter');
});
listen('news', () => { if (S) reload(); });
listen('game_running', e => { if (!S) return; S.game_running = e.payload; render(); if (!e.payload) refresh();
  if (!e.payload && RJ.after) { const a = RJ.after; RJ.after = null; setTimeout(() => roomJoin(a.id, a.name, null, false, a.want, a.seat), 1500); }   /* 1.4.11: the other game closed */ chHello(); if (!e.payload && FWD && FWD.skipped) setTimeout(relicProbe, 20000); });   // 1.4.5: the Relic check of the start waited for the game   // menu / game goes to the server when it changes, not on a timer
listen('progress', e => { netActive = false; prog = e.payload; if (S) { S.busy = true; renderProgress(prog); } });
listen('update_done', async e => {
  await reload();
  const r = e.payload;
  if (r.ok) {
    toast(r.summary.updated ? t('done', { n: r.summary.updated, dl: mb(r.summary.downloaded) }) : t('upToDate'));
    if (r.summary.updated) {
      $('bar').classList.add('hidden');
      $('statusText').innerHTML = `<b>${esc(t('doneLine'))}</b>`;
      $('statusMeta').textContent = t('metaDone', { dl: mb(r.summary.downloaded), re: mb(r.summary.reused), fc: mb(r.summary.from_cache) });
    }
  } else toast(r.cancelled ? t('cancelled') : r.error, !r.cancelled);
  // Play brought the add-ons first: now the game (also when that failed - the game can always be started; not after Cancel)
  if (playAfterSync) { playAfterSync = false; if (!r.cancelled && S && !S.busy && !S.game_running) doPlay(true); }
});

document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('hidden', v.id !== b.dataset.view));
});
// 1.5.13 (owner 12.11.2026): the launcher's own update restarts it on the tab it was on (and the Rooms panel's view), not on Home.
// Kept right before the restart (launcherInstall), taken once at the next start if it is fresh (5 minutes).
function viewNow() {
  const tab = document.querySelector('.tab.on'), rv = typeof RV === 'object' ? RV.view : '', st = document.querySelector('.set-tab.on');
  return JSON.stringify({ view: tab ? tab.dataset.view : 'home', rv, set: st ? st.dataset.set : '', at: Date.now() });
}
function viewKeep() { try { localStorage.setItem('viewKeep', viewNow()); } catch (e) {} }
// 1.5.13 (owner 12.11.2026): the window's own reload (F5, Ctrl+R, Refresh in the right-click menu) threw the player out of
// the Lobbies list onto Home with the chat. The view is kept for the reload too - in sessionStorage: it lives through a
// reload only, so a new start of the launcher still opens on Home.
addEventListener('pagehide', () => { try { sessionStorage.setItem('viewReload', viewNow()); } catch (e) {} });
function viewRestore() {
  let k = null; try { k = JSON.parse(localStorage.getItem('viewKeep') || 'null'); localStorage.removeItem('viewKeep'); } catch (e) {}
  if (!k || Date.now() - k.at > 300000) { k = null; try { k = JSON.parse(sessionStorage.getItem('viewReload') || 'null'); } catch (e) {} }
  try { sessionStorage.removeItem('viewReload'); } catch (e) {}
  if (!k || !k.view || k.view === 'home') return;
  const b = document.querySelector(`.tab[data-view="${k.view}"]`); if (b) b.click();
  if (k.view === 'rooms' && k.rv && typeof rShow === 'function' && k.rv !== 'mine') rShow(k.rv);   // "mine" comes back by itself with the room
  const sb = k.view === 'settings' && k.set && document.querySelector(`.set-tab[data-set="${k.set}"]`); if (sb) sb.click();
}
// after lroom.js has run (the Rooms panel): a timer could come before it when the script was still loading (on a reload),
// then the Rooms panel's view was not restored
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', viewRestore); else setTimeout(viewRestore, 0);
$('allComps').onclick = () => document.querySelector('.tab[data-view="addons"]').click();

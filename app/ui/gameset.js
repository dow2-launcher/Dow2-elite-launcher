// Settings of the game: its hotkeys, its UI scale, the removal of Elite.
// Split out of app.js (1.6.17), its section as it was; app.js keeps the core (the status, render, the add-ons, the update).
'use strict';
// ---------------- hotkeys ----------------
const HK = { data: null, edits: {}, grid: false, wait: null, dirty: false, open: new Set() };
const HK_GROUPS = ['space_marines', 'chaos_marines', 'eldar', 'orks', 'tyranids', 'imperial_guard', 'ordo_malleus', 't_tau', 'observer'];
const AB = [1, 2, 3, 4, 5, 6, 7].map(i => 'grid:AB_key_' + i);
const UC = r => [1, 2, 3, 4, 5, 6, 7].map(c => `grid:UC_Row${r}_Col${c}`);
const MAIN = ['attack', 'retreat', 'retreat_queue', 'repair', 'reinforce', 'overwatch', 'attackground', 'attackmelee', 'halt', 'stance', 'rally', 'unload',
  'retire', 'select_all', 'select_hq', 'select_hero', 'retreat_hero', 'retreat_all', 'retreat_beacon', 'next_primary_selection'];   // no system keys (menu, event cue)
const hkKey = b => b.scope + ':' + b.name;
const HK_RU = { attack: 'Атака', retreat: 'Отступление', retreat_queue: 'Отступление в очередь', repair: 'Ремонт', reinforce: 'Подкрепление', overwatch: 'Автоподкрепление',
  attackground: 'Атака по земле', attackmelee: 'Рукопашная атака', halt: 'Стоп', stance: 'Стойка', rally: 'Точка сбора', unload: 'Высадить', retire: 'Распустить',
  select_all: 'Выбрать всех', select_hq: 'Выбрать штаб', select_hero: 'Выбрать героя', retreat_hero: 'Отступление героя', retreat_all: 'Отступление всех',
  retreat_beacon: 'Маяк отступления', next_primary_selection: 'Следующий выбранный', event_cue_cycle: 'К последнему событию', systemmenu: 'Меню' };
const HK_EN = { overwatch: 'auto-reinforce' };   // the game's name says overwatch, the command is auto-reinforce
// A main command that each race also has as its own ability: the game's global "repair" is E, but every race's units
// repair with their own ability on P. The main row shows the key the races share and sets the global command and every
// race that follows it; a race changed on its own (in its group) keeps its key.
const HK_LINK = { repair: [':sm_repair_pvp', ':ork_repair', ':eld_repair', ':tau_repair'] };
const hkLinked = n => (HK_LINK[n] || []).filter(k => HK.data.map[k]);
// the key most of the linked races use: the shared one
function hkLinkVal(n) {
  const c = {}; hkLinked(n).forEach(k => { const v = hkVal(k); c[v] = (c[v] || 0) + 1; });
  return Object.keys(c).sort((a, b) => c[b] - c[a])[0];
}
// the keys a new key of the main row goes to: the global command and the races that still follow the shared key
function hkMulti(n) {
  const r = hkLinked(n); if (!r.length) return [];
  const v = hkLinkVal(n);
  return [':' + n].filter(k => HK.data.map[k]).concat(r.filter(k => hkVal(k) === v));
}
function hkVal(k) { const b = HK.data.map[k]; return k in HK.edits ? HK.edits[k] : b ? b.value : ''; }
function hkPretty(name) { return name.replace(/_/g, ' ').replace(/^AB key /, '').replace(/^UC Row(\d) Col(\d)/, 'row $1 · $2'); }
async function hkLoad() {
  try { const d = await invoke('hotkeys_get'); HK.data = d; HK.data.map = {}; d.bindings.forEach(b => HK.data.map[hkKey(b)] = b); HK.grid = d.grid; HK.edits = {}; hkRender(); }
  catch (e) { $('hkGridBox').innerHTML = `<div class="note">${esc(errText(e))}</div>`; }
}
// with Grid Hotkeys on, the grid table re-assigns some commands (reinforce, melee, stance, repair) - those are the ones that work
function hkMainKey(n) { const r = hkLinked(n); if (r.length) { const v = hkLinkVal(n); return r.find(k => hkVal(k) === v); } return HK.grid && HK.data.map['grid:' + n] ? 'grid:' + n : ':' + n; }
function hkDups() {
  // keys used twice among commands that work at the same moment: a selected squad (main commands + abilities with the grid on);
  // building keys work only with a building selected - checked among themselves
  const groups = [MAIN.map(hkMainKey).concat(HK.grid ? AB : []), HK.grid ? UC(1).concat(UC(2), UC(3)) : []];
  const dup = new Set();
  groups.forEach(keys => { const seen = {};
    keys.filter(k => HK.data.map[k]).forEach(k => { const v = hkVal(k).toLowerCase(); if (!v) return; (seen[v] = seen[v] || []).push(k); });
    // only clashes the player made: the game's own defaults share some keys on purpose (context decides)
    Object.values(seen).forEach(ks => { if (ks.length > 1 && ks.some(k => hkVal(k) !== HK.data.map[k].default)) ks.forEach(k => dup.add(k)); }); });
  return dup;
}
function hkBtn(k, multi) {
  const b = HK.data.map[k]; if (!b) return '<span></span>';
  const chg = hkVal(k) !== b.default;
  return `<button class="kk${chg ? ' chg' : ''}" data-k="${esc(k)}"${multi && multi.length > 1 ? ` data-multi="${esc(multi.join(','))}"` : ''} title="${esc(b.name)} — ${esc(t('hkNone'))}: ${esc(b.default)}">${esc(hkVal(k))}</button>`;
}
function hkRender() {
  if (!HK.data) return;
  $('hkGrid').checked = HK.grid;
  const g = $('hkGridBox'); g.classList.toggle('off', !HK.grid);
  g.innerHTML = [[t('hkAb'), AB], [t('hkUc1'), UC(1)], [t('hkUc2'), UC(2)], [t('hkUc3'), UC(3)]]
    .map(([l, ks]) => `<span class="lbl">${esc(l)}</span>` + ks.map(hkBtn).join('')).join('');
  const label = n => lang === 'ru' && HK_RU[n] || HK_EN[n] || hkPretty(n);   // the full name (and the game's) on hover: long ones are cut
  $('hkMain').innerHTML = MAIN.filter(n => HK.data.map[hkMainKey(n)]).map(n => `<div class="hk-row"><span title="${esc(label(n) + '\n' + n)}">${esc(label(n))}</span>${hkBtn(hkMainKey(n), hkMulti(n))}</div>`).join('');
  // every key by group: each race and observer (the common orders and the grid are shown above). System keys (menu,
  // camera) are not to be reassigned,
  // campaign abilities and the "plain letters" table do nothing in multiplayer: not shown. A group opens on a click;
  // a search opens every group with a match.
  const q = ($('hkSearch').value || '').toLowerCase();
  const hit = b => !q || b.name.toLowerCase().includes(q) || hkVal(hkKey(b)).toLowerCase() === q || b.section.toLowerCase().includes(q);
  $('hkAllList').innerHTML = HK_GROUPS.map(gr => {
    const bs = HK.data.bindings.filter(b => b.group === gr && hit(b));
    if (!bs.length) return '';
    const open = q || HK.open.has(gr); let sec = '';
    // with Grid Hotkeys on the game takes these by the button's place (the grid keys above), not by the unit: dimmed and said so
    const shadow = s => HK.grid && /unit creation|unit abilities|hero abilities|unit upgrades|hero upgrades|hero wargear/i.test(s);
    const rows = !open ? '' : bs.map(b => (b.section !== sec ? `<div class="hk-sec${shadow(b.section) ? ' off' : ''}">${esc(sec = b.section)}`
        + (shadow(b.section) ? `<small>${esc(t('hkGridShadow'))}</small>` : '') + '</div>' : '')
      + `<div class="hk-row${shadow(b.section) ? ' off' : ''}"><span title="${esc(hkPretty(b.name) + '\n' + b.name)}">${esc(hkPretty(b.name))}</span>${hkBtn(hkKey(b))}</div>`).join('');
    const race = RACES.includes(gr), title = race ? t('race_' + gr) : t('hkGrpObserver');
    return `<div class="hk-grp${open ? ' open' : ''}"><button class="hk-gh" data-g="${gr}" aria-expanded="${!!open}">${race ? raceImg(gr) : ''}`
      + `<b>${esc(title)}</b><span>${bs.length}</span></button>${open ? `<div class="hk-list">${rows}</div>` : ''}</div>`;
  }).join('');
  $('hkAllList').querySelectorAll('.hk-gh').forEach(b => b.onclick = () => { const g = b.dataset.g; HK.open.has(g) ? HK.open.delete(g) : HK.open.add(g); hkRender(); });
  const dup = hkDups();
  document.querySelectorAll('#hotkeys .kk').forEach(el => { el.classList.toggle('dup', dup.has(el.dataset.k)); el.onclick = () => hkWait(el); });
  const n = Object.keys(HK.edits).filter(k => HK.edits[k] !== HK.data.map[k].value).length + HK.data.bindings.filter(b => b.value !== b.default && !(hkKey(b) in HK.edits)).length;
  $('hkState').textContent = HK.dirty ? t('hkUnsaved') : n ? t('hkCustom', { n }) : '';   // nothing changed: the Reset button next to it already says "as in the game"
  $('hkState').classList.toggle('warn', !!HK.dirty);
  $('hkSave').classList.toggle('hidden', !HK.dirty);   // only to retry a save that failed (the game was running)
}
function hkWait(el) {
  document.querySelectorAll('#hotkeys .kk.wait').forEach(x => { x.classList.remove('wait'); x.textContent = hkVal(x.dataset.k); });
  HK.wait = el.dataset.k; HK.waitAll = el.dataset.multi ? el.dataset.multi.split(',') : null; el.classList.add('wait'); el.textContent = t('hkPress');
}
const KEYMAP = { Space: 'Space', Tab: 'Tab', Enter: 'Enter', Backspace: 'Backspace', Comma: 'Comma', Period: 'Period', Slash: 'Slash', Semicolon: 'Semicolon',
  Quote: 'Apostrophe', BracketLeft: 'LBracket', BracketRight: 'RBracket', Backslash: 'Backslash', Minus: 'Minus', Equal: 'Equal', Backquote: 'Grave',
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', Delete: 'Delete', Insert: 'Insert', Home: 'Home', End: 'End', PageUp: 'PageUp',
  PageDown: 'PageDown', Pause: 'Pause', CapsLock: 'CapsLock', NumpadAdd: 'NumpadPlus', NumpadSubtract: 'NumpadMinus', NumpadMultiply: 'NumpadMultiply',
  NumpadDivide: 'NumpadSlash', NumpadDecimal: 'NumpadPeriod' };
function dowKey(e) {
  let k = null; const c = e.code;
  if (/^Key[A-Z]$/.test(c)) k = c.slice(3); else if (/^Digit\d$/.test(c)) k = c.slice(5); else if (/^F([1-9]|1[0-2])$/.test(c)) k = c;
  else if (/^Numpad\d$/.test(c)) k = c; else k = KEYMAP[c] || null;
  if (!k) return null;
  return (e.ctrlKey ? 'Control+' : '') + (e.shiftKey ? 'Shift+' : '') + (e.altKey ? 'Alt+' : '') + k;
}
document.addEventListener('keydown', e => {
  if (!HK.wait) return;
  if (['ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'].includes(e.code)) return;
  e.preventDefault(); e.stopPropagation();
  const ks = HK.waitAll || [HK.wait]; HK.wait = HK.waitAll = null;
  if (e.code !== 'Escape') { const v = dowKey(e); if (v) { ks.forEach(k => HK.edits[k] = v); HK.dirty = true; } }
  hkRender();
  if (HK.dirty) hkCommit();
}, true);
$('hkGrid').onchange = e => { HK.grid = e.target.checked; HK.dirty = true; hkRender(); hkCommit(); };
$('hkSearch').oninput = () => hkRender();
// every change is written at once: changes kept only in the window were lost on Play or on closing the launcher, while
// "your changes: N" already counted them (siritos 30.10). With the game running the file can't be written: the
// changes wait, marked, and the Save button retries.
async function hkCommit() {
  const dup = hkDups();
  try { const d = await invoke('hotkeys_save', { changes: HK.edits, grid: HK.grid }); HK.data = d; HK.data.map = {}; d.bindings.forEach(b => HK.data.map[hkKey(b)] = b); HK.grid = d.grid; HK.edits = {}; HK.dirty = false; hkRender();
    toast(dup.size ? t('hkSaved') + '. ' + t('hkDup', { k: [...dup].map(k => hkVal(k)).filter((v, i, a) => a.indexOf(v) === i).join(', ') }) : t('hkSaved'), !!dup.size); }
  catch (e) { hkRender(); toast(String(e), true); }
}
$('hkSave').onclick = hkCommit;
$('hkReset').onclick = async () => {
  try { const d = await invoke('hotkeys_reset'); HK.data = d; HK.data.map = {}; d.bindings.forEach(b => HK.data.map[hkKey(b)] = b); HK.grid = d.grid; HK.edits = {}; HK.dirty = false; hkRender(); toast(t('hkSaved')); }
  catch (e) { toast(String(e), true); }
};
// Settings: General, Network and servers (1.4.8: the game servers and the launcher's servers in one tab; the game servers are
// checked when it is first opened), Hotkeys (the bindings are read when the tab is first opened)
document.querySelectorAll('.set-tab').forEach(b => b.onclick = () => {
  document.querySelectorAll('.set-tab').forEach(x => x.classList.toggle('on', x === b));
  ['setMain', 'setNet', 'hotkeys', 'setFame'].forEach(id => $(id).classList.toggle('hidden', id !== b.dataset.set));
  if (b.dataset.set === 'hotkeys' && !HK.data) hkLoad();
  if (b.dataset.set === 'setFame' && typeof fameLoad === 'function') fameLoad();
  if (b.dataset.set === 'setMain') uiScaleLoad();
  if (b.dataset.set === 'setNet' && !GN_OPENED) { GN_OPENED = true; if (!GN) gameNetCheck(); }
});

// ---------------- game UI scale (uiscale in configuration.lua; 4K screens) ----------------
async function uiScaleLoad() {
  try {
    const d = await invoke('ui_scale_get'), r = $('uiScale');
    r.min = d.min; r.max = d.max; r.value = d.value; $('uiScaleVal').textContent = d.value + '%';
  } catch (e) { /* no Documents folder yet: the slider stays at 100 */ }
}
$('uiScale').oninput = e => { $('uiScaleVal').textContent = e.target.value + '%'; };
$('uiScaleSet').onclick = async () => {
  try { const d = await invoke('ui_scale_set', { value: +$('uiScale').value }); $('uiScale').value = d.value; $('uiScaleVal').textContent = d.value + '%'; toast(t('uiScale') + ' ' + d.value + '%: ' + t('uiScaleDone')); }
  catch (e) { toast(String(e), true); }
};
uiScaleLoad();

// ---------------- remove Elite completely ----------------
let unArmed = 0;
$('uninstall').onclick = async () => {
  const b = $('uninstall');
  if (Date.now() - unArmed > 6000) { unArmed = Date.now(); b.textContent = t('unSure'); setTimeout(() => { if (Date.now() - unArmed >= 6000) b.textContent = t('unBtn'); }, 6100); return; }
  unArmed = 0; b.disabled = true;
  try { const r = await invoke('uninstall_elite'); toast(t('unDone', { n: r.files })); refresh(); }
  catch (e) { toast(String(e), true); }
  b.disabled = false; b.textContent = t('unBtn');
};

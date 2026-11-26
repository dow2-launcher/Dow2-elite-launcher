#!/usr/bin/env node
// 1.6.35 (owner 26.11.2026): the add-on presets of the Add-ons tab (Minimal / Recommended / Custom), app.js's code between its
// // <presets> marks, against a fake store and window. No browser needed.   node scripts/uicheck/addon_presets.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..'), UI = join(ROOT, 'app', 'ui');
const app = readFileSync(join(UI, 'app.js'), 'utf8'), a = app.indexOf('// <presets>'), b = app.indexOf('// </presets>');
if (a < 0 || b < a) { console.error('no // <presets> ... // </presets> in app.js'); process.exit(2); }
let lang = 'en';
const L = x => x == null ? '' : typeof x === 'string' ? x : (x[lang] || x.en || Object.values(x)[0] || '');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const t = (k, p) => k.replace(/\{(\w+)\}/g, (_, x) => (p || {})[x] ?? '') + (p && p.names ? ':' + p.names : '');
const compBase = c => String(c.id).replace(/_(r\d+|off)$/, '');
const macBase = c => compBase(c).replace(/_mac$/, '');
// one window state object for the whole run (app.js's global S): fresh() refills it
const env = { S: {}, calls: [], toasts: [], synced: 0, asked: [], answer: true, store: {}, rendered: 0 };
const naHere = c => !!c.preview || (env.S.game_mode === 'vanilla' && !c.vanilla_ok) || c.game_ok === false;
const localStorage = { getItem: k => env.store[k] ?? null, setItem: (k, v) => { env.store[k] = String(v); } };
// the window's state after set_component: the tick as the backend keeps it
const invoke = async (cmd, a) => { env.calls.push([cmd, a]); if (cmd === 'set_component') env.S.components.find(c => c.id === a.id).enabled = a.on; };
const box = { cls: new Set(), innerHTML: '', classList: { toggle(c, on) { on ? box.cls.add(c) : box.cls.delete(c); } }, querySelectorAll: () => [] };
const H = new Function('L', 'esc', 't', 'compBase', 'macBase', 'naHere', 'localStorage', 'invoke', 'env', '$',
  `const VAN = () => env.S.game_mode === 'vanilla';
   const compAll = () => env.S.components.filter(c => !/(^|-)off$/i.test(String(c.latest || '')));
   const compDanger = c => (c ? L(c.danger) : '').trim();
   const compDangerOk = async c => { if (!compDanger(c)) return true; env.asked.push(c.id); return env.answer; };
   const toast = m => env.toasts.push(m), render = () => env.rendered++, reload = () => env.rendered++;
   const compSync = async () => { env.synced++; };
   const S = env.S;
   ` + app.slice(a, b) + `
   return { compPresets, presetWant, presetScope, presetNow, presetApply, presetRender, presetGame };`)(L, esc, t, compBase, macBase, naHere, localStorage, invoke, env, () => box);
let fails = 0;
const check = (name, ok, got) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok ? '' : '\n     got: ' + JSON.stringify(got))); if (!ok) fails++; };
const comp = (id, o = {}) => ({ id, name: id, enabled: false, default: false, vanilla_ok: true, elite_ok: true, game_ok: true, ...o });
const PRESETS = { recommended: { name: { en: 'Recommended', ru: 'Рекомендуемый' }, ids: ['relay_fwd', 'automatch', 'lobbystats', 'herolabelfix', 'retreatnow', 'fpsunlock', 'elitefix_wmic'] },
  minimal: { name: { en: 'Minimal', ru: 'Минимальный' }, ids: 'defaults' }, broken: { ids: 5 }, team: { name: 'Team', ids: [] } };
const fresh = (over = {}) => {
  for (const k of Object.keys(env.S)) delete env.S[k];
  Object.assign(env.S, { game_mode: 'elite', addon_game: null, busy: false, game_running: false, installed_version: '3.2.1.0', config: { presets: PRESETS }, components: [
    comp('automatch', { default: true, enabled: true }), comp('elitefix_wmic', { default: true, enabled: true, vanilla_ok: false }),
    comp('relay_fwd'), comp('lobbystats_r3'), comp('herolabelfix'), comp('matchtimer_r2', { enabled: true }),
    comp('retreatnow', { danger: { en: 'Desync unless everyone has it.' } }), comp('fpsunlock', { requires: ['dxvk'] }), comp('dxvk'),
    comp('crossplay_mac', { required: true, enabled: true }), comp('eliteai_off', { latest: 'eliteai-off' }),
  ] }, over);
  Object.assign(env, { calls: [], toasts: [], synced: 0, asked: [], answer: true, rendered: 0 });
};
const ids = () => env.S.components.filter(c => c.enabled).map(c => c.id).sort();
fresh();
// the list of the store
check('presets in order: minimal, recommended, then the others in the store\'s order; a broken one left out',
  H.compPresets().map(p => p.k).join() === 'minimal,recommended,team', H.compPresets().map(p => p.k));
lang = 'ru'; check('names in the player\'s language', H.compPresets()[1].name === 'Рекомендуемый', H.compPresets()[1].name); lang = 'en';
env.S.config.presets = { minimal: { ids: 'defaults' } };
check('no name in the store: the window\'s own text', H.compPresets()[0].name === 'presetMinimal', H.compPresets());
for (const odd of [undefined, null, 'x', 7, [1], {}]) { env.S.config.presets = odd; check('no presets / another shape (' + JSON.stringify(odd) + '): none', H.compPresets().length === 0, H.compPresets()); }
env.S.config = {}; check('no "presets" in launcher.json: no selector', H.compPresets().length === 0, '');
env.S.config = null; check('no launcher.json yet: no selector', H.compPresets().length === 0, '');
fresh();
const all = () => env.S.components.filter(c => !c.latest), scope = () => H.presetScope(all());
const P = k => H.compPresets().find(p => p.k === k);
// what a preset wants
check('Minimal = the add-ons on by default (required ones and the showcase aside)', H.presetWant(P('minimal'), scope(), all()).sort().join() === 'automatch,elitefix_wmic', H.presetWant(P('minimal'), scope(), all()));
let w = H.presetWant(P('recommended'), scope(), all());
check('Recommended: its ids in its order, "_r3" ends ignored (lobbystats = lobbystats_r3)', w.join() === 'relay_fwd,automatch,lobbystats_r3,herolabelfix,retreatnow,elitefix_wmic', w);
check('... one whose required add-on is not in the set is left out (fpsunlock without dxvk)', !w.includes('fpsunlock'), w);
env.S.components.find(c => c.id === 'relay_fwd').excludes = ['automatch'];
w = H.presetWant(P('recommended'), scope(), all());
check('two that exclude each other: the earlier one of the preset wins', w.includes('relay_fwd') && !w.includes('automatch'), w);
env.S.components.find(c => c.id === 'relay_fwd').excludes = undefined;
env.S.components.find(c => c.id === 'automatch').excludes = ['relay'];   // excludes are base ids: relay_fwd is another add-on
check('... an exclusion by base id only', H.presetWant(P('recommended'), scope(), all()).includes('automatch'), '');
env.S.components.push(comp('herolabelfix_mac'));
check('a Mac build matches its add-on\'s id (herolabelfix_mac = herolabelfix)', H.presetWant(P('recommended'), scope(), all()).includes('herolabelfix_mac'), '');
fresh();
// what the selector shows: the preset equal to the ticks, else custom - nothing is applied by itself
check('ticks = defaults + a hand-ticked one -> Custom', H.presetNow() === 'custom', H.presetNow());
check('... and nothing was changed by looking', env.calls.length === 0, env.calls);
env.S.components.find(c => c.id === 'matchtimer_r2').enabled = false;
check('ticks = the defaults -> Minimal', H.presetNow() === 'minimal', H.presetNow());
env.S.components.find(c => c.id === 'crossplay_mac').enabled = true;
check('a required add-on does not count', H.presetNow() === 'minimal', H.presetNow());
fresh();
// a click on a preset
await H.presetApply('recommended');
const sets = env.calls.filter(c => c[0] === 'set_component').map(c => c[1].id + ':' + c[1].on).sort();
check('Recommended: set_component only for the changes (danger one asked)', JSON.stringify(sets) === JSON.stringify(['herolabelfix:true', 'lobbystats_r3:true', 'matchtimer_r2:false', 'relay_fwd:true', 'retreatnow:true']), sets);
check('... the dangerous add-on of the set asked like a click', env.asked.join() === 'retreatnow', env.asked);
check('... the files brought to the ticks once (compSync, the same as a click)', env.synced === 1, env.synced);
check('... the selector shows it now', H.presetNow() === 'recommended', H.presetNow());
check('... the toast names what went on and off', env.toasts.length === 1 && /presetOn/.test(env.toasts[0]) && /matchtimer_r2/.test(env.toasts[0]), env.toasts);
check('... the player\'s own ticks from before were kept for Custom', JSON.parse(env.store.compCustom).elite.sort().join() === 'automatch,elitefix_wmic,matchtimer_r2', env.store.compCustom);
env.calls = []; await H.presetApply('recommended');
check('the preset already shown: nothing', env.calls.length === 0, env.calls);
await H.presetApply('minimal');
check('Minimal after Recommended: back to the defaults', ids().join() === 'automatch,crossplay_mac,elitefix_wmic', ids());
check('... Custom kept from the first pick, not overwritten by a preset', JSON.parse(env.store.compCustom).elite.includes('matchtimer_r2'), env.store.compCustom);
await H.presetApply('custom');
check('Custom: the player\'s own ticks back', ids().join() === 'automatch,crossplay_mac,elitefix_wmic,matchtimer_r2', ids());
fresh(); env.answer = false;
await H.presetApply('recommended');
check('the danger question cancelled: that one stays off, the rest applied', !ids().includes('retreatnow') && ids().includes('relay_fwd'), ids());
check('... so the ticks are Custom now (not the preset)', H.presetNow() === 'custom', H.presetNow());
fresh(); env.store = {};
await H.presetApply('custom');
check('Custom with nothing kept: nothing', env.calls.length === 0, env.calls);
// the current game only
fresh({ game_mode: 'vanilla' });
await H.presetApply('recommended');
check('vanilla: an add-on for Elite only keeps its tick (elitefix_wmic stays on, untouched)', !env.calls.some(c => c[1].id === 'elitefix_wmic') && ids().includes('elitefix_wmic'), env.calls);
check('... the game of the kept ticks', H.presetGame() === 'vanilla' && 'vanilla' in JSON.parse(env.store.compCustom), env.store.compCustom);
fresh({ addon_game: 'igrework' }); env.S.components.forEach(c => { c.game_ok = c.id === 'dxvk'; }); env.S.components.find(c => c.id === 'dxvk').enabled = true; env.store = {};
await H.presetApply('minimal');
check('a mod version (IG Rework): only its own add-ons (dxvk off, the Elite ones untouched)', env.calls.length === 1 && env.calls[0][1].id === 'dxvk' && !env.calls[0][1].on && H.presetGame() === 'igrework', env.calls);
// locked
for (const k of ['busy', 'game_running', 'addons_blocked', 'addons_blocked_next']) {
  fresh({ [k]: true }); await H.presetApply('recommended');
  check('locked (' + k + '): nothing', env.calls.length === 0, env.calls);
}
// the selector itself
fresh(); env.store = {};
H.presetRender();
check('the selector: the replays\' filter look (.seg radiogroup), the presets then Custom', /class="seg" role="radiogroup"/.test(box.innerHTML)
  && (box.innerHTML.match(/data-preset="/g) || []).length === 4 && box.innerHTML.indexOf('data-preset="custom"') > box.innerHTML.indexOf('data-preset="team"'), box.innerHTML);
check('... Custom marked as the current one', /aria-checked="true" class="on" data-preset="custom"/.test(box.innerHTML), box.innerHTML);
env.S.components.find(c => c.id === 'matchtimer_r2').enabled = false; H.presetRender();
check('... Minimal marked; Custom locked while nothing of the player\'s is kept', /class="on" data-preset="minimal"/.test(box.innerHTML) && /data-preset="custom" data-tip="[^"]*" disabled/.test(box.innerHTML), box.innerHTML);
env.S.busy = true; H.presetRender();
check('... all locked while files are updated', (box.innerHTML.match(/ disabled>/g) || []).length === 4, box.innerHTML);
env.S.config.presets = undefined; H.presetRender();
check('no presets: the selector hidden', box.cls.has('hidden') && box.innerHTML === '', box.innerHTML);
// the wiring
const html = readFileSync(join(UI, 'index.html'), 'utf8');
check('index.html: the selector in the Add-ons heading', /addons-head"><span data-t="components"><\/span><div class="rflt ap-flt hidden" id="addonPresets"><\/div>/.test(html), '');
check('render() draws it with the add-on list', /compList\(\$\('allCompList'\), comps, true\);\n  presetRender\(\);/.test(app), '');
check('a click on a row and a preset end the same way (compSync)', (app.match(/await compSync\(\);/g) || []).length >= 2, '');
const i18n = readFileSync(join(UI, 'i18n.js'), 'utf8');
check('the texts in all five languages', ['en', 'ru', 'es', 'fr', 'de'].every(l => new RegExp(`Object\\.assign\\(T\\.${l}, \\{ presetLabel: `).test(i18n)), '');
check('Rust: the window gets "default" (on_by_default) and the config keeps "presets"', /"default": c\.on_by_default\(\)/.test(readFileSync(join(ROOT, 'app', 'src', 'main.rs'), 'utf8'))
  && /pub presets: serde_json::Value/.test(readFileSync(join(ROOT, 'crates', 'elite-core', 'src', 'config.rs'), 'utf8')), '');
console.log(fails ? '\n' + fails + ' failed' : '\nall ok');
process.exit(fails ? 1 : 0);

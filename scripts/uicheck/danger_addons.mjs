#!/usr/bin/env node
// 1.6.29 (owner 19.11.2026: "show it as a danger - don't switch it on casually, it means desync"): an add-on with "danger" in
// the store. app.js's helpers (cut out by their // <danger> marks) and every way the launcher turns an add-on on.
// No browser needed.   node scripts/uicheck/danger_addons.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..'), UI = join(ROOT, 'app', 'ui'), SRC = join(ROOT, 'app', 'src');
const app = readFileSync(join(UI, 'app.js'), 'utf8'), a = app.indexOf('// <danger>'), b = app.indexOf('// </danger>');
if (a < 0 || b < a) { console.error('no // <danger> ... // </danger> in app.js'); process.exit(2); }
let lang = 'ru';
const L = x => x == null ? '' : typeof x === 'string' ? x : (x[lang] || x.en || Object.values(x)[0] || '');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TX = { addonDanger: 'ОПАСНО', dangerTitle: 'Включить {name}?', dangerAsk: 'Включайте, только если понимаете.', dangerOn: 'Включить', dangerCancel: 'Отмена' };
const t = (k, p) => (TX[k] || k).replace(/\{(\w+)\}/g, (_, x) => (p || {})[x] ?? '');
const asks = []; let answer = 1;
const askBox = (title, lines, buttons) => { asks.push({ title, lines: lines.filter(Boolean), buttons }); return Promise.resolve(answer); };
const H = new Function('L', 'esc', 't', 'askBox', app.slice(a, b) + '\nreturn { compDanger, dangerChip, dangerHtml, compDangerOk };')(L, esc, t, askBox);
let fails = 0;
const check = (name, ok, got) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok ? '' : '\n     got: ' + got)); if (!ok) fails++; };
const RN = { id: 'retreatnow', name: 'Instant retreat', danger: { en: 'Desync unless every player has it on.', ru: 'Рассинхрон, если не у всех включено.' } };
const PLAIN = { id: 'obsfix', name: 'ObsFix' };
check('the text in the player\'s language', H.compDanger(RN) === 'Рассинхрон, если не у всех включено.', H.compDanger(RN));
lang = 'de'; check('... English when his language is missing', H.compDanger(RN) === 'Desync unless every player has it on.', H.compDanger(RN)); lang = 'ru';
check('an entry without "danger": nothing (chip, text, question)', H.compDanger(PLAIN) === '' && H.dangerChip(PLAIN) === '' && H.dangerHtml(PLAIN) === '', '');
check('a blank "danger": nothing', H.compDanger({ danger: { en: '  ' } }) === '' && H.compDanger({ danger: '' }) === '', '');
let h = H.dangerChip(RN);
check('the chip: red class, "ОПАСНО", the text in its tip', h.includes('class="chip danger"') && h.includes('>ОПАСНО<') && h.includes('title="Рассинхрон'), h);
h = H.dangerHtml(RN);
check('the text on the card itself', h === '<div class="addon-danger">Рассинхрон, если не у всех включено.</div>', h);
h = H.dangerHtml({ danger: '<img src=x onerror=1>"' });
check('the text escaped', !h.includes('<img') && h.includes('&lt;img'), h);
answer = 1; let ok = await H.compDangerOk(RN);
check('turning on asks: the title, the text, "Включить" red + "Отмена"; yes -> on', ok === true && asks.length === 1 && asks[0].title === 'Включить Instant retreat?'
  && asks[0].lines[0] === H.compDanger(RN) && asks[0].buttons[0].label === 'Включить' && asks[0].buttons[0].cls === 'red' && asks[0].buttons[1].label === 'Отмена', JSON.stringify(asks));
answer = 0; ok = await H.compDangerOk(RN); check('Cancel -> stays off', ok === false, ok);
answer = null; ok = await H.compDangerOk(RN); check('a click beside the window -> stays off', ok === false, ok);
asks.length = 0; ok = await H.compDangerOk(PLAIN); check('an ordinary add-on: no question', ok === true && !asks.length, JSON.stringify(asks));
ok = await H.compDangerOk(undefined); check('no add-on found: no question', ok === true, ok);
// every way the launcher turns an add-on on
const lst = app.slice(app.indexOf('function compList('), app.indexOf('function popAddon('));
check('the cards (home) and the rows (Add-ons tab): the danger class, the chip, the text', (lst.match(/compDanger\(c\) \? 'danger' : ''/g) || []).length === 2
  && (lst.match(/dangerChip\(c\)/g) || []).length === 2 && (lst.match(/dangerHtml\(c\)/g) || []).length === 2, '');
check('the switch / the row: asks before set_component on (off while it asks), nothing on Cancel', /if \(dc && compDanger\(dc\)\) \{ cb\.checked = false; if \(!\(await compDangerOk\(dc\)\)\) return; cb\.checked = true; \}[\s\S]{0,200}invoke\('set_component'/.test(lst), '');
const na = readFileSync(join(UI, 'needaddon.js'), 'utf8');
check('needaddon.js (an action that needs an add-on): its question carries the warning', /naAsk[^\n]*compDanger\(c\)/.test(na) && /cls: compDanger\(c\) \? 'red'/.test(na), '');
const ons = readdirSync(UI).filter(f => f.endsWith('.js')).flatMap(f => (readFileSync(join(UI, f), 'utf8').match(/invoke\('set_component', \{[^}]*on: true[^}]*\}\)/g) || []).map(x => f + ': ' + x));
check('every other "on: true" is known (needaddon after its question, relay_fwd by id)', JSON.stringify(ons.sort()) === JSON.stringify([
  "app.js: invoke('set_component', { id: 'relay_fwd', on: true })", "needaddon.js: invoke('set_component', { id: a.id, on: true })", "needaddon.js: invoke('set_component', { id: c.id, on: true })"].sort()), JSON.stringify(ons));
const rs = readdirSync(SRC).filter(f => f.endsWith('.rs')).map(f => readFileSync(join(SRC, f), 'utf8')).join('\n');
check('Rust: never on by default (on_by_default everywhere, no unwrap_or(c.default) left)', !/components\.get\(&c\.id\)\.copied\(\)\.unwrap_or\(c\.default\)/.test(rs) && /unwrap_or\(c\.on_by_default\(\)\)/.test(rs), '');
check('Rust: the window gets "danger"', /"danger": c\.danger/.test(readFileSync(join(SRC, 'main.rs'), 'utf8')), '');
const i18n = readFileSync(join(UI, 'i18n.js'), 'utf8');
check('the texts in all five languages', ['en', 'ru', 'es', 'fr', 'de'].every(l => new RegExp(`Object\\.assign\\(T\\.${l}, \\{ addonDanger: `).test(i18n)), '');
const css = readFileSync(join(UI, 'style.css'), 'utf8');
check('the look: the red chip, the card\'s red edge, the text line', /\.chip\.danger\{/.test(css) && /\.addon\.danger,\.arow\.danger\{box-shadow:inset 3px 0 0/.test(css) && /\.addon-danger\{/.test(css), '');
console.log(fails ? '\n' + fails + ' failed' : '\nall ok');
process.exit(fails ? 1 : 0);

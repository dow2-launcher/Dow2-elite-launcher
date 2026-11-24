#!/usr/bin/env node
// 1.6.28 (SirItos 19.11.2026: "a tip on a player's nick, like everywhere else, also in Replays"): replays.js's player names -
// rpNm / rpAskSteams / rpBindNames, cut out by their // <rptip> marks, with rating.js's rtTipAttr - and their call sites.
// No browser needed.   node scripts/uicheck/replay_tips.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..'), UI = join(ROOT, 'app', 'ui');
const rp = readFileSync(join(UI, 'replays.js'), 'utf8'), a = rp.indexOf('// <rptip>'), b = rp.indexOf('// </rptip>');
if (a < 0 || b < a) { console.error('no // <rptip> ... // </rptip> in replays.js'); process.exit(2); }
const rating = readFileSync(join(UI, 'rating.js'), 'utf8'), tipLine = (rating.match(/^const rtTipAttr = .*$/m) || [''])[0];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const asked = [], bound = []; let renders = 0, answer = {};
const RP = { steams: {}, steamAsked: new Set() };
const invoke = (cmd, args) => { asked.push([cmd, args.pids.slice()]); return Promise.resolve(answer); };
const nickBind = (el, steam, name, mention, noTag) => bound.push([steam, name, mention, noTag]);
const rpRender = () => { renders++; };
// 1.6.32: rating.js fmSeal - the Hall of Fame's seal left of a name (a stand-in: S1 is in the hall)
const fmSeal = (s, n) => s === '76561198000000111' ? '<i class="fm-seal"></i>' : '';
const f = new Function('esc', 'RP', 'invoke', 'nickBind', 'rpRender', 'fmSeal', tipLine + '\n' + rp.slice(a, b) + '\nreturn { rpNm, rpAskSteams, rpBindNames };');
const { rpNm, rpAskSteams, rpBindNames } = f(esc, RP, invoke, nickBind, rpRender, fmSeal);
let fails = 0;
const check = (name, ok, got) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok ? '' : '\n     got: ' + got)); if (!ok) fails++; };
const S1 = '76561198000000111';
let h = rpNm({ name: 'SirItos', pid: 111, steam: S1, rating: 1995 });
check("a pool player with his SteamID: the player tip (data-ptip, the name, Relic's number) + the menu's data", h.includes(`data-ptip="${S1}"`) && h.includes('data-pname="SirItos"') && h.includes('data-prt="1995"') && h.includes(`data-steam="${S1}"`) && !h.includes('nx'), h);
check('a Hall of Fame player: the seal right before the name (1.6.32)', h.startsWith('<i class="fm-seal"></i><span class="nm"'), h);
h = rpNm({ name: 'Computer Player', pid: 4294967295 });
check('the computer: just the name, no tip, no hover (class nx)', h === '<span class="nm nx">Computer Player</span>', h);
h = rpNm({ name: 'Nobody', profile: 555 });
check('an own file\'s player not known yet: no tip', h.includes('nx') && !h.includes('data-ptip'), h);
RP.steams[555] = '76561198000000555';
h = rpNm({ name: 'Nobody', profile: 555 });
check('... known now (replays_steams): the tip by his Relic id (profile)', h.includes('data-ptip="76561198000000555"'), h);
h = rpNm({ name: '<b>x</b>"', pid: 1, steam: S1 });
check('a name is escaped in the text and the attributes', !h.includes('<b>') && h.includes('&lt;b&gt;x&lt;/b&gt;&quot;'), h);
// the asks: only the players without a SteamID, real ids, once each, 200 at most per ask
answer = { 222: '76561198000000222', 333: 'not-a-steam' };
const items = [{ players: [{ profile: 222 }, { profile: 333 }, { profile: 4294967295 }, { pid: 111, steam: S1 }, { profile: 0 }] },
  { players: [{ profile: 222 }, { name: 'no id' }] }];
rpAskSteams(items);
check('asked: 222 and 333 only (not the computer, the known, 0, no id), once', JSON.stringify(asked) === '[["replays_steams",[222,333]]]', JSON.stringify(asked));
await new Promise(r => setTimeout(r, 0));
check('the answer kept (a SteamID only) and the list redrawn once', RP.steams[222] === '76561198000000222' && !(333 in RP.steams) && renders === 1, JSON.stringify(RP.steams) + ' ' + renders);
rpAskSteams(items);
check('asked again: nothing (each id once)', asked.length === 1, JSON.stringify(asked));
asked.length = 0; rpAskSteams([{ players: Array.from({ length: 450 }, (_, i) => ({ profile: 1000 + i })) }]);
check('450 new ids: three asks of at most 200', JSON.stringify(asked.map(x => x[1].length)) === '[200,200,50]', JSON.stringify(asked.map(x => x[1].length)));
// the menu: every name with a SteamID, as in the lobbies' lists (no "mention": Relic's players)
const fake = { querySelectorAll: sel => sel === '.nm[data-steam]' ? [{ dataset: { steam: S1, name: 'SirItos' } }] : [] };
rpBindNames(fake);
check('the names get the player menu (nickBind, no mention)', JSON.stringify(bound) === JSON.stringify([[S1, 'SirItos', false, true]]), JSON.stringify(bound));
// the call sites: every name of the tab through rpNm, the list and the detail bound, the command registered
check('replays.js: no player name drawn without rpNm', !/<span class="nm">\$\{esc\(p\.name/.test(rp) && (rp.match(/\$\{rpNm\((p|withMeta\(p\))\)\}/g) || []).length === 3, '');
check('replays.js: the list and the detail get the menu, the own files are asked for', /rpBindNames\(list\)/.test(rp) && /rpBindNames\(box\)/.test(rp) && /rpAskSteams\(/.test(rp.slice(b)), '');
check('main.rs: replays_steams registered', /replays::replays_steams/.test(readFileSync(join(ROOT, 'app', 'src', 'main.rs'), 'utf8')), '');
console.log(fails ? '\n' + fails + ' failed' : '\nall ok');
process.exit(fails ? 1 : 0);

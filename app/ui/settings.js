// Settings: the folder, the language, the cache, our servers and online play from here, the repair and the junk, Send logs.
// Split out of app.js (1.6.17), its section as it was; app.js keeps the core (the status, render, the add-ons, the update).
'use strict';
$('cancel').onclick = () => invoke('cancel_update');
$('browse').onclick = pickDir;
$('openDir').onclick = () => invoke('open_game_dir').catch(e => toast(e, true));
$('lang').onchange = e => invoke('set_setting', { key: 'lang', value: e.target.value }).then(reload);
$('usage').onchange = e => invoke('set_setting', { key: 'usage_stats', value: e.target.checked }).then(reload);
$('lanShare').onchange = e => invoke('set_setting', { key: 'lan_share', value: e.target.checked }).then(reload);
$('muteMention').onchange = e => invoke('set_setting', { key: 'mute_mention', value: e.target.checked }).then(reload);
$('addonCheck').onclick = async () => {
  const b = $('addonCheck'), note = $('addonCheckNote'); b.disabled = true; note.textContent = t('addonChecking');
  const changes = await refresh();
  b.disabled = false;
  if (changes && !changes.length) note.textContent = t('addonSame', { time: new Date().toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }) });
  else if (changes === null) note.textContent = '';
};
$('closeQuits').onchange = e => invoke('set_setting', { key: 'close_quits', value: e.target.checked }).then(reload);
$('cache').onchange = e => invoke('set_setting', { key: 'cache_mb', value: +e.target.value }).then(reload);
// ---------- Settings: how our servers answer from here (reach.rs) ----------
// two groups - the files (updates of Elite and the add-ons) and everything else (chat, Online, rooms, the launcher's own
// update); in each the one in use first; checked at the start and when one stops answering, or by the button
const NET_PLACE = { 'dow2ru.fintebtc.de': 'netMoscow', 'dow2.fintebtc.de': 'netGermany', 'rts.fintebtc.de': 'netGermany' };
const netHost = b => String(b || '').replace(/^https?:\/\//, '').split('/')[0];
const netPlace = b => { const h = netHost(b); return NET_PLACE[h] ? t(NET_PLACE[h]) : /\.r2\.dev$/.test(h) ? t('netR2') : h; };
var NET_LAST = null;   // (var: render() may call renderNet before this line ran) the last answer, drawn again with the rest of the window (the language may come later)
function renderNet(d) {
  if (d) NET_LAST = d; else d = NET_LAST;
  if (!d || !$('netList')) return;
  const grp = (key, g) => {
    const list = (g && g.list) || [];
    if (!list.length) return '';
    return `<div class="net-g"><div class="net-gh">${esc(t(key))}</div>` + list.map((p, i) => `<div class="net-r ${p.ms != null ? 'ok' : 'off'}">`
      + `<i></i><span class="net-p">${esc(netPlace(p.base))}</span><span class="net-h">${esc(netHost(p.base))}</span>`
      + `<span class="net-ms">${p.ms != null ? esc(t('netMs', { n: p.ms })) : esc(t('netNone'))}</span>`
      + (i === 0 && p.ms != null ? `<span class="chip">${esc(t('netUsed'))}</span>` : '<span></span>') + '</div>').join('') + '</div>';
  };
  $('netList').innerHTML = grp('netFiles', d.data) + grp('netApi', d.api) || `<div class="note">${esc(t('netWait'))}</div>`;
  const checked = d.data && d.data.checked && d.api && d.api.checked;
  $('netNote').textContent = checked ? t('netNoteDone') : t('netNoteOld');
}
invoke('net_status').then(renderNet).catch(() => {});
listen('net_rank', e => renderNet(e.payload));
// 1.4.10 (siritos 05.11): while a check runs - a spinner on its Check button, the results of the last one dimmed under it
function netBusy(btn, list, on) { btn.classList.toggle('busy', on); btn.setAttribute('aria-busy', on ? 'true' : 'false'); if (list) list.classList.toggle('busy', on); }
$('netCheck').onclick = async () => {
  const b = $('netCheck'); b.disabled = true; $('netNote').textContent = t('netChecking');
  netBusy(b, $('netList'), true);
  try { renderNet(await invoke('net_check')); } catch (e) { toast(e, true); }
  b.disabled = false; netBusy(b, $('netList'), false);
};
// ---------- Settings -> Online play (1.4.5, owner 03.11.2026): Relic, our game servers and forwarding from this computer ----------
// judged by the rules of the add-ons (netgame.rs / relay.c Relay 18-19): a node is usable when it answers UDP and a stream of
// 40 x 1000 bytes gets through (30+ answers, 3+ of the last 6); the nearest usable one is the one the game takes. By the button,
// and once when the tab is first opened; never while the game runs.
var GN = null, GN_BUSY = false, GN_OPENED = false;
var GN_PLACE = { '15.220.68.107': 'gnPoland', '116.202.106.150': 'netGermany', '83.217.192.34': 'netMoscow', '91.107.122.186': 'gnMoscow2' };
function gnName(n) { return GN_PLACE && GN_PLACE[n.ip] ? t(GN_PLACE[n.ip]) : (n.name || n.ip); }
function renderGameNet() {
  const box = $('gnList'); if (!box || !S) return;
  const comp = id => (S.components || []).find(x => x.id === id);
  // 1.4.14 (owner 05.11.2026): our game servers are part of Automatch now (its Relay.dll) - the tick relay_r2 is gone from the store
  const own = comp('relay_r2') || comp('automatch'), fwd = comp('relay_fwd');
  const tick = c => !c ? `<span class="chip">${esc(t('gnTickNone'))}</span>` : `<span class="chip ${c.enabled ? 'hot' : ''}">${esc(t(c.enabled ? 'gnTickOn' : 'gnTickOff'))}</span>`;
  const row = (cls, place, host, info, chip) => `<div class="net-r ${cls}"><i></i><span class="net-p">${esc(place)}</span><span class="net-h">${esc(host)}</span>`
    + `<span class="gn-i">${esc(info)}</span>${chip || '<span></span>'}</div>`;
  const wait = key => S.game_running ? '' : `<div class="note">${esc(t(key))}</div>`;   // while the game runs the note at the top says it once
  const sum = (cls, text, btn) => `<div class="gn-sum ${cls}"><span>${esc(text)}</span>${btn || ''}</div>`;
  let h = '';
  // Relic: the full check's answer, else the one of the launcher's start
  const R = (GN && GN.relic) || FWD_LAST;
  h += `<div class="net-g"><div class="net-gh">${esc(t('gnRelic'))}</div>`;
  if (R && R.relays_ms) {
    (R.relays || []).forEach((a, i) => {
      const ms = R.relays_ms[i];
      h += row(ms < 0 ? 'bad' : ms > 200 ? 'warn' : 'ok', t('gnRelicRelay'), a, ms < 0 ? t('gnClosed') : ms > 200 ? t('gnSlowMs', { n: ms }) : t('netMs', { n: ms }));
    });
    h += row(R.stream_ok ? 'ok' : 'bad', t('gnRelicApi'), 'dow-api.reliclink.com', R.stream_ok ? t('gnStreamOk', { kb: R.stream_kb, s: R.stream_s }) : t('gnStreamCut', { kb: R.stream_kb }));
    const fwdOn = fwd && fwd.enabled;   // the offer's button is under Forwarding servers below
    h += !R.problem ? sum('ok', t('gnRelicOk')) : sum(fwdOn ? 'warn' : 'bad', t(fwdOn ? 'gnRelicFwdOn' : 'gnRelicBad', { why: relicWhy(R) }));
  } else h += wait('gnRelicWait');
  h += '</div>';
  // our nodes - one list for both ticks (Relay.dll and RelayForward.dll use the same nodes and the same rule)
  const nodes = (GN && GN.nodes) || [];
  const usable = nodes.filter(n => n.udp && n.udp.usable);
  const near = nodes.find(n => GN && n.ip === GN.nearest);
  // 1.4.24: the matchmaker skips a node not used for this player (nodeq.js) - the next usable one, else the nearest anyway
  const nqA = ip => !!(window.nqAvoided && nqAvoided(ip));
  const nearMm = near && !nqA(near.ip) ? near : usable.filter(n => !nqA(n.ip)).sort((a, b) => (a.udp.ms || 0) - (b.udp.ms || 0))[0] || near;
  h += `<div class="net-g"><div class="net-gh">${esc(t('gnOwn'))} ${tick(own)}</div>`;
  if (nodes.length) {
    nodes.forEach(n => {
      const u = n.udp || {}, tc = n.tcp || {};
      const cls = u.usable ? 'ok' : u.ms != null ? 'warn' : 'bad';
      const parts = [u.ms != null ? t('gnUdpMs', { n: u.ms }) : t('gnUdpNone')];
      if (u.ms != null) parts.push(u.usable ? t('gnBurst', { got: u.got, n: u.n }) : t('gnBurstCut', { got: u.got, n: u.n, tail: u.tail }));
      parts.push(tc.state === 'ok' ? t('gnTcpOk', { kb: tc.kb }) : tc.state === 'cut' ? t('gnTcpCut', { kb: tc.kb }) : t('gnTcpNone'));
      const chip = n === near ? `<span class="chip">${esc(t('gnNearest'))}</span>` : !u.usable ? `<span class="chip off">${esc(t('gnNotUsed'))}</span>` : '';
      h += row(cls, gnName(n), n.ip, parts.join(' · '), chip) + (window.nqMark ? nqMark(n.ip) : '');   // 1.4.24: not used for this player (nodeq.js)
    });
    h += !own ? '' : !own.enabled ? sum('na', t('gnOwnOff')) : nearMm ? sum('ok', t('gnOwnPick', { node: gnName(nearMm) })) : sum('bad', t('gnOwnNone'));
    h += `<div class="note">${esc(t('gnOwnHow'))} ${esc(t('gnTcpInfo'))}</div>`;
    h += `<div class="note">${esc(t(GN.list === 'ladder' ? 'gnListLadder' : 'gnListBuiltin', { port: GN.port }))}</div>`;
  } else h += wait(GN_BUSY ? 'gnChecking' : 'gnNever');
  h += '</div>';
  // 1.4.6: our automatch (lobby) servers - OwnLobby.dll: the first usable one in order, none = Relic directly
  const LB = GN && GN.lobby, ol = comp('ownlobby') || comp('automatch');   // OwnLobby.dll ships with Automatch (the ownlobby tick is gone)
  h += `<div class="net-g"><div class="net-gh">${esc(t('gnLobby'))} ${tick(ol)}</div>`;
  if (LB && LB.servers) {
    const sec = ms => (Math.round((ms || 0) / 100) / 10).toString();
    LB.servers.forEach((r, i) => {
      const parts = [r.state === 'dns' ? t('gnLobbyDns') : r.state === 'none' ? t('gnLobbyNone') : t('gnLobbyConn', { n: r.connect_ms })];
      if (r.connect_ms != null) parts.push(!r.stream ? t('gnLobbyNoStream') : r.state === 'ok' ? t('gnLobbyStream', { b: r.bytes, s: sec(r.stream_ms) })
        : r.state === 'cut' ? t('gnLobbyCut', { b: r.bytes, s: sec(r.stream_ms) }) : t('gnLobbyNoAns'));
      const cls = r.state === 'ok' ? 'ok' : r.connect_ms != null ? 'warn' : 'bad';
      const chip = i === LB.pick ? `<span class="chip">${esc(t('gnLobbyUsed'))}</span>` : r.state !== 'ok' ? `<span class="chip off">${esc(t('gnNotUsed'))}</span>` : '';
      h += row(cls, r.host + ':' + r.port, r.ip && r.ip !== r.host ? r.ip : '', parts.join(' · '), chip);
    });
    const used = LB.pick != null ? LB.servers[LB.pick] : null;
    h += !ol ? '' : !ol.enabled ? sum('na', t('gnLobbyOff')) : used ? sum('ok', t('gnLobbyPick', { host: used.host + ':' + used.port })) : sum('bad', t('gnLobbyRelic'));
    h += `<div class="note">${esc(t('gnLobbyHow'))}</div>`;
  } else h += wait(GN_BUSY ? 'gnChecking' : 'gnNever');
  h += '</div>';
  // forwarding: the nearest usable node carries every Relic game (RelayForward.dll)
  h += `<div class="net-g"><div class="net-gh">${esc(t('gnFwd'))} ${tick(fwd)}</div>`;
  if (nodes.length && fwd) {
    if (usable.length) h += sum(fwd.enabled ? 'ok' : 'na', t('gnFwdFit', { list: usable.map(gnName).join(', ') }));
    if (fwd.enabled) h += near ? sum('ok', t('gnFwdVia', { node: gnName(near) })) : sum('bad', t('gnFwdNone'));
    else if (R && R.problem) h += near ? sum('warn', t('gnFwdOff'), `<button class="btn gold small" id="gnFwdOn"${S.busy || S.game_running ? ' disabled' : ''}>${esc(t('fwdOn'))}</button>`) : sum('bad', t('gnFwdNone'));
    else h += sum('na', R ? t('gnFwdNotNeeded') : t('gnFwdOff'));
  } else if (!nodes.length) h += wait(GN_BUSY ? 'gnChecking' : 'gnNever');
  h += '</div>';
  box.innerHTML = h;
  if ($('gnFwdOn')) $('gnFwdOn').onclick = fwdTurnOn;
  $('gnCheck').disabled = GN_BUSY || !!S.game_running;
  netBusy($('gnCheck'), box, GN_BUSY);
  $('gnNote').textContent = S.game_running ? t('gnGame') : GN_BUSY ? t('gnChecking') : t('gnNote');
  $('gnWhen').textContent = GN && GN.ts ? t('gnWhen', { time: new Date(GN.ts * 1000).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }) }) : '';
}
async function gameNetCheck() {
  if (GN_BUSY || !S || S.game_running) { renderGameNet(); return; }
  GN_BUSY = true; renderGameNet();
  try {
    const r = await invoke('game_net_check');
    if (r && !r.skipped) {
      GN = r;
      if (r.relic && r.relic.relays_ms) { FWD_LAST = FWD = r.relic; renderFwdBanner(); }   // the offer follows the newest check
    }
  } catch (e) { toast(e, true); }
  GN_BUSY = false; renderGameNet();
}
$('gnCheck').onclick = gameNetCheck;
$('saveMirror').onclick =() => invoke('set_setting', { key: 'extra_mirror', value: $('mirror').value.trim() }).then(refresh);
$('repair').onclick = () => startUpdate(true);
// "Clean up the junk": stray plugins into a backup folder, then check & repair puts Elite and the ticked add-ons back
$('junk').onclick = () => {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="box"><h3>${esc(t('junkAsk'))}</h3><p>${esc(t('junkText'))}</p><div class="row"><button class="btn red" id="jkDo">${esc(t('junkDo'))}</button>
    <button class="btn gold" id="jkNo">${esc(t('junkCancel'))}</button></div></div>`;
  document.body.appendChild(m);
  m.querySelector('#jkNo').onclick = () => m.remove();
  m.querySelector('#jkDo').onclick = async () => {
    m.remove();
    try {
      const r = await invoke('clean_junk');
      toast((r.moved || []).length ? t('junkDone', { n: r.moved.length, dir: r.backup }) : t('junkNone'));
      await startUpdate(true);
    } catch (e) { toast(e, true); }
  };
};
// ник для логов запоминаем (localStorage может быть недоступен — тогда просто без ника)
let diagSaved = '', diagTyped = false;
try { diagSaved = localStorage.getItem('diagName') || ''; } catch (e) {}
$('diagName').value = diagSaved;
$('diagName').oninput = () => { diagTyped = true; };
$('diagName').onchange = () => { diagSaved = $('diagName').value.trim(); try { localStorage.setItem('diagName', diagSaved); } catch (e) {} };
// signed in: the field shows the profile's name (owner 03.11.2026) - the player sees what goes with the logs and can
// change it; signed out: the nickname typed before, as it was
function diagNameFromProfile() {
  // the developers' chat (its name goes with the logs too): an empty one gets the profile's name and keeps it; a name of one's own stays
  const me0 = CH.me && CH.me.signed_in ? CH.me : null;
  if (me0 && me0.name && $('fbName') && !$('fbName').value.trim()) { $('fbName').value = me0.name; invoke('fb_set_name', { name: me0.name }).catch(() => {}); }
  if (diagTyped) return;
  const me = CH.me && CH.me.signed_in ? CH.me : null;
  $('diagName').value = me && me.name ? me.name : diagSaved;
}
async function sendLogs(btn, label) {
  btn.disabled = true; btn.textContent = t('sending');
  try { const id = await invoke('send_logs', { who: $('diagName').value.trim() }); toast(t('logsSent', { id })); }
  catch (e) { toast(e, true); }
  finally { btn.disabled = false; btn.textContent = t(label); }
}
$('sendLogs').onclick = () => sendLogs($('sendLogs'), 'sendLogs');
$('sendLogsHome').onclick = () => sendLogs($('sendLogsHome'), 'sendLogs');

$('verBtn').onclick = e => { e.stopPropagation(); verOpen($('verList').classList.contains('hidden')); };
document.addEventListener('click', e => {
  if (!$('verList').contains(e.target)) verOpen(false);
  if (!$('pop').contains(e.target)) popClose();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { verOpen(false); popClose(); } });
window.addEventListener('resize', popClose);

// The feedback chat with the developers (Home's chat, its Developers tab).
// Split out of app.js (1.6.17), its section as it was; app.js keeps the core (the status, render, the add-ons, the update).
'use strict';
// ---------- feedback chat with the developers ----------
const FB = { pics: [], last: '', timer: null };
async function fbInit() {
  try {
    const i = await invoke('fb_info');
    $('fbName').value = i.name || ''; $('fbId').textContent = 'id ' + i.uid.slice(0, 8);
    diagNameFromProfile();   // an empty name: the signed-in profile's
  } catch (e) {}
  $('fbName').onchange = () => invoke('fb_set_name', { name: $('fbName').value });
  $('fbText').placeholder = t('fbPlaceholder');
  $('fbSend').onclick = fbSend;
  $('fbText').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); fbSend(); } };   // Enter sends, Shift+Enter = new line (like the chat)
  $('fbAttach').onclick = () => $('fbFile').click();
  $('fbFile').onchange = e => { [...e.target.files].forEach(fbAddFile); e.target.value = ''; };
  document.addEventListener('paste', e => {
    const items = [...(e.clipboardData?.items || [])].filter(i => i.type.startsWith('image/'));
    if (!items.length) return;
    e.preventDefault(); items.forEach(i => fbAddFile(i.getAsFile()));
  });
  fbWatch();
}
function fbAddFile(f) {
  if (!f) return;
  if (f.size > 8 << 20) return toast(t('fbTooBig'), true);
  const r = new FileReader();
  r.onload = () => { FB.pics.push(r.result); fbPics(); };
  r.readAsDataURL(f);
}
function fbPics() {
  $('fbPics').innerHTML = FB.pics.map((p, i) => `<div><img src="${p}"><b data-i="${i}">×</b></div>`).join('');
  $('fbPics').querySelectorAll('b').forEach(b => b.onclick = () => { FB.pics.splice(+b.dataset.i, 1); fbPics(); });
}
async function fbSend() {
  const text = $('fbText').value.trim();
  if (!text && !FB.pics.length) return;
  $('fbSend').disabled = true;
  try {
    await invoke('fb_set_name', { name: $('fbName').value });
    await invoke('fb_send', { text, images: FB.pics });
    $('fbText').value = ''; FB.pics = []; fbPics(); toast(t('fbSent')); fbLoad();
  } catch (e) { toast(e, true); }
  $('fbSend').disabled = false;
}
function fbWatch() {   // the developers' chat: asked every 20 s only while its tab is open and the window seen
  clearInterval(FB.timer); FB.timer = null;
  if (!FB.open || document.hidden) return;
  fbLoad(); FB.timer = setInterval(fbLoad, 20000);
}
document.addEventListener('visibilitychange', () => fbWatch());
// 1.5.10: the launcher's own lines in the thread in the player's language - "sent logs" (send_logs writes it in Russian and
// English for the developers) and the server's moderation answer (Russian)
function fbMsgText(m) {
  const x = String(m.text || ''), lg = x.match(/^(📋|📶) .*· sent (the connection test and )?logs: (\S+) \((\d+) files\)/);
  if (lg) return t(lg[1] === '📶' ? 'fbNoteNet' : 'fbNoteLogs', { id: lg[3], n: lg[4] });
  return lang !== 'ru' && srvRuKey(x) ? t(srvRuKey(x)) : x;
}
async function fbLoad() {
  let d; try { d = await invoke('fb_thread'); } catch (e) { return; }
  const key = JSON.stringify(d.messages.map(m => m.id));
  if (key === FB.last) return; FB.last = key;
  const box = $('fbMsgs'), atEnd = box.scrollTop + box.clientHeight > box.scrollHeight - 30;
  const when = ts => new Date(ts * 1000).toLocaleString(lang, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  box.innerHTML = d.messages.length ? d.messages.map(m => `<div class="fb-m ${m.author === 'dev' ? 'dev' : 'me'}"><div class="w">${esc(m.author === 'dev' ? t('fbDev') : (m.name || t('fbMe')))} · ${when(m.ts)}</div>${esc(fbMsgText(m))}` +
    m.images.map(f => `<img src="${d.img_base}${encodeURIComponent(f)}?uid=${encodeURIComponent(d.uid)}" data-u="${d.img_base}${encodeURIComponent(f)}?uid=${encodeURIComponent(d.uid)}">`).join('') + '</div>').join('')
    : `<div class="fb-empty">${esc(t('fbEmpty'))}</div>`;
  box.querySelectorAll('img').forEach(i => i.onclick = () => open(i.dataset.u));
  if (atEnd || !FB.shown) box.scrollTop = box.scrollHeight; FB.shown = true;
}
fbInit();

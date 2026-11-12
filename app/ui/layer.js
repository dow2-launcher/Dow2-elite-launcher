// 1.5.12 (owner 12.11.2026): what floats over the window - the tooltips and the lobby's own drop-downs (race, hero, Invite) - is
// drawn above everything. Before, a tooltip was the element's ::after and a list was position:absolute inside its button's box,
// so a box that scrolls (the lobby's teams) cut them off and grew a scroll bar under them.
// Tooltips: one box at the end of <body>, placed by the element's rectangle - above it, under it in the header (or when there is
// no room above), to the right in the narrow Rooms panel - and never past the window's edges.
// Drop-downs: the open list is moved into a layer at the end of <body> (popOut, after every redraw of the lobby) and placed by its
// button: under it, above when there is no room under it, its height cut to the window.
'use strict';
(() => {
  const tip = document.createElement('div'); tip.className = 'tiplayer'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
  const pops = document.createElement('div'); pops.className = 'poplayer';
  document.body.append(pops, tip);
  let at = null, mx = -1, my = -1;
  const below = a => !!a.closest('header, .news-links, .tipdown, .rnav .rmine-x');
  const leftAligned = a => a.matches('.room .rp, .on-p');
  const maxW = a => a.closest('.plw') ? 320 : leftAligned(a) ? 240 : a.closest('.on-mh .lvw') ? 200 : 260;
  function place(a) {
    const txt = a.dataset.tip;
    if (!txt) { hide(); return; }
    let side = below(a) ? 'below' : 'above';
    if (a.closest('.rnav') && !a.closest('.rmine-x')) { if (innerWidth > 1000) { hide(); return; } side = 'right'; }   // wide: the labels are there
    tip.style.maxWidth = maxW(a) + 'px';
    if (tip.textContent !== txt) tip.textContent = txt;
    tip.hidden = false;
    const r = a.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, W = innerWidth, H = innerHeight, g = 9, m = 6;
    let x = 0, y = 0;
    if (side === 'right') { x = r.right + 8; y = r.top + r.height / 2 - h / 2; if (x + w > W - m) side = 'above'; }
    if (side !== 'right') {
      x = leftAligned(a) ? r.left : r.right + 4 - w;
      if (side === 'above' && r.top - g - h < m) side = 'below';
      else if (side === 'below' && r.bottom + g + h > H - m && r.top - g - h >= m) side = 'above';
      y = side === 'above' ? r.top - g - h : r.bottom + g;
    }
    tip.style.left = Math.round(Math.max(m, Math.min(x, W - w - m))) + 'px';
    tip.style.top = Math.round(Math.max(m, Math.min(y, H - h - m))) + 'px';
    tip.dataset.side = side;
  }
  function hide() { at = null; tip.hidden = true; }
  const tipOf = el => (el && el.closest ? el.closest('[data-tip]') : null);
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; }, { passive: true, capture: true });
  document.addEventListener('mouseover', e => { const a = tipOf(e.target); if (a === at) return; if (a) { at = a; place(a); } else hide(); }, true);
  document.documentElement.addEventListener('mouseleave', hide);
  document.addEventListener('focusin', e => { const a = tipOf(e.target); if (a && e.target.matches(':focus-visible')) { at = a; place(a); } });
  document.addEventListener('focusout', hide);
  document.addEventListener('pointerdown', hide, true);
  addEventListener('resize', () => { hide(); popPlaceAll(); });
  addEventListener('scroll', e => {           // only a scroll that moves the element (the chat scrolling by itself does not)
    const t = e.target;
    if (at && (t === document || (t.contains && t.contains(at)))) hide();
    if (!(t instanceof Node) || !pops.contains(t)) popPlaceAll();
  }, true);
  // a redraw replaced the element under the mouse, or its text changed (a countdown on a button): follow it
  setInterval(() => {
    if (!at) return;
    if (!at.isConnected) { const a = mx >= 0 ? tipOf(document.elementFromPoint(mx, my)) : null; if (a) { at = a; place(a); } else hide(); }
    else if (tip.textContent !== at.dataset.tip) place(at);
  }, 250);
  window.tipHide = hide;

  // ---------- the drop-downs ----------
  function popPlace(l) {
    const b = l._anchor; if (!b || !b.isConnected) return;
    const r = b.getBoundingClientRect(), W = innerWidth, H = innerHeight, m = 6, g = 3;
    l.style.maxHeight = 'none'; l.style.left = '0px'; l.style.top = '0px';   // its whole height first (a flex list would shrink to fit)
    const want = Math.min(l.offsetHeight, l._maxH || 330), w = l.offsetWidth;
    const under = H - r.bottom - g - m, over = r.top - g - m;
    const up = under < want && over > under;
    const hgt = Math.max(120, Math.min(want, up ? over : under));
    l.style.maxHeight = hgt + 'px';
    let x = l.classList.contains('lr-invl') ? r.right + 8 - w : r.left - 6;
    x = Math.max(m, Math.min(x, W - w - m));
    l.style.left = Math.round(x) + 'px';
    l.style.top = Math.round(up ? r.top - g - Math.min(hgt, l.offsetHeight) : r.bottom + g) + 'px';
    l.classList.toggle('up', up);
  }
  function popPlaceAll() { pops.querySelectorAll('.ldd-l').forEach(popPlace); }
  // after a redraw of a box: its open lists go into the layer (their handlers are bound already and stay with them)
  window.popOut = box => {
    pops.replaceChildren();
    if (!box) return;
    box.querySelectorAll('.ldd.open > .ldd-l').forEach(l => {
      const b = l.parentElement.querySelector(':scope > button');
      l._anchor = b; l._maxH = parseFloat(getComputedStyle(l).maxHeight) || 330;
      l.classList.add('popped'); pops.appendChild(l); popPlace(l);
    });
  };
  window.popClear = () => pops.replaceChildren();
})();

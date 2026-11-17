/* BURIN part: clean (loaded when first used) */
/* ---------- a clean screen for teaching with the iPad cabled to a TV or projector (task 2.6).
   An iPad Air 3 only mirrors its screen over the cable, so whatever the TV must not show is hidden on the iPad too:
   the page fills the screen and no bar or button stays on it. The pen writes straight away with the tool, colour and
   width chosen last. A finger tapping the edge of the screen brings back the tool bar, the page number and the way
   out; they go again when the pen starts writing, or after about 3 seconds untouched. A pen at the edge writes as
   usual (no bar), a finger sliding the page in the middle never brings the bars. The app does all of this itself,
   with no AI, and it works offline. Leaving: the way out that comes with the bars, or Escape (both run setFocus(false),
   which calls cleanEnd) ---------- */
const CLEAN = { edge: 32, idle: 3000, t: 0, tap: null, tool: null, on: false };
function cleanCss() {
  if (document.getElementById('cleanCss')) return;
  const st = document.createElement('style'); st.id = 'cleanCss';
  const hide = ['.dock', '.pagenav', '#bExitFull', '.addpage', '#nbScroll', '#livePill', '#exMini'].map((s) => 'body.clean:not(.cbar) ' + s).join(', ');
  st.textContent = hide + ' { visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }\n'
    + 'body.clean .dock, body.clean .pagenav, body.clean #bExitFull { transition: opacity 0.18s, visibility 0.18s; }\n'
    + 'body.clean #updBar { display: none !important; }\n'
    + 'body.clean #bExitFull span { display: inline; }\n';
  document.head.appendChild(st);
}
function cleanIn(x, y) {
  const r = vp.getBoundingClientRect(), e = CLEAN.edge;
  return x - r.left < e || r.right - x < e || y - r.top < e || r.bottom - y < e;
}
/* something on the bars was touched, or a menu of the tool bar is open: the bars stay */
function cleanBusy() { return !!document.querySelector('.dock .pop:not([hidden]), #tabMenu:not([hidden])'); }
function cleanArm() {
  clearTimeout(CLEAN.t);
  CLEAN.t = setTimeout(() => { if (!CLEAN.on) return; if (cleanBusy()) cleanArm(); else cleanBars(false); }, CLEAN.idle);
}
function cleanBars(on) {
  if (!CLEAN.on) return;
  clearTimeout(CLEAN.t);
  if (on && !document.body.classList.contains('cbar')) { document.body.classList.add('cbar'); try { placeDock(); placeExitFull(); } catch (e) { /* fine */ } }
  if (!on && document.body.classList.contains('cbar')) { try { closePops(); } catch (e) { /* fine */ } document.body.classList.remove('cbar'); }
  if (on) cleanArm();
}
function cleanOnBar(t) { return !!(t && t.closest && t.closest('.dock, .pagenav, #bExitFull, #livePill, #exMini, #tabMenu, .selbar, .sheet')); }
function cleanDown(e) {
  if (!CLEAN.on) return;
  const bars = document.body.classList.contains('cbar');
  if (cleanOnBar(e.target)) { if (bars) clearTimeout(CLEAN.t); return; }
  if (e.pointerType === 'pen') { CLEAN.tap = null; if (bars) cleanBars(false); return; }
  if (e.pointerType !== 'touch') { if (bars && e.pointerType === 'mouse' && !cleanIn(e.clientX, e.clientY)) cleanBars(false); return; }
  /* a palm, a hand resting while the pen writes, or a second finger is never a tap on the edge */
  const big = (e.width || 0) > 70 || (e.height || 0) > 70, pen = S.penDown > 0 || now() - (S.lastPen || 0) < 650;
  if (CLEAN.tap || big || pen || !e.isPrimary || !cleanIn(e.clientX, e.clientY)) {
    if (CLEAN.tap && CLEAN.tap.id !== e.pointerId) CLEAN.tap = null;
    if (bars && !cleanIn(e.clientX, e.clientY)) cleanBars(false);
    return;
  }
  CLEAN.tap = { id: e.pointerId, x: e.clientX, y: e.clientY, t: now(), eat: !!S.finger };
  /* a finger that draws would leave a dot at the edge: the edge is for calling the bars */
  if (CLEAN.tap.eat) { e.stopPropagation(); e.preventDefault(); }
}
function cleanMove(e) {
  if (!CLEAN.on) return;
  const tp = CLEAN.tap;
  if (tp && tp.id === e.pointerId) { if (Math.hypot(e.clientX - tp.x, e.clientY - tp.y) > 14) tp.moved = true; if (tp.eat) e.stopPropagation(); return; }
  /* a mouse on a computer: coming to the edge shows the bars */
  if (e.pointerType === 'mouse' && !e.buttons && cleanIn(e.clientX, e.clientY)) cleanBars(true);
}
function cleanUp(e) {
  const tp = CLEAN.tap; if (!CLEAN.on || !tp || tp.id !== e.pointerId) return;
  CLEAN.tap = null; if (tp.eat) e.stopPropagation();
  if (e.type === 'pointerup' && !tp.moved && now() - tp.t < 600) cleanBars(true);
}
function cleanKey() { if (CLEAN.on && document.body.classList.contains('cbar')) cleanArm(); }
function cleanStart() {
  if (CLEAN.on || S.present || S.show) return;
  cleanCss();
  CLEAN.on = true; S.clean = true;
  /* the pen writes as soon as the screen is clean: a tool that does not write steps aside until leaving */
  CLEAN.tool = null;
  if (!['pen', 'hl', 'eraser', 'laser'].includes(S.tool)) { CLEAN.tool = S.tool; setTool('pen'); }
  const b = $('#bExitFull'), sp = b.querySelector('span');
  CLEAN.exit = [b.getAttribute('aria-label'), sp ? sp.textContent : ''];
  b.setAttribute('aria-label', 'ออกจากจอสะอาด'); if (sp) sp.textContent = 'ออกจากจอสะอาด';
  document.body.classList.add('clean'); document.body.classList.remove('cbar');
  window.addEventListener('pointerdown', cleanDown, true);
  window.addEventListener('pointermove', cleanMove, true);
  window.addEventListener('pointerup', cleanUp, true);
  window.addEventListener('pointercancel', cleanUp, true);
  window.addEventListener('pointerup', cleanKey);
  setFocus(true);
  if (store_ls.get('tp-clean-hint') !== '1') { store_ls.set('tp-clean-hint', '1'); toast('แตะขอบจอด้วยนิ้วเพื่อเรียกแถบเครื่องมือ', 3500); }
}
function cleanEnd() {
  if (!CLEAN.on) return;
  CLEAN.on = false; S.clean = false; CLEAN.tap = null; clearTimeout(CLEAN.t);
  window.removeEventListener('pointerdown', cleanDown, true);
  window.removeEventListener('pointermove', cleanMove, true);
  window.removeEventListener('pointerup', cleanUp, true);
  window.removeEventListener('pointercancel', cleanUp, true);
  window.removeEventListener('pointerup', cleanKey);
  document.body.classList.remove('clean', 'cbar');
  const b = $('#bExitFull'), sp = b.querySelector('span');
  if (CLEAN.exit) { b.setAttribute('aria-label', CLEAN.exit[0]); if (sp) sp.textContent = CLEAN.exit[1]; }
  if (CLEAN.tool && S.tool === 'pen') setTool(CLEAN.tool);
  CLEAN.tool = null;
}


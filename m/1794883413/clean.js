/* BURIN part: clean (loaded when first used) */
/* ---------- a clean screen for teaching with the iPad cabled to a TV or projector (task 2.6), after the presentation
   mode of GoodNotes: the audience sees only the page (no bar, no button), the whole page (not the part zoomed into),
   a page turns at once instead of sliding, the laser pointer shows, and part of the page can be kept from the audience.
   An iPad Air 3 in Safari can only mirror its screen over the cable (a web page cannot draw something else on the TV, as
   an installed app can), so whatever the TV must not show is hidden on the iPad too. What the app adds for its own kinds
   of teaching: a cover that is slid down to show the working line by line (the sheet of paper on an overhead projector),
   a pause that blacks the screen out while the class listens, and a presenter clicker (page keys, B or full stop).
   A finger tapping the edge of the screen brings back the tool bar, the page number and the presentation bar; they go
   again when the pen starts writing, or after about 3 seconds untouched. A pen at the edge writes as usual, a finger
   sliding the page in the middle never brings the bars. All done by the app, no AI, works offline. Leaving: the way out
   on the presentation bar, or Escape (both run setFocus(false), which calls cleanEnd).
   The second kind, "no bars at all" (CLEAN.strict), is for when the TV must never show a bar, not even for a moment: since
   the iPad mirrors, nothing is ever shown on the iPad either, and the teacher works by gestures alone: the pen writes, a
   finger slides the page and pulls to the next one, two fingers tap to undo and three to redo (as always), a finger
   tapping the edge switches between the pen and the laser, three fingers held still for a second leave; a clicker or a
   keyboard turns pages, pauses (B or full stop) and leaves (Escape). No message, menu or AI card shows meanwhile ---------- */
const CLEAN = { strict: false, hold: null, keep: null, edge: 32, idle: 3000, t: 0, tap: null, tool: null, on: false, whole: true, cover: false, coverY: 0.5, flow: null };
function cleanCss() {
  if (document.getElementById('cleanCss')) return;
  const st = document.createElement('style'); st.id = 'cleanCss';
  const bars = ['.dock', '.pagenav', '#cleanBar', '.addpage', '#nbScroll', '#livePill', '#exMini'];
  st.textContent = bars.map((s) => 'body.clean:not(.cbar) ' + s).join(', ') + ' { visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }\n'
    + 'body.clean .dock, body.clean .pagenav, body.clean #cleanBar { transition: opacity 0.18s, visibility 0.18s; }\n'
    + 'body.clean #updBar, body.clean #bExitFull { display: none !important; }\n'
    + 'body.clean.cblank #toast { display: none !important; }\n'
    + 'body.cstrict #toast, body.cstrict .selbar, body.cstrict .convbar, body.cstrict .peekcard, body.cstrict #pull, body.cstrict #aiFloat, body.cstrict .aiat, body.cstrict .busy, body.cstrict #tabMenu, body.cstrict .fpeek { display: none !important; }\n'
    + '#cleanIntro { position: absolute; inset: 0; z-index: 55; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.45); }\n'
    + '#cleanIntro > div { box-sizing: border-box; width: calc(100% - 32px); max-width: 460px; padding: 18px 20px; border-radius: 16px; background: var(--surface); color: var(--fg); box-shadow: var(--shadow); line-height: 1.7; font-size: 15px; }\n'
    + '#cleanIntro b { display: block; font-size: 17px; margin-bottom: 6px; }\n'
    + '#cleanIntro ul { margin: 6px 0 12px; padding-left: 20px; }\n'
    + '#cleanIntro .row2 { display: flex; gap: 8px; justify-content: flex-end; }\n'
    + '#cleanIntro button { min-height: 44px; padding: 0 18px; border: 0; border-radius: 12px; font: inherit; font-weight: 600; cursor: pointer; background: var(--surface-2); color: var(--fg); }\n'
    + '#cleanIntro button.go { background: var(--accent); color: var(--accent-fg, #fff); }\n'
    + '#cleanBar { position: absolute; right: 12px; top: 12px; z-index: 6; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px; max-width: calc(100% - 24px); padding: 4px; border-radius: 14px; background: var(--surface); color: var(--fg); box-shadow: var(--shadow); }\n'
    + '#cleanBar button { min-height: 44px; padding: 0 12px; border: 0; border-radius: 10px; background: transparent; color: inherit; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; }\n'
    + '#cleanBar button[aria-pressed="true"] { background: var(--chrome); color: var(--chrome-fg); }\n'
    + '#cleanBar #ccOut { background: var(--surface-2); }\n'
    + '#cleanCover { position: absolute; left: 0; right: 0; bottom: 0; z-index: 4; background: #3A3F4A; background-image: repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0 12px, rgba(255,255,255,0) 12px 24px); box-shadow: 0 -2px 10px rgba(0,0,0,0.35); touch-action: none; }\n'
    + '#cleanCover .ccgrab { position: absolute; left: 50%; top: 0; transform: translate(-50%, -50%); min-width: 120px; height: 44px; padding: 0 16px; border: 0; border-radius: 22px; background: #3A3F4A; color: #E8EAF0; font: inherit; font-size: 14px; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,0.3); cursor: ns-resize; touch-action: none; }\n'
    + '#cleanBlank { position: absolute; inset: 0; z-index: 50; background: #000; touch-action: none; }\n'
    + '#cleanBlank span { position: absolute; left: 0; right: 0; bottom: 18px; text-align: center; color: #262626; font-size: 14px; }\n';
  document.head.appendChild(st);
}
/* ---- the presentation bar: whole page, cover, pause, the way out ---- */
function cleanBarMake() {
  let bar = document.getElementById('cleanBar'); if (bar) return bar;
  bar = document.createElement('div'); bar.id = 'cleanBar'; bar.className = 'no-ink'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'การนำเสนอ');
  bar.innerHTML = '<button type="button" id="ccWhole" aria-pressed="false">ทั้งหน้า</button><button type="button" id="ccCover" aria-pressed="false">ม่านบัง</button><button type="button" id="ccBlank">พักจอ</button><button type="button" id="ccOut">ออกจากจอสะอาด</button>';
  vp.appendChild(bar);
  bar.querySelector('#ccWhole').onclick = () => { cleanWholeSet(!CLEAN.whole); cleanArm(); };
  bar.querySelector('#ccCover').onclick = () => { cleanCoverSet(!CLEAN.cover); cleanArm(); };
  bar.querySelector('#ccBlank').onclick = () => cleanBlankSet(true);
  bar.querySelector('#ccOut').onclick = () => setFocus(false);
  return bar;
}
function cleanBarSync() {
  const w = $('#ccWhole'), c = $('#ccCover'); if (!w) return;
  w.setAttribute('aria-pressed', CLEAN.whole ? 'true' : 'false'); c.setAttribute('aria-pressed', CLEAN.cover ? 'true' : 'false');
}
/* top right; when the tool bar runs along the top over that corner, just under it */
function cleanBarPlace() {
  const bar = $('#cleanBar'), d = $('#dock'); if (!bar || !d) return;
  const v = vp.getBoundingClientRect(), r = d.getBoundingClientRect(), bw = bar.offsetWidth;
  let top = 12;
  if (r.width && r.right > v.right - bw - 24 && r.top < v.top + 70) top = Math.round(r.bottom - v.top + 8);
  bar.style.top = top + 'px';
}
/* ---- the whole page on screen (as GoodNotes shows the audience the full page): the page fits the screen both ways, and
   the next page comes at once in the same place instead of sliding up from below ---- */
function cleanFit() {
  if (!CLEAN.on || !CLEAN.whole) return;
  const vw = vp.clientWidth, vh = vp.clientHeight, pw = W * S.base, ph = H * S.base; if (!pw || !ph) return;
  const z = Math.max(0.5, Math.min(1, (vh - 24) / ph, (vw - 24) / pw));
  S.zoom = z; S.tx = (vw - pw * z) / 2; S.ty = Math.max(12, (vh - ph * z) / 2); S.pull = 0;
  applyT(); resizeLater();
}
function cleanWholeSet(on) {
  CLEAN.whole = !!on; store_ls.set('tp-clean-whole', on ? '1' : '0');
  cleanFlow(); cleanBarSync();
  if (on) cleanFit(); else fit();
}
/* page turning in the whole-page view is one page at a time (pull past the end, the page buttons or a clicker) */
function cleanFlow() {
  const want = CLEAN.on && CLEAN.whole ? false : CLEAN.flow;
  if (CLEAN.flow === null || FLOW.on === want) return;
  FLOW.on = want; try { renderPeeks().catch(() => {}); } catch (e) { /* fine */ }
}
/* ---- the cover: a sheet over the lower part of the screen, slid down to show the working line by line ---- */
function cleanCoverSet(on) {
  CLEAN.cover = !!on; cleanBarSync();
  let cv = document.getElementById('cleanCover');
  if (!on) { if (cv) cv.remove(); return; }
  if (!cv) {
    cv = document.createElement('div'); cv.id = 'cleanCover'; cv.className = 'no-ink';
    cv.innerHTML = '<button type="button" class="ccgrab" aria-label="ลากเพื่อเลื่อนม่าน">ลากม่าน</button>';
    vp.appendChild(cv);
    const g = cv.querySelector('.ccgrab');
    g.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); try { g.setPointerCapture(e.pointerId); } catch (er) { /* fine */ }
      const r = vp.getBoundingClientRect();
      const id = e.pointerId;
      const mv = (ev) => { if (ev.pointerId !== id) return; ev.stopPropagation(); CLEAN.coverY = clamp((ev.clientY - r.top) / r.height, 0.04, 1); cleanCoverPlace(); };
      const up = (ev) => { if (ev.pointerId !== id) return; mv(ev); window.removeEventListener('pointermove', mv, true); window.removeEventListener('pointerup', up, true); window.removeEventListener('pointercancel', up, true); };
      window.addEventListener('pointermove', mv, true); window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', up, true);
    });
  }
  cleanCoverPlace();
}
function cleanCoverPlace() { const cv = document.getElementById('cleanCover'); if (cv) cv.style.top = Math.round(CLEAN.coverY * 1000) / 10 + '%'; }
/* ---- the pause: the screen goes black (B or full stop on a clicker or keyboard); any touch or key brings the page back ---- */
function cleanBlankSet(on) {
  let bl = document.getElementById('cleanBlank');
  document.body.classList.toggle('cblank', !!on);
  if (!on) { if (bl) bl.remove(); return; }
  cleanBars(false);
  if (!bl) {
    bl = document.createElement('div'); bl.id = 'cleanBlank'; bl.className = 'no-ink'; bl.innerHTML = '<span>แตะเพื่อกลับมาที่หน้า</span>';
    bl.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); cleanBlankSet(false); });
    vp.appendChild(bl);
  }
}
function cleanKeys(e) {
  if (!CLEAN.on || (e.target && e.target.closest && e.target.closest('input,select,textarea,[contenteditable="true"]'))) return;
  const blank = document.body.classList.contains('cblank'), k = String(e.key || '').toLowerCase();
  if (blank) { if (['shift', 'control', 'alt', 'meta'].includes(k)) return; e.preventDefault(); e.stopPropagation(); cleanBlankSet(false); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (k === 'b' || k === '.' || e.code === 'KeyB' || e.code === 'Period') { e.preventDefault(); e.stopPropagation(); cleanBlankSet(true); }
}
/* ---- the bars come with a finger at the edge ---- */
function cleanIn(x, y) {
  const r = vp.getBoundingClientRect(), e = CLEAN.edge;
  return x - r.left < e || r.right - x < e || y - r.top < e || r.bottom - y < e;
}
/* a menu of the tool bar is open: the bars stay */
function cleanBusy() { return !!document.querySelector('.dock .pop:not([hidden]), #tabMenu:not([hidden])'); }
function cleanArm() {
  clearTimeout(CLEAN.t);
  CLEAN.t = setTimeout(() => { if (!CLEAN.on) return; if (cleanBusy()) cleanArm(); else cleanBars(false); }, CLEAN.idle);
}
function cleanBars(on) {
  if (!CLEAN.on || (on && CLEAN.strict)) return;
  clearTimeout(CLEAN.t);
  if (on && !document.body.classList.contains('cbar')) { document.body.classList.add('cbar'); try { placeDock(); cleanBarPlace(); } catch (e) { /* fine */ } }
  if (!on && document.body.classList.contains('cbar')) { try { closePops(); } catch (e) { /* fine */ } document.body.classList.remove('cbar'); }
  if (on) cleanArm();
}
function cleanOnBar(t) { return !!(t && t.closest && t.closest('.dock, .pagenav, #cleanBar, #livePill, #exMini, #tabMenu, .selbar, .sheet, .ccgrab, #cleanBlank')); }
/* three fingers held still for a second leave the screen with no bars (a quick three-finger tap stays a redo) */
function cleanHold(e) {
  if (!CLEAN.strict || e.pointerType !== 'touch') return;
  const h = CLEAN.hold || (CLEAN.hold = { pts: new Map(), t: 0 });
  if (e.type === 'pointerdown') {
    h.pts.set(e.pointerId, [e.clientX, e.clientY, e.clientX, e.clientY]);
    clearTimeout(h.t);
    if (h.pts.size === 3) h.t = setTimeout(() => { const still = [...h.pts.values()].every((p) => Math.hypot(p[2] - p[0], p[3] - p[1]) < 30); if (CLEAN.on && h.pts.size === 3 && still) { h.pts.clear(); setFocus(false); } }, 1000);
  } else if (e.type === 'pointermove') { const p = h.pts.get(e.pointerId); if (p) { p[2] = e.clientX; p[3] = e.clientY; } }
  else { h.pts.delete(e.pointerId); if (h.pts.size < 3) clearTimeout(h.t); }
}
function cleanDown(e) {
  if (!CLEAN.on) return;
  cleanHold(e);
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
  cleanHold(e);
  const tp = CLEAN.tap;
  if (tp && tp.id === e.pointerId) { if (Math.hypot(e.clientX - tp.x, e.clientY - tp.y) > 14) tp.moved = true; if (tp.eat) e.stopPropagation(); return; }
  /* a mouse on a computer: coming to the edge shows the bars */
  if (e.pointerType === 'mouse' && !e.buttons && !CLEAN.strict && cleanIn(e.clientX, e.clientY) && !document.body.classList.contains('cblank')) cleanBars(true);
}
function cleanUp(e) {
  if (CLEAN.on) cleanHold(e);
  const tp = CLEAN.tap; if (!CLEAN.on || !tp || tp.id !== e.pointerId) return;
  CLEAN.tap = null; if (tp.eat) e.stopPropagation();
  if (e.type === 'pointerup' && !tp.moved && now() - tp.t < 600) { if (CLEAN.strict) setTool(S.tool === 'laser' ? 'pen' : 'laser'); else cleanBars(true); }
}
function cleanKeep() { if (CLEAN.on && document.body.classList.contains('cbar')) cleanArm(); }
/* before the screen with no bars, the first time: how to work it, said before the class watches (the TV shows it too);
   the way out is also written on the menu choice */
function cleanIntro(go) {
  cleanCss();
  const d = document.createElement('div'); d.id = 'cleanIntro'; d.className = 'no-ink';
  d.innerHTML = '<div role="dialog" aria-modal="true"><b>จอสะอาด ไม่มีแถบเลย</b>ระหว่างนำเสนอจะไม่มีแถบ ปุ่ม หรือข้อความใดขึ้นบนจอ ทั้งบน iPad และทีวี<ul>'
    + '<li>ปากกาเขียนด้วยสีและขนาดเส้นที่เลือกไว้ตอนนี้</li><li>นิ้วเลื่อนหน้า ดึงเพื่อไปหน้าถัดไป</li><li>แตะสองนิ้ว ย้อนกลับ แตะสามนิ้ว ทำซ้ำ</li>'
    + '<li>แตะขอบจอด้วยนิ้ว สลับปากกากับเลเซอร์</li><li>แตะค้างสามนิ้ว 1 วินาที ออก</li><li>รีโมตนำเสนอ เปลี่ยนหน้า ปุ่ม B พักจอ ปุ่ม Esc ออก</li></ul>'
    + '<div class="row2"><button type="button" class="no">ยกเลิก</button><button type="button" class="go">เริ่มนำเสนอ</button></div></div>';
  document.body.appendChild(d);
  d.querySelector('.no').onclick = () => d.remove();
  d.querySelector('.go').onclick = () => { d.remove(); go(); };
}
function cleanStart(strict) {
  if (CLEAN.on || S.present || S.show) return;
  if (strict && store_ls.get('tp-clean-intro') !== '1') { cleanIntro(() => { store_ls.set('tp-clean-intro', '1'); cleanStart(true); }); return; }
  cleanCss();
  CLEAN.strict = !!strict; CLEAN.hold = null;
  /* fingers slide the page while nothing can be seen: they never draw (the pen does), as before when leaving */
  CLEAN.keep = { tool: S.tool, finger: S.finger };
  if (CLEAN.strict && S.finger) { S.finger = false; syncToggles(); }
  CLEAN.on = true; S.clean = true;
  /* the pen writes as soon as the screen is clean: a tool that does not write steps aside until leaving */
  CLEAN.tool = null;
  if (!['pen', 'hl', 'eraser', 'laser'].includes(S.tool)) { CLEAN.tool = S.tool; setTool('pen'); }
  CLEAN.whole = store_ls.get('tp-clean-whole') !== '0';
  CLEAN.flow = FLOW.on; cleanFlow();
  cleanBarMake(); cleanBarSync();
  document.body.classList.add('clean'); document.body.classList.remove('cbar', 'cblank');
  document.body.classList.toggle('cstrict', CLEAN.strict);
  window.addEventListener('pointerdown', cleanDown, true);
  window.addEventListener('pointermove', cleanMove, true);
  window.addEventListener('pointerup', cleanUp, true);
  window.addEventListener('pointercancel', cleanUp, true);
  window.addEventListener('pointerup', cleanKeep);
  window.addEventListener('keydown', cleanKeys, true);
  setFocus(true);
  if (!CLEAN.strict && store_ls.get('tp-clean-hint') !== '1') { store_ls.set('tp-clean-hint', '1'); toast('แตะขอบจอด้วยนิ้วเพื่อเรียกแถบเครื่องมือ', 3500); }
}
function cleanEnd() {
  if (!CLEAN.on) return;
  cleanBlankSet(false); cleanCoverSet(false);
  CLEAN.on = false; S.clean = false; CLEAN.tap = null; clearTimeout(CLEAN.t);
  if (CLEAN.flow !== null) { FLOW.on = CLEAN.flow; CLEAN.flow = null; try { renderPeeks().catch(() => {}); } catch (e) { /* fine */ } }
  window.removeEventListener('pointerdown', cleanDown, true);
  window.removeEventListener('pointermove', cleanMove, true);
  window.removeEventListener('pointerup', cleanUp, true);
  window.removeEventListener('pointercancel', cleanUp, true);
  window.removeEventListener('pointerup', cleanKeep);
  window.removeEventListener('keydown', cleanKeys, true);
  const bar = document.getElementById('cleanBar'); if (bar) bar.remove();
  document.body.classList.remove('clean', 'cbar', 'cblank', 'cstrict');
  if (CLEAN.strict) { const k = CLEAN.keep || {}; if (k.tool && S.tool !== k.tool) setTool(k.tool); if (S.finger !== k.finger) { S.finger = !!k.finger; syncToggles(); } }
  else if (CLEAN.tool && S.tool === 'pen') setTool(CLEAN.tool);
  CLEAN.tool = null; CLEAN.strict = false; CLEAN.hold = null; CLEAN.keep = null;
}


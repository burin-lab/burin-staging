/* BURIN part: animals (loaded when first used) */
/* ---------- task 9.10: animals of the school curriculum, alive in three dimensions. Each one is built here from
   simple solids (ellipsoids, tubes, thin sheets) with a pencil line round its own shape, coloured like coloured
   pencils (or flat colour), with no frame on the paper. It goes about its own life in a loop (walks and grazes,
   pecks, swims, hops, burrows, flies to a flower and drinks) and answers a tap the way the real animal does
   (runs away, jumps away, flies off, pulls into its shell, puffs up, squirts ink). Turn it with a finger or a pen,
   two fingers or the wheel to zoom, double tap for the first view (the 3D model of scene3: sc3Bind).
   Nothing here uses AI; "animals" in flags.json turns the part off ----- */
const AN_I = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const anAdd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], anSub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], anMul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const anDot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], anLen = (a) => Math.hypot(a[0], a[1], a[2]);
const anCross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const anUnit = (a) => { const L = anLen(a) || 1; return [a[0] / L, a[1] / L, a[2] / L]; };
const anLerp = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const anCl = (v, a, b) => (v < a ? a : v > b ? b : v);
const anSm = (u) => { u = anCl(u, 0, 1); return u * u * (3 - 2 * u); };
/* up over the first part, held, down over the last part */
const anBell = (u, e) => { e = e || 0.2; return anSm(Math.min(u / e, (1 - u) / e, 1)); };
function anRz(a) { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; }
/* nose down for a positive angle */
function anRy(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; }
/* left side up for a positive angle */
function anRx(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; }
function anMm(A, B) { const o = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o.push(A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]); return o; }
function anMv(M, v) { return [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[3] * v[0] + M[4] * v[1] + M[5] * v[2], M[6] * v[0] + M[7] * v[1] + M[8] * v[2]]; }
function anMs(...m) { return m.reduce((a, b) => anMm(a, b), AN_I); }
/* colours: #rrggbb only; f below 1 darker, above 1 towards white */
function anHex(c) { return /^#[0-9a-f]{6}$/i.test(String(c || '')) ? c : '#888888'; }
function anMix(c, f) {
  const n = parseInt(anHex(c).slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const m = (v) => Math.round(f < 1 ? v * f : v + (255 - v) * Math.min(1, f - 1));
  return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')';
}
function anTint(c, k) { const n = parseInt(anHex(c).slice(1), 16), m = (v) => ('0' + Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)).toString(16)).slice(-2); return '#' + m(n >> 16) + m((n >> 8) & 255) + m(n & 255); }
/* two legs bones from the hip to the foot: where the knee goes, bent towards the hint */
function anIK(H, F, l1, l2, hint) {
  let d = anSub(F, H), L = anLen(d); const mx = (l1 + l2) * 0.999;
  if (L > mx) { d = anMul(d, mx / L); L = mx; }
  if (L < 1e-6) return anAdd(H, anMul(anUnit(hint), l1));
  const u = anMul(d, 1 / L), a = (l1 * l1 - l2 * l2 + L * L) / (2 * L), hh = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  let w = anSub(hint, anMul(u, anDot(hint, u))); w = anLen(w) < 1e-6 ? anCross(u, [0, 1, 0]) : anUnit(w);
  return anAdd(H, anAdd(anMul(u, a), anMul(w, hh)));
}

/* ----- the builder: solids in the animal's own frame (x forward, y left, z up), shaded towards the viewer, with a
   pencil line where a solid turns away (its outline seen from here). Everything goes into the G3 lists of scene3:
   g (coloured, may be pencil), gs (sharp: eyes, so they stay bright) ----- */
class AnB {
  constructor(g, gs, P, E, pen) {
    this.g = g; this.gs = gs; this.P = P; this.E = E; this.pen = pen; this.M = AN_I; this.T = [0, 0, 0]; this.st = []; this.clip = false;
    const V = anUnit(E); this.V = V; this.Lt = anUnit(anAdd(V, [0.3, -0.2, 0.75]));
    this.ec = pen ? 'rgba(40,44,56,0.95)' : 'rgba(36,40,50,0.8)'; this.n = 0;
  }
  push(t, M) { this.st.push([this.M, this.T]); this.T = this.w(t || [0, 0, 0]); if (M) this.M = anMm(this.M, M); }
  pop() { const s = this.st.pop(); this.M = s[0]; this.T = s[1]; }
  w(p) { const q = anMv(this.M, p); return [this.T[0] + q[0], this.T[1] + q[1], this.T[2] + q[2]]; }
  d(v) { return anMv(this.M, v); }
  shade(col, n) {
    if (String(col).charAt(0) !== '#') return col; /* see-through wings: as they are */
    const l = Math.max(0, anDot(n, this.Lt)), lit = this.pen ? 0.72 + 0.62 * l : 0.6 + 0.55 * l + 0.1 * Math.max(0, anDot(n, this.V));
    return anMix(col, anCl(lit, 0.45, 1.32));
  }
  edge(a, b) { this.g.line([a, b], this.ec, this.pen ? 2 : 1.2, { bias: -0.004 }); }
  /* a grid of points (rows i, columns j that go round): faces, their outside found from ref(i); the faces that turn
     away are left out and a line drawn where they meet the ones that face us */
  mesh(G, colf, ref, wrap, caps) {
    const n1 = G.length - 1, n2 = G[0].length - 1, F = [];
    for (let i = 0; i < n1; i++) {
      F.push([]);
      for (let j = 0; j < n2; j++) {
        const a = G[i][j], b = G[i + 1][j], c = G[i + 1][j + 1], d = G[i][j + 1];
        const cen = [(a[0] + b[0] + c[0] + d[0]) / 4, (a[1] + b[1] + c[1] + d[1]) / 4, (a[2] + b[2] + c[2] + d[2]) / 4];
        let n = anCross(anSub(c, a), anSub(d, b)); const nl = anLen(n);
        if (nl < 1e-12) { F[i].push(null); continue; }
        n = anMul(n, 1 / nl); if (anDot(n, anSub(cen, ref(i, j))) < 0) n = anMul(n, -1);
        const hid = this.clip && cen[2] < -0.004;
        F[i].push({ a, b, c, d, n, f: !hid && anDot(n, anSub(this.E, cen)) > 0, hid });
      }
    }
    for (let i = 0; i < n1; i++) for (let j = 0; j < n2; j++) {
      const f = F[i][j]; if (!f || !f.f) continue;
      const fc = this.shade(colf(i, j), f.n); this.g.poly([f.a, f.b, f.c, f.d], fc, fc); this.n++;
    }
    const vis = (f) => f && f.f;
    for (let i = 0; i < n1; i++) for (let j = 0; j < n2; j++) {
      const f = F[i][j]; if (!f || f.hid) continue;
      const jr = j + 1 < n2 ? j + 1 : (wrap ? 0 : -1);
      if (jr >= 0) { const g = F[i][jr]; if (g && !g.hid && vis(f) !== vis(g)) this.edge(G[i][j + 1], G[i + 1][j + 1]); }
      if (i + 1 < n1) { const g = F[i + 1][j]; if (g && !g.hid && vis(f) !== vis(g)) this.edge(G[i + 1][j], G[i + 1][j + 1]); }
    }
    if (caps) for (const [i, row, ci] of caps) {
      /* the flat end of a tube: one face, with its rim where it and the side turn differently */
      const ring = row.slice(0, n2); let n = [0, 0, 0]; for (let k = 0; k < ring.length; k++) { const p = ring[k], q = ring[(k + 1) % ring.length]; n = anAdd(n, [(p[1] - q[1]) * (p[2] + q[2]), (p[2] - q[2]) * (p[0] + q[0]), (p[0] - q[0]) * (p[1] + q[1])]); }
      if (anLen(n) < 1e-12) continue; n = anUnit(n);
      const cen = ring.reduce((s, p) => anAdd(s, anMul(p, 1 / ring.length)), [0, 0, 0]); if (anDot(n, anSub(cen, ref(ci, 0))) < 0) n = anMul(n, -1);
      if (this.clip && cen[2] < -0.004) continue;
      const fv = anDot(n, anSub(this.E, cen)) > 0;
      if (fv) { const fc = this.shade(colf(Math.min(i, n1 - 1), 0), n); this.g.poly(ring, fc, fc); }
      for (let j = 0; j < n2; j++) { const s = F[Math.min(i, n1 - 1)][j]; if (s && !s.hid && vis(s) !== fv) this.edge(row[j], row[j + 1]); }
    }
  }
  /* an ellipsoid round c, radii r along its own x y z, turned by M; col a colour or a function of the point on the
     unit sphere; def moves points (bulges) */
  ell(c, r, M, col, o) {
    o = o || {}; const n1 = o.n1 || 9, n2 = o.n2 || 12, G = [], U = [];
    const Mw = M ? anMm(this.M, M) : this.M, cw = this.w(c);
    for (let i = 0; i <= n1; i++) {
      G.push([]); U.push([]); const th = Math.PI * i / n1;
      for (let j = 0; j <= n2; j++) {
        const ph = 2 * Math.PI * j / n2, u = [Math.cos(th), Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph)];
        let p = [r[0] * u[0], r[1] * u[1], r[2] * u[2]]; if (o.def) p = anAdd(p, o.def(u));
        G[i].push(anAdd(cw, anMv(Mw, p))); U[i].push(u);
      }
    }
    const cf = typeof col === 'function' ? (i, j) => { const a = U[i][j], b = U[i + 1][j + 1]; return col(anUnit(anAdd(a, b))); } : () => col;
    this.mesh(G, cf, () => cw, true);
    return cw;
  }
  /* a tube through points (in this frame), radius rad(t) or [side, up], round in `sides`; col a colour or col(t, a) */
  tube(pts, rad, col, o) {
    o = o || {}; const n = o.sides || 8, W = pts.map((p) => this.w(p)), m = W.length; if (m < 2) return;
    const T = W.map((p, i) => anUnit(anSub(W[Math.min(m - 1, i + 1)], W[Math.max(0, i - 1)])));
    let hint = this.d(o.up || [0, 0, 1]); if (Math.abs(anDot(hint, T[0])) > 0.95) hint = this.d([1, 0, 0]); if (Math.abs(anDot(hint, T[0])) > 0.95) hint = this.d([0, 1, 0]);
    let N = anUnit(anSub(hint, anMul(T[0], anDot(hint, T[0]))));
    const G = [], R = [];
    for (let i = 0; i < m; i++) {
      if (i) { const q = anSub(N, anMul(T[i], anDot(N, T[i]))); if (anLen(q) > 1e-9) N = anUnit(q); }
      const B = anCross(T[i], N), t = i / (m - 1), rr = typeof rad === 'function' ? rad(t) : rad, ry = Array.isArray(rr) ? rr[0] : rr, rz = Array.isArray(rr) ? rr[1] : rr;
      G.push([]); R.push(W[i]);
      for (let j = 0; j <= n; j++) { const a = 2 * Math.PI * j / n; G[i].push(anAdd(W[i], anAdd(anMul(B, ry * Math.cos(a)), anMul(N, Math.max(rz, 1e-5) * Math.sin(a))))); }
    }
    const cf = typeof col === 'function' ? (i, j) => col((i + 0.5) / (m - 1), (j + 0.5) / n * 6.2832) : () => col;
    const caps = []; if (o.cap !== false) { caps.push([0, G[0], 0]); caps.push([m - 1, G[m - 1], m - 1]); }
    this.mesh(G, cf, (i) => anLerp(R[Math.min(i, m - 1)], R[Math.min(i + 1, m - 1)], 0.5), true, caps);
  }
  /* a thin flat part (a wing, a fin, an ear): one face seen from both sides, with its pencil edge */
  sheet(pts, col, o) {
    o = o || {}; const W = pts.map((p) => this.w(p)); let n = [0, 0, 0];
    for (let k = 0; k < W.length; k++) { const p = W[k], q = W[(k + 1) % W.length]; n = anAdd(n, [(p[1] - q[1]) * (p[2] + q[2]), (p[2] - q[2]) * (p[0] + q[0]), (p[0] - q[0]) * (p[1] + q[1])]); }
    n = anUnit(n); const cen = W.reduce((s, p) => anAdd(s, anMul(p, 1 / W.length)), [0, 0, 0]);
    if (this.clip && cen[2] < -0.004) return;
    if (anDot(n, anSub(this.E, cen)) < 0) n = anMul(n, -1);
    const fc = this.shade(col, n); this.g.poly(W, fc, o.stroke || fc);
    if (o.edge !== false) for (let k = 0; k < W.length - (o.open ? 1 : 0); k++) this.g.line([W[k], W[(k + 1) % W.length]], o.ec || this.ec, this.pen ? 1.1 : 1, { bias: -0.004 });
  }
  /* a thin line of a given width in this frame (feelers, the legs of insects, whiskers) */
  line(pts, col, wd, o) {
    const W = pts.map((p) => this.w(p)), mid = W[Math.floor(W.length / 2)], k = this.P(mid[0], mid[1], mid[2])[3];
    if (this.clip && mid[2] < -0.004) return;
    this.g.line(W, col || this.ec, Math.max(0.8, (wd || 0.01) * k), o);
  }
  /* an eye: a dark ball with its shine, only when it faces us (out is the way it looks out of the head) */
  eye(p, r, out, col) {
    const w = this.w(p), o = this.d(out || [1, 0, 0]); if (anDot(o, anSub(this.E, w)) < -0.15 * anLen(anSub(this.E, w))) return;
    if (this.clip && w[2] < 0) return;
    this.gs.ball(w, r, col || '#17191E');
  }
  ball(p, r, col) { const w = this.w(p); if (this.clip && w[2] < 0) return; this.g.ball(w, r, col); }
}

/* ----- a life in a loop: each animal has its steps (move somewhere, then do something there), and an answer to a tap.
   Seeded, so the same animal does the same things in the same order (tests, and every device in a class) ----- */
function anRng(s) { s.seed = (s.seed * 16807) % 2147483647; return s.seed / 2147483647; }
function anNew(D) {
  const s = { t: 0, x: 0, y: 0, z: D.z0 || 0, h: D.h0 == null ? 0.5 : D.h0, v: 0, vz: 0, mv: 0, ph: 0, si: 0, aT: 0, act: D.loop[0][0], ap: 0, tg: null, rx: null, rk: 0, seed: 20261121 + D.id.length * 97, hop: null, rest: 0, trail: null, ink: [], fx: {} };
  if (D.start) D.start(s);
  return s;
}
function anRoam(D, p) { const r = Math.hypot(p[0], p[1]), m = D.roam * 1.2; return r > m ? [p[0] * m / r, p[1] * m / r] : p; }
function anTarget(D, s) {
  for (let k = 0; k < 6; k++) {
    const a = anRng(s) * 6.2832, r = D.roam * (0.3 + 0.7 * Math.sqrt(anRng(s))), p = [r * Math.cos(a), r * Math.sin(a)];
    if (Math.hypot(p[0] - s.x, p[1] - s.y) > D.roam * 0.45) return p.concat(D.go === 'fly' || D.go === 'swim' ? [D.zLo + (D.zHi - D.zLo) * anRng(s)] : []);
  }
  return [-s.x * 0.5, -s.y * 0.5].concat(D.go === 'fly' || D.go === 'swim' ? [(D.zLo + D.zHi) / 2] : []);
}
const anAng = (a) => { while (a > Math.PI) a -= 6.2832; while (a < -Math.PI) a += 6.2832; return a; };
/* move towards tg (x, y and for flyers z) at speed spd; true when there */
function anMove(D, s, dt, tg, spd, bolt) {
  if (D.go === 'hop') return anHopTo(D, s, dt, tg, spd);
  if (!tg) { s.v = Math.max(0, s.v - (D.acc || 2) * dt); s.vz *= Math.max(0, 1 - 4 * dt); s.x += Math.cos(s.mh == null ? s.h : s.mh) * s.v * dt; s.y += Math.sin(s.mh == null ? s.h : s.mh) * s.v * dt; return true; }
  const dx = tg[0] - s.x, dy = tg[1] - s.y, dist = Math.hypot(dx, dy), air = tg.length > 2;
  const dz = air ? tg[2] - s.z : 0;
  if (dist < (D.near || 0.03) && Math.abs(dz) < 0.03) { s.v = Math.max(0, s.v - (D.acc || 2) * dt * 2); return true; }
  const want = Math.atan2(dy, dx);
  /* a crab goes sideways: its body turns to whichever side is nearer */
  let face = want; if (D.side) { const l = anAng(want - Math.PI / 2 - s.h), r = anAng(want + Math.PI / 2 - s.h); face = Math.abs(l) < Math.abs(r) ? want - Math.PI / 2 : want + Math.PI / 2; }
  const err = anAng(face - s.h), tr = (D.turn || 2.5) * (bolt ? 3 : 1) * dt; s.h = anAng(s.h + anCl(err, -tr, tr));
  const go = D.side || air ? 1 : Math.max(bolt ? 0.45 : 0, Math.cos(err)), slow = Math.min(1, dist / (D.brake || 0.15) + 0.25);
  const vt = spd * go * slow; s.v += anCl(vt - s.v, -(D.acc || 2) * dt, (D.acc || 2) * dt);
  s.mh = D.side ? want : (air ? want : s.h);
  s.x += Math.cos(s.mh) * s.v * dt; s.y += Math.sin(s.mh) * s.v * dt;
  if (air) { const vz = anCl(dz * 2.2, -spd, spd); s.vz += (vz - s.vz) * Math.min(1, 6 * dt); s.z += s.vz * dt; }
  const q = anRoam(D, [s.x, s.y]); s.x = q[0]; s.y = q[1];
  return false;
}
/* hoppers (frogs, the grasshopper, a sparrow on the ground): turn, crouch, leap along an arc, rest */
function anHopTo(D, s, dt, tg, spd, big) {
  if (s.hop) {
    const H = s.hop; H.u = Math.min(1, H.u + dt / H.T);
    const p = anLerp(H.a, H.b, H.u); s.x = p[0]; s.y = p[1]; s.z = (H.z0 || 0) * (1 - H.u) + 4 * H.H * H.u * (1 - H.u);
    s.v = H.len / H.T; if (H.u >= 1) { s.hop = null; s.z = 0; s.v = 0; s.rest = D.hopRest || 0.35; } return false;
  }
  s.v = 0; if (s.rest > 0) { s.rest -= dt; return false; }
  if (!tg) return true;
  const dx = tg[0] - s.x, dy = tg[1] - s.y, dist = Math.hypot(dx, dy); if (dist < 0.05) return true;
  const err = anAng(Math.atan2(dy, dx) - s.h), tr = (D.turn || 4) * dt; s.h = anAng(s.h + anCl(err, -tr, tr));
  if (Math.abs(err) > 0.25) return false;
  const len = Math.min(dist, big ? D.jumpLen : D.hopLen), b = anRoam(D, [s.x + Math.cos(s.h) * len, s.y + Math.sin(s.h) * len]);
  s.hop = { u: 0, a: [s.x, s.y, 0], b: [b[0], b[1], 0], len, T: (big ? 1.25 : 1) * (D.hopT || 0.45), H: (big ? D.jumpH : D.hopH) || 0.2 };
  return false;
}
function anNext(D, s) { s.si = (s.si + 1) % D.loop.length; s.aT = 0; s.ap = 0; s.tg = null; s.act = D.loop[s.si][0]; if (D.enter) D.enter(s, s.act); }
function anStep(D, s, dt) {
  s.t += dt;
  if (s.rx) anRx1(D, s, dt);
  else if (D.air && s.z > 0.002) {
    /* came back from flying off: glides down to a spot on the ground */
    if (!s.landTg) { const p = anTarget(D, s); s.landTg = [p[0] * 0.6, p[1] * 0.6, 0]; }
    const save = D.go; D.go = 'fly'; anMove(D, s, dt, s.landTg, D.fast * 0.7); D.go = save;
    if (s.z < 0.02 && Math.hypot(s.landTg[0] - s.x, s.landTg[1] - s.y) < 0.06) { s.z = 0; s.vz = 0; s.landTg = null; s.v = 0; }
    s.act = 'land';
  } else {
    const cur = D.loop[s.si], act = cur[0], dur = cur[1]; s.act = act; s.aT += dt; s.ap = Math.min(1, s.aT / dur);
    if (D.tick && D.tick(s, dt, act) === true) { /* the animal moves itself in this step */ }
    else if (act === 'go' || act === 'fly' || act === 'run') {
      if (!s.tg) s.tg = anTarget(D, s);
      const done = anMove(D, s, dt, s.tg, act === 'run' ? D.fast : D.spd);
      if ((done && !s.hop) || s.aT > dur) { if (D.go === 'hop' && s.hop) { /* lands first */ } else anNext(D, s); }
    } else if (act === 'land' || act === 'hang') {
      const p = D.perch(s); const there = anMove(D, s, dt, p, D.spd * 0.8);
      if (there) { s.x += (p[0] - s.x) * Math.min(1, 6 * dt); s.y += (p[1] - s.y) * Math.min(1, 6 * dt); s.z += (p[2] - s.z) * Math.min(1, 6 * dt); s.perched = true; } else { s.perched = false; s.aT = Math.min(s.aT, dur * 0.2); }
      if (s.aT >= dur) { s.perched = false; anNext(D, s); }
    } else { anMove(D, s, dt, null); if (s.aT >= dur && !s.hop) anNext(D, s); }
  }
  /* walking, swimming or flying shows in the legs, fins and wings: the gait goes on with the distance */
  const v = Math.abs(s.v); s.mv += (anCl(v / (D.spd || 1), 0, 1.6) - s.mv) * Math.min(1, 8 * dt);
  s.ph += (v / (D.stride || 0.3)) * 6.2832 * dt + (D.go === 'fly' && !s.perched ? (D.flap || 0) * 6.2832 * dt : 0);
  if (s.trail) anTrail(s);
  s.ink = s.ink.filter((q) => (q.t += dt) < 3.2);
}
/* the answer to a tap: kinds shared by many animals; dir is the way away from the finger, on the ground */
const AN_RX = {
  flee: { T: 2.4 }, dart: { T: 1.6 }, jump: { T: 1.4 }, flyoff: { T: 2.8 }, hide: { T: 4.2 }, puff: { T: 3.2 }, threat: { T: 3.0 }, ink: { T: 2.6 }, flip: { T: 1.2 }, burrow: { T: 5.5 }, trumpet: { T: 3.0 }, drop: { T: 4.4 }
};
function anReact(D, s, dir) {
  if (s.rx && s.rx.t < 0.5) return false; /* a second tap at once does not start it again */
  const k = D.react, d = anUnit([dir[0], dir[1], 0]);
  s.rx = { k, t: 0, d, T: (AN_RX[k] || { T: 2 }).T, tg: null }; s.hop = null; s.rest = 0; s.perched = false;
  if (k === 'ink') for (let i = 0; i < 26; i++) s.ink.push({ t: 0, p: [s.x, s.y, s.z], v: [(anRng(s) - 0.5) * 0.5 - d[0] * 0.25, (anRng(s) - 0.5) * 0.5 - d[1] * 0.25, (anRng(s) - 0.3) * 0.25], r: 0.03 + anRng(s) * 0.05 });
  if (D.onReact) D.onReact(s);
  return true;
}
function anRx1(D, s, dt) {
  const R = s.rx; R.t += dt; const k = R.k, u = R.t / R.T;
  const away = (len) => { const p = anRoam(D, [s.x + R.d[0] * len, s.y + R.d[1] * len]); return p; };
  if (k === 'flee' || k === 'dart' || (k === 'threat' && R.t > 1.1) || (k === 'trumpet' && R.t > 1.8) || k === 'ink' || k === 'flip') {
    if (!R.tg) R.tg = away(D.fleeLen || 0.7);
    const spd = k === 'flip' ? D.fast * 1.6 : k === 'ink' ? D.fast * 1.3 : D.fast;
    if (D.go === 'hop') { if (!R.tg2) { R.tg2 = 1; s.hop = null; s.rest = 0; } anHopTo(D, s, dt, R.tg, spd, true); }
    else if (k === 'flip' || k === 'ink') { /* backwards, fast, the body stays facing the finger */ const b = R.d; s.v = spd * Math.max(0, 1 - u * 0.9); s.x += b[0] * s.v * dt; s.y += b[1] * s.v * dt; const q = anRoam(D, [s.x, s.y]); s.x = q[0]; s.y = q[1]; const fa = k === 'ink' && D.mantle ? Math.atan2(b[1], b[0]) : Math.atan2(-b[1], -b[0]); s.h = anAng(s.h + anCl(anAng(fa - s.h), -6 * dt, 6 * dt)); s.mh = Math.atan2(b[1], b[0]); }
    else anMove(D, s, dt, D.go === 'fly' || D.go === 'swim' ? R.tg.concat([s.z]) : R.tg, spd, true);
  } else if (k === 'jump') { if (!R.tg) { R.tg = away(D.jumpLen || 0.6); s.hop = null; s.rest = 0; } anHopTo(D, s, dt, R.tg, D.fast, true); if (!s.hop && R.t > 0.2 && Math.hypot(R.tg[0] - s.x, R.tg[1] - s.y) < 0.06) R.t = Math.max(R.t, R.T - 0.3); }
  else if (k === 'flyoff') {
    if (!R.tg) { const p = away(D.roam * 0.9); R.tg = [p[0], p[1], D.zHi]; s.perched = false; }
    if (R.t > 1.3 && !R.tg2) { R.tg2 = 1; const p = anTarget(D, s); R.tg = [p[0], p[1], D.zHi * 0.9]; }
    const air = D.air || D.go === 'fly'; if (air) { const save = D.go; D.go = 'fly'; anMove(D, s, dt, R.tg, D.fast); D.go = save; } else anMove(D, s, dt, R.tg, D.fast);
  } else { anMove(D, s, dt, null); }
  /* how far into its pose (pulled in, puffed up, claws up): up fast, held, down slowly */
  const T = R.T, up = k === 'burrow' ? 0.6 : 0.3, dn = k === 'hide' ? 1.5 : 0.8; s.rk = anSm(Math.min(R.t / up, (T - R.t) / dn, 1));
  if (D.rxTick) D.rxTick(s, dt, R);
  if (R.t >= T) { s.rx = null; s.rk = 0; s.tg = null; s.aT = 0; if (D.after) D.after(s); }
}
/* the body of a worm follows where its head has been */
function anTrail(s) {
  const tr = s.trail, h = [s.x, s.y, s.z], last = tr[0];
  if (!last || anLen(anSub(h, last)) > 0.008) { tr.unshift(h); if (tr.length > 400) tr.pop(); }
}
function anAlong(s, dist) {
  const tr = s.trail; let acc = 0, prev = [s.x, s.y, s.z];
  for (let i = 0; i < tr.length; i++) { const q = tr[i], l = anLen(anSub(q, prev)); if (acc + l >= dist && l > 1e-9) return anLerp(prev, q, (dist - acc) / l); acc += l; prev = q; }
  const a = tr.length > 1 ? anUnit(anSub(tr[tr.length - 1], tr[tr.length - 2])) : [-Math.cos(s.h), -Math.sin(s.h), 0];
  return anAdd(prev, anMul(a, dist - acc));
}

/* ----- four legs (cow, buffalo, elephant, cat, dog): a barrel with chest and rump, legs found from hip to foot (the
   feet step on the ground in the order of a real walk), neck and head that go down to graze or sniff ----- */
function anLegs(b, s, Q, body, col, foot, k) {
  /* walk: left hind, left fore, right hind, right fore, a quarter of a step apart */
  const mv = Math.min(1.3, s.mv) * (k.still ? 0 : 1), A = Q.step * mv, lift = Q.lift * Math.min(1, mv);
  const legs = [[Q.fx, 1, 0.5], [Q.fx, -1, 1.5], [Q.hx, 1, 0], [Q.hx, -1, 1]];
  for (const [x0, side, off] of legs) {
    const front = x0 > 0, p = s.ph + off * Math.PI, hip = body([x0 + (front ? 0.02 : 0), side * Q.hy, front ? Q.fz : Q.hz]);
    let fx = x0 + A * Math.sin(p), fz = lift * Math.max(0, Math.cos(p)), fy = side * Q.fy;
    if (!front && k.sit) { fx = x0 + 0.1 * k.sit + (1 - k.sit) * (fx - x0); fz *= 1 - k.sit; }
    if (k.tuck) { fx = x0 + (fx - x0) * (1 - k.tuck) + (front ? -0.05 : 0.05) * k.tuck; fy *= 1 - 0.3 * k.tuck; }
    const F = [fx, fy, fz + (k.lift || 0)], l = Q.l1, knee = anIK(hip, F, l, Q.l2, front ? [1, 0, 0.1] : [-1, 0, 0.1]);
    b.tube([hip, knee, F], (t) => (t < 0.5 ? Q.lr - (Q.lr - Q.lr2) * t * 0.8 : Q.lr2 * (1.06 - 0.12 * t)), col, { sides: 7 });
    if (foot) b.ell([F[0] + Q.hoof * 0.15, F[1], F[2] + Q.hoof * 0.5], [Q.hoof * 1.1, Q.hoof * 0.95, Q.hoof * 0.6], null, foot, { n1: 5, n2: 8 });
  }
}
function anQuad(b, s, C, D) {
  const Q = D.Q, rxk = s.rx ? s.rx.k : '', rk = s.rk;
  const graze = s.act === Q.down ? anBell(s.ap, 0.18) : 0, sit = s.act === 'sit' ? anBell(s.ap, 0.16) : 0;
  const look = s.act === 'look' ? anBell(s.ap, 0.2) * Math.sin(s.aT * 2.2) * 0.55 : 0;
  const arch = rxk === 'threat' && Q.arch ? anSm(Math.min(1, s.rx.t / 0.25)) * (s.rx.t < 1.1 ? 1 : Math.max(0, 1 - (s.rx.t - 1.1) * 2)) : 0;
  const bob = 0.012 * Math.min(1.3, s.mv) * Math.cos(2 * s.ph) + 0.004 * Math.sin(s.t * 1.3);
  const bp = -0.42 * sit, piv = [Q.fx, 0, Q.fz];
  /* the body, pitched about the shoulders when it sits */
  const body = (p) => { const q = anMv(anRy(bp), anSub(p, piv)); return anAdd(piv, [q[0], q[1], q[2] + bob + arch * 0.06]); };
  const bodyM = anRy(bp), cb = (u) => (u[2] < -0.42 ? C.b2 : (Q.spots && Math.sin(u[0] * 9 + 1.3) * Math.sin(u[1] * 7 + u[2] * 5) > 0.42 ? C.s : C.b));
  const archDef = (u) => [0, 0, u[2] > 0 ? arch * 0.08 * (1 - u[0] * u[0]) : 0];
  b.ell(body([0, 0, Q.zh]), [Q.bx, Q.by, Q.bz], bodyM, cb, { def: archDef, n1: 12, n2: 14 });
  b.ell(body([Q.bx * 0.55, 0, Q.zh + Q.bz * 0.08]), [Q.bx * 0.5, Q.by * 0.95, Q.bz * 1.02], bodyM, cb, { n1: 7, n2: 10 });
  b.ell(body([-Q.bx * 0.58, 0, Q.zh + Q.bz * 0.06]), [Q.bx * 0.48, Q.by * 0.92, Q.bz * 0.98], bodyM, cb, { n1: 7, n2: 10 });
  if (Q.udder) b.ell(body([-Q.bx * 0.45, 0, Q.zh - Q.bz * 0.9]), [0.07, 0.06, 0.05], null, C.m, { n1: 5, n2: 8 });
  anLegs(b, s, Q, body, (u) => C.b, C.d, { sit, tuck: arch * 0.4 });
  /* neck and head: up while it walks, down to the ground to graze (or to sniff), turning while it looks round */
  let na = Q.na + (Q.naD - Q.na) * graze + 0.35 * sit, ha = Q.ha + (Q.haD - Q.ha) * graze - 0.25 * sit, hy = look;
  if (rxk === 'flee' || rxk === 'threat') { na += 0.25 * rk; ha -= 0.3 * rk; }
  if (rxk === 'trumpet') { na += 0.2 * rk; ha -= 0.55 * rk; }
  if (Q.down === 'graze' && graze > 0.9) ha += 0.05 * Math.sin(s.t * 9); /* chewing */
  if (Q.down === 'sniff' && graze > 0.5) hy += 0.25 * Math.sin(s.t * 3.1);
  const S = body([Q.sx, 0, Q.sz]), nd = anMv(anRz(hy), [Math.cos(na), 0, Math.sin(na)]), N = anAdd(S, anMul(nd, Q.nl));
  if (Q.nl > 0.02) b.tube([S, anLerp(S, N, 0.5), N], (t) => Q.nr * (1 - 0.25 * t), C.b, { sides: 8 });
  const HM = anMs(anRz(hy), anRy(ha)), H = anAdd(N, anMv(HM, [Q.hr[0] * 0.55, 0, 0]));
  b.push(H, HM);
  b.ell([0, 0, 0], Q.hr, null, C.b, { n1: 8, n2: 10 });
  Q.head(b, s, C, D, { rk, rxk, graze, sit });
  b.pop();
  /* the tail */
  const T0 = body([-Q.bx * 0.98, 0, Q.zh + Q.bz * 0.55]); Q.tail(b, s, C, D, T0, { rk, rxk, sit, arch });
}
const AN_EAR = (b, x, y, z, len, up, wd, col, droop) => { for (const sd of [1, -1]) b.sheet([[x + wd, sd * y, z], [x - wd * 0.3, sd * (y + len), z + up - droop], [x - wd, sd * y, z - wd * 0.3]], col); };
function anHorn(b, pts, r0, col) { for (const sd of [1, -1]) b.tube(pts.map((p) => [p[0], sd * p[1], p[2]]), (t) => r0 * (1 - 0.85 * t), col, { sides: 6 }); }
function anTailHang(b, s, T0, len, r, col, tuft, sway) {
  const a = Math.sin(s.t * 1.7) * 0.25 + sway, pts = [];
  for (let i = 0; i <= 5; i++) { const u = i / 5; pts.push(anAdd(T0, [-0.05 * u - 0.02, Math.sin(a * u * 1.5) * len * 0.35 * u, -len * u])); }
  b.tube(pts, (t) => r * (1 - 0.5 * t), col, { sides: 6 });
  if (tuft) b.ell(anAdd(pts[5], [0, 0, -0.03]), [0.025, 0.025, 0.05], null, tuft, { n1: 5, n2: 7 });
}
const AN_COW_HEAD = (b, s, C, D, k) => {
  b.ell([D.Q.hr[0] * 0.85, 0, -0.02], [0.065, 0.068, 0.062], null, C.m, { n1: 6, n2: 9 });
  b.eye([0.02, 0.068, 0.035], 0.017, [0.3, 1, 0.3]); b.eye([0.02, -0.068, 0.035], 0.017, [0.3, -1, 0.3]);
  AN_EAR(b, -0.06, 0.06, 0.04, 0.11, -0.01, 0.035, C.b, 0.02);
  if (D.id === 'buffalo') anHorn(b, [[-0.05, 0.05, 0.06], [-0.07, 0.15, 0.07], [-0.15, 0.25, 0.09], [-0.26, 0.28, 0.13], [-0.34, 0.22, 0.17]], 0.034, C.h);
  else anHorn(b, [[-0.06, 0.05, 0.07], [-0.07, 0.1, 0.11], [-0.05, 0.13, 0.16]], 0.022, C.h);
};
const AN_EL_HEAD = (b, s, C, D, k) => {
  /* the trunk hangs and swings, curls up when it trumpets; ears flap, spread wide when alarmed */
  const up = k.rxk === 'trumpet' ? k.rk : 0, sw = Math.sin(s.t * 1.1) * 0.25 * (1 - up), pts = [];
  let p = [0.17, 0, -0.06], a = 1.35 - 0.2 * k.graze;
  for (let i = 0; i < 9; i++) { pts.push(p); const da = 0.05 + 0.03 * Math.sin(s.t * 1.3) - up * 0.42; a += da; p = anAdd(p, [Math.cos(a) * 0.075 * (1 - up * 0.2), sw * 0.02 * i, -Math.sin(a) * 0.075]); }
  pts.push(p); b.tube(pts, (t) => 0.065 * (1 - 0.6 * t), C.b, { sides: 8 });
  for (const sd of [1, -1]) b.tube([[0.12, sd * 0.09, -0.08], [0.2, sd * 0.12, -0.13], [0.27, sd * 0.11, -0.12]], (t) => 0.02 * (1 - 0.7 * t), C.h, { sides: 6 });
  b.eye([0.07, 0.15, 0.03], 0.016, [0.4, 1, 0.2]); b.eye([0.07, -0.15, 0.03], 0.016, [0.4, -1, 0.2]);
  const fl = 0.3 + 0.25 * (0.5 + 0.5 * Math.sin(s.t * 1.6)) + 0.9 * (k.rxk === 'trumpet' ? k.rk : 0);
  for (const sd of [1, -1]) {
    const R = anRz(-sd * (0.25 + fl)), ear = [[0, 0, 0.15], [-0.07, 0, 0.26], [-0.3, 0, 0.19], [-0.38, 0, -0.08], [-0.28, 0, -0.27], [-0.07, 0, -0.18]];
    b.push([-0.02, sd * 0.13, 0.02], R); b.sheet(ear.map((q) => [q[0], sd * 0.01, q[2]]), C.e); b.pop();
  }
};
const AN_CAT_HEAD = (b, s, C, D, k) => {
  const dog = D.id === 'dog', mo = dog && k.rxk === 'threat' ? Math.abs(Math.sin(s.rx.t * 9)) * k.rk : 0;
  if (dog) {
    b.ell([0.085, 0, -0.025], [0.07, 0.045, 0.04], null, C.b, { n1: 6, n2: 8 });
    b.push([0.05, 0, -0.045], anRy(0.5 * mo)); b.ell([0.05, 0, -0.01], [0.06, 0.035, 0.015], null, C.b2, { n1: 5, n2: 8 }); b.pop();
    b.ball([0.155, 0, -0.015], 0.016, '#1E1E22');
    for (const sd of [1, -1]) { const fl = 0.15 * Math.sin(s.t * 2 + sd); b.sheet([[-0.01, sd * 0.06, 0.05], [-0.04, sd * (0.1 + fl * 0.1), -0.06], [-0.07, sd * 0.07, 0.04]], C.e); }
  } else {
    b.ell([0.06, 0, -0.02], [0.04, 0.045, 0.03], null, C.b2, { n1: 6, n2: 8 }); b.ball([0.098, 0, -0.005], 0.009, '#C98A8A');
    const flat = k.rxk === 'threat' ? k.rk : 0;
    for (const sd of [1, -1]) b.sheet([[0.0, sd * 0.025, 0.055], [-0.03 - 0.03 * flat, sd * (0.05 + 0.04 * flat), 0.115 - 0.05 * flat], [-0.06, sd * 0.06, 0.04], [-0.03, sd * 0.045, 0.06]], C.b);
    for (const sd of [1, -1]) for (const dz of [-0.006, 0.006]) b.line([[0.085, sd * 0.03, -0.015 + dz], [0.11, sd * 0.1, -0.005 + dz * 3]], 'rgba(60,60,70,0.55)', 0.0035);
  }
  b.eye([0.045, 0.042, 0.025], dog ? 0.013 : 0.016, [0.6, 1, 0.2], dog ? null : '#4E6B2A'); b.eye([0.045, -0.042, 0.025], dog ? 0.013 : 0.016, [0.6, -1, 0.2], dog ? null : '#4E6B2A');
};
function anTailUp(b, s, C, D, T0, k) {
  /* a cat holds its tail up in a curve (bushed out and straight up when frightened); a dog wags */
  const dog = D.id === 'dog', pts = [], wag = dog ? Math.sin(s.t * (k.sit ? 11 : 7)) * (0.35 + 0.4 * k.sit + 0.5 * (k.rxk === 'threat' ? k.rk : 0)) : Math.sin(s.t * 1.3) * 0.25;
  const L = D.Q.tl, n = 7;
  for (let i = 0; i <= n; i++) {
    const u = i / n, up = dog ? 0.75 + 0.4 * u : 0.35 + 1.6 * u * (1 - 0.5 * u) + 0.6 * k.arch, back = dog ? 0.6 : 1 - 0.6 * k.arch;
    pts.push(anAdd(T0, [-L * u * Math.cos(up) * back * 0.8, Math.sin(wag * u) * L * 0.6 * u, L * u * Math.sin(up) * 0.8 + (k.sit && !dog ? -0.25 * u : 0)]));
  }
  b.tube(pts, (t) => D.Q.tr * (1 + (dog ? 0 : 0.8 * k.arch)) * (1 - 0.45 * t), C.b, { sides: 7 });
}

/* ----- small things on the ground: grass, a flower, sand, soil, a twig. Drawn with the animal (pencil too) ----- */
function anGrass(b, x, y, k, col) {
  const n = 6; for (let i = 0; i < n; i++) { const a = i / n * 6.28 + x * 7, r = 0.02 * k, lean = 0.35 + 0.2 * Math.sin(i * 2.3 + y * 5);
    b.sheet([[x + Math.cos(a) * r, y + Math.sin(a) * r, 0], [x + Math.cos(a) * (r + 0.05 * k * lean), y + Math.sin(a) * (r + 0.05 * k * lean), 0.1 * k * (0.8 + 0.3 * Math.sin(i * 3.1))], [x + Math.cos(a + 0.3) * r, y + Math.sin(a + 0.3) * r, 0]], col || '#5E9E3A', { edge: false }); }
}
function anFlower(b, p, col, k) {
  k = k || 1; const top = [p[0], p[1], p[2] * 1];
  b.tube([[p[0], p[1], 0], [p[0] + 0.01, p[1], top[2] * 0.5], top], 0.008 * k, '#4E8A34', { sides: 5, cap: false });
  for (let i = 0; i < 2; i++) b.sheet([[p[0], p[1], top[2] * 0.35], [p[0] + (i ? 0.07 : -0.07) * k, p[1] + 0.02, top[2] * 0.45], [p[0] + (i ? 0.03 : -0.03) * k, p[1], top[2] * 0.55]], '#5E9E3A', { edge: false });
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; b.sheet([[top[0], top[1], top[2]], [top[0] + Math.cos(a - 0.35) * 0.06 * k, top[1] + Math.sin(a - 0.35) * 0.06 * k, top[2] + 0.012], [top[0] + Math.cos(a) * 0.075 * k, top[1] + Math.sin(a) * 0.075 * k, top[2] + 0.018], [top[0] + Math.cos(a + 0.35) * 0.06 * k, top[1] + Math.sin(a + 0.35) * 0.06 * k, top[2] + 0.012]], col || '#E85A8A'); }
  b.ball([top[0], top[1], top[2] + 0.012], 0.022 * k, '#F2C230');
}
/* flat patches lie under everything, drawn straight on the paper; the shadow is soft and gets lighter as it rises */
function anPatch(c, P, cx, cy, rx, ry, fill, line, dots) {
  const q = []; for (let i = 0; i < 28; i++) { const a = i / 28 * 6.283, w = 1 + 0.06 * Math.sin(a * 3 + cx * 9) + 0.04 * Math.sin(a * 5 + cy * 7); q.push(P(cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w, 0)); }
  c.beginPath(); q.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fillStyle = fill; c.fill();
  if (line) { c.strokeStyle = line; c.lineWidth = 1; c.stroke(); }
  if (dots) { let sd = 11; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; }; c.fillStyle = dots; for (let i = 0; i < 60; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()), p = P(cx + Math.cos(a) * rx * r * 0.92, cy + Math.sin(a) * ry * r * 0.92, 0); c.fillRect(p[0], p[1], 1.6, 1.6); } }
}
function anShadow(c, P, x, y, z, rx, ry, h) {
  const al = anCl(0.13 - z * 0.08, 0.03, 0.13), q = [], ch = Math.cos(h), sh = Math.sin(h);
  for (let i = 0; i < 20; i++) { const a = i / 20 * 6.283, u = Math.cos(a) * rx, v = Math.sin(a) * ry; q.push(P(x + u * ch - v * sh, y + u * sh + v * ch, 0)); }
  c.beginPath(); q.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fillStyle = 'rgba(40,44,52,' + al.toFixed(3) + ')'; c.fill();
}
const AN_TUFTS = [[0.42, -0.3], [-0.36, 0.38], [0.1, 0.5], [-0.5, -0.2], [0.55, 0.25], [-0.1, -0.55]];
const anGrassField = (b) => { for (const [x, y] of AN_TUFTS) anGrass(b, x * 0.8, y * 0.8, 1.3); };

/* ----- the animals: Thai name, group, what it does in its loop, how it answers a touch ----- */
const AN_WALK = { go: 'เดิน', look: 'มองรอบตัว', flee: 'ตกใจ วิ่งหนี' };
const AN = {};
function anDef(id, d) { d.id = id; d.acts = Object.assign({}, AN_WALK, d.acts || {}); AN[id] = d; }
const AN_QCOW = { bx: 0.4, by: 0.17, bz: 0.19, zh: 0.5, fx: 0.27, hx: -0.27, hy: 0.1, fy: 0.1, fz: 0.48, hz: 0.5, l1: 0.27, l2: 0.27, lr: 0.055, lr2: 0.032, hoof: 0.03, step: 0.11, lift: 0.07, sx: 0.38, sz: 0.58, nl: 0.3, nr: 0.085, na: 0.45, naD: -1.05, ha: 0.95, haD: 1.75, hr: [0.13, 0.07, 0.075], down: 'graze', head: AN_COW_HEAD, tail: (b, s, C, D, T0, k) => anTailHang(b, s, T0, 0.36, 0.02, C.b, C.d, 0) };
anDef('cow', { th: 'วัว', en: 'cow', grp: 'สัตว์เลี้ยงลูกด้วยน้ำนม', hint: 'เดินแล้วก้มกินหญ้า แตะแล้วตกใจวิ่งหนี', kw: 'โค วัวพื้นเมือง สัตว์กินพืช', go: 'walk', spd: 0.14, fast: 0.42, stride: 0.34, turn: 1.4, roam: 0.24, R: 0.85, tz: 0.32, react: 'flee', fleeLen: 0.5,
  loop: [['go', 7], ['graze', 6], ['look', 2.6], ['go', 6], ['graze', 5]], acts: { graze: 'ก้มกินหญ้า' }, C: { b: '#A0663A', b2: '#E6D2B4', d: '#3A2A20', m: '#5C4237', h: '#E6DCC4' },
  Q: AN_QCOW, draw: anQuad, props: anGrassField, sh: [0.5, 0.2] });
anDef('buffalo', { th: 'ควาย', en: 'water buffalo', grp: 'สัตว์เลี้ยงลูกด้วยน้ำนม', hint: 'เดินช้า ๆ แล้วก้มเล็มหญ้า เขาโค้งยาว แตะแล้ววิ่งหนี', kw: 'กระบือ สัตว์กินพืช ไถนา', go: 'walk', spd: 0.11, fast: 0.36, stride: 0.34, turn: 1.2, roam: 0.24, R: 0.88, tz: 0.32, react: 'flee', fleeLen: 0.5,
  loop: [['go', 7], ['graze', 7], ['look', 2.6], ['go', 5]], acts: { graze: 'ก้มเล็มหญ้า' }, C: { b: '#4C4B52', b2: '#77737A', d: '#26262A', m: '#38373C', h: '#6A6258' },
  Q: Object.assign({}, AN_QCOW, { bx: 0.43, by: 0.2, bz: 0.21, zh: 0.48, fz: 0.46, hz: 0.48, l1: 0.26, l2: 0.26, lr: 0.06, hr: [0.14, 0.075, 0.08], na: 0.25, naD: -1.1, ha: 1.1, sz: 0.56 }), draw: anQuad, props: anGrassField, sh: [0.52, 0.22] });
anDef('elephant', { th: 'ช้าง', en: 'elephant', grp: 'สัตว์เลี้ยงลูกด้วยน้ำนม', hint: 'เดิน แกว่งงวง โบกหู แตะแล้วชูงวงร้อง กางหู แล้วถอยหนี', kw: 'ช้างเอเชีย สัตว์กินพืช งวง งา', go: 'walk', spd: 0.12, fast: 0.3, stride: 0.42, turn: 1.0, roam: 0.2, R: 1.02, tz: 0.5, react: 'trumpet', fleeLen: 0.4,
  loop: [['go', 7], ['look', 3], ['graze', 5], ['go', 6]], acts: { graze: 'ใช้งวงเก็บหญ้า', trumpet: 'ชูงวงร้อง กางหู แล้วถอยหนี' }, C: { b: '#8D8987', b2: '#9C9896', d: '#5E5A58', e: '#9A908E', h: '#F2EBDC' },
  Q: Object.assign({}, AN_QCOW, { bx: 0.44, by: 0.25, bz: 0.29, zh: 0.8, fx: 0.25, hx: -0.27, hy: 0.14, fy: 0.15, fz: 0.75, hz: 0.78, l1: 0.385, l2: 0.385, lr: 0.11, lr2: 0.095, hoof: 0.06, step: 0.12, lift: 0.08, sx: 0.4, sz: 0.92, nl: 0.04, nr: 0.2, na: 0.3, naD: -0.1, ha: 0.25, haD: 0.55, hr: [0.17, 0.16, 0.18], head: AN_EL_HEAD, tail: (b, s, C, D, T0) => anTailHang(b, s, T0, 0.4, 0.018, C.b, C.d, 0) }), draw: anQuad, props: anGrassField, sh: [0.55, 0.3] });
anDef('cat', { th: 'แมว', en: 'cat', grp: 'สัตว์เลี้ยงลูกด้วยน้ำนม', hint: 'เดินย่อง นั่งแกว่งหาง แตะแล้วหลังโก่ง ขนพอง แล้ววิ่งหนี', kw: 'แมวบ้าน สัตว์กินเนื้อ', go: 'walk', spd: 0.15, fast: 0.6, stride: 0.22, turn: 2.2, roam: 0.24, R: 0.62, tz: 0.2, react: 'threat', fleeLen: 0.45,
  loop: [['go', 5], ['sit', 6], ['go', 4], ['look', 2.4]], acts: { sit: 'นั่งแกว่งหาง', threat: 'หลังโก่ง ขนพอง ขู่ แล้ววิ่งหนี' }, C: { b: '#D9A15A', b2: '#F4E6CC', d: '#C98A8A' },
  Q: { bx: 0.27, by: 0.085, bz: 0.09, zh: 0.27, fx: 0.18, hx: -0.18, hy: 0.05, fy: 0.05, fz: 0.27, hz: 0.28, l1: 0.15, l2: 0.15, lr: 0.03, lr2: 0.018, hoof: 0.018, step: 0.08, lift: 0.05, sx: 0.24, sz: 0.31, nl: 0.08, nr: 0.05, na: 0.75, naD: 0.2, ha: 0.1, haD: 0.9, hr: [0.07, 0.065, 0.06], down: 'sniff', arch: true, tl: 0.36, tr: 0.018, head: AN_CAT_HEAD, tail: anTailUp }, draw: anQuad, sh: [0.34, 0.12] });
anDef('dog', { th: 'สุนัข', en: 'dog', grp: 'สัตว์เลี้ยงลูกด้วยน้ำนม', hint: 'เดินดมกลิ่น นั่งกระดิกหาง แตะแล้วกระโดดถอย เห่า', kw: 'หมา สุนัขบ้าน สัตว์กินเนื้อ', go: 'walk', spd: 0.17, fast: 0.55, stride: 0.26, turn: 2.2, roam: 0.24, R: 0.66, tz: 0.22, react: 'threat', fleeLen: 0.35,
  loop: [['go', 5], ['sniff', 4], ['go', 4], ['sit', 5]], acts: { sniff: 'ดมกลิ่นที่พื้น', sit: 'นั่งกระดิกหาง', threat: 'กระโดดถอย เห่า กระดิกหาง' }, C: { b: '#B9814A', b2: '#EAD3B2', d: '#5A3A22', e: '#8B5A33' },
  Q: { bx: 0.29, by: 0.1, bz: 0.11, zh: 0.33, fx: 0.2, hx: -0.2, hy: 0.06, fy: 0.06, fz: 0.33, hz: 0.34, l1: 0.18, l2: 0.18, lr: 0.035, lr2: 0.022, hoof: 0.022, step: 0.09, lift: 0.06, sx: 0.27, sz: 0.38, nl: 0.12, nr: 0.06, na: 0.7, naD: -0.75, ha: 0.25, haD: 1.35, hr: [0.08, 0.06, 0.06], down: 'sniff', tl: 0.22, tr: 0.02, head: AN_CAT_HEAD, tail: anTailUp }, draw: anQuad, sh: [0.36, 0.13] });

/* ----- one frame on the canvas of the model box (scene3 calls this for a spec with an animal) ----- */
let AN_PEN = null;
function anColors(D, sp) { const C = Object.assign({}, D.C); if (sp.col && /^#[0-9a-f]{6}$/i.test(sp.col)) { C.b = sp.col; C.b2 = anTint(sp.col, 0.5); if (C.e) C.e = anTint(sp.col, -0.12); } return C; }
function anDraw(c, w, h, sp, r) {
  const D = AN[sp.animal];
  if (!D) { c.fillStyle = '#5A6472'; c.font = '14px Sarabun, sans-serif'; c.fillText('ไม่รู้จักสัตว์ชนิดนี้', 16, 24); return true; }
  const s = r.st.an || (r.st.an = anNew(D));
  if (!AN_PEN) { try { AN_PEN = MODEV.scene ? MODEV.scene('pencilTex') : null; } catch (e) { AN_PEN = null; } }
  const R = D.R || 1.1, tz = D.tz || 0, P = cam3(r, w, h, R, tz), cm = r.cam || CAM0, Dd = R * 3.2 / (cm.zoom || 1);
  const E = [Math.sin(cm.yaw) * Math.cos(cm.pitch) * Dd, -Math.cos(cm.yaw) * Math.cos(cm.pitch) * Dd, Math.sin(cm.pitch) * Dd + tz];
  const pen = !!sp.pen, C = anColors(D, sp), g = new G3(P), gs = new G3(P), b = new AnB(g, gs, P, E, pen);
  if (D.ground) D.ground(c, P, s, C, D);
  if (D.sh && !s.hidden) anShadow(c, P, s.x, s.y, Math.max(0, s.z), D.sh[0] * (s.shk || 1), D.sh[1] * (s.shk || 1), s.h);
  if (D.props) D.props(b, s, C);
  b.clip = !!D.clip;
  if (!s.hidden) { b.push([s.x, s.y, s.z], anRz(s.h)); D.draw(b, s, C, D); b.pop(); }
  for (const q of s.ink) { const u = q.t / 3.2, p = anAdd(q.p, anMul(q.v, Math.min(q.t, 1.6))); gs.L.push({ t: 'b', d: P(p[0], p[1], p[2])[2] - 1e-4, q: P(p[0], p[1], p[2]), r: Math.max(2, q.r * (1 + u * 2.5) * P(p[0], p[1], p[2])[3]), col: 'rgba(30,30,40,' + (0.55 * (1 - u)).toFixed(2) + ')', ink: 1 }); }
  if (pen && AN_PEN) anPencil(c, g, r); else g.draw(c);
  anSharp(c, gs);
  const doing = s.rx ? (D.acts[s.rx.k] || D.acts.flee) : (D.acts[s.act] || '');
  r.read = [['สัตว์', D.th], ['กลุ่ม', D.grp], ['กำลัง', doing]];
  r.anFaces = b.n;
  return true;
}
/* coloured pencil, the light way: the animal on a layer of its own, its colour broken by the grain of the paper
   (the grain of scene3, so it matches the orbitals); its outline is already drawn by the solids themselves */
function anPencil(c, g, r) {
  const M = c.getTransform(), cw = c.canvas.width, ch = c.canvas.height;
  let L = r.anLayer; if (!L) L = r.anLayer = document.createElement('canvas'); if (L.width !== cw) L.width = cw; if (L.height !== ch) L.height = ch;
  const a = L.getContext('2d'); a.setTransform(1, 0, 0, 1, 0, 0); a.globalCompositeOperation = 'source-over'; a.clearRect(0, 0, cw, ch);
  a.setTransform(M); g.draw(a); a.setTransform(1, 0, 0, 1, 0, 0);
  a.globalCompositeOperation = 'destination-in'; a.fillStyle = a.createPattern(AN_PEN(), 'repeat'); a.fillRect(0, 0, cw, ch); a.globalCompositeOperation = 'source-over';
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(L, 0, 0); c.restore();
}
/* eyes and ink: bright on top of the pencil */
function anSharp(c, gs) {
  gs.L.sort((m, n) => n.d - m.d);
  for (const e of gs.L) {
    if (e.ink) { c.fillStyle = e.col; c.beginPath(); c.arc(e.q[0], e.q[1], e.r, 0, 6.283); c.fill(); continue; }
    const [x, y] = e.q, rr = e.r; c.fillStyle = e.col; c.beginPath(); c.arc(x, y, rr, 0, 6.283); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.arc(x - rr * 0.32, y - rr * 0.34, Math.max(0.8, rr * 0.3), 0, 6.283); c.fill();
  }
}
function anTick(sp, r, dt) { const D = AN[sp.animal]; if (!D) return; const s = r.st.an || (r.st.an = anNew(D)); const n = Math.max(1, Math.ceil(dt / 0.02)); for (let i = 0; i < n; i++) anStep(D, s, dt / n); }
/* a tap at (x, y) on the canvas: the animal answers, away from the finger */
function anTap(sp, r, x, y, w, h) {
  const D = AN[sp.animal]; if (!D || !r.st) return false; const s = r.st.an || (r.st.an = anNew(D));
  const P = cam3(r, w, h, D.R || 1.1, D.tz || 0), q = P(s.x, s.y, s.z + 0.15), cm = r.cam || CAM0;
  let dx = q[0] - x, dy = q[1] - y; if (Math.hypot(dx, dy) < 4) { dx = Math.cos(s.h + 2.4); dy = Math.sin(s.h + 2.4); }
  /* on the screen to on the ground: right is (cos yaw, sin yaw), up the screen is away from the viewer */
  const cy = Math.cos(cm.yaw), sy = Math.sin(cm.yaw), d = [dx * cy + dy * sy, dx * sy - dy * cy];
  return anReact(D, s, d);
}

/* ----- birds (chicken, duck, sparrow): body, neck and head that peck, legs with the ankle bent back, wings folded
   on the sides or spread and beating when it flies or flutters away ----- */
function anBird(b, s, C, D) {
  const Q = D.Q, air = (s.z > 0.01 && !s.hop) || (s.rx && s.rx.k === 'flyoff'), flut = s.rx && s.rx.k === 'flee' ? s.rk : 0;
  const peck = s.act === Q.down ? anBell(s.ap, 0.1) * Math.pow(Math.max(0, Math.sin(s.aT * Q.pr)), 2) : 0;
  const mv = Math.min(1.3, s.mv), hop = s.hop ? Math.sin(Math.PI * s.hop.u) : 0;
  const roll = Q.waddle ? Math.sin(s.ph) * 0.12 * mv : 0, bz = Q.zb + (air ? 0 : 0.008 * Math.abs(Math.sin(s.ph)) * mv);
  const bp = air ? 0.05 : -0.12 + 0.35 * peck;
  b.push([0, 0, bz], anMs(anRx(roll), anRy(bp)));
  const cb = (u) => (u[2] < -0.3 || u[0] > 0.55 ? C.b2 : C.b);
  b.ell([0, 0, 0], Q.br, null, cb, { n1: 10, n2: 12 });
  b.ell([Q.br[0] * 0.55, 0, Q.br[2] * 0.2], [Q.br[0] * 0.55, Q.br[1] * 0.85, Q.br[2] * 0.8], null, cb, { n1: 7, n2: 10 });
  /* tail */
  Q.tail(b, s, C, D);
  /* wings: folded on the sides, or spread and beating */
  const fl = air ? Math.sin(s.t * Q.flap * 6.283) : flut ? Math.sin(s.t * 22) : 0, spread = air ? 1 : flut;
  for (const sd of [1, -1]) {
    if (spread > 0.05) {
      b.push([0.03, sd * Q.br[1] * 0.7, Q.br[2] * 0.45], anRx(sd * (0.15 + 0.85 * fl * spread)));
      b.sheet([[0.06, 0, 0], [0.02, sd * Q.ws * spread, 0.01], [-0.06, sd * Q.ws * 0.9 * spread, 0], [-0.12, sd * Q.ws * 0.45 * spread, -0.005], [-0.1, 0, 0]], C.w || C.b);
      b.pop();
    } else b.ell([-0.02, sd * Q.br[1] * 0.82, Q.br[2] * 0.15], [Q.br[0] * 0.8, Q.br[1] * 0.22, Q.br[2] * 0.62], anRy(-0.12), C.w || C.b, { n1: 7, n2: 9 });
  }
  b.pop();
  /* legs: from inside the body to the feet; tucked up when flying */
  const hipz = bz - Q.br[2] * 0.55, L = (Q.zb - Q.br[2] * 0.55) * 0.58;
  for (const sd of [1, -1]) {
    const p = s.ph + (sd > 0 ? 0 : Math.PI), H = [-0.01, sd * Q.br[1] * 0.45, hipz];
    let F = Q.hop ? [0.02 - 0.04 * hop, sd * Q.br[1] * 0.45, 0] : [0.02 + Q.step * Math.sin(p) * mv, sd * Q.br[1] * 0.45, Q.lift * Math.max(0, Math.cos(p)) * Math.min(1, mv)];
    if (air) F = [-0.08, sd * 0.04, hipz - L * 0.9]; else F[2] -= s.z; /* on the ground while it hops */
    const K = anIK(H, F, L, L, [-1, 0, 0.2]);
    b.tube([H, K], 0.018 * Q.k, C.b2, { sides: 5 }); b.tube([K, F], 0.008 * Q.k, C.f, { sides: 5 });
    if (Q.web) b.sheet([[F[0] - 0.01, F[1], F[2] + 0.002], [F[0] + 0.07 * Q.k, F[1] + 0.035 * Q.k, F[2]], [F[0] + 0.075 * Q.k, F[1] - 0.035 * Q.k, F[2]]], C.f);
    else for (const a of [-0.45, 0, 0.45, Math.PI]) b.line([F, [F[0] + Math.cos(a) * 0.05 * Q.k, F[1] + Math.sin(a) * 0.05 * Q.k, F[2]]], C.f, 0.007 * Q.k);
  }
  /* neck and head: pecks at the ground; a hen's head stays still while the body steps on */
  const bob = Q.bob ? ((s.ph / 6.283) % 1) * 0.04 * mv : 0, look = s.act === 'look' ? Math.sin(s.aT * 3) * 0.6 : 0;
  const N0 = [Q.br[0] * 0.75, 0, bz + Q.br[2] * 0.5], hd = peck, Hc = [N0[0] + Q.nx + 0.04 * hd - bob, 0, N0[2] + Q.nz * (1 - hd) - (bz - 0.04) * hd * 0.95];
  b.tube([N0, anLerp(N0, Hc, 0.5), Hc], (t) => Q.nr * (1 - 0.3 * t), C.n || C.b, { sides: 7 });
  b.push(Hc, anMs(anRz(look), anRy(0.25 + 1.25 * hd)));
  b.ell([0, 0, 0], Q.hr, null, C.n || C.b, { n1: 7, n2: 9 });
  Q.head(b, s, C, D);
  b.eye([Q.hr[0] * 0.35, Q.hr[1] * 0.8, Q.hr[2] * 0.25], 0.011 * Q.k, [0.3, 1, 0.2]); b.eye([Q.hr[0] * 0.35, -Q.hr[1] * 0.8, Q.hr[2] * 0.25], 0.011 * Q.k, [0.3, -1, 0.2]);
  b.pop();
}
const AN_BEAK = (len, r, col) => (b) => b.tube([[0.03, 0, 0], [0.03 + len * 0.6, 0, -r * 0.3], [0.03 + len, 0, -r * 0.8]], (t) => r * (1 - 0.95 * t), col, { sides: 6 });
const AN_QHEN = { zb: 0.24, br: [0.17, 0.11, 0.12], k: 1, ws: 0.24, flap: 7, step: 0.07, lift: 0.05, nx: 0.05, nz: 0.12, nr: 0.045, hr: [0.06, 0.045, 0.05], down: 'peck', pr: 9, bob: true,
  head: (b, s, C) => { AN_BEAK(0.06, 0.02, C.f)(b); for (let i = 0; i < 4; i++) b.sheet([[0.04 - i * 0.025, 0, 0.035], [0.035 - i * 0.025, 0, 0.075 - Math.abs(i - 1.5) * 0.01], [0.015 - i * 0.025, 0, 0.04]], C.c, { edge: false }); b.ell([0.05, 0, -0.045], [0.012, 0.008, 0.02], null, C.c, { n1: 5, n2: 6 }); },
  tail: (b, s, C) => { for (let i = -2; i <= 2; i++) b.sheet([[-0.13, i * 0.02, 0.04], [-0.26, i * 0.035, 0.2 - Math.abs(i) * 0.02], [-0.2, i * 0.03, 0.03]], C.t || C.b); } };
anDef('chicken', { th: 'ไก่', en: 'chicken', grp: 'สัตว์ปีก (นก)', hint: 'เดินคุ้ยจิกกินอาหาร แตะแล้วกระพือปีกวิ่งหนี', kw: 'ไก่บ้าน แม่ไก่ สัตว์ปีก', go: 'walk', spd: 0.16, fast: 0.6, stride: 0.13, turn: 3, roam: 0.2, R: 0.44, tz: 0.18, react: 'flee', fleeLen: 0.45,
  loop: [['go', 3.5], ['peck', 3.5], ['look', 1.6], ['go', 3], ['peck', 4]], acts: { peck: 'จิกกินอาหาร', flee: 'กระพือปีก วิ่งหนี' }, C: { b: '#B5652E', b2: '#D9A066', t: '#5A3A22', f: '#E6B23A', c: '#D63A2E', n: '#C27838' },
  Q: AN_QHEN, draw: anBird, sh: [0.2, 0.12] });
anDef('duck', { th: 'เป็ด', en: 'duck', grp: 'สัตว์ปีก (นก)', hint: 'เดินเตาะแตะ ไซ้ขน แตะแล้วกระพือปีกวิ่งหนี ร้องก้าบ', kw: 'เป็ดบ้าน สัตว์ปีก ตีนพังผืด', go: 'walk', spd: 0.12, fast: 0.42, stride: 0.12, turn: 2.4, roam: 0.2, R: 0.46, tz: 0.18, react: 'flee', fleeLen: 0.45,
  loop: [['go', 4], ['peck', 3], ['go', 3], ['look', 2]], acts: { peck: 'ไซ้หาอาหาร', flee: 'กระพือปีก วิ่งหนี' }, C: { b: '#F1EEE6', b2: '#E2DCCD', f: '#E8942C', c: '#E8942C' },
  Q: Object.assign({}, AN_QHEN, { zb: 0.2, br: [0.2, 0.12, 0.1], waddle: true, bob: false, nx: 0.06, nz: 0.13, nr: 0.04, hr: [0.065, 0.045, 0.048], web: true, pr: 6,
    head: (b, s, C) => b.ell([0.085, 0, -0.012], [0.045, 0.026, 0.01], anRy(0.15), C.f, { n1: 6, n2: 8 }),
    tail: (b, s, C) => b.sheet([[-0.16, 0.05, 0.02], [-0.25, 0, 0.09], [-0.16, -0.05, 0.02]], C.b) }), draw: anBird, sh: [0.22, 0.13] });
anDef('bird', { th: 'นก', en: 'sparrow', grp: 'สัตว์ปีก (นก)', hint: 'นกกระจอก กระโดดจิกเมล็ดพืช แตะแล้วบินหนี แล้วร่อนลงที่ใหม่', kw: 'นกกระจอก สัตว์ปีก บิน', go: 'hop', air: true, spd: 0.3, fast: 0.9, hopLen: 0.09, hopH: 0.035, hopT: 0.22, hopRest: 0.25, turn: 5, roam: 0.16, zLo: 0.2, zHi: 0.55, R: 0.28, tz: 0.12, react: 'flyoff',
  loop: [['go', 2.6], ['peck', 2.8], ['look', 1.4], ['go', 2], ['peck', 2.4]], acts: { go: 'กระโดด', peck: 'จิกกินเมล็ดพืช', flyoff: 'บินหนี', land: 'ร่อนลง' }, C: { b: '#8A6A48', b2: '#E2D6C2', w: '#6E5234', t: '#5A4430', f: '#B89878', n: '#9C7A56' },
  Q: Object.assign({}, AN_QHEN, { zb: 0.07, br: [0.07, 0.042, 0.045], k: 0.4, ws: 0.13, flap: 11, hop: true, bob: false, nx: 0.018, nz: 0.035, nr: 0.028, hr: [0.032, 0.028, 0.03], pr: 10,
    head: (b, s, C) => { AN_BEAK(0.022, 0.009, '#3A342E')(b); b.ell([-0.005, 0, 0.015], [0.026, 0.026, 0.016], null, '#6E5A48', { n1: 5, n2: 8 }); },
    tail: (b, s, C) => b.sheet([[-0.06, 0.012, 0.01], [-0.13, 0.02, 0.03], [-0.13, -0.02, 0.03], [-0.06, -0.012, 0.01]], C.t) }), draw: anBird, sh: [0.07, 0.045] });

/* ----- in the water: a sandy or pebbly bottom under it ----- */
const anSand = (c, P, s, C, D) => anPatch(c, P, 0, 0, D.R * 0.95, D.R * 0.75, 'rgba(226,206,160,0.55)', 'rgba(170,140,90,0.45)', 'rgba(150,120,80,0.5)');
const anPond = (c, P, s, C, D) => anPatch(c, P, 0, 0, D.R * 0.95, D.R * 0.75, 'rgba(150,190,215,0.35)', 'rgba(90,140,180,0.5)', 'rgba(110,120,120,0.45)');
/* a fish: a body that bends in a wave down to the tail, its fins; it darts away when touched */
function anFish(b, s, C, D) {
  const n = 12, sw = 0.5 + 1.2 * Math.min(1.5, s.mv) + (s.rx ? 1.5 * s.rk : 0), A = 0.035 + 0.02 * Math.min(1.5, s.mv), L = 0.42, pts = [];
  s.fx.w = (s.fx.w || 0) + 0.016 * sw * 6;
  for (let i = 0; i <= n; i++) { const u = i / n, amp = A * (0.15 + u * u); pts.push([L * 0.45 - L * u, amp * Math.sin(u * 5 - s.fx.w), 0]); }
  const H = 0.1, prof = (t) => { const r = H * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.88 + 0.06)), 0.75) * (1 - 0.55 * Math.max(0, t - 0.75) / 0.25); return [r * 0.42, r]; };
  b.tube(pts, prof, (t, a) => (Math.sin(a) > 0.2 ? C.b : Math.sin(a) < -0.35 ? C.b2 : (Math.sin(t * 22) > 0.6 && t > 0.2 && t < 0.8 ? C.d : C.b)), { sides: 10 });
  const tail = pts[n], tb = pts[n - 1], fw = Math.sin(s.fx.w * 1.1) * 0.03;
  b.sheet([[tail[0] + 0.02, tail[1], 0], [tail[0] - 0.12, tail[1] + fw + 0.02, 0.09], [tail[0] - 0.08, tail[1] + fw, 0], [tail[0] - 0.12, tail[1] + fw + 0.02, -0.09]], C.f);
  const m = pts[5]; b.sheet([[m[0] + 0.1, m[1], 0.08], [m[0], m[1], 0.14], [m[0] - 0.14, pts[8][1], 0.07]], C.f);
  b.sheet([[pts[7][0] + 0.02, pts[7][1], -0.07], [pts[8][0] - 0.02, pts[8][1], -0.11], [pts[9][0], pts[9][1], -0.06]], C.f);
  for (const sd of [1, -1]) { const fl = 0.3 + 0.35 * Math.sin(s.t * 6 + sd); b.sheet([[0.09, sd * 0.035, -0.03], [0.02, sd * (0.05 + 0.04 * fl), -0.06], [0.035, sd * 0.04, -0.03]], C.f); }
  b.eye([0.16, 0.03, 0.025], 0.014, [0.3, 1, 0.1]); b.eye([0.16, -0.03, 0.025], 0.014, [0.3, -1, 0.1]);
  b.line([[0.205, 0.01, -0.02], [0.2, 0, -0.025], [0.205, -0.01, -0.02]], 'rgba(60,50,50,0.7)', 0.004);
}
anDef('fish', { th: 'ปลา', en: 'fish', grp: 'ปลา', hint: 'ปลานิล ว่ายน้ำโบกหางและครีบ แตะแล้วสะบัดหางพุ่งหนี', kw: 'ปลานิล ปลาน้ำจืด เหงือก ครีบ', go: 'swim', spd: 0.16, fast: 0.8, stride: 0.2, turn: 1.8, acc: 3, roam: 0.24, zLo: 0.18, zHi: 0.34, z0: 0.26, R: 0.5, tz: 0.2, react: 'dart', fleeLen: 0.55,
  loop: [['go', 5], ['hover', 2.5], ['go', 5], ['go', 4]], acts: { go: 'ว่ายน้ำ', hover: 'ลอยตัว โบกครีบ', dart: 'สะบัดหาง พุ่งหนี' }, C: { b: '#6F8A86', b2: '#E6E2D2', d: '#4E6662', f: '#8A9EA0' },
  draw: anFish, ground: anPond, sh: [0.2, 0.06] });
/* a squid: the mantle goes first, fins wave at its tip, arms trail; touched, it squirts ink and shoots away */
function anSquid(b, s, C, D) {
  const sq = s.rx && s.rx.k === 'ink' ? Math.max(0, Math.sin(s.rx.t * 9)) * s.rk : 0, pts = [];
  for (let i = 0; i <= 8; i++) pts.push([0.24 - 0.3 * i / 8, 0, 0]);
  b.tube(pts, (t) => { const r = 0.062 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.6)), 0.7) * (1 - 0.18 * sq); return r; }, (t, a) => (Math.sin(t * 31 + a * 3) > 0.7 ? C.d : C.b), { sides: 10 });
  const wv = s.t * 6;
  for (const sd of [1, -1]) b.sheet([[0.24, 0, 0], [0.16, sd * 0.07, 0.008 * Math.sin(wv)], [0.08, sd * 0.05, 0.01 * Math.sin(wv + 1)], [0.05, 0, 0]], C.f);
  b.ell([-0.09, 0, 0], [0.045, 0.045, 0.042], null, C.b, { n1: 7, n2: 9 });
  b.eye([-0.085, 0.04, 0.012], 0.018, [0, 1, 0.2]); b.eye([-0.085, -0.04, 0.012], 0.018, [0, -1, 0.2]);
  const spread = 0.3 + 0.15 * Math.sin(s.t * 2) - 0.2 * sq;
  for (let k = 0; k < 10; k++) {
    const a = k / 10 * 6.283, ten = k === 2 || k === 7, L = ten ? 0.3 : 0.17, q = [];
    for (let i = 0; i <= 5; i++) { const u = i / 5, w = Math.sin(s.t * 2.5 + k + u * 3) * 0.02 * u; q.push([-0.12 - L * u, Math.cos(a) * (0.025 + spread * 0.1 * u) + w, Math.sin(a) * (0.022 + spread * 0.08 * u) + w * 0.5]); }
    b.tube(q, (t) => (ten && t > 0.8 ? 0.012 : 0.011 * (1 - 0.7 * t)), C.b, { sides: 5 });
  }
}
anDef('squid', { th: 'ปลาหมึก', en: 'squid', grp: 'หอยและหมึก (มอลลัสก์)', hint: 'ปลาหมึกกล้วย ว่ายไปมาเหนือพื้นทราย ครีบพลิ้ว แตะแล้วพ่นหมึกพุ่งหนี', kw: 'หมึก หมึกกล้วย สัตว์ไม่มีกระดูกสันหลัง หมึกดำ', go: 'swim', mantle: true, spd: 0.1, fast: 0.7, stride: 0.2, turn: 1.2, roam: 0.2, zLo: 0.16, zHi: 0.26, z0: 0.2, R: 0.42, tz: 0.16, react: 'ink', fleeLen: 0.5,
  loop: [['go', 5], ['hover', 3], ['go', 5]], acts: { go: 'ว่ายไปมาเหนือพื้นทราย', hover: 'ลอยนิ่ง ครีบพลิ้ว', ink: 'พ่นหมึก พุ่งหนี' }, C: { b: '#E3B49C', b2: '#F2DCCF', d: '#A0523A', f: '#EBC7B4' },
  draw: anSquid, ground: anSand, sh: [0.18, 0.06] });
/* a crab walks sideways on eight legs, picks food to its mouth with its claws, raises them when touched, then scuttles away */
function anCrab(b, s, C, D) {
  const thr = s.rx && s.rx.k === 'threat' && s.rx.t < 1.2 ? s.rk : 0, eat = s.act === 'eat' ? anBell(s.ap, 0.15) : 0, mv = Math.min(1.4, s.mv), z0 = 0.075;
  b.ell([0, 0, z0], [0.085, 0.12, 0.04], null, (u) => (u[2] < -0.3 ? C.b2 : C.b), { n1: 8, n2: 12, def: (u) => [0, 0, u[2] > 0 ? 0.012 * (1 - u[1] * u[1]) : 0] });
  for (const sd of [1, -1]) { b.tube([[0.06, sd * 0.03, z0 + 0.02], [0.08, sd * 0.035, z0 + 0.05 + 0.02 * thr]], 0.006, C.b, { sides: 5 }); b.eye([0.08, sd * 0.035, z0 + 0.055 + 0.02 * thr], 0.011, [1, sd * 0.3, 0.4]); }
  for (let k = 0; k < 4; k++) for (const sd of [1, -1]) {
    const x0 = 0.03 - k * 0.035, p = s.ph + k * 1.6 + (sd > 0 ? 0 : Math.PI), H = [x0, sd * 0.105, z0 - 0.005];
    const F = [x0 * 2.4 + 0.035 + 0.02 * Math.cos(p) * mv, sd * (0.22 - 0.012 * k + 0.03 * Math.sin(p) * mv), 0.025 * Math.max(0, Math.sin(p)) * Math.min(1, mv) + 0.04 * thr];
    const K = anIK(H, F, 0.085, 0.1, [0, sd * 0.3, 1]); b.tube([H, K, F], (t) => 0.012 * (1 - 0.6 * t), C.b, { sides: 5 });
  }
  for (const sd of [1, -1]) {
    const lift = thr * 1.0 + eat * Math.max(0, Math.sin(s.aT * 4 + (sd > 0 ? 0 : Math.PI))) * 0.35;
    const S0 = [0.07, sd * 0.07, z0], E0 = [0.13, sd * (0.14 + 0.04 * thr), z0 + 0.01 + 0.1 * lift], Cw = [0.17 - 0.07 * eat * lift, sd * (0.11 + 0.08 * thr), z0 + 0.03 + 0.16 * lift];
    b.tube([S0, E0, Cw], 0.016, C.b, { sides: 6 });
    b.push(Cw, anMs(anRz(sd * (0.4 + 0.3 * thr)), anRy(-0.6 * lift)));
    b.ell([0.03, 0, 0], [0.05, 0.026, 0.024], null, C.c, { n1: 7, n2: 9 });
    const op = 0.25 + 0.25 * thr * Math.abs(Math.sin(s.t * 6)); b.tube([[0.07, 0, 0.005], [0.11, 0, 0.005 + 0.03 * op]], (t) => 0.009 * (1 - 0.6 * t), C.c, { sides: 5 }); b.tube([[0.07, 0, -0.008], [0.11, 0, -0.012]], (t) => 0.009 * (1 - 0.6 * t), C.c, { sides: 5 });
    b.pop();
  }
}
anDef('crab', { th: 'ปู', en: 'crab', grp: 'สัตว์ขาปล้อง (ครัสเตเชียน)', hint: 'ปูนา เดินด้านข้าง ใช้ก้ามหยิบอาหาร แตะแล้วชูก้ามขู่ แล้ววิ่งหนีไปข้าง ๆ', kw: 'ปูนา ปูทะเล ก้าม สัตว์ไม่มีกระดูกสันหลัง', go: 'walk', side: true, spd: 0.1, fast: 0.45, stride: 0.12, turn: 3, roam: 0.18, R: 0.38, tz: 0.06, react: 'threat', fleeLen: 0.5,
  loop: [['go', 3], ['eat', 3.5], ['go', 3], ['look', 1.5]], acts: { go: 'เดินด้านข้าง', eat: 'ใช้ก้ามหยิบอาหารเข้าปาก', look: 'ยกตาดู', threat: 'ชูก้ามขู่ แล้ววิ่งหนี' }, C: { b: '#6E4E3A', b2: '#C8AE8A', c: '#7E5A40' },
  draw: anCrab, ground: anSand, sh: [0.2, 0.2] });
/* a shrimp walks on the bottom with its feelers sweeping; touched, it curls its tail and shoots backwards */
function anShrimp(b, s, C, D) {
  const curl = s.rx && s.rx.k === 'flip' ? s.rk : 0, pts = [], n = 9;
  for (let i = 0; i <= n; i++) { const u = i / n, a = (0.12 + 1.9 * curl) * u * u; pts.push([0.12 - 0.3 * u * Math.cos(a * 0.6), 0, 0.05 - 0.3 * u * Math.sin(a * 0.6) * 0.5 - 0.02 * u * u]); }
  b.tube(pts, (t) => { const r = 0.032 * (1 - 0.6 * t * t); return [r * 0.85, r]; }, (t) => (Math.sin(t * 36) > 0.75 ? C.d : C.b), { sides: 9 });
  const T = pts[n]; for (let k = -2; k <= 2; k++) b.sheet([[T[0], T[1], T[2]], [T[0] - 0.06, k * 0.018, T[2] - 0.015 - curl * 0.04], [T[0] - 0.05, k * 0.018 + 0.012, T[2] - 0.01 - curl * 0.04]], C.f);
  b.tube([[0.12, 0, 0.065], [0.19, 0, 0.08]], (t) => 0.006 * (1 - 0.9 * t), C.b, { sides: 4 });
  for (const sd of [1, -1]) {
    b.eye([0.13, sd * 0.022, 0.07], 0.01, [0.6, sd, 0.3]);
    const sw = Math.sin(s.t * 1.4 + sd) * 0.4; b.line([[0.14, sd * 0.012, 0.06], [0.2, sd * (0.04 + 0.03 * sw), 0.09], [0.27, sd * (0.09 + 0.07 * sw), 0.07], [0.31, sd * (0.13 + 0.06 * sw), 0.03]], C.d, 0.003);
    for (let k = 0; k < 5; k++) { const x = 0.1 - k * 0.025, p = s.ph + k * 1.2 + (sd > 0 ? 0 : 3.14), lf = Math.max(0, Math.sin(p)) * 0.015 * Math.min(1, s.mv); b.line([[x, sd * 0.02, 0.03], [x + 0.01, sd * 0.06, 0.02 + lf], [x + 0.02 + 0.02 * Math.cos(p) * s.mv, sd * 0.07, 0]], C.d, 0.004); }
    for (let k = 0; k < 4; k++) { const q = pts[3 + k], b0 = Math.sin(s.t * 12 + k) * 0.01; b.line([[q[0], sd * 0.015, q[2] - 0.02], [q[0] + b0, sd * 0.02, q[2] - 0.045]], C.f, 0.004); }
  }
}
anDef('shrimp', { th: 'กุ้ง', en: 'shrimp', grp: 'สัตว์ขาปล้อง (ครัสเตเชียน)', hint: 'กุ้งฝอย เดินบนพื้นน้ำ หนวดกวาดหาอาหาร แตะแล้วงอหางดีดตัวถอยหลัง', kw: 'กุ้งฝอย กุ้งก้ามกราม สัตว์ไม่มีกระดูกสันหลัง', go: 'walk', spd: 0.07, fast: 0.55, stride: 0.1, turn: 2, roam: 0.16, R: 0.34, tz: 0.06, react: 'flip', fleeLen: 0.5,
  loop: [['go', 4], ['rest', 3], ['go', 3]], acts: { go: 'เดินบนพื้นน้ำ', rest: 'หยุด หนวดกวาดหาอาหาร', flip: 'งอหาง ดีดตัวถอยหลัง' }, C: { b: '#B9C8C8', b2: '#DDE6E4', d: '#6E8A8C', f: '#A6BCC0' },
  draw: anShrimp, ground: anPond, sh: [0.18, 0.06] });
/* a snail: a coiled shell on a soft foot that glides; touched, the feelers and the body pull into the shell */
function anSnail(b, s, C, D) {
  const hide = s.rx && s.rx.k === 'hide' ? s.rk : 0, ext = 1 - hide, rip = Math.sin(s.t * 5) * 0.004 * Math.min(1, s.mv);
  const fx = 0.14 * ext, foot = [[-0.1 * (0.4 + 0.6 * ext), 0, 0.012], [-0.02, 0, 0.016 + rip], [0.06 * ext, 0, 0.02 - rip], [fx, 0, 0.035], [fx + 0.025 * ext, 0, 0.055]];
  if (ext > 0.05) b.tube(foot, (t) => [0.03 * (1 - 0.3 * t) * (0.5 + 0.5 * ext), 0.02 * (1 - 0.2 * t)], C.b, { sides: 8 });
  /* the shell, a tube along a widening spiral */
  const sp = [], N = 26; for (let i = 0; i <= N; i++) { const u = i / N, th = 0.9 + 4.6 * Math.PI * (1 - u), r = 0.075 * Math.exp(-1.25 * (1 - u) * 2.3); sp.push([-0.02 + r * Math.cos(th), 0.035 * (1 - u) - 0.01, 0.085 + r * Math.sin(th)]); }
  b.tube(sp, (t) => 0.004 + 0.052 * Math.pow(t, 1.6), (t) => (Math.sin(t * 40) > 0.4 ? C.d : C.s), { sides: 10, cap: false });
  if (ext > 0.05) {
    const h = [fx + 0.025 * ext, 0, 0.055], sw = Math.sin(s.t * 1.7) * 0.15;
    for (const sd of [1, -1]) {
      const e = [h[0] + 0.05 * ext, sd * (0.025 + 0.012 * ext) + sw * 0.03, h[2] + 0.07 * ext]; b.tube([h, e], 0.006, C.b, { sides: 5 }); b.ball(e, 0.008, '#2A2622');
      b.tube([[h[0] + 0.01, sd * 0.012, h[2] - 0.01], [h[0] + 0.035 * ext, sd * 0.03, h[2] - 0.005]], 0.004, C.b, { sides: 4 });
    }
  }
}
anDef('snail', { th: 'หอยทาก', en: 'snail', grp: 'หอยและหมึก (มอลลัสก์)', hint: 'คลานช้า ๆ ด้วยเท้า หนวดยืดหด แตะแล้วหดเข้าเปลือก แล้วค่อย ๆ ออกมาใหม่', kw: 'หอย หอยทากบก มอลลัสก์ เปลือก', go: 'walk', spd: 0.035, fast: 0.035, stride: 0.06, turn: 0.8, acc: 0.3, brake: 0.05, roam: 0.12, R: 0.26, tz: 0.06, react: 'hide',
  loop: [['go', 8], ['look', 3], ['go', 7]], acts: { go: 'คลานด้วยเท้า', look: 'ยืดหนวดดูรอบตัว', hide: 'หดเข้าเปลือก' }, C: { b: '#B9A98E', s: '#A9733E', d: '#6E4626' },
  draw: anSnail, props: (b) => { anGrass(b, 0.25, -0.2, 0.7); anGrass(b, -0.2, 0.25, 0.6); }, sh: [0.13, 0.06] });

/* ----- frogs and toads: they sit with the hind legs folded in a Z, the throat pumping; a hop throws the legs out
   behind. Touched, a frog leaps far away; a toad puffs itself up big ----- */
function anFrog(b, s, C, D) {
  const Q = D.Q, u = s.hop ? s.hop.u : 0, big = s.hop && s.hop.len > D.hopLen * 1.2;
  const ext = s.hop ? anCl(Math.sin(Math.PI * Math.min(1, u * 1.5)) * 1.2, 0, 1) : 0, puff = s.rx && s.rx.k === 'puff' ? s.rk : 0, k = Q.k * (1 + 0.32 * puff);
  const call = s.act === 'call' ? Math.max(0, Math.sin(s.aT * 7)) * anBell(s.ap, 0.1) : 0, breathe = 0.5 + 0.5 * Math.sin(s.t * 3.5);
  const bp = -0.38 + 0.4 * ext + (big ? -0.2 * Math.cos(Math.PI * u) : 0), z0 = 0.045 * k + 0.02 * puff;
  b.push([0, 0, z0], anRy(bp));
  const cb = (q) => (q[2] < -0.35 ? C.b2 : (Q.stripe && Math.abs(q[1]) < 0.12 && q[2] > 0.5 ? C.s : (Q.spots && Math.sin(q[0] * 13 + q[1] * 9) * Math.sin(q[1] * 11 - q[2] * 7) > 0.5 ? C.d : C.b)));
  b.ell([0, 0, 0], [0.085 * k, 0.06 * k, 0.045 * k], null, cb, { n1: 10, n2: 12 });
  b.ell([0.07 * k, 0, 0.012 * k], [0.05 * k, 0.055 * k, 0.034 * k], null, cb, { n1: 8, n2: 10 });
  if (Q.warts) for (let i = 0; i < 12; i++) { const a = i * 2.4, r = 0.3 + (i % 4) * 0.17; b.ball([(-0.05 + 0.1 * ((i * 0.37) % 1)) * k, Math.sin(a) * 0.04 * k * r * 1.8, (0.035 + 0.01 * Math.cos(a)) * k], 0.007 * k, C.d); }
  for (const sd of [1, -1]) { b.ell([0.085 * k, sd * 0.032 * k, 0.04 * k], [0.018 * k, 0.018 * k, 0.016 * k], null, C.b, { n1: 5, n2: 7 }); b.eye([0.09 * k, sd * 0.036 * k, 0.05 * k], 0.014 * k, [0.4, sd, 0.6], Q.eye); }
  b.line([[0.115 * k, 0.035 * k, -0.002], [0.122 * k, 0, 0.0], [0.115 * k, -0.035 * k, -0.002]], 'rgba(50,50,40,0.7)', 0.003);
  if (Q.sac) b.ell([0.085 * k, 0, -0.03 * k], [0.035 * k * (0.4 + 0.8 * call + 0.1 * breathe), 0.034 * k * (0.4 + 0.9 * call), 0.022 * k * (0.4 + 0.9 * call + 0.1 * breathe)], null, C.v, { n1: 6, n2: 8 });
  b.pop();
  /* legs in the frame of the ground under the frog */
  const toB = (p) => { const q = anMv(anRy(bp), p); return [q[0], q[1], q[2] + z0]; };
  for (const sd of [1, -1]) {
    const Sh = toB([0.06 * k, sd * 0.045 * k, -0.02 * k]), Hd = ext > 0.3 ? anAdd(Sh, [0.06 * k * (1 + ext), sd * 0.03 * k, -0.02 * k]) : [0.1 * k, sd * 0.065 * k, -s.z];
    b.tube([Sh, anIK(Sh, Hd, 0.045 * k, 0.045 * k, [-1, 0, 0]), Hd], 0.011 * k, C.b, { sides: 5 });
    for (const a of [-0.5, 0, 0.5]) b.line([Hd, anAdd(Hd, [Math.cos(a) * 0.022 * k, sd * Math.sin(a + 0.4) * 0.022 * k, 0])], C.b, 0.006 * k);
    /* the hind leg: hip, knee, ankle, toe; folded (Z) when it sits, thrown out behind when it hops */
    const Hp = toB([-0.07 * k, sd * 0.04 * k, -0.01 * k]);
    const fold = [[0.0, sd * 0.1, 0.03 - 0.0], [-0.09, sd * 0.085, 0.012], [0.0, sd * 0.1, 0.0]].map((q) => [q[0] * k, q[1] * k, q[2] * k - s.z]);
    const out = [[-0.14, sd * 0.07, 0.0], [-0.23, sd * 0.06, -0.01], [-0.3, sd * 0.06, -0.01]].map((q) => anAdd(Hp, [q[0] * k, q[1] * k - Hp[1] + sd * 0.0, q[2] * k]));
    const [Kn, An, Te] = fold.map((q, i) => anLerp(q, out[i], ext));
    b.tube([Hp, Kn], (t) => 0.022 * k * (1 - 0.35 * t), C.b, { sides: 6 }); b.tube([Kn, An], 0.013 * k, C.b, { sides: 5 }); b.tube([An, Te], 0.008 * k, C.b, { sides: 5 });
    b.sheet([Te, anAdd(Te, [0.04 * k * (ext > 0.5 ? -1 : 1), sd * 0.025 * k, 0]), anAdd(Te, [0.045 * k * (ext > 0.5 ? -1 : 1), -sd * 0.012 * k, 0])], C.b);
  }
}
const AN_QFROG = { k: 1, sac: true, eye: '#3A2E18', spots: true };
anDef('frog', { th: 'กบ', en: 'frog', grp: 'สัตว์สะเทินน้ำสะเทินบก', hint: 'กบนา นั่งพองคอร้อง กระโดดไปมา แตะแล้วกระโดดไกลหนี', kw: 'กบนา สัตว์ครึ่งบกครึ่งน้ำ', go: 'hop', spd: 0.4, fast: 1, hopLen: 0.14, hopH: 0.07, hopT: 0.42, hopRest: 0.5, jumpLen: 0.42, jumpH: 0.2, turn: 4, roam: 0.16, R: 0.28, tz: 0.06, react: 'jump',
  loop: [['call', 3.5], ['go', 2.5], ['rest', 2], ['go', 2], ['call', 3]], acts: { go: 'กระโดด', rest: 'นั่งนิ่ง', call: 'พองถุงใต้คอส่งเสียงร้อง', jump: 'กระโดดไกลหนี' }, C: { b: '#7C8C46', b2: '#E2DCB4', d: '#4E5A2C', v: '#C8C49A' },
  Q: AN_QFROG, draw: anFrog, props: (b) => { anGrass(b, 0.28, -0.18, 0.8); anGrass(b, -0.26, 0.2, 0.7); }, sh: [0.11, 0.07] });
anDef('ricefrog', { th: 'เขียด', en: 'rice frog', grp: 'สัตว์สะเทินน้ำสะเทินบก', hint: 'ตัวเล็กกว่ากบ มีแถบสีอ่อนกลางหลัง กระโดดเร็วและบ่อย แตะแล้วกระโดดหนีไปไกล', kw: 'เขียดนา สัตว์ครึ่งบกครึ่งน้ำ กบเล็ก', go: 'hop', spd: 0.5, fast: 1, hopLen: 0.12, hopH: 0.06, hopT: 0.32, hopRest: 0.3, jumpLen: 0.38, jumpH: 0.16, turn: 5, roam: 0.14, R: 0.22, tz: 0.04, react: 'jump',
  loop: [['go', 2], ['rest', 1.8], ['go', 2.5], ['call', 2.5]], acts: { go: 'กระโดด', rest: 'นั่งนิ่ง', call: 'ร้อง', jump: 'กระโดดไกลหนี' }, C: { b: '#6A7440', b2: '#E6E0C0', d: '#3E4626', s: '#C8C890', v: '#D8D4A8' },
  Q: { k: 0.72, sac: true, eye: '#2A2416', stripe: true, spots: true }, draw: anFrog, props: (b) => { anGrass(b, 0.2, -0.16, 0.6); anGrass(b, -0.18, 0.18, 0.55); }, sh: [0.08, 0.05] });
anDef('toad', { th: 'คางคก', en: 'toad', grp: 'สัตว์สะเทินน้ำสะเทินบก', hint: 'ผิวขรุขระมีตุ่ม คลานและกระโดดสั้น ๆ แตะแล้วพองตัวให้ดูใหญ่', kw: 'คางคกบ้าน ต่อมพิษ สัตว์ครึ่งบกครึ่งน้ำ', go: 'hop', spd: 0.3, fast: 0.6, hopLen: 0.07, hopH: 0.03, hopT: 0.4, hopRest: 0.7, jumpLen: 0.12, jumpH: 0.04, turn: 2.5, roam: 0.15, R: 0.28, tz: 0.06, react: 'puff',
  loop: [['go', 3.5], ['rest', 3], ['go', 3], ['look', 2]], acts: { go: 'กระโดดสั้น ๆ', rest: 'นั่งนิ่ง', look: 'มองหาแมลง', puff: 'พองตัวให้ดูใหญ่' }, C: { b: '#8C6E48', b2: '#D8C8A4', d: '#5E4630', v: '#C8B48A' },
  Q: { k: 1.05, warts: true, eye: '#5A3A10' }, draw: anFrog, sh: [0.12, 0.08] });
/* ----- worm-shaped: the body follows where the head went. The earthworm crawls by waves of stretching and
   shortening, the caecilian (งูดิน, an amphibian without legs) by side to side bends; both go down into the soil
   and come up somewhere else. Touched, they shorten and dig in at once ----- */
function anDig(D, s, dt, sp) {
  const W = s.fx;
  if (!W.dig) { W.dig = { ph: 0 }; s.h = Math.atan2(-s.y, -s.x) + (anRng(s) - 0.5) * 1.2; }
  const g = W.dig, L = D.L;
  /* near the edge of its patch it bends back towards the middle (under the soil too) */
  if (Math.hypot(s.x, s.y) > D.roam) s.h = anAng(s.h + anCl(anAng(Math.atan2(-s.y, -s.x) - s.h), -2.5 * dt, 2.5 * dt));
  if (g.ph === 0) { /* head goes down, the body slides into the hole after it */
    if (!W.holeA) W.holeA = [s.x, s.y];
    s.v = sp; s.x += Math.cos(s.h) * sp * 0.55 * dt; s.y += Math.sin(s.h) * sp * 0.55 * dt; s.z = Math.max(-L - 0.1, s.z - sp * dt * 1.4);
    const tail = anAlong(s, L); if (tail[2] < -0.02 && s.z <= -L * 0.6) { g.ph = 1; g.t = 0; }
  } else if (g.ph === 1) { /* under the soil for a moment, then somewhere else */
    s.hidden = true; g.t += dt; s.v = 0;
    if (g.t > 0.8) { const p = anTarget(D, s); s.h = Math.atan2(-p[1], -p[0]) + (anRng(s) - 0.5) * 1.4; s.x = p[0] - Math.cos(s.h) * 0.12; s.y = p[1] - Math.sin(s.h) * 0.12; s.z = -0.12; W.holeA = null; W.holeB = [s.x + Math.cos(s.h) * 0.12, s.y + Math.sin(s.h) * 0.12]; s.trail = []; for (let i = 0; i < 60; i++) s.trail.push([s.x - Math.cos(s.h) * i * 0.01, s.y - Math.sin(s.h) * i * 0.01, -0.12 - i * 0.012]); s.hidden = false; g.ph = 2; }
  } else { /* comes up head first */
    s.v = sp; s.x += Math.cos(s.h) * sp * dt; s.y += Math.sin(s.h) * sp * dt; s.z = Math.min(0, s.z + sp * dt * 1.2);
    if (s.z >= 0) { const tail = anAlong(s, L); if (tail[2] >= -0.01) { W.dig = null; W.holeB = null; return true; } }
  }
  return false;
}
function anWormTick(s, dt, act) {
  const D = AN[s.kind];
  if (act === 'dig') { if (anDig(D, s, dt, D.spd * 1.3)) anNext(D, s); return true; }
  if (act === 'go') {
    if (!s.tg) s.tg = anTarget(D, s);
    const pulse = D.worm ? Math.max(0, Math.sin(s.t * 3.2)) * 2 : 1;
    const done = anMove(D, s, dt, s.tg, D.spd * pulse); if (D.wiggle) s.h += Math.cos(s.t * 4.5) * D.wiggle * dt;
    if (done || s.aT > D.loop[s.si][1]) anNext(D, s);
    return true;
  }
  return false;
}
function anWorm(b, s, C, D) {
  /* drawn in the world: the trail is there already; this frame is the worm's own, so undo it */
  b.pop(); b.push([0, 0, 0]);
  const L = D.L * (1 - 0.35 * (s.rx ? s.rk : 0)), n = 22, pts = [];
  for (let i = 0; i <= n; i++) { let d = L * i / n; if (D.worm) d *= 1 + 0.06 * Math.sin(i / n * 9 - s.t * 3.2); const p = anAlong(s, d); pts.push(p); }
  const R0 = D.r * (1 + 0.3 * (s.rx ? s.rk : 0));
  b.tube(pts, (t) => { const pk = D.worm ? 1 + 0.18 * Math.sin(t * 9 - s.t * 3.2 + 1.6) : 1; const r = R0 * pk * (t < 0.06 ? 0.55 + 7 * t : t > 0.85 ? 1 - (t - 0.85) * 3.2 : 1); return [r, r * 0.92]; },
    (t) => (D.worm && t > 0.24 && t < 0.33 ? C.c : Math.sin(t * D.rings) > 0.55 ? C.d : C.b), { sides: 8 });
  if (!D.worm) { const h = pts[0], h1 = pts[1], f = anUnit(anSub(h, h1)), sd = anUnit(anCross([0, 0, 1], f)); b.eye(anAdd(anAdd(h, anMul(f, -0.004)), anAdd(anMul(sd, R0 * 0.62), [0, 0, R0 * 0.45])), 0.0045, sd); b.eye(anAdd(anAdd(h, anMul(f, -0.004)), anAdd(anMul(sd, -R0 * 0.62), [0, 0, R0 * 0.45])), 0.0045, anMul(sd, -1)); }
}
const anSoil = (c, P, s, C, D) => {
  anPatch(c, P, 0, 0, D.R * 0.95, D.R * 0.72, 'rgba(150,112,72,0.42)', 'rgba(110,80,50,0.5)', 'rgba(90,64,40,0.6)');
  for (const h of [s.fx.holeA, s.fx.holeB]) if (h) anPatch(c, P, h[0], h[1], 0.03, 0.022, 'rgba(40,28,18,0.85)', null, null);
};
anDef('worm', { th: 'ไส้เดือน', en: 'earthworm', grp: 'หนอนปล้อง (แอนเนลิด)', hint: 'ไส้เดือนดิน คืบไปด้วยการยืดหดลำตัว มุดลงดินแล้วโผล่ที่ใหม่ แตะแล้วหดตัวมุดดินทันที', kw: 'ไส้เดือนดิน ปล้อง ดิน สัตว์ไม่มีกระดูกสันหลัง', go: 'walk', worm: true, L: 0.34, r: 0.013, rings: 140, spd: 0.045, fast: 0.08, stride: 0.1, turn: 0.9, roam: 0.15, R: 0.3, tz: 0.0, react: 'burrow', clip: true,
  loop: [['go', 8], ['dig', 30], ['go', 6]], acts: { go: 'คืบด้วยการยืดหดลำตัว', dig: 'มุดลงดิน', burrow: 'หดตัว มุดดินหนี' }, C: { b: '#C27C70', d: '#A8645A', c: '#D9A090' },
  start: (s) => { s.kind = 'worm'; s.trail = []; for (let i = 0; i < 80; i++) s.trail.push([-i * 0.01 * Math.cos(0.5), -i * 0.01 * Math.sin(0.5), 0]); }, tick: anWormTick, draw: anWorm, ground: anSoil,
  rxTick: (s, dt, R) => { if (R.t > 0.6) { if (anDig(AN.worm, s, dt, 0.16)) R.t = R.T; else R.t = Math.min(R.t, R.T - 0.05); } } });
anDef('caecilian', { th: 'งูดิน', en: 'caecilian', grp: 'สัตว์สะเทินน้ำสะเทินบก', hint: 'ไม่ใช่งู ไม่มีขา ผิวลื่นเป็นวงปล้อง เลื้อยส่ายตัวแล้วมุดลงดิน แตะแล้วรีบมุดดินหนี', kw: 'เขียดงู สัตว์ครึ่งบกครึ่งน้ำไม่มีขา ดิน', go: 'walk', L: 0.42, r: 0.016, rings: 260, wiggle: 2.2, spd: 0.09, fast: 0.15, stride: 0.1, turn: 1.4, roam: 0.15, R: 0.34, tz: 0.0, react: 'burrow', clip: true,
  loop: [['go', 7], ['dig', 30], ['go', 5]], acts: { go: 'เลื้อยส่ายตัว', dig: 'มุดลงดิน', burrow: 'รีบมุดดินหนี' }, C: { b: '#4C5062', d: '#3A3E4C' },
  start: (s) => { s.kind = 'caecilian'; s.trail = []; for (let i = 0; i < 80; i++) s.trail.push([-i * 0.01, Math.sin(i * 0.15) * 0.02, 0]); }, tick: anWormTick, draw: anWorm, ground: anSoil,
  rxTick: (s, dt, R) => { if (R.t > 0.4) { if (anDig(AN.caecilian, s, dt, 0.22)) R.t = R.T; else R.t = Math.min(R.t, R.T - 0.05); } } });
/* ----- lizards: a body that bends side to side as the legs step in diagonal pairs; they stop and go. Touched, the
   house lizard darts off; the tokay gecko opens its mouth wide at you first ----- */
function anLizard(b, s, C, D) {
  const Q = D.Q, k = Q.k, mv = Math.min(1.6, s.mv), wv = s.ph, n = 14, pts = [];
  const gape = s.rx && s.rx.k === 'threat' && s.rx.t < 1.2 ? s.rk : 0;
  for (let i = 0; i <= n; i++) { const u = i / n, x = (0.13 - 0.55 * u) * k, amp = (0.012 + 0.05 * u * u) * k * (0.4 + 0.6 * Math.min(1, mv)); pts.push([x, amp * Math.sin(u * 5 - wv) + (Q.curl ? 0.02 * Math.sin(s.t * 0.7) * u : 0), 0.025 * k * (1 - u * 0.7)]); }
  const prof = (t) => { const r = (t < 0.12 ? 0.022 + 0.06 * t : t < 0.38 ? 0.03 : 0.03 * (1 - (t - 0.38) / 0.62 * 0.92)) * k; return [r, r * 0.62]; };
  b.tube(pts, prof, (t, a) => (Math.sin(a) < -0.3 ? C.b2 : (Q.spot && Math.sin(t * 60) * Math.cos(a * 3) > 0.55 ? C.s : (Q.band && Math.sin(t * 45) > 0.75 && t > 0.4 ? C.d : C.b))), { sides: 8 });
  const H = pts[0], f = anUnit(anSub(pts[0], pts[2])), yaw = Math.atan2(f[1], f[0]);
  b.push(anAdd(H, [f[0] * 0.03 * k, f[1] * 0.03 * k, 0.003 * k]), anMs(anRz(yaw), anRy(s.act === 'look' ? -0.25 : 0)));
  b.ell([0.01 * k, 0, 0], [0.045 * k, 0.026 * k, 0.017 * k], null, C.b, { n1: 7, n2: 9 });
  b.push([-0.01 * k, 0, -0.008 * k], anRy(0.65 * gape)); b.ell([0.035 * k, 0, -0.003 * k], [0.035 * k, 0.022 * k, 0.007 * k], null, C.b2, { n1: 6, n2: 8 }); b.pop();
  if (gape > 0.2) b.ell([0.02 * k, 0, -0.008 * k], [0.03 * k, 0.018 * k, 0.006 * k], null, '#C84A4A', { n1: 5, n2: 7 });
  for (const sd of [1, -1]) b.eye([0.015 * k, sd * 0.022 * k, 0.008 * k], 0.008 * k, [0.2, sd, 0.4], Q.eye);
  if (s.act === 'lick' && Math.sin(s.aT * 5) > 0.6) b.line([[0.05 * k, 0, -0.003 * k], [0.075 * k, 0, 0.002 * k], [0.03 * k, 0.02 * k, 0.01 * k]], '#D86A7A', 0.004 * k);
  b.pop();
  /* legs out to the sides, elbows up, the feet in diagonal pairs */
  for (const [ix, front] of [[3, 1], [7, 0]]) for (const sd of [1, -1]) {
    const Hp = anAdd(pts[ix], [0, sd * 0.02 * k, -0.005 * k]), p = s.ph + (front ? 0 : Math.PI) + (sd > 0 ? 0 : Math.PI);
    const F = [Hp[0] + (front ? 0.035 : -0.035) * k + 0.04 * k * Math.sin(p) * Math.min(1, mv), Hp[1] + sd * 0.06 * k, 0.018 * k * Math.max(0, Math.cos(p)) * Math.min(1, mv)];
    const K = anIK(Hp, F, 0.04 * k, 0.04 * k, [front ? -0.3 : 0.3, sd * 0.2, 1]); b.tube([Hp, K, F], (t) => 0.009 * k * (1 - 0.4 * t), C.b, { sides: 5 });
    for (const a of [-0.8, -0.3, 0.2, 0.7]) { const e = anAdd(F, [Math.cos(a + (front ? 0 : 3.14) * 0) * 0.02 * k * (front ? 1 : 1), sd * Math.abs(Math.sin(a)) * 0.02 * k + sd * 0.004, 0]); b.line([F, e], C.b, 0.0035 * k); if (Q.pads) b.ball(e, 0.0045 * k, C.b2); }
  }
}
anDef('houselizard', { th: 'จิ้งจก', en: 'house gecko', grp: 'สัตว์เลื้อยคลาน', hint: 'วิ่งเป็นช่วง ๆ หยุดผงกหัว แลบลิ้น แตะแล้ววิ่งพรวดหนี', kw: 'จิ้งจกบ้าน สัตว์เลื้อยคลาน', go: 'walk', spd: 0.35, fast: 0.9, stride: 0.09, turn: 6, acc: 6, roam: 0.15, R: 0.26, tz: 0.02, react: 'dart', fleeLen: 0.5,
  loop: [['go', 1.1], ['look', 1.6], ['go', 0.9], ['lick', 1.4], ['go', 1.2], ['rest', 2]], acts: { go: 'วิ่งเป็นช่วง ๆ', look: 'หยุดผงกหัว', lick: 'แลบลิ้น', rest: 'หยุดนิ่ง', dart: 'วิ่งพรวดหนี' }, C: { b: '#D6C2A0', b2: '#EEE4D2', d: '#B49C78' },
  Q: { k: 0.8, band: true, eye: '#2A2418' }, draw: anLizard, sh: [0.14, 0.05] });
anDef('gecko', { th: 'ตุ๊กแก', en: 'tokay gecko', grp: 'สัตว์เลื้อยคลาน', hint: 'ตัวสีเทาฟ้ามีจุดส้ม นิ้วมีแผ่นยึดเกาะ เลียตา แตะแล้วอ้าปากกว้างขู่ แล้ววิ่งหนี', kw: 'ตุ๊กแกบ้าน สัตว์เลื้อยคลาน', go: 'walk', spd: 0.2, fast: 0.6, stride: 0.12, turn: 4, acc: 4, roam: 0.15, R: 0.32, tz: 0.03, react: 'threat', fleeLen: 0.45,
  loop: [['go', 1.5], ['lick', 1.6], ['rest', 2.4], ['go', 1.4], ['look', 1.6]], acts: { go: 'คลาน', lick: 'แลบลิ้นเลียตา', rest: 'เกาะนิ่ง', look: 'ผงกหัวมอง', threat: 'อ้าปากกว้างขู่ แล้ววิ่งหนี' }, C: { b: '#7C8CA4', b2: '#C8CEDA', s: '#E07A3A', d: '#5A6680' },
  Q: { k: 1.1, spot: true, pads: true, eye: '#8A7A2A' }, draw: anLizard, sh: [0.2, 0.07] });
/* ----- a turtle: a domed shell, slow steps; touched, it pulls its head and legs into the shell ----- */
function anTurtle(b, s, C, D) {
  const hide = s.rx && s.rx.k === 'hide' ? s.rk : 0, ext = 1 - hide, mv = Math.min(1, s.mv), z0 = 0.045 + 0.012 * ext;
  b.ell([0, 0, z0], [0.17, 0.13, 0.085], null, (u) => (u[2] < -0.1 ? C.b2 : (Math.sin(u[0] * 9) * Math.sin(u[1] * 9) > 0.55 || Math.abs(Math.sin(u[0] * 9)) < 0.12 || Math.abs(Math.sin(u[1] * 9)) < 0.12 ? C.d : C.s)), { n1: 12, n2: 14, def: (u) => [0, 0, u[2] < 0 ? -u[2] * 0.06 : 0] });
  b.ell([0, 0, z0 - 0.005], [0.165, 0.125, 0.018], null, C.b2, { n1: 8, n2: 12 });
  const look = s.act === 'look' ? Math.sin(s.aT * 1.5) * 0.5 : 0, N0 = [0.14, 0, z0 + 0.01], Hh = anAdd(N0, anMv(anRz(look), [0.03 + 0.07 * ext, 0, 0.01 + 0.015 * ext]));
  b.tube([N0, Hh], 0.026 * (0.6 + 0.4 * ext), C.b, { sides: 7 });
  b.push(Hh, anRz(look)); b.ell([0.025, 0, 0.005], [0.04, 0.03, 0.026], null, C.b, { n1: 7, n2: 9 });
  if (ext > 0.3) { b.eye([0.035, 0.022, 0.014], 0.007, [0.3, 1, 0.3]); b.eye([0.035, -0.022, 0.014], 0.007, [0.3, -1, 0.3]); }
  b.pop();
  for (const [x0, sd, off] of [[0.09, 1, 0], [0.09, -1, 1], [-0.09, 1, 1], [-0.09, -1, 0]]) {
    const p = s.ph + off * Math.PI, Hp = [x0, sd * 0.1, z0], F = [x0 + (x0 > 0 ? 0.02 : -0.02) + 0.03 * Math.sin(p) * mv, sd * (0.1 + 0.06 * ext), 0.015 * Math.max(0, Math.cos(p)) * mv];
    const Fi = anLerp(Hp, F, ext); b.tube([Hp, Fi], (t) => 0.026 * (1 - 0.3 * t), C.b, { sides: 6 });
  }
  b.tube([[-0.15, 0, z0], [-0.15 - 0.04 * ext, 0, z0 - 0.02]], (t) => 0.014 * (1 - 0.8 * t), C.b, { sides: 5 });
}
anDef('turtle', { th: 'เต่า', en: 'turtle', grp: 'สัตว์เลื้อยคลาน', hint: 'เดินช้า ๆ ยืดคอมองรอบตัว แตะแล้วหดหัวและขาเข้ากระดอง แล้วค่อย ๆ ยื่นออกมา', kw: 'เต่านา เต่าบก กระดอง สัตว์เลื้อยคลาน', go: 'walk', spd: 0.04, fast: 0.04, stride: 0.1, turn: 0.8, acc: 0.4, brake: 0.06, roam: 0.15, R: 0.36, tz: 0.06, react: 'hide',
  loop: [['go', 7], ['look', 3.5], ['go', 6], ['rest', 3]], acts: { go: 'เดินช้า ๆ', look: 'ยืดคอมองรอบตัว', rest: 'หยุดพัก', hide: 'หดหัวและขาเข้ากระดอง' }, C: { b: '#8C8C62', b2: '#D8CC9C', s: '#6E6A40', d: '#4A4628' },
  draw: anTurtle, props: (b) => { anGrass(b, 0.3, -0.22, 0.8); anGrass(b, -0.28, 0.24, 0.7); }, sh: [0.2, 0.16] });

/* ----- insects: head, thorax and abdomen, six legs stepping in two sets of three, feelers, wings that beat when it
   flies. The butterfly and the bee go to flowers and drink; the ant walks and feels the way; the grasshopper hops ----- */
function anInsect(b, s, C, D) {
  const Q = D.Q, k = Q.k, fly = D.go === 'fly' ? !s.perched && s.z > Q.zb * 1.6 : (s.hop ? s.hop.H > 0.1 : false);
  const mv = Math.min(1.5, s.mv), zb = Q.zb * k;
  b.push([0, 0, fly ? 0 : zb], anRy(fly ? (Q.fp || 0.1) : (Q.bp || 0)));
  /* abdomen, thorax, head */
  const ab = Q.ab, abp = (Q.abUp || 0) + (s.rx && s.rx.k === 'flee' && Q.raise ? -0.6 * s.rk : 0) + (D.id === 'mosquito' && !fly ? -0.25 : 0);
  b.push([-Q.th[0] * 0.8 * k, 0, 0], anRy(abp));
  b.ell([-ab[0] * k, 0, 0], [ab[0] * k, ab[1] * k, ab[2] * k], null, Q.stripes ? (u) => (Math.sin((u[0] + 1) * Q.stripes) > 0.2 ? C.s : C.b) : C.b, { n1: Q.n1 || 9, n2: 9 });
  if (Q.sting) b.tube([[-ab[0] * 2 * k, 0, 0], [-ab[0] * 2 * k - 0.012 * k, 0, -0.002]], (t) => 0.003 * k * (1 - t), '#2A2420', { sides: 4 });
  b.pop();
  if (Q.waist) b.ball([-Q.th[0] * 0.9 * k, 0, 0.002], Q.waist * k, C.b);
  b.ell([0, 0, 0], [Q.th[0] * k, Q.th[1] * k, Q.th[2] * k], null, C.t || C.b, { n1: 7, n2: 9 });
  b.push([Q.th[0] * k + Q.hd[0] * 0.8 * k, 0, Q.hd[2] * 0.3 * k], anRy(Q.hdp || 0.3));
  b.ell([0, 0, 0], [Q.hd[0] * k, Q.hd[1] * k, Q.hd[2] * k], null, C.h || C.b, { n1: 6, n2: 8 });
  for (const sd of [1, -1]) {
    b.eye([Q.hd[0] * 0.3 * k, sd * Q.hd[1] * 0.75 * k, Q.hd[2] * 0.25 * k], (Q.eye || 0.4) * Q.hd[1] * k, [0.4, sd, 0.3], C.e);
    const tap = Math.sin(s.t * (Q.tap || 3) + sd * 1.3) * 0.25, an = Q.ant * k;
    if (an > 0) b.line([[Q.hd[0] * 0.6 * k, sd * Q.hd[1] * 0.4 * k, Q.hd[2] * 0.5 * k], [Q.hd[0] * k + an * 0.45, sd * (an * 0.25 + tap * an * 0.3), Q.hd[2] * k + an * 0.4], [Q.hd[0] * k + an * 0.8, sd * (an * 0.42 + tap * an * 0.5), Q.hd[2] * k + an * (Q.antUp || 0.25)]], C.a || C.b, 0.0035 * k);
    if (Q.club && an > 0) b.ball([Q.hd[0] * k + an * 0.8, sd * (an * 0.42 + tap * an * 0.5), Q.hd[2] * k + an * (Q.antUp || 0.25)], 0.006 * k, C.a || C.b);
  }
  /* the butterfly's tongue uncoils into the flower while it drinks; the mosquito's stays straight */
  if (Q.tongue) { const sip = s.perched ? 1 : 0; if (sip) b.line([[Q.hd[0] * k, 0, -Q.hd[2] * 0.4 * k], [Q.hd[0] * k + 0.01 * k, 0, -Q.hd[2] * k - 0.025 * k]], '#3A2A20', 0.003 * k); else b.line([[Q.hd[0] * k, 0, -Q.hd[2] * 0.5 * k], [Q.hd[0] * k + 0.008 * k, 0, -Q.hd[2] * 0.9 * k], [Q.hd[0] * k + 0.003 * k, 0, -Q.hd[2] * 1.05 * k]], '#3A2A20', 0.003 * k); }
  if (Q.beak) b.line([[Q.hd[0] * k, 0, -Q.hd[2] * 0.3 * k], [Q.hd[0] * k + Q.beak * k, 0, -Q.hd[2] * k - Q.beak * 0.6 * k]], C.a || '#2A2420', 0.003 * k);
  if (Q.jaw) for (const sd of [1, -1]) b.line([[Q.hd[0] * 0.9 * k, sd * 0.004 * k, -0.004 * k], [Q.hd[0] * 1.5 * k, sd * 0.001 * k, -0.006 * k]], C.d || '#2A2420', 0.003 * k);
  b.pop();
  /* wings */
  if (Q.wings) Q.wings(b, s, C, D, fly);
  b.pop();
  /* six legs: on the ground in two sets of three, or hanging under it in the air */
  for (let i = 0; i < 3; i++) for (const sd of [1, -1]) {
    const set = (i % 2 === 0) === (sd > 0) ? 0 : Math.PI, p = s.ph + set, hx = (Q.th[0] * (0.5 - i * 0.5)) * k, Hp = [hx, sd * Q.th[1] * 0.6 * k, (fly ? 0 : zb) - Q.th[2] * 0.4 * k];
    const sp = Q.leg * k, fx = hx + [0.9, 0.05, -0.9][i] * sp * 0.6, big = Q.hind && i === 2;
    let F = [fx + 0.25 * sp * Math.sin(p) * Math.min(1, mv), sd * sp * (big ? 0.55 : 0.85), 0.25 * sp * Math.max(0, Math.cos(p)) * Math.min(1, mv)];
    if (fly) F = [hx - 0.15 * sp - (i === 2 ? 0.25 * sp : 0), sd * sp * 0.35, Hp[2] - sp * 0.7];
    if (big) { const fold = s.hop ? Math.sin(Math.PI * s.hop.u) : 0, kn = [hx - 0.035 * k - 0.08 * k * fold, sd * 0.03 * k, zb + 0.03 * k - 0.05 * k * fold], ft = [hx + (fold ? -0.1 : 0.01) * k, sd * 0.032 * k, fly ? zb - 0.06 * k : 0]; b.tube([Hp, kn], (t) => 0.007 * k * (1 - 0.4 * t), C.l || C.b, { sides: 5 }); b.line([kn, ft], C.l || C.b, 0.004 * k); continue; }
    const K = anIK(Hp, F, sp * 0.6, sp * 0.72, [0, sd * 0.3, 1]);
    b.line([Hp, K, F], C.l || C.d || '#2A2420', (Q.legw || 0.004) * k);
  }
}
const anWingPair = (shapeF, shapeH, col, o) => (b, s, C, D, fly) => {
  const Q = D.Q, k = Q.k, fl = fly ? Math.sin(s.t * Q.flap * 6.283) : 0;
  const rest = s.perched || !fly ? (o.restA != null ? o.restA + (o.breath ? 0.25 * Math.sin(s.t * 1.2) : 0) : 0.15) : 0;
  for (const sd of [1, -1]) for (const [shape, x0, lag] of [[shapeF, o.fx || 0, 0], [shapeH, o.hx || -0.01, 0.4]]) {
    if (!shape) continue;
    const a = fly ? (o.amp || 0.9) * Math.sin(s.t * Q.flap * 6.283 - lag) + (o.mid || 0.2) : rest;
    b.push([x0 * k, sd * Q.th[1] * 0.5 * k, Q.th[2] * 0.6 * k], anMs(anRx(sd * a), o.sweep ? anRz(sd * o.sweep * (fly ? 0 : 1)) : AN_I));
    b.sheet(shape.map((q) => [q[0] * k, sd * q[1] * k, q[2] * k]), typeof col === 'function' ? col(C) : col, { ec: o.ec ? o.ec(C) : null, stroke: o.stroke });
    if (o.spots) for (const q of o.spots) b.ball([q[0] * k, sd * q[1] * k, 0.0015 * k], q[2] * k, q[3] || '#F4EEE0');
    b.pop();
  }
  void fl;
};
const AN_FLOWERS = [[0.16, -0.12, 0.16, '#E85A8A'], [-0.18, 0.14, 0.13, '#F2D24A']];
const anFlowers = (b) => { for (const f of AN_FLOWERS) anFlower(b, f, f[3], 0.9); };
anDef('butterfly', { th: 'ผีเสื้อ', en: 'butterfly', grp: 'แมลง', hint: 'บินกระพือปีกไปเกาะดอกไม้ ยื่นงวงดูดน้ำหวาน แตะแล้วบินหนีขึ้นสูง', kw: 'แมลง ปีก งวง น้ำหวาน ผสมเกสร', go: 'fly', spd: 0.16, fast: 0.4, stride: 0.2, flap: 0, turn: 3, acc: 1.2, roam: 0.17, zLo: 0.18, zHi: 0.32, z0: 0.24, R: 0.27, tz: 0.12, react: 'flyoff', near: 0.02,
  loop: [['fly', 4.5], ['land', 6], ['fly', 4], ['land', 5]], acts: { fly: 'บินกระพือปีก', land: 'เกาะดอกไม้ ดูดน้ำหวาน', flyoff: 'บินหนีขึ้นสูง' }, C: { b: '#3A3430', w: '#EC8A2E', a: '#2A2420', e: '#1E1A18' },
  perch: (s) => { const f = AN_FLOWERS[s.fi || 0]; return [f[0], f[1], f[2] + 0.03]; }, enter: (s, act) => { if (act === 'land') s.fi = (s.fi || 0) ? 0 : 1; },
  Q: { k: 1.5, zb: 0.012, th: [0.018, 0.009, 0.01], ab: [0.022, 0.007, 0.008], hd: [0.008, 0.008, 0.008], ant: 0.045, club: true, antUp: 0.5, leg: 0.02, flap: 3.2, tongue: true, fp: 0, eye: 0.5,
    wings: anWingPair([[0.005, 0, 0], [0.05, 0.03, 0.002], [0.035, 0.075, 0.003], [0.0, 0.07, 0.002], [-0.01, 0.02, 0]], [[-0.005, 0, 0], [-0.005, 0.055, 0.001], [-0.035, 0.05, 0.001], [-0.045, 0.02, 0]], (C) => C.w, { restA: 1.25, breath: true, amp: 1.1, mid: 0.5, ec: () => 'rgba(30,26,24,0.95)', spots: [[0.035, 0.06, 0.006], [0.02, 0.066, 0.005]] }) },
  draw: anInsect, props: anFlowers, sh: [0.03, 0.02] });
anDef('bee', { th: 'ผึ้ง', en: 'honey bee', grp: 'แมลง', hint: 'บินหึ่งไปมาระหว่างดอกไม้ เก็บน้ำหวานและเกสร แตะแล้วบินวนหนี', kw: 'ผึ้งพันธุ์ แมลง ผสมเกสร น้ำผึ้ง', go: 'fly', spd: 0.22, fast: 0.6, stride: 0.2, flap: 0, turn: 5, acc: 2.5, roam: 0.17, zLo: 0.18, zHi: 0.3, z0: 0.24, R: 0.27, tz: 0.12, react: 'flyoff', near: 0.02,
  loop: [['fly', 2.4], ['land', 4], ['fly', 2.4], ['land', 4]], acts: { fly: 'บินหึ่งหาดอกไม้', land: 'เก็บน้ำหวานและเกสร', flyoff: 'บินวนหนี' }, C: { b: '#3A2E22', s: '#E8B43A', t: '#B88A4A', a: '#2A2420', e: '#1E1A18', l: '#3A2E22' },
  perch: (s) => { const f = AN_FLOWERS[s.fi || 0]; return [f[0], f[1], f[2] + 0.045]; }, enter: (s, act) => { if (act === 'land') s.fi = (s.fi || 0) ? 0 : 1; },
  Q: { k: 2.0, zb: 0.016, th: [0.014, 0.012, 0.012], ab: [0.02, 0.013, 0.013], stripes: 9, sting: true, hd: [0.008, 0.01, 0.009], ant: 0.022, antUp: 0.35, leg: 0.022, flap: 30, eye: 0.45,
    wings: anWingPair([[0, 0, 0], [0.005, 0.03, 0.004], [-0.022, 0.034, 0.004], [-0.02, 0.008, 0]], [[-0.005, 0, 0], [-0.012, 0.02, 0.002], [-0.028, 0.016, 0.002]], 'rgba(220,232,240,0.55)', { restA: 0.15, amp: 0.8, mid: 0.4, sweep: 0.5, stroke: 'rgba(120,130,140,0.5)' }) },
  draw: anInsect, props: anFlowers, sh: [0.03, 0.02] });
anDef('ant', { th: 'มด', en: 'ant', grp: 'แมลง', hint: 'เดินเป็นทาง ใช้หนวดคลำทางและแตะพื้น แตะแล้ววิ่งพล่านหนี', kw: 'มดแดง มดดำ แมลงสังคม', go: 'walk', spd: 0.11, fast: 0.35, stride: 0.075, turn: 4, acc: 3, roam: 0.1, R: 0.16, tz: 0.02, react: 'flee', fleeLen: 0.2,
  loop: [['go', 3], ['look', 1.6], ['go', 2.5], ['go', 2], ['look', 1.2]], acts: { go: 'เดินหาอาหาร', look: 'ใช้หนวดคลำทาง', flee: 'วิ่งพล่านหนี' }, C: { b: '#7A2E1E', a: '#5A2216', e: '#1E1612', d: '#5A2216' },
  Q: { k: 2.2, zb: 0.008, th: [0.009, 0.0045, 0.005], ab: [0.012, 0.008, 0.008], hd: [0.007, 0.0065, 0.006], hdp: 0.15, waist: 0.0028, ant: 0.018, antUp: 0.15, tap: 6, leg: 0.012, legw: 0.0018, abUp: 0.15, raise: true, jaw: true, eye: 0.3 },
  draw: anInsect, sh: [0.04, 0.018] });
anDef('mosquito', { th: 'ยุง', en: 'mosquito', grp: 'แมลง', hint: 'ยุงลาย บินวนเสียงหวี่ ลงเกาะแล้วยกขาหลัง แตะแล้วบินหนี', kw: 'ยุงลาย ไข้เลือดออก แมลง ลูกน้ำ', go: 'fly', spd: 0.14, fast: 0.5, stride: 0.2, turn: 5, acc: 3, roam: 0.13, zLo: 0.08, zHi: 0.2, z0: 0.14, R: 0.2, tz: 0.07, react: 'flyoff', near: 0.02,
  loop: [['fly', 4], ['land', 3.5], ['fly', 3.5]], acts: { fly: 'บินวน', land: 'ลงเกาะ ยกขาหลัง', flyoff: 'บินหนี' }, C: { b: '#2E2E34', t: '#3A3A40', a: '#2A2A30', e: '#1A1A1E', l: '#2E2E34' },
  perch: (s) => { if (!s.pp) { const p = anTarget(AN.mosquito, s); s.pp = [p[0] * 0.7, p[1] * 0.7, 0.054]; } return s.pp; }, enter: (s) => { s.pp = null; },
  Q: { k: 2.4, zb: 0.022, th: [0.009, 0.0055, 0.0065], ab: [0.02, 0.005, 0.005], stripes: 14, hd: [0.004, 0.004, 0.004], hdp: 0.6, ant: 0.012, antUp: 0.2, leg: 0.028, legw: 0.0018, flap: 40, beak: 0.016, bp: -0.1, n1: 11, eye: 0.6,
    wings: anWingPair([[0, 0, 0], [-0.005, 0.012, 0.002], [-0.026, 0.012, 0.002], [-0.024, 0.004, 0]], null, 'rgba(200,210,220,0.5)', { restA: 0.05, amp: 0.7, mid: 0.3, sweep: 0.15, stroke: 'rgba(110,120,130,0.5)' }) },
  draw: anInsect, sh: [0.045, 0.025] });
/* white bands on the black legs of a striped mosquito */
AN.mosquito.C.s = '#E8E8E8';
anDef('dragonfly', { th: 'แมลงปอ', en: 'dragonfly', grp: 'แมลง', hint: 'บินโฉบไปมาแล้วหยุดลอยนิ่งกลางอากาศ เกาะปลายกิ่งไม้ แตะแล้วพุ่งหนี', kw: 'แมลงปอบ้าน แมลง ล่าแมลง', go: 'fly', spd: 0.3, fast: 0.9, stride: 0.2, turn: 6, acc: 4, roam: 0.2, zLo: 0.16, zHi: 0.3, z0: 0.24, R: 0.3, tz: 0.14, react: 'flyoff', near: 0.02,
  loop: [['fly', 1.6], ['hover', 1.2], ['fly', 1.4], ['land', 5]], acts: { fly: 'บินโฉบ', hover: 'ลอยนิ่งกลางอากาศ', land: 'เกาะปลายกิ่งไม้', flyoff: 'พุ่งหนี' }, C: { b: '#2E6E8E', t: '#3E7A5A', a: '#2A2420', e: '#3A5A4A', l: '#2A2420' },
  perch: () => [-0.12, 0.08, 0.245], tick: (s, dt, act) => { if (act === 'hover') { s.v *= Math.max(0, 1 - 6 * dt); s.x += Math.cos(s.h) * s.v * dt; s.y += Math.sin(s.h) * s.v * dt; s.perched = false; if (s.aT >= 1.2) anNext(AN.dragonfly, s); return true; } return false; },
  Q: { k: 1.8, zb: 0.012, th: [0.014, 0.008, 0.009], ab: [0.05, 0.0045, 0.0045], stripes: 22, hd: [0.008, 0.011, 0.009], hdp: 0.1, eye: 0.75, ant: 0.004, leg: 0.014, legw: 0.0018, flap: 18, fp: 0, n1: 12,
    wings: anWingPair([[0.004, 0, 0], [0.006, 0.07, 0.001], [-0.006, 0.075, 0.001], [-0.008, 0, 0]], [[-0.01, 0, 0], [-0.008, 0.066, 0.001], [-0.024, 0.07, 0.001], [-0.024, 0, 0]], 'rgba(210,228,236,0.45)', { fx: 0.004, hx: -0.012, restA: 0.02, amp: 0.35, mid: 0.1, stroke: 'rgba(90,110,120,0.55)' }) },
  draw: anInsect, props: (b) => { b.tube([[-0.13, 0.07, 0], [-0.125, 0.075, 0.12], [-0.12, 0.08, 0.22]], (t) => 0.007 * (1 - 0.5 * t), '#7A5A3A', { sides: 5 }); anGrass(b, 0.2, -0.15, 0.8); }, sh: [0.09, 0.05] });
anDef('grasshopper', { th: 'ตั๊กแตน', en: 'grasshopper', grp: 'แมลง', hint: 'เกาะกินใบหญ้า ขาหลังใหญ่ กระโดดไปมา แตะแล้วดีดตัวกระโดดไกลหนี', kw: 'ตั๊กแตนข้าว แมลง ขาหลัง', go: 'hop', spd: 0.4, fast: 1, hopLen: 0.1, hopH: 0.05, hopT: 0.35, hopRest: 0.4, jumpLen: 0.3, jumpH: 0.16, turn: 4, roam: 0.12, R: 0.2, tz: 0.04, react: 'jump',
  loop: [['eat', 3], ['go', 2], ['rest', 2.5], ['go', 1.5]], acts: { eat: 'กินใบหญ้า', go: 'กระโดด', rest: 'เกาะนิ่ง', jump: 'ดีดตัวกระโดดไกลหนี' }, C: { b: '#7E9A3E', s: '#6A8634', a: '#5A6E2C', e: '#4A3A22', d: '#4E6228', l: '#7E9A3E' },
  Q: { k: 1.6, zb: 0.02, th: [0.016, 0.008, 0.01], ab: [0.026, 0.008, 0.009], hd: [0.009, 0.008, 0.011], hdp: 0.9, ant: 0.026, antUp: 0.3, leg: 0.016, legw: 0.0025, hind: true, eye: 0.45,
    wings: (b, s, C, D, fly) => { const o = s.hop && s.hop.H > 0.1 ? Math.sin(Math.PI * s.hop.u) : 0; for (const sd of [1, -1]) { b.push([0.006, sd * 0.004, 0.008], anRx(sd * (0.05 + 1.0 * o))); b.sheet([[0, 0, 0], [-0.045, sd * 0.006, 0.002], [-0.04, sd * (0.012 + 0.03 * o), 0.001]], o > 0.2 ? '#E4A04A' : C.s); b.pop(); } } },
  draw: anInsect, props: (b) => { anGrass(b, 0.06, -0.05, 0.5); anGrass(b, -0.12, 0.1, 0.45); anGrass(b, 0.14, 0.12, 0.4); }, sh: [0.055, 0.02] });
/* ----- a bat hangs upside down under a branch with its wings wrapped round; now and then, or when touched, it
   drops, flies round on its skin wings and comes back to hang ----- */
const AN_BRANCH = [[-0.3, 0.05, 0.56], [0.3, -0.02, 0.58]];
function anBat(b, s, C, D) {
  const hang = s.perched && (s.act === 'hang') && !s.rx, fl = Math.sin(s.t * 7 * 6.283 / 2.2);
  const wrap = hang ? 1 : 0;
  if (hang) b.push([0, 0, 0], anRy(Math.PI / 2)); else b.push([0, 0, 0], anRy(0.15));
  b.ell([0, 0, 0], [0.045, 0.026, 0.026], null, C.b, { n1: 8, n2: 9 });
  b.ell([0.05, 0, 0.004], [0.022, 0.02, 0.019], null, C.b, { n1: 6, n2: 8 });
  for (const sd of [1, -1]) { b.sheet([[0.045, sd * 0.008, 0.016], [0.05, sd * 0.02, 0.05], [0.038, sd * 0.02, 0.018]], C.b); b.eye([0.066, sd * 0.011, 0.008], 0.005, [0.6, sd, 0.2]); }
  b.ell([0.07, 0, 0.0], [0.008, 0.009, 0.007], null, C.w, { n1: 4, n2: 6 });
  for (const sd of [1, -1]) {
    /* the arm and three long fingers hold the skin of the wing; folded tight when it hangs */
    const a = wrap ? 0 : 0.2 + 0.95 * fl, span = wrap ? 0.25 : 1;
    b.push([0.015, sd * 0.02, 0.01], anRx(sd * a));
    const El = [-0.01, sd * 0.06 * span, 0.005], Wr = [0.03, sd * 0.11 * span, 0.0], T1 = [0.0, sd * 0.2 * span, 0], T2 = [-0.05, sd * 0.19 * span, 0], T3 = [-0.08, sd * 0.13 * span, 0], An = [-0.05, sd * 0.02, -0.005];
    b.sheet([[0, 0, 0], El, Wr, T1, T2, T3, An], C.w, { ec: 'rgba(30,26,30,0.9)' });
    b.line([[0, 0, 0], El, Wr], C.b, 0.006); for (const T of [T1, T2, T3]) b.line([Wr, T], C.b, 0.003);
    b.pop();
  }
  b.line([[-0.04, 0.01, 0], [-0.065, 0.012, hang ? 0 : -0.005]], C.b, 0.004); b.line([[-0.04, -0.01, 0], [-0.065, -0.012, hang ? 0 : -0.005]], C.b, 0.004);
  b.pop();
}
anDef('bat', { th: 'ค้างคาว', en: 'bat', grp: 'สัตว์เลี้ยงลูกด้วยน้ำนม', hint: 'ห้อยหัวเกาะกิ่งไม้ ห่อปีกหลับ บางครั้งออกบินวน แตะแล้วปล่อยตัวบินหนี แล้วกลับมาห้อยหัว', kw: 'ค้างคาวกินแมลง ปีกพังผืด สัตว์เลี้ยงลูกด้วยน้ำนมที่บินได้', go: 'fly', spd: 0.28, fast: 0.6, stride: 0.2, turn: 3.5, acc: 2.5, roam: 0.26, zLo: 0.3, zHi: 0.5, z0: 0.5, R: 0.46, tz: 0.3, react: 'flyoff', near: 0.02,
  loop: [['hang', 9], ['fly', 4.5], ['hang', 7]], acts: { hang: 'ห้อยหัวเกาะกิ่งไม้ ห่อปีก', fly: 'บินวน', land: 'กลับมาห้อยหัว', flyoff: 'ปล่อยตัว บินหนี' }, C: { b: '#4A3E3A', w: '#5E504A' },
  perch: () => [0, 0.0185, 0.495], start: (s) => { s.x = 0; s.y = 0.0185; s.z = 0.495; s.perched = true; s.h = 0; },
  draw: anBat, props: (b) => { b.tube(AN_BRANCH, 0.012, '#7A5A3A', { sides: 6 }); b.tube([[0.1, 0.01, 0.575], [0.2, 0.08, 0.64]], (t) => 0.007 * (1 - 0.5 * t), '#7A5A3A', { sides: 5 }); }, sh: [0.07, 0.05] });

/* ==== more animals go above this line ==== */
/* the list for the picker of models and for the shape tool: [id, Thai name, what it does, other words, group] */
const AN_LIST = Object.keys(AN).map((k) => [k, AN[k].th, AN[k].hint, AN[k].kw || '', AN[k].grp]);
function anSpec(id) { const D = AN[id]; return D ? { domain: 'bio', dim: 3, title: D.th, animal: id, clean: true, pen: true, mark: 'ani' } : null; }
/* in the picker of models, subject biology: found by the Thai name, other names and what it does */
if (SCENE_TPL && SCENE_TPL.bio && !SCENE_TPL.bio.anDone) { SCENE_TPL.bio.anDone = 1; for (const [id, th, hint, kw, grp] of AN_LIST) SCENE_TPL.bio.push([th + ' (สามมิติ)', hint, anSpec(id), kw + ' ' + grp + ' สัตว์ ' + AN[id].en]); }


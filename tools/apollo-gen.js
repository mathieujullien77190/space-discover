// Générateur de la mission Apollo 11 (exécuté dans Node par tools/make-apollo.js, avec physics.js, launch.js et rockets.js chargés).
// Tout est calculé dans le plan de l'orbite d'attente (repère inertiel plan x = verticale du pas de tir à t = 0, y = sens du tir), en mètres et en secondes depuis le décollage :
//   montée (simulateLaunch, fusée Saturn V) → orbite d'attente de 185 km → injection translunaire (TLI) → vol vers la Lune (problème restreint des trois corps, Lune sur orbite circulaire)
//   → insertion en orbite lunaire (LOI) → orbite circulaire de 110 km → descente du LEM (guidage polynomial, poussée finie) → alunissage → décollage lunaire → rendez-vous → injection transterrestre (TEI)
//   → rentrée dans l'atmosphère (moteur Body avec traînée) → amerrissage.
// Les paramètres libres (phase de la Lune, Δv, instants des manœuvres) sont trouvés par recherche systématique puis affinés ; les chiffres historiques servent de repères, pas de contraintes.
const MUE = PH.MU, RE = PH.RE, MUM = 4.9048695e12, RM = 1737.4e3, DM = 384.4e6, nM = Math.sqrt((MUE + MUM) / (DM * DM * DM)), DEGR = Math.PI / 180;
const wrapPi = a => Math.atan2(Math.sin(a), Math.cos(a));
const moonAt = (t, th0) => { const th = th0 + nM * t; return { x: DM * Math.cos(th), y: DM * Math.sin(th), vx: -DM * nM * Math.sin(th), vy: DM * nM * Math.cos(th), th }; };
// accélération dans le repère centré sur la Terre (non inertiel : terme indirect dû à l'attraction de la Lune sur la Terre)
function acc3(x, y, t, th0) {
  const m = moonAt(t, th0), r2 = x * x + y * y, r3 = r2 * Math.sqrt(r2), dx = m.x - x, dy = m.y - y, d2 = dx * dx + dy * dy, d3 = d2 * Math.sqrt(d2), mm = DM * DM * DM;
  return [-MUE * x / r3 + MUM * (dx / d3 - m.x / mm), -MUE * y / r3 + MUM * (dy / d3 - m.y / mm)];
}
function rk4(s, t, dt, th0) {
  const f = (x, y, vx, vy, tt) => { const a = acc3(x, y, tt, th0); return [vx, vy, a[0], a[1]]; };
  const k1 = f(s.x, s.y, s.vx, s.vy, t), k2 = f(s.x + dt / 2 * k1[0], s.y + dt / 2 * k1[1], s.vx + dt / 2 * k1[2], s.vy + dt / 2 * k1[3], t + dt / 2);
  const k3 = f(s.x + dt / 2 * k2[0], s.y + dt / 2 * k2[1], s.vx + dt / 2 * k2[2], s.vy + dt / 2 * k2[3], t + dt / 2), k4 = f(s.x + dt * k3[0], s.y + dt * k3[1], s.vx + dt * k3[2], s.vy + dt * k3[3], t + dt);
  return { x: s.x + dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), y: s.y + dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]), vx: s.vx + dt / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]), vy: s.vy + dt / 6 * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]) };
}
function stepDt(s, t, th0, cap) {
  const m = moonAt(t, th0), rE = Math.hypot(s.x, s.y), rM = Math.hypot(s.x - m.x, s.y - m.y), v = Math.max(1, Math.hypot(s.vx, s.vy));
  return Math.max(1, Math.min(cap || 120, 0.02 * Math.min(rE, rM) / v));
}
// vol à trois corps depuis s0 (à t0) ; stop(s, t, info) → raison ou null ; emit(t, s) appelé à chaque pas de sortie (outStep) si fourni
function fly3(s0, t0, th0, o) {
  let s = Object.assign({}, s0), t = t0, nextOut = t0, n = 0;
  const cap = o.cap || 120, tMax = o.tMax;
  while (t < tMax) {
    if (o.emit && t >= nextOut - 1e-9) { o.emit(t, s); nextOut += o.outStep; }
    const why = o.stop && o.stop(s, t); if (why) return { s, t, why };
    let dt = stepDt(s, t, th0, cap); if (o.emit) dt = Math.min(dt, nextOut - t > 1e-9 ? nextOut - t : dt);
    s = rk4(s, t, dt, th0); t += dt; n++;
  }
  return { s, t, why: 'time' };
}
// meilleure approche de la Lune après la TLI : { minM, tMin, state } ; side > 0 : passage du côté qui donne une orbite lunaire directe
function approach(s0, t0, th0, cap) {
  let minM = Infinity, tMin = 0, sMin = null, passed = false;
  const res = fly3(s0, t0, th0, { cap: cap || 240, tMax: t0 + 7 * 86400, stop: (s, t) => {
    const m = moonAt(t, th0), rM = Math.hypot(s.x - m.x, s.y - m.y);
    if (rM < minM) { minM = rM; tMin = t; sMin = { x: s.x, y: s.y, vx: s.vx, vy: s.vy }; } else if (rM > minM * 1.6 && minM < 3e8) return 'passed';
    if (Math.hypot(s.x, s.y) < RE) return 'earth';
    return null;
  } });
  if (!sMin) return null;
  const m = moonAt(tMin, th0), rx = sMin.x - m.x, ry = sMin.y - m.y, vx = sMin.vx - m.vx, vy = sMin.vy - m.vy;
  return { minM, tMin, state: sMin, side: rx * vy - ry * vx, why: res.why };
}

// ---------- 1. montée et orbite d'attente ----------
const PAD = { lat: 28.608, lon: -80.6048, az: 72.058 * DEGR };   // rampe 39A, azimut de tir d'Apollo 11
function ascent() {
  const sim = simulateLaunch(185, { lat: PAD.lat, az: PAD.az, payload: 133e3, rocket: ROCKETS.saturnv });
  if (!sim.ok) throw new Error('montée Saturn V : orbite non atteinte');
  return sim;
}
// ---------- 2. injection translunaire : phase de la Lune th0 et Δv qui donnent une approche de ~110 km, côté orbite directe ----------
const TLI_T = 9856;             // s (T+2 h 44 min 16 s, historique)
const PERI_TARGET = RM + 110e3;
function tliSearch(leo, log) {
  const dvList = []; for (let d = 3040; d <= 3260; d += 20) dvList.push(d);
  const sp = Math.hypot(leo.vx, leo.vy);
  const burn = dv => ({ x: leo.x, y: leo.y, vx: leo.vx * (1 + dv / sp), vy: leo.vy * (1 + dv / sp) });
  let best = null;
  for (const dv of dvList) {
    // hypothèse « Terre seule » : à quel instant et sous quel angle l'orbite atteint-elle la distance de la Lune ? (th0 initial = angle − n·t)
    const s = burn(dv); let t0 = 0, found = null;
    for (let t = 3600; t < 6 * 86400; t += 600) { const k = phKepler(s, t); if (Math.hypot(k.x, k.y) >= DM * 0.97) { found = { t, ang: Math.atan2(k.y, k.x) }; break; } if (Math.hypot(k.x, k.y) < Math.hypot(phKepler(s, Math.max(0, t - 600)).x, phKepler(s, Math.max(0, t - 600)).y) && t > 7200) break; }
    if (!found) continue;
    const thGuess = found.ang - nM * (TLI_T + found.t);
    for (let off = -14; off <= 14; off += 0.25) {
      const th0 = thGuess + off * DEGR, ap = approach(burn(dv), TLI_T, th0, 600);
      if (!ap || ap.why === 'earth' || ap.side <= 0) continue;
      const err = Math.abs(ap.minM - PERI_TARGET);
      if (!best || err < best.err) best = { err, dv, th0, ap };
    }
    log && log('  Δv ' + dv + ' m/s : meilleur écart ' + (best ? Math.round(best.err / 1000) : '-') + ' km');
  }
  return best;
}
function tliRefine(leo, b, log) {
  const sp = Math.hypot(leo.vx, leo.vy), burn = dv => ({ x: leo.x, y: leo.y, vx: leo.vx * (1 + dv / sp), vy: leo.vy * (1 + dv / sp) });
  let best = b;
  for (const [dvStep, offStep, nd, no] of [[4, 0.04, 8, 8], [0.5, 0.005, 8, 8], [0.05, 0.0005, 6, 6]]) {
    const c = best; for (let i = -nd; i <= nd; i++) for (let j = -no; j <= no; j++) {
      const dv = c.dv + i * dvStep, th0 = c.th0 + j * offStep * DEGR, ap = approach(burn(dv), TLI_T, th0, 30);
      if (!ap || ap.why === 'earth' || ap.side <= 0) continue; const err = Math.abs(ap.minM - PERI_TARGET);
      if (err < best.err) best = { err, dv, th0, ap };
    }
    log && log('  affinage : écart ' + Math.round(best.err) + ' m, Δv ' + best.dv.toFixed(2) + ' m/s, arrivée T+' + (best.ap.tMin / 3600).toFixed(2) + ' h');
  }
  return best;
}

// ---------- 3. utilitaires de la suite ----------
const G0A = 9.80665, LON_SITE = 23.4730 * DEGR;   // Mer de la Tranquillité (Tranquility Base, 0,67° N 23,47° E ; la latitude est ignorée : plan Terre-Lune)
const rnd1 = v => Math.round(v), rnd2 = v => Math.round(v * 100) / 100;
const mkSample = (t, a) => [Math.round(t * 10) / 10, rnd1(a.x), rnd1(a.y), rnd2(a.vx), rnd2(a.vy)];
const relOf = (a, t, th0) => { const m = moonAt(t, th0); return { x: a.x - m.x, y: a.y - m.y, vx: a.vx - m.vx, vy: a.vy - m.vy }; };
const absOf = (r, t, th0) => { const m = moonAt(t, th0); return { x: r.x + m.x, y: r.y + m.y, vx: r.vx + m.vx, vy: r.vy + m.vy }; };
const smoothW = u => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u), dsmoothW = u => u <= 0 || u >= 1 ? 0 : 6 * u * (1 - u);
const rotXY = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const withSpeed = (s, v) => { const k = v / Math.hypot(s.vx, s.vy); return { x: s.x, y: s.y, vx: s.vx * k, vy: s.vy * k }; };
const siteAngle = (t, th0) => th0 + nM * t + Math.PI + LON_SITE;   // direction du site d'alunissage, repère inertiel (rotation synchrone : face visible vers la Terre)
// orbite autour de la Lune : échantillons toutes les `step` s de t0 à t1 (états ABSOLUS)
function recKepler(out, rel0, t0, t1, step, th0) {
  for (let t = t0; t < t1 - 1e-6; t += step) out.push(mkSample(t, absOf(phKepler(rel0, t - t0, MUM), t, th0)));
  out.push(mkSample(t1, absOf(phKepler(rel0, t1 - t0, MUM), t1, th0)));
}
// vol à trois corps avec enregistrement (pas identique à celui d'approach/fly3 : même suite de pas, donc mêmes instants)
function flyRec(out, s0, t0, th0, o) {
  let s = Object.assign({}, s0), t = t0, last = -1e18;
  while (t < o.tMax) {
    const m = moonAt(t, th0), rE = Math.hypot(s.x, s.y), rM = Math.hypot(s.x - m.x, s.y - m.y), v = Math.max(1, Math.hypot(s.vx, s.vy));
    const want = Math.min(o.maxStep || 600, Math.max(o.minStep || 30, 0.004 * Math.min(rE, rM) / v));
    if (out && t - last >= want - 1e-6) { out.push(mkSample(t, s)); last = t; }
    const why = o.stop && o.stop(s, t); if (why) { if (out) out.push(mkSample(t, s)); return { s, t, why }; }
    const dt = stepDt(s, t, th0, o.cap || 30); s = rk4(s, t, dt, th0); t += dt;
  }
  return { s, t, why: 'time' };
}
// retour vers la Terre : plus petite distance à la Terre { minE, tMin, state }
function approachEarth(s0, t0, th0, cap) {
  let minE = Infinity, tMin = 0, sMin = null;
  const res = fly3(s0, t0, th0, { cap: cap || 240, tMax: t0 + 6 * 86400, stop: (s, t) => {
    const rE = Math.hypot(s.x, s.y); if (rE < minE) { minE = rE; tMin = t; sMin = { x: s.x, y: s.y, vx: s.vx, vy: s.vy }; } else if (rE > minE * 1.5 && minE < 3e8) return 'passed';
    return null;
  } });
  return { minE, tMin, state: sMin, why: res.why };
}

// ---------- 4. descente du LEM : polynôme de degré 5 (position, vitesse, accélération aux deux bouts), poussée finie ----------
const LM = { m0: 15200, prop: 8200, ispD: 311, FD: 45000, ispA: 311, FA: 15600, mA: 4700, propA: 2376 };
function quintic(p0, v0, a0, p1, v1, a1, T) {   // un axe
  const h = p1 - p0, c3 = (20 * h - (8 * v1 + 12 * v0) * T - (3 * a0 - a1) * T * T) / (2 * T ** 3), c4 = (-30 * h + (14 * v1 + 16 * v0) * T + (3 * a0 - 2 * a1) * T * T) / (2 * T ** 4), c5 = (12 * h - 6 * (v1 + v0) * T - (a0 - a1) * T * T) / (2 * T ** 5);
  return t => ({ p: p0 + v0 * t + a0 / 2 * t * t + c3 * t ** 3 + c4 * t ** 4 + c5 * t ** 5, v: v0 + a0 * t + 3 * c3 * t * t + 4 * c4 * t ** 3 + 5 * c5 * t ** 4, a: a0 + 6 * c3 * t + 12 * c4 * t * t + 20 * c5 * t ** 3 });
}
// descente depuis (p0, v0) au point du site pf (vitesse vf = rotation de la Lune) en T secondes ; retourne la trajectoire, la masse et la faisabilité
function descent(p0, v0, pf, vf, T, dtOut) {
  const g = p => { const r = Math.hypot(p[0], p[1]), k = MUM / (r * r * r); return [-k * p[0], -k * p[1]]; }, ga = g(p0);
  const fx = quintic(p0[0], v0[0], ga[0], pf[0], vf[0], 0, T), fy = quintic(p0[1], v0[1], ga[1], pf[1], vf[1], 0, T);
  let m = LM.m0, minAlt = 1e9, maxThrottle = 0, maxG = 0; const pts = [], dt = 0.5;
  for (let t = 0; t <= T + 1e-9; t += dt) {
    const x = fx(t), y = fy(t), p = [x.p, y.p], gg = g(p), ax = x.a - gg[0], ay = y.a - gg[1], aT = Math.hypot(ax, ay), F = m * aT, alt = Math.hypot(p[0], p[1]) - RM;
    if (t > 5 && t < T - 12) minAlt = Math.min(minAlt, alt); maxThrottle = Math.max(maxThrottle, F / LM.FD);
    if (dtOut && Math.abs(t / dtOut - Math.round(t / dtOut)) < 1e-9) pts.push({ t, x: x.p, y: y.p, vx: x.v, vy: y.v, m, F, ax, ay, alt });
    m -= m * aT * dt / (LM.ispD * G0A);
  }
  return { pts, mEnd: m, used: LM.m0 - m, minAlt, maxThrottle };
}

// ---------- 5. remontée du LEM (repère local : site en (RM, 0), vitesse de rotation de la Lune) ----------
function ascentLM(hT) {
  let x = RM, y = 0, vx = 0, vy = nM * RM, m = LM.mA, prop = LM.propA, t = 0; const dt = 0.25, out = [];
  const mdot = LM.FA / (LM.ispA * G0A);
  while (t < 900 && prop > 0) {
    const r = Math.hypot(x, y), ux = x / r, uy = y / r, ex = -uy, ey = ux, vr = vx * ux + vy * uy, vt = vx * ex + vy * ey, h = r - RM, g = MUM / (r * r), A = LM.FA / m;
    const el = phElements(x, y, vx, vy, MUM);
    if (t > 20 && el.ra >= RM + 85e3 && el.rp > RM + 5e3) break;
    let phi = Math.PI / 2;
    if (t >= 10) { const vstar = Math.max(-40, Math.min(70, 0.04 * (hT - h))), acmd = 0.3 * (vstar - vr); phi = Math.asin(Math.max(-0.3, Math.min(1, (acmd + g - vt * vt / r) / A))); }
    const tx = ux * Math.sin(phi) + ex * Math.cos(phi), ty = uy * Math.sin(phi) + ey * Math.cos(phi);
    if (Math.abs(t / 2 - Math.round(t / 2)) < 1e-9) out.push({ t, x, y, vx, vy, m, F: LM.FA, tx, ty, alt: h });
    vx += (A * tx - g * ux) * dt; vy += (A * ty - g * uy) * dt; x += vx * dt; y += vy * dt; m -= mdot * dt; prop -= mdot * dt; t += dt;
    if (r < RM - 1 && t > 3) return { fail: 'impact' };
  }
  const el = phElements(x, y, vx, vy, MUM); out.push({ t, x, y, vx, vy, m, F: 0, tx: 0, ty: 0, alt: Math.hypot(x, y) - RM });
  return { out, t, state: { x, y, vx, vy }, rp: el.rp, ra: el.ra, mEnd: m, ok: el.rp > RM + 3e3 && el.ra > RM + 60e3 };
}

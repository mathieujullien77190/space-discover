// MISSIONS DE SONDES (Voyager, Pioneer, New Horizons…) rejouées d'après l'histoire : module PUR (sans three.js, sans DOM), testé dans Node (tools/test/mission.test.mjs).
// Une mission = une date de départ de la Terre + une suite de RENDEZ-VOUS DATÉS avec des planètes. Où est la sonde à une date D ? On le CALCULE à partir des positions des planètes à ces dates :
//   - entre deux rendez-vous : arc képlérien autour du Soleil qui relie la planète A (à la date de A) à la planète B (à la date de B) : solution du problème de LAMBERT (variables universelles) ;
//   - à chaque survol : près de la planète, hyperbole (patched conics) entre la vitesse d'arrivée et la vitesse de départ, fondue avec les arcs héliocentriques hors de la sphère d'influence ;
//   - après le dernier survol : vol libre (propagation képlérienne en variables universelles) avec la vitesse de sortie du survol (déviation d'après le périgée historique, dans ou hors du plan de l'écliptique).
// Cohérence vérifiée contre l'histoire (voir tools/test/mission.test.mjs) : C3 de départ de Voyager 2 ≈ 104 km²/s² (réel ≈ 102), périgées de survol nécessaires à 1-7 % des périgées historiques, distances d'aujourd'hui.
// Repère : héliocentrique inertiel, axes de la scène (comme BODY.rel), mètres, secondes. env = { rel(id, D) → [x, y, z] (m, héliocentrique), mu(id) → m³/s², radiusKm(id), sunMu }.

export const MU_SUN = 1.32712440018e20;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], norm = a => Math.hypot(a[0], a[1], a[2]), unit = a => mul(a, 1 / norm(a));
const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const DAY = 86400;

// ---------- fonctions de Stumpff, propagation képlérienne universelle, problème de Lambert ----------
const stumpC = z => z > 1e-9 ? (1 - Math.cos(Math.sqrt(z))) / z : z < -1e-9 ? (Math.cosh(Math.sqrt(-z)) - 1) / -z : 0.5 - z / 24;
const stumpS = z => z > 1e-9 ? (Math.sqrt(z) - Math.sin(Math.sqrt(z))) / Math.pow(Math.sqrt(z), 3) : z < -1e-9 ? (Math.sinh(Math.sqrt(-z)) - Math.sqrt(-z)) / Math.pow(Math.sqrt(-z), 3) : 1 / 6 - z / 120;

// propage (r, v) pendant dt secondes dans le champ de mu (orbite fermée ou hyperbolique) : renvoie [r', v']
export function propagate(r0, v0, dt, mu) {
  const R0 = norm(r0), vr0 = dot(r0, v0) / R0, alpha = 2 / R0 - dot(v0, v0) / mu, sm = Math.sqrt(mu);
  let chi = sm * Math.abs(alpha) * dt;   // première estimation
  if (Math.abs(alpha) < 1e-30) chi = sm * dt / R0;
  for (let i = 0; i < 60; i++) {
    const z = alpha * chi * chi, C = stumpC(z), S = stumpS(z);
    const F = R0 * vr0 / sm * chi * chi * C + (1 - alpha * R0) * Math.pow(chi, 3) * S + R0 * chi - sm * dt;
    const dF = R0 * vr0 / sm * chi * (1 - alpha * chi * chi * S) + (1 - alpha * R0) * chi * chi * C + R0;
    const d = F / dF; chi -= d; if (Math.abs(d) < 1e-9 * Math.max(1, Math.abs(chi))) break;
  }
  const z = alpha * chi * chi, C = stumpC(z), S = stumpS(z), f = 1 - chi * chi / R0 * C, g = dt - Math.pow(chi, 3) / sm * S;
  const r = add(mul(r0, f), mul(v0, g)), R = norm(r), fd = sm / (R * R0) * (alpha * Math.pow(chi, 3) * S - chi), gd = 1 - chi * chi / R * C;
  return [r, add(mul(r0, fd), mul(v0, gd))];
}

// Lambert : vitesses au départ (v1) et à l'arrivée (v2) de l'arc qui va de r1 à r2 en dt secondes, dans le sens PROGRADE autour de `normal` (normale de l'orbite de la Terre)
export function lambert(r1, r2, dt, mu, normal) {
  const R1 = norm(r1), R2 = norm(r2), cr = cross(r1, r2);
  let dth = Math.acos(Math.max(-1, Math.min(1, dot(r1, r2) / (R1 * R2)))); if (dot(cr, normal) < 0) dth = 2 * Math.PI - dth;
  const A = Math.sin(dth) * Math.sqrt(R1 * R2 / (1 - Math.cos(dth)));
  const y = z => R1 + R2 + A * (z * stumpS(z) - 1) / Math.sqrt(stumpC(z)), F = z => Math.pow(y(z) / stumpC(z), 1.5) * stumpS(z) + A * Math.sqrt(y(z)) - Math.sqrt(mu) * dt;
  let lo = -4 * Math.PI * Math.PI, hi = 4 * Math.PI * Math.PI, z = 0;
  for (let i = 0; i < 200; i++) { z = (lo + hi) / 2; if (y(z) < 0) { lo = z; continue; } if (F(z) < 0) lo = z; else hi = z; }
  const yy = y(z), f = 1 - yy / R1, g = A * Math.sqrt(yy / mu), gd = 1 - yy / R2;
  return { v1: r1.map((v, i) => (r2[i] - f * v) / g), v2: r1.map((v, i) => (gd * r2[i] - v) / g) };
}

// ---------- survol : hyperbole planétocentrique entre deux directions asymptotiques ----------
// uIn / uOut : directions (unitaires) de la vitesse à l'entrée et à la sortie ; vInf : module de v∞ ; rp : distance du périgée au centre (m). Renvoie une fonction (τ secondes depuis le périgée) → position relative à la planète.
export function hyperbola(uIn, uOut, vInf, mu) {
  const delta = Math.acos(Math.max(-1, Math.min(1, dot(uIn, uOut)))), e = 1 / Math.sin(delta / 2), a = mu / (vInf * vInf), n = Math.sqrt(mu / Math.pow(a, 3));
  const xh = unit(sub(uIn, uOut)), yh = unit(add(uIn, uOut)), b = a * Math.sqrt(e * e - 1);
  return { delta, e, a, rp: a * (e - 1), at(tau) {
    const M = n * tau; let H = Math.asinh(M / e); for (let i = 0; i < 60; i++) { const d = (e * Math.sinh(H) - H - M) / (e * Math.cosh(H) - 1); H -= d; if (Math.abs(d) < 1e-12) break; }
    return add(mul(xh, a * (e - Math.cosh(H))), mul(yh, b * Math.sinh(H)));
  } };
}
// vitesse de sortie d'un survol dont on ne connaît que l'entrée, le périgée et le côté de déviation :
// plane 'in' = déviation dans le plan de l'écliptique (axe = normale), 'out' = hors du plan (axe ⟂ à v∞ dans l'écliptique) ; sign ±1 = sens de rotation autour de l'axe
export function flybyOut(vInfIn, rp, mu, normal, plane, sign) {
  const v = norm(vInfIn), e = 1 + rp * v * v / mu, delta = 2 * Math.asin(1 / e), u = unit(vInfIn), axis = plane === 'out' ? unit(cross(normal, u)) : normal, c = Math.cos(sign * delta), s = Math.sin(sign * delta);
  const k = cross(axis, u), out = add(add(mul(u, c), mul(k, s)), mul(axis, dot(axis, u) * (1 - c)));   // formule de Rodrigues
  return mul(out, v);
}

// sortie d'un survol choisie par la LATITUDE ÉCLIPTIQUE FINALE de la sonde (fait historique connu : Voyager 1 : +35°, Voyager 2 : −48°) : la déviation δ est imposée par le périgée, la direction de sortie parcourt le cône d'angle δ autour de v∞ d'entrée
// (angle φ autour du cône) ; on garde la solution qui atteint la latitude voulue avec la vitesse héliocentrique la plus grande (le survol « gagne » de l'énergie)
export function flybyOutToLatitude(vInfIn, rp, mu, vP, normal, latDeg) {
  const v = norm(vInfIn), e = 1 + rp * v * v / mu, delta = 2 * Math.asin(1 / e), u = unit(vInfIn), e1 = unit(cross(normal, u)), e2 = cross(u, e1), target = latDeg * Math.PI / 180;
  const outAt = phi => { const dir = add(mul(u, Math.cos(delta)), mul(add(mul(e1, Math.cos(phi)), mul(e2, Math.sin(phi))), Math.sin(delta))); return mul(dir, v); };
  const latOf = vOut => { const h = add(vP, vOut); return Math.asin(dot(h, normal) / norm(h)); };
  let best = null, prev = null;
  for (let i = 0; i <= 720; i++) {
    const phi = i / 720 * 2 * Math.PI, f = latOf(outAt(phi)) - target;
    if (prev && prev.f * f <= 0) { let a = prev.phi, b = phi, fa = prev.f; for (let k = 0; k < 50; k++) { const m = (a + b) / 2, fm = latOf(outAt(m)) - target; if (fa * fm <= 0) b = m; else { a = m; fa = fm; } } const out = outAt((a + b) / 2), sp = norm(add(vP, out)); if (!best || sp > best.sp) best = { out, sp }; }
    prev = { phi, f };
  }
  if (best) return best.out;
  let near = null;   // latitude hors de portée (ephemerides approchées) : la direction de sortie qui s'en approche le plus
  for (let i = 0; i < 720; i++) { const out = outAt(i / 720 * 2 * Math.PI), d = Math.abs(latOf(out) - target); if (!near || d < near.d) near = { out, d }; }
  return near.out;
}

// ---------- construction d'une mission ----------
// def : { launch: { date, from }, waypoints: [{ body, date, periapsisKm?, plane?, sign? }] } ; env : voir l'en-tête ; days(ms) → jours depuis J2000.
export function buildMission(def, env) {
  const dayOf = iso => env.days(Date.parse(iso)), body0 = def.launch.from || 'earth';
  const stops = [{ body: body0, D: dayOf(def.launch.date), key: 'launch', rp: null }].concat(def.waypoints.map(w => ({ body: w.body, D: dayOf(w.date), key: w.body, rpHist: w.periapsisKm ? w.periapsisKm * 1000 : null, plane: w.plane || 'in', sign: w.sign || 1, exitLat: w.exitLatitudeDeg, label: w.label })));
  const e0 = env.rel('earth', stops[0].D), e1 = env.rel('earth', stops[0].D + 1), nrm = unit(cross(e0, e1));   // normale de l'orbite de la Terre : sens prograde
  const velOf = (id, D) => mul(sub(env.rel(id, D + 0.01), env.rel(id, D - 0.01)), 1 / (0.02 * DAY));
  const legs = [];
  for (let k = 0; k < stops.length - 1; k++) {
    const a = stops[k], b = stops[k + 1], r1 = env.rel(a.body, a.D), r2 = env.rel(b.body, b.D), L = lambert(r1, r2, (b.D - a.D) * DAY, MU_SUN, nrm);
    legs.push({ a, b, t1: a.D, t2: b.D, r1, v1: L.v1, v2: L.v2 });
  }
  // survols : entrée / sortie en v∞, déviation, périgée nécessaire (cohérence avec l'histoire) ; la fenêtre de fusion = fraction de la sphère d'influence
  const flybys = [];
  for (let k = 1; k < stops.length; k++) {
    const s = stops[k], mu = env.mu(s.body), vP = velOf(s.body, s.D), vin = sub(legs[k - 1].v2, vP), last = k === stops.length - 1;
    let vout, rpNeeded, hyp;
    if (!last) {
      vout = sub(legs[k].v1, vP); const vm = (norm(vin) + norm(vout)) / 2; hyp = hyperbola(unit(vin), unit(vout), vm, mu); rpNeeded = hyp.rp;
    } else {
      const rp = s.rpHist || (env.radiusKm(s.body) * 3000); vout = s.exitLat !== undefined ? flybyOutToLatitude(vin, rp, mu, vP, nrm, s.exitLat) : flybyOut(vin, rp, mu, nrm, s.plane, s.sign); hyp = hyperbola(unit(vin), unit(vout), norm(vin), mu); rpNeeded = hyp.rp;
    }
    const rSun = norm(env.rel(s.body, s.D)), soi = rSun * Math.pow(mu / MU_SUN, 0.4), vInf = norm(vin);
    flybys.push({ k, body: s.body, D: s.D, mu, vIn: norm(vin), vOut: norm(vout), vInfVec: vin, deltaDeg: hyp.delta * 180 / Math.PI, rpNeeded, rpHist: s.rpHist, hyp, soi, tSoi: soi / vInf / DAY, vP, vout });
  }
  const lastStop = stops[stops.length - 1], fl = flybys[flybys.length - 1];
  const after = { D: lastStop.D, r: env.rel(lastStop.body, lastStop.D), v: add(fl.vP, fl.vout) };
  const departVinf = sub(legs[0].v1, velOf(stops[0].body, stops[0].D));
  const mission = {
    stops, legs, flybys, after, nrm, t0: stops[0].D, tLastFlyby: lastStop.D,
    departure: { vInf: norm(departVinf), c3: norm(departVinf) ** 2 / 1e6, vec: departVinf },   // c3 en km²/s²
    // position héliocentrique (m) et vitesse (m/s) de la sonde à la date D (jours depuis J2000) ; null avant le départ
    state(D) {
      if (D < mission.t0) return null;
      let r, v;
      if (D >= mission.tLastFlyby) { const s = propagate(after.r, after.v, (D - after.D) * DAY, MU_SUN); r = s[0]; v = s[1]; }
      else { const leg = legs.find(l => D <= l.t2) || legs[legs.length - 1], s = propagate(leg.r1, leg.v1, (D - leg.t1) * DAY, MU_SUN); r = s[0]; v = s[1]; }
      // fusion avec l'hyperbole d'un survol proche
      for (const f of flybys) {
        const tau = (D - f.D) * DAY, T = f.tSoi * DAY, ta = Math.abs(tau);
        if (ta >= T) continue;
        const w = smooth((T - ta) / (0.6 * T)), P = env.rel(f.body, D), q = add(P, f.hyp.at(tau));   // l'arc d'entrée ou de sortie est utilisé des deux côtés tant qu'on est loin
        r = add(mul(r, 1 - w), mul(q, w));
      }
      return { r, v };
    },
  };
  return mission;
}

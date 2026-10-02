// Arcs de trajectoire entre deux planètes (problème de Lambert résolu par tir, variables universelles).
// ---------- Arcs entre deux planètes : vraie trajectoire képlérienne autour du Soleil (problème de Lambert) ----------
// Entre deux survols, la sonde suit une conique (ellipse ou hyperbole) qui part de la planète 1 à la date 1 et arrive à la planète 2 à la date 2.
// On cherche la vitesse de départ par tir (Newton), en propageant avec les variables universelles ; on garde la solution prograde qui fait le moins de tours.
// Les survols (assistances gravitationnelles) changent brusquement la vitesse : chaque arc est donc indépendant. Plan de l'écliptique seulement.
const MU = GM.soleil;
const stC = z => z > 1e-6 ? (1 - Math.cos(Math.sqrt(z))) / z : z < -1e-6 ? (Math.cosh(Math.sqrt(-z)) - 1) / -z : 0.5 - z / 24;
const stS = z => z > 1e-6 ? (Math.sqrt(z) - Math.sin(Math.sqrt(z))) / Math.pow(z, 1.5) : z < -1e-6 ? (Math.sinh(Math.sqrt(-z)) - Math.sqrt(-z)) / Math.pow(-z, 1.5) : 1 / 6 - z / 120;
function kepProp(r0, v0, dt) {   // position (km) après dt secondes, depuis (r0 km, v0 km/s) : variables universelles
  const R0 = Math.hypot(r0[0], r0[1]), sm = Math.sqrt(MU), vr0 = (r0[0] * v0[0] + r0[1] * v0[1]) / R0, al = 2 / R0 - (v0[0] * v0[0] + v0[1] * v0[1]) / MU;
  let chi = Math.abs(al) < 1e-13 ? sm * dt / R0 : sm * Math.abs(al) * dt;
  for (let i = 0; i < 100; i++) {
    const z = al * chi * chi, C = stC(z), S = stS(z);
    const F = R0 * vr0 / sm * chi * chi * C + (1 - al * R0) * chi * chi * chi * S + R0 * chi - sm * dt;
    const dF = R0 * vr0 / sm * chi * (1 - z * S) + (1 - al * R0) * chi * chi * C + R0;
    const d = F / dF; chi -= d; if (!isFinite(chi)) break; if (Math.abs(d) < 1e-10 * Math.max(1, Math.abs(chi))) break;
  }
  const z = al * chi * chi, f = 1 - chi * chi / R0 * stC(z), g = dt - chi * chi * chi * stS(z) / sm;
  return [f * r0[0] + g * v0[0], f * r0[1] + g * v0[1]];
}
function solveLeg(r1, r2, days) {
  const dt = days * 86400, R1 = Math.hypot(r1[0], r1[1]), vc = Math.sqrt(MU / R1), ux = r1[0] / R1, uy = r1[1] / R1;
  const res = v => { const q = kepProp(r1, v, dt); return [q[0] - r2[0], q[1] - r2[1]]; };
  let best = null;
  for (const sr of [0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8]) for (const g of [-0.5, -0.25, 0, 0.25, 0.5]) {   // départ essayé : tangentiel prograde × sr, plus un peu de radial
    let v = [-uy * vc * sr + ux * vc * g, ux * vc * sr + uy * vc * g], e = res(v), n = Math.hypot(e[0], e[1]);
    for (let it = 0; it < 60 && n > 50; it++) {
      const h = 1e-4, ex = res([v[0] + h, v[1]]), ey = res([v[0], v[1] + h]);
      const a = (ex[0] - e[0]) / h, b = (ey[0] - e[0]) / h, c = (ex[1] - e[1]) / h, d = (ey[1] - e[1]) / h, det = a * d - b * c;
      if (!isFinite(det) || Math.abs(det) < 1e-12) break;
      let dv = [(-e[0] * d + e[1] * b) / det, (e[0] * c - e[1] * a) / det];
      const dl = Math.hypot(dv[0], dv[1]); if (dl > 10) dv = [dv[0] * 10 / dl, dv[1] * 10 / dl];
      let ok = false;
      for (let k = 0, st = 1; k < 10; k++, st /= 2) { const c2 = [v[0] + dv[0] * st, v[1] + dv[1] * st], e2 = res(c2), n2 = Math.hypot(e2[0], e2[1]); if (isFinite(n2) && n2 < n) { v = c2; e = e2; n = n2; ok = true; break; } }
      if (!ok) break;
    }
    if (!(n <= 50)) continue;
    const h = r1[0] * v[1] - r1[1] * v[0], al = 2 / R1 - (v[0] * v[0] + v[1] * v[1]) / MU, p = h * h / MU;
    if (h <= 0) continue;
    const ecc = Math.sqrt(Math.max(0, 1 - p * al)), q = p / (1 + ecc);
    if (q < 0.15 * AU) continue;
    let revs = 0; if (al > 0) { const T = 2 * Math.PI * Math.sqrt(Math.pow(1 / al, 3) / MU); revs = Math.floor(dt / T); if (1 / al * (1 + ecc) > 80 * AU) continue; }
    const score = revs * 1000 + Math.hypot(v[0] + uy * vc, v[1] - ux * vc);
    if (!best || score < best.score) best = { score, r1: r1.slice(), v1: v };
  }
  return best;
}

// Calculs de mécanique orbitale : Kepler (ellipse, hyperbole), position des planètes et des lunes, dates.
function solveKepler(M, e) { let E = M; for (let i = 0; i < 8; i++) E = M + e * Math.sin(E); return E; }
// position héliocentrique (km), dans le plan de l'écliptique (inclinaisons ignorées), t en jours depuis J2000
function planetPos(p, t) {
  const a = p.a * AU, M = (p.L0 - p.w) * DEG + 2 * Math.PI * t / p.T, E = solveKepler(M, p.e);
  const x = a * (Math.cos(E) - p.e), y = a * Math.sqrt(1 - p.e * p.e) * Math.sin(E), w = p.w * DEG;
  planetPos.E = E;
  return [x * Math.cos(w) - y * Math.sin(w), x * Math.sin(w) + y * Math.cos(w)];
}

function moonAngle(m, t) {
  if (m.id === 'lune') return (218.316 + 13.176396 * t) * DEG;  // longitude moyenne de la Lune : phase réelle approximative
  return m.ph0 + (m.retro ? -1 : 1) * 2 * Math.PI * t / m.T;     // autres lunes : phase de départ illustrative
}

const dayOf = ms => (ms - J2000) / DAYMS;
const D = s => dayOf(Date.parse(s.length === 10 ? s + 'T12:00:00Z' : s));   // 'AAAA-MM-JJ' (midi UTC) ou date ISO complète
const GM = { soleil: 1.32712440018e11, jupiter: 1.26686534e8, saturne: 3.7931187e7 };   // km³/s²
const orbitT = (a, gm) => 2 * Math.PI * Math.sqrt(a * a * a / gm) / 86400;               // période (jours) pour un demi-grand axe a (km)
function solveNewton(M, e) {   // équation de Kepler, ellipse (robuste jusqu'à e très proche de 1)
  M = ((M + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  let E = e > 0.8 ? Math.PI * (M < 0 ? -1 : 1) : M;
  for (let i = 0; i < 80; i++) { const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); E -= d; if (Math.abs(d) < 1e-12) break; }
  return E;
}
function solveHyper(M, e) {    // équation de Kepler, hyperbole
  let H = Math.asinh(M / e);
  for (let i = 0; i < 80; i++) { const d = (e * Math.sinh(H) - H - M) / (e * Math.cosh(H) - 1); H -= d; if (Math.abs(d) < 1e-12) break; }
  return H;
}

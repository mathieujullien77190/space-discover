// Dessin : outils communs (tracé clippé, orbites, étiquettes, étoiles).
// =====================================================================
//  DESSIN
// =====================================================================
// trace une polyligne en ne gardant que ce qui est près de l'écran (coordonnées toujours petites, pas d'artefacts de ligne géante)
function strokeClipped(pts) {
  const x0 = -300, y0 = -300, x1 = W + 300, y1 = H + 300;
  ctx.beginPath(); let pen = false;
  for (let i = 1; i < pts.length; i++) {
    let [ax, ay] = pts[i - 1], [bx, by] = pts[i], t0 = 0, t1 = 1;
    const dx = bx - ax, dy = by - ay;
    let ok = true;
    for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dy, ay - y0], [dy, y1 - ay]]) {   // Liang–Barsky
      if (p === 0) { if (q < 0) { ok = false; break; } continue; }
      const r = q / p;
      if (p < 0) { if (r > t1) { ok = false; break; } if (r > t0) t0 = r; } else { if (r < t0) { ok = false; break; } if (r < t1) t1 = r; }
    }
    if (!ok) { pen = false; continue; }
    const sx = ax + dx * t0, sy = ay + dy * t0, ex = ax + dx * t1, ey = ay + dy * t1;
    if (!pen) ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    pen = t1 === 1;
  }
  ctx.stroke();
}
// orbite d'une planète : l'ellipse entière si la vue est grande, sinon seulement l'arc proche du corps, calculé exactement
function drawPlanetOrbit(p, c, k) {
  const a = p.a * AU, e = p.e, b = a * Math.sqrt(1 - e * e), w = p.w * DEG, cw = Math.cos(w), sw = Math.sin(w);
  const Rv = Math.hypot(W, H) / 2 / k;                   // demi-diagonale de la vue, en km
  const dE = Math.min(Math.PI, 2 * Rv / b);              // demi-fenêtre en anomalie excentrique (b = plus petite vitesse d'arc)
  const full = dE >= Math.PI, E0 = full ? 0 : p.E, N = full ? 240 : 160, pts = [];
  for (let i = 0; i <= N; i++) {
    const E = full ? i / N * 2 * Math.PI : E0 - dE + 2 * dE * i / N;
    const x = a * (Math.cos(E) - e), y = b * Math.sin(E);
    const sc = toScreen(c, k, x * cw - y * sw, x * sw + y * cw);
    pts.push(sc);
  }
  strokeClipped(pts);
}
// orbite circulaire d'une lune : cercle si petit à l'écran, sinon seulement l'arc proche de la lune
function drawMoonOrbit(m, ps, rp, c, k) {
  if (rp < 2500) { ctx.beginPath(); ctx.arc(ps[0], ps[1], rp, 0, 7); ctx.stroke(); return; }
  const Rv = Math.hypot(W, H) / 2 / k, dT = Math.min(Math.PI, 2 * Rv / m.a), pts = [];
  for (let i = 0; i <= 160; i++) { const th = m.th - dT + 2 * dT * i / 160; pts.push([ps[0] + rp * Math.cos(th), ps[1] - rp * Math.sin(th)]); }
  strokeClipped(pts);
}
const toScreen = (c, k, x, y) => [W / 2 + (x - c[0]) * k, H / 2 - (y - c[1]) * k];
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
const lblBoxes = [];
const lblFree = (x, y, w, h) => !lblBoxes.some(q => x < q[2] && x + w > q[0] && y - h < q[3] && y > q[1]);
const labelHits = [];   // zones cliquables des étiquettes : cliquer le texte revient à cliquer l'astre (ref)
function lbl(s, x, y, color, size, weight, ref) {
  if (!LAYERS.labels) return;
  size = size || 12; ctx.font = `${weight || 400} ${size}px system-ui, sans-serif`; ctx.textAlign = 'left';
  const m = ctx.measureText(s), w = m && m.width ? m.width : s.length * size * 0.55;
  lblBoxes.push([x, y - size, x + w, y]);
  if (ref) labelHits.push({ ref, x0: x - 3, y0: y - size - 3, x1: x + w + 3, y1: y + 4 });
  ctx.fillStyle = color || '#a9bde6'; ctx.fillText(s, x, y);
}

const stars = (() => { const r = rng(7); return Array.from({ length: 260 }, () => ({ x: r(), y: r(), s: 0.4 + r() * 1.3, p: r() * 6.28, q: 0.7 + r() * 2 })); })();
let hits = [];

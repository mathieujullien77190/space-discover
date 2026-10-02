// Anneaux de Saturne, vus de dessus (à plat) : structure réelle, rayons en km depuis le centre de Saturne.
// D 66 900–74 510 · C 74 658–92 000 (lacunes de Colombo ≈ 77 800 et de Maxwell ≈ 87 500) · B 92 000–117 580 (le plus dense) ·
// division de Cassini 117 580–122 170 (quelques anneaux fins) · A 122 170–136 775 (lacunes d'Encke ≈ 133 590 et de Keeler ≈ 136 505) ·
// division de Roche 136 775–139 380 · F ≈ 140 180 (très fin) · G 166 000–175 000 · E 180 000–480 000 (très large et très ténu, le plus dense vers l'orbite d'Encelade, 238 000).
// La structure fine (sous-bandes de densité variable) est générée avec un hasard fixe : réaliste dans l'esprit, pas mesurée.
const RING_OUT = 480000;
const RING_STOPS = (() => {
  const r = rng(2004), segs = [];   // [r0, r1, [R,G,B], opacité]
  const add = (a, b, col, al) => segs.push([a, b, col, Math.max(0, Math.min(1, al))]);
  const band = (r0, r1, col, al, vari, step) => { for (let a = r0; a < r1;) { const b = Math.min(r1, a + step * (0.4 + 1.2 * r())); add(a, b, col, al * (1 + vari * (r() * 2 - 1))); a = b; } };
  const C = [150, 135, 115], B = [232, 214, 176], A = [214, 196, 160], CD = [170, 150, 125], F = [230, 215, 185], E = [185, 212, 238];
  band(66900, 74510, [120, 110, 100], 0.05, 0.6, 600);                                           // D
  band(74658, 77740, C, 0.2, 0.5, 700); add(77740, 77900, C, 0.1); band(77900, 87440, C, 0.22, 0.5, 700);   // C + lacune de Colombo
  add(87440, 87710, C, 0.12); band(87710, 92000, C, 0.28, 0.5, 700);                              // lacune de Maxwell
  band(92000, 98000, B, 0.55, 0.3, 450); band(98000, 110000, B, 0.92, 0.12, 450); band(110000, 117580, B, 0.82, 0.18, 450);   // B
  { let cur = 117580;                                                                             // division de Cassini et ses anneaux fins (sans recouvrement)
    for (const [x, y] of [[117800, 118000], [118600, 118800], [119900, 120100], [120700, 120900]]) { band(cur, x, CD, 0.08, 0.7, 350); add(x, y, CD, 0.3); cur = y; }
    band(cur, 122170, CD, 0.08, 0.7, 350); }
  band(122170, 133420, A, 0.62, 0.2, 400); band(133420, 133560, A, 0.02, 0, 1e9); add(133560, 133620, A, 0.3); add(133620, 133750, A, 0.02);   // A + lacune d'Encke
  band(133750, 136490, A, 0.58, 0.2, 400); add(136490, 136520, A, 0.02); band(136520, 136775, A, 0.5, 0.2, 130);   // lacune de Keeler
  add(140080, 140280, F, 0.5);                                                                    // F
  band(166000, 175000, [200, 200, 205], 0.05, 0.3, 1500);                                        // G
  for (let a = 180000; a < RING_OUT; a += 3000) add(a, a + 3000, E, 0.012 + 0.07 * Math.exp(-Math.pow((a + 1500 - 238000) / 75000, 2)) * (a > 450000 ? Math.max(0, (RING_OUT - a) / 30000) : 1));   // E
  segs.sort((p, q) => p[0] - q[0]);
  const stops = [], rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`, clear = 'rgba(0,0,0,0)';
  stops.push([0, clear]);
  let prev = 0;
  for (const [a, b, col, al] of segs) {
    if (a - prev > 1) { stops.push([prev / RING_OUT, clear], [a / RING_OUT, clear]); }
    stops.push([a / RING_OUT, rgba(col, al)], [b / RING_OUT, rgba(col, al)]);
    prev = b;
  }
  stops.push([prev / RING_OUT, clear], [1, clear]);
  return stops;
})();

function drawRings(b, sx, sy, rpx, sunS) {
  const k = rpx / b.R, rOut = RING_OUT * k;
  const fill = () => { const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, rOut); for (const [o, c] of RING_STOPS) g.addColorStop(o, c); ctx.fillStyle = g; ctx.fillRect(sx - rOut, sy - rOut, rOut * 2, rOut * 2); };
  if (!sunS) { fill(); return; }
  // ombre de la planète sur les anneaux : une bande de la largeur de la planète, à l'opposé du Soleil
  let ux = sunS[0] - sx, uy = sunS[1] - sy; const d = Math.hypot(ux, uy) || 1; ux /= d; uy /= d;
  const ax = -ux, ay = -uy, px = -ay, py = ax, L = rOut * 1.1, shadow = new Path2D();
  shadow.moveTo(sx + px * rpx, sy + py * rpx); shadow.lineTo(sx + px * rpx + ax * L, sy + py * rpx + ay * L);
  shadow.lineTo(sx - px * rpx + ax * L, sy - py * rpx + ay * L); shadow.lineTo(sx - px * rpx, sy - py * rpx); shadow.closePath();
  const lit = new Path2D(); lit.rect(sx - rOut, sy - rOut, rOut * 2, rOut * 2); lit.addPath(shadow);
  ctx.save(); ctx.clip(lit, 'evenodd'); fill(); ctx.restore();                       // éclairé : tout sauf la bande d'ombre
  ctx.save(); ctx.clip(shadow); ctx.globalAlpha = 0.18; fill(); ctx.restore();        // dans l'ombre : très sombre
}

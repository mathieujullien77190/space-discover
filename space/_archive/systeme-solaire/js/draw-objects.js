// Dessin : coniques exactes, comètes, repères de météorites.
// points d'une conique (ellipse ou hyperbole), paramétrée par l'anomalie vraie : exacte près du corps (fenêtre autour de sa position), sans « vibration »
function conicPts(par, e, nuC, rC, nuLim, Rv, proj, ox, oy, cc, k) {
  const d = Math.min(nuLim, 2.5 * Rv / Math.max(rC, 1)), full = d >= nuLim;
  let a0 = full ? -nuLim : nuC - d, a1 = full ? nuLim : nuC + d;
  if (nuLim < Math.PI) { a0 = Math.max(a0, -nuLim); a1 = Math.min(a1, nuLim); }
  const N = full ? 480 : 240, pts = [];
  for (let i = 0; i <= N; i++) {
    const nu = a0 + (a1 - a0) * i / N, r = par / (1 + e * Math.cos(nu)), q = proj(r * Math.cos(nu), r * Math.sin(nu));
    pts.push(toScreen(cc, k, ox + q[0], oy + q[1]));
  }
  return pts;
}
function trailRange(p, t) {
  let a = p.t0, b = Math.min(t, p.tEnd);
  if (p.kep) a = Math.max(p.t0, b - p.kep.T); else if (p.l2) b = Math.min(b, p.t0 + p.l2.days); else if (!p.esc) b = Math.min(b, p.tArr);
  return [a, b];
}
// comète : tête brillante, queue d'ions (droite, bleue) et queue de poussière (courbée, jaune), à l'opposé du Soleil ; visibles à moins de ~4 UA
function drawComet(cm, s, k) {
  const w = cm.pos3, r = Math.hypot(w[0], w[1], w[2]) / AU, hd = Math.hypot(w[0], w[1]), act = Math.max(0, Math.min(1, 1 - (r - 1) / 3));
  if (act > 0 && hd > 1) {
    const ux = w[0] / hd, uy = -w[1] / hd, vl = Math.hypot(cm.vel[0], cm.vel[1]) || 1, vx = cm.vel[0] / vl, vy = -cm.vel[1] / vl;
    const L = Math.max(Math.min(1.6e8, 2.5e7 * (2.5 / Math.max(r, 0.25))) * act * k, 20 * act), wd = Math.max(2, 4e5 * k);
    let ex = ux - 0.35 * vx, ey = uy - 0.35 * vy; const el = Math.hypot(ex, ey) || 1; ex /= el; ey /= el;
    const tail = (dx, dy, len, col, a0) => {
      const x2 = s[0] + dx * len, y2 = s[1] + dy * len, g = ctx.createLinearGradient(s[0], s[1], x2, y2);
      g.addColorStop(0, col + (a0 * act).toFixed(3) + ')'); g.addColorStop(1, col + '0)');
      ctx.fillStyle = g; ctx.beginPath();
      ctx.moveTo(s[0] - dy * wd, s[1] + dx * wd); ctx.lineTo(x2 - dy * wd * 3, y2 + dx * wd * 3); ctx.lineTo(x2 + dy * wd * 3, y2 - dx * wd * 3); ctx.lineTo(s[0] + dy * wd, s[1] - dx * wd); ctx.closePath(); ctx.fill();
    };
    tail(ex, ey, L * 0.75, 'rgba(255,230,180,', 0.5); tail(ux, uy, L, 'rgba(130,190,255,', 0.75);
  }
  const g = ctx.createRadialGradient(s[0], s[1], 0, s[0], s[1], 8);
  g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(190,230,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s[0], s[1], 8, 0, 7); ctx.fill();
  const rpx = cm.R * k; if (rpx > 2) { ctx.fillStyle = '#6b6660'; ctx.beginPath(); ctx.arc(s[0], s[1], rpx, 0, 7); ctx.fill(); }
}
// corps énorme à l'écran (zoom sur une sonde en orbite : la Terre fait des millions de pixels) : on ne dessine plus la sphère ; si le centre de l'écran est dans son disque,
// on remplit l'écran d'une couleur unie (côté jour ou côté nuit), sinon rien
function drawHugeDisc(b, s, rpx, sunS) {
  if (Math.hypot(W / 2 - s[0], H / 2 - s[1]) >= rpx) return;
  const lit = b === SUN || ((W / 2 - s[0]) * (sunS[0] - s[0]) + (H / 2 - s[1]) * (sunS[1] - s[1])) > 0;
  ctx.fillStyle = lit ? (b === SUN ? '#ffcf4d' : b.look.base) : '#070d18'; ctx.fillRect(0, 0, W, H);
}
// repères des météorites sur le globe (visibles seulement sur la face tournée vers nous)
function drawMeteoPins(sx, sy, rpx) {
  const S = EARTHB.surf, lat0 = toRad(S.view.lat), lon0 = toRad(S.view.lon);
  for (const m of METEORITES) {
    const v = viewPt(m.lon, m.lat, lat0, lon0); if (v.z < 0.08) continue;
    const [x, y] = surfPt(S, sx, sy, v.x * rpx, -v.y * rpx), sel = selMeteo === m;
    ctx.fillStyle = sel ? '#fff' : (m.type === 'cratère' ? '#ff6a6a' : '#ffb347'); ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, sel ? 6 : 4.2, 0, 7); ctx.fill(); ctx.stroke();
    if (sel || rpx > 160) lbl(m.name, x + 9, y + 4, sel ? '#fff' : '#ffd9a8', 11, sel ? 700 : 400, m);
    hits.push({ b: m, pin: true, x, y, r: 8 });
  }
}

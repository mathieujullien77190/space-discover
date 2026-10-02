// Dessin : sphères éclairées (planètes, lunes, Soleil) et anneaux de Saturne.
function drawSphere(b, sx, sy, rpx, sunS) {
  const L = b.look;
  if (rpx < 2.4) { ctx.fillStyle = L.sun ? '#ffd36a' : L.base; ctx.beginPath(); ctx.arc(sx, sy, Math.max(rpx, b.id === 'soleil' ? 3 : 1.8), 0, 7); ctx.fill(); return; }
  if (L.atm && rpx > 7) { const g = ctx.createRadialGradient(sx, sy, rpx * 0.96, sx, sy, rpx * 1.22); g.addColorStop(0, hexA(L.atm, 0.45)); g.addColorStop(1, hexA(L.atm, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, rpx * 1.22, 0, 7); ctx.fill(); }
  if (L.rings && rpx > 5) drawRings(b, sx, sy, rpx, sunS);
  if (b.surf) b.surf.glCraters = false;   // drawGlobeGL le met à vrai si les cratères sont dans la texture 3D
  if (rpx > 12 && drawGlobeGL(b, sx, sy, rpx, sunS)) {   // le globe 3D (three.js) remplace tout le rendu 2D du disque : texture, éclairage, terminateur
    if (L.sun) {   // Soleil : assombrissement du limbe et teinte orangée au bord (la texture est la même sur toute la sphère)
      ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, rpx, 0, 7); ctx.clip();
      const g = ctx.createRadialGradient(sx, sy, rpx * 0.1, sx, sy, rpx); g.addColorStop(0, 'rgba(255,246,204,0.5)'); g.addColorStop(0.7, 'rgba(255,207,77,0)'); g.addColorStop(1, 'rgba(240,144,42,0.55)');
      ctx.fillStyle = g; ctx.fillRect(sx - rpx, sy - rpx, rpx * 2, rpx * 2); ctx.restore();
    }
    drawNorthMark(b, sx, sy, rpx); return;
  }
  ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, rpx, 0, 7); ctx.clip();
  if (L.sun) { const g = ctx.createRadialGradient(sx, sy, rpx * 0.1, sx, sy, rpx); g.addColorStop(0, '#fff6cc'); g.addColorStop(0.7, '#ffcf4d'); g.addColorStop(1, '#f0902a'); ctx.fillStyle = g; ctx.fillRect(sx - rpx, sy - rpx, rpx * 2, rpx * 2); }
  else { ctx.fillStyle = L.base; ctx.fillRect(sx - rpx, sy - rpx, rpx * 2, rpx * 2); }
  if (rpx > 12) {
    if (b.surf) drawSurface(b, sx, sy, rpx);
    if (L.bands) for (const [col, s0, s1] of L.bands) { ctx.fillStyle = col; ctx.fillRect(sx - rpx, sy - s1 * rpx, rpx * 2, (s1 - s0) * rpx); }
    for (const f of b.feat) {
      const lam = f.lon + b.spin, ct = Math.cos(f.lat) * Math.cos(lam);
      if (ct <= 0.04) continue;
      ctx.fillStyle = f.col;
      ctx.beginPath(); ctx.ellipse(sx + rpx * Math.cos(f.lat) * Math.sin(lam), sy - rpx * Math.sin(f.lat), f.s * rpx * Math.max(0.18, ct), f.s * rpx, 0, 0, 7); ctx.fill();
    }
    if (L.grs) { const lam = 1.0 + b.spin, ct = Math.cos(-0.38) * Math.cos(lam); if (ct > 0.05) { ctx.fillStyle = '#b8503a'; ctx.beginPath(); ctx.ellipse(sx + rpx * Math.cos(-0.38) * Math.sin(lam), sy + rpx * Math.sin(0.38), rpx * 0.17 * Math.max(0.2, ct), rpx * 0.1, 0, 0, 7); ctx.fill(); } }
    if (L.caps) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(sx, sy - rpx * 1.02, rpx * 0.5, rpx * 0.22, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(sx, sy + rpx * 1.02, rpx * 0.4, rpx * 0.17, 0, 0, 7); ctx.fill(); }
  }
  // éclairage : la lumière vient du Soleil, vue du dessus on voit toujours une moitié éclairée
  if (!L.sun && sunS) {
    let ux = sunS[0] - sx, uy = sunS[1] - sy; const d = Math.hypot(ux, uy) || 1; ux /= d; uy /= d;
    const g = ctx.createLinearGradient(sx + ux * rpx, sy + uy * rpx, sx - ux * rpx, sy - uy * rpx);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,0.1)'); g.addColorStop(0.62, 'rgba(0,0,0,0.58)'); g.addColorStop(1, 'rgba(0,0,0,0.92)');
    ctx.fillStyle = g; ctx.fillRect(sx - rpx, sy - rpx, rpx * 2, rpx * 2);
  }
  const lg = ctx.createRadialGradient(sx, sy, rpx * 0.72, sx, sy, rpx); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, `rgba(0,0,0,${L.sun ? 0.25 : 0.35})`);
  ctx.fillStyle = lg; ctx.fillRect(sx - rpx, sy - rpx, rpx * 2, rpx * 2);
  ctx.restore();
  drawNorthMark(b, sx, sy, rpx);
}
// pôle nord de la Terre : un point blanc et un « N », tant qu'il est devant
function drawNorthMark(b, sx, sy, rpx) {
  if (b !== EARTHB || rpx <= 40) return;
  const [nx, ny] = surfPt(b.surf, sx, sy, 0, -rpx * Math.cos(toRad(b.surf.view.lat)));
  ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(nx, ny, 3, 0, 7); ctx.fill(); ctx.stroke();
  lbl('N', nx + 7, ny + 4, '#fff', 11, 700);
}

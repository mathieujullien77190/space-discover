// Dessin : la scène complète, image par image.
function draw(t) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (launchView) { drawLaunch(t); return; }   // lancement depuis Kourou (js/launch-view.js) : remplace la scène
  if (issFollow && ISS) { drawIssFollow(t); return; }   // vue de suivi de l'ISS (js/iss-follow.js) : remplace toute la scène
  const k = viewK(), c = curCenter(), R = Math.exp(logR);
  ctx.fillStyle = '#03040a'; ctx.fillRect(0, 0, W, H);
  if (LAYERS.stars) for (const s of stars) { ctx.globalAlpha = 0.2 + 0.5 * (0.5 + 0.5 * Math.sin(t * s.q + s.p)); ctx.fillStyle = '#fff'; ctx.fillRect(s.x * W, s.y * H, s.s, s.s); }
  ctx.globalAlpha = 1;
  const sunS = toScreen(c, k, 0, 0);
  hits = []; lblBoxes.length = 0; labelHits.length = 0;

  // orbites des planètes (ellipses héliocentriques)
  for (const p of PLANETS) {
    if (!LAYERS.planetOrbits || p.a * AU * k < 4) continue;
    ctx.strokeStyle = focus === p ? 'rgba(255,210,74,0.5)' : 'rgba(160,185,235,0.16)'; ctx.lineWidth = 1;
    drawPlanetOrbit(p, c, k);
  }
  // orbites des lunes (cercles autour de leur planète)
  for (const m of MOONS) {
    const rp = m.a * k; if (!LAYERS.moons || !LAYERS.moonOrbits || rp < 6) continue;
    const ps = toScreen(c, k, pos[m.parent.idx][0], pos[m.parent.idx][1]);
    if (rp < 2500 && (ps[0] < -rp - 50 || ps[0] > W + rp + 50 || ps[1] < -rp - 50 || ps[1] > H + rp + 50)) continue;
    ctx.strokeStyle = focus === m ? 'rgba(255,210,74,0.5)' : 'rgba(190,200,230,0.18)'; ctx.lineWidth = 1;
    drawMoonOrbit(m, ps, rp, c, k);
  }
  if (R > 3e10) drawFar(c, k, sunS, R);   // héliopause, nuage d'Oort, années-lumière, étoiles voisines
  // halo du Soleil, de loin
  { const rp = Math.max(SUN.R * k, 3);
    const g = ctx.createRadialGradient(sunS[0], sunS[1], rp * 0.5, sunS[0], sunS[1], Math.max(rp * 2.6, 26));
    g.addColorStop(0, 'rgba(255,210,90,0.5)'); g.addColorStop(1, 'rgba(255,210,90,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sunS[0], sunS[1], Math.max(rp * 2.6, 26), 0, 7); ctx.fill(); }

  // orbites des comètes et des sondes qui tournent, traces des sondes
  const Rv = Math.hypot(W, H) / 2 / k, far = R > 4e11;
  if (!far) {
    for (const cm of COMETS) {
      if (!LAYERS.comets || !LAYERS.cometOrbits) break;
      ctx.strokeStyle = focus === cm ? 'rgba(150,215,255,0.55)' : 'rgba(150,215,255,0.15)'; ctx.lineWidth = 1;
      strokeClipped(conicPts(cm.par, cm.e, cm.nu, cm.rNow, cm.nuLim, Rv, (x, y) => [cm.m[0] * x + cm.m[1] * y, cm.m[2] * x + cm.m[3] * y], 0, 0, c, k));
    }
    for (const p of PROBES) {
      if (!LAYERS.probes || !LAYERS.trails || simT < p.t0 || p.sat) continue;   // l'ISS n'a ni orbite ni trace tracées : seulement sa position
      if (p.kep || (p.orb && simT > p.tArr && simT <= p.tEnd)) {   // orbite autour du Soleil ou de la planète, exacte près de la sonde
        const host = p.kep ? [0, 0] : pos[p.nodes[p.nodes.length - 1].body.idx], o = p.kep || p.orb, cw = Math.cos(o.w), sw = Math.sin(o.w);
        ctx.strokeStyle = hexA(p.color, 0.4); ctx.lineWidth = 1;
        strokeClipped(conicPts(o.a * (1 - o.e * o.e), o.e, p.nu, Math.hypot(p.pos3[0] - host[0], p.pos3[1] - host[1]), Math.PI, Rv, (x, y) => [x * cw - y * sw, x * sw + y * cw], host[0], host[1], c, k));
      }
      const [t0, t1] = trailRange(p, simT);
      if (t1 > t0) {
        const N = 400, tp = [];
        for (let i = 0; i <= N; i++) { const q = probePos3(p, t0 + (t1 - t0) * i / N); tp.push(toScreen(c, k, q[0], q[1])); }
        ctx.strokeStyle = hexA(p.color, focus === p ? 0.75 : 0.35); ctx.lineWidth = 1.4; strokeClipped(tp);
      }
    }
  }
  { const frame = b => { const e = pos[b.idx], es = toScreen(c, k, e[0], e[1]), ang = Math.atan2(sunS[1] - es[1], sunS[0] - es[0]), right = Math.cos(ang) >= 0; return [right ? ang : ang + (ang > 0 ? -Math.PI : Math.PI), right]; };   // globe tourné : Soleil à droite ou à gauche
    for (const sb of SURFACES) [sb.surf.psi, sb.surf.sunRight] = frame(sb); }
  // corps : grands d'abord, lunes ensuite
  const order = [SUN, ...PLANETS, ...(LAYERS.moons ? MOONS : [])];
  for (const b of order) {
    const pp = pos[b.idx], s = toScreen(c, k, pp[0], pp[1]), rpx = b.R * k;
    const hitR = Math.max(rpx, 11);
    if (s[0] < -rpx - 40 || s[0] > W + rpx + 40 || s[1] < -rpx - 40 || s[1] > H + rpx + 40) continue;
    // une lune dont l'orbite se réduit à quelques pixels se confond avec sa planète
    if (b.parent && b.parent !== SUN && b.a * k < 9 && focus !== b) continue;
    if (rpx > 3e4) { drawHugeDisc(b, s, rpx, sunS); continue; }
    drawSphere(b, s[0], s[1], rpx, b === SUN ? null : sunS);
    if (b === EARTHB) earthDraw = { sx: s[0], sy: s[1], rpx };   // où la Terre est à l'écran (clic sur un pays : js/country-view.js)
    if (b === EARTHB && rpx > 40 && LAYERS.pins) drawMeteoPins(s[0], s[1], rpx);
    if (b === EARTHB && rpx > 500 && LAYERS.borders) drawEarthBorders(b, s[0], s[1], rpx);   // frontières, pays, villes (données chargées à la demande)
    if (b.surf && rpx > 60 && LAYERS.names) drawSurfaceLabels(b, s[0], s[1], rpx);
    if (b === EARTHB && selCountry) drawCountryReticle(s[0], s[1], rpx);
    if (focus === b) { ctx.strokeStyle = 'rgba(255,210,74,0.8)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(s[0], s[1], Math.max(rpx, 6) + 8, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    // étiquette
    const orbPx = b === SUN ? 1e9 : (b.parent === SUN ? b.a * AU * k : b.a * k);
    if (focus === b || (orbPx > (b.parent === SUN ? 10 : 38) && rpx < 260)) lbl(b.name, s[0] + Math.max(rpx, 3) + 6, s[1] - 4, focus === b ? '#fff' : (b.parent === SUN ? '#a9bde6' : '#97a8cf'), b.parent === SUN ? 12 : 11, focus === b ? 700 : 400, b);
    hits.push({ b, x: s[0], y: s[1], r: hitR });
  }
  if (!far) {
    for (const cm of LAYERS.comets ? COMETS : []) {
      const s = toScreen(c, k, pos[cm.idx][0], pos[cm.idx][1]);
      if (s[0] < -60 || s[0] > W + 60 || s[1] < -60 || s[1] > H + 60) continue;
      drawComet(cm, s, k);
      if (focus === cm) { ctx.strokeStyle = 'rgba(190,230,255,0.85)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(s[0], s[1], 13, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
      if (focus === cm || lblFree(s[0] + 9, s[1] - 6, cm.name.length * 6.5, 12)) lbl(cm.name, s[0] + 9, s[1] - 6, '#bfe6ff', 11, focus === cm ? 700 : 400, cm);
      hits.push({ b: cm, x: s[0], y: s[1], r: 12 });
    }
    for (const p of LAYERS.probes ? PROBES : []) {   // une sonde est minuscule à l'échelle : un repère de taille fixe en pixels
      if (simT < p.t0 || simT > p.tEnd || (p.sat && R > 2e7)) continue;   // l'ISS est confondue avec la Terre dès qu'on dézoome
      const s = toScreen(c, k, pos[p.idx][0], pos[p.idx][1]);
      if (s[0] < -40 || s[0] > W + 40 || s[1] < -40 || s[1] > H + 40) continue;
      const model = p.sat && issModelPx(k) >= 16 && drawIssModel(p, s, k);   // l'ISS zoomée : son modèle SVG à l'échelle remplace le repère
      if (!model) { ctx.fillStyle = p.color; ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s[0], s[1] - 5); ctx.lineTo(s[0] + 5, s[1]); ctx.lineTo(s[0], s[1] + 5); ctx.lineTo(s[0] - 5, s[1]); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      if (focus === p && !model) { ctx.strokeStyle = hexA(p.color, 0.85); ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(s[0], s[1], 12, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
      if (focus === p || lblFree(s[0] + 10, s[1] - 6, p.name.length * 6.8, 12)) lbl(p.name, s[0] + (model ? issModelPx(k) / 2 + 8 : 10), s[1] - 6, '#ffe9a0', 12, 700, p);
      hits.push({ b: p, x: s[0], y: s[1], r: model ? Math.min(issModelPx(k) / 2, 600) : 12 });
    }
  }
}

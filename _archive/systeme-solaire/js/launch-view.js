// Vue du lancement depuis Kourou (js/launch.js calcule la trajectoire, ce fichier la joue et la dessine).
// La caméra suit la fusée, « haut » = verticale locale (l'horizon reste en bas). L'échelle est vraie (la fusée de 54 m est vue à sa vraie taille au décollage, puis réduite à un repère de taille mini) :
// la caméra s'éloigne avec l'altitude ; une fois en orbite, elle recule pour montrer la Terre entière et l'orbite. Temps de vol réel par défaut (×1), accélérable ; la date de la simulation du système solaire n'est pas touchée.
let launchView = false;
let launch = null;   // { sim (résultat de simulateLaunch), t (s de vol), speed (×), playing, target, debris[], last }
const LAUNCH_SPEEDS = [1, 5, 20, 60, 200];
const LAUNCH_TARGET_DEFAULT = 400, LAUNCH_TARGET_MIN = 200, LAUNCH_TARGET_MAX = 2500;
const lerpN = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k)), smooth = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };

function startLaunch(target) {
  target = Math.max(100, Math.min(LAUNCH_TARGET_MAX, +target || LAUNCH_TARGET_DEFAULT));   // le curseur commence à 200 km ; en dessous la fusée retombe
  const sim = simulateLaunch(target);
  launch = { sim, t: 0, speed: launch ? launch.speed : 1, playing: true, target, debris: [], last: null };
  launchView = true; selMeteo = null; selStar = null; issFollow = false; selCountry = null; focus = EARTHB; overview = false; menu = null;
  buildChips(); showInfo(); return launch;
}
function setLaunchView(on) { if (on && !launchView) startLaunch(launch ? launch.target : LAUNCH_TARGET_DEFAULT); else if (!on) { launchView = false; buildChips(); showInfo(); } }

// état à l'instant t (s de vol) : interpolation entre échantillons ; après l'insertion, orbite circulaire (mouvement moyen)
function launchSample(sim, t) {
  const S = sim.samples, n = S.length; if (!n) return null;
  if (t <= 0) return S[0];
  const tEnd = S[n - 1].t;
  if (t >= tEnd) {   // en orbite : on prolonge sur le cercle
    const e = S[n - 1], r0 = Math.hypot(e.x, e.y), E = (e.vx * e.vx + e.vy * e.vy) / 2 - LCH.MU / r0, aa = -LCH.MU / (2 * E), r = aa, w = Math.sqrt(LCH.MU / (aa * aa * aa)), a0 = Math.atan2(e.y, e.x), a = a0 + w * (t - tEnd);   // cercle de rayon = demi-grand axe, au mouvement moyen exact
    const x = r * Math.cos(a), y = r * Math.sin(a), v = Math.sqrt(LCH.MU / r);
    return Object.assign({}, e, { t, x, y, vx: -v * Math.sin(a), vy: v * Math.cos(a), alt: r - LCH.RE, v, vr: 0, vt: v, F: 0, acc: 0, q: 0, eap: false, epc: false, esc: false, phase: 'en orbite', phi: 0, orbiting: true });
  }
  const i = Math.min(n - 2, Math.floor(t / LCH.SAMPLE)), a = S[i], b = S[i + 1], k = (t - a.t) / (b.t - a.t);
  const L = key => a[key] + (b[key] - a[key]) * k;
  return Object.assign({}, a, { t, x: L('x'), y: L('y'), vx: L('vx'), vy: L('vy'), alt: L('alt'), v: L('v'), vr: L('vr'), vt: L('vt'), m: L('m'), acc: L('acc'), q: L('q'), phi: L('phi') });
}
const fmtT = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(ss).padStart(2, '0'); };

// ---------- pièces larguées : trajectoire balistique (gravité seule) depuis l'état de l'événement ----------
function launchDebris(sim, t) {
  const L = LCH, D = launch.debris, defs = [['eap', 'Boosters', '#e8ecf2', 14], ['fairing', 'Coiffe', '#dfe6f0', 6], ['epcsep', 'Étage principal', '#e0903f', 18]];
  for (const [key, name, color, size] of defs) {
    const e = sim.events.find(q => q.key === key); if (!e || t < e.t) { const i = D.findIndex(d => d.key === key); if (i >= 0) D.splice(i, 1); continue; }
    let d = D.find(q => q.key === key); if (!d || d.t > t) { d = { key, name, color, size, x: e.x, y: e.y, vx: e.vx, vy: e.vy, t: e.t, dead: false }; const i = D.findIndex(q => q.key === key); if (i >= 0) D[i] = d; else D.push(d); }
    while (d.t < t && !d.dead) {
      const dt = Math.min(0.5, t - d.t), r = Math.hypot(d.x, d.y), g = L.MU / (r * r), h = r - L.RE, vr = Math.hypot(d.vx, d.vy), drag = 0.5 * lchRho(h) * vr * 0.8 * (d.key === 'fairing' ? 1 : 40) / 8000;   // freinage grossier
      d.vx += (-g * d.x / r - drag * d.vx) * dt; d.vy += (-g * d.y / r - drag * d.vy) * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.t += dt;
      if (Math.hypot(d.x, d.y) <= L.RE) d.dead = true;
    }
  }
}

// ---------- dessin ----------
function drawRocketIcon(px, py, ang, ps, s, flame, pivot) {   // pied de la fusée en (px, py), axe dirigé selon `ang` (rad, 0 = vers le haut de l'écran)
  ctx.save(); ctx.translate(px, py); ctx.rotate(ang); ctx.scale(ps, -ps); ctx.translate(0, -pivot);   // unités : mètres, y vers le haut de la fusée ; (px, py) = pied de la fusée au décollage, milieu de l'empilement ensuite
  const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  if (flame > 0) {   // flamme
    const len = 8 + 40 * flame * (0.85 + 0.3 * Math.random()), g = ctx.createLinearGradient(0, 0, 0, -len); g.addColorStop(0, 'rgba(255,245,200,0.95)'); g.addColorStop(0.35, 'rgba(255,170,60,0.85)'); g.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-2.4, 0); ctx.lineTo(0, -len); ctx.lineTo(2.4, 0); ctx.closePath(); ctx.fill();
    if (s.eapAttached && s.eap) { for (const sx of [-4.2, 4.2]) { ctx.beginPath(); ctx.moveTo(sx - 1.3, 0); ctx.lineTo(sx, -len * 0.8); ctx.lineTo(sx + 1.3, 0); ctx.closePath(); ctx.fill(); } }
  }
  if (s.epcAttached) rect(-2.7, 0, 5.4, 23, '#d9d4cc');
  if (s.epcAttached) rect(-2.7, 0, 5.4, 2.5, '#444');
  const yEsc = s.epcAttached ? 23 : 0;
  rect(-2.7, yEsc, 5.4, 4.6, '#9aa3b2');
  if (s.fairing) { rect(-2.7, yEsc + 4.6, 5.4, 9, '#f2f5fa'); ctx.fillStyle = '#f2f5fa'; ctx.beginPath(); ctx.moveTo(-2.7, yEsc + 13.6); ctx.quadraticCurveTo(-2.4, yEsc + 21, 0, yEsc + 22); ctx.quadraticCurveTo(2.4, yEsc + 21, 2.7, yEsc + 13.6); ctx.closePath(); ctx.fill(); }
  else { rect(-1.2, yEsc + 4.6, 2.4, 2.2, '#c8b878'); rect(-4.2, yEsc + 5.2, 3, 1.1, '#4a78c8'); rect(1.2, yEsc + 5.2, 3, 1.1, '#4a78c8'); }   // satellite exposé
  if (s.eapAttached) for (const sx of [-5.6, 2.6]) { rect(sx, 0, 3, 30, '#f4f4f4'); ctx.fillStyle = '#f4f4f4'; ctx.beginPath(); ctx.moveTo(sx, 30); ctx.lineTo(sx + 1.5, 33.5); ctx.lineTo(sx + 3, 30); ctx.closePath(); ctx.fill(); rect(sx, 0, 3, 1.6, '#555'); }
  ctx.restore();
}
function drawSatelliteIcon(px, py, ang, size) {
  ctx.save(); ctx.translate(px, py); ctx.rotate(ang); ctx.fillStyle = '#4a78c8'; ctx.fillRect(-size * 1.9, -size * 0.25, size * 1.2, size * 0.5); ctx.fillRect(size * 0.7, -size * 0.25, size * 1.2, size * 0.5);
  ctx.fillStyle = '#d8c070'; ctx.fillRect(-size * 0.5, -size * 0.5, size, size); ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeRect(-size * 0.5, -size * 0.5, size, size); ctx.restore();
}

function drawLaunch(t) {
  hits = []; lblBoxes.length = 0; labelHits.length = 0;
  const Lc = launch; if (!Lc) return; const sim = Lc.sim, now = performance.now(), dtReal = Lc.last === null ? 0 : Math.min(0.1, (now - Lc.last) / 1000); Lc.last = now;
  if (Lc.playing) Lc.t += dtReal * Lc.speed;
  const tEnd = sim.samples.length ? sim.samples[sim.samples.length - 1].t : 0, s0 = launchSample(sim, Lc.t); if (!s0) return;
  launchDebris(sim, Lc.t);
  const r = Math.hypot(s0.x, s0.y), alt = r - LCH.RE, ux = s0.x / r, uy = s0.y / r, ex = -uy, ey = ux;
  // caméra : demi-hauteur de vue Rv (m) et fondu vers la vue « Terre entière » après l'insertion
  const wOrbit = sim.ok ? smooth((Lc.t - tEnd) / 6) : 0, Rv = lerpN(300 + 1.6 * alt, 1.7 * r, wOrbit), sc = (H / 2) / Rv, w = wOrbit;
  const cx = W * 0.5, cy = H * 0.62;   // la fusée est un peu sous le centre : plus de place pour ce qui est devant
  const toS = (X, Y) => [cx + X * sc, cy - (Y - (1 - w) * r) * sc];   // repère tourné (X vers l'est, Y vers le haut local), Terre au centre en (0, 0)
  const view = (px, py) => toS(px * ex + py * ey, px * ux + py * uy);   // monde inertiel -> écran
  // ciel : bleu près du sol, noir au-dessus de ~90 km
  const sky = smooth(1 - alt / 90000); { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, `rgb(${Math.round(2 + 20 * sky)},${Math.round(3 + 70 * sky)},${Math.round(10 + 150 * sky)})`); g.addColorStop(1, `rgb(${Math.round(4 + 110 * sky)},${Math.round(8 + 150 * sky)},${Math.round(20 + 190 * sky)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  if (sky < 0.85) for (const q of stars) { ctx.globalAlpha = (1 - sky) * (0.2 + 0.5 * (0.5 + 0.5 * Math.sin(t * q.q + q.p))); ctx.fillStyle = '#fff'; ctx.fillRect(q.x * W, q.y * H, q.s, q.s); }
  ctx.globalAlpha = 1;
  // Terre : courbe de l'horizon exacte à toute échelle (formule stable : y = (R - sqrt(R² - x²)) ≈ x² / (R + sqrt(R² - x²)))
  const earthC = toS(0, 0), Rpx = LCH.RE * sc;
  const curve = (Rm, fill, style) => {
    const Rp = Rm * sc; ctx.beginPath();
    if (Rp < 4e4) { ctx.arc(earthC[0], earthC[1], Rp, 0, 7); }
    else { const top = earthC[1] - Rp; ctx.moveTo(-10, H + 10); for (let i = 0; i <= 60; i++) { const x = -10 + (W + 20) * i / 60, dx = x - earthC[0], u = Math.min(0.999999, Math.abs(dx) / Rp); ctx.lineTo(x, top + dx * dx / (Rp * (1 + Math.sqrt(1 - u * u)))); } ctx.lineTo(W + 10, H + 10); ctx.closePath(); }
    if (fill) { ctx.fillStyle = style; ctx.fill(); } else { ctx.strokeStyle = style; ctx.stroke(); }
  };
  { const atmo = ctx.createRadialGradient(earthC[0], earthC[1], Math.max(1, Rpx), earthC[0], earthC[1], Rpx + 120000 * sc + 1); const aa = smooth(alt / 300000) * 0.5 + 0.2;
    if (Rpx < 4e4) { atmo.addColorStop(0, `rgba(120,185,255,${aa})`); atmo.addColorStop(1, 'rgba(120,185,255,0)'); ctx.fillStyle = atmo; ctx.beginPath(); ctx.arc(earthC[0], earthC[1], Rpx + 120000 * sc, 0, 7); ctx.fill(); }
    else { const yh = earthC[1] - Rpx; const g = ctx.createLinearGradient(0, yh - 100000 * sc, 0, yh + 5); g.addColorStop(0, 'rgba(120,185,255,0)'); g.addColorStop(1, 'rgba(140,200,255,0.55)'); ctx.fillStyle = g; ctx.fillRect(0, Math.max(-5, yh - 100000 * sc), W, Math.min(H, 100000 * sc + 5)); } }
  { const g = Rpx < 4e4 ? ctx.createRadialGradient(earthC[0] - Rpx * 0.3, earthC[1] - Rpx * 0.3, Rpx * 0.1, earthC[0], earthC[1], Rpx) : ctx.createLinearGradient(0, earthC[1] - Rpx, 0, H);
    g.addColorStop(0, Rpx < 4e4 ? '#4f9bd8' : '#3d7a4a'); g.addColorStop(1, Rpx < 4e4 ? '#17407a' : '#1f4e86'); curve(LCH.RE, true, g); }
  // repères sur le sol : tous les 2° de longitude (la Terre tourne), et le pas de tir
  const thR = Math.atan2(s0.y, s0.x), wEff = LCH.WE * Math.cos(LCH.LAT * Math.PI / 180), thSite = wEff * Lc.t;
  const pt = (th, R) => view(R * Math.cos(th), R * Math.sin(th));
  if (Rpx > 30) { ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; const step = 2 * Math.PI / 180, span = Math.min(Math.PI, (W / sc) / LCH.RE * 1.2 + 0.05); const k0 = Math.ceil((thR - span - thSite) / step), k1 = Math.floor((thR + span - thSite) / step);
    if (k1 - k0 < 400) for (let k = k0; k <= k1; k++) { const th = thSite + k * step, a = pt(th, LCH.RE), b = pt(th, LCH.RE - Math.max(8, 15000 * sc) / sc); if (a[0] < -20 || a[0] > W + 20) continue; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } }
  const site = pt(thSite, LCH.RE);
  if (Math.abs(((thR - thSite + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) < 0.5 || Lc.t < 30) {   // pas de tir et tour de lancement
    ctx.fillStyle = '#c9c9c9'; ctx.fillRect(site[0] - 22 * Math.min(sc, 1.5), site[1] - 3, 44 * Math.min(sc, 1.5), 6);
    if (sc > 0.3) { ctx.fillStyle = '#8a8f99'; ctx.fillRect(site[0] + 14 * sc, site[1] - 80 * sc, 6 * sc, 80 * sc); }
    ctx.fillStyle = '#fff'; ctx.font = '700 12px system-ui, sans-serif'; ctx.textAlign = 'left'; if (site[0] > 0 && site[0] < W && site[1] > 0 && site[1] < H + 40) ctx.fillText('Kourou · Centre spatial guyanais', site[0] + 28, site[1] + 18);
  }
  // orbite osculatrice (pointillés) dès qu'on est au-dessus de l'atmosphère
  if (alt > 100000) {
    const v2 = s0.vx * s0.vx + s0.vy * s0.vy, rv = s0.x * s0.vx + s0.y * s0.vy, evx = ((v2 - LCH.MU / r) * s0.x - rv * s0.vx) / LCH.MU, evy = ((v2 - LCH.MU / r) * s0.y - rv * s0.vy) / LCH.MU, e = Math.hypot(evx, evy), el = lchElements(r, s0.vr, s0.vt), w0 = Math.atan2(evy, evx);
    if (el.E < 0) { const pts = []; for (let i = 0; i <= 240; i++) { const nu = 2 * Math.PI * i / 240, rr = el.p / (1 + e * Math.cos(nu)), a = w0 + nu; pts.push(view(rr * Math.cos(a), rr * Math.sin(a))); }
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.3; ctx.setLineDash([7, 6]); strokeClipped(pts); ctx.setLineDash([]); }
  }
  // sillage (trajectoire déjà parcourue)
  { const S = sim.samples, nUp = Math.min(S.length - 1, Math.floor(Lc.t / LCH.SAMPLE)), step = Math.max(1, Math.floor(nUp / 900)), pts = []; for (let i = 0; i <= nUp; i += step) pts.push(view(S[i].x, S[i].y)); pts.push(view(s0.x, s0.y));
    ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2.2; strokeClipped(pts); }
  // pièces larguées
  for (const d of launch.debris) { if (d.dead) continue; const p = view(d.x, d.y); if (p[0] < -40 || p[0] > W + 40 || p[1] < -40 || p[1] > H + 40) continue; ctx.fillStyle = d.color; ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.fillRect(p[0] - 3, p[1] - d.size / 2, 6, d.size); ctx.strokeRect(p[0] - 3, p[1] - d.size / 2, 6, d.size); ctx.fillStyle = '#e7edf8'; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(d.name, p[0] + 9, p[1] + 4); }
  // la fusée (ou le satellite)
  const P = view(s0.x, s0.y), ang = Math.PI / 2 - (s0.phi || Math.PI / 2), ps = Math.max(0.35, Math.min(1.6, sc)), sim54 = 54 * ps;
  const flame = s0.eap || s0.epc || s0.esc ? Math.min(1, (s0.F || 0) / 1.4e7) * (s0.eap ? 1 : s0.epc ? 0.55 : 0.2) : 0;
  const stackH = 54 * sc;
  if (s0.orbiting || (sim.ok && Lc.t > tEnd)) { drawSatelliteIcon(P[0], P[1], Math.atan2(-(s0.vx * ux + s0.vy * uy), s0.vx * ex + s0.vy * ey), 9); ctx.fillStyle = '#fff'; ctx.font = '700 13px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('Satellite · ' + fmt(Math.round(alt / 1000)) + ' km', P[0] + 22, P[1] - 12); }
  else {
    if (stackH < 14) { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(P[0], P[1] - 7); ctx.lineTo(P[0] + 5, P[1] + 5); ctx.lineTo(P[0] - 5, P[1] + 5); ctx.closePath(); ctx.fill(); ctx.stroke(); if (flame > 0) { ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(P[0], P[1] + 9, 3 + 3 * flame, 0, 7); ctx.fill(); } }
    else drawRocketIcon(P[0], P[1], ang, sc >= 0.35 ? Math.min(sc, 1.6) : 0.35, s0, flame, 27 * Math.min(1, alt / 2000));
    ctx.fillStyle = '#fff'; ctx.font = '700 13px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('Ariane 5 (simplifiée)', P[0] + Math.max(24, stackH * 0.4 + 20), P[1] - Math.max(10, stackH * 0.4));
  }
  // télémétrie
  const dr = ((thR - thSite) * LCH.RE) / 1000, phaseTxt = Lc.t < 0.01 ? 'au sol' : s0.orbiting || (sim.ok && Lc.t > tEnd) ? 'en orbite' : s0.phase;
  const lines = [['Lancement depuis Kourou', '#fff', 17, 700], ['T+ ' + fmtT(Lc.t) + ' · ' + phaseTxt + (Lc.playing ? '' : ' (pause)') + ' · temps ×' + Lc.speed, '#ffe9a0', 14, 700],
    ['Altitude ' + (alt < 10000 ? fmt(Math.round(alt)) + ' m' : fmt1(alt / 1000, 1).replace('.', ',') + ' km') + ' · vitesse ' + fmt(Math.round(s0.v * 3.6)) + ' km/h (' + fmt1(s0.v / 1000, 2).replace('.', ',') + ' km/s)', '#fff', 14, 700],
    ['Accélération ' + fmt1(s0.acc || 0, 1).replace('.', ',') + ' g · pression dynamique ' + fmt1((s0.q || 0) / 1000, 1).replace('.', ',') + ' kPa' + (sim.maxQ && Math.abs(Lc.t - sim.maxQ.t) < 8 ? '  ← Max-Q' : ''), '#a9bde6', 12.5, 400],
    ['Masse ' + fmt(Math.round((s0.m || 0) / 1000)) + ' t · poussée ' + fmt(Math.round((s0.F || 0) / 1000)) + ' kN · distance au pas de tir ' + fmt(Math.round(Math.max(0, dr))) + ' km', '#a9bde6', 12.5, 400]];
  if (!sim.ok) lines.push(['⚠ Cette altitude n’est pas atteignable : la fusée retombe', '#ff9d85', 13, 700]);
  const px = 16, py = 62, pw = Math.min(W - 32, 560), ph = 14 + lines.reduce((a, l) => a + l[2] + 9, 0);
  ctx.fillStyle = 'rgba(8,12,28,0.72)'; ctx.strokeStyle = 'rgba(160,185,235,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.fill(); ctx.stroke();
  let y = py + 12; ctx.textAlign = 'left'; for (const [txt, col, size, weight] of lines) { y += size; ctx.fillStyle = col; ctx.font = weight + ' ' + size + 'px system-ui, sans-serif'; ctx.fillText(txt, px + 12, y); y += 9; }
  // frise des événements
  { const x0 = 16, x1 = W - 16, yb = H - 34, T = Math.max(tEnd, 1); ctx.strokeStyle = 'rgba(200,215,245,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, yb); ctx.lineTo(x1, yb); ctx.stroke();
    ctx.strokeStyle = '#ffd24a'; ctx.beginPath(); ctx.moveTo(x0, yb); ctx.lineTo(x0 + (x1 - x0) * Math.min(1, Lc.t / T), yb); ctx.stroke();
    ctx.font = '10.5px system-ui, sans-serif'; ctx.textAlign = 'center'; let lastX = -1e9;
    for (const e of sim.events) { const xx = x0 + (x1 - x0) * e.t / T; ctx.fillStyle = e.t <= Lc.t ? '#ffd24a' : '#92a6d6'; ctx.beginPath(); ctx.arc(xx, yb, 3.5, 0, 7); ctx.fill(); if (xx - lastX > 92) { ctx.fillText(fmtT(e.t), xx, yb + 16); lastX = xx; } }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x0 + (x1 - x0) * Math.min(1, Lc.t / T), yb, 5, 0, 7); ctx.fill(); }
  ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = '#c8d6f5'; ctx.fillText('Échap : quitter · échelle vraie, fusée dessinée à sa vraie taille jusqu’à ~30 km puis en repère', W - 16, H - 8);
  // échelle
  { const nice = [1, 2, 5]; let len = 100 / sc, mag = Math.pow(10, Math.floor(Math.log10(len))), best = mag; for (const m of nice) if (m * mag <= len) best = m * mag; const bx = 16, by = H - 62; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + best * sc, by); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.font = '12px system-ui, sans-serif'; ctx.fillText(best >= 1000 ? fmt(best / 1000) + ' km' : fmt(best) + ' m', bx, by - 6); }
  if (Lc.playing && (Lc.t > tEnd + 3 * 3600)) Lc.playing = false;
}

// ---------- fiche ----------
function showLaunchPanel() {
  const Lc = launch, sim = Lc.sim, o = sim.orbit, alt = x => fmt(Math.round((x - LCH.RE) / 1000)) + ' km';
  const evs = sim.events.map((e, i) => `<li data-t="${e.t}"><b>${fmtT(e.t)}</b> ${e.label} <small>${fmt(Math.round(e.alt / 1000))} km · ${fmt1(e.v / 1000, 2).replace('.', ',')} km/s</small></li>`).join('');
  infoEl.innerHTML = `<h2>🚀 Lancement depuis Kourou</h2><div class="meta">Fusée de type Ariane 5 simplifiée → satellite en orbite basse</div>
    <div class="above"><label>Altitude visée <small id="lAltV">${fmt(Lc.target)} km</small><input id="lAlt" class="sl" type="range" min="${LAUNCH_TARGET_MIN}" max="${LAUNCH_TARGET_MAX}" step="10" value="${Lc.target}"></label>
    <div class="btns" id="lBtns"></div></div>
    <dl><dt>Orbite obtenue</dt><dd>${sim.ok ? alt(o.rp) + ' × ' + alt(o.ra) + ' · excentricité ' + fmt1(o.e, 4) : '<b>non atteinte</b>'}</dd>${sim.ok ? `<dt>Période</dt><dd>${fmt1(o.T / 60, 1)} min</dd><dt>Inclinaison</dt><dd>≈ ${fmt1(LCH.LAT, 1)}° (lancement plein est depuis 5,2° N)</dd><dt>Durée du lancement</dt><dd>${fmtT(sim.tEnd)}</dd><dt>Pression dynamique max.</dt><dd>${fmt1(sim.maxQ.q / 1000, 0)} kPa à T+${fmtT(sim.maxQ.t)}</dd>` : ''}</dl>
    <ul class="evs">${evs}</ul>
    <p class="note">Simulation simplifiée : plan 2D vers l’est, gravité, traînée, poussée et masses de l’ordre de l’Ariane 5 ECA (valeurs de mémoire, à vérifier), guidage idéal, sans vent ni dispersion. Temps de vol réel par défaut ; clique un événement pour y aller.</p>`;
  const btns = document.getElementById('lBtns'); if (!btns) return;
  btns.append(mkBtn('▶ Lancer', true, () => startLaunch(+document.getElementById('lAlt').value)));
  btns.append(mkBtn(Lc.playing ? '⏸ Pause' : '▶ Reprendre', false, () => { Lc.playing = !Lc.playing; showLaunchPanel(); }));
  btns.append(mkBtn('⏭ Événement suivant', false, () => { const e = sim.events.find(q => q.t > Lc.t + 1); if (e) Lc.t = Math.max(0, e.t - 3); Lc.playing = true; }));
  btns.append(document.createElement('br'));
  for (const v of LAUNCH_SPEEDS) btns.append(mkBtn('×' + v, Lc.speed === v, () => { Lc.speed = v; showLaunchPanel(); }));
  btns.append(document.createElement('br'));
  for (const [label, a] of [['ISS 400 km', 400], ['Starlink 550 km', 550], ['Orbite 1 000 km', 1000], ['Haute 2 000 km', 2000]]) btns.append(mkBtn(label, Lc.target === a, () => startLaunch(a)));
  btns.append(mkBtn('Quitter', false, () => { launchView = false; buildChips(); showInfo(); }));
  const sl = document.getElementById('lAlt'); if (sl) { sl.addEventListener('input', () => { const el = document.getElementById('lAltV'); if (el) el.textContent = fmt(+sl.value) + ' km'; }); }
  for (const li of infoEl.querySelectorAll ? infoEl.querySelectorAll('li[data-t]') : []) li.addEventListener('click', () => { Lc.t = Math.max(0, +li.dataset.t - 3); Lc.playing = true; });
}

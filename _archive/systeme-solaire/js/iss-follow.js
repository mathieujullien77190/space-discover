// Vue de suivi de l'ISS : une coupe schématique dans le plan de son orbite, vue de côté, depuis un observateur qui vole à 200 km d'altitude, parallèlement à la station (400 km).
// On y voit : la courbure de la Terre, les deux trajectoires (pointillés), le trait en pointillé de 200 km entre l'observateur et l'ISS, la vitesse, la taille et le point survolé.
// Schématique : l'échelle des distances est réelle (horizontale = verticale : 200 km entre les deux trajectoires, rayon de la Terre 6 378 km) mais la station, qui ferait 0,1 px, est
// dessinée agrandie (le facteur est affiché). TOUT BOUGE : le sol défile sous l'observateur à la vitesse réelle de l'ISS (plafonnée à 200 km/s d'image pour rester fluide quand on accélère le temps),
// des plaques de terre et de nuages défilent avec lui, et une mini-carte montre l'ISS qui tourne autour de la Terre à son rythme réel (un tour en 93 min). À l'entrée dans la vue la vitesse de
// simulation passe au TEMPS RÉEL (×1) ; on l'accélère avec la barre du bas ; elle est rétablie à la sortie si on ne l'a pas changée.
let issFollow = false;   // vue de suivi active ?
const ISS_FOLLOW_ALT = 200;   // km : altitude de l'observateur
const EARTH_GM = 398600.4418, EARTH_R_EQ = 6378.137;

const ISS_FOLLOW_SPEED = 1 / 86400;   // jours simulés par seconde : le temps réel (×1) par défaut
let issFollowRun = 0, issFollowLastT = null, issFollowLastSim = 0, issFollowPrevSpeed = null;   // distance parcourue au sol (km, plafonnée), repères du pas précédent, vitesse à rétablir
const ISS_PATCHES = (() => { const r = rng(31); return Array.from({ length: 16 }, () => ({ at: r() * 10000, w: 150 + r() * 650, col: r() < 0.55 ? 'rgba(88,150,72,0.55)' : r() < 0.6 ? 'rgba(235,240,245,0.5)' : 'rgba(205,170,110,0.5)' })); })();   // plaques de terre, de nuages, de désert

function setIssFollow(on) {
  on = !!on && !!ISS;
  if (on && !issFollow) {   // entrée : on accélère le temps pour que ça tourne (sauf s'il va déjà vite) ; la position reste ce qu'elle est
    issFollowPrevSpeed = speed; issFollowLastT = null;
    if (speed !== ISS_FOLLOW_SPEED || !playing) { speed = ISS_FOLLOW_SPEED; playing = true; refreshTime(); } else issFollowPrevSpeed = null;
  } else if (!on && issFollow && issFollowPrevSpeed !== null && speed === ISS_FOLLOW_SPEED) { speed = issFollowPrevSpeed; refreshTime(); issFollowPrevSpeed = null; }
  issFollow = on; hits = []; buildChips(); showInfo();
}

// disposition (pixels) : échelle des distances et position des éléments, d'après la taille de l'écran
function issFollowLayout() {
  const sc = 0.28 * H / 200;                       // px par km : 200 km = 28 % de la hauteur de l'écran
  const ox = W * 0.5, oy = H * 0.76, mPx = 0.28 * H / ISS_SPAN_M;   // observateur ; px par mètre du dessin de la station (la poutre de 109 m fait 28 % de la hauteur)
  return { sc, ox, oy, iy: oy - (ISS_ALT - ISS_FOLLOW_ALT) * sc, mPx, ec: oy + (EARTH_R_EQ + ISS_FOLLOW_ALT) * sc, exag: mPx / (sc / 1000) };
}

function drawIssFollow(t) {
  hits = []; lblBoxes.length = 0; labelHits.length = 0;
  ctx.fillStyle = '#03040a'; ctx.fillRect(0, 0, W, H);
  for (const s of stars) { ctx.globalAlpha = 0.2 + 0.5 * (0.5 + 0.5 * Math.sin(t * s.q + s.p)); ctx.fillStyle = '#fff'; ctx.fillRect(s.x * W, s.y * H, s.s, s.s); }
  ctx.globalAlpha = 1;
  const alive = simT >= ISS.t0 && simT <= ISS.tEnd, g = alive ? issGeo(simT) : null, { sc, ox, oy, iy, mPx, ec, exag } = issFollowLayout();
  const rE = EARTH_R_EQ * sc, rObs = (EARTH_R_EQ + ISS_FOLLOW_ALT) * sc, rIss = (EARTH_R_EQ + ISS_ALT) * sc;
  // Terre et atmosphère (~100 km d'épaisseur)
  const ag = ctx.createRadialGradient(ox, ec, rE, ox, ec, rE + 100 * sc); ag.addColorStop(0, 'rgba(120,185,255,0.55)'); ag.addColorStop(1, 'rgba(120,185,255,0)');
  ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(ox, ec, rE + 100 * sc, 0, 7); ctx.fill();
  const eg = ctx.createRadialGradient(ox, ec, rE * 0.94, ox, ec, rE); eg.addColorStop(0, '#16396b'); eg.addColorStop(0.8, '#215a9e'); eg.addColorStop(1, '#4f95d9');
  ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ox, ec, rE, 0, 7); ctx.fill();
  // le sol défile sous l'observateur à la vitesse réelle de l'ISS (vitesse au sol ≈ v × R/(R+400)) ; on intègre la distance parcourue, plafonnée par image pour rester fluide
  const vIss = g ? g.v : 7.66, dReal = issFollowLastT === null ? 0 : Math.max(0, Math.min(0.1, t - issFollowLastT)), dSim = (simT - issFollowLastSim) * 86400;
  const cap = 200 * dReal;   // km d'image par seconde réelle
  issFollowRun += Math.max(-cap, Math.min(cap, vIss * (EARTH_R_EQ / (EARTH_R_EQ + ISS_ALT)) * dSim * (playing || dSim !== 0 ? 1 : 0)));
  issFollowLastT = t; issFollowLastSim = simT; const run = issFollowRun;
  // plaques de terre et de nuages qui défilent (période de 10 000 km), puis un trait tous les 500 km de surface
  ctx.lineCap = 'butt';
  for (const p of ISS_PATCHES) { const km = (((p.at - run) % 10000) + 10000) % 10000 - 5000, a = km / EARTH_R_EQ, hw = p.w / 2 / EARTH_R_EQ; if (Math.abs(a) > 0.5) continue; ctx.strokeStyle = p.col; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(ox, ec, rE - 9, -Math.PI / 2 + a - hw, -Math.PI / 2 + a + hw); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
  for (let i = -12; i <= 12; i++) { const a = (i * 500 - (run % 500)) / EARTH_R_EQ; if (Math.abs(a) > 0.45) continue; ctx.beginPath(); ctx.moveTo(ox + Math.sin(a) * rE, ec - Math.cos(a) * rE); ctx.lineTo(ox + Math.sin(a) * (rE - 14), ec - Math.cos(a) * (rE - 14)); ctx.stroke(); }
  // trajectoires parallèles (pointillés) : l'ISS à 400 km, l'observateur à 200 km
  ctx.lineWidth = 1.5; ctx.setLineDash([10, 8]);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(ox, ec, rIss, 0, 7); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,210,74,0.85)'; ctx.beginPath(); ctx.arc(ox, ec, rObs, 0, 7); ctx.stroke();
  ctx.setLineDash([]);
  // l'ISS au-dessus de l'observateur, agrandie, modules vers la droite (sens de la marche) : le dessin de dessus est tourné de −90° (local (x, y) -> écran (y, −x))
  if (alive && ISS_IMG && ISS_IMG.complete && ISS_IMG.naturalWidth) { ctx.save(); ctx.translate(ox, iy); ctx.rotate(-Math.PI / 2); ctx.scale(mPx, mPx); ctx.drawImage(ISS_IMG, -60, -44, 120, 88); ctx.restore(); }
  else if (alive) { ctx.fillStyle = '#fff'; ctx.fillRect(ox - 4, iy - 4, 8, 8); }
  const halfSpan = 54.5 * mPx, halfLen = 36.5 * mPx;
  // cotes : 73 m (longueur, horizontale) et 109 m (envergure de la poutre, verticale)
  const dim = (x0, y0, x1, y1, label, lx, ly, ta) => {
    ctx.strokeStyle = '#ffe9a0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    for (const [x, y] of [[x0, y0], [x1, y1]]) { ctx.beginPath(); if (x0 === x1) { ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); } else { ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5); } ctx.stroke(); }
    ctx.fillStyle = '#ffe9a0'; ctx.font = '600 13px system-ui, sans-serif'; ctx.textAlign = ta; ctx.fillText(label, lx, ly);
  };
  if (alive) {
    dim(ox - halfLen, iy + halfSpan + 18, ox + halfLen, iy + halfSpan + 18, '73 m', ox, iy + halfSpan + 36, 'center');
    dim(ox + halfLen + 22, iy - halfSpan, ox + halfLen + 22, iy + halfSpan, '109 m', ox + halfLen + 30, iy + 4, 'left');
  }
  // trait en pointillé entre l'observateur et l'ISS : la distance de 200 km
  const top = iy + halfSpan + 46;
  ctx.strokeStyle = '#ff7a5a'; ctx.fillStyle = '#ff7a5a'; ctx.lineWidth = 2; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.moveTo(ox, oy - 14); ctx.lineTo(ox, top + 8); ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(ox, top); ctx.lineTo(ox - 6, top + 12); ctx.lineTo(ox + 6, top + 12); ctx.closePath(); ctx.fill();
  ctx.font = '700 15px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('200 km', ox + 12, (oy + top) / 2);
  ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = '#ffb3a1'; ctx.fillText('la lumière met 0,67 ms', ox + 12, (oy + top) / 2 + 17);
  // l'observateur (un petit engin) et les flèches de vitesse
  ctx.fillStyle = '#ffd24a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ox - 12, oy + 7); ctx.lineTo(ox + 12, oy + 7); ctx.lineTo(ox + 15, oy - 6); ctx.lineTo(ox - 15, oy - 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  const vObs = Math.sqrt(EARTH_GM / (EARTH_R_EQ + ISS_FOLLOW_ALT)), kmh = v => fmt(Math.round(v * 3.6) * 1000);
  const arrow = (x, y, label, col) => { ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 70, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + 84, y); ctx.lineTo(x + 66, y - 7); ctx.lineTo(x + 66, y + 7); ctx.closePath(); ctx.fill(); ctx.font = '700 13px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(label, x + 92, y + 4); };
  const ax = Math.min(ox + halfLen + 24, W - 300);
  if (alive) arrow(ax, iy - halfSpan - 18, vIss.toFixed(2).replace('.', ',') + ' km/s', '#ffffff');
  arrow(ox + 40, oy - 2, vObs.toFixed(2).replace('.', ',') + ' km/s', '#ffd24a');
  ctx.fillStyle = '#ffd24a'; ctx.font = '700 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('observateur · 200 km d’altitude', ox, oy + 28);
  // panneau d'informations
  const lines = [
    ['Vue de suivi de l’ISS', '#fff', 17, 700],
    ['L’observateur vole à 200 km d’altitude, parallèlement à la station (400 km).', '#a9bde6', 12.5, 400],
    ['Distance ISS – observateur : 200 km', '#ff9d85', 14, 700],
    alive ? ['Vitesse de l’ISS : ' + vIss.toFixed(2).replace('.', ',') + ' km/s ≈ ' + kmh(vIss) + ' km/h', '#fff', 14, 700] : ['ISS hors de la période couverte (TLE du ' + fmtDate(ISS.epoch) + ', ± 2 mois)', '#ff9d85', 13, 700],
    ['Vitesse de l’observateur : ' + vObs.toFixed(2).replace('.', ',') + ' km/s ≈ ' + kmh(vObs) + ' km/h (orbite à 200 km)', '#ffe9a0', 13, 400],
    ['Taille de l’ISS : 109 m × 73 m · ≈ 420 t (dessinée ×' + fmt(exag) + ')', '#fff', 13, 400],
  ];
  if (Math.abs(speed) > 0) lines.push(['Temps accéléré ×' + fmt(Math.abs(speed) * 86400) + ' (la barre du bas règle la vitesse)', '#92a6d6', 12, 400]);
  if (g) { lines.push(['Au-dessus de : ' + fmt1(Math.abs(g.lat), 1) + '° ' + (g.lat >= 0 ? 'N' : 'S') + ' · ' + fmt1(Math.abs(g.lon), 1) + '° ' + (g.lon >= 0 ? 'E' : 'O'), '#a9bde6', 13, 400]); lines.push(['Un tour en 93 min (≈ 15,5 tours par jour)', '#a9bde6', 13, 400]); }
  const px = 16, py = 62, pw = Math.min(W - 32, 500), ph = 14 + lines.reduce((a, l) => a + l[2] + 9, 0);
  ctx.fillStyle = 'rgba(12,16,34,0.78)'; ctx.strokeStyle = 'rgba(160,185,235,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.fill(); ctx.stroke();
  let y = py + 12; ctx.textAlign = 'left';
  for (const [txt, col, size, weight] of lines) { y += size; ctx.fillStyle = col; ctx.font = weight + ' ' + size + 'px system-ui, sans-serif'; ctx.fillText(txt, px + 12, y); y += 9; }
  // mini-carte de l'orbite vue du pôle : l'ISS (blanc) et l'observateur (jaune) tournent autour de la Terre, un tour en 93 min (au rythme de la simulation)
  { const mx = W - 92, my = H - 168, rev = (simT - ISS.epoch) * 1440 * ISS.satrec.no / (2 * Math.PI), ph = (rev - Math.floor(rev)) * 2 * Math.PI;
    ctx.fillStyle = 'rgba(12,16,34,0.7)'; ctx.beginPath(); ctx.arc(mx, my, 78, 0, 7); ctx.fill();
    ctx.fillStyle = '#215a9e'; ctx.beginPath(); ctx.arc(mx, my, 34, 0, 7); ctx.fill();
    ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(mx, my, 62, 0, 7); ctx.stroke(); ctx.strokeStyle = 'rgba(255,210,74,0.8)'; ctx.beginPath(); ctx.arc(mx, my, 48, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(mx + Math.cos(ph) * 62, my - Math.sin(ph) * 62, 4.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(mx + Math.cos(ph) * 48, my - Math.sin(ph) * 48, 3.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#92a6d6'; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('orbite vue du dessus · 1 tour = 93 min', mx, my + 96); }
  // légende et échelle
  ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'right';
  ctx.fillStyle = '#e8e8e8'; ctx.fillText('- - -  trajectoire de l’ISS (400 km)', W - 16, H - 46); ctx.fillStyle = '#ffd24a'; ctx.fillText('- - -  trajectoire de l’observateur (200 km)', W - 16, H - 28);
  ctx.fillStyle = '#92a6d6'; ctx.fillText('Échap : quitter · distances à l’échelle réelle, ISS agrandie', W - 16, H - 10);
  ctx.strokeStyle = '#cfdcff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(16, H - 22); ctx.lineTo(16 + 100 * sc, H - 22); ctx.stroke(); ctx.fillStyle = '#cfdcff'; ctx.textAlign = 'left'; ctx.fillText('100 km', 16, H - 28);
}

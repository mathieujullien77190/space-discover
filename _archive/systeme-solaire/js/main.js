// Boucle d'animation et démarrage.
// =====================================================================
//  BOUCLE
// =====================================================================
let last = performance.now(), infoTick = 0;
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.1); last = now;
  replayStep();
  if (playing) simT += speed * dt;
  computePositions(simT);
  // rotation visible des astres (vitesse apparente plafonnée pour éviter le scintillement)
  for (const b of BODIES) { if (!b.rot) continue; const w = 2 * Math.PI * (playing ? speed : 0) * 24 / b.rot; b.spin += Math.max(-1.6, Math.min(1.6, w)) * dt; }
  { const kf = Math.min(1, dt * 6);   // corps cartographiés : suivent la date tant que la rotation reste lisible, sinon tournent à vitesse plafonnée
    for (const b of SURFACES) {
      const S = b.surf, p = pos[b.idx];
      if (!playing || Math.abs(surfaceRate(S, speed)) <= 1.6) S.sub = surfaceSubLon(S, simT, p[0], p[1]); else S.sub -= Math.sign(speed) * S.dir * 1.6 * 180 / Math.PI * dt;
      const lock = b === EARTHB && selMeteo && focus === EARTHB;   // la Terre se tourne vers la météorite choisie
      const sc = b === EARTHB && focus === EARTHB && !lock ? selCountry : null;   // ou vers le point survolé (js/country-view.js), qui peut avancer
      if (sc) moveCountryView(sc, dt);
      const lonT = lock ? selMeteo.lon : sc ? sc.lon : S.sub + (S.sunRight ? -90 : 90), latT = lock ? Math.max(-55, Math.min(55, selMeteo.lat)) : sc ? sc.lat : S.tilt;
      S.view.lon += wrapLon(lonT - S.view.lon) * kf; S.view.lat += (latT - S.view.lat) * kf;
    } }
  logR += (logTarget - logR) * Math.min(1, dt * 4.5);
  const f = Math.exp(-dt * 3.2); flyPx = [flyPx[0] * f, flyPx[1] * f];
  draw(now / 1000);
  updateScale(); updateDate();
  if ((infoTick += dt) > 0.6) { infoTick = 0; if (!overview) showInfoLive(); }
  requestAnimationFrame(loop);
}

computePositions(simT);
buildChips(); showInfo(); buildLayers();
requestAnimationFrame(loop);

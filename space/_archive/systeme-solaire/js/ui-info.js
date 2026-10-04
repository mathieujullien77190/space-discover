// Interface : chips, panneau d'info (astres, sondes, comètes, météorites), échelle.
// =====================================================================
//  INTERFACE
// =====================================================================
const chipsEl = document.getElementById('chips'), subEl = document.getElementById('sub'), infoEl = document.getElementById('info');
const scaleEl = document.getElementById('scale'), hintEl = document.getElementById('hint');
const fmt = n => Math.round(n).toLocaleString('fr-FR').replace(/ /g, ' ');
const fmt1 = (n, d = 1) => n.toLocaleString('fr-FR', { maximumFractionDigits: d });
function fmtLight(s) {
  if (s >= 6.3e7) return fmt(s / 31557600) + ' ans';
  if (s < 60) return fmt1(s) + ' s';
  if (s < 3600) return Math.floor(s / 60) + ' min ' + Math.round(s % 60) + ' s';
  if (s < 172800) return fmt1(s / 3600) + ' h';
  return fmt1(s / 86400) + ' jours';
}
function fmtDur(days) {
  if (days < 2) return fmt1(days * 24) + ' h';
  if (days < 730) return fmt1(days) + ' jours';
  return fmt1(days / 365.256) + ' ans';
}
function mkBtn(label, on, fn) { const b = document.createElement('button'); b.textContent = label; if (on) b.classList.add('on'); b.addEventListener('click', fn); return b; }

const CATS = [['probes', '🛰 Sondes'], ['comets', '☄ Comètes'], ['meteo', '🪨 Météorites'], ['stars', '★ Étoiles']];
function buildChips() {
  chipsEl.innerHTML = ''; subEl.innerHTML = '';
  chipsEl.append(mkBtn('Vue d\'ensemble', overview, () => focusOn(SUN, 'overview')));
  chipsEl.append(mkBtn('🚀 Lancement Kourou', launchView, () => setLaunchView(!launchView)));
  for (const b of [SUN, ...PLANETS]) chipsEl.append(mkBtn(b.name, !overview && (focus === b || focus.parent === b), () => focusOn(b)));
  for (const [key, label] of CATS) chipsEl.append(mkBtn(label, menu === key, () => { menu = menu === key ? null : key; buildChips(); }));
  if (menu) {   // liste ouverte : sondes, comètes ou météorites
    const list = menu === 'probes' ? PROBES : menu === 'comets' ? COMETS : menu === 'stars' ? STARS : METEORITES;
    for (const it of list) subEl.append(mkBtn(menu === 'stars' ? it.name + ' · ' + fmtStarLy(it.ly) : it.name, menu === 'meteo' ? selMeteo === it : menu === 'stars' ? selStar === it : (!overview && focus === it), () => menu === 'meteo' ? selectMeteo(it) : menu === 'stars' ? selectStar(it) : focusOn(it)));
    return;
  }
  const planet = focus.parent && focus.parent !== SUN ? focus.parent : focus;
  if (planet !== SUN && planet.moons.length) {
    subEl.append(mkBtn(planet.name + ' · ses lunes', !overview && focus === planet && logTarget > Math.log(planet.R * 6), () => focusOn(planet, 'system')));
    for (const m of planet.moons) subEl.append(mkBtn(m.name, focus === m, () => focusOn(m)));
  }
}
function sunDistKm(b) { const p = b.parent && b.parent !== SUN ? b.parent : b; return Math.hypot(pos[p.idx][0], pos[p.idx][1]); }
function showInfo() {
  const b = overview ? null : focus;
  if (launchView) return showLaunchPanel();
  if (selStar) return showStarInfo(selStar);
  if (selMeteo && focus === EARTHB) return showMeteoInfo(selMeteo);
  if (b && b.probe) return showProbeInfo(b);
  if (b && b.comet) return showCometInfo(b);
  if (!b) {
    infoEl.innerHTML = `<h2>Le système solaire à l'échelle</h2>
      <p>Les tailles et les distances sont <b>vraies</b> : c'est pour ça que les planètes sont invisibles ici. Zoome, ou choisis un astre, pour les voir grossir.</p>
      <p class="note">Positions des planètes d'aujourd'hui (approximatives, vues du dessus). Les orbites sont des ellipses réelles ; les inclinaisons sont ignorées.</p>`;
    return;
  }
  const dKm = 2 * b.R, ratio = dKm / (2 * 6371);
  let rows = `<dt>Diamètre</dt><dd>${fmt(dKm)} km${b.id === 'terre' ? '' : ' · ' + fmt1(ratio, ratio < 1 ? 2 : 1) + ' × la Terre'}</dd>`;
  if (b !== SUN) {
    const ds = sunDistKm(b);
    rows += `<dt>Distance au Soleil</dt><dd>${fmt1(ds / AU, 2)} UA · lumière ${fmtLight(ds / C_LIGHT)}</dd>`;
    if (b.parent === SUN) rows += `<dt>Une année</dt><dd>${fmtDur(b.T)}</dd>`;
    else rows += `<dt>Distance à ${b.parent.name}</dt><dd>${fmt(b.a)} km · tour en ${fmtDur(b.T)}${b.retro ? ' (sens inverse)' : ''}</dd>`;
  }
  const rotH = Math.abs(b.rot);
  rows += `<dt>Un tour sur lui-même</dt><dd>${rotH < 48 ? fmt1(rotH) + ' h' : fmt1(rotH / 24) + ' jours'}${b.rot < 0 && b.parent === SUN ? ' (sens inverse)' : ''}${b.parent !== SUN && b !== SUN ? ' · toujours la même face vers ' + b.parent.name : ''}</dd>`;
  if (b.moons.length) rows += `<dt>Lunes affichées</dt><dd>${b.moons.map(m => m.name).join(', ')}</dd>`;
  infoEl.innerHTML = `<h2>${b.name}</h2><div class="meta">${b.kind}</div>
    <dl>${rows}</dl><ul>${b.facts.map(f => `<li>${f}</li>`).join('')}</ul>${b.legend ? '<div class="legend">' + b.legend.map(([n, c]) => `<div><i style="background:${c}"></i>${n}</div>`).join('') + '</div>' : ''}<div class="btns" id="infoBtns"></div>${b.id === 'terre' ? '<figure class="photo"><img src="data/nasa-blue-marble.jpg" alt="La Terre, Blue Marble (NASA)"><figcaption>Blue Marble (NASA Visible Earth, domaine public)</figcaption></figure>' : ''}
    ${b.surf && b.surf.names.length ? '<p class="note">Cratères et reliefs nommés : nomenclature officielle de l’UAI (USGS), positions et diamètres réels ; ils apparaissent quand on zoome.' + (b.surf.geo ? '' : ' Pas de carte géologique globale disponible pour ce corps : le fond est uniforme.') + '</p>' : ''}
    ${b.parent !== SUN && b !== SUN ? '<p class="note">Phase de départ de cette lune illustrative' + (b.id === 'lune' ? ' sauf la Lune, dont la position est la vraie, approximativement.' : '.') + '</p>' : ''}`;
  const btns = document.getElementById('infoBtns');
  if (b === EARTHB) countryPanelInit();
  if (b.moons.length) btns.append(mkBtn('Voir ses lunes', false, () => focusOn(b, 'system')));
  btns.append(mkBtn('Vue d\'ensemble', false, () => focusOn(SUN, 'overview')));
}
function fadeHint() { hintEl.style.opacity = 0; }
setTimeout(fadeHint, 9000);

// échelle : une barre de longueur ronde
function updateScale() {
  const k = viewK(), steps = [1, 2, 5]; let best = 1;
  for (let e = -2; e <= 16; e++) for (const s of steps) { const km = s * Math.pow(10, e); const px = km * k; if (px >= 70 && px <= 150) best = km; }
  const px = best * k;
  const label = best >= 9e12 ? fmt1(best / LY, best / LY < 10 ? 1 : 0) + ' année' + (best / LY >= 1.5 ? 's' : '') + '-lumière' : best >= 1.4e7 ? fmt1(best / AU, best / AU < 1 ? 2 : 0) + ' UA' : best >= 1e6 ? fmt1(best / 1e6, 0) + ' millions de km' : best >= 1 ? fmt(best) + ' km' : fmt1(best * 1000) + ' m';
  const html = `<div class="bar" style="width:${Math.round(px)}px"></div>${label} · lumière : ${fmtLight(best / C_LIGHT)}`;
  if (html !== updateScale.last) { updateScale.last = html; scaleEl.innerHTML = html; }
}

// ---------- fiches : sondes, comètes, météorites ----------
const fmtDate = t => new Date(J2000 + t * DAYMS).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
function jumpTo(t) { stopReplay(); simT = t; playing = false; refreshTime(); }   // va à une date et met en pause pour voir l'instant
function eventsBox(evs) { const box = document.getElementById('evs'); if (box) for (const e of evs) box.append(mkBtn(fmtDate(e.t) + ' · ' + e.label, false, () => jumpTo(e.t))); }
function setTxt(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
const speedKms = b => { const f = b.probe ? probePos3 : cometPos3, a = f(b, simT - 0.25), z = f(b, simT + 0.25); return Math.hypot(z[0] - a[0], z[1] - a[1], z[2] - a[2]) / (0.5 * 86400); };
// rafraîchit seulement les valeurs qui changent (distances, vitesse) sans reconstruire le panneau
function liveBody(b) {
  const alive = !b.probe || (simT >= b.t0 && simT <= b.tEnd), ids = b.probe ? ['pDist', 'pEarth', 'pSpeed'] : ['cDist', 'cEarth', 'cSpeed'];
  if (b.sat) {   // ISS : position réelle (SGP4), altitude, point survolé, vitesse par rapport à la Terre
    const g = alive ? issGeo(simT) : null, ns = g && g.lat >= 0 ? 'N' : 'S', eo = g && g.lon >= 0 ? 'E' : 'O';
    setTxt('pDay', alive ? 'TLE du ' + fmtDate(b.epoch) + ' · fiable à ± 2 mois' : 'hors de la période couverte (TLE du ' + fmtDate(b.epoch) + ', ± 2 mois)');
    setTxt('pAlt', g ? '≈ ' + fmt(g.alt) + ' km' : '—'); setTxt('pLat', g ? fmt1(Math.abs(g.lat), 1) + '° ' + ns + ' · ' + fmt1(Math.abs(g.lon), 1) + '° ' + eo : '—');
    if (g) setTxt('pSpeed', '≈ ' + fmt1(g.v, 2) + ' km/s par rapport à la Terre');
  } else if (b.probe) setTxt('pDay', simT < b.t0 ? 'pas encore lancée (lancement le ' + fmtDate(b.t0) + ')' : simT > b.tEnd ? 'terminée le ' + fmtDate(b.tEnd) : 'jour ' + fmt(simT - b.t0) + ' · ' + fmt1((simT - b.t0) / 365.256, 1) + ' ans depuis le lancement');
  if (!alive) { ids.forEach(id => setTxt(id, '—')); return; }
  const d = Math.hypot(...b.pos3), e = pos[EARTHB.idx], de = Math.hypot(b.pos3[0] - e[0], b.pos3[1] - e[1], b.pos3[2]);
  setTxt(ids[0], `≈ ${fmt1(d / AU, d < 2 * AU ? 3 : 1)} UA (${fmt1(d / 1e9, 1)} milliards de km) · lumière ${fmtLight(d / C_LIGHT)}`);
  setTxt(ids[1], de < 1e7 ? `${fmt(de)} km · lumière ${fmtLight(de / C_LIGHT)}` : `≈ ${fmt1(de / AU, 2)} UA · lumière ${fmtLight(de / C_LIGHT)}`);
  if (!b.sat) setTxt(ids[2], `≈ ${fmt1(speedKms(b), 1)} km/s`);   // (ISS : vitesse par rapport à la Terre, déjà écrite plus haut)
}
function showProbeInfo(b) {
  infoEl.innerHTML = `<h2>${b.name}</h2><div class="meta">${b.kind}</div>
    <dl><dt>${b.sat ? 'Orbite' : 'Mission'}</dt><dd id="pDay"></dd>${b.sat ? '<dt>Dimensions</dt><dd>109 m × 73 m · ≈ 420 t</dd><dt>Altitude</dt><dd id="pAlt"></dd><dt>Au-dessus de</dt><dd id="pLat"></dd>' : ''}<dt>Distance au Soleil</dt><dd id="pDist"></dd><dt>Distance à la Terre</dt><dd id="pEarth"></dd><dt>Vitesse (modèle)</dt><dd id="pSpeed"></dd></dl>
    <ul>${b.facts.map(f => `<li>${f}</li>`).join('')}</ul><div class="evsT">Dates clés (clique pour y aller)</div><div class="evs" id="evs"></div><div class="btns" id="infoBtns"></div>${b === EARTHB ? countryPanelHtml() : ''}
    <p class="note">${b.note ? b.note + ' ' : ''}Trajectoire approximative : arcs képlériens entre les survols (plan de l'écliptique), vue à plat (projection). Distances et vitesses : ordres de grandeur.</p>`;
  eventsBox(b.events);
  const btns = document.getElementById('infoBtns');
  if (!b.sat) btns.append(mkBtn('↺ Rejouer le voyage', false, () => startReplay(b)));
  else { btns.append(mkBtn('Vue 100 km (modèle agrandi)', false, () => { logTarget = Math.log(100); })); btns.append(mkBtn('Échelle réelle', false, () => { logTarget = Math.log(0.09); })); btns.append(mkBtn('Avec la Terre', false, () => { logTarget = Math.log(3e4); })); btns.append(mkBtn(issFollow ? 'Quitter la vue de suivi' : 'Vue de suivi (200 km)', issFollow, () => setIssFollow(!issFollow))); }
  btns.append(mkBtn("Vue d'ensemble", false, () => focusOn(SUN, 'overview')));
  liveBody(b);
}
const roundSig = y => y >= 200 ? Math.round(y / Math.pow(10, Math.floor(Math.log10(y)) - 1)) * Math.pow(10, Math.floor(Math.log10(y)) - 1) : y;
function cometPeris(c) {   // dates de périhélie (dans la plage du curseur)
  if (c.pe) return c.pe; if (c.e >= 1) return [c.tp];
  const out = []; for (let t = c.tp - Math.floor((c.tp - SL_MIN) / c.P) * c.P; t <= SL_MAX; t += c.P) out.push(t); return out;
}
function showCometInfo(c) {
  const per = cometPeris(c), prev = per.filter(t => t <= simT).pop(), next = per.find(t => t > simT);
  c.evWin = [prev === undefined ? -1e9 : prev, next === undefined ? 1e9 : next];
  const evs = [...c.events]; if (prev !== undefined) evs.push({ t: prev, label: c.e >= 1 ? 'Périhélie' : 'Dernier périhélie' }); if (next !== undefined) evs.push({ t: next, label: 'Prochain périhélie' }); evs.sort((a, b) => a.t - b.t);
  const P = c.pe ? (c.pe[c.pe.length - 1] - c.pe[0]) / (c.pe.length - 1) / 365.256 : c.e < 1 ? c.P / 365.256 : 0;
  const kind = c.inter ? 'Visiteur interstellaire' : P < 200 ? 'Comète périodique' : 'Comète à longue période';
  const orbit = c.e < 1 ? `période ≈ ${P < 200 ? fmt1(P, 1) : fmt(roundSig(P))} ans · s'éloigne jusqu'à ≈ ${fmt1(c.Q / AU, 1)} UA` : `hyperbole (excentricité ${fmt1(c.e, 2)}) : il ne reviendra pas`;
  infoEl.innerHTML = `<h2>${c.name}</h2><div class="meta">${kind} · ${c.desig}</div>
    <dl><dt>Distance au Soleil</dt><dd id="cDist"></dd><dt>Distance à la Terre</dt><dd id="cEarth"></dd><dt>Vitesse</dt><dd id="cSpeed"></dd>
    <dt>Périhélie</dt><dd>${fmt1(c.q, 2)} UA</dd><dt>Orbite</dt><dd>${orbit}</dd><dt>Inclinaison</dt><dd>${fmt1(c.i, 1)}°${c.i > 90 ? ' (sens inverse des planètes)' : ''}</dd></dl>
    <ul>${c.facts.map(f => `<li>${f}</li>`).join('')}</ul><div class="evsT">Dates clés (clique pour y aller)</div><div class="evs" id="evs"></div><div class="btns" id="infoBtns"></div>
    <p class="note">${c.note ? c.note + ' ' : ''}Éléments orbitaux approximatifs, à vérifier. Vue à plat : on voit la projection de l'orbite. La queue pointe à l'opposé du Soleil ; sa longueur est schématique.</p>`;
  eventsBox(evs);
  const btns = document.getElementById('infoBtns');
  btns.append(mkBtn("Voir toute l'orbite", false, () => focusOn(c, 'orbit')));
  btns.append(mkBtn("Aller au périhélie", false, () => jumpTo(prev !== undefined && (next === undefined || simT - prev < next - simT) ? prev : next)));
  btns.append(mkBtn("Vue d'ensemble", false, () => focusOn(SUN, 'overview')));
  liveBody(c);
}
function showMeteoInfo(m) {
  const ns = m.lat >= 0 ? 'N' : 'S', eo = m.lon >= 0 ? 'E' : 'O';
  infoEl.innerHTML = `<h2>${m.name}</h2><div class="meta">${m.type === 'cratère' ? 'Cratère d\'impact' : m.type === 'explosion' ? 'Explosion en altitude' : 'Météorite'} · ${m.where}</div>
    <dl><dt>Quand</dt><dd>${m.when}</dd><dt>Taille</dt><dd>${m.size}</dd><dt>Position</dt><dd>${fmt1(Math.abs(m.lat), 1)}° ${ns} · ${fmt1(Math.abs(m.lon), 1)}° ${eo}</dd></dl>
    <ul>${m.facts.map(f => `<li>${f}</li>`).join('')}</ul><div class="btns" id="infoBtns"></div>`;
  const btns = document.getElementById('infoBtns');
  if (m.date) btns.append(mkBtn('Aller à cette date', false, () => jumpTo(dayOf(Date.parse(m.date + 'T12:00:00Z')))));
  btns.append(mkBtn('Reprendre la rotation', false, () => { selMeteo = null; showInfo(); buildChips(); }));
  btns.append(mkBtn("Vue d'ensemble", false, () => focusOn(SUN, 'overview')));
}
function showInfoLive() {
  if (launchView) return;
  if (selCountry && focus === EARTHB) { const z = document.getElementById('aZoom'); if (z && document.activeElement !== z) z.value = zoomToSlider(Math.exp(logTarget)); countryPanelText(); }
  if (focus.probe || focus.comet) { liveBody(focus); if (focus.comet && (simT < focus.evWin[0] || simT > focus.evWin[1])) showInfo(); return; }
  const dd = infoEl.querySelectorAll('dd'); if (dd.length > 1 && focus !== SUN) { const ds = sunDistKm(focus); dd[1].textContent = `${fmt1(ds / AU, 2)} UA · lumière ${fmtLight(ds / C_LIGHT)}`; }
}

// fiche d'une étoile voisine
function showStarInfo(st) {
  const km = st.ly * LY, v1 = km / 17 / 31557600;   // temps de Voyager 1 (≈ 17 km/s)
  infoEl.innerHTML = `<h2>${st.name}</h2><div class="meta">${st.kind}</div>
    <dl><dt>Distance</dt><dd>${fmt1(st.ly, 2)} années-lumière (≈ ${fmt1(km / 1e12, 0)} milliers de milliards de km)</dd>
    <dt>Sa lumière met</dt><dd>${fmt1(st.ly, 2)} ans pour nous parvenir</dd>
    <dt>Voyager 1 y mettrait</dt><dd>≈ ${fmt(v1)} ans à 17 km/s</dd>
    <dt>Direction (écliptique)</dt><dd>longitude ${fmt1(st.lonDeg < 0 ? st.lonDeg + 360 : st.lonDeg, 0)}° · latitude ${fmt1(st.latDeg, 0)}°</dd></dl>
    <ul><li>${st.text}</li></ul><div class="btns" id="infoBtns"></div>
    <p class="note">Direction réelle, distance approximative. La vue est à plat : on voit la projection des positions sur le plan des planètes.</p>`;
  document.getElementById('infoBtns').append(mkBtn("Revenir au Soleil", false, () => focusOn(SUN, 'overview')));
}

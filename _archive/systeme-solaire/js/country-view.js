// « Pile au-dessus d'un pays » : un clic sur la Terre (déjà suivie et assez grosse) désigne un pays ; la vue se place à la verticale de ce pays (le globe tourne pour le mettre au centre),
// avec un zoom réglable et un déplacement au choix : IMMOBILE (vitesse 0 : on reste au-dessus du pays pendant que la Terre tourne dessous) ou EN MOUVEMENT (vitesse au sol en km/s et direction :
// le point survolé avance sur la Terre, comme un satellite ; 7,7 km/s ≈ la vitesse de l'ISS). Le pays est trouvé dans des contours simplifiés (js/lazy/earth-countries.js, ≈ 400 Ko), chargés
// à la demande au premier clic par une balise <script> (marche en file://). Un clic sur la mer centre simplement la vue sur le point cliqué.
let selCountry = null;    // { name, lon, lat, speed (km/s), dir (° : 0 nord, 90 est…) } ou null
let earthDraw = null;     // où la Terre est dessinée à l'écran (rempli par draw.js) : { sx, sy, rpx }
let earthCountries = null, countriesState = 'idle', pendingPick = null;
const COUNTRY_ZOOM_MIN = 150, COUNTRY_ZOOM_MAX = 2e4;   // rayon de vue (km) des curseurs
const COUNTRY_SPEED_MAX = 8;                             // km/s au bout du curseur
const ISS_GROUND_KMS = 7.66;

function requestEarthCountries(then) {
  if (countriesState === 'ready') { then && then(); return; }
  if (then) pendingPick = then;
  if (countriesState !== 'idle') return;
  countriesState = 'loading';
  try {
    const sc = document.createElement('script'); sc.src = 'js/lazy/earth-countries.js';
    sc.onload = () => { if (typeof EARTH_COUNTRIES !== 'undefined') { earthCountries = EARTH_COUNTRIES; countriesState = 'ready'; const f = pendingPick; pendingPick = null; if (f) f(); } else countriesState = 'error'; };
    sc.onerror = () => { countriesState = 'error'; };
    (document.head || document.body).appendChild(sc);
  } catch (e) { countriesState = 'error'; }
}

// point dans un anneau (règle pair-impair, plan longitude / latitude ; coordonnées en centièmes de degré)
function pointInFlat(flat, x, y) {
  let inside = false;
  for (let i = 0, n = flat.length / 2, j = n - 1; i < n; j = i++) {
    const xi = flat[2 * i], yi = flat[2 * i + 1], xj = flat[2 * j], yj = flat[2 * j + 1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
// le pays (et le morceau) qui contient le point, ou null (mer)
function countryAt(lon, lat) {
  if (!earthCountries) return null;
  const x = lon * 100, y = lat * 100;
  for (const [ci, area, bb, flat] of earthCountries.parts) {   // du plus petit au plus grand : une enclave l'emporte sur le pays qui l'entoure
    if (x < bb[0] || x > bb[1] || y < bb[2] || y > bb[3]) continue;
    if (pointInFlat(flat, x, y)) return { name: earthCountries.names[ci], bbox: bb.map(v => v / 100) };
  }
  return null;
}

// pixel -> longitude, latitude sur la Terre telle qu'elle est dessinée (inverse de viewPt + rotation d'écran psi) ; null hors du disque
function earthLonLatAt(x, y) {
  const S = EARTHB.surf, d = earthDraw; if (!S || !d) return null;
  const dxs = (x - d.sx) / d.rpx, dys = (y - d.sy) / d.rpx, cp = Math.cos(S.psi), sp = Math.sin(S.psi);
  const vx = dxs * cp + dys * sp, vy = -(-dxs * sp + dys * cp), r2 = vx * vx + vy * vy; if (r2 >= 1) return null;
  const vz = Math.sqrt(1 - r2), la0 = S.view.lat * DEG, yg = vy * Math.cos(la0) + vz * Math.sin(la0), zg = -vy * Math.sin(la0) + vz * Math.cos(la0);
  return { lat: Math.asin(Math.max(-1, Math.min(1, yg))) / DEG, lon: wrapLon(S.view.lon + Math.atan2(vx, zg) / DEG) };
}

// se placer à la verticale d'un point ; spanKm = taille à cadrer (pays), sinon on garde le zoom
function goAbove(lon, lat, name, spanKm) {
  const keep = selCountry;
  if (focus !== EARTHB || overview) focusOn(EARTHB);
  selMeteo = null; selStar = null; issFollow = false; pan = [0, 0];
  selCountry = { name, lon, lat, speed: keep ? keep.speed : 0, dir: keep ? keep.dir : 90 };
  if (spanKm) logTarget = clampLog(Math.log(Math.max(spanKm * 0.8, COUNTRY_ZOOM_MIN)));
  if (typeof requestEarthBorders === 'function') requestEarthBorders();
  buildChips(); showInfo();
}
// clic sur la Terre : retourne vrai si le clic est géré (sinon, comportement normal)
function pickEarthAt(x, y) {
  if (focus !== EARTHB || overview || !earthDraw || earthDraw.rpx < 90) return false;
  const p = earthLonLatAt(x, y); if (!p) return false;
  const place = () => { const c = countryAt(p.lon, p.lat); if (c) { const [x0, x1, y0, y1] = c.bbox, lat = (y0 + y1) / 2; goAbove((x0 + x1) / 2, lat, c.name, Math.max((y1 - y0) * 111, (x1 - x0) * 111 * Math.cos(lat * DEG))); } else goAbove(p.lon, p.lat, null, 0); };
  if (countriesState === 'ready') place(); else if (countriesState === 'error') goAbove(p.lon, p.lat, null, 0); else requestEarthCountries(place);
  return true;
}

// déplacement du point survolé (appelé à chaque image par main.js) : distance parcourue en temps SIMULÉ, selon la vitesse au sol et la direction (route à cap constant)
function moveCountryView(sc, dt) {
  if (!(sc.speed > 0) || !playing) return;
  const d = Math.max(-1, Math.min(1, sc.speed * speed * 86400 * dt / 6371)), th = sc.dir * DEG, la = sc.lat * DEG;
  const la2 = Math.asin(Math.max(-1, Math.min(1, Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(th))));
  const dl = Math.atan2(Math.sin(th) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
  sc.lat = Math.max(-89.5, Math.min(89.5, la2 / DEG)); sc.lon = wrapLon(sc.lon + dl / DEG);
}

// ---------- fiche : zoom, vitesse, direction ----------
const zoomToSlider = r => Math.round(1000 * Math.log(COUNTRY_ZOOM_MAX / Math.max(COUNTRY_ZOOM_MIN, Math.min(COUNTRY_ZOOM_MAX, r))) / Math.log(COUNTRY_ZOOM_MAX / COUNTRY_ZOOM_MIN));   // droite = zoom avant
const sliderToZoom = s => COUNTRY_ZOOM_MAX * Math.pow(COUNTRY_ZOOM_MIN / COUNTRY_ZOOM_MAX, s / 1000);
const fmtKms = v => v <= 0 ? 'immobile' : fmt1(v, 1).replace('.', ',') + ' km/s ≈ ' + fmt(Math.round(v * 3.6) * 1000) + ' km/h';
function countryPanelHtml() {
  const sc = selCountry; if (!sc) return '';
  return `<div class="above"><h3>📍 Au-dessus de : ${sc.name || 'un point de la Terre'}</h3>
    <label>Zoom <small id="aZoomV"></small><input id="aZoom" class="sl" type="range" min="0" max="1000" step="1" value="${zoomToSlider(Math.exp(logTarget))}"></label>
    <label>Déplacement <small id="aSpeedV">${fmtKms(sc.speed)}</small><input id="aSpeed" class="sl" type="range" min="0" max="${COUNTRY_SPEED_MAX * 10}" step="1" value="${Math.round(sc.speed * 10)}"></label>
    <label>Direction <small id="aDirV">${fmt(Math.round(sc.dir))}° (0 nord · 90 est · 180 sud · 270 ouest)</small><input id="aDir" class="sl" type="range" min="0" max="355" step="5" value="${Math.round(sc.dir / 5) * 5}"></label>
    <p class="note" id="aPos"></p><div class="btns" id="aBtns"></div></div>`;
}
function countryPanelInit() {
  const sc = selCountry; if (!sc) return;
  const $ = id => document.getElementById(id), btns = $('aBtns'); if (!btns) return;
  const sync = () => { const sl = $('aSpeed'), dl = $('aDir'); if (sl) sl.value = Math.round(sc.speed * 10); if (dl) dl.value = Math.round(sc.dir / 5) * 5; countryPanelText(); };
  const zs = $('aZoom'); if (zs) zs.addEventListener('input', () => { stopReplay(); logTarget = clampLog(Math.log(sliderToZoom(+zs.value))); countryPanelText(); });
  const ss = $('aSpeed'); if (ss) ss.addEventListener('input', () => { sc.speed = +ss.value / 10; countryPanelText(); });
  const ds = $('aDir'); if (ds) ds.addEventListener('input', () => { sc.dir = +ds.value; countryPanelText(); });
  btns.append(mkBtn('Immobile', sc.speed === 0, () => { sc.speed = 0; sync(); }));
  btns.append(mkBtn('Vitesse de l’ISS', false, () => { sc.speed = ISS_GROUND_KMS; sync(); }));
  btns.append(mkBtn('Quitter', false, () => { selCountry = null; showInfo(); buildChips(); }));
  countryPanelText();
}
function countryPanelText() {
  const sc = selCountry, $ = id => document.getElementById(id); if (!sc) return;
  const set = (id, t) => { const el = $(id); if (el && el.textContent !== t) el.textContent = t; };
  set('aZoomV', 'rayon de vue ' + fmt(Math.round(Math.exp(logTarget))) + ' km');
  set('aSpeedV', fmtKms(sc.speed)); set('aDirV', fmt(Math.round(sc.dir)) + '° (0 nord · 90 est · 180 sud · 270 ouest)');
  const ns = (v, p, n) => fmt1(Math.abs(v), 2).replace('.', ',') + '° ' + (v >= 0 ? p : n);
  set('aPos', 'Point survolé : ' + ns(sc.lat, 'N', 'S') + ', ' + ns(sc.lon, 'E', 'O') + (sc.speed > 0 ? ' · temps ×' + fmt(Math.abs(speed) * 86400) : ' · la Terre tourne dessous'));
}
// repère au centre de la vue (le point survolé)
function drawCountryReticle(sx, sy, rpx) {
  if (!selCountry || rpx < 60) return;
  ctx.strokeStyle = 'rgba(255,210,74,0.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(sx, sy, 9, 0, 7); ctx.moveTo(sx - 18, sy); ctx.lineTo(sx - 5, sy); ctx.moveTo(sx + 5, sy); ctx.lineTo(sx + 18, sy); ctx.moveTo(sx, sy - 18); ctx.lineTo(sx, sy - 5); ctx.moveTo(sx, sy + 5); ctx.lineTo(sx, sy + 18); ctx.stroke();
}

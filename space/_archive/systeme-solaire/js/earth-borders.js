// Frontières, noms de pays et villes sur la Terre, quand on zoome dessus (rayon de la Terre à l'écran > ~500 px, soit une vue de ~3 000 km de rayon).
// Les données (js/lazy/earth-borders.js, ≈ 800 Ko, Natural Earth) ne sont chargées QU'À CE MOMENT, par une balise <script> ajoutée à la page : cela marche en file://
// (un fetch de fichier local y serait bloqué). Tant qu'elles ne sont pas arrivées, rien n'est affiché ; en cas d'échec, la page continue sans.
// Les lignes ne sont pas des surfaces remplies : pas de problème d'horizon ; on ne trace que les segments dont les deux extrémités sont du côté visible.
// Les noms apparaissent selon le niveau de zoom « carte web » (0 = monde entier, +1 à chaque doublement) : pays et villes ont chacun un zoom minimal d'affichage (Natural Earth).
let earthBorders = null, bordersState = 'idle';   // données préparées, état du chargement : idle | loading | ready | error

function requestEarthBorders() {
  if (bordersState !== 'idle') return;
  bordersState = 'loading';
  try {
    const sc = document.createElement('script');
    sc.src = 'js/lazy/earth-borders.js';
    sc.onload = () => { if (typeof EARTH_BORDERS !== 'undefined') { prepareEarthBorders(EARTH_BORDERS); bordersState = 'ready'; } else bordersState = 'error'; };
    sc.onerror = () => { bordersState = 'error'; };
    (document.head || document.body).appendChild(sc);
  } catch (e) { bordersState = 'error'; }
}

// vecteurs unitaires précalculés (aucune trigonométrie par image), centre et rayon angulaire de chaque ligne pour écarter vite ce qui est caché ou hors de l'écran
function unitVec(lonDeg, latDeg) { const lo = lonDeg * DEG, la = latDeg * DEG, c = Math.cos(la); return [c * Math.sin(lo), Math.sin(la), c * Math.cos(lo)]; }   // même repère que viewPt
function prepareEarthBorders(raw) {
  const lines = raw.lines.map(([kind, flat]) => {
    const n = flat.length / 2, v = new Float32Array(n * 3); let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < n; i++) { const u = unitVec(flat[2 * i] / 1000, flat[2 * i + 1] / 1000); v[3 * i] = u[0]; v[3 * i + 1] = u[1]; v[3 * i + 2] = u[2]; cx += u[0]; cy += u[1]; cz += u[2]; }
    const l = Math.hypot(cx, cy, cz) || 1; cx /= l; cy /= l; cz /= l;
    let rho = 0; for (let i = 0; i < n; i++) rho = Math.max(rho, Math.acos(Math.max(-1, Math.min(1, v[3 * i] * cx + v[3 * i + 1] * cy + v[3 * i + 2] * cz))));
    return { kind, v, n, c: [cx, cy, cz], rho };
  });
  const place = (name, lon, lat, z10, extra) => Object.assign({ name, lon, lat, z: z10 / 10, u: unitVec(lon, lat) }, extra);
  earthBorders = {
    lines,
    countries: raw.countries.map(([name, lon, lat, z]) => place(name, lon, lat, z)),
    cities: raw.cities.map(([name, lon, lat, z, pop, cap]) => place(name, lon, lat, z, { pop, cap })),
  };
}

const webZoom = rpx => Math.log2(2 * Math.PI * rpx / 256);   // niveau de zoom « carte web » correspondant au rayon de la Terre à l'écran

// étiquette avec contour sombre, sans chevauchement (utilise le registre commun des étiquettes)
function borderLabel(text, x, y, size, color, weight) {
  ctx.font = weight + ' ' + size + 'px system-ui, sans-serif';
  const m = ctx.measureText ? ctx.measureText(text) : null, w = m && m.width ? m.width : text.length * size * 0.6;
  if (x + w / 2 < 0 || x - w / 2 > W || y < 0 || y > H + size || !lblFree(x - w / 2, y, w, size)) return false;
  lblBoxes.push([x - w / 2, y - size, x + w / 2, y]);
  ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.strokeText(text, x, y); ctx.fillStyle = color; ctx.fillText(text, x, y);
  return true;
}

function drawEarthBorders(b, sx, sy, rpx) {
  if (!earthBorders) { requestEarthBorders(); return; }
  const S = b.surf, z = webZoom(rpx), lat0 = S.view.lat * DEG, lon0 = S.view.lon * DEG;
  const cl = Math.cos(lon0), sl = Math.sin(lon0), ca = Math.cos(lat0), sa = Math.sin(lat0), cp = Math.cos(S.psi), sp = Math.sin(S.psi);
  const vc = [ca * sl, sa, ca * cl];   // direction du centre de la vue, même repère
  // projection d'un vecteur unitaire (même transformation que viewPt puis surfPt) : retourne [x, y, z] (z > 0 = côté visible) sans allocation superflue
  const out = [0, 0, 0];
  const proj = (vx, vy, vz) => {
    const x1 = vx * cl - vz * sl, z1 = vx * sl + vz * cl, y2 = vy * ca - z1 * sa, z2 = vy * sa + z1 * ca, dx = x1 * rpx, dy = -y2 * rpx;
    out[0] = sx + dx * cp - dy * sp; out[1] = sy + dx * sp + dy * cp; out[2] = z2; return out;
  };
  // 1. trait de côte (type 2, net, toujours tracé en premier) puis frontières (0 et 1)
  if (z >= 3.4) {
    const stride = z < 4.6 ? 3 : z < 6 ? 2 : 1;
    ctx.lineWidth = z > 8 ? 1.8 : z > 6 ? 1.4 : 1; ctx.lineJoin = 'round';
    for (const kindPass of [2, 0, 1]) {
      ctx.strokeStyle = kindPass === 2 ? 'rgba(255,255,255,0.9)' : kindPass ? 'rgba(255,170,120,0.8)' : 'rgba(255,255,255,0.7)'; ctx.setLineDash(kindPass === 1 ? [5, 5] : []);
      if (kindPass === 2) ctx.lineWidth = z > 8 ? 1.6 : 1.2;
      for (const L of earthBorders.lines) {
        if (L.kind !== kindPass) continue;
        const d = Math.acos(Math.max(-1, Math.min(1, L.c[0] * vc[0] + L.c[1] * vc[1] + L.c[2] * vc[2])));
        if (d - L.rho > Math.PI / 2) continue;   // entièrement caché
        const c = proj(L.c[0], L.c[1], L.c[2]), rr = L.rho * rpx + 120;
        if (c[0] < -rr || c[0] > W + rr || c[1] < -rr || c[1] > H + rr) continue;   // hors de l'écran
        let run = [];
        const flush = () => { if (run.length > 1) strokeClipped(run); run = []; };
        for (let i = 0; i < L.n; i += (i + stride >= L.n - 1 ? 1 : stride)) {
          const p = proj(L.v[3 * i], L.v[3 * i + 1], L.v[3 * i + 2]);
          if (p[2] > 0.02) run.push([p[0], p[1]]); else flush();
          if (i === L.n - 1) break;
        }
        flush();
      }
    }
    ctx.setLineDash([]);
  }
  // 2. noms de pays (en capitales) : ceux dont le zoom minimal est atteint ; la taille croît avec le zoom
  let shown = 0;
  for (const c of earthBorders.countries) {
    if (z < c.z + 1 || shown >= 40) continue;   // un pays est nommé quand l'échelle de la carte web dépasse son niveau d'affichage Natural Earth + 1
    const p = proj(c.u[0], c.u[1], c.u[2]); if (p[2] < 0.25) continue;
    if (borderLabel(c.name.toUpperCase(), p[0], p[1], Math.max(11, Math.min(22, 11 + (z - c.z - 1) * 1.6)), 'rgba(255,255,255,0.92)', 700)) shown++;
  }
  // 3. villes (les plus peuplées d'abord) : un point (capitale : un anneau) et le nom
  shown = 0;
  for (const c of earthBorders.cities) {
    if (z < c.z + 1.3 || shown >= 90) continue;
    const p = proj(c.u[0], c.u[1], c.u[2]); if (p[2] < 0.2 || p[0] < -20 || p[0] > W + 20 || p[1] < -20 || p[1] > H + 20) continue;
    ctx.fillStyle = '#ffe9a0'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    ctx.beginPath(); if (c.cap) ctx.rect(p[0] - 3.5, p[1] - 3.5, 7, 7); else ctx.arc(p[0], p[1], 2.6, 0, 7); ctx.fill(); ctx.stroke();
    if (borderLabel(c.name, p[0] + 4 + (c.name.length * 3), p[1] - 6, c.cap ? 13 : 12, '#ffffff', c.cap ? 700 : 400)) shown++;
  }
}

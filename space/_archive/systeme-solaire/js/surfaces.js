// Surfaces réelles : cartes géologiques publiques (js/surface-*.js, js/mars-data.js) et reliefs nommés de l'UAI (js/names.js).
// Chaque corps déclaré (b.surf) : morceaux de la carte projetés en orthographique (comme la Terre), orientation réelle, globe tourné à l'écran pour que l'axe
// soit perpendiculaire au Soleil, cratères et reliefs nommés à leur vraie position et taille, légende dans la fiche.
const SURFACES = [];   // corps ayant une orientation et des reliefs nommés (avec ou sans carte géologique)

// body ; geo : carte (ou null : noms seulement) ;
// iau : { a0, d0 (pôle, degrés), W0, Wd (méridien origine : W = W0 + Wd × jours depuis J2000, degrés) } ou { locked: true [, facing: corps, dir: ±1] } pour une rotation synchrone
//   (la même face reste tournée vers la planète ou le corps `facing` : orientation par la géométrie, cohérente avec la position affichée même si la phase orbitale est illustrative) ;
// tilt : latitude au centre du globe ; sites : [[nom, lon est, lat], …] (points d'intérêt supplémentaires, ex. sites d'atterrissage) ; opts : { haze: couleur de brume (Titan) }
function addSurface(body, geo, iau, tilt, sites, opts) {
  const parts = !geo ? [] : geo.parts.map(([cl, flat]) => {
    const ring = []; let x = 0, y = 0, z = 0;
    for (let i = 0; i < flat.length; i += 2) {
      const lo = flat[i] / 10 * DEG, la = flat[i + 1] / 10 * DEG; ring.push([flat[i] / 10, flat[i + 1] / 10]);
      x += Math.cos(la) * Math.cos(lo); y += Math.cos(la) * Math.sin(lo); z += Math.sin(la);
    }
    let s = 0; for (let i = 0; i < ring.length; i++) { const j = (i + 1) % ring.length; s += ring[i][0] * ring[j][1] - ring[j][0] * ring[i][1]; }
    // petite calotte qui contient le morceau : centre (vecteur moyen) et rayon angulaire, pour écarter vite ce qui est caché ou minuscule
    const n = Math.hypot(x, y, z); let rho = Math.PI, c = [0, 0, 1];
    if (n > 1e-6 * ring.length) { c = [x / n, y / n, z / n]; rho = 0; for (const [lo, la] of ring) { const a = la * DEG, l = lo * DEG; rho = Math.max(rho, Math.acos(Math.max(-1, Math.min(1, c[0] * Math.cos(a) * Math.cos(l) + c[1] * Math.cos(a) * Math.sin(l) + c[2] * Math.sin(a))))); } }
    for (let i = 0; i < ring.length; i++) if (Math.abs(ring[i][0] - ring[(i + 1) % ring.length][0]) > 180) { ring.noCheck = true; break; }   // vérité planaire peu fiable : pas de vérification
    ring.ccw = s > 0;   // orientation planaire (lon/lat) : fiable même pour un anneau qui touche le pôle, là où le suivi des longitudes se trompe
    return { k: c, cls: cl, ring, a: Math.abs(s) / 2, rho };
  });
  const o = opts || {}, dir = iau.locked ? (iau.dir || (body.retro ? -1 : 1)) : Math.sign(iau.Wd);
  body.surf = { body, geo, parts, iau, dir, facing: iau.facing || body.parent, haze: o.haze || null, tilt, sites: sites || [], names: (typeof NAMES !== 'undefined' && NAMES[body.id]) || [],
    view: { lon: 0, lat: tilt }, psi: 0, sunRight: true, sub: 0, cache: null };
  if (geo) body.legend = geo.classes;
  body.feat = [];   // plus de taches aléatoires : le relief réel les remplace
  SURFACES.push(body);
}

// Longitude (est) du point subsolaire à la date t (jours depuis J2000), (mx, my) = position héliocentrique du corps (km)
function surfaceSubLon(S, t, mx, my) {
  if (S.iau.locked) {   // face tournée vers la planète : longitude du point subsolaire = angle (planète -> Soleil) vu du corps, vers l'est (sens de la rotation)
    const pf = pos[S.facing.idx], ux = pf[0] - mx, uy = pf[1] - my;
    return wrapLon(S.dir * (Math.atan2(-my, -mx) - Math.atan2(uy, ux)) / DEG);
  }
  const r = Math.hypot(mx, my) || 1, eps = 23.4393 * DEG, sx = -mx / r, sy = -my / r;          // direction du Soleil vue du corps (écliptique) -> équatoriale
  const s = [sx, sy * Math.cos(eps), sy * Math.sin(eps)];
  const a0 = S.iau.a0 * DEG, d0 = S.iau.d0 * DEG;
  const n = [Math.cos(d0) * Math.cos(a0), Math.cos(d0) * Math.sin(a0), Math.sin(d0)], Q = [-Math.sin(a0), Math.cos(a0), 0];
  const Pv = [n[1] * Q[2] - n[2] * Q[1], n[2] * Q[0] - n[0] * Q[2], n[0] * Q[1] - n[1] * Q[0]];
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  return wrapLon((Math.atan2(dot(s, Pv), dot(s, Q)) - (S.iau.W0 + S.iau.Wd * t) * DEG) / DEG);
}
// vitesse (rad/s) à laquelle le point subsolaire défile pour une vitesse de simulation `speed` (jours/s) : sert à plafonner la rotation affichée
const surfaceRate = (S, speed) => 2 * Math.PI * speed * (S.iau.locked ? 360 / (S.facing === S.body.parent ? S.body.T : S.facing.T) : Math.abs(S.iau.Wd)) / 360;

// où tombe un point du repère du globe (décalage en pixels) à l'écran, une fois le globe tourné
const surfPt = (S, sx, sy, dx, dy) => [sx + dx * Math.cos(S.psi) - dy * Math.sin(S.psi), sy + dx * Math.sin(S.psi) + dy * Math.cos(S.psi)];

// la carte, dans le disque du corps (appelée par drawSphere, le disque est déjà découpé)
function drawSurface(b, sx, sy, rpx) {
  const S = b.surf, geo = S.geo; if (!geo) return;
  const lat0 = toRad(S.view.lat), lon0 = toRad(S.view.lon);
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(S.psi);
  const ppd = rpx * Math.PI / 180, vc = [Math.cos(lat0) * Math.cos(lon0), Math.cos(lat0) * Math.sin(lon0), Math.sin(lat0)];
  const visible = p => { const d = Math.acos(Math.max(-1, Math.min(1, p.k[0] * vc[0] + p.k[1] * vc[1] + p.k[2] * vc[2]))); return d - p.rho < Math.PI / 2 && p.rho * rpx > 0.8; };
  if (geo.holes) {
    // trous compris : un seul tracé par classe (règle du remplissage non nul), construit autour de (0,0) et réutilisé tant que l'orientation et le rayon changent à peine
    const key = Math.round(S.view.lon * 20) + '|' + Math.round(S.view.lat * 20) + '|' + Math.round(rpx * 4);
    if (!S.cache || S.cache.key !== key) {
      const byClass = geo.classes.map(() => []);
      for (const p of S.parts) if (visible(p)) byClass[p.cls].push(p.ring);
      S.cache = { key, paths: byClass.map(rings => rings.length ? landPath2D(rings.flatMap(r => safeLandCommands(r, S.view.lat, S.view.lon, 0, 0, rpx)), 0, 0, rpx) : null) };
    }
    S.cache.paths.forEach((path, i) => { if (path) { ctx.fillStyle = geo.classes[i][1]; ctx.fill(path); } });
  } else {
    // sans trous (Mars) : un morceau à la fois, du plus grand au plus petit, les petits recouvrent
    const minA = 1.2 / (ppd * ppd);
    for (const p of S.parts) {
      if (p.a < minA || !visible(p)) continue;
      const cmds = safeLandCommands(p.ring, S.view.lat, S.view.lon, 0, 0, rpx);
      if (cmds.length) { ctx.fillStyle = geo.classes[p.cls][1]; ctx.fill(landPath2D(cmds, 0, 0, rpx)); }
    }
  }
  if (S.haze) { ctx.fillStyle = S.haze; ctx.fillRect(-rpx, -rpx, rpx * 2, rpx * 2); }   // brume (Titan : on ne voit la surface qu'à travers)
  ctx.restore();
}

// cratères (cercles à leur vraie taille), noms des reliefs (ils apparaissent quand ils deviennent assez grands à l'écran) et points d'intérêt ; au-dessus du disque
function drawSurfaceLabels(b, sx, sy, rpx) {
  const S = b.surf, lat0 = toRad(S.view.lat), lon0 = toRad(S.view.lon), k = rpx / b.R;
  let shown = 0;   // au plus 60 noms à la fois (les plus grands reliefs d'abord : la liste est triée)
  for (const [name, lon, lat, d, type] of S.names) {
    const pd = d * k, crater = type === 'c';
    if (d > 0 ? pd < (crater ? 5 : 26) : rpx < 260) continue;
    const v = viewPt(lon, lat, lat0, lon0); if (v.z < 0.1) continue;
    const [x, y] = surfPt(S, sx, sy, v.x * rpx, -v.y * rpx);
    if (crater && pd >= 5 && !S.glCraters) {   // un cercle vu en biais est une ellipse écrasée vers le centre du disque
      ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.6, pd / 2 * v.z), pd / 2, Math.atan2(-v.y, v.x) + S.psi, 0, 7);
      ctx.fillStyle = 'rgba(0,0,0,0.09)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.stroke();
    }
    if (shown < 60 && pd >= 26 && v.z > 0.25 && lblFree(x - 20, y + 4, name.length * 6, 11)) { lbl(name, x - name.length * 2.8, y + 4, crater ? '#ffe9d6' : '#d6e2ff', 11, 400); shown++; }
  }
  for (const [name, lon, lat] of S.sites) {
    const v = viewPt(lon, lat, lat0, lon0); if (v.z < 0.12) continue;
    const [x, y] = surfPt(S, sx, sy, v.x * rpx, -v.y * rpx);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill(); ctx.stroke();
    lbl(name, x + 6, y + 4, '#ffe9d6', 11);
  }
}

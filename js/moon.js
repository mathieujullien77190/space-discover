// La Lune en 3D : sphère texturée avec la carte géologique unifiée de l'USGS (même style que le projet « système solaire » archivé : mers sombres, hautes terres claires, cratères),
// peinte À PLAT (équirectangulaire) avec les mêmes fonctions que la Terre (texRing). Unité de la scène : rayon de la Terre ; la Lune est à ≈ 60 unités.
// Repère propre de la Lune (comme `ll` pour la Terre) : y = pôle nord, x = longitude 0 / latitude 0 (face visible, tournée vers la Terre), l'est tourne dans le sens direct autour de y.
const MOON_R = 1737.4 / R_KM, MOON_BASE = '#8f8c87';
function paintMoonTexture(TW, TH) {
  const c = document.createElement('canvas'); c.width = TW; c.height = TH;
  const g = c.getContext('2d'); g.fillStyle = MOON_BASE; g.fillRect(0, 0, TW, TH);
  const rings = SURF_MOON.parts.map(([cl, flat]) => { const r = []; for (let i = 0; i < flat.length; i += 2) r.push([flat[i] / 10, flat[i + 1] / 10]); return { cl, r }; });
  SURF_MOON.classes.forEach(([, color], cl) => {
    g.fillStyle = color; g.beginPath();
    for (const p of rings) if (p.cl === cl) texRing(g, p.r, TW, TH);
    g.fill('nonzero');
  });
  return c;
}
// maillage de la Lune (créé à la demande : la texture 4096 × 2048 coûte ~0,3 s)
function buildMoonMesh(renderer) {
  const tex = new THREE.CanvasTexture(paintMoonTexture(4096, 2048));
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
  const mesh = new THREE.Mesh(earthGeometry(192, 96), new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 }));
  mesh.scale.setScalar(MOON_R);
  return mesh;
}
// orientation de la Lune dans le repère de la mission : y local = normale au plan de l'orbite (nord), x local = vers la Terre (rotation synchrone) ;
// mhat = direction Terre → Lune (unitaire), n = normale du plan (s × e), out = quaternion
function moonQuat(mhat, n, out) {
  const X = mhat.clone().negate().normalize(), Y = n.clone().addScaledVector(X, -n.dot(X)).normalize(), Z = new THREE.Vector3().crossVectors(X, Y);   // (Y orthogonalisé : n n'est pas forcément perpendiculaire à X)
  return out.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
}

// ---------- Soleil et Lune réels (formules approchées de Meeus) ----------
// Repère INERTIEL (équatorial) en axes de la scène : (X, Y, Z)équatorial → (X, Z, −Y) ; unité = rayon de la Terre. Dans le repère de la Terre fixe (la scène normale) : tourner de −GMST autour de y.
const AU_U = 149597870.7 / R_KM, SUN_R_U = 695700 / R_KM, EPS = 23.4393 * Math.PI / 180;
const astroD = d => d.getTime() / 86400000 + 2440587.5 - 2451545;   // jours depuis J2000
const gmstOf = D => ((280.46061837 + 360.98564736629 * D) % 360) * Math.PI / 180;   // temps sidéral de Greenwich (rad)
const eqScene = (X, Y, Z, out) => (out || new THREE.Vector3()).set(X, Z, -Y);
function sunGeo(D) {   // Terre → Soleil (inertiel, unités)
  const r = Math.PI / 180, M = (357.528 + 0.9856003 * D) * r, lam = (280.46 + 0.9856474 * D + 1.915 * Math.sin(M) + 0.02 * Math.sin(2 * M)) * r, R = 1.00014 - 0.01671 * Math.cos(M) - 0.00014 * Math.cos(2 * M);
  return eqScene(R * Math.cos(lam), R * Math.sin(lam) * Math.cos(EPS), R * Math.sin(lam) * Math.sin(EPS)).multiplyScalar(AU_U);
}
function moonInertial(D) {   // Terre → Lune (inertiel) ; précision ≈ 0,3° (basse précision de Meeus)
  const r = Math.PI / 180, L = 218.316 + 13.176396 * D, M = (134.963 + 13.064993 * D) * r, F = (93.272 + 13.22935 * D) * r;
  const lon = (L + 6.289 * Math.sin(M)) * r, lat = 5.128 * Math.sin(F) * r, km = 385001 - 20905 * Math.cos(M);
  const ra = Math.atan2(Math.sin(lon) * Math.cos(EPS) - Math.tan(lat) * Math.sin(EPS), Math.cos(lon)), dec = Math.asin(Math.sin(lat) * Math.cos(EPS) + Math.cos(lat) * Math.sin(EPS) * Math.sin(lon));
  return { pos: eqScene(Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)).multiplyScalar(km / R_KM), km };
}
const ECLIPTIC_POLE = eqScene(0, -Math.sin(EPS), Math.cos(EPS));   // axe de la Lune à ~1,5° près
// la Lune dans le repère de la Terre fixe : { pos, km, pole }
function moonNow(d) {
  const D = astroD(d), mi = moonInertial(D), g = gmstOf(D), Y = new THREE.Vector3(0, 1, 0);
  return { pos: mi.pos.applyAxisAngle(Y, -g), km: mi.km, pole: ECLIPTIC_POLE.clone().applyAxisAngle(Y, -g) };
}

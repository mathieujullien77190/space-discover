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

// position approchée de la Lune (formules à basse précision de Meeus, ~0,3°) dans le repère de la Terre (celui de la scène : x vers (0°, 0°), y nord) à la date d ; { pos (unités = rayons terrestres), km }
function moonNow(d) {
  const D = d.getTime() / 86400000 + 2440587.5 - 2451545, rad = Math.PI / 180, L = 218.316 + 13.176396 * D, M = (134.963 + 13.064993 * D) * rad, F = (93.272 + 13.22935 * D) * rad;
  const lon = (L + 6.289 * Math.sin(M)) * rad, lat = 5.128 * Math.sin(F) * rad, km = 385001 - 20905 * Math.cos(M), eps = 23.4393 * rad;
  const ra = Math.atan2(Math.sin(lon) * Math.cos(eps) - Math.tan(lat) * Math.sin(eps), Math.cos(lon)), dec = Math.asin(Math.sin(lat) * Math.cos(eps) + Math.cos(lat) * Math.sin(eps) * Math.sin(lon));
  const gmst = (280.46061837 + 360.98564736629 * D) * rad, glon = (ra - gmst) / rad;   // longitude du point sublunaire (est)
  const pa = 270 * rad - gmst, pd = Math.PI / 2 - eps;   // pôle nord de l'écliptique (axe de la Lune à ~1,5° près), dans le repère de la Terre
  return { pos: ll(((glon + 540) % 360) - 180, dec / rad).multiplyScalar(km / R_KM), km, pole: new THREE.Vector3(Math.cos(pd) * Math.cos(pa), Math.sin(pd), -Math.cos(pd) * Math.sin(pa)) };
}

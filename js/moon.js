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
  const X = mhat.clone().negate(), Y = n.clone().normalize(), Z = new THREE.Vector3().crossVectors(X, Y);
  return out.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
}

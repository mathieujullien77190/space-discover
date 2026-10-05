// Globes en 3D (three.js) : conventions. Sans WebGL, on vérifie avec le vrai three.js que la position à l'écran d'un point de la sphère (sommet de SphereGeometry, coordonnées de texture -> lon/lat)
// coïncide avec la projection 2D du reste de l'application (viewPt + rotation d'écran psi), pour des centaines de vues et de sommets.
const ROOT = require('path').join(__dirname, '..', '..');
let s = require(ROOT + '/tools/load-page.js')();
const mkEl = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, append() {}, addEventListener() {}, querySelectorAll() { return []; }, setPointerCapture() {}, getContext() { return ctx; }, innerHTML: '' });
const ctx = new Proxy({}, { get: (t, k) => k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : k in t ? t[k] : () => {}, set: (t, k, v) => { t[k] = v; return true; } });
globalThis.document = { getElementById: () => mkEl(), createElement: () => mkEl(), activeElement: null };
globalThis.innerWidth = 1200; globalThis.innerHeight = 800; globalThis.devicePixelRatio = 1; globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => {}; globalThis.Path2D = class { moveTo() {} lineTo() {} arc() {} closePath() {} rect() {} addPath() {} }; globalThis.performance = { now: () => 0 };
s = s.replace(/requestAnimationFrame\(loop\);\s*$/, '') + 'globalThis.T = { globeOrientation, viewPt, surfPt, GLOBE_GL, SURFACES, BODIES, EARTHB, THREE: globalThis.THREE };';
new Function(s)();
const T = globalThis.T, THREE = T.THREE, ok = (c, m) => console.log((c ? 'OK  ' : 'FAIL') + ' ' + m);
ok(THREE && THREE.REVISION === '160', 'three.js r' + (THREE && THREE.REVISION) + ' chargé');
ok(T.GLOBE_GL === null, 'sans WebGL (Node) : GLOBE_GL = null, le rendu 2D prend le relais');
const geo = new THREE.SphereGeometry(1, 64, 32), pos = geo.attributes.position, uv = geo.attributes.uv, D = Math.PI / 180;
let worst = 0, n = 0, visible = 0, seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let trial = 0; trial < 300; trial++) {
  const lat0 = (rnd() * 2 - 1) * 70, lon0 = rnd() * 360 - 180, psi = (rnd() * 2 - 1) * Math.PI / 2;
  const q = new THREE.Quaternion().setFromEuler(T.globeOrientation(lat0, lon0, psi));
  for (let i = 0; i < pos.count; i += 37) {
    const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyQuaternion(q);                    // position dans la scène (y vers le haut)
    const u = (uv.getX(i) + 0.25) % 1, lon = u * 360 - 180, lat = (uv.getY(i) - 0.5) * 180;                  // texture.offset.x = 0.25 : retour en lon/lat de la carte
    const p = T.viewPt(lon, lat, lat0 * D, lon0 * D), [X, Y] = T.surfPt({ psi }, 0, 0, p.x, -p.y);          // projection 2D (y vers le bas) avec la rotation d'écran
    const e = Math.hypot(v.x - X, v.y + Y, v.z - p.z); worst = Math.max(worst, e); n++; if (p.z > 0) visible++;
  }
}
ok(worst < 1e-5, n + ' sommets sur 300 vues : écart maximal entre three.js et la projection 2D = ' + worst.toExponential(1) + ' (' + visible + ' côté caméra)');
// quelques points de repère : le centre de la vue est bien au centre ; le pôle nord est en haut quand psi = 0 et lat0 = 0
const q0 = new THREE.Quaternion().setFromEuler(T.globeOrientation(0, 0, 0)), north = new THREE.Vector3(0, 1, 0).applyQuaternion(q0);
ok(Math.abs(north.y - 1) < 1e-9, 'vue (0°, 0°, psi 0) : le pôle nord est en haut');
const q1 = new THREE.Quaternion().setFromEuler(T.globeOrientation(25, 40, 0)); const c = new THREE.Vector3(Math.cos(25 * D) * Math.sin(0), Math.sin(25 * D), Math.cos(25 * D) * Math.cos(0));
const centre = (() => { const lon = 40, lat = 25, uTex = (lon + 180) / 360, u3 = (uTex - 0.25 + 1) % 1, th = (0.5 - lat / 180) * Math.PI; return new THREE.Vector3(-Math.cos(u3 * 2 * Math.PI) * Math.sin(th), Math.cos(th), Math.sin(u3 * 2 * Math.PI) * Math.sin(th)).applyQuaternion(q1); })();
ok(Math.abs(centre.x) < 1e-6 && Math.abs(centre.y) < 1e-6 && centre.z > 0.999, 'le point (lon 40°, lat 25°) est au centre du disque quand la vue est centrée dessus');

// ---- tous les corps de SURFACES : l'orientation 3D coïncide avec viewPt + surfPt (vues et psi aléatoires, y compris les vues réelles S.view) ----
let worstAll = 0, nAll = 0;
for (const b of T.SURFACES) {
  const S = b.surf;
  for (let trial = 0; trial < 40; trial++) {
    const real = trial === 0, lat0 = real ? S.view.lat : (rnd() * 2 - 1) * 80, lon0 = real ? S.view.lon : rnd() * 360 - 180, psi = real ? S.psi : (rnd() * 2 - 1) * Math.PI / 2;
    const q = new THREE.Quaternion().setFromEuler(T.globeOrientation(lat0, lon0, psi));
    for (let i = 0; i < pos.count; i += 53) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyQuaternion(q);
      const u = (uv.getX(i) + 0.25) % 1, lon = u * 360 - 180, lat = (uv.getY(i) - 0.5) * 180;
      const p = T.viewPt(lon, lat, lat0 * D, lon0 * D), [X, Y] = T.surfPt({ psi }, 0, 0, p.x, -p.y);
      worstAll = Math.max(worstAll, Math.hypot(v.x - X, v.y + Y, v.z - p.z)); nAll++;
    }
  }
}
ok(worstAll < 1e-5, T.SURFACES.length + ' corps de SURFACES, ' + nAll + ' sommets : écart maximal three.js / projection 2D = ' + worstAll.toExponential(1));
// ---- corps sans surf (Soleil, géantes) : axe vertical, vue sur l'équateur ; le point (lon, lat) est vu à x = cos φ sin(λ + spin), y = sin φ, z = cos φ cos(λ + spin) comme le 2D ----
const noSurf = T.BODIES.filter(b => !b.surf && !b.comet && !b.probe);
let worstSpin = 0;
for (const b of noSurf) {
  for (let trial = 0; trial < 30; trial++) {
    const spin = (rnd() * 2 - 1) * 40, q = new THREE.Quaternion().setFromEuler(T.globeOrientation(0, -spin / D, 0));
    for (let i = 0; i < pos.count; i += 53) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyQuaternion(q);
      const u = (uv.getX(i) + 0.25) % 1, lam = (u * 360 - 180) * D + spin, ph = (uv.getY(i) - 0.5) * Math.PI;
      worstSpin = Math.max(worstSpin, Math.hypot(v.x - Math.cos(ph) * Math.sin(lam), v.y - Math.sin(ph), v.z - Math.cos(ph) * Math.cos(lam)));
    }
  }
}
ok(worstSpin < 1e-5, noSurf.map(b => b.id).join(', ') + ' : rotation autour de l axe vertical selon b.spin, écart maximal = ' + worstSpin.toExponential(1));

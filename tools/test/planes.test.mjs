// Avions de nuit : simulation physique (altitude de croisière ≈ 10 000 m, ≈ 900 km/h, ligne droite), deux feux (rouge à gauche, vert à droite), visibles à plus de 8° d'élévation, rares, rien de jour.
import * as THREE from 'three';
import { PLANE_ALTITUDE_M, PLANE_CLOSEST_M, PLANE_FIRST_S, PLANE_MIN_ELEVATION_DEG, PLANE_SLOTS, PLANE_SPEED_MS, PLANE_WINGSPAN_M, createPlanes, distanceM, elevationDeg, makeTrack, planeAt } from '../../src/engine/planes.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
let seed = 2468; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// trajectoire physique
let allOk = true, minSpeedKmh = 1e9, maxSpeedKmh = 0, minH = 1e9, maxH = 0;
for (let i = 0; i < 200; i++) {
  const tr = makeTrack(rand), a = planeAt(tr, 0), b = planeAt(tr, 10), d = Math.hypot(b.center[0] - a.center[0], b.center[1] - a.center[1], b.center[2] - a.center[2]) / 10 * 3.6;
  minSpeedKmh = Math.min(minSpeedKmh, d); maxSpeedKmh = Math.max(maxSpeedKmh, d); minH = Math.min(minH, tr.H); maxH = Math.max(maxH, tr.H);
  if (Math.abs(a.center[2] - b.center[2]) > 1e-9) allOk = false;   // altitude constante
  if (elevationDeg(a.center) < PLANE_MIN_ELEVATION_DEG - 0.5) allOk = false;   // visible dès le début
  if (tr.c < PLANE_CLOSEST_M[0] || tr.c > PLANE_CLOSEST_M[1]) allOk = false;
}
check(minSpeedKmh > PLANE_SPEED_MS[0] * 3.6 - 1 && maxSpeedKmh < PLANE_SPEED_MS[1] * 3.6 + 1 && minSpeedKmh > 790 && maxSpeedKmh < 950, 'vitesse sol ' + minSpeedKmh.toFixed(0) + ' à ' + maxSpeedKmh.toFixed(0) + ' km/h (≈ 900 km/h)');
check(minH >= PLANE_ALTITUDE_M[0] && maxH <= PLANE_ALTITUDE_M[1] && minH > 8999 && maxH < 12000, 'altitude de croisière ' + minH.toFixed(0) + ' à ' + maxH.toFixed(0) + ' m (≈ 10 000 m)');
check(allOk, 'ligne droite à altitude constante, visible dès l’apparition, passage à 0–45 km');
// deux feux : rouge à gauche du cap, vert à droite, 60 m d'écart
const tr = makeTrack(rand), st = planeAt(tr, 5), sep = Math.hypot(st.left[0] - st.right[0], st.left[1] - st.right[1], st.left[2] - st.right[2]);
const cross = (st.left[0] - st.center[0]) * tr.hy * -1 + (st.left[1] - st.center[1]) * tr.hx;   // composante du vecteur centre→gauche selon (−hy, hx) : doit être > 0
check(Math.abs(sep - PLANE_WINGSPAN_M) < 1e-6 && cross > 0, 'bouts d’aile à ' + sep.toFixed(0) + ' m l’un de l’autre, le point de gauche (rouge) est bien à gauche du cap');
// vitesse angulaire apparente : à la verticale ≈ v / H
const over = { H: 10000, speed: 250, c: 0, hx: 1, hy: 0, nx: 0, ny: 1, S: 70000, s0: -20000 }, p0 = planeAt(over, 80 - 0.5), p1 = planeAt(over, 80 + 0.5);   // t = 80 s : s = 0
const w = Math.acos((p0.center[0] * p1.center[0] + p0.center[1] * p1.center[1] + p0.center[2] * p1.center[2]) / distanceM(p0.center) / distanceM(p1.center)) * 180 / Math.PI;
check(Math.abs(w - 1.43) < 0.1, 'à la verticale : ' + w.toFixed(2) + '°/s (250 m/s à 10 000 m ≈ 1,43°/s)');
const farSep = Math.hypot(...[0, 1, 2].map(k => planeAt(over, 0).left[k] - planeAt(over, 0).right[k])) / distanceM(planeAt(over, 0).center) * 180 / Math.PI;
check(farSep > 0.05 && farSep < 0.4, 'écart angulaire des deux feux ≈ ' + farSep.toFixed(2) + '° à 22 km (≈ 3 à 4 pixels)');
// moteur
const cam = { position: new THREE.Vector3() }, up = [0, 1, 0], east = [1, 0, 0], north = [0, 0, -1], R = 1000;
const mk = () => createPlanes(new THREE.Scene(), rand), step = (p, dt, enabled = true) => p.update({ dt, enabled, camera: cam, R, up, east, north });
let p = mk(); for (let i = 0; i < 3000; i++) step(p, 0.1, false);
check(p.total() === 0, 'ciel de jour (désactivé) : aucun avion en 300 s');
p = mk(); let t = 0; while (p.total() === 0 && t < 100) { step(p, 0.1); t += 0.1; }
check(p.total() === 1 && t >= PLANE_FIRST_S[0] - 0.2 && t <= PLANE_FIRST_S[1] + 0.2, 'premier avion après ' + t.toFixed(1) + ' s (entre ' + PLANE_FIRST_S.join(' et ') + ' s)');
const pts = p.group.children[0]; let visibleSteps = 0, minE = 90, redLeft = true;
for (let i = 0; i < 6000 && p.count() > 0; i++) {
  step(p, 0.1); if (!pts.visible) continue; visibleSteps++;
  const a = pts.geometry.attributes.position, l = new THREE.Vector3(a.getX(0), a.getY(0), a.getZ(0)), r = new THREE.Vector3(a.getX(1), a.getY(1), a.getZ(1));
  minE = Math.min(minE, Math.asin(l.normalize().y) * 180 / Math.PI);
  const col = pts.geometry.attributes.color; if (!(col.getX(0) > col.getY(0) && col.getY(1) > col.getX(1))) redLeft = false; void r;
}
check(visibleSteps > 50 && minE > 7, 'visible ' + (visibleSteps / 10).toFixed(0) + ' s, jamais plus bas que ' + minE.toFixed(1) + '° d’élévation');
check(redLeft && pts.geometry.attributes.color.count === 2, 'premier point rouge, second vert (deux points, pas de flash)');
let maxCount = 0, total = 0; p = mk(); for (let i = 0; i < 36000; i++) { step(p, 0.1); maxCount = Math.max(maxCount, p.count()); total = p.total(); }
check(maxCount <= PLANE_SLOTS && total >= 60 && total <= 260, 'en 1 h : ' + total + ' avions, jamais plus de ' + PLANE_SLOTS + ' à la fois (' + maxCount + ')');
for (let i = 0; i < 20; i++) step(p, 0.1, false);
check(p.count() === 0, 'désactivé : tout s’éteint');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }

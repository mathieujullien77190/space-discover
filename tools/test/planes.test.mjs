// Avions de nuit : rares, lents (1 à 2°/s), un feu constant et un flash toutes les 1,2 s, au-dessus de l'horizon, rien de jour.
import * as THREE from 'three';
import { PLANE_FIRST_S, PLANE_GAP_S, PLANE_SLOTS, PLANE_SPEED_DEG_S, PLANE_STROBE_FLASH_S, PLANE_STROBE_PERIOD_S, createPlanes, planeLight } from '../../src/engine/planes.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
let seed = 2468; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const cam = { position: new THREE.Vector3() }, up = [0, 1, 0], east = [1, 0, 0], north = [0, 0, -1], R = 1000;
const mk = () => createPlanes(new THREE.Scene(), rand), step = (p, dt, enabled = true) => p.update({ dt, enabled, camera: cam, R, up, east, north });

let p = mk();
for (let i = 0; i < 3000; i++) step(p, 0.1, false);
check(p.total() === 0, 'ciel de jour (désactivé) : aucun avion en 300 s');
p = mk(); let t = 0; while (p.total() === 0 && t < 100) { step(p, 0.1); t += 0.1; }
check(p.total() === 1 && t >= PLANE_FIRST_S[0] - 0.2 && t <= PLANE_FIRST_S[1] + 0.2, 'premier avion après ' + t.toFixed(1) + ' s (entre ' + PLANE_FIRST_S.join(' et ') + ' s)');
// trajectoire : lente, au-dessus de l'horizon
const pts = p.group.children[0]; let prev = null, maxSpeed = 0, minSpeed = 1e9, minElev = 90, t2 = 0, flashes = 0, lastLight = 0.3, strobeMin = 1, strobeMax = 0;
while (p.count() > 0 && t2 < 200) {
  step(p, 0.05); t2 += 0.05; if (!pts.visible) continue;
  const a = pts.geometry.attributes.position, v = new THREE.Vector3(a.getX(0), a.getY(0), a.getZ(0)).normalize();
  minElev = Math.min(minElev, Math.asin(v.y) * 180 / Math.PI);
  if (prev) { const sp = Math.acos(Math.max(-1, Math.min(1, v.dot(prev)))) * 180 / Math.PI / 0.05; maxSpeed = Math.max(maxSpeed, sp); minSpeed = Math.min(minSpeed, sp); } prev = v;
  const l = pts.material.color.getHex() === 0xffffff ? 1 : 0.3; if (l === 1 && lastLight === 0.3) flashes++; lastLight = l;
  strobeMin = Math.min(strobeMin, pts.material.opacity); strobeMax = Math.max(strobeMax, pts.material.opacity);
}
check(maxSpeed < PLANE_SPEED_DEG_S[1] * 1.15 && minSpeed > PLANE_SPEED_DEG_S[0] * 0.85, 'vitesse apparente ' + minSpeed.toFixed(2) + ' à ' + maxSpeed.toFixed(2) + '°/s (attendu ' + PLANE_SPEED_DEG_S.join(' à ') + ')');
check(t2 > 30 && t2 < 130, 'traversée en ' + t2.toFixed(0) + ' s');
check(minElev > 3, 'reste au-dessus de l’horizon (hauteur minimale ' + minElev.toFixed(1) + '°)');
check(flashes >= Math.floor(t2 / PLANE_STROBE_PERIOD_S) - 3 && flashes <= Math.ceil(t2 / PLANE_STROBE_PERIOD_S) + 1, 'flash anticollision : ' + flashes + ' flashs en ' + t2.toFixed(0) + ' s (un toutes les ' + PLANE_STROBE_PERIOD_S + ' s)');
check(planeLight(0) === 1 && planeLight(PLANE_STROBE_FLASH_S + 0.01) === 0.3 && planeLight(PLANE_STROBE_PERIOD_S + 0.05) === 1, 'feu : flash bref (' + PLANE_STROBE_FLASH_S + ' s) puis feu constant faible');
check(strobeMax > strobeMin * 2, 'opacité du point : flash ' + strobeMax.toFixed(2) + ' contre feu constant ≈ ' + strobeMin.toFixed(2));
// rareté et limite
p = mk(); for (let i = 0; i < 18000; i++) step(p, 0.1);   // 30 min
check(p.total() >= 8 && p.total() <= 40 && PLANE_GAP_S[0] >= 30, 'en 30 min : ' + p.total() + ' avions (un toutes les ' + PLANE_GAP_S.join(' à ') + ' s)');
let maxCount = 0; p = mk(); for (let i = 0; i < 20000; i++) { step(p, 0.1); maxCount = Math.max(maxCount, p.count()); }
check(maxCount <= PLANE_SLOTS, 'jamais plus de ' + PLANE_SLOTS + ' à la fois (' + maxCount + ')');
for (let i = 0; i < 20; i++) step(p, 0.1, false);
check(p.count() === 0, 'désactivé : tout s’éteint');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }

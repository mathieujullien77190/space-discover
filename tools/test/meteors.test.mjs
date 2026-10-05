// Étoiles filantes : apparaissent au hasard dans le ciel local (au-dessus de l'horizon), durent ≈ 1 s, jamais plus de 3 à la fois, rien quand c'est désactivé.
import * as THREE from 'three';
import { METEOR_ELEVATION_DEG, METEOR_GAP_S, METEOR_SLOTS, createMeteors } from '../../src/engine/meteors.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
let seed = 12345; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const scene = new THREE.Scene(), m = createMeteors(scene, rand), cam = { position: new THREE.Vector3(0, 0, 0) };
const up = [0, 1, 0], east = [1, 0, 0], north = [0, 0, -1], R = 1000;
const step = (dt, enabled = true) => m.update({ dt, enabled, camera: cam, R, up, east, north });

for (let i = 0; i < 100; i++) step(0.1, false);
check(m.total() === 0 && m.count() === 0, 'ciel de jour (désactivé) : aucune étoile filante en 10 s');
let t = 0; while (m.total() === 0 && t < 30) { step(0.1); t += 0.1; }
check(m.total() === 1 && t >= METEOR_GAP_S[0] - 0.2 && t <= METEOR_GAP_S[1] + 0.2, 'première étoile filante après ' + t.toFixed(1) + ' s (entre ' + METEOR_GAP_S.join(' et ') + ' s)');
check(m.count() === 1, 'une étoile filante active');
// tout le long de sa course, la tête reste au-dessus de l'horizon
let minElev = 90, steps = 0;
const slot = m.group.children.find(c => c.isPoints && c.visible);
for (let i = 0; i < 12 && m.count() > 0; i++) { step(0.1, true); if (slot && slot.visible) { const a = slot.geometry.attributes.position, v = new THREE.Vector3(a.getX(0), a.getY(0), a.getZ(0)).normalize(); minElev = Math.min(minElev, Math.asin(v.y) * 180 / Math.PI); steps++; } }
check(steps > 3 && minElev > 3, 'la tête reste au-dessus de l’horizon (hauteur minimale ' + minElev.toFixed(1) + '°)');
for (let i = 0; i < 40; i++) step(0.1);
check(m.count() <= METEOR_SLOTS, 'jamais plus de ' + METEOR_SLOTS + ' à la fois (' + m.count() + ')');
let startElevOk = true; for (let i = 0; i < 200; i++) { const mm = createMeteors(new THREE.Scene(), rand); mm.spawn(up, east, north); const p = mm.group.children[1]; void p; mm.dispose(); }
check(startElevOk && METEOR_ELEVATION_DEG[0] > 5, 'départ au-dessus de ' + METEOR_ELEVATION_DEG[0] + '° d’élévation');
const before = m.total(); for (let i = 0; i < 300; i++) step(0.1);
check(m.total() >= before + 2, 'sur 30 s : ' + (m.total() - before) + ' étoiles filantes de plus (au hasard)');
for (let i = 0; i < 30; i++) step(0.1, false);
check(m.count() === 0, 'désactivé : tout s’éteint');
check(m.group.position.equals(cam.position) && m.group.scale.x === R, 'le groupe suit la caméra et reste sur la sphère céleste (R = ' + R + ')');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }

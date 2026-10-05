// Modèle 3D du Concorde : dimensions réelles (61,7 m × 25,6 m × 12,2 m), aile delta en flèche, quatre réacteurs, feux de bout d'aile, cotes cohérentes.
import * as THREE from 'three';
import { CONCORDE, CONCORDE_DIMS, buildConcorde } from '../../src/engine/concorde-model.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
const m = buildConcorde(), box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
check(Math.abs(size.x - CONCORDE.lengthM) < 1, 'longueur ' + size.x.toFixed(1) + ' m (61,66 m)');
check(Math.abs(size.z - CONCORDE.spanM) < 1.8, 'envergure ' + size.z.toFixed(1) + ' m (25,6 m)');
check(Math.abs(size.y - CONCORDE.heightM - 4.5) < 1.5 || (size.y > 12 && size.y < 17.5), 'hauteur ' + size.y.toFixed(1) + ' m (12,2 m de la dérive au sol + les réacteurs sous l’aile)');
check(Math.abs(ctr.x) < 2.5 && Math.abs(ctr.z) < 0.2, 'origine au milieu du fuselage (centre de la boîte x = ' + ctr.x.toFixed(1) + ', z = ' + ctr.z.toFixed(2) + ')');
// réacteurs : quatre boîtes grises sous l'aile, deux par côté
const engines = m.children.filter(c => c.geometry && c.geometry.type === 'BoxGeometry' && c.position.y < -1);
check(engines.length === 4 && engines.filter(e => e.position.z > 0).length === 2, 'quatre réacteurs sous l’aile (deux par côté)');
// aile delta : bords de fuite droits, pointe d'aile en arrière du nez, feux aux bouts d'ailes
const L = m.userData.lights;
check(L.left.position.z < -12 && L.right.position.z > 12 && L.tail.position.x < -29 && L.strobes.length === 2 && ![L.left, L.right, L.tail, ...L.strobes].some(l => l.visible), 'feux : rouge à gauche, vert à droite (bouts d’ailes), blanc à l’arrière, 2 strobes ; éteints de jour');
check(L.right.position.x < -5 && L.right.position.x > -25, 'aile delta : le bout d’aile est loin derrière le nez, vers la queue (x = ' + L.right.position.x.toFixed(1) + ' sur un fuselage de 61,7 m centré en 0)');
check(CONCORDE_DIMS.length === 2 && CONCORDE_DIMS.every(d => d.a.length === 3 && d.b.length === 3 && /m$/.test(d.text)), 'deux cotes (longueur 61,7 m, envergure 25,6 m)');
const d0 = CONCORDE_DIMS[0], d1 = CONCORDE_DIMS[1];
check(Math.abs(Math.hypot(d0.b[0] - d0.a[0]) - 61.6) < 0.2 && Math.abs(Math.abs(d1.b[2] - d1.a[2]) - 25.6) < 0.2, 'les cotes mesurent bien ' + Math.abs(d0.b[0] - d0.a[0]).toFixed(1) + ' m et ' + Math.abs(d1.b[2] - d1.a[2]).toFixed(1) + ' m');
// train d'atterrissage (sorti / rentré) et nez articulé
check(m.userData.gear.visible === false && (m.userData.setGear(true), m.userData.gear.visible === true) && m.userData.gear.children.length === 15 && m.userData.gear.children.every(c => c.geometry.type === 'CylinderGeometry'), 'train : 2 bogies à 4 roues + jambe avant à 2 roues, caché par défaut, montré par setGear(true)');
m.userData.setNose(12); const nz = m.children.find(c => c.type === 'Group' && c.children.length === 4 && c.children[0].geometry.type === 'LatheGeometry');
check(!!nz && Math.abs(nz.rotation.z + 12 * Math.PI / 180) < 1e-9, 'nez articulé : baissé de 12° (rotation ' + (nz ? (nz.rotation.z * 180 / Math.PI).toFixed(1) : '?') + '°)');
m.userData.setNose(0);
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }

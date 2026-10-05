// Avion scénario (A320) : dimensions du modèle, trajectoire (altitude, vitesse, passage au-dessus, visible dès l'apparition, fin à 12° d'élévation), géométrie sur la sphère.
import * as THREE from 'three';
import { A320, AIRLINER_ALTITUDE_M, AIRLINER_CLOSEST_M, AIRLINER_MIN_ELEVATION_DEG, AIRLINER_SPEED_MS, airlinerAt, airlinerWorld, buildA320, elevationFrom, makeAirlinerTrack } from '../../src/engine/airliner.js';
import { observatoryById, observatoryFrame } from '../../src/engine/observatories.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
let seed = 777; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
// modèle : dimensions de l'A320
const m = buildA320(), box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3());
check(Math.abs(size.x - A320.lengthM) < 1.5 && Math.abs(size.z - A320.spanM) < 1.5, 'A320 : longueur ' + size.x.toFixed(1) + ' m (37,6), envergure ' + size.z.toFixed(1) + ' m (35,8)');
check(size.y > 10 && size.y < 14, 'hauteur ' + size.y.toFixed(1) + ' m (≈ 11,8 avec la dérive)');
const ctr = box.getCenter(new THREE.Vector3());
check(Math.abs(ctr.x) < 2 && Math.abs(ctr.z) < 0.5, 'origine au milieu du fuselage (centre de la boîte : x = ' + ctr.x.toFixed(1) + ', z = ' + ctr.z.toFixed(2) + ')');
check(m.userData.lights.left.position.z < 0 && m.userData.lights.right.position.z > 0, 'feu rouge à gauche (z < 0), feu vert à droite (z > 0)');
// ailes en flèche : les bouts sont plus en arrière (x plus petit) que la racine
const tipX = m.userData.lights.right.position.x, rootLeX = 20.5 - A320.lengthM / 2;
check(tipX < rootLeX - 5, 'ailes en flèche vers l’arrière (bout d’aile x = ' + tipX.toFixed(1) + ' contre racine x = ' + rootLeX.toFixed(1) + ')');
// trajectoire
const o = observatoryById('pic-du-midi'), frame = observatoryFrame(o), groundR = Math.hypot(...frame.ground), eye = new THREE.Vector3().fromArray(frame.eye);
let ok = true, minSpeed = 1e9, maxSpeed = 0, maxStartEl = 0, minStartEl = 90, minEndEl = 90, minPass = 1e9, nOverhead = 0;
for (let i = 0; i < 200; i++) {
  const tr = makeAirlinerTrack(rand), a = airlinerAt(tr, 0), b = airlinerAt(tr, 10), pa = airlinerWorld(a.local, frame, groundR), pb = airlinerWorld(b.local, frame, groundR);
  const sp = pa.distanceTo(pb) * 6378137 / 10; minSpeed = Math.min(minSpeed, sp); maxSpeed = Math.max(maxSpeed, sp);
  const e0 = elevationFrom(pa, eye, frame.up); maxStartEl = Math.max(maxStartEl, e0); minStartEl = Math.min(minStartEl, e0);
  const tEnd = (tr.S - tr.s0) / tr.speed, pe = airlinerWorld(airlinerAt(tr, tEnd).local, frame, groundR), eEnd = elevationFrom(pe, eye, frame.up); minEndEl = Math.min(minEndEl, eEnd);
  // élévation maximale atteinte (passage)
  let emax = 0; for (let t = 0; t < tEnd; t += tEnd / 40) emax = Math.max(emax, elevationFrom(airlinerWorld(airlinerAt(tr, t).local, frame, groundR), eye, frame.up)); if (emax > 60) nOverhead++;
  if (tr.c < AIRLINER_CLOSEST_M[0] || tr.c > AIRLINER_CLOSEST_M[1] || tr.H < AIRLINER_ALTITUDE_M[0] || tr.H > AIRLINER_ALTITUDE_M[1]) ok = false;
  minPass = Math.min(minPass, emax);
}
check(ok, 'altitude 9 500–10 500 m, passage à 0–9 km de l’observatoire');
check(minSpeed > 220 && maxSpeed < 260, 'vitesse ' + (minSpeed * 3.6).toFixed(0) + ' à ' + (maxSpeed * 3.6).toFixed(0) + ' km/h (≈ 860 km/h)');
check(minStartEl > 15 && maxStartEl < 45, 'apparition dans le ciel de l’observatoire à ' + minStartEl.toFixed(0) + '–' + maxStartEl.toFixed(0) + '° d’élévation (visible tout de suite)');
check(Math.abs(minEndEl - AIRLINER_MIN_ELEVATION_DEG) < 3, 'fin du trajet quand il passe sous ≈ ' + AIRLINER_MIN_ELEVATION_DEG + '° (mesuré ' + minEndEl.toFixed(1) + '° sur la sphère)');
check(minPass > 35 && nOverhead > 120, 'il passe « plus ou moins au-dessus » : hauteur maximale ≥ ' + minPass.toFixed(0) + '°, ' + nOverhead + ' trajets sur 200 dépassent 60°');
// géométrie : altitude constante au-dessus de la sphère
const tr = makeAirlinerTrack(rand), p0 = airlinerWorld(airlinerAt(tr, 0).local, frame, groundR), p1 = airlinerWorld(airlinerAt(tr, 100).local, frame, groundR);
check(Math.abs(p0.length() - p1.length()) < 1e-12 && Math.abs((p0.length() - groundR) * 6378137 - tr.H) < 1, 'altitude constante : ' + ((p0.length() - groundR) * 6378137).toFixed(0) + ' m au-dessus du sol de l’observatoire, à rayon constant (suit la courbure)');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }

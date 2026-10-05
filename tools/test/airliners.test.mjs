// Flotte d'avions : modèle 3D seulement s'il est assez grand (pas de point), pas de traînée, feux de nuit seulement à moins de 30 km (navigation fixe + strobes), disparition d'un coup sous 8°.
import * as THREE from 'three';
import { AIRLINERS_MAX, AIRLINER_GAP_S, LIGHTS_MAX_KM, MODEL_MIN_PX, PLANE_STROBE_PERIOD_S, createAirliners, strobeFlash } from '../../src/engine/airliners.js';
import { AIRLINER_MIN_ELEVATION_DEG, elevationFrom } from '../../src/engine/airliner.js';
import { observatoryById, observatoryFrame } from '../../src/engine/observatories.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
let seed = 31337; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const o = observatoryById('pic-du-midi'), frame = observatoryFrame(o), groundR = Math.hypot(...frame.ground), eye = new THREE.Vector3().fromArray(frame.eye);
const camera = { position: eye.clone() }, noHide = () => false;
const dayDir = new THREE.Vector3().fromArray(frame.up), nightDir = new THREE.Vector3().fromArray(frame.up).multiplyScalar(-1);   // Soleil au zénith / au nadir
const upd = (a, extra = {}) => a.update({ dt: 0.5, camera, fov: 50, height: 780, sunDir: dayDir, hide: false, hiddenByEarth: noHide, obsActive: false, obsFrame: null, groundR, eye, R_KM: 6378.137, ...extra });

// strobes : double éclat bref
check(strobeFlash(0.01) === 1 && strobeFlash(0.12) === 0 && strobeFlash(0.2) === 1 && strobeFlash(0.6) === 0 && strobeFlash(PLANE_STROBE_PERIOD_S + 0.01) === 1, 'strobe : double éclat bref puis noir, période ' + PLANE_STROBE_PERIOD_S + ' s');

// flotte
const world = new THREE.Group(), fleet = createAirliners(world, rand);
check(fleet.spawn({ frame, groundR, eye }) && fleet.count() === 1, 'un avion apparaît à la demande');
for (let i = 0; i < 6; i++) upd(fleet);
let p = fleet.list()[0];
check(elevationFrom(p.pos, p.eye, frame.up) > 8 && elevationFrom(p.pos, p.eye, frame.up) < 20, 'il apparaît DE LOIN, bas sur l’horizon (' + elevationFrom(p.pos, p.eye, frame.up).toFixed(0) + '° d’élévation, ' + p.distKm.toFixed(0) + ' km)');
check(p.trail === undefined && world.children.length === 3, 'aucune traînée de condensation : seulement le modèle et les deux jeux de feux (' + world.children.length + ' objets)');
check(!p.model.userData.lights.left.visible && !p.model.userData.lights.right.visible && !p.glow.visible && !p.strobeGlow.visible, 'de jour : aucun feu, aucun halo');
check(p.shown === (p.px >= MODEL_MIN_PX) && p.model.visible === p.shown, 'modèle 3D affiché seulement s’il fait au moins ' + MODEL_MIN_PX + ' px (ici ' + p.px.toFixed(1) + ' px) : jamais de point');
upd(fleet, { fov: 1 }); p = fleet.list()[0];
check(p.px > 20 && p.model.visible, 'champ de 1° : le modèle fait ' + p.px.toFixed(0) + ' px et s’affiche');
upd(fleet, { fov: 120, height: 400 }); p = fleet.list()[0];
check(p.px < MODEL_MIN_PX && !p.model.visible, 'champ de 120° sur 400 px : trop petit (' + p.px.toFixed(2) + ' px) → pas de modèle');
// de nuit : loin (> 30 km) pas de feux ; à moins de 30 km, feux de navigation fixes + strobes
upd(fleet, { sunDir: nightDir }); p = fleet.list()[0];
check(p.night && p.distKm > LIGHTS_MAX_KM && !p.glow.visible && !p.model.userData.lights.left.visible, 'de nuit mais à ' + p.distKm.toFixed(0) + ' km (> ' + LIGHTS_MAX_KM + ' km) : pas encore de feux');
fleet.skip(150); upd(fleet, { sunDir: nightDir }); p = fleet.list()[0];
check(p.distKm < LIGHTS_MAX_KM && p.night && p.model.userData.lights.left.visible && p.model.userData.lights.right.visible && p.model.userData.lights.tail.visible && p.glow.visible, 'à ' + p.distKm.toFixed(0) + ' km (< ' + LIGHTS_MAX_KM + ' km) de nuit : feux de navigation (rouge, vert, blanc arrière) ALLUMÉS : lampes du modèle et halos');
let flashes = 0, steady = true; for (let i = 0; i < 200; i++) { upd(fleet, { sunDir: nightDir, dt: 0.02 }); p = fleet.list()[0]; if (!p) break; if (p.strobeGlow.visible) flashes++; if (!p.glow.visible) steady = false; }
check(flashes > 10 && flashes < 120 && steady, 'strobes : allumés ' + flashes + ' images sur 200 (flashs brefs), navigation toujours allumée');
// de jour même près : rien
fleet.clear(); fleet.spawn({ frame, groundR, eye }); fleet.skip(150); upd(fleet); p = fleet.list()[0];
check(p.distKm < LIGHTS_MAX_KM && !p.night && !p.glow.visible && !p.model.userData.lights.left.visible, 'de jour, même à ' + p.distKm.toFixed(0) + ' km : aucun feu');
// caché derrière la Terre / vue des astres : rien
upd(fleet, { hide: true, sunDir: nightDir }); p = fleet.list()[0]; check(!p.model.visible && !p.glow.visible, 'vue éloignée : modèle et feux cachés (mais l’avion existe toujours : ' + fleet.count() + ')');
// disparition d'un coup sous 8°
const n0 = world.children.length; fleet.skip(3000); upd(fleet);
check(fleet.count() === 0 && world.children.length === n0 - 3, 'fin du trajet / sous ' + AIRLINER_MIN_ELEVATION_DEG + '° : l’avion et ses feux disparaissent d’un coup (' + n0 + ' → ' + world.children.length + ' objets)');
// arrivées successives pendant la vue observatoire
let max = 0; const f2 = createAirliners(new THREE.Group(), rand);
for (let i = 0; i < 4000; i++) { f2.update({ dt: 0.5, camera, fov: 50, height: 780, sunDir: dayDir, hide: false, hiddenByEarth: noHide, obsActive: true, obsFrame: frame, groundR, eye, R_KM: 6378.137 }); max = Math.max(max, f2.count()); }
check(max <= AIRLINERS_MAX && max >= 2, 'jusqu’à ' + max + ' avions en vol (' + AIRLINERS_MAX + ' au plus), un nouveau toutes les ' + AIRLINER_GAP_S.join(' à ') + ' s en vue observatoire');
const f3 = createAirliners(new THREE.Group(), rand); for (let i = 0; i < 400; i++) f3.update({ dt: 0.5, camera, fov: 50, height: 780, sunDir: dayDir, hide: false, hiddenByEarth: noHide, obsActive: false, obsFrame: null, groundR, eye, R_KM: 6378.137 });
check(f3.count() === 0, 'hors de la vue observatoire : aucun nouvel avion');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }

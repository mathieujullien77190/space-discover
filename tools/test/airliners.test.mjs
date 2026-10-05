// Flotte d'avions : modèle 3D seulement s'il est assez grand (pas de point), traînée de condensation (jour et nuit), feux de nuit (navigation fixe + strobes), disparition d'un coup sous 12°.
import * as THREE from 'three';
import { AIRLINERS_MAX, AIRLINER_GAP_S, CONTRAIL_MAX_AGE_S, CONTRAIL_OPACITY, MODEL_MIN_PX, PLANE_STROBE_PERIOD_S, contrailData, createAirliners, strobeFlash } from '../../src/engine/airliners.js';
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
// ruban de condensation : de plus en plus large et pâle avec l'âge
const right = new THREE.Vector3(1, 0, 0), mkS = (x, t) => ({ pos: new THREE.Vector3(x, 1, 0), right, t });
const cd = contrailData([mkS(0, 0), mkS(0.001, 50), mkS(0.002, 98)], mkS(0.003, 100), 100, 0.7);
const w = i => (cd.positions[i * 6 + 3] - cd.positions[i * 6]) * 6378137, al = i => cd.colors[i * 8 + 3];
check(cd.count === 4, 'ruban : ' + cd.count + ' points (les échantillons de plus de ' + CONTRAIL_MAX_AGE_S + ' s sont écartés)');
check(w(0) > w(1) && w(1) > w(2) && al(2) > al(1) && al(0) === 0, 'plus ancien = plus large (' + w(0).toFixed(0) + ' m, ' + w(1).toFixed(0) + ' m) et plus pâle (' + al(0).toFixed(2) + ', ' + al(1).toFixed(2) + ')');
const cd2 = contrailData([mkS(0, 0)], mkS(0.001, 100), 100, 0.7);
check(cd2.colors[3] === 0 && cd2.colors[11] === 0 && contrailData([mkS(0, 0)], mkS(0.001, 100), 103, 0.7).colors[3] > 0.1, 'tête : fondu d’apparition (2 s) ; échantillon de 100 s : transparent (extinction)');
check(CONTRAIL_OPACITY.day > CONTRAIL_OPACITY.night && CONTRAIL_OPACITY.night > 0, 'opacité du jour ' + CONTRAIL_OPACITY.day + ', de nuit ' + CONTRAIL_OPACITY.night + ' (jour et nuit)');

// flotte
const world = new THREE.Group(), fleet = createAirliners(world, rand);
check(fleet.spawn({ frame, groundR, eye }) && fleet.count() === 1, 'un avion apparaît à la demande');
for (let i = 0; i < 6; i++) upd(fleet);
let p = fleet.list()[0];
check(elevationFrom(p.pos, p.eye, frame.up) > 15, 'il est déjà haut dans le ciel (' + elevationFrom(p.pos, p.eye, frame.up).toFixed(0) + '° d’élévation)');
// de jour : pas de feux, traînée visible ; modèle seulement s'il fait ≥ 2 px
check(p.trail.visible && p.trail.geometry.drawRange.count > 0, 'de jour : traînée de condensation visible (' + p.trail.geometry.drawRange.count / 6 + ' segments)');
check(!p.model.userData.lights.left.visible && !p.model.userData.lights.right.visible, 'de jour : aucun feu');
check(p.shown === (p.px >= MODEL_MIN_PX) && p.model.visible === p.shown, 'modèle 3D affiché seulement s’il fait au moins ' + MODEL_MIN_PX + ' px (ici ' + p.px.toFixed(1) + ' px) : jamais de point');
upd(fleet, { fov: 1 }); p = fleet.list()[0];
check(p.px > 50 && p.model.visible, 'champ de 1° : le modèle fait ' + p.px.toFixed(0) + ' px et s’affiche');
upd(fleet, { fov: 120, height: 400 }); p = fleet.list()[0];
check(p.px < MODEL_MIN_PX && !p.model.visible && p.trail.visible, 'champ de 120° sur 400 px : trop petit (' + p.px.toFixed(2) + ' px) → pas de modèle, mais la traînée reste');
// de nuit : feux de navigation fixes + strobes
upd(fleet, { sunDir: nightDir }); p = fleet.list()[0];
check(p.night && p.model.userData.lights.left.visible && p.model.userData.lights.right.visible && p.model.userData.lights.tail.visible, 'de nuit : feux de navigation (rouge, vert, blanc arrière) allumés et fixes');
let flashes = 0, steady = true; for (let i = 0; i < 200; i++) { upd(fleet, { sunDir: nightDir, dt: 0.02 }); p = fleet.list()[0]; if (p.model.userData.lights.strobes.some(l => l.visible)) flashes++; if (!p.model.userData.lights.left.visible) steady = false; }
check(flashes > 10 && flashes < 120 && steady, 'strobes : allumés ' + flashes + ' images sur 200 (flashs brefs), navigation toujours allumée');
check(p.trail.visible && fleet.list()[0].trail.visible, 'la traînée reste de nuit (plus pâle)');
// caché derrière la Terre / vue des astres : rien
upd(fleet, { hide: true }); p = fleet.list()[0]; check(!p.model.visible && !p.trail.visible, 'vue éloignée : modèle et traînée cachés (mais l’avion existe toujours : ' + fleet.count() + ')');
// disparition d'un coup sous 12°
const n0 = world.children.length; fleet.skip(3000); upd(fleet);
check(fleet.count() === 0 && world.children.length === n0 - 2, 'fin du trajet / sous ' + AIRLINER_MIN_ELEVATION_DEG + '° : l’avion et sa traînée disparaissent d’un coup (' + n0 + ' → ' + world.children.length + ' objets)');
// arrivées successives pendant la vue observatoire
let seen = 0, max = 0, tt = 0; const f2 = createAirliners(new THREE.Group(), rand);
for (let i = 0; i < 4000; i++) { f2.update({ dt: 0.5, camera, fov: 50, height: 780, sunDir: dayDir, hide: false, hiddenByEarth: noHide, obsActive: true, obsFrame: frame, groundR, eye, R_KM: 6378.137 }); max = Math.max(max, f2.count()); tt += 0.5; }
check(max <= AIRLINERS_MAX && max >= 2, 'jusqu’à ' + max + ' avions en vol (' + AIRLINERS_MAX + ' au plus), un nouveau toutes les ' + AIRLINER_GAP_S.join(' à ') + ' s en vue observatoire');
const f3 = createAirliners(new THREE.Group(), rand); for (let i = 0; i < 400; i++) f3.update({ dt: 0.5, camera, fov: 50, height: 780, sunDir: dayDir, hide: false, hiddenByEarth: noHide, obsActive: false, obsFrame: null, groundR, eye, R_KM: 6378.137 });
check(f3.count() === 0, 'hors de la vue observatoire : aucun nouvel avion');
void seen; void tt;
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }

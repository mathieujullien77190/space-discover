// Flotte d'avions : modèle 3D seulement s'il est assez grand (pas de point), traînée de condensation (jour et nuit), feux de nuit (navigation fixe + strobes), disparition d'un coup sous 12°.
import * as THREE from 'three';
import { CONTRAIL_ENGINE_OFFSET_M, AIRLINERS_MAX, AIRLINER_GAP_S, CONTRAIL_MAX_AGE_S, CONTRAIL_OPACITY, MODEL_MIN_PX, PLANE_STROBE_PERIOD_S, contrailData, createAirliners, strobeFlash } from '../../src/engine/airliners.js';
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
const w = i => (cd.positions[i * 9 + 6] - cd.positions[i * 9]) * 6378137, al = i => cd.colors[i * 12 + 7];   // largeur (bord gauche → bord droit) et opacité du centre
check(cd.count === 4, 'ruban : ' + cd.count + ' points (les échantillons de plus de ' + CONTRAIL_MAX_AGE_S + ' s sont écartés)');
check(w(0) > w(1) && w(1) > w(2) && al(2) > al(1) && al(1) > al(0) && al(0) > 0, 'plus ancien = plus large (' + w(0).toFixed(0) + ' m, ' + w(1).toFixed(0) + ' m) et plus pâle (' + al(0).toFixed(2) + ', ' + al(1).toFixed(2) + ')');
const cd2 = contrailData([mkS(0, 0)], mkS(0.001, 130), 130, 0.7);
check(cd.colors[0 * 12 + 3] === 0 && cd.colors[1 * 12 + 3] === 0 && cd.colors[1 * 12 + 11] === 0, 'bords du ruban transparents (traînée diffuse, centre seul opaque)');
const cdL = contrailData([mkS(0, 0)], mkS(0.001, 10), 10, 0.7, -CONTRAIL_ENGINE_OFFSET_M), cdR = contrailData([mkS(0, 0)], mkS(0.001, 10), 10, 0.7, CONTRAIL_ENGINE_OFFSET_M);
check(Math.abs((cdR.positions[4 * 3 + 0] - cdL.positions[4 * 3 + 0]) * 6378137 - 2 * CONTRAIL_ENGINE_OFFSET_M) < 0.1, 'deux traînées, une par réacteur, écartées de ' + (2 * CONTRAIL_ENGINE_OFFSET_M).toFixed(1) + ' m');
check(cd2.colors[7] === 0 && cd2.colors[19] === 0 && contrailData([mkS(0, 0)], mkS(0.001, 100), 133, 0.7).colors[7] > 0.1, 'tête : fondu d’apparition (2 s) ; échantillon de 100 s : transparent (extinction)');
check(CONTRAIL_OPACITY.day > 0 && CONTRAIL_OPACITY.night === 0, 'traînée : opacité ' + CONTRAIL_OPACITY.day + ' de jour, aucune de nuit');

// flotte
const world = new THREE.Group(), fleet = createAirliners(world, rand);
check(fleet.spawn({ frame, groundR, eye }) && fleet.count() === 1, 'un avion apparaît à la demande');
for (let i = 0; i < 6; i++) upd(fleet);
let p = fleet.list()[0];
check(elevationFrom(p.pos, p.eye, frame.up) > 8 && elevationFrom(p.pos, p.eye, frame.up) < 20, 'il apparaît DE LOIN, bas sur l’horizon (' + elevationFrom(p.pos, p.eye, frame.up).toFixed(0) + '° d’élévation)');
// de jour : pas de feux, traînée visible ; modèle seulement s'il fait ≥ 2 px
check(p.trail.visible && p.trail.children.length === 2 && p.trail.children[0].geometry.drawRange.count > 0, 'de jour : deux traînées de condensation visibles (' + p.trail.children[0].geometry.drawRange.count / 12 + ' segments chacune)');
check(!p.model.userData.lights.left.visible && !p.model.userData.lights.right.visible && !p.glow.visible && !p.strobeGlow.visible, 'de jour : aucun feu, aucun halo');
check(p.shown === (p.px >= MODEL_MIN_PX) && p.model.visible === p.shown, 'modèle 3D affiché seulement s’il fait au moins ' + MODEL_MIN_PX + ' px (ici ' + p.px.toFixed(1) + ' px) : jamais de point');
upd(fleet, { fov: 1 }); p = fleet.list()[0];
check(p.px > 20 && p.model.visible, 'champ de 1° : le modèle fait ' + p.px.toFixed(0) + ' px et s’affiche');
upd(fleet, { fov: 120, height: 400 }); p = fleet.list()[0];
check(p.px < MODEL_MIN_PX && !p.model.visible && p.trail.visible, 'champ de 120° sur 400 px : trop petit (' + p.px.toFixed(2) + ' px) → pas de modèle, mais la traînée reste');
// de nuit : feux de navigation fixes + strobes
upd(fleet, { sunDir: nightDir }); p = fleet.list()[0];
check(p.night && p.model.userData.lights.left.visible && p.model.userData.lights.right.visible && p.model.userData.lights.tail.visible && p.glow.visible, 'de nuit : feux de navigation (rouge, vert, blanc arrière) ALLUMÉS : lampes du modèle et halos lumineux');
check(!p.model.visible && p.glow.visible, 'de nuit les feux se voient même quand le modèle est trop petit (halos ronds, pas de point blanc d’avion)');
let flashes = 0, steady = true; for (let i = 0; i < 200; i++) { upd(fleet, { sunDir: nightDir, dt: 0.02 }); p = fleet.list()[0]; if (p.strobeGlow.visible) flashes++; if (!p.model.userData.lights.left.visible || !p.glow.visible) steady = false; }
check(flashes > 10 && flashes < 120 && steady, 'strobes : allumés ' + flashes + ' images sur 200 (flashs brefs), navigation toujours allumée');
check(!p.trail.visible, 'de nuit : la traînée est CACHÉE');
// caché derrière la Terre / vue des astres : rien
upd(fleet, { hide: true }); p = fleet.list()[0]; check(!p.model.visible && !p.trail.visible, 'vue éloignée : modèle et traînée cachés (mais l’avion existe toujours : ' + fleet.count() + ')');
// disparition d'un coup sous 12°
const n0 = world.children.length; fleet.skip(3000); upd(fleet);
check(fleet.count() === 0 && world.children.length === n0 - 4, 'fin du trajet / sous ' + AIRLINER_MIN_ELEVATION_DEG + '° : l’avion et sa traînée disparaissent d’un coup (' + n0 + ' → ' + world.children.length + ' objets)');
// arrivées successives pendant la vue observatoire
let seen = 0, max = 0, tt = 0; const f2 = createAirliners(new THREE.Group(), rand);
for (let i = 0; i < 4000; i++) { f2.update({ dt: 0.5, camera, fov: 50, height: 780, sunDir: dayDir, hide: false, hiddenByEarth: noHide, obsActive: true, obsFrame: frame, groundR, eye, R_KM: 6378.137 }); max = Math.max(max, f2.count()); tt += 0.5; }
check(max <= AIRLINERS_MAX && max >= 2, 'jusqu’à ' + max + ' avions en vol (' + AIRLINERS_MAX + ' au plus), un nouveau toutes les ' + AIRLINER_GAP_S.join(' à ') + ' s en vue observatoire');
const f3 = createAirliners(new THREE.Group(), rand); for (let i = 0; i < 400; i++) f3.update({ dt: 0.5, camera, fov: 50, height: 780, sunDir: dayDir, hide: false, hiddenByEarth: noHide, obsActive: false, obsFrame: null, groundR, eye, R_KM: 6378.137 });
check(f3.count() === 0, 'hors de la vue observatoire : aucun nouvel avion');
void seen; void tt;
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }

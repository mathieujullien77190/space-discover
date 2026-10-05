// FLOTTE D'AVIONS : jusqu'à AIRLINERS_MAX A320 en vol ; un apparaît à l'entrée de la vue observatoire, d'autres arrivent ensuite (toutes les 40 à 120 s) tant qu'on regarde depuis l'observatoire ;
// ils continuent de voler hors de la vue et DISPARAISSENT D'UN COUP (avion et traînée) quand l'observatoire ne les voit plus (< 12° d'élévation) ou à la fin de leur trajet.
// Chaque avion : modèle 3D à la taille réelle, affiché seulement s'il fait au moins MODEL_MIN_PX pixels (PAS de point quand il est trop petit ou trop loin) + TRAÎNÉE DE CONDENSATION (jour et nuit, plus pâle la nuit).
// Feux (nuit seulement) : navigation FIXES (rouge gauche, vert droite, blanc arrière) + STROBES blancs clignotants (double éclat) aux bouts d'ailes.
import * as THREE from 'three';
import { A320, AIRLINER_MIN_ELEVATION_DEG, airlinerAt, airlinerWorld, buildA320, elevationFrom, makeAirlinerTrack } from './airliner.js';

export const AIRLINERS_MAX = 3, AIRLINER_GAP_S = [40, 120], MODEL_MIN_PX = 2;
export const CONTRAIL_MAX_AGE_S = 100, CONTRAIL_SAMPLE_S = 1, CONTRAIL_HALF_WIDTH_M = [10, 0.65];   // demi-largeur = 10 m + 0,65 m par seconde d'âge (≈ 75 m à 100 s)
export const CONTRAIL_OPACITY = { day: 0.7, night: 0.25 };
export const PLANE_STROBE_PERIOD_S = 1.2;
export const strobeFlash = (t, phase = 0) => { const u = (t + phase) % PLANE_STROBE_PERIOD_S; return u < 0.07 || (u > 0.17 && u < 0.24) ? 1 : 0; };   // double éclat : 0,07 s, pause 0,1 s, 0,07 s, puis noir
const DEG = Math.PI / 180, R_M = 6378137;

// sommets d'un ruban : samples = [{ pos: Vector3 (scène), right: Vector3 (unitaire, horizontal), t }], plus la tête ; renvoie positions (xyz) et couleurs (rgba) par paire de sommets (gauche, droite)
export function contrailData(samples, head, now, opacity) {
  const pts = samples.concat([head]).filter(s => now - s.t <= CONTRAIL_MAX_AGE_S), n = pts.length, positions = new Float32Array(n * 6), colors = new Float32Array(n * 8);
  pts.forEach((s, i) => {
    const age = now - s.t, half = (CONTRAIL_HALF_WIDTH_M[0] + CONTRAIL_HALF_WIDTH_M[1] * age) / R_M, a = opacity * Math.pow(Math.max(0, 1 - age / CONTRAIL_MAX_AGE_S), 1.4) * Math.min(1, age / 2);   // fondu d'apparition (2 s) puis d'extinction
    positions.set([s.pos.x - s.right.x * half, s.pos.y - s.right.y * half, s.pos.z - s.right.z * half, s.pos.x + s.right.x * half, s.pos.y + s.right.y * half, s.pos.z + s.right.z * half], i * 6);
    colors.set([1, 1, 1, a, 1, 1, 1, a], i * 8);
  });
  return { positions, colors, count: n };
}

export function createAirliners(world, rand = Math.random) {
  const planes = [], range1 = ([a, b]) => a + (b - a) * rand();
  let wait = range1(AIRLINER_GAP_S);
  const maxS = CONTRAIL_MAX_AGE_S / CONTRAIL_SAMPLE_S + 3, E = new THREE.Vector3(), N = new THREE.Vector3(), basis = new THREE.Matrix4(), tmpS = new THREE.Vector3();
  const idx = new Uint16Array((maxS - 1) * 6); for (let i = 0; i < maxS - 1; i++) idx.set([2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2], i * 6);

  const spawn = ({ frame, groundR, eye }) => {
    if (planes.length >= AIRLINERS_MAX) return false;
    const model = buildA320(); model.visible = false; world.add(model);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxS * 6), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(maxS * 8), 4)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.setDrawRange(0, 0);
    const trail = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide })); trail.frustumCulled = false; trail.renderOrder = 2; trail.visible = false; world.add(trail);
    planes.push({ tr: makeAirlinerTrack(rand), t: 0, frame, groundR, eye: eye.clone ? eye.clone() : new THREE.Vector3().fromArray(eye), model, trail, samples: [], lastSample: -1e9, pos: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3(), fw: new THREE.Vector3(), phase: rand() * PLANE_STROBE_PERIOD_S, px: 0, shown: false, night: false, flash: 0 });
    return true;
  };
  const remove = i => { const p = planes[i]; world.remove(p.model, p.trail); p.trail.geometry.dispose(); p.trail.material.dispose(); planes.splice(i, 1); };

  return {
    spawn,
    // dt : secondes ; obsActive : on regarde DEPUIS un observatoire (de nouveaux avions arrivent) avec son repère (obsFrame / groundR / eye) ; sunDir : direction du Soleil (unitaire, scène) ;
    // hide : tout cacher (vue de très loin, vue des astres) ; hiddenByEarth(pos) ; fov (°) et height (px) de la caméra ; R_KM : rayon terrestre
    update({ dt, camera, fov, height, sunDir, hide, hiddenByEarth, obsActive, obsFrame, groundR, eye, R_KM }) {
      if (obsActive && obsFrame) { wait -= dt; if (wait <= 0) { spawn({ frame: obsFrame, groundR, eye }); wait = range1(AIRLINER_GAP_S); } }
      for (let i = planes.length - 1; i >= 0; i--) {
        const p = planes[i]; p.t += dt;
        const st = airlinerAt(p.tr, p.t); airlinerWorld(st.local, p.frame, p.groundR, p.pos);
        if (st.done || elevationFrom(p.pos, p.eye, p.frame.up) < AIRLINER_MIN_ELEVATION_DEG) { remove(i); continue; }   // DISPARAÎT D'UN COUP (avion et traînée)
        p.up.copy(p.pos).normalize(); E.fromArray(p.frame.east); N.fromArray(p.frame.north);
        p.fw.set(0, 0, 0).addScaledVector(E, st.heading[0]).addScaledVector(N, st.heading[1]); p.fw.addScaledVector(p.up, -p.fw.dot(p.up)).normalize(); p.right.crossVectors(p.fw, p.up);
        if (p.t - p.lastSample >= CONTRAIL_SAMPLE_S) { p.samples.push({ pos: p.pos.clone(), right: p.right.clone(), t: p.t }); p.lastSample = p.t; while (p.samples.length && p.t - p.samples[0].t > CONTRAIL_MAX_AGE_S) p.samples.shift(); }
        const night = tmpS.fromArray(p.frame.up).dot(sunDir) < -0.03, hidden = hide || hiddenByEarth(p.pos);   // nuit = Soleil sous l'horizon de l'observatoire
        const cd = contrailData(p.samples, { pos: p.pos, right: p.right, t: p.t }, p.t, night ? CONTRAIL_OPACITY.night : CONTRAIL_OPACITY.day), ga = p.trail.geometry;
        ga.attributes.position.array.set(cd.positions.subarray(0, Math.min(cd.positions.length, ga.attributes.position.array.length))); ga.attributes.color.array.set(cd.colors.subarray(0, Math.min(cd.colors.length, ga.attributes.color.array.length)));
        ga.attributes.position.needsUpdate = ga.attributes.color.needsUpdate = true; ga.setDrawRange(0, Math.max(0, cd.count - 1) * 6); p.trail.visible = !hidden && cd.count > 1;
        // modèle 3D à la taille réelle ; RIEN du tout (ni point ni feu) s'il est trop petit
        p.model.quaternion.setFromRotationMatrix(basis.makeBasis(p.fw, p.up, p.right)); p.model.position.copy(p.pos); p.model.scale.setScalar(1e-3 / R_KM);
        const dKm = camera.position.distanceTo(p.pos) * R_KM; p.px = (A320.lengthM / 1000 / Math.max(1e-9, dKm)) / (2 * Math.tan(fov * DEG / 2)) * height;
        p.shown = !hidden && p.px >= MODEL_MIN_PX; p.model.visible = p.shown;
        const lamps = p.model.userData.lights, flash = strobeFlash(p.t, p.phase);
        lamps.left.visible = lamps.right.visible = lamps.tail.visible = night; for (const sl of lamps.strobes) sl.visible = night && flash > 0;
        p.night = night; p.flash = flash;
      }
    },
    count: () => planes.length,
    list: () => planes,
    skip(sec) { for (const p of planes) p.t += sec; },
    clear() { while (planes.length) remove(planes.length - 1); },
    dispose() { this.clear(); },
  };
}

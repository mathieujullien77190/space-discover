// FLOTTE D'AVIONS : jusqu'à AIRLINERS_MAX A320 en vol ; un apparaît à l'entrée de la vue observatoire, d'autres arrivent ensuite (toutes les 40 à 120 s) tant qu'on regarde depuis l'observatoire ;
// ils continuent de voler hors de la vue et DISPARAISSENT D'UN COUP quand l'observatoire ne les voit plus (< 8° d'élévation) ou à la fin de leur trajet. PAS de traînée de condensation (retirée à la demande de l'utilisateur).
// Chaque avion : modèle 3D à la taille réelle, affiché seulement s'il fait au moins MODEL_MIN_PX pixels (PAS de point quand il est trop petit ou trop loin).
// Feux, DE NUIT SEULEMENT et seulement quand l'avion est à MOINS DE 30 km de la caméra : navigation FIXES (rouge gauche, vert droite, blanc arrière) + STROBES blancs clignotants (double éclat) aux bouts d'ailes,
// sous forme de petits halos ronds lumineux (on voit les feux, même si le modèle est trop petit) ; plus loin ou de jour : aucun feu.
import * as THREE from 'three';
import { roundPointsMaterial } from './round-points.js';
import { A320, AIRLINER_MIN_ELEVATION_DEG, airlinerAt, airlinerWorld, buildA320, elevationFrom, makeAirlinerTrack } from './airliner.js';

export const AIRLINERS_MAX = 3, AIRLINER_GAP_S = [40, 120], MODEL_MIN_PX = 2;
export const LIGHTS_MAX_KM = 30;   // les feux ne s'allument que si l'avion est à moins de 30 km de la caméra
export const PLANE_STROBE_PERIOD_S = 1.2;
export const strobeFlash = (t, phase = 0) => { const u = (t + phase) % PLANE_STROBE_PERIOD_S; return u < 0.07 || (u > 0.17 && u < 0.24) ? 1 : 0; };   // double éclat : 0,07 s, pause 0,1 s, 0,07 s, puis noir
const DEG = Math.PI / 180, R_M = 6378137;

export function createAirliners(world, rand = Math.random) {
  const planes = [], range1 = ([a, b]) => a + (b - a) * rand();
  let wait = range1(AIRLINER_GAP_S);
  const E = new THREE.Vector3(), N = new THREE.Vector3(), basis = new THREE.Matrix4(), tmpS = new THREE.Vector3();

  const spawn = ({ frame, groundR, eye }) => {
    if (planes.length >= AIRLINERS_MAX) return false;
    const model = buildA320(); model.visible = false; world.add(model);
    const gl = new THREE.BufferGeometry(); gl.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3)); gl.setAttribute('color', new THREE.BufferAttribute(new Float32Array([1, 0.12, 0.1, 0.15, 1, 0.25, 0.85, 0.85, 0.85]), 3));   // rouge (gauche), vert (droite), blanc (arrière)
    const glow = new THREE.Points(gl, roundPointsMaterial({ size: 4, sizeAttenuation: false, vertexColors: true, opacity: 0.95, depthWrite: false })); glow.frustumCulled = false; glow.visible = false; world.add(glow);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));   // strobes : deux flashs blancs aux bouts d'ailes
    const strobeGlow = new THREE.Points(sg, roundPointsMaterial({ color: 0xffffff, size: 7, sizeAttenuation: false, depthWrite: false })); strobeGlow.frustumCulled = false; strobeGlow.visible = false; world.add(strobeGlow);
    planes.push({ tr: makeAirlinerTrack(rand), t: 0, frame, groundR, eye: eye.clone ? eye.clone() : new THREE.Vector3().fromArray(eye), model, glow, strobeGlow, pos: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3(), fw: new THREE.Vector3(), phase: rand() * PLANE_STROBE_PERIOD_S, px: 0, distKm: 0, shown: false, night: false, flash: 0 });
    return true;
  };
  const remove = i => { const p = planes[i]; world.remove(p.model, p.glow, p.strobeGlow); p.glow.geometry.dispose(); p.glow.material.dispose(); p.strobeGlow.geometry.dispose(); p.strobeGlow.material.dispose(); planes.splice(i, 1); };

  return {
    spawn,
    // dt : secondes ; obsActive : on regarde DEPUIS un observatoire (de nouveaux avions arrivent) avec son repère (obsFrame / groundR / eye) ; sunDir : direction du Soleil (unitaire, scène) ;
    // hide : tout cacher (vue de très loin, vue des astres) ; hiddenByEarth(pos) ; fov (°) et height (px) de la caméra ; R_KM : rayon terrestre
    update({ dt, camera, fov, height, sunDir, hide, hiddenByEarth, obsActive, obsFrame, groundR, eye, R_KM }) {
      if (obsActive && obsFrame) { wait -= dt; if (wait <= 0) { spawn({ frame: obsFrame, groundR, eye }); wait = range1(AIRLINER_GAP_S); } }
      for (let i = planes.length - 1; i >= 0; i--) {
        const p = planes[i]; p.t += dt;
        const st = airlinerAt(p.tr, p.t); airlinerWorld(st.local, p.frame, p.groundR, p.pos);
        if (st.done || elevationFrom(p.pos, p.eye, p.frame.up) < AIRLINER_MIN_ELEVATION_DEG) { remove(i); continue; }   // DISPARAÎT D'UN COUP
        p.up.copy(p.pos).normalize(); E.fromArray(p.frame.east); N.fromArray(p.frame.north);
        p.fw.set(0, 0, 0).addScaledVector(E, st.heading[0]).addScaledVector(N, st.heading[1]); p.fw.addScaledVector(p.up, -p.fw.dot(p.up)).normalize(); p.right.crossVectors(p.fw, p.up);
        const night = tmpS.fromArray(p.frame.up).dot(sunDir) < -0.03, hidden = hide || hiddenByEarth(p.pos);   // nuit = Soleil sous l'horizon de l'observatoire
        // modèle 3D à la taille réelle ; RIEN du tout (ni point) s'il est trop petit
        p.model.quaternion.setFromRotationMatrix(basis.makeBasis(p.fw, p.up, p.right)); p.model.position.copy(p.pos); p.model.scale.setScalar(1e-3 / R_KM);
        const dKm = camera.position.distanceTo(p.pos) * R_KM; p.distKm = dKm; p.px = (A320.lengthM / 1000 / Math.max(1e-9, dKm)) / (2 * Math.tan(fov * DEG / 2)) * height;
        p.shown = !hidden && p.px >= MODEL_MIN_PX; p.model.visible = p.shown;
        const lit = night && !hidden && dKm < LIGHTS_MAX_KM, lamps = p.model.userData.lights, flash = strobeFlash(p.t, p.phase);   // feux : de nuit et à moins de 30 km seulement
        lamps.left.visible = lamps.right.visible = lamps.tail.visible = lit; for (const sl of lamps.strobes) sl.visible = lit && flash > 0;
        // halos lumineux (les feux se voient même si le modèle est trop petit) : navigation fixe + strobes
        const half = A320.spanM / 2 / R_M, tailK = A320.lengthM / 2 / R_M, gp = p.glow.geometry.attributes.position, sp = p.strobeGlow.geometry.attributes.position;
        gp.setXYZ(0, p.pos.x - p.right.x * half, p.pos.y - p.right.y * half, p.pos.z - p.right.z * half); gp.setXYZ(1, p.pos.x + p.right.x * half, p.pos.y + p.right.y * half, p.pos.z + p.right.z * half); gp.setXYZ(2, p.pos.x - p.fw.x * tailK, p.pos.y - p.fw.y * tailK, p.pos.z - p.fw.z * tailK); gp.needsUpdate = true;
        sp.setXYZ(0, gp.getX(0), gp.getY(0), gp.getZ(0)); sp.setXYZ(1, gp.getX(1), gp.getY(1), gp.getZ(1)); sp.needsUpdate = true;
        p.glow.visible = lit; p.strobeGlow.visible = lit && flash > 0;
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

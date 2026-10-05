// AVIONS DE NUIT (vue depuis un observatoire, ciel noir seulement) : de temps en temps un avion de ligne traverse le ciel, lentement (1,3 à 2,4° par seconde, 40 à 100 s pour traverser) :
// un point lumineux dont le feu de navigation (rouge-orangé) reste allumé et dont le feu anticollision (flash blanc très bref) clignote toutes les 1,2 s environ.
// Chemin = arc de grand cercle du ciel local entre deux points bas de l'horizon (il passe donc plus ou moins haut) ; fondu à l'arrivée et au départ près de l'horizon ; le relief le cache (profondeur testée).
// Comme les étoiles filantes : seulement en vue depuis un observatoire, la nuit.
import * as THREE from 'three';

export const PLANE_GAP_S = [45, 130], PLANE_FIRST_S = [8, 30];   // délai entre deux avions ; délai avant le premier
export const PLANE_SPEED_DEG_S = [1.3, 2.4];                     // vitesse angulaire apparente
export const PLANE_START_ELEVATION_DEG = [8, 22];                // hauteur des deux extrémités du chemin
export const PLANE_AZIMUTH_SPAN_DEG = [100, 175];                // écart d'azimut entre l'entrée et la sortie (175° : presque à la verticale du lieu)
export const PLANE_STROBE_PERIOD_S = 1.2, PLANE_STROBE_FLASH_S = 0.12;
export const PLANE_SLOTS = 2;
const DEG = Math.PI / 180;

const range = (r, [a, b]) => a + (b - a) * r;
const slerp = (a, b, u, out) => { const w = Math.acos(Math.max(-1, Math.min(1, a.dot(b)))), s = Math.sin(w) || 1; return out.copy(a).multiplyScalar(Math.sin((1 - u) * w) / s).addScaledVector(b, Math.sin(u * w) / s); };

// éclat du feu à l'instant t (s) : feu de navigation constant (0,3) + flash anticollision (1) pendant PLANE_STROBE_FLASH_S à chaque période
export const planeLight = (t, phase = 0) => ((t + phase) % PLANE_STROBE_PERIOD_S) < PLANE_STROBE_FLASH_S ? 1 : 0.3;

export function createPlanes(scene, rand = Math.random) {
  const group = new THREE.Group(); group.frustumCulled = false; scene.add(group);
  const slots = [];
  for (let i = 0; i < PLANE_SLOTS; i++) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffd9c0, size: 3.2, sizeAttenuation: false, blending: THREE.AdditiveBlending, transparent: true, opacity: 0, depthWrite: false })); pts.frustumCulled = false; pts.visible = false;
    group.add(pts); slots.push({ pts, active: false, u: 0, dur: 1, t: 0, phase: 0, a: new THREE.Vector3(), b: new THREE.Vector3() });
  }
  let wait = range(rand(), PLANE_FIRST_S), total = 0;
  const U = new THREE.Vector3(), E = new THREE.Vector3(), N = new THREE.Vector3(), tmp = new THREE.Vector3();
  const dir = (el, az) => new THREE.Vector3().copy(U).multiplyScalar(Math.sin(el)).addScaledVector(N, Math.cos(az) * Math.cos(el)).addScaledVector(E, Math.sin(az) * Math.cos(el)).normalize();

  const spawn = (up, east, north) => {
    const s = slots.find(x => !x.active); if (!s) return false;
    U.fromArray(up); E.fromArray(east); N.fromArray(north);
    const az = rand() * 2 * Math.PI, span = range(rand(), PLANE_AZIMUTH_SPAN_DEG) * DEG * (rand() < 0.5 ? 1 : -1);
    s.a.copy(dir(range(rand(), PLANE_START_ELEVATION_DEG) * DEG, az)); s.b.copy(dir(range(rand(), PLANE_START_ELEVATION_DEG) * DEG, az + span));
    const angle = Math.acos(Math.max(-1, Math.min(1, s.a.dot(s.b)))) / DEG;
    s.dur = angle / range(rand(), PLANE_SPEED_DEG_S); s.t = 0; s.phase = rand() * PLANE_STROBE_PERIOD_S; s.active = true; total++;
    return true;
  };

  return {
    group,
    // dt : secondes ; enabled : vue depuis un observatoire ET ciel noir ; camera : la caméra (le groupe la suit) ; R : distance de la sphère céleste ; up / east / north : repère local (tableaux)
    update({ dt, enabled, camera, R, up, east, north }) {
      group.position.copy(camera.position); group.scale.setScalar(R);
      if (enabled && up) { wait -= dt; if (wait <= 0) { spawn(up, east, north); wait = range(rand(), PLANE_GAP_S); } }
      for (const s of slots) {
        if (!s.active) continue;
        s.t += dt; const u = s.t / s.dur;
        if (u >= 1 || !enabled) { s.active = false; s.pts.visible = false; continue; }
        const p = slerp(s.a, s.b, u, tmp), pos = s.pts.geometry.attributes.position; pos.setXYZ(0, p.x, p.y, p.z); pos.needsUpdate = true;
        const fade = Math.min(1, u / 0.08, (1 - u) / 0.08);   // fondu aux deux extrémités (près de l'horizon)
        s.pts.material.opacity = fade * planeLight(s.t, s.phase); s.pts.visible = true;
        s.pts.material.color.setHex(planeLight(s.t, s.phase) > 0.5 ? 0xffffff : 0xffb8a0);   // flash blanc, feu de navigation rougeâtre
      }
    },
    spawn,
    count: () => slots.filter(s => s.active).length,
    total: () => total,
    dispose() { scene.remove(group); for (const s of slots) { s.pts.geometry.dispose(); s.pts.material.dispose(); } },
  };
}

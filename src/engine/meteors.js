// ÉTOILES FILANTES (vue depuis un observatoire, de nuit) : de temps en temps, au hasard, un trait lumineux traverse une partie du ciel en une seconde environ.
// Chaque météore suit un arc de grand cercle dans le ciel LOCAL (au-dessus de l'horizon, dans le repère de l'observateur : elles ne tournent pas avec les étoiles) :
// une traînée qui s'éteint vers l'arrière (polyligne à couleurs dégradées, mélange additif) et un point brillant à la tête. Posées à grande distance (comme les étoiles) : le relief les cache.
import * as THREE from 'three';

export const METEOR_GAP_S = [3, 12];        // délai entre deux étoiles filantes (s)
export const METEOR_DURATION_S = [0.9, 1.6];    // durée totale (s) : la tête parcourt l'arc pendant les 55 premiers % ; la traînée, elle, s'efface DEPUIS SON DÉBUT jusqu'à la tête
export const METEOR_HEAD_SHARE = 0.55, METEOR_TAIL_DELAY = 0.12;   // part de la durée où la tête avance ; moment (part de la durée) où le DÉBUT de la traînée commence à s'effacer
export const METEOR_LENGTH_DEG = [8, 28];   // longueur de l'arc parcouru dans le ciel
export const METEOR_ELEVATION_DEG = [14, 78];   // hauteur du point de départ au-dessus de l'horizon
export const METEOR_SLOTS = 3;              // étoiles filantes simultanées au plus
const VERTS = 12, DEG = Math.PI / 180;

const range = (r, [a, b]) => a + (b - a) * r;
const slerp = (a, b, u, out) => {   // arc de grand cercle de a à b (vecteurs unitaires non colinéaires)
  const w = Math.acos(Math.max(-1, Math.min(1, a.dot(b)))), s = Math.sin(w) || 1;
  return out.copy(a).multiplyScalar(Math.sin((1 - u) * w) / s).addScaledVector(b, Math.sin(u * w) / s);
};

export function createMeteors(scene, rand = Math.random) {
  const group = new THREE.Group(); group.frustumCulled = false; scene.add(group);
  const slots = [];
  for (let i = 0; i < METEOR_SLOTS; i++) {
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(VERTS * 3), 3)); lg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(VERTS * 3), 3));
    const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); line.frustumCulled = false; line.visible = false;
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
    const head = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffffff, size: 4, sizeAttenuation: false, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); head.frustumCulled = false; head.visible = false;
    group.add(line, head); slots.push({ line, head, active: false, t: 0, dur: 1, a: new THREE.Vector3(), b: new THREE.Vector3(), bright: 1 });
  }
  let wait = range(rand(), METEOR_GAP_S), total = 0;
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), U = new THREE.Vector3(), E = new THREE.Vector3(), N = new THREE.Vector3();

  // lance une étoile filante dans le ciel local (up / east / north : vecteurs unitaires du lieu) ; false s'il n'y a plus de place
  const spawn = (up, east, north) => {
    const s = slots.find(x => !x.active); if (!s) return false;
    U.fromArray(up); E.fromArray(east); N.fromArray(north);
    const el = range(rand(), METEOR_ELEVATION_DEG) * DEG, az = rand() * 2 * Math.PI;
    s.a.copy(U).multiplyScalar(Math.sin(el)).addScaledVector(N, Math.cos(az) * Math.cos(el)).addScaledVector(E, Math.sin(az) * Math.cos(el)).normalize();
    // direction de la course : tangente aléatoire ; si l'arc plonge sous 5° d'élévation on la retourne
    const r = tmp.set(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(), t = tmp2.crossVectors(s.a, r).normalize(), L = range(rand(), METEOR_LENGTH_DEG) * DEG;
    s.b.copy(s.a).multiplyScalar(Math.cos(L)).addScaledVector(t, Math.sin(L)).normalize();
    if (s.b.dot(U) < Math.sin(5 * DEG)) s.b.copy(s.a).multiplyScalar(Math.cos(L)).addScaledVector(t, -Math.sin(L)).normalize();
    s.t = 0; s.dur = range(rand(), METEOR_DURATION_S); s.bright = 0.6 + 0.4 * rand(); s.active = true; total++;
    return true;
  };

  return {
    group,
    // dt : secondes ; enabled : vue depuis un observatoire ET ciel assez noir ; camera : position de la caméra (le groupe la suit) ; R : distance de la sphère céleste ; up / east / north : repère local (tableaux)
    update({ dt, enabled, camera, R, up, east, north }) {
      group.position.copy(camera.position); group.scale.setScalar(R);
      if (enabled && up) { wait -= dt; if (wait <= 0) { spawn(up, east, north); wait = range(rand(), METEOR_GAP_S); } }
      for (const s of slots) {
        if (!s.active) continue;
        s.t += dt; const u = s.t / s.dur;
        if (u >= 1 || !enabled) { s.active = false; s.line.visible = s.head.visible = false; continue; }
        // la tête file de a vers b ; la traînée reste derrière elle et s'EFFACE EN PARTANT DU DÉBUT (son extrémité d'origine rattrape peu à peu la tête)
        const hd = Math.min(1, u / METEOR_HEAD_SHARE), tl = Math.max(0, Math.min(hd, (u - METEOR_TAIL_DELAY) / (1 - METEOR_TAIL_DELAY))), life = Math.max(0, 1 - Math.max(0, tl - hd * 0.0) * 0.6) * (1 - Math.max(0, (u - 0.85) / 0.15));
        const f = s.bright * life, pos = s.line.geometry.attributes.position, col = s.line.geometry.attributes.color;
        for (let k = 0; k < VERTS; k++) {
          const uk = tl + (hd - tl) * k / (VERTS - 1), p = slerp(s.a, s.b, uk, tmp), c = Math.pow(k / (VERTS - 1), 1.4) * f;   // plus clair vers la tête
          pos.setXYZ(k, p.x, p.y, p.z); col.setXYZ(k, 0.85 * c, 0.92 * c, c);
        }
        pos.needsUpdate = col.needsUpdate = true;
        const h = slerp(s.a, s.b, hd, tmp); s.head.geometry.attributes.position.setXYZ(0, h.x, h.y, h.z); s.head.geometry.attributes.position.needsUpdate = true;
        s.head.material.opacity = hd < 1 ? f : 0; s.line.visible = true; s.head.visible = hd < 1;   // la tête disparaît à l'arrivée, la traînée finit de s'effacer
      }
    },
    spawn,
    count: () => slots.filter(s => s.active).length,
    total: () => total,
    dispose() { scene.remove(group); for (const s of slots) { s.line.geometry.dispose(); s.line.material.dispose(); s.head.geometry.dispose(); s.head.material.dispose(); } },
  };
}

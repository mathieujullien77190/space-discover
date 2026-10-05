// AVIONS DE NUIT (vue depuis un observatoire, ciel noir seulement) : un avion de ligne traverse le ciel, simulé PHYSIQUEMENT :
// il vole à altitude constante (9 000 à 11 500 m) en ligne droite à 220–260 m/s (≈ 800 à 940 km/h) au-dessus de l'observateur (distance minimale de passage 0 à 45 km), cap au hasard ;
// on le voit tant qu'il est à plus de 8° au-dessus de l'horizon (≈ 70 km de distance horizontale). Deux feux de position, comme sur un vrai avion : un point ROUGE au bout de l'aile gauche
// et un point VERT au bout de l'aile droite (envergure 60 m, donc 2 à 5 px d'écart selon la distance) ; fondu près de l'horizon, plus pâles quand l'avion est loin ; le relief les cache.
// Vitesse apparente réelle : jusqu'à ≈ 1,4°/s à la verticale, bien plus lent au loin (traversée complète du ciel : plusieurs minutes). Seulement en vue depuis un observatoire, la nuit.
import * as THREE from 'three';

export const PLANE_GAP_S = [60, 180], PLANE_FIRST_S = [8, 30];   // délai entre deux avions ; délai avant le premier
export const PLANE_ALTITUDE_M = [9000, 11500];                   // altitude de croisière
export const PLANE_SPEED_MS = [220, 260];                        // vitesse sol (≈ 800 à 940 km/h)
export const PLANE_CLOSEST_M = [0, 45000];                       // distance horizontale minimale de passage
export const PLANE_MIN_ELEVATION_DEG = 8;                        // au-dessous : invisible (horizon, brume)
export const PLANE_WINGSPAN_M = 60;
export const PLANE_SLOTS = 2;
const DEG = Math.PI / 180;
const range = (r, [a, b]) => a + (b - a) * r;

// trajectoire : le long de la route (cap h), à s = abscisse depuis le point de passage le plus proche ; départ à s0 (déjà visible) ; fin quand s dépasse S
export function makeTrack(rand = Math.random) {
  const H = range(rand(), PLANE_ALTITUDE_M), speed = range(rand(), PLANE_SPEED_MS), c = range(rand(), PLANE_CLOSEST_M);
  const heading = rand() * 2 * Math.PI, side = rand() < 0.5 ? 1 : -1;
  const hx = Math.sin(heading), hy = Math.cos(heading);                // cap (x = est, y = nord)
  const nx = side * -hy, ny = side * hx;                               // direction du point de passage le plus proche (perpendiculaire à la route)
  const Rvis = H / Math.tan(PLANE_MIN_ELEVATION_DEG * DEG), S = Math.sqrt(Math.max(1, Rvis * Rvis - c * c));   // distance horizontale maximale d'où il est visible
  const s0 = -S * (0.35 + 0.65 * rand());                              // il apparaît déjà en vue, quelque part sur la première moitié
  return { H, speed, c, hx, hy, nx, ny, S, s0 };
}
// position (m, repère local x = est, y = nord, z = haut) du centre de l'avion et de ses deux bouts d'aile après t secondes
export function planeAt(tr, t) {
  const s = tr.s0 + tr.speed * t, px = tr.c * tr.nx + s * tr.hx, py = tr.c * tr.ny + s * tr.hy, w = PLANE_WINGSPAN_M / 2;
  return { s, done: s > tr.S, center: [px, py, tr.H], left: [px - tr.hy * w, py + tr.hx * w, tr.H], right: [px + tr.hy * w, py - tr.hx * w, tr.H] };   // gauche du cap = (−hy, hx)
}
export const elevationDeg = p => Math.atan2(p[2], Math.hypot(p[0], p[1])) / DEG;
export const distanceM = p => Math.hypot(p[0], p[1], p[2]);

export function createPlanes(scene, rand = Math.random) {
  const group = new THREE.Group(); group.frustumCulled = false; scene.add(group);
  const slots = [];
  for (let i = 0; i < PLANE_SLOTS; i++) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array([1, 0.12, 0.1, 0.15, 1, 0.25]), 3));   // rouge puis vert
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 3.4, sizeAttenuation: false, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, opacity: 0, depthWrite: false })); pts.frustumCulled = false; pts.visible = false;
    group.add(pts); slots.push({ pts, active: false, t: 0, tr: null });
  }
  let wait = range(rand(), PLANE_FIRST_S), total = 0;
  const E = new THREE.Vector3(), N = new THREE.Vector3(), U = new THREE.Vector3(), v = new THREE.Vector3();
  const toScene = p => v.set(0, 0, 0).addScaledVector(E, p[0]).addScaledVector(N, p[1]).addScaledVector(U, p[2]).normalize();

  const spawn = () => {
    const s = slots.find(x => !x.active); if (!s) return false;
    s.tr = makeTrack(rand); s.t = 0; s.active = true; total++;
    return true;
  };

  return {
    group,
    // dt : secondes ; enabled : vue depuis un observatoire ET ciel noir ; camera : la caméra (le groupe la suit) ; R : distance de la sphère céleste ; up / east / north : repère local (tableaux)
    update({ dt, enabled, camera, R, up, east, north }) {
      group.position.copy(camera.position); group.scale.setScalar(R);
      if (enabled && up) { wait -= dt; if (wait <= 0) { spawn(); wait = range(rand(), PLANE_GAP_S); } }
      if (up) { U.fromArray(up); E.fromArray(east); N.fromArray(north); }
      for (const s of slots) {
        if (!s.active) continue;
        s.t += dt;
        const st = planeAt(s.tr, s.t);
        if (st.done || !enabled || !up) { s.active = false; s.pts.visible = false; continue; }
        const el = elevationDeg(st.center), pos = s.pts.geometry.attributes.position;
        const l = toScene(st.left); pos.setXYZ(0, l.x, l.y, l.z); const r = toScene(st.right); pos.setXYZ(1, r.x, r.y, r.z); pos.needsUpdate = true;
        const horizon = Math.max(0, Math.min(1, (el - PLANE_MIN_ELEVATION_DEG) / 8)), near = Math.max(0.35, Math.min(1, 40000 / distanceM(st.center)));   // fondu près de l'horizon ; plus pâles de loin
        s.pts.material.opacity = 0.95 * horizon * near; s.pts.visible = horizon > 0;
      }
    },
    spawn,
    count: () => slots.filter(s => s.active).length,
    total: () => total,
    dispose() { scene.remove(group); for (const s of slots) { s.pts.geometry.dispose(); s.pts.material.dispose(); } },
  };
}

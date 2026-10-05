import * as THREE from 'three';
import { FLIGHT_OBJECTS } from './data/objects.js';
import { R_KM } from './earth.js';
import { objectPeriodS, objectStart, tleToOrbit } from './flight-object.js';

// ISS : UNE SEULE ISS, celle du JSON (objects/iss/iss.json : paramètres orbitaux du TLE + modèle 3D `model.file` dans le même dossier). Sa position à la date d vient de `objectStart` (js/flight-object.js) :
// état SGP4 exact à cette date. Pour la rafraîchir : coller dans le JSON les nouveaux paramètres orbitaux (ou `start.tle`) puis `node tools/make-objects.js`.
export const ISS_OBJ = FLIGHT_OBJECTS.iss, ISS_DIR = 'objects/iss/', ISS_MODEL = ISS_DIR + ISS_OBJ.model.file, ISS_MODEL_CFG = ISS_OBJ.model, ISS_W = ISS_OBJ.visual.widthM;
export const ISS_EPOCH = Date.parse((ISS_OBJ.start.orbit || tleToOrbit(ISS_OBJ.start.tle)).epoch);   // époque des paramètres orbitaux
export const ISS_PERIOD_MS = objectPeriodS(ISS_OBJ) * 1000;

// état de l'ISS à la date d : position (unités de rayon terrestre, repère de la scène), hauteur géodésique (km), vitesse (km/s), direction de vol, lon/lat ; null au-delà de ±60 jours de l'époque
// Existe à partir de `exists.from` du JSON (premier module Zarya, 20 nov. 1998) : avant, pas d'ISS. Dans les 60 jours de l'époque du TLE : position SGP4 exacte ; plus loin dans le temps (passé depuis 1998 ou futur) : orbite moyenne INDICATIVE (`approx`).
export const ISS_FROM = ISS_OBJ.exists && ISS_OBJ.exists.from ? Date.parse(ISS_OBJ.exists.from) : -Infinity;
// État d'un satellite JSON (orbite du TLE dans `start.orbit`) à la date d : ISS, Hubble… (même calcul, SGP4 dans les 60 jours de l'époque, orbite moyenne indicative au-delà)
export function satState(obj, epoch, from, d) {
  const far = Math.abs(d.getTime() - epoch) > 60 * 86400000;
  if (d.getTime() < from) return null;
  const s = objectStart(obj, { date: d, far }), P = s.ecef, V = s.velEcef, toScene = (e, v) => v.set(e[0], e[2], -e[1]);   // repère terrestre (x lon 0, y est, z pôle) → scène (x, z, −y)
  const dirv = toScene(P, new THREE.Vector3()).normalize(), rr = Math.hypot(P[0], P[1], P[2]), sl = P[2] / rr, alt = (rr - 6378137 * (1 - sl * sl / 298.257223563)) / 1000;   // hauteur au-dessus de l'ellipsoïde
  return {
    pos: dirv.clone().multiplyScalar(rr / (R_KM * 1000)), up: dirv, vel: toScene(V, new THREE.Vector3()).normalize(),
    alt, speed: s.speedMs / 1000, lon: s.lon, lat: s.lat, approx: far,
  };
}
export const issState = d => satState(ISS_OBJ, ISS_EPOCH, ISS_FROM, d);

// Télescope spatial Hubble (objects/hubble/hubble.json : TLE CelesTrak, NORAD 20580) : même mécanique que l'ISS
export const HUBBLE_OBJ = FLIGHT_OBJECTS.hubble;
export const HUBBLE_EPOCH = Date.parse(HUBBLE_OBJ.start.orbit.epoch), HUBBLE_FROM = HUBBLE_OBJ.exists && HUBBLE_OBJ.exists.from ? Date.parse(HUBBLE_OBJ.exists.from) : -Infinity;
export const hubbleState = d => satState(HUBBLE_OBJ, HUBBLE_EPOCH, HUBBLE_FROM, d);
export const HUBBLE_PERIOD_MS = objectPeriodS(HUBBLE_OBJ) * 1000;

// Le modèle 3D (NASA, texturé) est chargé par js/main.js (ISS_MODEL, dans le dossier de l'objet) ; repère du modèle en mètres : x = sens du vol, y = vers le haut (zénith), z = poutre (perpendiculaire à l'orbite).

// ---------- caractéristiques affichées en 3D sur l'ISS ----------
// Chaque entrée : { id, label, build(ctx) -> { object3D (enfant du modèle ou de la scène), labels: [{ el, point(world Vector3) }], update(iss) } }.
// Ajouter une caractéristique = une entrée ici (la case à cocher apparaît dans le panneau).
export const lineMat = c => new THREE.LineBasicMaterial({ color: c });
export function seg(pts, c) { const g = new THREE.BufferGeometry().setFromPoints(pts); return new THREE.LineSegments(g, lineMat(c)); }
export const ISS_FEATURES = [
  { id: 'size', label: '📐 Dimensions', onlyIss: true, build(ctx) {   // onlyIss : affiché seulement quand la caméra est sur l'ISS
    const col = 0x4fd8ff, tk = 4, V = (x, y, z) => new THREE.Vector3(x, y, z);
    // (positions absolues = matrice locale du modèle, PAS localToWorld : le groupe `world` est décalé au rendu — origine flottante)
    // cotes dans le repère du modèle (suivent son orientation et son agrandissement) : largeur = poutre (z), longueur = modules (x), posées à l'écart du modèle
    const dims = ctx.dims ? ctx.dims.map(d => ({ a: V(...d.a), b: V(...d.b), text: d.text, up: V(...d.up) })) : [{ a: V(50, 0, -54.5), b: V(50, 0, 54.5), text: 'Largeur 109 m', up: V(1, 0, 0) }, { a: V(-36.5, 0, 62), b: V(36.5, 0, 62), text: 'Longueur 73 m', up: V(0, 0, 1) }];   // ctx.dims : cotes d'un autre satellite (Hubble), dans le repère de son modèle
    const objects = [], labels = [];
    for (const d of dims) {
      const t1 = d.up.clone().multiplyScalar(tk), pts = [d.a, d.b, d.a.clone().sub(t1), d.a.clone().add(t1), d.b.clone().sub(t1), d.b.clone().add(t1)];
      const m = seg(pts, col); m.material.depthTest = false; m.renderOrder = 5; ctx.model.add(m); objects.push(m);
      const l = ctx.label(d.text); l.alongLine = true; l.needModel = true; l.dim = d; labels.push(l);
    }
    // hauteur : trait continu de l'ISS à la surface (échelle réelle de la Terre, pas agrandie)
    const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const hcol = 0xffa040, hl = new THREE.Line(hg, new THREE.LineBasicMaterial({ color: hcol })); hl.frustumCulled = false; hl.material.depthTest = false; hl.renderOrder = 5; ctx.scene.add(hl); objects.push(hl);
    const lh = ctx.label('Hauteur'); lh.el.style.color = '#ffa040'; lh.alongLine = true; labels.push(lh);
    return {
      objects, labels,
      update(iss) {
        const n = ctx.model.scale.x * 1000 * R_KM;   // facteur d'agrandissement du modèle
        for (const l of labels) if (l.dim) {
          l.line = [l.dim.a.clone().applyMatrix4(ctx.model.matrix), l.dim.b.clone().applyMatrix4(ctx.model.matrix)];
          l.el.textContent = l.dim.text + (l.dim.text[1] === 'a' && n > 1.5 ? ' (modèle agrandi ×' + Math.round(n) + ')' : '');
        }
        const a = iss.pos, g = iss.up.clone(), arr = hg.attributes.position; arr.setXYZ(0, a.x, a.y, a.z); arr.setXYZ(1, g.x, g.y, g.z); arr.needsUpdate = true;
        lh.line = [a.clone(), g]; lh.el.textContent = 'Hauteur : ' + Math.round(iss.alt) + ' km';
      },
    };
  } },
  // trajectoire future sur un tour (une période, ~93 min), dans le repère de la Terre qui tourne (ce que verrait le sol), à l'altitude réelle ; recalculée chaque seconde, le départ colle toujours à l'ISS
  { id: 'orbit', label: '🛤 Trajectoire (1 tour)', build(ctx) {
    const N = 180, pos = new Float32Array((N + 1) * 3), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: ctx.orbitColor || 0xffe27a })); line.frustumCulled = false; ctx.scene.add(line);
    let built = -1e12; const periodOf = () => (typeof ctx.periodMs === 'function' ? ctx.periodMs() : (ctx.periodMs || ISS_PERIOD_MS)), stateOf = ctx.stateOf || issState;   // durée tracée : une période d'orbite, ou la route restante du Concorde   // période du JSON (86400 / tours par jour)
    return {
      objects: [line], labels: [],
      update(iss, camera, date) {
        const t = date.getTime();
        if (t - built > 1000) {
          built = t;
          for (let k = 1; k <= N; k++) { const st = stateOf(new Date(t + periodOf() * k / N)); if (st) pos.set([st.pos.x, st.pos.y, st.pos.z], 3 * k); }
        }
        pos.set([iss.pos.x, iss.pos.y, iss.pos.z], 0); g.attributes.position.needsUpdate = true;
      },
    };
  } },
];

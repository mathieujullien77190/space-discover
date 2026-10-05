// Option « Constellations » : les traits qui relient les étoiles (la « casserole » = la Grande Ourse, Orion, Cassiopée…) et le nom de chaque constellation, en français.
// Les traits sont des segments sur la sphère des étoiles (même repère que stars.js : on les ajoute au groupe des étoiles, qui tourne avec le temps sidéral) ; les noms sont des étiquettes HTML posées à la position de l'étiquette de chaque constellation.
import * as THREE from 'three';
import { roundPointsMaterial } from './round-points.js';
import { CONSTELLATIONS } from './data/constellations.js';
import { overlaps } from './capitals.js';
import { starVector } from './stars.js';

export const LINE_COLOR = 0x6fa8ff, LINE_OPACITY = 0.55;
export const LABEL_H = 16, CHAR_W = 7;   // encombrement d'une étiquette (pixels)

// segments (paires de sommets) de tous les tracés : Float32Array de rayon 1
export function constellationSegments() {
  const out = [], a = new THREE.Vector3(), b = new THREE.Vector3();
  for (const [, , , polylines] of CONSTELLATIONS) for (const line of polylines) for (let i = 0; i + 1 < line.length; i++) { starVector(line[i][0], line[i][1], a); starVector(line[i + 1][0], line[i + 1][1], b); out.push(a.x, a.y, a.z, b.x, b.y, b.z); }
  return new Float32Array(out);
}

// segments d'UNE constellation (Float32Array) et ses étoiles (sommets distincts des tracés)
export function constellationParts(c) {
  const seg = [], stars = new Map(), a = new THREE.Vector3(), b = new THREE.Vector3();
  for (const line of c[3]) for (let i = 0; i < line.length; i++) {
    starVector(line[i][0], line[i][1], a); stars.set(line[i][0] + ',' + line[i][1], [a.x, a.y, a.z]);
    if (i + 1 < line.length) { starVector(line[i + 1][0], line[i + 1][1], b); seg.push(a.x, a.y, a.z, b.x, b.y, b.z); }
  }
  return { segments: new Float32Array(seg), stars: new Float32Array([...stars.values()].flat()) };
}

// Un CLIC sur le nom d'une constellation la sélectionne : seuls SES traits restent affichés, ses étoiles sont mises en valeur (points plus gros et plus clairs) ; un second clic (ou l'option éteinte) remet tout.
export function createConstellations(starsGroup, overlay) {
  const mat = new THREE.LineBasicMaterial({ color: LINE_COLOR, transparent: true, opacity: LINE_OPACITY, depthWrite: false });
  const lines = new THREE.Group(); lines.visible = false; starsGroup.add(lines);   // un LineSegments par constellation (visibles ou non selon la sélection)
  const parts = {};
  for (const c of CONSTELLATIONS) { const pt = constellationParts(c), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pt.segments, 3)); const l = new THREE.LineSegments(g, mat); l.frustumCulled = false; lines.add(l); (parts[c[0]] = parts[c[0]] || []).push({ line: l, stars: pt.stars }); }   // certaines (Serpent) ont deux parties sous le même identifiant
  const hi = new THREE.Points(new THREE.BufferGeometry(), roundPointsMaterial({ color: 0xcfe2ff, size: 7, sizeAttenuation: false, depthWrite: false })); hi.frustumCulled = false; hi.visible = false; starsGroup.add(hi);   // étoiles de la constellation choisie
  let selected = null;
  const select = id => {
    selected = id && parts[id] && id !== selected ? id : null;
    if (selected) { hi.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(parts[selected].flatMap(p => [...p.stars])), 3)); hi.geometry.computeBoundingSphere(); }
    hi.visible = !!selected;
    if (items) for (const it of items) it.el.classList.toggle('sel', it.id === selected);
  };
  let items = null, shown = 0;
  const build = () => { items = CONSTELLATIONS.map(([id, name, [ra, dec]]) => { const el = overlay.label(name, 'const'); el.style.display = 'none'; el.addEventListener('click', () => select(id)); return { id, name, dir: starVector(ra, dec, new THREE.Vector3()), el, w: name.length * CHAR_W + 10 }; }); };
  const hideAll = () => { if (items) for (const it of items) it.el.style.display = 'none'; shown = 0; };
  const p = new THREE.Vector3(), cam = new THREE.Vector3(), ec = new THREE.Vector3();
  return {
    lines,
    // on : option allumée ; camera ; width / height (pixels) ; earthCenter : centre de la Terre dans le monde (les noms derrière la Terre sont cachés) ; renvoie le nombre de noms affichés
    update({ on, camera, width, height, earthCenter }) {
      lines.visible = !!on;
      if (!on) { if (selected) select(null); hi.visible = false; if (shown) hideAll(); return 0; }
      for (const id in parts) for (const p of parts[id]) p.line.visible = !selected || selected === id;   // une constellation choisie : les autres traits sont cachés
      if (!items) build();
      starsGroup.updateMatrixWorld(true);
      cam.copy(camera.position);
      const dEarth = earthCenter ? cam.distanceTo(earthCenter) : 1e9, angEarth = dEarth > 1 ? Math.asin(1 / dEarth) : Math.PI / 2;   // rayon angulaire de la Terre vue de la caméra
      const placed = []; let n = 0;
      for (const it of items) {
        p.copy(it.dir).applyMatrix4(starsGroup.matrixWorld);   // point sur la sphère des étoiles
        let ok = true;
        if (earthCenter) { ec.copy(earthCenter).sub(cam).normalize(); const dir = p.clone().sub(cam).normalize(); ok = Math.acos(Math.max(-1, Math.min(1, ec.dot(dir)))) > angEarth * 1.02; }   // pas devant le disque de la Terre
        if (ok) {
          p.project(camera);
          const x = (p.x + 1) / 2 * width, y = (1 - p.y) / 2 * height;
          ok = p.z < 1 && x > 0 && x < width - 20 && y > 0 && y < height - 20;
          if (ok) { const box = [x - it.w / 2, y - LABEL_H / 2, it.w, LABEL_H]; if (placed.some(b => overlaps(box, b))) ok = false; else { placed.push(box); it.el.style.transform = 'translate(' + (x - it.w / 2) + 'px,' + (y - LABEL_H / 2) + 'px)'; } }
        }
        it.el.style.display = ok ? 'block' : 'none'; if (ok) n++;
      }
      shown = n; return n;
    },
    select, selected: () => selected,
    count: () => shown,
    dispose() { if (items) for (const it of items) overlay.remove(it.el); items = null; starsGroup.remove(lines, hi); mat.dispose(); for (const id in parts) for (const p of parts[id]) p.line.geometry.dispose(); hi.geometry.dispose(); },
  };
}

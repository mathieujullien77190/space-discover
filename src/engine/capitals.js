// Option « Capitales » : le nom des capitales du monde (200, Natural Earth, domaine public) posé sur la Terre, en étiquettes HTML (overlay du moteur).
// À chaque image : on ne garde que les capitales VUES EN DIRECT : du côté visible de la Terre ET assez au-dessus de l'horizon (MIN_ELEVATION : près du limbe elles seraient cachées par la courbure et le relief), non cachées
// par un autre astre (Lune…), à l'écran, par ordre de population, sans chevauchement (au plus MAX_LABELS) ; rien quand la Terre est trop petite à l'écran.
import * as THREE from 'three';
import { CAPITALS } from './data/capitals.js';
import { ll } from './earth.js';

export const MIN_ELEVATION = 0.12;    // sinus minimal de la hauteur de la caméra au-dessus de l'horizon de la capitale (≈ 7°) : en dessous elle n'est pas vue « en direct »
export const MAX_LABELS = 90;           // étiquettes affichées au plus
export const MIN_EARTH_PX = 70;         // rayon apparent minimal de la Terre (pixels) pour afficher les noms
export const LABEL_H = 18, CHAR_W = 7;  // encombrement d'une étiquette : hauteur et largeur par caractère (pixels)

// vrai si deux rectangles [x, y, w, h] se chevauchent
export const overlaps = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];

// opts : { radius: rayon de l'astre porteur en unités de scène (nombre ou fonction ; défaut 1), data: [[nom, lat, lon, id?]…] (défaut : les capitales), cls: classe CSS, prefix: texte devant le nom, onClick(id) : étiquettes cliquables (observatoires) }
export function createCapitals(overlay, earth, opts = {}) {
  const data = opts.data || CAPITALS, cls = opts.cls || 'cap', prefix = opts.prefix === undefined ? '• ' : opts.prefix;
  let items = null, shown = 0;
  const build = () => { items = data.map(([name, lat, lon, id]) => { const el = overlay.label(prefix + name, cls); el.style.display = 'none'; if (opts.onClick) el.addEventListener('click', () => opts.onClick(id)); return { name, n: ll(lon, lat, new THREE.Vector3()), el, w: (name.length + prefix.length) * CHAR_W + 8 }; }); };
  const hideAll = () => { if (items) for (const it of items) it.el.style.display = 'none'; shown = 0; };
  const p = new THREE.Vector3(), c = new THREE.Vector3(), nw = new THREE.Vector3(), v = new THREE.Vector3();
  return {
    // on : option allumée ; camera : caméra du moteur ; width / height : taille de l'écran (pixels) ; hidden(p) : vrai si le point monde p est caché par un autre astre ; renvoie le nombre de noms affichés
    update({ on, camera, width, height, hidden }) {
      if (!on) { if (shown) hideAll(); return 0; }
      if (!items) build();
      earth.updateWorldMatrix(true, false);
      c.setFromMatrixPosition(earth.matrixWorld);
      const d = camera.position.distanceTo(c), rad = typeof opts.radius === 'function' ? opts.radius() : (opts.radius || 1), earthPx = rad * height / (2 * d * Math.tan(camera.fov * Math.PI / 360));   // rayon apparent de l'astre porteur (la Terre : 1 ; la Lune : son rayon en rayons terrestres)
      if (earthPx < MIN_EARTH_PX) { hideAll(); return 0; }
      const placed = []; let n = 0;
      for (const it of items) {
        let ok = n < MAX_LABELS;
        if (ok) {
          p.copy(it.n).applyMatrix4(earth.matrixWorld); nw.copy(p).sub(c).normalize(); v.copy(camera.position).sub(p);
          ok = nw.dot(v) > MIN_ELEVATION * v.length();   // du côté visible de la Terre ET assez haut sur l'horizon
          if (ok && hidden && hidden(p)) ok = false;   // derrière la Lune, une planète…
          if (ok) {
            p.project(camera);
            const x = (p.x + 1) / 2 * width, y = (1 - p.y) / 2 * height;
            ok = p.z < 1 && x > -20 && x < width + 20 && y > -20 && y < height + 20;
            if (ok) { const box = [x - 4, y - LABEL_H / 2, it.w, LABEL_H]; if (placed.some(b => overlaps(box, b))) ok = false; else { placed.push(box); it.el.style.transform = 'translate(' + (x - 4) + 'px,' + (y - LABEL_H / 2) + 'px)'; } }
          }
        }
        it.el.style.display = ok ? 'block' : 'none'; if (ok) n++;
      }
      shown = n; return n;
    },
    count: () => shown,
    dispose() { if (items) for (const it of items) overlay.remove(it.el); items = null; shown = 0; },
  };
}

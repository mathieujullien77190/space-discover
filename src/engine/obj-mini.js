import * as THREE from 'three';

// Mini lecteur Wavefront OBJ (sommets « v » et faces « f », polygones découpés en triangles) pour les noyaux de comètes (modèle de forme de l'ESA, tchouri.obj).
// kmPerUnit : kilomètres par unité du fichier ; unitKm : kilomètres par unité de la scène (rayon de la Terre).
// Repère du fichier (z = axe de rotation, x = méridien origine) → repère local des maillages d'astres (y = pôle nord, x = méridien 0, z = vers 90° O) : (x, y, z) → (x, z, −y).
export function parseObj(text, kmPerUnit, unitKm) {
  const pos = [], idx = [], k = kmPerUnit / unitKm;
  for (const line of text.split('\n')) {
    const p = line.trim().split(/\s+/);
    if (p[0] === 'v') pos.push(+p[1] * k, +p[3] * k, -p[2] * k);
    else if (p[0] === 'f') { const f = p.slice(1).map(s => parseInt(s, 10) - 1); for (let i = 1; i < f.length - 1; i++) idx.push(f[0], f[i], f[i + 1]); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}

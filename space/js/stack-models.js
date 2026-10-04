// Modèles 3D (glTF) d'une fusée dessinée à partir de ses pièces : chaque pièce peut avoir `visual.model { file, scale, rotate [x°, y°, z°], align [x, y, z], offsetM [x, y, z] }` (fichier .glb dans le dossier de l'objet).
//   scale    mètres par unité du fichier (ex. 0,0254 si le modèle est en pouces)
//   rotate   rotation d'Euler (ordre XYZ, degrés) pour mettre le modèle debout : nez vers +Y, base en bas
//   align    par axe : "min" (le bord inférieur du modèle va à 0), "center", "max" ou "none" ; défaut ["center", "min", "center"] = centré sur l'axe de la fusée, base à 0
//   offsetM  décalage final en mètres (ex. l'orbiteur de la navette est posé à côté du réservoir)
// Chargés AVANT de créer le vol (Launch clone ces modèles pour chaque booster, chaque débris…) ; en cas d'échec (file://, fichier absent) la fusée garde ses cylindres.
const GLB_CACHE = {};
function placeModel(root, m) {
  const D = Math.PI / 180, r = m.rotate || [0, 0, 0], g = new THREE.Group(); root.rotation.set(r[0] * D, r[1] * D, r[2] * D, 'XYZ'); root.scale.setScalar(m.scale || 1); g.add(root); g.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(g), al = m.align || ['center', 'min', 'center'], off = m.offsetM || [0, 0, 0], sh = [0, 0, 0];
  ['x', 'y', 'z'].forEach((k, i) => { const a = al[i]; sh[i] = (a === 'min' ? -box.min[k] : a === 'max' ? -box.max[k] : a === 'none' ? 0 : -(box.min[k] + box.max[k]) / 2) + off[i]; });
  root.position.set(sh[0], sh[1], sh[2]); return g;
}
function loadStackModels(obj, baseUrl) {
  const st = obj.visual && obj.visual.stack, P = obj.parts || {}; if (!st || typeof loadGlb !== 'function') return Promise.resolve({});
  const jobs = [], add = (key, m) => { if (m && m.file) jobs.push((GLB_CACHE[baseUrl + m.file] || (GLB_CACHE[baseUrl + m.file] = loadGlb(baseUrl + m.file))).then(root => [key, placeModel(root.clone(), m)]).catch(e => { delete GLB_CACHE[baseUrl + m.file]; console.warn('Modèle 3D « ' + m.file + ' » indisponible :', e.message); return null; })); };
  const vis = n => P[n] && P[n].visual && P[n].visual.model;
  add('core', vis(st.core)); add('booster', st.boosters && vis(st.boosters.part)); add('upper', st.upper && st.upper.model); add('fairing', st.fairing && vis(st.fairing));
  return Promise.all(jobs).then(r => { const o = {}; for (const e of r) if (e) o[e[0]] = e[1]; return o; });
}

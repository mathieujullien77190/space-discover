// Modèle 3D de l'ISS : le fichier existe, ne demande aucune extension que notre mini-chargeur ne sait pas lire, et sa description (échelle, repère) est cohérente.
import fs from 'node:fs';
import path from 'node:path';
import { root } from './engine-loader.mjs';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
const iss = JSON.parse(fs.readFileSync(path.join(root, 'public', 'objects', 'iss', 'iss.json'), 'utf8')), file = path.join(root, 'public', 'objects', 'iss', iss.model.file);
check(fs.existsSync(file), 'fichier du modèle présent : ' + iss.model.file);
const buf = fs.readFileSync(file), size = buf.length / 1e6;
check(buf.readUInt32LE(0) === 0x46546c67 && buf.readUInt32LE(4) === 2, 'en-tête glTF binaire (GLB) version 2');
const jl = buf.readUInt32LE(12), json = JSON.parse(buf.slice(20, 20 + jl).toString('utf8'));
check(size < 40, 'taille ' + size.toFixed(1) + ' Mo (moins de 40 Mo : chargé quand on est près de la station)');
const req = json.extensionsRequired || [];
check(!req.includes('KHR_draco_mesh_compression') && !req.includes('EXT_meshopt_compression') && !req.includes('KHR_mesh_quantization'), 'aucune extension de compression ou de quantification requise (le mini-chargeur ne les lit pas) : ' + (req.join(', ') || 'aucune'));
check(json.meshes.length > 20 && json.materials.length > 5, json.meshes.length + ' maillages, ' + json.materials.length + ' matériaux');
check(json.accessors.every(a => [5120, 5121, 5122, 5123, 5125, 5126].includes(a.componentType) && !a.normalized || a.componentType === 5126 || a.type === 'SCALAR'), 'attributs en flottants (pas d’entiers normalisés)');
// dimensions : boîte des positions (mètres après échelle), x = modules, z = poutre
const pos = json.accessors.filter(a => a.type === 'VEC3' && a.min && a.max && a.componentType === 5126);
check(pos.length > 0, pos.length + ' accessoires de positions avec bornes');
const scale = iss.model.scale == null ? 1 : iss.model.scale, tr = iss.model.transform || [0, 0, -1, 0, 1, 0, 1, 0, 0];   // défauts : mètres et (X, Y, Z) → (−Z, Y, X)
check(scale > 0 && tr.length === 9, 'échelle (' + scale + ' m par unité) et matrice de repère (' + (iss.model.transform ? 'décrites dans iss.json' : 'par défaut') + ')');
const det = m => m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
check(Math.abs(Math.abs(det(tr)) - 1) < 1e-9, 'matrice de repère orthonormée (déterminant ±1)');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }

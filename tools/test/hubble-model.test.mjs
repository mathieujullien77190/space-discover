// Modèle NASA de Hubble : fichier présent, lisible par notre mini-chargeur (pas de Draco), dimensions réelles, matrice de repère cohérente avec le dessin simplifié.
import fs from 'node:fs';
import path from 'node:path';
import { root } from './engine-loader.mjs';
import { HUBBLE_DIMS, HUBBLE_LENGTH_M, HUBBLE_MODEL, HUBBLE_MODEL_CFG } from '../../src/engine/hubble-model.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
const file = path.join(root, 'public', HUBBLE_MODEL);
check(fs.existsSync(file), 'fichier du modèle présent : ' + HUBBLE_MODEL);
const buf = fs.readFileSync(file), json = JSON.parse(buf.slice(20, 20 + buf.readUInt32LE(12)).toString('utf8'));
check(buf.readUInt32LE(0) === 0x46546c67 && buf.length < 8e6, 'GLB, ' + (buf.length / 1e6).toFixed(1) + ' Mo');
check(!(json.extensionsRequired || []).includes('KHR_draco_mesh_compression') && !(json.extensionsUsed || []).includes('KHR_draco_mesh_compression'), 'aucune compression Draco (décompressée avec gltf-transform) : le mini-chargeur sait le lire');
const pos = json.meshes.flatMap(m => m.primitives).map(p => json.accessors[p.attributes.POSITION]), k = HUBBLE_MODEL_CFG.scale;
const lo = [0, 1, 2].map(i => Math.min(...pos.map(a => a.min[i]))), hi = [0, 1, 2].map(i => Math.max(...pos.map(a => a.max[i]))), ext = [0, 1, 2].map(i => (hi[i] - lo[i]) * k);
check(Math.abs(ext[2] - HUBBLE_LENGTH_M) < 0.5, 'axe du télescope (z du fichier) : ' + ext[2].toFixed(1) + ' m (13,2 m attendus, échelle en pouces)');
check(ext[0] > 10 && ext[0] < 14 && ext[1] > 10 && ext[1] < 14, 'envergure des panneaux : ' + ext[0].toFixed(1) + ' × ' + ext[1].toFixed(1) + ' m (≈ 12 m)');
const tr = HUBBLE_MODEL_CFG.transform, det = tr[0] * (tr[4] * tr[8] - tr[5] * tr[7]) - tr[1] * (tr[3] * tr[8] - tr[5] * tr[6]) + tr[2] * (tr[3] * tr[7] - tr[4] * tr[6]);
check(Math.abs(det - 1) < 1e-9, 'matrice de repère : rotation propre (déterminant 1)');
// le nœud racine tourne de −90° autour de x : (x, y, z) → (x, z, −y) ; la matrice met alors y sur x (axe du télescope = sens de marche)
const sceneX = [0, 0, 1].map((v, i) => tr[1] * 0 + 0); void sceneX;
check(tr[1] === 1 && tr[0] === 0 && tr[2] === 0, 'après la racine (axe du télescope sur y), la matrice le place sur x (sens de marche)');
check(HUBBLE_DIMS.length === 2 && HUBBLE_DIMS.every(d => d.a.length === 3 && d.b.length === 3 && d.up.length === 3 && /m/.test(d.text)), 'deux cotes (longueur, envergure) pour les caractéristiques 3D');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }

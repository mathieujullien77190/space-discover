// Mini lecteur OBJ (src/engine/obj-mini.js) et modèle de forme de Tchouri (public/objects/tchouri/tchouri.obj, ESA / Rosetta, CC BY-SA 3.0 IGO).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { loadEngine, root } from './engine-loader.mjs';

const ctx = await loadEngine(), fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
const G = e => vm.runInContext(e, ctx);
// 1. tétraèdre : sommets, faces, polygone à 4 côtés découpé en 2 triangles, repère (x, y, z) → (x, z, −y), échelle km → unités de la scène
ctx.TXT = 'v 0 0 0\nv 1 0 0\nv 0 1 0\nv 0 0 1\nf 1 2 3\nf 1 3 4 2\n';
const info = G('(() => { const g = parseObj(TXT, 2, 1); const p = g.attributes.position.array; return { n: g.attributes.position.count, tris: g.index.count / 3, p: Array.from(p) }; })()');
check(info.n === 4 && info.tris === 3, 'tétraèdre : 4 sommets, 3 triangles (le quadrilatère est coupé en 2)');
check(JSON.stringify(info.p.slice(3, 6)) === JSON.stringify([2, 0, -0]) && JSON.stringify(info.p.slice(6, 9)) === JSON.stringify([0, 0, -2]) && JSON.stringify(info.p.slice(9, 12)) === JSON.stringify([0, 2, 0]), 'repère : (1,0,0) → (2,0,0) ; (0,1,0) → (0,0,−2) ; (0,0,1) → (0,2,0) pour 2 unités par unité');
// 2. le vrai modèle : 31 456 sommets, 62 908 triangles ; volume et dimensions de la comète une fois à l'échelle du JSON
const j = JSON.parse(fs.readFileSync(path.join(root, 'public', 'objects', 'tchouri', 'tchouri.json'), 'utf8')), txt = fs.readFileSync(path.join(root, 'public', 'objects', 'tchouri', j.appearance.model), 'utf8');
ctx.OBJ = txt; ctx.KM = j.appearance.kmPerUnit;
const real = G('(() => { const g = parseObj(OBJ, KM, 1); const p = g.attributes.position.array, ix = g.index.array; let vol = 0; for (let i = 0; i < ix.length; i += 3) { const a = ix[i] * 3, b = ix[i + 1] * 3, c = ix[i + 2] * 3; vol += (p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])) / 6; } const bb = new THREE.Box3().setFromBufferAttribute(g.attributes.position); return { n: g.attributes.position.count, tris: g.index.count / 3, vol: Math.abs(vol), size: bb.getSize(new THREE.Vector3()).toArray(), c: bb.getCenter(new THREE.Vector3()).toArray() }; })()');
check(real.n === 31456 && real.tris === 62908, 'tchouri.obj : ' + real.n + ' sommets, ' + real.tris + ' triangles');
check(Math.abs(real.vol - 18.7) < 0.4, 'volume du maillage à l’échelle du JSON : ' + real.vol.toFixed(2) + ' km³ (18,7 attendus)');
const size = real.size.map(v => v).sort((a, b) => b - a);
check(size[0] > 4 && size[0] < 6 && size[2] > 2 && size[2] < 3.5, 'boîte englobante ' + size.map(v => v.toFixed(1)).join(' × ') + ' km (une comète de 4 à 6 km de long, deux lobes)');
// 3. cohérence JSON : masse, densité (≈ 0,53 g/cm³), rotation 12,4 h
const dens = j.massKg / (real.vol * 1e9) / 1000;
check(Math.abs(dens - 0.53) < 0.03, 'densité ' + dens.toFixed(3) + ' g/cm³ (≈ 0,53 attendus : masse ' + j.massKg + ' kg / volume)');
check(Math.abs(360 / j.rotation.rateDegPerDay * 24 - 12.4) < 0.01, 'rotation : ' + (360 / j.rotation.rateDegPerDay * 24).toFixed(2) + ' h (12,4 attendues)');
if (fails.length) process.exit(1);

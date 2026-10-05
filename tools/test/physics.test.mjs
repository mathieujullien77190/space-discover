// Moteur physique générique (js/physics.js) : trois objets décrits par leur seul modèle. Lancer : node tools/test/physics.test.js
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path';
import { loadEngine, loadEngineInto, root } from './engine-loader.mjs';
const ctx = await loadEngine();
const out = vm.runInContext(`(() => {
  const res = [], km = x => (x / 1000).toFixed(1);
  // 1. fusée-sonde : modèle + vitesse nulle, verticale au départ de Kourou
  const g = bodyFromGeo({ lat: 5.24, lon: -52.77, alt: 0, speed: 0, az: 90, el: 90 });
  const sonde = new Body({ name: 'sonde', dry: 300, prop: 700, shape: { type: 'cyl', r: 0.3, h: 8 }, engine: { thrust: 60e3, burn: 40, ispV: 250, ispS: 220 } }, g.state, { wEff: g.wEff, mode: 'end-on', guidance: Guidance.gravityTurn({ vertical: 6, kick: 1, kickDur: 4 }) });
  let r = sonde.propagate({ tMax: 2000 }), apo = Math.max(...r.samples.map(s => s.alt)), vmax = Math.max(...r.samples.map(s => s.v));
  res.push('Fusée-sonde (1 t, 60 kN pendant 40 s) : apogée ' + km(apo) + ' km, vitesse max ' + vmax.toFixed(0) + ' m/s, retombe après ' + r.end.t.toFixed(0) + ' s (' + r.end.reason + ')');
  // 2. missile balistique : vitesse 4 km/s, élévation 45°, azimut 90°, sans moteur
  const m = bodyFromGeo({ lat: 5.24, lon: -52.77, alt: 100000, speed: 3000, az: 90, el: 45 });
  r = new Body({ name: 'ogive', dry: 500, prop: 0, shape: { type: 'cyl', r: 0.4, h: 2 } }, m.state, { wEff: m.wEff, mode: 'end-on' }).propagate({ tMax: 3000 });
  const last = r.samples[r.samples.length - 1], a0 = r.samples[0];
  res.push('Objet balistique lancé à 100 km d altitude (3 km/s, 45°) : apogée ' + km(Math.max(...r.samples.map(s => s.alt))) + ' km, portée ' + (Math.acos((a0.x * last.x + a0.y * last.y) / Math.hypot(a0.x, a0.y) / Math.hypot(last.x, last.y)) * 6378).toFixed(0) + ' km, vol ' + r.end.t.toFixed(0) + ' s');
  // 3. un booster vidé : aucune donnée de trajectoire, seulement son modèle et l'état à la séparation (69 km, 2,5 km/s)
  const b = bodyFromGeo({ lat: 5.24, lon: -52.77, alt: 69000, speed: 2500, az: 90, el: 25 });
  const booster = { name: 'booster', dry: 33000, prop: 0, shape: { type: 'cyl', r: 1.5, h: 34 } }, bd = new Body(booster, b.state, { wEff: b.wEff });
  r = bd.propagate({ tMax: 3000 });
  res.push('Booster (33 t, 3 m × 34 m) : β = ' + (booster.dry / bd.cdA).toFixed(0) + ' kg/m², apogée ' + km(Math.max(...r.samples.map(s => s.alt))) + ' km, retombe après ' + r.end.t.toFixed(0) + ' s, vitesse finale ' + r.samples[r.samples.length - 1].v.toFixed(0) + ' m/s');
  return res.join(' @@ ');
})()`, ctx);
console.log(out.split(' @@ ').join(String.fromCharCode(10)));

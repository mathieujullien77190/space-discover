// Plan de vol (data/plans/kourou-ariane5-500km.json) rejoué SANS guidage par js/flight-plan.js : doit retrouver la trajectoire de la simulation avec guidage. node tools/test/plan.test.js
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path';
import { loadEngine, loadEngineInto, root } from './engine-loader.mjs';
const ctx = await loadEngine();
ctx.PLAN = JSON.parse(fs.readFileSync(path.join(root, 'public', 'data', 'plans/kourou-ariane5-500km.json'), 'utf8'));
console.log(vm.runInContext(`(() => {
  const NL = String.fromCharCode(10), rk = ROCKETS.ariane5, ref = simulateLaunch(500, { lat: 5.2408, payload: 3000, az: Math.PI / 2, rocket: rk }), pl = flyPlan(PLAN), out = [];
  out.push('guidage  : ' + ref.samples.length + ' échantillons, orbite ' + Math.round((ref.orbit.rp - 6378137) / 1000) + ' x ' + Math.round((ref.orbit.ra - 6378137) / 1000) + ' km, fin T+' + ref.tEnd.toFixed(1) + ' s, ok ' + ref.ok);
  out.push('plan     : ' + pl.samples.length + ' échantillons, orbite ' + Math.round((pl.orbit.rp - 6378137) / 1000) + ' x ' + Math.round((pl.orbit.ra - 6378137) / 1000) + ' km, fin T+' + pl.tEnd.toFixed(1) + ' s, ok ' + pl.ok);
  let worst = 0, wt = 0, worstV = 0; const n = Math.min(ref.samples.length, pl.samples.length);
  for (let i = 0; i < n; i++) { const a = ref.samples[i], b = pl.samples[i], d = Math.hypot(a.x - b.x, a.y - b.y), dv = Math.hypot(a.vx - b.vx, a.vy - b.vy); if (d > worst) { worst = d; wt = a.t; } if (dv > worstV) worstV = dv; }
  out.push('écart max de position : ' + worst.toFixed(1) + ' m (à T+' + wt.toFixed(0) + ' s) ; de vitesse : ' + worstV.toFixed(2) + ' m/s ; fin : ' + Math.hypot(ref.state.x - pl.state.x, ref.state.y - pl.state.y).toFixed(1) + ' m');
  out.push('événements : ' + ref.events.map(e => e.key + '@' + e.t.toFixed(1)).join(' ') + NL + '            ' + pl.events.map(e => e.key + '@' + e.t.toFixed(1)).join(' '));
  out.push('masse finale : ' + Math.round(ref.samples[ref.samples.length - 1].m) + ' kg (guidage) / ' + Math.round(pl.samples[pl.samples.length - 1].m) + ' kg (plan) ; Max-Q ' + (ref.maxQ.q / 1000).toFixed(1) + ' / ' + (pl.maxQ.q / 1000).toFixed(1) + ' kPa');
  return out.join(NL);
})()`, ctx));

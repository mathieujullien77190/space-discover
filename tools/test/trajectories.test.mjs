// Non-régression des TRAJECTOIRES : chaque vol du dépôt est rejoué par le moteur et comparé à des valeurs de référence (orbite atteinte, durée, événements, vitesse et altitude maximales).
// Si on modifie le moteur (physique, guidage, poussée, atmosphère…) ou un JSON d'objet / de plan, ce test dit tout de suite si un vol a changé. Valeurs relevées le 2026-10-05 ;
// si le changement est voulu : mettre REF à jour (et le dire dans la doc). Les tolérances absorbent les arrondis, pas un changement de comportement.
import fs from 'node:fs'; import path from 'node:path';
import { loadEngine, root } from './engine-loader.mjs';

const ctx = await loadEngine(), RE = 6378137, fails = [];
const check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
const load = n => { const o = JSON.parse(fs.readFileSync(path.join(root, 'public', 'objects', n, n + '.json'), 'utf8')); for (const [k, f] of Object.entries(o.parts || {})) if (typeof f === 'string') o.parts[k] = JSON.parse(fs.readFileSync(path.join(root, 'public', 'objects', n, f), 'utf8')); return o; };
const km = m => Math.round((m - RE) / 1000);

// rp / ra : périgée et apogée (km d'altitude) ; escape : quitte la Terre ; crash : retombe ; tEnd (s) ; events : clés dans l'ordre ; altMax (km) ; vMax (m/s)
const REF = {
  ariane5: { fly: () => ctx.flyObject(load('ariane5')), rp: 497, ra: 502, tEnd: 1939.6, altMax: 500, vMax: 7690, events: 't0 eap fairing meco epcsep esc1 esc1end esc2 esc2end sat objectOrbit' },
  'fusee-orbite-500km': { fly: () => ctx.flyObject(load('fusee-orbite-500km')), rp: 476, ra: 505, tEnd: 909.1, altMax: 476, vMax: 7634, events: 'liftoff stage cutoff circ end objectOrbit' },
  'fusee-trop-lente': { fly: () => ctx.flyObject(load('fusee-trop-lente')), crash: true, tEnd: 626.6, altMax: 197, vMax: 4663, events: 'liftoff stage cutoff crash' },
  shuttle: { fly: () => ctx.flyObject(load('shuttle')), rp: 215, ra: 225, tEnd: 1456.1, altMax: 224, vMax: 7776, events: 't0 eap meco epcsep esc2 esc2end objectOrbit' },
  voyager: { fly: () => ctx.flyObject(load('voyager')), escape: true, tEnd: 100118, altMax: 993886, vMax: 14458, events: 't0 eap fairing k3 epcsep k5 k6 release_titan2 esc1 esc1end esc2 esc2end release_centaur k13 k14 sat objectEscape' },
  starship500: { fly: () => ctx.flyPlan(ctx.FLIGHT_PLANS.starship500), rp: 529, ra: 560, tEnd: 3635.1, events: 't0 meco epcsep esc1 esc1end esc2 esc2end sat' },
};

for (const [name, R] of Object.entries(REF)) {
  const r = R.fly(), S = r.samples, tag = name + ' : ';
  check(S.every(s => Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(s.v)), tag + S.length + ' échantillons, tous finis');
  check(S.every((s, i) => i === 0 || s.t > S[i - 1].t), tag + 'le temps croît strictement');
  check(R.crash ? (!r.ok && r.crashed) : r.ok && !r.crashed, tag + (R.crash ? 'retombe (attendu)' : 'vol réussi'));
  if (R.rp != null) check(r.orbit && Math.abs(km(r.orbit.rp) - R.rp) <= 5 && Math.abs(km(r.orbit.ra) - R.ra) <= 5, tag + 'orbite ' + (r.orbit ? km(r.orbit.rp) + ' × ' + km(r.orbit.ra) : 'aucune') + ' km (réf ' + R.rp + ' × ' + R.ra + ' ± 5)');
  if (R.escape) check(r.orbit && r.orbit.e > 1 && r.escape !== false, tag + 'trajectoire hyperbolique (e = ' + (r.orbit && r.orbit.e.toFixed(3)) + ')');
  check(Math.abs(r.tEnd - R.tEnd) <= R.tEnd * 0.01 + 1, tag + 'fin à T+' + r.tEnd.toFixed(1) + ' s (réf ' + R.tEnd + ' ± 1 %)');
  if (R.altMax) { const a = Math.max(...S.map(s => s.alt)) / 1000; check(Math.abs(a - R.altMax) <= R.altMax * 0.01 + 2, tag + 'altitude max ' + Math.round(a) + ' km (réf ' + R.altMax + ')'); }
  if (R.vMax) { const v = Math.max(...S.map(s => s.v)); check(Math.abs(v - R.vMax) <= R.vMax * 0.01, tag + 'vitesse max ' + Math.round(v) + ' m/s (réf ' + R.vMax + ')'); }
  check(r.events.map(e => e.key).join(' ') === R.events, tag + 'événements : ' + r.events.map(e => e.key).join(' '));
}

// déterminisme : deux vols identiques donnent exactement les mêmes échantillons (aucun hasard dans la physique)
{ const a = ctx.flyObject(load('ariane5')), b = ctx.flyObject(load('ariane5')); check(a.samples.length === b.samples.length && a.samples.every((s, i) => s.x === b.samples[i].x && s.y === b.samples[i].y), 'déterminisme : deux vols d’Ariane 5 identiques à l’échantillon près'); }
// énergie : en orbite (après l’extinction), l’énergie spécifique reste constante (< 0,1 %) ; le vol d’Ariane 5 se termine sur une orbite quasi circulaire
{ const r = ctx.flyObject(load('ariane5')), MU = 3.986004418e14, E = s => s.v * s.v / 2 - MU / Math.hypot(s.x, s.y), tOff = r.events.find(e => e.key === 'esc2end').t, end = r.samples.filter(s => s.t > tOff + 1), e0 = E(end[0]);
  check(end.every(s => Math.abs(E(s) - e0) / Math.abs(e0) < 1e-3), 'Ariane 5 : énergie constante après l’extinction'); check(r.orbit.e < 0.01, 'Ariane 5 : orbite quasi circulaire (e = ' + r.orbit.e.toFixed(4) + ')'); }
// robustesse : moteur coupé à T+200 → la même fusée retombe ; sans masse ou sans paliers → refus
{ const o = load('fusee-orbite-500km'); o.timeline = o.timeline.filter(k => k.t < 200); const r = ctx.flyObject(o); check(!r.ok, 'fusée dont le moteur est coupé trop tôt : ne finit pas en orbite (' + (r.message || '').slice(0, 60) + ')'); }
// l’attraction de la Lune et du Soleil dévie très peu un vol en orbite basse (< 1 km) mais bien un vol qui s’éloigne (Voyager)
{ const date = new Date(Date.UTC(2026, 9, 5, 12)), off = load('voyager'); off.thirdBodies = false; const a = ctx.flyObject(load('voyager'), { date }), b = ctx.flyObject(off, { date }), d = Math.hypot(a.state.x - b.state.x, a.state.y - b.state.y); check(a.thirdBodies && !b.thirdBodies && d > 1e5, 'Voyager : Lune + Soleil dévient la trajectoire de ' + Math.round(d / 1000) + ' km à 10⁶ km de la Terre'); }

if (fails.length) { console.log('\n' + fails.length + ' échec(s)'); process.exit(1); }

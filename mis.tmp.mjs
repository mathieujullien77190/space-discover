import { loadEngine } from './tools/test/engine-loader.mjs';
import vm from 'node:vm';
const c = await loadEngine(); const G = e => vm.runInContext(e, c); const AU = 149597870700;
c.ENV = { rel: (id, D) => G(`BODY.rel("${id}", ${D})`), mu: id => { const b = G(`BODY.get("${id}")`); return b.muM3S2 || 6.6743e-11 * b.massKg; }, radiusKm: id => G(`BODY.get("${id}").radiusKm`), days: ms => G(`EPH.days(${ms})`) };
const M = {
  voyager2: { launch: { date: '1977-08-20T14:29:00Z' }, waypoints: [{ body: 'jupiter', date: '1979-07-09T22:29:00Z', periapsisKm: 570000 + 71492 }, { body: 'saturn', date: '1981-08-26T03:24:00Z', periapsisKm: 101000 + 60268 }, { body: 'uranus', date: '1986-01-24T17:59:00Z', periapsisKm: 81500 + 25559 }, { body: 'neptune', date: '1989-08-25T03:56:00Z', periapsisKm: 4950 + 24764, exitLatitudeDeg: -48 }] },
  voyager1: { launch: { date: '1977-09-05T12:56:00Z' }, waypoints: [{ body: 'jupiter', date: '1979-03-05T12:05:00Z', periapsisKm: 349000 }, { body: 'saturn', date: '1980-11-12T23:46:00Z', periapsisKm: 124000 + 60268, exitLatitudeDeg: 35 }] },
  pioneer10: { launch: { date: '1972-03-03T01:49:00Z' }, waypoints: [{ body: 'jupiter', date: '1973-12-03T02:26:00Z', periapsisKm: 130000 + 71492, plane: 'in', sign: 1 }] },
  pioneer11: { launch: { date: '1973-04-06T02:11:00Z' }, waypoints: [{ body: 'jupiter', date: '1974-12-03T05:21:00Z', periapsisKm: 34000 + 71492 }, { body: 'saturn', date: '1979-09-01T16:29:00Z', periapsisKm: 21000 + 60268, exitLatitudeDeg: 17 }] },
  newhorizons: { launch: { date: '2006-01-19T19:00:00Z' }, waypoints: [{ body: 'jupiter', date: '2007-02-28T05:43:00Z', periapsisKm: 2300000 }, { body: 'pluto', date: '2015-07-14T11:49:00Z', periapsisKm: 12500 + 1188, plane: 'in', sign: 1 }] },
};
for (const [name, def] of Object.entries(M)) {
  c.DEF = def; const m = G('buildMission(DEF, ENV)');
  console.log(`== ${name} : C3 ${m.departure.c3.toFixed(1)} km²/s²`);
  for (const f of m.flybys) console.log(`   ${f.body}: v∞ ${(f.vIn/1000).toFixed(2)}→${(f.vOut/1000).toFixed(2)} km/s, déviation ${f.deltaDeg.toFixed(1)}°, périgée ${(f.rpNeeded/1000).toFixed(0)} km (hist ${(f.rpHist/1000).toFixed(0)}), SOI ${(f.soi/1e9).toFixed(1)}e6 km ≈ ${f.tSoi.toFixed(0)} j`);
  const D2025 = G('EPH.days(Date.UTC(2025,9,5))'), s = m.state(D2025), r = Math.hypot(...s.r), sp = Math.hypot(...s.v), ecl = Math.asin(Math.abs(s.r[0]*m.nrm[0]+s.r[1]*m.nrm[1]+s.r[2]*m.nrm[2])/r)*180/Math.PI, sgn = (s.r[0]*m.nrm[0]+s.r[1]*m.nrm[1]+s.r[2]*m.nrm[2]) >= 0 ? 'N' : 'S';
  console.log(`   2025-10-05 : ${(r/AU).toFixed(1)} UA du Soleil, ${(sp/1000).toFixed(1)} km/s, ${ecl.toFixed(0)}° ${sgn} de l'écliptique`);
}
{ c.DEF = M.voyager2; c.DEF = JSON.parse(JSON.stringify(M.voyager2)); delete c.DEF.waypoints[3].exitLatitudeDeg; c.DEF.waypoints[3].plane = 'in'; const m = G('buildMission(DEF, ENV)'); const f = m.flybys[3];
  console.log('Neptune : v∞in', Array.from(f.vInfVec).map(x => (x/1000).toFixed(2)), 'vP', Array.from(f.vP).map(x => (x/1000).toFixed(2)), 'normale', Array.from(m.nrm).map(x => x.toFixed(2)));
  c.F = f; c.NRM = m.nrm; c.MU = f.mu;
  const r = G(`(() => { const out = []; const v = Math.hypot(...F.vInfVec), e = 1 + 29714000 * v * v / MU, delta = 2 * Math.asin(1 / e), u = F.vInfVec.map(x => x / v); const nn = NRM; const cr = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; const nu = cr(nn, u), l = Math.hypot(...nu), e1 = nu.map(x => x / l), e2 = cr(u, e1); let mn = 9, mx = -9; for (let i = 0; i < 720; i++) { const phi = i / 720 * 6.2832, dir = u.map((x, k) => (x * Math.cos(delta) + (e1[k] * Math.cos(phi) + e2[k] * Math.sin(phi)) * Math.sin(delta)) * v), h = dir.map((x, k) => x + F.vP[k]), lat = Math.asin((h[0]*nn[0]+h[1]*nn[1]+h[2]*nn[2]) / Math.hypot(...h)) * 180 / Math.PI; mn = Math.min(mn, lat); mx = Math.max(mx, lat); } return { delta: delta * 180 / Math.PI, mn, mx }; })()`);
  console.log('plage de latitudes atteignables au départ de Neptune :', r.mn.toFixed(1), '…', r.mx.toFixed(1), '° (déviation', r.delta.toFixed(1), '°)'); }

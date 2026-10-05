const ROOT = require('path').join(__dirname, '..', '..');
// Les noms (nomenclature UAI) et les cartes (USGS) viennent de sources différentes : un nom connu doit tomber sur la bonne classe de terrain.
const fs = require('fs');
const load = f => { const o = {}; new Function('o', fs.readFileSync(f, 'utf8').replace(/const (\w+) = /, 'o.G = '))(o); return o.G; };
const NAMES = load(ROOT + '/js/names.js');
const inRing = (x, y, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; };
function classAt(G, lon, lat, holes) {
  const per = G.classes.map(() => 0), last = {};
  G.parts.forEach(([c, flat], idx) => { const r = []; for (let i = 0; i < flat.length; i += 2) r.push([flat[i] / 10, flat[i + 1] / 10]); if (inRing(lon, lat, r)) { per[c] += 1; last[c] = idx; } });
  if (holes) { const c = per.findIndex(n => n % 2 === 1); return c < 0 ? '(aucune)' : G.classes[c][0]; }
  let best = null; G.parts.forEach(([c, flat], idx) => { if (last[c] === idx && (best === null || idx > best[1])) best = [c, idx]; }); return best ? G.classes[best[0]][0] : '(aucune)';
}
const moon = load(ROOT + '/js/surface-moon.js'), mars = load(ROOT + '/js/mars-data.js'), io = load(ROOT + '/js/surface-io.js'), eur = load(ROOT + '/js/surface-europa.js'), gan = load(ROOT + '/js/surface-ganymede.js'), tit = load(ROOT + '/js/surface-titan.js');
const find = (id, re) => NAMES[id].find(n => re.test(n[0]));
const cases = [['lune', moon, true, /^Mare Imbrium$/], ['lune', moon, true, /^Mare Crisium$/], ['lune', moon, true, /^Mare Serenitatis$/], ['lune', moon, true, /^Tycho$/], ['lune', moon, true, /^Copernicus$/],
  ['mars', mars, false, /^Olympus Mons$/], ['mars', mars, false, /^Hellas Planitia$/], ['mars', mars, false, /^Argyre Planitia$/], ['mars', mars, false, /^Elysium Mons$/],
  ['io', io, true, /^Loki Patera$/], ['io', io, true, /^Pele$/], ['europe', eur, true, /^Conamara Chaos$/], ['europe', eur, true, /^Pwyll$/],
  ['ganymede', gan, true, /^Galileo Regio$/], ['ganymede', gan, true, /^Marius Regio$/], ['ganymede', gan, true, /^Gilgamesh$/], ['titan', tit, true, /^Kraken Mare$/], ['titan', tit, true, /^Ligeia Mare$/]];
for (const [id, G, holes, re] of cases) { const n = find(id, re); if (!n) { console.log(id, re, 'absent des noms'); continue; } console.log(id.padEnd(9), n[0].padEnd(20), 'lon', String(n[1]).padStart(7), 'lat', String(n[2]).padStart(5), '->', classAt(G, n[1], n[2], holes)); }

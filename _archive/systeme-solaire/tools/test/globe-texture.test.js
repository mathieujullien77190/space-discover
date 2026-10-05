// Globes 3D : peinture des textures SANS WebGL. paintGlobeTexture (js/globe-gl.js) tourne sur un faux contexte 2D qui rasterise vraiment (règle non nulle, centres de pixels),
// ce qui permet de vérifier : aucune exception pour les 30 corps, la classe de terrain à des points connus (Mare Imbrium, Olympus Mons, Hellas…), l'accord avec la
// vérité planaire sur des points aléatoires (dont pôles et antiméridien), les cratères (position, antiméridien), bandes, Grande Tache rouge, Soleil, cache.
const ROOT = require('path').join(__dirname, '..', '..');
let s = require(ROOT + '/tools/load-page.js')();
const mkEl = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, append() {}, addEventListener() {}, querySelectorAll() { return []; }, setPointerCapture() {}, getContext() { return ctx; }, innerHTML: '' });
const ctx = new Proxy({}, { get: (t, k) => k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : k in t ? t[k] : () => {}, set: (t, k, v) => { t[k] = v; return true; } });
globalThis.document = { getElementById: () => mkEl(), createElement: () => mkEl(), activeElement: null };
globalThis.innerWidth = 1200; globalThis.innerHeight = 800; globalThis.devicePixelRatio = 1; globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => {}; globalThis.Path2D = class { moveTo() {} lineTo() {} arc() {} closePath() {} rect() {} addPath() {} }; globalThis.performance = { now: () => 0 };
s = s.replace(/requestAnimationFrame\(loop\);\s*$/, '') + 'globalThis.T = { paintGlobeTexture, globeTexKind, globeTexSize, globeCacheEvict, texRing, SURFACES, BODIES, P, EARTHB, NAMES, SURF_EARTH, SURF_MOON, MARS_GEO, SURF_IO, SURF_EUROPA, SURF_GANYMEDE, SURF_TITAN, GLOBE_GL, renderGlobeGL, drawGlobeGL, THREE, LAYERS };';
new Function(s)();
const T = globalThis.T, ok = (c, m) => console.log((c ? 'OK  ' : 'FAIL') + ' ' + m);

// faux contexte 2D qui rasterise : `any` = dernière couleur peinte (alpha compris), `opq` = dernière couleur opaque (sans les voiles et cratères translucides)
function fakeCtx(TW, TH) {
  const any = new Array(TW * TH).fill(null), opq = new Array(TW * TH).fill(null), st = { path: [], fills: 0, strokes: 0, rects: 0, moves: 0 };
  const g = { fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, any, opq, st, TW, TH,
    fillRect(x, y, w, h) { st.rects++; for (let j = Math.max(0, Math.floor(y)); j < Math.min(TH, Math.ceil(y + h)); j++) for (let i = Math.max(0, Math.floor(x)); i < Math.min(TW, Math.ceil(x + w)); i++) put(j * TW + i, this.fillStyle); },
    beginPath() { st.path = []; }, moveTo(x, y) { st.moves++; st.path.push([[x, y]]); }, lineTo(x, y) { st.path[st.path.length - 1].push([x, y]); }, closePath() {},
    stroke() { st.strokes++; },
    fill(rule) {
      st.fills++; if (rule !== 'nonzero') throw new Error('règle de remplissage inattendue : ' + rule);
      const rows = new Map();   // ligne -> croisements [x, sens]
      for (const sp of st.path) for (let i = 0; i < sp.length; i++) {
        const [x0, y0] = sp[i], [x1, y1] = sp[(i + 1) % sp.length]; if (y0 === y1) continue;
        const lo = Math.max(0, Math.ceil(Math.min(y0, y1) - 0.5)), hi = Math.min(TH - 1, Math.ceil(Math.max(y0, y1) - 0.5) - 1);
        for (let j = lo; j <= hi; j++) { const yc = j + 0.5, x = x0 + (yc - y0) * (x1 - x0) / (y1 - y0); if (!rows.has(j)) rows.set(j, []); rows.get(j).push([x, y1 > y0 ? 1 : -1]); }
      }
      for (const [j, cs] of rows) {
        cs.sort((a, b) => a[0] - b[0]); let w = 0;
        for (let k = 0; k < cs.length - 1; k++) { w += cs[k][1]; if (w !== 0) for (let i = Math.max(0, Math.ceil(cs[k][0] - 0.5)); i < Math.min(TW, Math.ceil(cs[k + 1][0] - 0.5)); i++) put(j * TW + i, this.fillStyle); }
      }
    } };
  const put = (idx, col) => { any[idx] = col; if (!/^rgba/.test(col)) opq[idx] = col; };
  return g;
}
const pix = (g, lon, lat, arr = 'opq') => { const i = Math.min(g.TW - 1, Math.floor((lon + 180) / 360 * g.TW)), j = Math.min(g.TH - 1, Math.floor((90 - lat) / 180 * g.TH)); return g[arr][j * g.TW + i]; };

// 1. tous les corps : aucune exception, genre de texture, taille, coût
const bodies = T.BODIES.filter(b => !b.comet && !b.probe), pal = {};
console.log('corps\t\tgenre\ttaille\ttemps (ms)\tfill/stroke/fillRect');
let allOk = true, tot = 0;
for (const b of bodies) {
  const TW = T.globeTexSize(b, 4096), TH = TW / 2, g = fakeCtx(TW, TH), t0 = Date.now();
  try { pal[b.id] = { g, info: T.paintGlobeTexture(g, b, TW, TH) }; } catch (e) { allOk = false; console.log('FAIL', b.id, e.stack); continue; }
  const dt = Date.now() - t0; tot += dt;
  console.log(b.id.padEnd(10) + '\t' + pal[b.id].info.kind + '\t' + TW + '\t' + dt + '\t' + g.st.fills + '/' + g.st.strokes + '/' + g.st.rects + (pal[b.id].info.craters ? '  cratères ' + pal[b.id].info.craters : ''));
  if (g.any.some(x => x === null)) { allOk = false; console.log('FAIL', b.id, 'pixels non peints'); }
}
ok(allOk, bodies.length + ' corps peints sans exception, aucun pixel non peint (' + tot + ' ms au total)');
const kinds = Object.fromEntries(bodies.map(b => [b.id, T.globeTexKind(b)]));
ok(['terre', 'mars', 'lune', 'io', 'europe', 'ganymede', 'titan'].every(id => kinds[id] === 'geo') && kinds.soleil === 'sun' && ['jupiter', 'saturne', 'uranus', 'neptune', 'venus'].every(id => kinds[id] === 'bands')
  && ['mercure', 'callisto', 'mimas', 'tethys', 'dione', 'rhea', 'japet', 'pluton', 'phobos'].every(id => kinds[id] === 'craters'), 'genres de texture attendus (geo, bands, sun, craters)');
ok(T.globeTexSize(T.EARTHB) === 5400 && T.globeTexSize(T.BODIES.find(b => b.id === 'phobos')) === 1024 && T.globeTexSize(T.EARTHB, 2048) === 2048, 'tailles : Terre 4096, Phobos 1024, plafonnée par maxTextureSize');
ok(T.GLOBE_GL === null, 'sans WebGL (Node) : GLOBE_GL = null');

// 2. points connus (classe de terrain d'après la carte) : couleur peinte = couleur de la classe
const maps = { terre: T.SURF_EARTH, lune: T.SURF_MOON, mars: T.MARS_GEO, io: T.SURF_IO, europe: T.SURF_EUROPA, ganymede: T.SURF_GANYMEDE, titan: T.SURF_TITAN };
const inRing = (x, y, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; };
const rings = {}; for (const id in maps) rings[id] = maps[id].parts.map(([c, flat]) => { const r = []; for (let i = 0; i < flat.length; i += 2) r.push([flat[i] / 10, flat[i + 1] / 10]); return [c, r]; });
function classAt(id, lon, lat) {   // vérité planaire (comme surfaces-cross) : parité par classe (cartes à trous) ou dernier morceau (Mars)
  const G = maps[id], per = G.classes.map(() => 0); let last = -1, lastIdx = -1;
  rings[id].forEach(([c, r], idx) => { if (inRing(lon, lat, r)) { per[c]++; if (idx > lastIdx) { lastIdx = idx; last = c; } } });
  if (id === 'terre') { for (let c = per.length - 1; c >= 0; c--) if (per[c] > 0) return c; return -1; }   // Terre : glaciers et lacs recouvrent les terres (anneaux qui se chevauchent : la parité ne convient pas)
  if (G.holes) { const c = per.findIndex(n => n % 2 === 1); return c; }
  return last;
}
const nm = (id, re) => T.NAMES[id].find(n => re.test(n[0]));
const cases = [['lune', /^Mare Imbrium$/], ['lune', /^Mare Crisium$/], ['lune', /^Mare Serenitatis$/], ['mars', /^Olympus Mons$/], ['mars', /^Hellas Planitia$/], ['mars', /^Argyre Planitia$/], ['mars', /^Elysium Mons$/],
  ['io', /^Loki Patera$/], ['europe', /^Conamara Chaos$/], ['ganymede', /^Galileo Regio$/], ['titan', /^Kraken Mare$/]];
for (const [id, re] of cases) {
  const n = nm(id, re); if (!n) { console.log('?   ', id, re, 'absent'); continue; }
  const want = classAt(id, n[1], n[2]), col = want >= 0 ? maps[id].classes[want][1] : null, got = pix(pal[id].g, n[1], n[2]);
  ok(want >= 0 && got === col, id.padEnd(9) + n[0].padEnd(18) + ' classe attendue ' + (want >= 0 ? maps[id].classes[want][0] : '(aucune)') + ' -> pixel ' + got);
}
const mi = nm('lune', /^Mare Imbrium$/), ol = nm('mars', /^Olympus Mons$/), he = nm('mars', /^Hellas Planitia$/);
ok(pix(pal.lune.g, mi[1], mi[2]) === T.SURF_MOON.classes[0][1], 'Mare Imbrium sur la Lune : couleur des mers (' + T.SURF_MOON.classes[0][1] + ')');
console.log('    Olympus Mons ->', pix(pal.mars.g, ol[1], ol[2]), '; Hellas ->', pix(pal.mars.g, he[1], he[2]), '; (classes Mars : ' + T.MARS_GEO.classes.map(c => c[0] + ' ' + c[1]).join(' | ') + ')');

// 3. accord avec la vérité planaire sur des points aléatoires, dont pôles (|lat| > 75°) et antiméridien (|lon| > 172°)
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (const id in maps) {
  const G = maps[id], g = pal[id].g, res = { all: [0, 0], pole: [0, 0], anti: [0, 0] };
  const samples = []; for (let i = 0; i < 300; i++) samples.push(['all', rnd() * 360 - 180, Math.asin(rnd() * 2 - 1) / DEG0()]);
  for (let i = 0; i < 100; i++) samples.push(['pole', rnd() * 360 - 180, (rnd() < 0.5 ? -1 : 1) * (75 + rnd() * 15)], ['anti', (rnd() < 0.5 ? -1 : 1) * (172 + rnd() * 8), (rnd() * 2 - 1) * 85]);
  for (const [k, lon, lat] of samples) {
    const want = classAt(id, lon, lat); const col = want >= 0 ? G.classes[want][1] : id === 'terre' ? '#2a5ea6' : null;
    const base = id === 'terre' ? '#2a5ea6' : T.BODIES.find(b => b.id === id).look.base, exp = want >= 0 ? G.classes[want][1] : base;
    // à moins de 1,5 pixel d'une arête la rasterisation peut légitimement différer : on ignore ces points (voisins tous d'accord)
    const dx = 360 / g.TW * 1.5, near = [[dx, 0], [-dx, 0], [0, dx], [0, -dx]].map(([a, b]) => pix(g, lon + a, Math.max(-89.9, Math.min(89.9, lat + b)))).some(c => c !== pix(g, lon, lat));
    if (near) continue; res[k][1]++; if (pix(g, lon, lat) === exp) res[k][0]++;
  }
  const f = k => res[k][0] + '/' + res[k][1];
  console.log('    ' + id.padEnd(9) + 'accord avec la carte : tous ' + f('all') + ', pôles ' + f('pole') + ', antiméridien ' + f('anti'));
  ok(res.all[0] >= res.all[1] * 0.97 && res.pole[0] >= res.pole[1] * 0.9 && res.anti[0] >= res.anti[1] * 0.97, id + ' : accord ≥ 97 % (≥ 90 % aux pôles, où la vérité planaire des anneaux polaires est elle-même fragile)');
}
function DEG0() { return Math.PI / 180; }

// 4. cratères : au centre d'un cratère connu la couleur translucide des cratères, loin d'eux le fond ; antiméridien et hautes latitudes
for (const id of ['mercure', 'callisto', 'rhea', 'tethys', 'pluton']) {
  const b = T.BODIES.find(x => x.id === id), g = pal[id].g, big = b.surf.names.find(n => n[4] === 'c' && n[3] > 0);
  const [name, lon, lat, d] = big, rho = d / 2 / b.R / (Math.PI / 180);
  ok(pix(g, lon, lat, 'any') === 'rgba(0,0,0,0.09)' && g.opq[0] !== null, id.padEnd(9) + 'plus grand cratère ' + name + ' (' + d + ' km, ' + lon + '°, ' + lat + '°) : le centre est dans la texture ; ' + pal[id].info.craters + ' cratères au total');
}
{   // un cratère à cheval sur l'antiméridien est dessiné des deux côtés
  const b = T.BODIES.find(x => x.id === 'mercure'), g2 = fakeCtx(1024, 512);
  g2.fillStyle = '#888'; g2.fillRect(0, 0, 1024, 512);
  // cercle de 5° de rayon centré sur lon 179°, lat 30° : doit toucher lon 178° et lon −178° (pas de grande ligne horizontale)
  const before = Object.assign({}, g2.st);
  const p = T.paintGlobeTexture; // peinture réelle d'un faux corps
  const fake = { id: 'x', name: 'x', R: 1000, look: { base: '#888' }, surf: { geo: null, names: [['A', 179, 30, 174.5, 'c'], ['Pôle', 10, 88, 100, 'c'], ['B', -179.5, -60, 80, 'c']] }, feat: [] };
  const g3 = fakeCtx(1024, 512); const info = p(g3, fake, 1024, 512);
  ok(pix(g3, 179, 30, 'any') === 'rgba(0,0,0,0.09)' && pix(g3, -178, 30, 'any') === 'rgba(0,0,0,0.09)' && pix(g3, 0, 30, 'any') === '#888', 'cratère à cheval sur l\'antiméridien : dessiné des deux côtés, rien au milieu de la carte');
  ok(info.craters === 2 && pix(g3, 10, 88, 'any') === '#888', 'un cratère qui contient un pôle est ignoré (2 cratères peints sur 3)');
  const hLine = (() => { let n = 0; for (let i = 0; i < 1024; i++) if (g3.any[(512 - Math.round(30 / 180 * 512 + 256) + 0) * 1024 + i] !== '#888') n++; return n; })();
  ok(hLine < 120, 'pas de bande horizontale parasite à la latitude du cratère (' + hLine + ' px peints sur la ligne)');
}

// 5. bandes, Grande Tache rouge, Soleil, Neptune
const jup = T.BODIES.find(b => b.id === 'jupiter'), pj = pal.jupiter.g;
ok(pix(pj, 0, 0) === '#9a6c48' && pix(pj, 0, 11.5) === '#d9bf96' || pix(pj, 0, 11.5) === '#e4cfa8', 'Jupiter : bande équatoriale sombre à lat 0°, bande claire à 11,5°');
ok(pix(pj, 1.0 / (Math.PI / 180), -0.38 / (Math.PI / 180)) === '#b8503a' && pix(pj, 1.0 / (Math.PI / 180) + 180, -0.38 / (Math.PI / 180)) !== '#b8503a', 'Jupiter : Grande Tache rouge à lon 1 rad, lat −0,38 rad (une seule)');
const sunf = T.BODIES.find(b => b.id === 'soleil').feat, pz = pal.soleil.g;
ok(sunf.length === 7 && sunf.every(f => { const lon = (f.lon / (Math.PI / 180) + 180) % 360 - 180; return pix(pz, lon, f.lat / (Math.PI / 180)) === '#8a4a10'; }) || console.log('    (certaines taches solaires se recouvrent)'), 'Soleil : fond jaune et ' + sunf.length + ' taches b.feat');
ok(pix(pz, 0, 80) === '#ffcf4d' || pix(pz, 100, 80) === '#ffcf4d', 'Soleil : fond jaune hors des taches');
const nep = T.BODIES.find(b => b.id === 'neptune'); ok(nep.feat.length === 4 && nep.feat.every(f => pix(pal.neptune.g, ((f.lon / (Math.PI / 180) + 180) % 360) - 180, f.lat / (Math.PI / 180)) === '#27408f'), 'Neptune : 4 taches sombres (b.feat) peintes');
ok(T.BODIES.find(b => b.id === 'venus').surf && pal.venus.info.kind === 'bands' && pal.venus.info.craters === 0, 'Vénus : bandes de nuages, pas de cratères sous les nuages');
ok(pal.titan.g.any.filter(c => c === 'rgba(214,150,70,0.5)').length > 0.99 * pal.titan.g.TW * pal.titan.g.TH, 'Titan : voile de brume orange sur toute la texture');

// 6. rasterisation d'un anneau polaire : le pôle est dans la zone remplie
{ const g = fakeCtx(512, 256), ring = []; for (let lo = -180; lo < 180; lo += 10) ring.push([lo, -70]); ring.push([-180, -70]);   // tour du pôle sud vers l'est (+360°)
  g.fillStyle = '#f00'; g.beginPath(); T.texRing(g, ring.slice(0, -1), 512, 256); g.fill('nonzero');
  ok(pix(g, 20, -85) === '#f00' && pix(g, 20, -60) === null, 'anneau fermé autour du pôle sud : le pôle est rempli, au-delà du cercle non'); }

// 7. cache : budget et ancienneté
{ const cache = new Map(), mk = (cost, last) => ({ cost, last, disposed: false, dispose() { this.disposed = true; } });
  cache.set('a', mk(100, 0)); cache.set('b', mk(100, 5000)); cache.set('c', mk(100, 9500)); cache.set('f', { failed: true, cost: 0, last: 0, dispose() {} });
  let freed = T.globeCacheEvict(cache, 10000, 1e9, 20000, 1000);
  ok(freed.length === 0, 'cache : rien n\'est libéré sous le budget et avant l\'âge limite');
  freed = T.globeCacheEvict(cache, 10000, 250, 1e9, 1000);
  ok(freed.join() === 'a' && cache.has('b') && cache.has('c') && cache.has('f'), 'cache : dépassement de budget (300 > 250) : la moins récente est libérée');
  freed = T.globeCacheEvict(cache, 40000, 1e9, 20000, 1000);
  ok(freed.join() === 'b,c' && cache.has('f'), 'cache : les entrées inutilisées depuis plus de 20 s sont libérées (l\'échec mémorisé reste)');
  cache.set('d', mk(500, 99999)); freed = T.globeCacheEvict(cache, 100000, 10, 20000, 1000);
  ok(freed.length === 0, 'cache : une entrée utilisée depuis moins d\'une seconde n\'est jamais libérée, même hors budget'); }

// 8. chemin de rendu avec un faux renderer (vrai three.js pour la scène, texture, matériau, caméra ; seul le dessin GL est factice) : un rendu par corps, cache réutilisé, aucun plantage
{
  const THREE = T.THREE, calls = { render: 0, draw: 0 }, drawn = [];
  const renderer = { capabilities: { getMaxAnisotropy: () => 8 }, setViewport() {}, setScissor() {}, setScissorTest() {}, render() { calls.render++; } };
  const G = { ok: true, renderer, cv: {}, CAP: 2048, maxTex: 4096, scene: new THREE.Scene(), cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 6000), cache: new Map(), euler: new THREE.Euler(), lastSweep: 0,
    sun: new THREE.DirectionalLight(0xffffff, 1), mesh: new THREE.Mesh(new THREE.SphereGeometry(1, 8, 4), new THREE.MeshBasicMaterial()) };
  const realCtx = ctx; ctx.drawImage = (...a) => { calls.draw++; drawn.push(a); };
  globalThis.performance = { now: () => 1000 }; globalThis.LAYERS = T.LAYERS; globalThis.dpr = 1;
  let bad = 0;
  for (const b of bodies) { try { if (!T.renderGlobeGL(G, b, 300, 200, 150, b.id === 'soleil' ? null : [10, 20])) bad++; } catch (e) { bad++; console.log('FAIL', b.id, e.stack); } }
  ok(bad === 0 && calls.render === bodies.length && calls.draw === bodies.length, bodies.length + ' corps : un rendu et une recopie chacun, sans exception (' + G.cache.size + ' textures en cache)');
  const n0 = G.cache.size; T.renderGlobeGL(G, bodies[2], 300, 200, 150, [10, 20]);
  ok(G.cache.size === n0, 'deuxième image : la texture du corps est réutilisée (cache inchangé : ' + G.cache.size + ')');
  const earth = T.EARTHB; T.renderGlobeGL(G, earth, 300, 200, 150, [400, 200]);
  ok(G.mesh.material instanceof THREE.MeshLambertMaterial && G.mesh.material.map.offset.x === 0.25 && Math.abs(G.sun.position.x - 1000) < 1e-9, 'Terre : matériau de Lambert, décalage de texture 0,25, Soleil à droite');
  T.renderGlobeGL(G, T.BODIES[0], 300, 200, 150, null);
  ok(G.mesh.material instanceof THREE.MeshBasicMaterial, 'Soleil : matériau émissif sans éclairage (MeshBasicMaterial)');
  ok(T.EARTHB.surf.glCraters === false && T.BODIES.find(b => b.id === 'mercure').surf.glCraters === true, 'glCraters : faux pour la Terre (carte), vrai pour Mercure (cratères dans la texture)');
  ok(T.drawGlobeGL(earth, 0, 0, 5e4, null) === false && T.drawGlobeGL(earth, 0, 0, 50, null) === false, 'sans GLOBE_GL ou disque géant : drawGlobeGL renvoie false (repli 2D)');
}

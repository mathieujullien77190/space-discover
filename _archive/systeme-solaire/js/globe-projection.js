// Projection orthographique des contours sur un globe (utilisée par toutes les surfaces : js/surfaces.js). Port du `landPath` du composant Globe3D du projet manu :
// les anneaux sont coupés exactement au bord du globe quand ils passent derrière, et rejoints par des arcs du bord, dans le bon sens.
const toRad = d => d * Math.PI / 180;
const wrapLon = lon => ((((lon + 180) % 360) + 360) % 360) - 180;
// où est un point (lon, lat en degrés) quand le globe est tourné pour montrer (lat0, lon0) au centre (radians) : sphère unité
function viewPt(lon, lat, lat0, lon0) {
  const la = toRad(lat), dl = toRad(lon) - lon0;
  return { x: Math.cos(la) * Math.sin(dl), y: Math.cos(lat0) * Math.sin(la) - Math.sin(lat0) * Math.cos(la) * Math.cos(dl), z: Math.sin(lat0) * Math.sin(la) + Math.cos(lat0) * Math.cos(la) * Math.cos(dl) };
}
const onLimb = (x, y) => { const l = Math.max(Math.hypot(x, y), 1e-12); return { x: x / l, y: y / l }; };
// où le segment entre un point visible et un point caché croise le bord du globe
function limbCrossing(from, to) { const t = from.z / (from.z - to.z); return onLimb(from.x + t * (to.x - from.x), from.y + t * (to.y - from.y)); }
const angleOf = p => Math.atan2(p.y, p.x);
const TURN = 2 * Math.PI;
const turnBetween = (from, to) => (((to - from) % TURN) + TURN) % TURN;
// vrai si l'anneau tourne dans le sens anti-horaire (les longitudes sont suivies sans saut, un anneau qui franchit la ligne de date n'est pas pris pour un tour du monde)
function isCounterClockwise(ring) {
  let lon = ring[0][0];
  const xs = ring.map((p, i) => { if (i > 0) lon += wrapLon(p[0] - ring[i - 1][0]); return lon; });
  let area = 0;
  for (let i = 0; i < ring.length; i++) { const n = (i + 1) % ring.length; area += xs[i] * ring[n][1] - xs[n] * ring[i][1]; }
  return area > 0;
}
// Les terres projetées. Un anneau est coupé exactement au bord quand il passe derrière le globe : il reste des morceaux de côte,
// reliés par des arcs du bord, dans le sens qui garde la terre du même côté (un continent coupé par l'horizon se remplit
// jusqu'au bord, pas le long d'une corde, et pas la mer à la place). Retourne des commandes : ['M',x,y] ['L',x,y]
// ['A',x,y,anti,tour,a0,a1] (arc du bord vers (x,y)) ['Z'].
function landCommands(rings, latDeg, lonDeg, cx, cy, radius) {
  const lat0 = toRad(latDeg), lon0 = toRad(lonDeg), cmds = [];
  const at = p => [cx + p.x * radius, cy - p.y * radius];
  for (const ring of rings) {
    const views = ring.map(p => viewPt(p[0], p[1], lat0, lon0));
    if (!views.some(v => v.z >= 0)) continue;
    const count = views.length;
    const hidden = views.findIndex((v, i) => v.z < 0 && views[(i + 1) % count].z >= 0);
    if (hidden === -1) { views.forEach((v, i) => cmds.push([i === 0 ? 'M' : 'L', ...at(v)])); cmds.push(['Z']); continue; }
    const walk = [...views.slice(hidden + 1), ...views.slice(0, hidden + 1)];
    const stretches = []; let entry = { x: 0, y: 0 }, coast = [];
    walk.forEach((v, i) => {
      const prev = walk[(i + count - 1) % count];
      if (v.z >= 0) { if (prev.z < 0) { entry = limbCrossing(v, prev); coast = []; } coast.push(v); }
      else if (prev.z >= 0) { const exit = limbCrossing(prev, v); stretches.push({ entry, exit, coast: [...coast, exit] }); }
    });
    const ccw = ring.ccw !== undefined ? ring.ccw : isCounterClockwise(ring), used = new Set();   // ring.ccw : orientation fournie (anneaux de surface, coupés au pôle) ; sinon calculée en suivant les longitudes
    stretches.forEach((_, first) => {
      if (used.has(first)) return;
      used.add(first);
      cmds.push(['M', ...at(stretches[first].entry)]);
      stretches[first].coast.forEach(p => cmds.push(['L', ...at(p)]));
      let current = first;
      for (;;) {
        const left = angleOf(stretches[current].exit);
        let next = null;
        stretches.forEach((st, index) => {
          if (used.has(index) && index !== first) return;
          const turn = ccw ? turnBetween(left, angleOf(st.entry)) : turnBetween(angleOf(st.entry), left);
          if (next === null || turn < next.turn) next = { index, turn };
        });
        // l'écran a l'axe y vers le bas : l'angle d'écran est l'opposé de l'angle de la sphère
        cmds.push(['A', ...at(stretches[next.index].entry), ccw, next.turn, -left, -angleOf(stretches[next.index].entry)]);
        if (next.index === first) break;
        used.add(next.index);
        stretches[next.index].coast.forEach(p => cmds.push(['L', ...at(p)]));
        current = next.index;
      }
      cmds.push(['Z']);
    });
  }
  return cmds;
}
function landPath2D(cmds, cx, cy, radius) {
  const p = new Path2D();
  for (const c of cmds) {
    if (c[0] === 'M') p.moveTo(c[1], c[2]); else if (c[0] === 'L') p.lineTo(c[1], c[2]);
    else if (c[0] === 'A') p.arc(cx, cy, radius, c[5], c[6], c[3]); else p.closePath();
  }
  return p;
}

// ---------- projection vérifiée ----------
// La fermeture des anneaux qui coupent l'horizon peut, dans de rares vues (côtes très découpées qui frôlent le bord), partir du mauvais côté et remplir le disque entier : le globe
// « clignote ». On vérifie donc chaque anneau : le remplissage projeté doit coïncider avec la géométrie en 9 points du disque ; sinon on essaie le sens inverse, sinon on l'écarte
// pour cette image (un morceau manquant vaut mieux qu'un disque rempli).
function windingAt(px, py, poly) {
  let w = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j], b = poly[i];
    if (a[1] <= py) { if (b[1] > py && (b[0] - a[0]) * (py - a[1]) - (px - a[0]) * (b[1] - a[1]) > 0) w++; }
    else if (b[1] <= py && (b[0] - a[0]) * (py - a[1]) - (px - a[0]) * (b[1] - a[1]) < 0) w--;
  }
  return w;
}
function cmdsWinding(px, py, cmds, cx, cy, radius) {   // enroulement du chemin projeté en (px, py) (les arcs du bord sont échantillonnés)
  let w = 0, cur = null;
  const flush = () => { if (cur && cur.length > 2) w += windingAt(px, py, cur); };
  for (const c of cmds) {
    if (c[0] === 'M') { flush(); cur = [[c[1], c[2]]]; }
    else if (c[0] === 'L') cur.push([c[1], c[2]]);
    else if (c[0] === 'A') {
      const a0 = c[5], a1 = c[6], T = Math.PI * 2, d = c[3] ? -(((a0 - a1) % T + T) % T) : ((a1 - a0) % T + T) % T;
      for (let i = 1; i <= 16; i++) { const a = a0 + d * i / 16; cur.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]); }
      cur.push([c[1], c[2]]);
    }
  }
  flush(); return w;
}
const GLOBE_TESTS = [[0, 0], [0.5, 0.3], [-0.4, -0.5], [0.55, -0.45], [-0.5, 0.4], [0, 0.7], [0, -0.7], [0.75, 0], [-0.75, 0]];
function safeLandCommands(ring, latDeg, lonDeg, cx, cy, radius) {
  const cmds = landCommands([ring], latDeg, lonDeg, cx, cy, radius);
  if (!cmds.length || ring.noCheck) return cmds;
  const l0 = toRad(latDeg), truth = GLOBE_TESTS.map(([x, y]) => {
    const z = Math.sqrt(1 - x * x - y * y), lat = Math.asin(y * Math.cos(l0) + z * Math.sin(l0)) / (Math.PI / 180), lon = lonDeg + Math.atan2(x, z * Math.cos(l0) - y * Math.sin(l0)) / (Math.PI / 180);
    return windingAt(wrapLon(lon), lat, ring) !== 0;
  });
  const bad = c => GLOBE_TESTS.reduce((n, [x, y], i) => n + ((cmdsWinding(cx + x * radius, cy - y * radius, c, cx, cy, radius) !== 0) !== truth[i] ? 1 : 0), 0) >= 2;
  if (!bad(cmds)) return cmds;
  const was = ring.ccw; ring.ccw = !was; const flipped = landCommands([ring], latDeg, lonDeg, cx, cy, radius); ring.ccw = was;
  return bad(flipped) ? visibleRuns(ring, latDeg, lonDeg, cx, cy, radius) : flipped;
}
// tracé de secours : seulement les séries de sommets visibles, chacune fermée par une corde (l'erreur reste près du bord du disque, qui est assombri)
function visibleRuns(ring, latDeg, lonDeg, cx, cy, radius) {
  const lat0 = toRad(latDeg), lon0 = toRad(lonDeg), cmds = [], n = ring.length;
  const v = ring.map(p => viewPt(p[0], p[1], lat0, lon0)), start = v.findIndex(q => q.z < 0);
  if (start < 0) return v.map((q, i) => [i === 0 ? 'M' : 'L', cx + q.x * radius, cy - q.y * radius]).concat([['Z']]);
  let run = [];
  const flush = () => { if (run.length > 2) { run.forEach((q, i) => cmds.push([i === 0 ? 'M' : 'L', cx + q.x * radius, cy - q.y * radius])); cmds.push(['Z']); } run = []; };
  for (let k = 1; k <= n; k++) { const q = v[(start + k) % n]; if (q.z >= 0) run.push(q); else flush(); }
  flush(); return cmds;
}

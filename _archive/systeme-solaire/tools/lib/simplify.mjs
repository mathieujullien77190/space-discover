// Simplification de contours en longitude/latitude (degrés) pour un globe : Douglas-Peucker corrigé de la latitude, aire, empaquetage.
const P2 = p => [p[0] * Math.cos(p[1] * Math.PI / 180), p[1]];   // le degré de longitude rétrécit vers les pôles

export function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const q = pts.map(P2), keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let dmax = 0, im = -1;
    const [ax, ay] = q[a], [bx, by] = q[b], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-12;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((q[i][0] - ax) * dy - (q[i][1] - ay) * dx) / L; if (d > dmax) { dmax = d; im = i; } }
    if (dmax > tol && im > 0) { keep[im] = 1; stack.push([a, im], [im, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

// aire (deg², corrigée de la latitude) d'un anneau
export function area(pts) {
  const q = pts.map(P2); let s = 0;
  for (let i = 0; i < q.length; i++) { const j = (i + 1) % q.length; s += q[i][0] * q[j][1] - q[j][0] * q[i][1]; }
  return Math.abs(s) / 2;
}

// l'anneau (points entiers, dixièmes de degré) se coupe-t-il lui-même ? (croisement strict de deux arêtes non adjacentes)
export function selfIntersects(r) {
  const n = r.length, o = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  for (let i = 0; i < n; i++) {
    const a = r[i], b = r[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;   // arêtes adjacentes (anneau fermé)
      const c = r[j], d = r[(j + 1) % n];
      if (Math.max(a[0], b[0]) < Math.min(c[0], d[0]) || Math.max(c[0], d[0]) < Math.min(a[0], b[0]) || Math.max(a[1], b[1]) < Math.min(c[1], d[1]) || Math.max(c[1], d[1]) < Math.min(a[1], b[1])) continue;
      if (o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0) return true;
    }
  }
  return false;
}

// densifie les arêtes longues : à l'écran une arête est une corde ; on la découpe (un point tous les 4° au plus) pour qu'elle suive le parallèle
function densify(clean) {
  const dense = [];
  for (let i = 0; i < clean.length; i++) {
    const p = clean[i], q = clean[(i + 1) % clean.length]; dense.push(p);
    const span = Math.max(Math.abs(q[0] - p[0]) / 10 * Math.cos((p[1] + q[1]) / 20 * Math.PI / 180), Math.abs(q[1] - p[1]) / 10), n = Math.ceil(span / 4);
    for (let k = 1; k < n; k++) dense.push([Math.round(p[0] + (q[0] - p[0]) * k / n), Math.round(p[1] + (q[1] - p[1]) * k / n)]);
  }
  return dense;
}

// croisements stricts d'un anneau (points entiers) par balayage en x : jusqu'à `max` paires [i, j] (arêtes i -> i+1 et j -> j+1)
function crossingPairs(r, max = 64) {
  const n = r.length, segs = [], ori = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])), out = [];
  for (let i = 0; i < n; i++) { const p = r[i], q = r[(i + 1) % n]; segs.push([Math.min(p[0], q[0]), Math.max(p[0], q[0]), i, p, q]); }
  segs.sort((u, v) => u[0] - v[0]);
  let active = [];
  for (const sg of segs) {
    active = active.filter(t => t[1] >= sg[0]);
    for (const t of active) {
      const d = Math.abs(t[2] - sg[2]); if (d <= 1 || d === n - 1) continue;   // arêtes adjacentes
      if (ori(sg[3], sg[4], t[3]) * ori(sg[3], sg[4], t[4]) < 0 && ori(t[3], t[4], sg[3]) * ori(t[3], t[4], sg[4]) < 0) { out.push([sg[2], t[2]]); if (out.length >= max) return out; }
    }
    active.push(sg);
  }
  return out;
}

// Douglas-Peucker qui conserve la topologie : DP ne garantit pas que l'anneau simplifié ne se croise pas (de grands anneaux détaillés en créent), et un anneau qui se
// croise est mal rempli. Tant qu'il se croise, on remet les points d'origine les plus écartés des deux arêtes qui se coupent (la source, elle, ne se croise pas).
// Retourne les indices conservés (triés) ou null si les croisements persistent.
function simplifyTopo(ring, tol) {
  const n = ring.length, P = ring.map(P2), q = ring.map(p => [Math.round(p[0] * 10), Math.round(p[1] * 10)]), keep = new Uint8Array(n);
  keep[0] = 1; keep[n - 1] = 1;
  const stack = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let dmax = 0, im = -1;
    const [ax, ay] = P[a], dx = P[b][0] - ax, dy = P[b][1] - ay, L = Math.hypot(dx, dy) || 1e-12;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((P[i][0] - ax) * dy - (P[i][1] - ay) * dx) / L; if (d > dmax) { dmax = d; im = i; } }
    if (dmax > tol && im > 0) { keep[im] = 1; stack.push([a, im], [im, b]); }
  }
  const farthest = (i0, i1) => {   // indice (modulo n) strictement entre i0 et i1 le plus écarté de la corde, ou -1
    const [ax, ay] = P[i0], dx = P[i1 % n][0] - ax, dy = P[i1 % n][1] - ay, L = Math.hypot(dx, dy) || 1e-12; let best = -1, dm = -1;
    for (let k = i0 + 1; k < i1; k++) { const m = k % n; if (keep[m]) continue; const d = Math.abs((P[m][0] - ax) * dy - (P[m][1] - ay) * dx) / L; if (d > dm) { dm = d; best = m; } }
    return best;
  };
  for (let it = 0; it < 60; it++) {
    const idx = []; for (let i = 0; i < n; i++) if (keep[i]) idx.push(i);
    const pairs = crossingPairs(idx.map(i => q[i])); if (!pairs.length) return idx;
    let added = 0;
    for (const pr of pairs) for (const sPos of pr) {
      const i0 = idx[sPos], i1 = sPos + 1 < idx.length ? idx[sPos + 1] : idx[0] + n, m = farthest(i0, i1);
      if (m >= 0) { keep[m] = 1; added++; }
    }
    if (!added) return null;
  }
  return null;
}

// anneau (degrés) -> anneau simplifié en dixièmes de degré entiers, sans doublons ; null si trop petit.
// La simplification conserve la topologie (voir simplifyTopo) ; si malgré tout des croisements persistent on garde l'anneau d'origine (non simplifié).
// stats.crossed compte les anneaux dont la simplification a dû être affinée, stats.dropped les anneaux abandonnés.
export function pack(ring, tol, minArea, stats = {}) {
  if (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) ring = ring.slice(0, -1);   // anneau fermé : on retire le doublon
  const a = area(ring); if (a < minArea) return null;
  let idx = simplifyTopo(ring, tol);
  if (!idx) { stats.crossed = (stats.crossed || 0) + 1; idx = ring.map((_, i) => i); }   // simplification impossible sans croisement : on garde tout
  const s = idx.map(i => [Math.round(ring[i][0] * 10), Math.round(ring[i][1] * 10)]);
  const clean = s.filter((p, i) => i === 0 || p[0] !== s[i - 1][0] || p[1] !== s[i - 1][1]);
  if (clean.length < 4) return null;
  return { a, r: densify(clean) };
}

// fichier JS embarquable : const <name> = { classes: [[nom, couleur]…], parts: [[classe, [lon0, lat0, lon1, lat1…]]…] } trié du plus grand au plus petit
export function toJs(name, header, classes, parts, holes) {
  parts.sort((p, q) => q.a - p.a);
  return `${header}\n// classes : [nom, couleur] ; parts : [indice de classe, [lon0, lat0, lon1, lat1, …] en dixièmes de degré (lon est)], du plus grand au plus petit.\nconst ${name} = { classes: ${JSON.stringify(classes)}, parts: ${JSON.stringify(parts.map(p => [p.c, p.r.flat()]))}${holes ? ", holes: true" : ""} };\n`;
}

// orientation : la projection (comme d3) lit le sens des anneaux. Certains fichiers ont des anneaux inversés ou une autre convention (GeoJSON : extérieur antihoraire) :
// on impose, pour chaque polygone (liste d'anneaux), extérieur = horaire, trou = antihoraire (convention Esri), selon la profondeur d'imbrication de l'anneau parmi les autres.
// Retourne { rings, flipped }. Les anneaux sont des listes de [x, y] (lon, lat).
function insideRing(pt, ring) { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) if ((ring[i][1] > pt[1]) !== (ring[j][1] > pt[1]) && pt[0] < (ring[j][0] - ring[i][0]) * (pt[1] - ring[i][1]) / (ring[j][1] - ring[i][1]) + ring[i][0]) c = !c; return c; }
function signedClockwise(r) { let s = 0; for (let i = 0; i < r.length; i++) { const j = (i + 1) % r.length; s += r[i][0] * r[j][1] - r[j][0] * r[i][1]; } return s < 0; }
export function normalizeRings(rings) {
  const box = rings.map(r => { let a = 1e99, b = -1e99, c = 1e99, d = -1e99; for (const [x, y] of r) { if (x < a) a = x; if (x > b) b = x; if (y < c) c = y; if (y > d) d = y; } return [a, b, c, d]; });   // boîtes englobantes : évitent presque tous les tests coûteux
  let flipped = 0;
  const out = rings.map((r, i) => {
    const pt = r[Math.floor(r.length / 2)]; let depth = 0;
    for (let j = 0; j < rings.length; j++) { const bx = box[j]; if (j !== i && pt[0] >= bx[0] && pt[0] <= bx[1] && pt[1] >= bx[2] && pt[1] <= bx[3] && insideRing(pt, rings[j])) depth++; }
    if (signedClockwise(r) === (depth % 2 === 0)) return r; flipped++; return r.slice().reverse();
  });
  return { rings: out, flipped };
}

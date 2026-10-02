// Lecteur minimal de shapefiles Esri (.shp + .dbf), sans dépendance : polygones (types 5, 15, 25) et points (types 1, 11, 21).
import fs from 'node:fs';

// Retourne un tableau d'objets { type, parts: [[[x, y], …], …] } (polygone : une liste d'anneaux) ou { type, x, y } (point), dans l'ordre du fichier.
export function readShp(file) {
  const b = fs.readFileSync(file), out = [];
  let o = 100;
  while (o + 8 <= b.length) {
    const len = b.readInt32BE(o + 4) * 2, c = o + 8; o = c + len;
    const type = b.readInt32LE(c);
    if (type === 0) { out.push({ type: 0, parts: [] }); continue; }
    if (type === 1 || type === 11 || type === 21) { out.push({ type, x: b.readDoubleLE(c + 4), y: b.readDoubleLE(c + 12) }); continue; }
    if (type === 5 || type === 15 || type === 25 || type === 3 || type === 13 || type === 23) {
      const nParts = b.readInt32LE(c + 36), nPts = b.readInt32LE(c + 40), pIdx = c + 44, ptIdx = pIdx + 4 * nParts, parts = [];
      for (let p = 0; p < nParts; p++) {
        const a = b.readInt32LE(pIdx + 4 * p), z = p + 1 < nParts ? b.readInt32LE(pIdx + 4 * (p + 1)) : nPts, ring = [];
        for (let i = a; i < z; i++) ring.push([b.readDoubleLE(ptIdx + 16 * i), b.readDoubleLE(ptIdx + 16 * i + 8)]);
        parts.push(ring);
      }
      out.push({ type, parts });
      continue;
    }
    throw new Error('type de forme non géré : ' + type);
  }
  return out;
}

// Retourne un tableau d'objets { champ: valeur } (chaînes nettoyées, nombres convertis).
export function readDbf(file) {
  const b = fs.readFileSync(file), n = b.readUInt32LE(4), hl = b.readUInt16LE(8), rl = b.readUInt16LE(10), fields = [];
  for (let o = 32; b[o] !== 0x0D && o < hl; o += 32) fields.push({ name: b.toString('latin1', o, o + 11).replace(/\0.*$/, ''), type: String.fromCharCode(b[o + 11]), len: b[o + 16] });
  const rows = [];
  for (let i = 0; i < n; i++) {
    let o = hl + i * rl + 1; const row = {};
    for (const f of fields) { const s = b.toString('utf8', o, o + f.len).trim(); row[f.name] = f.type === 'N' || f.type === 'F' ? (s === '' ? null : +s) : s; o += f.len; }
    rows.push(row);
  }
  return rows;
}

// anneau extérieur ? (Esri : les extérieurs sont orientés dans le sens horaire, les trous dans le sens anti-horaire)
export function isOuter(ring) { let s = 0; for (let i = 0; i < ring.length; i++) { const j = (i + 1) % ring.length; s += ring[i][0] * ring[j][1] - ring[j][0] * ring[i][1]; } return s < 0; }

// Dessin des astres : cartes équirectangulaires « dessinées » (aplats, sans photo) fabriquées par programme + projection en disque ombré pour les fiches. Utilisé par make-planets.mjs et make-body-cards.mjs.
import { createCanvas } from '@napi-rs/canvas';

export const S = 360, DEG = Math.PI / 180;
export const rng = seed => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;   // générateur à graine : les cartes sont reproductibles
const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

// ---------- projection d'une carte équirectangulaire sur un disque ombré en aplats (5 niveaux) avec contour ----------
const LEVELS = [0.42, 0.58, 0.76, 0.92, 1.05];
const LIGHT = (() => { const v = [-0.55, 0.55, 0.65], n = Math.hypot(...v); return v.map(x => x / n); })();
export const disc = (map, lon0, lat0, size = S, rim = 'rgba(0,0,0,0.55)') => {
  const mw = map.width, mh = map.height, mc = createCanvas(mw, mh), mg = mc.getContext('2d'); mg.drawImage(map, 0, 0);
  const src = mg.getImageData(0, 0, mw, mh).data, out = createCanvas(size, size), g = out.getContext('2d'), img = g.createImageData(size, size), la0 = lat0 * DEG;
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const nx = (px + 0.5) / size * 2 - 1, ny = 1 - (py + 0.5) / size * 2, r2 = nx * nx + ny * ny; if (r2 > 1) continue;
    const nz = Math.sqrt(1 - r2), lat = Math.asin(nz * Math.sin(la0) + ny * Math.cos(la0)) / DEG, lon = lon0 + Math.atan2(nx, nz * Math.cos(la0) - ny * Math.sin(la0)) / DEG;
    const u = (((lon + 180) / 360) % 1 + 1) % 1, v = Math.min(0.9999, Math.max(0, (90 - lat) / 180)), si = (Math.floor(v * mh) * mw + Math.floor(u * mw)) * 4;
    const d = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]), k = LEVELS[Math.min(4, Math.floor(d * 5))], o = (py * size + px) * 4;
    img.data[o] = Math.min(255, src[si] * k); img.data[o + 1] = Math.min(255, src[si + 1] * k); img.data[o + 2] = Math.min(255, src[si + 2] * k); img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  g.lineWidth = Math.max(2, size / 120); g.strokeStyle = rim; g.beginPath(); g.arc(size / 2, size / 2, size / 2 - g.lineWidth / 2, 0, 2 * Math.PI); g.stroke();
  return out;
};

// ---------- bruit de valeur lisse (répété en longitude) ----------
const noiseGrid = (w, h, cell, rand) => {
  const gw = Math.ceil(w / cell), gh = Math.ceil(h / cell) + 1, grid = new Float32Array(gw * gh); for (let i = 0; i < grid.length; i++) grid[i] = rand();
  return (x, y) => { const fx = x / cell, fy = y / cell, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), at = (i, j) => grid[Math.min(gh - 1, Math.max(0, j)) * gw + ((i % gw) + gw) % gw]; return (at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx) * (1 - sy) + (at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx) * sy; };
};

// ---------- bandes (planètes géantes, Vénus, Titan) : bandes horizontales de couleurs plates aux bords ondulés ----------
// opts : palette [couleurs], n (nombre de bandes), seed, warp (ondulation en px), turb (turbulence en px), cell (taille du bruit), weights (poids d'apparition par couleur)
export const bandsMap = (w, h, opts) => {
  const { palette, n = 20, seed = 1, warp = 6, turb = 8, cell = 90, weights } = opts, rand = rng(seed), noise = noiseGrid(w, h, cell, rand), noise2 = noiseGrid(w, h, cell / 3, rand);
  const cols = palette.map(hex), cuts = Array.from({ length: n - 1 }, () => rand()).sort((a, b) => a - b), pick = () => { if (!weights) return Math.floor(rand() * cols.length); let r = rand() * weights.reduce((s, x) => s + x, 0); for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return i; } return 0; };
  const bandCol = Array.from({ length: n }, pick), phase = Array.from({ length: n }, () => rand() * 6.28), c = createCanvas(w, h), g = c.getContext('2d'), img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = y / h + ((noise(x, y) - 0.5) * turb * 2 + (noise2(x, y) - 0.5) * turb * 0.7 + Math.sin(x / w * 6.283 * 3 + phase[Math.floor(y / h * n)]) * warp) / h;
    let b = 0; while (b < cuts.length && v > cuts[b]) b++;
    const col = cols[bandCol[b]], o = (y * w + x) * 4; img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0); return c;
};

// ---------- dessin sur canvas ----------
export const baseMap = (w, h, color) => { const c = createCanvas(w, h), g = c.getContext('2d'); g.fillStyle = color; g.fillRect(0, 0, w, h); return c; };
// tache elliptique (en pixels de la carte ; recopiée de part et d'autre pour la continuité en longitude)
export const spot = (c, x, y, rx, ry, fill, edge) => { const g = c.getContext('2d'); for (const dx of [-c.width, 0, c.width]) { g.beginPath(); g.ellipse(x + dx, y, rx, ry, 0, 0, 2 * Math.PI); g.fillStyle = fill; g.fill(); if (edge) { g.lineWidth = Math.max(1, rx / 14); g.strokeStyle = edge; g.stroke(); } } };
// cratères : disque sombre + bord clair ; tailles en loi de puissance (beaucoup de petits, peu de grands) ; la déformation en x compense l'étirement des pôles (cos de la latitude)
export const craters = (c, rand, count, rMin, rMax, dark, light) => {
  const w = c.width, h = c.height, g = c.getContext('2d');
  for (let i = 0; i < count; i++) {
    const y = rand() * h, lat = (0.5 - y / h) * Math.PI, sx = 1 / Math.max(0.25, Math.cos(lat)), r = rMin + (rMax - rMin) * Math.pow(rand(), 3), x = rand() * w;
    for (const dx of [-w, 0, w]) { g.beginPath(); g.ellipse(x + dx, y, r * sx, r, 0, 0, 2 * Math.PI); g.fillStyle = dark; g.fill(); if (light) { g.lineWidth = Math.max(1, r / 6); g.strokeStyle = light; g.stroke(); } }
  }
};
// lignes sinueuses (fractures, rayures) : (x0, y0) → longueur, direction moyenne et agitation
export const cracks = (c, rand, count, color, width, len = 220) => {
  const w = c.width, h = c.height, g = c.getContext('2d'); g.strokeStyle = color; g.lineCap = 'round';
  for (let i = 0; i < count; i++) { let x = rand() * w, y = rand() * h, a = rand() * Math.PI; g.lineWidth = width * (0.6 + rand() * 0.8); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < len / 12; k++) { a += (rand() - 0.5) * 0.6; x += Math.cos(a) * 12; y += Math.sin(a) * 12 * 0.6; g.lineTo(x, y); } g.stroke(); }
};
// blobs irréguliers (mers, plaines, terrains sombres) : amas de disques
export const blobs = (c, rand, count, rMin, rMax, color, yMin = 0, yMax = 1) => {
  const w = c.width, h = c.height, g = c.getContext('2d'); g.fillStyle = color;
  for (let i = 0; i < count; i++) { const cx = rand() * w, cy = (yMin + rand() * (yMax - yMin)) * h, R = rMin + rand() * (rMax - rMin); for (let k = 0; k < 7; k++) { const a = rand() * 6.28, d = rand() * R * 0.8, r = R * (0.3 + rand() * 0.5); for (const dx of [-w, 0, w]) { g.beginPath(); g.arc(cx + Math.cos(a) * d + dx, cy + Math.sin(a) * d * 0.7, r, 0, 2 * Math.PI); g.fill(); } } }
};

// ---------- rendu logiciel d'un maillage (z-buffer, ombrage en 5 aplats) pour les fiches : V = [[x, y, z]], F = [[a, b, c]] ----------
export const renderMeshCard = (V, F, { yaw = 0.5, pitch = 0.45, base = [150, 140, 128], size = S } = {}) => {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const rot = v => { const x = v[0] * cy + v[2] * sy, z = -v[0] * sy + v[2] * cy; return [x, v[1] * cp - z * sp, v[1] * sp + z * cp]; };
  const R = V.map(rot), lo = [0, 1].map(i => Math.min(...R.map(v => v[i]))), hi = [0, 1].map(i => Math.max(...R.map(v => v[i]))), scale = 0.9 * size / Math.max(hi[0] - lo[0], hi[1] - lo[1]);
  const px_ = v => (v[0] - (lo[0] + hi[0]) / 2) * scale + size / 2, py_ = v => size / 2 - (v[1] - (lo[1] + hi[1]) / 2) * scale;
  const c = createCanvas(size, size), g = c.getContext('2d'), img = g.createImageData(size, size), zb = new Float32Array(size * size).fill(-1e9), LEV = [0.35, 0.55, 0.75, 0.95, 1.1], light = [-0.5, 0.6, 0.62], ln = Math.hypot(...light);
  for (let i = 0; i < 3; i++) light[i] /= ln;
  for (const [ia, ib, ic] of F) {
    const A = R[ia], B = R[ib], C = R[ic], ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl; if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const k = LEV[Math.min(4, Math.floor(Math.max(0, nx * light[0] + ny * light[1] + nz * light[2]) * 5))];
    const x0 = px_(A), y0 = py_(A), x1 = px_(B), y1 = py_(B), x2 = px_(C), y2 = py_(C), den = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2); if (Math.abs(den) < 1e-9) continue;
    for (let py = Math.max(0, Math.floor(Math.min(y0, y1, y2))); py <= Math.min(size - 1, Math.ceil(Math.max(y0, y1, y2))); py++) for (let px = Math.max(0, Math.floor(Math.min(x0, x1, x2))); px <= Math.min(size - 1, Math.ceil(Math.max(x0, x1, x2))); px++) {
      const l1 = ((y1 - y2) * (px + 0.5 - x2) + (x2 - x1) * (py + 0.5 - y2)) / den, l2 = ((y2 - y0) * (px + 0.5 - x2) + (x0 - x2) * (py + 0.5 - y2)) / den, l3 = 1 - l1 - l2; if (l1 < 0 || l2 < 0 || l3 < 0) continue;
      const z = l1 * A[2] + l2 * B[2] + l3 * C[2], o = py * size + px; if (z <= zb[o]) continue; zb[o] = z;
      img.data[o * 4] = Math.min(255, base[0] * k); img.data[o * 4 + 1] = Math.min(255, base[1] * k); img.data[o * 4 + 2] = Math.min(255, base[2] * k); img.data[o * 4 + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0); return c;
};

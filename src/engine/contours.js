// Courbes de niveau colorées : à partir de tuiles d'ALTITUDE « Terrarium » (AWS Terrain Tiles : https://registry.opendata.aws/terrain-tiles/ ; RGB → mètres : (R·256 + G + B/256) − 32768),
// on peint une bande de couleur par tranche de 100 m (une couleur par courbe, dégradé hypsométrique : bleus sous le niveau de la mer, verts, jaunes, bruns, blanc), le trait de chaque courbe (plus marqué tous les 500 m)
// et un léger ombrage du relief. Fonctions PURES (aucun three.js), testées dans Node.
export const CONTOUR_STEP_M = 100;      // une courbe tous les 100 m
export const CONTOUR_MAJOR_EVERY = 5;   // courbe maîtresse (plus marquée) tous les 500 m
export const TERRAIN_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
export const TERRAIN_CREDIT = 'Altitudes : AWS Terrain Tiles (SRTM, GMTED, USGS 3DEP, GEBCO…)';

// altitude en mètres d'un pixel Terrarium
export const terrariumElevation = (r, g, b) => r * 256 + g + b / 256 - 32768;

// dégradé hypsométrique : [altitude m, [r, g, b]]
const RAMP = [
  [-6000, [8, 29, 88]], [-3000, [34, 94, 168]], [-1000, [65, 146, 204]], [0, [140, 200, 230]],
  [1, [46, 139, 63]], [200, [110, 178, 80]], [400, [182, 205, 98]], [600, [226, 214, 108]], [800, [226, 184, 86]], [1000, [208, 150, 66]],
  [1500, [176, 110, 58]], [2000, [148, 84, 52]], [2500, [128, 70, 56]], [3000, [152, 112, 104]], [3500, [200, 178, 172]], [4200, [255, 255, 255]],
];
const lerp = (a, b, t) => a + (b - a) * t;

// couleur [r, g, b] de la bande d'altitude `band` (indice entier : bande = floor(altitude / 100)) ; chaque bande a SA couleur (une nuance alternée distingue deux bandes voisines)
export function bandColor(band) {
  const e = band * CONTOUR_STEP_M + CONTOUR_STEP_M / 2;   // altitude au milieu de la bande
  let i = 0; while (i < RAMP.length - 2 && e >= RAMP[i + 1][0]) i++;
  const [e0, c0] = RAMP[i], [e1, c1] = RAMP[i + 1], t = Math.max(0, Math.min(1, (e - e0) / (e1 - e0))), k = band % 2 === 0 ? 1.05 : 0.95;
  return [0, 1, 2].map(j => Math.max(0, Math.min(255, Math.round(lerp(c0[j], c1[j], t) * k))));
}

// peint une tuile : rgba = pixels Terrarium (w × h × 4), mpp = mètres par pixel (ombrage) ; renvoie les pixels RGBA peints (Uint8ClampedArray)
export function paintContours(rgba, w, h, mpp = 300) {
  const elev = new Float32Array(w * h), band = new Int32Array(w * h), out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { const e = terrariumElevation(rgba[4 * i], rgba[4 * i + 1], rgba[4 * i + 2]); elev[i] = e; band[i] = Math.floor(e / CONTOUR_STEP_M); }
  const at = (x, y) => elev[Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, c = bandColor(band[i]);
    // ombrage : lumière du nord-ouest, relief exagéré ×3
    const dzx = (at(x + 1, y) - at(x - 1, y)) / (2 * mpp), dzy = (at(x, y + 1) - at(x, y - 1)) / (2 * mpp);
    const nx = -3 * dzx, ny = -3 * dzy, nl = Math.hypot(nx, ny, 1), shade = 0.82 + 0.3 * Math.max(0, Math.min(1, (-nx * 0.5 - ny * 0.5 + 0.7) / nl));
    let r = c[0] * shade, g = c[1] * shade, b = c[2] * shade;
    // courbe de niveau : la bande change vers la droite ou vers le bas
    const right = x + 1 < w ? band[i + 1] : band[i], down = y + 1 < h ? band[i + w] : band[i];
    if (right !== band[i] || down !== band[i]) {
      const hi = Math.max(band[i], right !== band[i] ? right : band[i], down !== band[i] ? down : band[i]), major = ((hi % CONTOUR_MAJOR_EVERY) + CONTOUR_MAJOR_EVERY) % CONTOUR_MAJOR_EVERY === 0, k = major ? 0.45 : 0.72;
      r *= k; g *= k; b *= k;
    }
    out[4 * i] = r; out[4 * i + 1] = g; out[4 * i + 2] = b; out[4 * i + 3] = 255;
  }
  return out;
}

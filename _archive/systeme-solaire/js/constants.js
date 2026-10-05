// Constantes et petits utilitaires (aléatoire déterministe).
const AU = 149597870.7, DAYMS = 86400000, C_LIGHT = 299792.458, DEG = Math.PI / 180;
const J2000 = Date.UTC(2000, 0, 1, 12);       // 1er janvier 2000, 12 h UTC

function hash(s) { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }
function rng(seed) { return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

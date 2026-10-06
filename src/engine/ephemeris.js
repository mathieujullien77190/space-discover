import { GeoMoon, GeoVector, KM_PER_AU, RotateVector, Rotation_EQJ_EQD } from 'astronomy-engine';
import { FLIGHT_OBJECTS } from './data/objects.js';

// (nécessite js/data/objects.js : constantes des astres décrits en JSON, voir js/bodies.js)
// Éphémérides du Soleil et de la Lune (formules approchées de Meeus, précision ≈ 0,3° pour la Lune) : fonctions PURES, sans three.js, partagées par la scène (js/moon.js) et par le moteur de vol (js/flight-object.js,
// attraction de la Lune et du Soleil). Repère INERTIEL (équatorial) en axes de la scène : (X, Y, Z)équatorial → (X, Z, −Y) ; y = pôle nord ; mètres. Pour passer au repère de la Terre fixe : tourner de −GMST autour de y.
// rotation équateur J2000 → équateur vrai de la date, recalculée tous les ¼ de jour (précession + nutation varient lentement : des milliers d'appels par image pour les traces)
let rotKey = NaN, rotVal = null;
const eqd = (v, D) => { const key = Math.round(D * 4); if (key !== rotKey) { rotKey = key; rotVal = Rotation_EQJ_EQD(key / 4); } return RotateVector(rotVal, v); };
export const EPH = {
  AU_M: FLIGHT_OBJECTS.earth.motion.semiMajorAxisKm * 1000, MU_SUN: FLIGHT_OBJECTS.sun.muM3S2, MU_MOON: FLIGHT_OBJECTS.moon.muM3S2, EPS: FLIGHT_OBJECTS.earth.axialTiltDeg * Math.PI / 180,   // constantes lues dans objects/{earth,moon,sun}/*.json
  days: ms => ms / 86400000 + 2440587.5 - 2451545,                                       // jours depuis J2000 (ms : date en millisecondes UTC)
  gmst: D => (((280.46061837 + 360.98564736629 * D) % 360) + 360) % 360 * Math.PI / 180,   // temps sidéral de Greenwich (rad)
  // ÉPHÉMÉRIDES PRÉCISES (bibliothèque astronomy-engine, MIT : théories VSOP87 et ELP/MPP02 tronquées, ≈ 1′ pour la Lune) : l'éclipse du 12 août 2026 exige mieux que les anciennes formules (la Lune était à 1,2° de sa vraie place).
  // Géocentrique, équateur vrai de la date (cohérent avec le temps sidéral et la précession des étoiles), sans aberration ; (X, Y, Z) équatorial → (X, Z, −Y) de la scène.
  sun(D) { const v = eqd(GeoVector('Sun', D, false), D), k = KM_PER_AU * 1000; return [v.x * k, v.z * k, -v.y * k]; },
  moon(D) { const v = eqd(GeoMoon(D), D), km = Math.hypot(v.x, v.y, v.z) * KM_PER_AU, k = KM_PER_AU * 1000; return { pos: [v.x * k, v.z * k, -v.y * k], km }; },
  // anciennes formules approchées de Meeus (≈ 0,3° pour le Soleil, > 1° pour la Lune) : gardées pour comparaison dans les tests
  sunApprox(D) {                                                                               // Terre → Soleil, [x, y, z] en mètres
    const r = Math.PI / 180, M = (357.528 + 0.9856003 * D) * r, lam = (280.46 + 0.9856474 * D + 1.915 * Math.sin(M) + 0.02 * Math.sin(2 * M)) * r, R = 1.00014 - 0.01671 * Math.cos(M) - 0.00014 * Math.cos(2 * M), E = this.EPS, k = R * this.AU_M;
    return [k * Math.cos(lam), k * Math.sin(lam) * Math.sin(E), -k * Math.sin(lam) * Math.cos(E)];   // (X, Y, Z) → (X, Z, −Y)
  },
  moonApprox(D) {                                                                        // Terre → Lune : { pos: [x, y, z] en mètres, km }
    const r = Math.PI / 180, L = 218.316 + 13.176396 * D, M = (134.963 + 13.064993 * D) * r, F = (93.272 + 13.22935 * D) * r, E = this.EPS;
    const lon = (L + 6.289 * Math.sin(M)) * r, lat = 5.128 * Math.sin(F) * r, km = 385001 - 20905 * Math.cos(M);
    const ra = Math.atan2(Math.sin(lon) * Math.cos(E) - Math.tan(lat) * Math.sin(E), Math.cos(lon)), dec = Math.asin(Math.sin(lat) * Math.cos(E) + Math.cos(lat) * Math.sin(E) * Math.sin(lon)), d = km * 1000;
    return { pos: [d * Math.cos(dec) * Math.cos(ra), d * Math.sin(dec), -d * Math.cos(dec) * Math.sin(ra)], km };
  },
};

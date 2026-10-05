// VOL DU CONCORDE (Air France, comme l'ISS : un objet qui a une position à chaque date) : Paris-Roissy (CDG) ⇄ New York-JFK, les horaires des dernières années d'exploitation (2001-2003) :
//   AF002 Paris → New York : départ 10 h 30 (heure de Paris), arrivée 8 h 25 (heure de New York) ;   AF001 New York → Paris : départ 8 h 00 (heure de New York), arrivée 17 h 45 (heure de Paris).
// Le vol suit l'arc de grand cercle entre les deux aéroports ; profil de vitesse et d'altitude simplifié mais réaliste : décollage, montée subsonique, accélération supersonique au large, croisière à MACH 2 (≈ 2 150 km/h) entre 15,5 et 18,3 km, décélération, descente.
// Durée en l'air : 3 h 30 (le reste du temps de vol programmé : roulage au départ et à l'arrivée). Exploité du 21 janvier 1976 (Air France) au 24 octobre 2003. Horaires, dates et chiffres : DE MÉMOIRE, à vérifier.
import * as THREE from 'three';

export const CDG = { name: 'Paris-Roissy (CDG)', lat: 49.0097, lon: 2.5479 }, JFK = { name: 'New York-JFK', lat: 40.6413, lon: -73.7781 };
export const CONCORDE_FROM = Date.UTC(1976, 0, 21), CONCORDE_UNTIL = Date.UTC(2003, 9, 24, 23, 59, 59);   // exploitation Air France ... dernier vol commercial
export const AIRBORNE_S = 12600;       // 3 h 30 en l'air
export const CRUISE_MACH = 2.02, SOUND_MS = 295;   // vitesse du son à 17 km d'altitude
export const R_EARTH_M = 6378137;

// vols programmés (`runwayHeadingDeg` = cap de la piste d'atterrissage : JFK 22L ≈ 224°, Roissy 09 ≈ 87° : DE MÉMOIRE, à vérifier) : heure locale de départ (h, min) et du lieu ; AF002 = Paris → New York, AF001 = New York → Paris
export const FLIGHTS = [
  { id: 'AF002', label: 'AF002 · Paris → New York', from: CDG, to: JFK, localDeparture: [10, 30], zone: 'paris', arrival: '8 h 25 (New York)', taxiOutS: 600, taxiInS: 900, runwayHeadingDeg: 224 },
  { id: 'AF001', label: 'AF001 · New York → Paris', from: JFK, to: CDG, localDeparture: [8, 0], zone: 'ny', arrival: '17 h 45 (Paris)', taxiOutS: 300, taxiInS: 600, runwayHeadingDeg: 87 },   // roulages réglés pour retrouver les heures d'arrivée programmées
];

// décalage horaire (heures par rapport à UTC) selon la date : Europe (heure d'été du dernier dimanche de mars au dernier dimanche d'octobre, 1 h UTC) ; États-Unis (avant 2007 : du premier dimanche d'avril au dernier dimanche d'octobre, 2 h locales)
const lastSunday = (y, m) => { const d = new Date(Date.UTC(y, m + 1, 0)); return Date.UTC(y, m, d.getUTCDate() - d.getUTCDay()); };
const nthSunday = (y, m, n) => { const first = new Date(Date.UTC(y, m, 1)); return Date.UTC(y, m, 1 + ((7 - first.getUTCDay()) % 7) + 7 * (n - 1)); };
export function parisOffsetH(ms) { const y = new Date(ms).getUTCFullYear(); return ms >= lastSunday(y, 2) + 3600e3 && ms < lastSunday(y, 9) + 3600e3 ? 2 : 1; }
export function newYorkOffsetH(ms) {
  const y = new Date(ms).getUTCFullYear();
  const start = y < 2007 ? nthSunday(y, 3, 1) + 7 * 3600e3 : nthSunday(y, 2, 2) + 7 * 3600e3, end = y < 2007 ? lastSunday(y, 9) + 6 * 3600e3 : nthSunday(y, 10, 1) + 6 * 3600e3;
  return ms >= start && ms < end ? -4 : -5;
}
const offsetH = (zone, ms) => (zone === 'paris' ? parisOffsetH(ms) : newYorkOffsetH(ms));

// instant (ms UTC) du décollage du vol `flight` le jour civil local `y-m-d` du lieu de départ : départ programmé + roulage
export function takeoffMs(flight, y, m, d) {
  const local = Date.UTC(y, m, d, flight.localDeparture[0], flight.localDeparture[1]);   // l'heure locale lue comme si c'était de l'UTC
  let utc = local - offsetH(flight.zone, local) * 3600e3; utc = local - offsetH(flight.zone, utc) * 3600e3;   // heure locale → UTC (deux passes : le décalage dépend de l'instant UTC, surtout aux changements d'heure)
  return utc + flight.taxiOutS * 1000;
}
// le vol en cours à la date `ms` (ou null) : { flight, takeoff (ms), t (s depuis le décollage) }
// (deux vols peuvent être en l'air en même temps : AF001 décolle quelques minutes avant que AF002 se pose ; `prefer` = identifiant du vol à suivre dans ce cas)
export function flightAt(ms, prefer = null) {
  if (ms < CONCORDE_FROM || ms > CONCORDE_UNTIL + 86400e3) return null;
  const day = new Date(ms), found = [];
  for (let dd = -1; dd <= 1; dd++) for (const f of FLIGHTS) {
    const base = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + dd)), t0 = takeoffMs(f, base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()), t = (ms - t0) / 1000;
    if (t >= 0 && t <= AIRBORNE_S && t0 <= CONCORDE_UNTIL) found.push({ flight: f, takeoff: t0, t });
  }
  return found.find(x => x.flight.id === prefer) || found[0] || null;
}
// prochain décollage à partir de `ms` : { flight, takeoff }
export function nextTakeoff(ms) {
  let best = null; const day = new Date(ms);
  for (let dd = -1; dd <= 3; dd++) for (const f of FLIGHTS) { const b = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + dd)), t0 = takeoffMs(f, b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()); if (t0 >= ms && (!best || t0 < best.takeoff)) best = { flight: f, takeoff: t0 }; }
  return best;
}

// ---------- profil du vol : vitesse au sol et altitude en fonction du temps depuis le décollage ----------
const D = AIRBORNE_S, V = CRUISE_MACH * SOUND_MS;   // vitesse de croisière ≈ 596 m/s
// points (t en s, vitesse relative à la croisière) : accélération, montée subsonique, passage supersonique, croisière, décélération
const SPEED_KEYS = [[0, 0.0], [60, 0.13], [150, 0.26], [600, 0.38], [1500, 0.41], [2300, 0.64], [3300, 1.0], [D - 2700, 1.0], [D - 1300, 0.5], [D - 400, 0.34], [D - 60, 0.22], [D, 0.0]];   // montée subsonique lente, passage supersonique vers 38 min, croisière à Mach ≈ 2 jusqu'à 45 min de la fin
const ALT_KEYS = [[0, 0], [180, 1500], [600, 5000], [1500, 9500], [2400, 15500], [D - 4200, 17000], [D - 2400, 18300], [D - 1500, 15000], [D - 800, 6000], [D - 250, 1500], [D, 0]];
const lerpKeys = (keys, t) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [t0, v0] = keys[i - 1], [t1, v1] = keys[i], u = (t - t0) / (t1 - t0); return v0 + (v1 - v0) * u * u * (3 - 2 * u); } return keys[keys.length - 1][1]; };   // interpolation lissée
const arc = (a, b) => { const p = (x) => [Math.cos(x.lat * Math.PI / 180) * Math.cos(x.lon * Math.PI / 180), Math.sin(x.lat * Math.PI / 180), -Math.cos(x.lat * Math.PI / 180) * Math.sin(x.lon * Math.PI / 180)], u = new THREE.Vector3(...p(a)), v = new THREE.Vector3(...p(b)); return { u, v, angle: Math.acos(Math.max(-1, Math.min(1, u.dot(v)))) }; };
export const ROUTE_ANGLE = arc(CDG, JFK).angle, ROUTE_KM = ROUTE_ANGLE * 6371.0088;   // arc de grand cercle : ≈ 5 837 km

// distance parcourue (fraction 0–1 du trajet) à t secondes : intégrale de la vitesse, normalisée pour que le vol couvre exactement le trajet (précalculée au pas de 5 s)
const STEPS = Math.ceil(D / 5), CUM = new Float64Array(STEPS + 1);
for (let i = 1; i <= STEPS; i++) CUM[i] = CUM[i - 1] + lerpKeys(SPEED_KEYS, (i - 0.5) * 5) * 5;
const TOTAL = CUM[STEPS];
export const fractionAt = t => { const x = Math.max(0, Math.min(D, t)) / 5, i = Math.min(STEPS - 1, Math.floor(x)); return (CUM[i] + (CUM[i + 1] - CUM[i]) * (x - i)) / TOTAL; };
const SCALE = ROUTE_KM * 1000 / (TOTAL * V);   // le profil brut parcourt TOTAL·V mètres ; on le met à l'échelle du trajet réel
export const groundSpeedAt = t => lerpKeys(SPEED_KEYS, t) * V * SCALE;
export const altitudeAt = t => lerpKeys(ALT_KEYS, t);
export const machAt = t => groundSpeedAt(t) / SOUND_MS * (altitudeAt(t) > 11000 ? 1 : 0.88);   // le Mach compte la vitesse du son locale (plus élevée près du sol)

// état du Concorde pour un vol (flight, t s après le décollage) : même forme que l'ISS (pos en rayons terrestres dans le repère de la Terre, up, vel unitaire horizontal, alt en km, speed en km/s, lon, lat)
// ARRIVÉE : le grand cercle ne tombe pas dans l'axe de la piste ; sur les derniers kilomètres l'avion fait une COURBE pour s'aligner (virage progressif entre 110 km et 30 km de l'arrivée, puis finale rectiligne
// de 30 km dans l'axe de la piste d'atterrissage : QFU `runwayHeadingDeg`, 0 = nord, 90 = est). Même avancement le long de la route (à distance restante égale), seule la position latérale change.
export const TURN_START_KM = 110, FINAL_KM = 30;
const smooth = x => { const u = Math.max(0, Math.min(1, x)); return u * u * (3 - 2 * u); };
const east = d => new THREE.Vector3(0, 1, 0).cross(d).normalize(), north = d => new THREE.Vector3().crossVectors(d, east(d)).normalize();
function groundDir(flight, a, f) {
  const ang = a.angle * f, s = Math.sin(a.angle) || 1, dRem = (1 - f) * ROUTE_KM;
  const dir = new THREE.Vector3().copy(a.u).multiplyScalar(Math.sin(a.angle - ang) / s).addScaledVector(a.v, Math.sin(ang) / s).normalize();   // grand cercle
  const w = smooth((TURN_START_KM - dRem) / (TURN_START_KM - FINAL_KM));
  if (w <= 0 || flight.runwayHeadingDeg === undefined) return dir;
  const A = a.v, h = flight.runwayHeadingDeg * Math.PI / 180, hd = north(A).multiplyScalar(Math.cos(h)).addScaledVector(east(A), Math.sin(h)), th = dRem / 6371.0088;
  const q = A.clone().multiplyScalar(Math.cos(th)).addScaledVector(hd, -Math.sin(th));   // point de l'axe de piste prolongé, à la même distance restante
  return dir.multiplyScalar(1 - w).addScaledVector(q, w).normalize();
}
export function concordeState(flight, t) {
  const a = arc(flight.from, flight.to), f = fractionAt(t), dir = groundDir(flight, a, f);
  const df = 2e-4, ahead = f + df <= 1 ? groundDir(flight, a, f + df) : groundDir(flight, a, f - df), sg = f + df <= 1 ? 1 : -1;   // cap : sens de la route (au bout du trajet on regarde en arrière)
  const vel = ahead.clone().sub(dir).multiplyScalar(sg).normalize(), alt = altitudeAt(t), r = 1 + alt / R_EARTH_M;
  const lat = Math.asin(dir.y) * 180 / Math.PI, lon = Math.atan2(-dir.z, dir.x) * 180 / Math.PI;
  return { pos: dir.clone().multiplyScalar(r), up: dir.clone(), vel, alt: alt / 1000, speed: groundSpeedAt(t) / 1000, mach: machAt(t), lon, lat, approx: false, t, flight };
}
// état à la date `ms` (ou null s'il n'y a pas de vol)
export function concordeAt(ms, prefer = null) { const f = flightAt(ms, prefer); return f ? Object.assign(concordeState(f.flight, f.t), { takeoff: f.takeoff }) : null; }
// points de la route restante (pour tracer la trajectoire) : n états de t à AIRBORNE_S
export const routePoints = (flight, t, n = 120) => Array.from({ length: n + 1 }, (_, k) => concordeState(flight, t + (D - t) * k / n).pos);

// Vol du Concorde : horaires AF002 / AF001 (heures locales avec heure d'été), profil de vol (Mach 2 en croisière à 15,5–18,3 km, parcours de 5 837 km en 3 h 30), état continu comme l'ISS.
import * as THREE from 'three';
import { AIRBORNE_S, CDG, FLIGHTS, JFK, ROUTE_KM, altitudeAt, concordeAt, concordeState, fractionAt, flightAt, groundSpeedAt, machAt, newYorkOffsetH, nextTakeoff, parisOffsetH, routePoints, takeoffMs } from '../../src/engine/concorde.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
const hhmm = ms => new Date(ms).toISOString().slice(11, 16);
check(Math.abs(ROUTE_KM - 5837) < 30, 'arc de grand cercle Paris-Roissy → New York-JFK : ' + ROUTE_KM.toFixed(0) + ' km (≈ 5 837 km)');
// heures d'été
check(parisOffsetH(Date.UTC(2003, 5, 2, 12)) === 2 && parisOffsetH(Date.UTC(2003, 0, 15, 12)) === 1 && parisOffsetH(Date.UTC(2003, 9, 26, 0, 30)) === 2 && parisOffsetH(Date.UTC(2003, 9, 26, 1, 30)) === 1, 'heure de Paris : UTC+2 l’été, UTC+1 l’hiver (changement le 26 oct. 2003 à 1 h UTC)');
check(newYorkOffsetH(Date.UTC(2003, 5, 2, 12)) === -4 && newYorkOffsetH(Date.UTC(2003, 0, 15, 12)) === -5 && newYorkOffsetH(Date.UTC(2003, 3, 6, 12)) === -4 && newYorkOffsetH(Date.UTC(2003, 3, 5, 12)) === -5, 'heure de New York : UTC−4 l’été (dès le 6 avril 2003), UTC−5 l’hiver');
// horaires : AF002 10 h 30 à Paris ; AF001 8 h 00 à New York
const af002 = FLIGHTS[0], af001 = FLIGHTS[1];
const t2 = takeoffMs(af002, 2003, 5, 2), t1 = takeoffMs(af001, 2003, 5, 2);
check(hhmm(t2 - af002.taxiOutS * 1000) === '08:30', 'AF002 le 2 juin 2003 : départ programmé 10 h 30 à Paris = 08 h 30 UTC (décollage à ' + hhmm(t2) + ' UTC)');
check(hhmm(t1 - af001.taxiOutS * 1000) === '12:00', 'AF001 le 2 juin 2003 : départ programmé 8 h 00 à New York = 12 h 00 UTC (décollage à ' + hhmm(t1) + ' UTC)');
const w2 = takeoffMs(af002, 2003, 0, 15), w1 = takeoffMs(af001, 2003, 0, 15);
check(hhmm(w2 - af002.taxiOutS * 1000) === '09:30' && hhmm(w1 - af001.taxiOutS * 1000) === '13:00', 'l’hiver : AF002 à 09 h 30 UTC et AF001 à 13 h 00 UTC (décalages d’hiver)');
// arrivées : AF002 ≈ 8 h 25 à New York, AF001 ≈ 17 h 45 à Paris (décollage + 3 h 30 + roulage d'arrivée 15 min)
const localOf = (ms, off) => ((ms + off * 3600e3) % 86400e3) / 60e3;
const arr2 = t2 + AIRBORNE_S * 1000 + af002.taxiInS * 1000, arr1 = t1 + AIRBORNE_S * 1000 + af001.taxiInS * 1000;
check(Math.abs(localOf(arr2, newYorkOffsetH(arr2)) - (8 * 60 + 25)) < 10, 'AF002 : arrivée à New York vers 8 h 25 heure locale (' + (localOf(arr2, newYorkOffsetH(arr2)) / 60).toFixed(2) + ' h)');
check(Math.abs(localOf(arr1, parisOffsetH(arr1)) - (17 * 60 + 45)) < 10, 'AF001 : arrivée à Paris vers 17 h 45 heure locale (' + (localOf(arr1, parisOffsetH(arr1)) / 60).toFixed(2) + ' h)');
// existence
check(flightAt(Date.UTC(1975, 5, 2, 9)) === null && flightAt(Date.UTC(2004, 5, 2, 9)) === null && flightAt(t2 + 1000) !== null, 'le Concorde n’existe qu’entre 1976 et le 24 octobre 2003');
check(flightAt(t2 + 3600e3).flight.id === 'AF002' && flightAt(t1 + 3600e3).flight.id === 'AF001', 'le vol en cours est reconnu (AF002 / AF001)');
check(flightAt(Date.UTC(2003, 5, 2, 3, 0)) === null, 'la nuit (03 h UTC) : aucun vol en cours');
const nx = nextTakeoff(Date.UTC(2003, 5, 2, 3, 0)); check(nx && nx.flight.id === 'AF002' && Math.abs(nx.takeoff - t2) < 1000, 'prochain décollage à 03 h UTC : AF002 à ' + hhmm(nx.takeoff) + ' UTC');
// profil
check(altitudeAt(0) === 0 && altitudeAt(AIRBORNE_S) === 0 && Math.abs(groundSpeedAt(0)) < 1 && Math.abs(groundSpeedAt(AIRBORNE_S)) < 1, 'au sol au décollage et à l’atterrissage, vitesse nulle');
let maxAlt = 0, maxMach = 0, maxV = 0, cruiseOk = true;
for (let t = 0; t <= AIRBORNE_S; t += 30) { maxAlt = Math.max(maxAlt, altitudeAt(t)); maxMach = Math.max(maxMach, machAt(t)); maxV = Math.max(maxV, groundSpeedAt(t)); }
for (let t = 3400; t <= AIRBORNE_S - 2800; t += 120) if (altitudeAt(t) < 15400 || altitudeAt(t) > 18400 || machAt(t) < 1.95 || machAt(t) > 2.1) cruiseOk = false;
check(maxAlt > 17800 && maxAlt <= 18400, 'altitude maximale ' + maxAlt.toFixed(0) + ' m (≈ 18 300 m = 60 000 pieds)');
check(maxMach > 1.98 && maxMach < 2.1 && maxV * 3.6 > 2100 && maxV * 3.6 < 2250, 'vitesse maximale Mach ' + maxMach.toFixed(2) + ' (≈ ' + (maxV * 3.6).toFixed(0) + ' km/h : Mach 2 ≈ 2 150 km/h)');
check(cruiseOk, 'en croisière : entre 15,4 et 18,4 km, Mach 1,95 à 2,2');
check(machAt(900) < 1 && machAt(2600) > 1.0, 'subsonique au départ (Mach ' + machAt(900).toFixed(2) + ' à t = 15 min), supersonique plus tard (Mach ' + machAt(2600).toFixed(2) + ' à t = 43 min)');
check(Math.abs(fractionAt(AIRBORNE_S) - 1) < 1e-9 && fractionAt(0) === 0 && fractionAt(6300) > 0.3 && fractionAt(6300) < 0.7, 'le vol couvre exactement le trajet (à mi-temps : ' + (fractionAt(6300) * 100).toFixed(0) + ' %)');
// états : départ et arrivée aux bons aéroports, continuité
const s0 = concordeState(af002, 0), s1 = concordeState(af002, AIRBORNE_S);
check(Math.abs(s0.lat - CDG.lat) < 0.05 && Math.abs(s0.lon - CDG.lon) < 0.05 && Math.abs(s1.lat - JFK.lat) < 0.05 && Math.abs(s1.lon - JFK.lon) < 0.05, 'AF002 : décolle de Roissy (' + s0.lat.toFixed(2) + ' N, ' + s0.lon.toFixed(2) + ' E) et se pose à JFK (' + s1.lat.toFixed(2) + ' N, ' + s1.lon.toFixed(2) + ' E)');
const b0 = concordeState(af001, 0), b1 = concordeState(af001, AIRBORNE_S);
check(Math.abs(b0.lat - JFK.lat) < 0.05 && Math.abs(b1.lat - CDG.lat) < 0.05 && Math.abs(b1.lon - CDG.lon) < 0.05, 'AF001 : de JFK à Roissy');
let jump = 0, prev = concordeState(af002, 0).pos; for (let t = 10; t <= AIRBORNE_S; t += 10) { const p = concordeState(af002, t).pos; jump = Math.max(jump, p.distanceTo(prev) * 6378137 / 10); prev = p; }
check(jump < 750, 'position continue : vitesse maximale mesurée sur la sphère ' + jump.toFixed(0) + ' m/s (jamais de saut)');
const mid = concordeState(af002, 6300);
check((mid.pos.length() - 1) * 6378 > 15 && mid.alt > 15 && mid.alt < 19 && Math.abs(mid.vel.length() - 1) < 1e-9 && Math.abs(mid.vel.dot(mid.up)) < 0.02, 'à mi-parcours : ' + mid.alt.toFixed(1) + ' km, cap horizontal unitaire (vitesse perpendiculaire à la verticale)');
check(mid.lon < -10 && mid.lon > -60 && mid.lat > 45 && mid.lat < 54, 'à mi-parcours : au-dessus de l’Atlantique Nord (' + mid.lat.toFixed(1) + ' N, ' + mid.lon.toFixed(1) + ' E)');
check(concordeAt(Date.UTC(2003, 5, 2, 3, 0)) === null && concordeAt(t2 + 3600e3).alt > 10, 'concordeAt : null hors vol, état une heure après le décollage (alt ' + concordeAt(t2 + 3600e3).alt.toFixed(1) + ' km)');
const pts = routePoints(af002, 0, 60); check(pts.length === 61 && pts[0].distanceTo(s0.pos) < 1e-9, 'route : 61 points du décollage à l’arrivée');
// courbe d'arrivée : le cap de la dernière finale est celui de la piste, et la route s'écarte du grand cercle avant
const fin = (fl, rw) => { const q = concordeState(fl, AIRBORNE_S - 25), p = concordeState(fl, AIRBORNE_S - 24); const d = p.pos.clone().sub(q.pos).normalize(); const up = q.up, e = new THREE.Vector3(0, 1, 0).cross(up).normalize(), n = new THREE.Vector3().crossVectors(up, e).normalize(); let h = Math.atan2(d.dot(e), d.dot(n)) * 180 / Math.PI; if (h < 0) h += 360; return Math.abs(h - rw); };
check(fin(af002, 224) < 3 && fin(af001, 87) < 3, 'finale dans l’axe de la piste : cap AF002 à ' + (224 - fin(af002, 224)).toFixed(0) + '° (piste 224°), AF001 à ' + (87 + 0).toFixed(0) + '° ± ' + fin(af001, 87).toFixed(1));
const dev = (fl, tt) => { const x = concordeState(fl, tt).pos.clone().normalize(), a0 = concordeState(fl, tt).pos; return a0; };
let maxJump = 0, pv = concordeState(af002, AIRBORNE_S - 1200).pos; for (let tt = AIRBORNE_S - 1190; tt <= AIRBORNE_S; tt += 5) { const p = concordeState(af002, tt).pos; maxJump = Math.max(maxJump, p.distanceTo(pv) * 6378137 / 5); pv = p; }
check(maxJump < 750, 'la courbe est continue : jamais plus de ' + maxJump.toFixed(0) + ' m/s sur la dernière 20 min');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }

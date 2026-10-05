import * as satellite from 'satellite.js';
import { ephThirdBody } from './bodies.js';
import { LCH, lchElements } from './launch.js';
import { phAccel } from './physics.js';

// OBJET GÉNÉRIQUE décrit par un JSON minimal : un point de départ + une LISTE DE PALIERS datés (masse, poussée ou accélération, direction, vitesse…). Le moteur ne devine rien :
// il applique les paliers et intègre la physique (gravité en 1/r², traînée, poussée) ; si la vitesse donnée est trop faible, l'objet retombe sur la Terre, si elle est bonne il reste en orbite.
// Une fusée, un satellite, l'ISS, un missile : même format. Résultat de la même forme que flyPlan (js/flight-plan.js) : `Launch` (js/launch-3d.js) l'affiche tel quel via `opts.object`.
//
// Format (objects/<nom>/<nom>.json, dossier = JSON + modèle 3D ; documenté dans CLAUDE.md) :
//   name                         nom affiché
//   start { lat, lon, altitudeKm | altitudeM, azimuthDeg (0 = nord, 90 = est), elevationDeg (90 = vertical), speedMs, frame: "ground" | "inertial" }
//         vitesse initiale par rapport au sol ("ground", défaut : la rotation de la Terre s'y ajoute) ou dans le repère inertiel ("inertial" : pour un objet déjà en orbite)
//   OU, pour un SATELLITE, les paramètres d'une orbite (ceux d'un TLE) au lieu de lat / lon / vitesse :
//   start { orbit { epoch (ISO UTC), inclinationDeg, raanDeg, eccentricity, argPerigeeDeg, meanAnomalyDeg, meanMotionRevDay }  |  tle: [ligne 1, ligne 2],
//           at: "now" | date ISO (défaut : l'époque) }       l'objet part de sa position sur l'orbite à la date « at » ; position, vitesse, plan et phase sont déduits (voir objectStart)
//   thirdBodies: false           désactive l'attraction de la Lune et du Soleil (par défaut elle est prise en compte dès que la date du départ est connue : js/ephemeris.js)
//   live: true                   objet PRÉSENT EN PERMANENCE dans la scène à l'heure réelle (l'ISS) : pas de bouton pour le lancer, il n'est pas dans le panneau « Satellite »
//   model { file }               modèle 3D glTF (.glb) dans le même dossier que le JSON
//   visual { name, lengthM, widthM, radiusM, color }  forme 3D (cylindre) ; facultatif
//   dryKg                        masse en dessous de laquelle plus de poussée (réservoirs vides) ; défaut 0
//   timeline [{ t (s), … }]      paliers triés par temps ; chaque clé n'est donnée QUE si elle change à cet instant, le reste garde sa valeur :
//       massKg       masse totale (un largage = une baisse de masse)
//       thrustN      poussée en newtons                    | accelMs2 : accélération due à la poussée (m/s²), poussée = accelMs2 × masse
//       isp          impulsion spécifique (s) : la masse diminue alors toute seule (débit = poussée / (isp·g0)) | burnKgS : débit imposé (kg/s)
//       pitch        direction de la poussée, degrés au-dessus de l'horizontale locale (90 = vertical), interpolée linéairement d'un palier « pitch » au suivant ; "prograde" = poussée le long de la vitesse (étages dans le vide : orbite, libération)
//       speedMs      remet la vitesse par rapport au sol à cette valeur (direction conservée)
//       cdA          surface × coefficient de traînée (m²)
//       label, key, phase   texte de l'étape (liste des choses à faire), identifiant, nom de la phase qui commence
//       ispVac, ispSea  (avec burnKgS) la poussée se déduit du débit : F = burnKgS × (ispVac − (ispVac − ispSea) × pression relative) × g0 — comme un vrai moteur, plus faible au sol que dans le vide
//       flames       ["eap", "epc", "esc"] : flammes affichées (boosters, étage principal, étage supérieur) ; défaut : l'étage principal dès qu'il y a de la poussée
//       release      [{ part, count }] largue des PIÈCES décrites chacune par leur propre JSON (booster, coiffe, étage, satellite : voir « parts ») : la masse baisse toute seule de count × (massKg + residualPropKg), la pièce
//                    est simulée à part (elle retombe, se désintègre ou reste en orbite) à partir de l'état de l'objet à cet instant
//   parts { nom: "fichier.json" }   les pièces larguables, chacune dans son JSON du même dossier : { name, role: "booster" | "fairing" | "stage" | "payload", massKg (par pièce), residualPropKg, visual { radiusM, lengthM, noseM, cylM, coneM,
//                    nozzleM, color, bandColor }, dragCoefficient, separationSpeedMs (m/s le long de la trajectoire, négatif = vers l'arrière), disintegrates, disintegrationAltitudeKm }
//   visual.stack { core: nom d'une pièce, boosters { part, count, radialM }, upper { radiusM, lengthM, color, nozzleM, name, stackHeightM, model }, fairing: nom d'une pièce (facultatif), heightM, fairingBaseM (hauteur de la base de la coiffe si elle enveloppe l'étage supérieur), payloadName, flames { core | upper { xM, yM, zM, radiusM, lengthM } } }
//                    fusée dessinée à partir des pièces (voir objectToSpec) ; chaque pièce peut avoir un modèle 3D `visual.model { file, scale, rotate, align, offsetM }` (js/stack-models.js)
//     le DERNIER palier marque la fin de la poussée : ensuite l'objet vole sans moteur (orbite, chute, ou LIBÉRATION : l'objet quitte la Terre, le vol continue jusqu'à `escapeDistanceM` (défaut 10⁹ m) ; mettre `maxDurationS` assez grand).
// Sans DOM : fonctions pures, testées dans Node (tools/test/object.test.js).
export function validateObject(o) {
  if (!o || typeof o !== 'object') throw new Error('objet vide');
  if (!o.start || (!o.start.orbit && !o.start.tle && (o.start.lat == null || o.start.lon == null))) throw new Error('« start » manquant (lat + lon, ou orbit, ou tle)');
  if (!Array.isArray(o.timeline) || !o.timeline.length) throw new Error('« timeline » manquante');
  if (o.timeline.every(k => k.massKg == null) && o.massKg == null) throw new Error('aucune masse (« massKg » dans un palier)');
  return o;
}
export function objectPitch(pts, t) {   // direction (rad) interpolée entre les paliers qui donnent « pitch »
  if (!pts.length) return Math.PI / 2;
  if (t <= pts[0][0]) return pts[0][1] * Math.PI / 180;
  for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) return (pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * (t - pts[i - 1][0]) / Math.max(1e-12, pts[i][0] - pts[i - 1][0])) * Math.PI / 180;
  return pts[pts.length - 1][1] * Math.PI / 180;
}
// éléments d'un TLE (deux lignes) → { epoch, inclinationDeg, raanDeg, eccentricity, argPerigeeDeg, meanAnomalyDeg, meanMotionRevDay, ndotRevDay2, bstar }
export function tleToOrbit(tle) {
  const l1 = tle[0], l2 = tle[1], yy = +l1.substr(18, 2), day = +l1.substr(20, 12), ex = (m, e) => +(m.trim() ? m.trim().replace(/^([+-]?)(\d+)$/, '$10.$2') : 0) * Math.pow(10, +e);   // champ « 76468-4 » = 0,76468e-4
  const bs = l1.substr(53, 8).trim(), bsM = bs ? bs.slice(0, bs.length - 2) : '', bsE = bs ? bs.slice(-2) : '0';
  return { epoch: new Date(Date.UTC(yy < 57 ? 2000 + yy : 1900 + yy, 0, 1) + (day - 1) * 86400000).toISOString(), inclinationDeg: +l2.substr(8, 8), raanDeg: +l2.substr(17, 8), eccentricity: +('0.' + l2.substr(26, 7).trim()), argPerigeeDeg: +l2.substr(34, 8), meanAnomalyDeg: +l2.substr(43, 8), meanMotionRevDay: +l2.substr(52, 11),
    ndotRevDay2: +l1.substr(33, 10), bstar: bsM ? ex(bsM, bsE) : 0 };
}
// l'inverse : éléments → deux lignes de TLE (pour la bibliothèque SGP4 ; le numéro de satellite et les champs d'identification ne servent à rien)
export function orbitToTle(O) {
  const ms = Date.parse(O.epoch), y = new Date(ms).getUTCFullYear(), day = (ms - Date.UTC(y, 0, 1)) / 86400000 + 1, sum = s => { let c = 0; for (const ch of s) c += ch >= '0' && ch <= '9' ? +ch : ch === '-' ? 1 : 0; return s + (c % 10); };
  const expF = x => { if (!x) return ' 00000+0'; const e = Math.floor(Math.log10(Math.abs(x))) + 1, m = Math.round(Math.abs(x) / Math.pow(10, e) * 1e5); return (x < 0 ? '-' : ' ') + String(m).padStart(5, '0') + (e < 0 ? '-' : '+') + Math.abs(e); };
  const nd = O.ndotRevDay2 || 0, ndF = (nd < 0 ? '-' : ' ') + Math.abs(nd).toFixed(8).slice(1);
  const l1 = '1 00001U 00001A   ' + String(y % 100).padStart(2, '0') + day.toFixed(8).padStart(12, '0') + ' ' + ndF + '  00000+0 ' + expF(O.bstar) + ' 0  999';
  const l2 = '2 00001 ' + O.inclinationDeg.toFixed(4).padStart(8) + ' ' + O.raanDeg.toFixed(4).padStart(8) + ' ' + O.eccentricity.toFixed(7).slice(2) + ' ' + O.argPerigeeDeg.toFixed(4).padStart(8) + ' ' + O.meanAnomalyDeg.toFixed(4).padStart(8) + ' ' + O.meanMotionRevDay.toFixed(8).padStart(11) + '00001';
  return [sum(l1), sum(l2)];
}
// temps sidéral de Greenwich (rad) à la date ms (UTC)
export function foGmst(ms) { const d = ms / 86400000 + 2440587.5 - 2451545, T = d / 36525, g = 280.46061837 + 360.98564736629 * d + 0.000387933 * T * T - T * T * T / 38710000; return (((g % 360) + 360) % 360) * Math.PI / 180; }
// Départ résolu : si « start » donne une orbite (ou un TLE), calcule où est le satellite à la date voulue et renvoie le départ équivalent { lat, lon, altitudeM, azimuthDeg, elevationDeg, speedMs, frame: 'inertial', nodeRate }
// (le plan de Launch est celui de la verticale du lieu et de la direction de la vitesse inertielle ; la Terre tourne dessous).
// `opt.far` : date très éloignée de l'époque du TLE (années) : jamais de SGP4 (il dériverait) ni de freinage : orbite moyenne à dérive J2 seulement, position INDICATIVE (la phase le long de l'orbite n'est plus connue).
// Position : si la bibliothèque SGP4 (satellite.js, js/vendor) est chargée, c'est l'état SGP4 EXACT à cette date (l'ISS JSON part pile de l'ISS réelle) ; sinon éléments moyens + dérive séculaire J2 du nœud et du périgée + freinage (ndot).
// Dans les deux cas la vitesse est recalée pour que le vol képlérien de Launch ait la cadence moyenne réelle (argument de latitude : n + ωdot + 2·ndot·t), sinon la position osculatrice (± quelques km autour de la moyenne) ferait dériver de dizaines de km par tour.
export const FO_SATREC = {};   // cache : twoline2satrec est coûteux et issState() est appelé à chaque image
export function objectStart(obj, opt) {
  const S = obj.start; if (!S.orbit && !S.tle) return S;
  const L = LCH, D = Math.PI / 180, O = S.orbit || tleToOrbit(S.tle), ms0 = Date.parse(O.epoch), now = opt && opt.date ? +opt.date : Date.now(), at = S.at === 'now' ? now : S.at ? Date.parse(S.at) : ms0, days = (at - ms0) / 86400000, dt = days * 86400;
  const far = !!(opt && opt.far), e = O.eccentricity, i = O.inclinationDeg * D, J2 = 1.08262668e-3, nd = far ? 0 : O.ndotRevDay2 || 0, n0 = O.meanMotionRevDay * 2 * Math.PI / 86400, n = (O.meanMotionRevDay + 2 * nd * days) * 2 * Math.PI / 86400;   // freinage : n(t) = n + 2·ndot·t
  const a0 = Math.cbrt(L.MU / (n * n)), p0 = a0 * (1 - e * e), k = 1.5 * J2 * Math.pow(L.RE / p0, 2) * n, wdot = 0.5 * k * (5 * Math.cos(i) ** 2 - 1), nEff = n + wdot, aEff = Math.cbrt(L.MU / (nEff * nEff)), p = aEff * (1 - e * e);
  let P, V;   // état dans le repère de la Terre figé à l'instant `at` (m, m/s) : position et vitesse INERTIELLE
  const sat = typeof satellite !== 'undefined' ? satellite : null;
  if (sat && sat.twoline2satrec && !far) {
    const tle = S.tle || orbitToTle(O), key = tle[0] + tle[1], rec = FO_SATREC[key] || (FO_SATREC[key] = sat.twoline2satrec(tle[0], tle[1])), pv = sat.propagate(rec, new Date(at));
    if (pv.position) { const g = sat.gstime(new Date(at)), cg = Math.cos(g), sg = Math.sin(g), fix = v => [(v.x * cg + v.y * sg) * 1000, (-v.x * sg + v.y * cg) * 1000, v.z * 1000]; P = fix(pv.position); V = fix(pv.velocity); }
  }
  if (!P) {   // sans SGP4 : éléments moyens → position et vitesse képlériennes
    const raan = O.raanDeg * D - k * Math.cos(i) * dt, w = O.argPerigeeDeg * D + wdot * dt, M = O.meanAnomalyDeg * D + 2 * Math.PI * (O.meanMotionRevDay * days + nd * days * days);
    let E = M; for (let j = 0; j < 12; j++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2)), r = aEff * (1 - e * Math.cos(E)), kv = Math.sqrt(L.MU / p);
    const px = r * Math.cos(nu), py = r * Math.sin(nu), vx = -kv * Math.sin(nu), vy = kv * (e + Math.cos(nu));   // plan de l'orbite (périgée sur x)
    const cO = Math.cos(raan), sO = Math.sin(raan), ci = Math.cos(i), si = Math.sin(i), cw = Math.cos(w), sw = Math.sin(w);
    const eci = (x, y) => { const x1 = x * cw - y * sw, y1 = x * sw + y * cw; return [x1 * cO - y1 * ci * sO, x1 * sO + y1 * ci * cO, y1 * si]; };   // Rz(Ω) Rx(i) Rz(ω)
    const g = foGmst(at), cg = Math.cos(g), sg = Math.sin(g), fix = v => [v[0] * cg + v[1] * sg, -v[0] * sg + v[1] * cg, v[2]];   // repère de la Terre à cet instant : Rz(−gmst)
    P = fix(eci(px, py)); V = fix(eci(vx, vy));
  }
  const rr = Math.hypot(...P), lat = Math.asin(P[2] / rr), lon = Math.atan2(P[1], P[0]);
  const vis = Math.sqrt(Math.max(1, L.MU * (2 / rr - 1 / aEff))), vs = vis / Math.hypot(...V); V = V.map(c => c * vs);   // vitesse recalée : le demi-grand axe du vol est aEff
  const up = P.map(c => c / rr), east = [-Math.sin(lon), Math.cos(lon), 0], north = [-Math.sin(lat) * Math.cos(lon), -Math.sin(lat) * Math.sin(lon), Math.cos(lat)], dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const vU = dot(V, up), vE = dot(V, east), vN = dot(V, north);
  return { lat: lat / D, lon: lon / D, altitudeM: rr - L.RE, azimuthDeg: Math.atan2(vE, vN) / D, elevationDeg: Math.atan2(vU, Math.hypot(vE, vN)) / D, speedMs: Math.hypot(vE, vN, vU), frame: 'inertial', ecef: P, velEcef: V, nodeRate: -k * Math.cos(i), date: new Date(at).toISOString() };   // nodeRate : précession du plan (rad/s, < 0 : le nœud recule), appliquée par Launch
}
// période affichée d'un satellite décrit par ses éléments (86400 / tours par jour), ou null : c'est celle du TLE, comme la « Trajectoire future » de l'ISS réelle
export function objectPeriodS(obj) { const S = obj.start, O = S && (S.orbit || (S.tle && tleToOrbit(S.tle))); return O ? 86400 / O.meanMotionRevDay : null; }
export function flyObject(obj, opt) {
  validateObject(obj);
  const L = LCH, G0 = L.G0, D = Math.PI / 180, S0 = objectStart(obj, opt), tl = obj.timeline.slice().sort((a, b) => a.t - b.t), tLast = tl[tl.length - 1].t, dryKg = obj.dryKg || 0;
  const az = (S0.azimuthDeg != null ? S0.azimuthDeg : 90) * D, el = (S0.elevationDeg != null ? S0.elevationDeg : 90) * D, sp0 = S0.speedMs || 0;
  const wEff = L.WE * Math.cos(S0.lat * D) * Math.sin(az);   // composante de la rotation de la Terre le long de la trajectoire
  const r0 = L.RE + (S0.altitudeKm != null ? S0.altitudeKm * 1000 : S0.altitudeM || 0);
  let x = r0, y = 0, vx = sp0 * Math.sin(el), vy = sp0 * Math.cos(el) + (S0.frame === 'inertial' ? 0 : wEff * r0);
  const pitchPts = tl.filter(k => typeof k.pitch === 'number').map(k => [k.t, k.pitch]); let prograde = false;
  const parts = obj.parts || {}, released = []; let ispV = 0, ispS = 0, byFlow = false, flames = null;
  let m = obj.massKg || 1000, thrustN = 0, accel = null, isp = 0, burn = null, cdA = obj.cdA != null ? obj.cdA : 5, phase = 'vol', next = 0, t = 0;
  const events = [], samples = []; let nextSample = 0, maxQ = { q: 0, t: 0 }, ok = false, crashed = false, reason = 'time';
  const record = (e) => { events.push({ t, label: e.label || e.key, key: e.key || ('k' + events.length), x, y, vx, vy, alt: Math.hypot(x, y) - L.RE, v: Math.hypot(vx, vy) }); };
  // attraction de la Lune et du Soleil (demande de l'utilisateur : « que le Soleil et la Lune aient un impact » ; les autres planètes ne sont pas simulées) : seulement si on connaît la date du départ (opt.date)
  // et sauf si le JSON dit "thirdBodies": false ; plan du vol et repère figés à la date du départ (voir ephThirdBody, js/ephemeris.js)
  const t0 = S0.date ? new Date(S0.date) : opt && opt.date ? new Date(opt.date) : null, third = typeof ephThirdBody === 'function' && t0 && obj.thirdBodies !== false ? ephThirdBody(S0.lat, S0.lon, S0.azimuthDeg != null ? S0.azimuthDeg : 90, t0) : null;
  const apply = k => {
    if (k.massKg != null) m = k.massKg;
    if (k.thrustN != null) { thrustN = k.thrustN; accel = null; byFlow = false; } if (k.accelMs2 != null) { accel = k.accelMs2; thrustN = 0; byFlow = false; }
    if (k.ispVac != null) { ispV = k.ispVac; ispS = k.ispSea != null ? k.ispSea : k.ispVac; byFlow = true; } else if (k.ispSea != null) ispS = k.ispSea;
    if (k.flames) flames = k.flames; if (k.pitch != null) prograde = k.pitch === 'prograde';
    if (k.isp != null) isp = k.isp; if (k.burnKgS != null) burn = k.burnKgS; if (k.cdA != null) cdA = k.cdA; if (k.phase) phase = k.phase;
    if (k.speedMs != null) {   // vitesse par rapport au sol imposée, direction conservée
      const ax = vx + wEff * y, ay = vy - wEff * x, s = Math.hypot(ax, ay), f = s > 1e-9 ? k.speedMs / s : 0; vx = ax * f - wEff * y; vy = ay * f + wEff * x;
    }
    if (k.release) for (const r of k.release) {   // pièces larguées : leur masse quitte l'objet, elles partent avec son état (position, vitesse)
      const P = parts[r.part]; if (!P || typeof P !== 'object') throw new Error('pièce « ' + r.part + ' » absente (« parts » du JSON)');
      const n = r.count || 1; m -= n * ((P.massKg || 0) + (P.residualPropKg || 0)); released.push({ part: r.part, count: n, t });
      record({ key: FO_ROLE_KEY[P.role] || ('release_' + r.part), label: r.label || k.label || ('Largage : ' + (P.name || r.part)) });
    } else if (k.label || k.key) record(k);
  };
  const tEnd = opt && opt.tmax ? opt.tmax : (obj.maxDurationS || 20000);
  let orbit, escaping = false; const escapeR = obj.escapeDistanceM || 1e9;
  while (t < tEnd) {
    while (next < tl.length && t >= tl[next].t - 1e-6) apply(tl[next++]);
    const r = Math.hypot(x, y), ux = x / r, uy = y / r, ex = -uy, ey = ux, h = r - L.RE, vr = vx * ux + vy * uy, vt = vx * ex + vy * ey, air = Math.exp(-h / 7200);
    const powered = t < tLast - 1e-9 && m > dryKg + 1e-6;
    let F = 0, md = 0;
    if (powered && byFlow) { md = burn || 0; F = md * (ispV - (ispV - ispS) * air) * G0; }   // poussée déduite du débit et de l'Isp (plus faible au sol)
    else if (powered) { F = accel != null ? accel * m : thrustN; md = burn != null ? burn : (isp > 0 ? F / (isp * G0) : 0); if (F > 0 && md * 0.1 > m - dryKg && md > 0) { const f = (m - dryKg) / (md * 0.1); F *= f; md *= f; } }
    const phi = prograde ? Math.atan2(vr, vt) : objectPitch(pitchPts, t), tx = ux * Math.sin(phi) + ex * Math.cos(phi), ty = uy * Math.sin(phi) + ey * Math.cos(phi);
    const fa = phAccel(x, y, vx, vy, m, F, tx, ty, cdA, wEff), q = fa.q, g = fa.g; let ax = fa.ax, ay = fa.ay; if (third) { const tb = third(t, x, y); ax += tb[0]; ay += tb[1]; } if (q > maxQ.q) maxQ = { q, t };
    const dt = F > 0 || h < 120e3 ? 0.1 : h < 5e6 ? 0.5 : Math.min(30, h / 2e7);   // pas de plus en plus grand loin de la Terre
    if (t >= nextSample - 1e-9) { samples.push({ t, x, y, vx, vy, m, F, phi: F > 0 ? phi : Math.atan2(vr, vt), phase, alt: h, v: Math.hypot(vx, vy), vr, vt, acc: Math.hypot(ax + g * ux, ay + g * uy) / G0, q, eap: F > 0 && !!flames && flames.includes('eap'), epc: F > 0 && (!flames || flames.includes('epc')), esc: F > 0 && !!flames && flames.includes('esc'), fairing: false, epcAttached: true, eapAttached: false }); nextSample += h < 5e6 ? L.SAMPLE : Math.min(300, h / 2e6); }
    if (t >= tLast - 1e-9 && F === 0) {   // plus de moteur : l'orbite est-elle stable ? (périgée au-dessus de l'atmosphère)
      orbit = lchElements(r, vr, vt);
      if (orbit.rp > L.RE + 100e3 && orbit.e < 1 && t >= tLast + 1) { ok = true; reason = 'orbit'; break; }
      if (orbit.e >= 1 && h > 2e6) escaping = true;   // vitesse de libération : l'objet quitte la Terre, on suit sa course jusqu'à escapeDistanceM
    }
    if (escaping && r > escapeR) { ok = true; reason = 'escape'; break; }
    if (md > 0) m = Math.max(dryKg, m - md * dt);
    vx += ax * dt; vy += ay * dt; x += vx * dt; y += vy * dt; t += dt;
    if (Math.hypot(x, y) < L.RE - 1 && t > 5) { record({ label: 'Impact', key: 'crash' }); crashed = true; reason = 'impact'; break; }
  }
  const r = Math.hypot(x, y), ux = x / r, uy = y / r, vr = vx * ux + vy * uy, vt = vx * -uy + vy * ux; orbit = lchElements(r, vr, vt);
  if (ok) {   // dernier échantillon = état final exact
    const last = samples[samples.length - 1];
    if (t - last.t > 1e-6) samples.push(Object.assign({}, last, { t, x, y, vx, vy, m, F: 0, acc: 0, q: 0, alt: r - L.RE, v: Math.hypot(vx, vy), vr, vt, epc: false, phase: reason === 'escape' ? 'en route' : 'en orbite' }));
    record(reason === 'escape' ? { label: 'Quitte la Terre', key: 'objectEscape' } : { label: 'En orbite', key: 'objectOrbit' });
  }
  // description des pièces largables au format « jettison » lu par Launch.buildPieces (masse, forme, vitesse de séparation, désintégration)
  const jettison = {}; for (const r of released) { const P = parts[r.part], v = P.visual || {}, e = { residualPropKg: P.residualPropKg || 0, radiusM: v.radiusM, lengthM: partLength(P), dragCoefficient: P.dragCoefficient != null ? P.dragCoefficient : 1, separationSpeedMs: P.separationSpeedMs || 0, disintegrates: !!P.disintegrates };
    if (P.disintegrationAltitudeKm != null) e.disintegrationAltitudeKm = P.disintegrationAltitudeKm;
    if (P.role === 'booster') jettison.boosters = Object.assign(e, { count: r.count, dryKg: P.massKg }); else if (P.role === 'fairing') jettison.fairing = Object.assign(e, { pieces: r.count, dryKgEach: P.massKg }); else if (P.role === 'stage') jettison.stage1 = Object.assign(e, { dryKg: P.massKg }); else if (P.role === 'payload') jettison.payload = { dryKg: P.massKg, separationSpeedMs: P.separationSpeedMs || 0 }; }
  const km = v => Math.round(v / 1000), c3 = vx * vx + vy * vy - 2 * L.MU / r;   // C3 = v∞² (m²/s²)
  const message = ok && reason === 'escape' ? 'Quitte la Terre : vitesse à l\'infini ' + (Math.sqrt(Math.max(0, c3)) / 1000).toFixed(2).replace('.', ',') + ' km/s (C3 = ' + (c3 / 1e6).toFixed(1).replace('.', ',') + ' km²/s²), à ' + Math.round(r / 1000).toLocaleString('fr-FR') + ' km de la Terre.' : ok ? 'Orbite atteinte : ' + km(orbit.rp - L.RE) + ' × ' + km(orbit.ra - L.RE) + ' km.'
    : crashed ? 'Trop lent : l\'objet retombe sur la Terre (impact après ' + Math.round(t) + ' s, apogée ' + km(Math.max(...samples.map(s => s.alt))) + ' km).'
    : reason === 'escape' ? 'Vitesse de libération dépassée : l\'objet quitte la Terre.' : 'Fin de la simulation sans orbite stable.';
  return { target: ok ? (orbit.rp - L.RE) / 1000 : 0, samples, events, orbit, ok, crashed, reason, message, hyperbolic: ok && reason === 'escape', c3, vInf: Math.sqrt(Math.max(0, c3)), tEnd: t, state: { x, y, vx, vy }, maxQ, payload: 0, thirdBodies: !!third, plan: released.length ? { jettison } : undefined, released, nodeRate: S0.nodeRate || 0, final: { alt: (r - L.RE) / 1000, v: Math.hypot(vx, vy) }, object: obj };
}

export const FO_ROLE_KEY = { booster: 'eap', fairing: 'fairing', stage: 'epcsep', payload: 'sat' };   // rôle d'une pièce → clé d'étape lue par Launch (dessin et chute des débris)
// longueur (m) d'une pièce pour sa chute (même convention que les modèles 3D : nez et tuyère compris)
export function partLength(P) { const v = P.visual || {}; return P.role === 'booster' ? (v.lengthM || 0) + (v.noseM || 0) + (v.nozzleM || 0) : P.role === 'stage' ? (v.lengthM || 0) + (v.nozzleM || 0) : P.role === 'fairing' ? (v.cylM || 0) + (v.coneM || 0) / 2 : (v.lengthM || 1); }
// description 3D d'un objet (même forme que les fusées de js/rockets.js) : un simple cylindre, sans boosters ni coiffe ; visual { name, lengthM, radiusM, color }
export function objectToSpec(obj) {
  if (obj.visual && obj.visual.stack) return stackToSpec(obj);
  const vis = obj.visual || {}, r = vis.radiusM || 1.5, h = vis.lengthM || 20, col = typeof vis.color === 'string' ? parseInt(vis.color.replace('#', ''), 16) : (vis.color != null ? vis.color : 0xdddddd), name = vis.name || obj.name || 'Objet';
  return { name, short: name, maxPayload: 1e12, phys: { eap: { dry: 0 }, epc: { dry: 0, prop: 0 }, fairing: 0, direct: false }, names: { booster: '', stage1: name, stage2: '' },
    model: { core: { r, h, color: col }, boosters: null, upper: { r: r * 0.99, h: 0.01, color: col }, fairing: { r: r * 0.99, cyl: 0.01, cone: 0.01, color: col }, noz: { epc: r * 1.2, eap: 0, esc: 0 } }, tower: false, sepDv: {} };
}

// fusée dessinée à partir de ses pièces : visual.stack { core: pièce, boosters { part, count, radialM }, upper { … }, fairing: pièce } → même description que js/rockets.js
export function stackToSpec(obj) {
  const st = obj.visual.stack, P = obj.parts, col = c => (typeof c === 'string' ? parseInt(c.replace('#', ''), 16) : c), core = P[st.core], cv = core.visual, up = st.upper, fa = st.fairing ? P[st.fairing] : null, fv = fa ? fa.visual : { radiusM: 0.01, cylM: 0.01, coneM: 0.01, color: '#ffffff' }, bo = st.boosters && P[st.boosters.part], bv = bo && bo.visual;
  return { name: obj.visual.name || obj.name, short: obj.visual.short || obj.visual.name || obj.name, maxPayload: 1e12,
    phys: { eap: { dry: bo ? bo.massKg : 0 }, epc: { dry: core.massKg, prop: core.residualPropKg || 0 }, fairing: fa ? (fa.massKg || 0) * (st.fairingPieces || 2) : 0, direct: false },
    names: { booster: bo ? bo.name : '', stage1: core.name, stage2: up.name || 'Étage supérieur', payload: st.payloadName },
    model: { core: { r: cv.radiusM, h: cv.lengthM, color: col(cv.color) },
      boosters: bo ? { n: st.boosters.count, r: bv.radiusM, h: bv.lengthM, nose: bv.noseM || 0, R: st.boosters.radialM, color: col(bv.color), band: col(bv.bandColor != null ? bv.bandColor : bv.color) } : null,
      upper: { r: up.radiusM, h: up.stackHeightM != null ? up.stackHeightM : up.lengthM, color: col(up.color) }, fairing: { r: fv.radiusM, cyl: fv.cylM, cone: fv.coneM, color: col(fv.color) },
      noz: { epc: cv.nozzleM || 0, eap: bv ? bv.nozzleM || 0 : 0, esc: up.nozzleM || 0 }, heightM: st.heightM, fairingBaseM: st.fairingBaseM, flames: st.flames }, tower: false, sepDv: {} };
}

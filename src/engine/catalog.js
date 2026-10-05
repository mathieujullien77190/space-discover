// Catalogue lu par l'interface (pur, sans DOM ni rendu) : astres du menu, satellites, fusées lançables, caractéristiques de l'ISS.
import { BODY } from './bodies.js';
import { FLIGHT_OBJECTS } from './data/objects.js';
import { FLIGHT_PLANS } from './data/plans.js';
import { ISS_FEATURES, ISS_FROM } from './iss.js';
import { probeDef, probeFrom, probeIds, probeMission } from './probes.js';

const flyable = k => !!FLIGHT_OBJECTS[k] && FLIGHT_OBJECTS[k].kind !== 'body' && FLIGHT_OBJECTS[k].kind !== 'probe' && !FLIGHT_OBJECTS[k].live;

export const viewMenu = () => BODY.menu().map(b => ({ id: b.id, type: b.bodyType, around: b.around || null, label: (b.menu.icon ? b.menu.icon + ' ' : '') + b.name }));   // le menu des planètes = les astres décrits en JSON (menu.order)
export const issFeatures = () => ISS_FEATURES.map(f => ({ id: f.id, label: f.label }));
// satellites et sondes : `from` = date (ms) à partir de laquelle ils existent (l'ISS : 1998 ; une sonde : son lancement + 1 jour) ; `kind` : 'iss' (vue ISS) ou 'probe' (vue d'une sonde rejouée)
export const satellites = () => Object.keys(FLIGHT_OBJECTS).filter(k => FLIGHT_OBJECTS[k].live).map(k => ({ key: k, name: FLIGHT_OBJECTS[k].name, kind: 'iss', from: ISS_FROM })).concat(probeIds().map(k => ({ key: k, name: FLIGHT_OBJECTS[k].name, kind: 'probe', from: probeFrom(k) })));
// fusées lançables : objets JSON génériques (clé « obj:<nom> ») puis plans de vol (clé = nom du plan)
export const rocketList = () => Object.keys(FLIGHT_OBJECTS).filter(flyable).map(k => ({ key: 'obj:' + k, label: '🧪 ' + FLIGHT_OBJECTS[k].name })).concat(Object.keys(FLIGHT_PLANS).map(k => ({ key: k, label: FLIGHT_PLANS[k].name })));

// ---------- fiche d'un astre (illustration + caractéristiques) ----------
const KIND = { planet: 'Planète', dwarf: 'Planète naine', moon: 'Lune naturelle', star: 'Étoile', comet: 'Comète', asteroid: 'Astéroïde' };
const fr = (v, d = 0) => v.toLocaleString('fr-FR', { maximumFractionDigits: d });
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sci = v => { const e = Math.floor(Math.log10(v)); return fr(v / Math.pow(10, e), 2) + ' × 10' + String(e).split('').map(c => SUP[c]).join(''); };
const fmtDuration = days => days < 2 ? Math.floor(days * 24) + ' h ' + String(Math.round((days * 24 % 1) * 60)).padStart(2, '0') + ' min' : days < 1000 ? fr(days, 1) + ' jours' : fr(days / 365.25, 1) + ' ans';
const G = 6.6743e-11;
// fiche d'un satellite (ISS) : orbite calculée d'après ses éléments (altitude moyenne, période, inclinaison) + faits du JSON
const satelliteCard = (id, o) => {
  const orb = o.start && o.start.orbit, facts = [];
  if (orb) { const T = 86400 / orb.meanMotionRevDay, a = Math.cbrt(398600.4418 * T * T / (4 * Math.PI * Math.PI)); facts.push({ label: 'Altitude moyenne', value: '≈ ' + fr(a - 6378.137, 0) + ' km' }, { label: 'Vitesse', value: '≈ ' + fr(2 * Math.PI * a / T, 2) + ' km/s' }, { label: 'Période orbitale', value: fr(T / 60, 1) + ' min (' + fr(orb.meanMotionRevDay, 1) + ' tours par jour)' }, { label: 'Inclinaison', value: fr(orb.inclinationDeg, 1) + '°' }); }
  for (const f of o.card.facts || []) facts.push({ label: f.label, value: f.value });
  return { id, name: (o.visual && o.visual.name) || o.name, kind: o.card.kind || 'Satellite', canNorth: false, canOrbit: false, image: 'objects/' + id + '/' + (o.card.image || 'card.png'), facts };
};
// fiche d'une sonde rejouée : énergie de départ, rendez-vous et vitesse calculés par la mission (mission.js) + faits du JSON
const probeCard = (id, o) => {
  const m = probeMission(id), def = probeDef(id), facts = [{ label: 'Énergie au départ (C3)', value: fr(m.departure.c3, 0) + ' km²/s²' }, { label: 'Rendez-vous', value: def.mission.waypoints.map(w => (BODY.get(w.body) || { name: w.body }).name).join(', ') }];
  for (const f of o.card.facts || []) facts.push({ label: f.label, value: f.value });
  return { id, name: o.name, kind: o.card.kind || 'Sonde spatiale', canNorth: false, canOrbit: false, image: 'objects/' + id + '/' + (o.card.image || 'card.png'), facts };
};
// fiche d'un astre : { id, name, kind, image (chemin relatif à la racine du site), facts [{ label, value }] } ; null si l'astre n'a pas de section « card » dans son JSON
export const bodyCard = id => {
  const o = FLIGHT_OBJECTS[id], b = BODY.get(id) || (o && (o.live || o.kind === 'probe') ? o : null); if (!b || !b.card) return null;
  if (b.live) return satelliteCard(id, b);
  if (b.kind === 'probe') return probeCard(id, b);
  const facts = [{ label: 'Diamètre', value: fr(2 * b.radiusKm, b.radiusKm < 100 ? 1 : 0) + ' km' }];
  if (b.massKg) { const mu = b.muM3S2 || G * b.massKg, g = mu / Math.pow(b.radiusKm * 1000, 2); facts.push({ label: 'Masse', value: sci(b.massKg) + ' kg' }, { label: 'Gravité en surface', value: fr(g, g < 0.01 ? 4 : 2) + ' m/s²' }); }
  const spin = b.rotationRadS ? 2 * Math.PI / b.rotationRadS / 86400 : b.rotation ? 360 / b.rotation.rateDegPerDay : 0;
  if (spin) facts.push({ label: 'Jour (rotation)', value: fmtDuration(spin) });
  const m = b.motion || {}, parent = b.around && b.around !== 'sun' ? BODY.get(b.around) : null;
  if (b.orientation === 'tidal-lock' && m.periodDays) facts.push({ label: 'Jour (rotation)', value: fmtDuration(m.periodDays) + ' (synchrone)' });
  if (parent && m.semiMajorAxisKm) facts.push({ label: 'Distance à ' + parent.name, value: fr(m.semiMajorAxisKm) + ' km' }, { label: 'Période orbitale', value: fmtDuration(m.periodDays) });
  if (m.periodDays && b.around === 'sun') facts.push({ label: b.bodyType === 'comet' ? 'Période orbitale' : 'Année', value: fmtDuration(m.periodDays) });
  if (m.semiMajorAxisKm && b.around === 'sun') facts.push({ label: b.bodyType === 'comet' ? 'Distance moyenne au Soleil' : 'Distance au Soleil', value: fr(m.semiMajorAxisKm / 149597870.7, 2) + ' UA' });
  for (const f of b.card.facts || []) facts.push({ label: f.label, value: f.value });
  return { id, name: b.name, kind: KIND[b.bodyType] || '', canNorth: !!(b.rotation || b.sceneOrigin || b.orientation === 'tidal-lock'), canOrbit: !!b.around, image: 'objects/' + id + '/' + (b.card.image || 'card.png'), facts };
};
// missions historiques lançables : sonde dont le JSON a un `launcher` (fusée simulée) ; date = jour du lancement
export const missionLaunches = () => probeIds().filter(k => probeDef(k).launcher).map(k => { const d = Date.parse(probeDef(k).mission.launch.date); return { key: k, date: d, label: '🚀 ' + FLIGHT_OBJECTS[k].name + ' — ' + new Date(d).toLocaleDateString('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }) }; });

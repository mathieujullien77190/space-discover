// Catalogue lu par l'interface (pur, sans DOM ni rendu) : astres du menu, caractéristiques de l'ISS, fiches.
import { BODY } from './bodies.js';
import { FLIGHT_OBJECTS } from './data/objects.js';
import { ISS_FEATURES } from './iss.js';


export const viewMenu = () => BODY.menu().map(b => ({ id: b.id, type: b.bodyType, around: b.around || null, label: (b.menu.icon ? b.menu.icon + ' ' : '') + b.name }));   // le menu des planètes = les astres décrits en JSON (menu.order)
export const issFeatures = () => ISS_FEATURES.map(f => ({ id: f.id, label: f.label }));

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
// fiche d'un astre : { id, name, kind, image (chemin relatif à la racine du site), facts [{ label, value }] } ; null si l'astre n'a pas de section « card » dans son JSON
// fiche du Concorde (objet « live » sans JSON d'astre) : faits écrits DE MÉMOIRE (à vérifier)
const concordeCard = () => ({ id: 'concorde', name: 'Concorde (Air France)', kind: 'Avion de ligne supersonique', canNorth: false, canOrbit: false, image: 'data/concorde/card.png', facts: [
  { label: 'Longueur', value: '61,66 m' }, { label: 'Envergure', value: '25,6 m' }, { label: 'Hauteur', value: '12,2 m' }, { label: 'Croisière', value: 'Mach 2,02 (≈ 2 150 km/h) à 18 000 m' },
  { label: 'Paris → New York', value: '≈ 3 h 30 (AF002 : départ 10 h 30, arrivée 8 h 25 heure locale)' }, { label: 'New York → Paris', value: '≈ 3 h 30 (AF001 : départ 8 h 00, arrivée 17 h 45 heure locale)' },
  { label: 'Réacteurs', value: '4 Olympus 593 (Rolls-Royce / Snecma)' }, { label: 'Passagers', value: '≈ 100' }, { label: 'Service Air France', value: '21 janvier 1976 – 24 octobre 2003' } ] });
export const bodyCard = id => {
  if (id === 'concorde') return concordeCard();
  const o = FLIGHT_OBJECTS[id], b = BODY.get(id) || (o && o.live ? o : null); if (!b || !b.card) return null;
  if (b.live) return satelliteCard(id, b);
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


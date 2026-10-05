// Catalogue lu par l'interface (pur, sans DOM ni rendu) : astres du menu, satellites, fusées lançables, caractéristiques de l'ISS.
import { BODY } from './bodies.js';
import { FLIGHT_OBJECTS } from './data/objects.js';
import { FLIGHT_PLANS } from './data/plans.js';
import { ISS_FEATURES } from './iss.js';

const flyable = k => !!FLIGHT_OBJECTS[k] && FLIGHT_OBJECTS[k].kind !== 'body' && !FLIGHT_OBJECTS[k].live;

export const viewMenu = () => BODY.menu().map(b => ({ id: b.id, type: b.bodyType, around: b.around || null, label: (b.menu.icon ? b.menu.icon + ' ' : '') + b.name }));   // le menu des planètes = les astres décrits en JSON (menu.order)
export const issFeatures = () => ISS_FEATURES.map(f => ({ id: f.id, label: f.label }));
export const satellites = () => Object.keys(FLIGHT_OBJECTS).filter(k => FLIGHT_OBJECTS[k].live).map(k => ({ key: k, name: FLIGHT_OBJECTS[k].name }));
// fusées lançables : objets JSON génériques (clé « obj:<nom> ») puis plans de vol (clé = nom du plan)
export const rocketList = () => Object.keys(FLIGHT_OBJECTS).filter(flyable).map(k => ({ key: 'obj:' + k, label: '🧪 ' + FLIGHT_OBJECTS[k].name })).concat(Object.keys(FLIGHT_PLANS).map(k => ({ key: k, label: FLIGHT_PLANS[k].name })));

// ---------- fiche d'un astre (illustration + caractéristiques) ----------
const KIND = { planet: 'Planète', dwarf: 'Planète naine', moon: 'Lune naturelle', star: 'Étoile', comet: 'Comète', asteroid: 'Astéroïde' };
const fr = (v, d = 0) => v.toLocaleString('fr-FR', { maximumFractionDigits: d });
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sci = v => { const e = Math.floor(Math.log10(v)); return fr(v / Math.pow(10, e), 2) + ' × 10' + String(e).split('').map(c => SUP[c]).join(''); };
const fmtDuration = days => days < 2 ? Math.floor(days * 24) + ' h ' + String(Math.round((days * 24 % 1) * 60)).padStart(2, '0') + ' min' : days < 1000 ? fr(days, 1) + ' jours' : fr(days / 365.25, 1) + ' ans';
const G = 6.6743e-11;
// fiche d'un astre : { id, name, kind, image (chemin relatif à la racine du site), facts [{ label, value }] } ; null si l'astre n'a pas de section « card » dans son JSON
export const bodyCard = id => {
  const b = BODY.get(id); if (!b || !b.card) return null;
  const facts = [{ label: 'Diamètre', value: fr(2 * b.radiusKm, b.radiusKm < 100 ? 1 : 0) + ' km' }];
  if (b.massKg) { const mu = b.muM3S2 || G * b.massKg, g = mu / Math.pow(b.radiusKm * 1000, 2); facts.push({ label: 'Masse', value: sci(b.massKg) + ' kg' }, { label: 'Gravité en surface', value: fr(g, g < 0.01 ? 4 : 2) + ' m/s²' }); }
  const spin = b.rotationRadS ? 2 * Math.PI / b.rotationRadS / 86400 : b.rotation ? 360 / b.rotation.rateDegPerDay : 0;
  if (spin) facts.push({ label: 'Jour (rotation)', value: fmtDuration(spin) });
  const m = b.motion || {};
  if (m.periodDays && b.around === 'sun') facts.push({ label: b.bodyType === 'comet' ? 'Période orbitale' : 'Année', value: fmtDuration(m.periodDays) });
  if (m.semiMajorAxisKm && b.around === 'sun') facts.push({ label: b.bodyType === 'comet' ? 'Distance moyenne au Soleil' : 'Distance au Soleil', value: fr(m.semiMajorAxisKm / 149597870.7, 2) + ' UA' });
  for (const f of b.card.facts || []) facts.push({ label: f.label, value: f.value });
  return { id, name: b.name, kind: KIND[b.bodyType] || '', image: 'objects/' + id + '/' + (b.card.image || 'card.png'), facts };
};

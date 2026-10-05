// Catalogue lu par l'interface (pur, sans DOM ni rendu) : astres du menu, satellites, fusées lançables, caractéristiques de l'ISS, descriptions textuelles.
import { BODY } from './bodies.js';
import { FLIGHT_OBJECTS } from './data/objects.js';
import { FLIGHT_PLANS, FLIGHT_PLAN_FILES } from './data/plans.js';
import { LCH } from './launch.js';
import { objectStart, tleToOrbit, validateObject } from './flight-object.js';
import { planToSpec } from './flight-plan.js';
import { ISS_FEATURES } from './iss.js';

const flyable = k => !!FLIGHT_OBJECTS[k] && FLIGHT_OBJECTS[k].kind !== 'body' && !FLIGHT_OBJECTS[k].live;
const fmtPeriod = (km, apo) => { const T = 2 * Math.PI * Math.sqrt(Math.pow(LCH.RE + (apo != null ? (km + apo) / 2 : km) * 1000, 3) / LCH.MU) / 60; return T < 180 ? Math.round(T) + ' min' : (T / 60).toFixed(1).replace('.', ',') + ' h'; };

export const viewMenu = () => BODY.menu().map(b => ({ id: b.id, label: (b.menu.icon ? b.menu.icon + ' ' : '') + b.name }));   // le sélecteur de vues = les astres décrits en JSON (menu.order)
export const issFeatures = () => ISS_FEATURES.map(f => ({ id: f.id, label: f.label }));
export const satellites = () => Object.keys(FLIGHT_OBJECTS).filter(k => FLIGHT_OBJECTS[k].live).map(k => ({ key: k, name: FLIGHT_OBJECTS[k].name }));
// fusées lançables : objets JSON génériques (clé « obj:<nom> ») puis plans de vol (clé = nom du plan)
export const rocketList = () => Object.keys(FLIGHT_OBJECTS).filter(flyable).map(k => ({ key: 'obj:' + k, label: '🧪 ' + FLIGHT_OBJECTS[k].name })).concat(Object.keys(FLIGHT_PLANS).map(k => ({ key: k, label: FLIGHT_PLANS[k].name })));
export const rocketOf = key => key.startsWith('obj:') ? FLIGHT_OBJECTS[key.slice(4)] : FLIGHT_PLANS[key];

const describeObj = O => {
  const k = O.timeline.slice().sort((a, b) => a.t - b.t), m0 = (k.find(x => x.massKg != null) || {}).massKg || O.massKg, st = objectStart(O, { date: new Date() }), s = O.start, v = st.speedMs || 0, orb = s.orbit || s.tle;
  if (orb) { const o = s.orbit || tleToOrbit(s.tle); return 'Satellite : ' + ((O.visual && O.visual.name) || O.name) + '\nOrbite : altitude ' + Math.round(st.altitudeM / 1000) + ' km, inclinaison ' + o.inclinationDeg + '°, ' + Math.round(86400 / o.meanMotionRevDay / 60 * 10) / 10 + ' min par tour\nPosition de départ : ' + st.lat.toFixed(1) + '°, ' + st.lon.toFixed(1) + '° (' + (s.at === 'now' ? 'maintenant' : 'à la date du JSON') + ')\nSes paramètres orbitaux sont ceux de l’ISS réelle : même chemin.'; }
  return 'Objet : ' + ((O.visual && O.visual.name) || O.name) + '\nDépart : ' + s.lat + '°, ' + s.lon + '°, altitude ' + (s.altitudeKm || 0) + ' km, vitesse ' + Math.round(v) + ' m/s\nMasse de départ : ' + Math.round(m0 / 100) / 10 + ' t, ' + k.length + ' paliers jusqu’à T+' + k[k.length - 1].t + ' s, puis vol sans moteur.\nObjet décrit par un JSON minimal : une vitesse insuffisante et il retombe.';
};
// texte explicatif d'un plan de vol ou d'un objet (une ligne vide entre les phrases : texte aéré)
export const describeRocket = (P, key, custom) => {
  let t;
  if (P.timeline) t = describeObj(P);
  else { const sp = planToSpec(P), ret = P.returns && P.returns.stage1; t = 'Base : ' + P.site.name + '\nFusée : ' + sp.name + '\nSatellite de ' + (P.vehicle.payloadKg / 1000) + ' t sur une orbite circulaire de ' + P.target.altitudeKm + ' km (' + fmtPeriod(P.target.altitudeKm) + ' par tour).' + (ret ? '\nLe booster revient se poser sur la tour (boostback, atterrissage).' : ''); }
  return t.split('\n').join('\n\n');
};
// plan ou objet envoyé par l'utilisateur : lève une Error lisible si incomplet
export const validateRocket = P => {
  if (P.timeline) validateObject(P);
  else for (const k of ['site', 'vehicle', 'pitch', 'events', 'target']) if (!P[k]) throw new Error('champ « ' + k + ' » manquant');
  return P;
};

// Sondes rejouées (objets JSON « kind: probe ») : accès aux missions calculées (src/engine/mission.js). Pur (sans three.js).
import { BODY } from './bodies.js';
import { FLIGHT_OBJECTS } from './data/objects.js';
import { EPH } from './ephemeris.js';
import { buildMission } from './mission.js';

const G = 6.6743e-11, cache = {};
// environnement des missions : positions héliocentriques des planètes (BODY.rel, mètres, axes de la scène), masses, rayons, jours depuis J2000
export const missionEnv = () => ({
  rel: (id, D) => BODY.rel(id, D),
  mu: id => { const b = BODY.get(id); return b.muM3S2 || G * b.massKg; },
  radiusKm: id => BODY.get(id).radiusKm,
  days: ms => EPH.days(ms),
});
export const probeIds = () => Object.keys(FLIGHT_OBJECTS).filter(k => FLIGHT_OBJECTS[k].kind === 'probe').sort((a, b) => FLIGHT_OBJECTS[a].menu.order - FLIGHT_OBJECTS[b].menu.order);
export const probeDef = id => FLIGHT_OBJECTS[id] && FLIGHT_OBJECTS[id].kind === 'probe' ? FLIGHT_OBJECTS[id] : null;
export const probeMission = id => cache[id] || (cache[id] = buildMission(FLIGHT_OBJECTS[id].mission, missionEnv()));
// date (ms) à partir de laquelle la sonde est affichée : son lancement + 1 jour (avant, c'est le lanceur qui est simulé)
export const probeFrom = id => Date.parse(FLIGHT_OBJECTS[id].exists.from) + 86400000;

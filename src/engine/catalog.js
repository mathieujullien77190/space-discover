// Catalogue lu par l'interface (pur, sans DOM ni rendu) : astres du menu, satellites, fusées lançables, caractéristiques de l'ISS.
import { BODY } from './bodies.js';
import { FLIGHT_OBJECTS } from './data/objects.js';
import { FLIGHT_PLANS } from './data/plans.js';
import { ISS_FEATURES } from './iss.js';

const flyable = k => !!FLIGHT_OBJECTS[k] && FLIGHT_OBJECTS[k].kind !== 'body' && !FLIGHT_OBJECTS[k].live;

export const viewMenu = () => BODY.menu().map(b => ({ id: b.id, type: b.bodyType, label: (b.menu.icon ? b.menu.icon + ' ' : '') + b.name }));   // le menu des planètes = les astres décrits en JSON (menu.order)
export const issFeatures = () => ISS_FEATURES.map(f => ({ id: f.id, label: f.label }));
export const satellites = () => Object.keys(FLIGHT_OBJECTS).filter(k => FLIGHT_OBJECTS[k].live).map(k => ({ key: k, name: FLIGHT_OBJECTS[k].name }));
// fusées lançables : objets JSON génériques (clé « obj:<nom> ») puis plans de vol (clé = nom du plan)
export const rocketList = () => Object.keys(FLIGHT_OBJECTS).filter(flyable).map(k => ({ key: 'obj:' + k, label: '🧪 ' + FLIGHT_OBJECTS[k].name })).concat(Object.keys(FLIGHT_PLANS).map(k => ({ key: k, label: FLIGHT_PLANS[k].name })));

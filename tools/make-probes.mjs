// Fabrique les SONDES rejouées d'après l'histoire : public/objects/<sonde>/<sonde>.json (kind « probe ») + card.png (illustration dessinée).
// La trajectoire n'est PAS écrite : elle est CALCULÉE par src/engine/mission.js d'après les dates des rendez-vous et les positions des planètes (arcs de Lambert + survols).
// Dates, périgées de survol, latitudes de sortie, masses et faits : écrits DE MÉMOIRE (à vérifier) ; périgées = distance au CENTRE de la planète (altitude au-dessus des nuages + rayon).
// Usage : node tools/make-probes.mjs puis node tools/make-objects.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), R = { jupiter: 71492, saturn: 60268, uranus: 25559, neptune: 24764, pluto: 1188 };
const NOTE = "Mission REJOUÉE d'après l'histoire (src/engine/mission.js) : la trajectoire est calculée d'après les dates des rendez-vous et les positions des planètes. Dates, périgées (distance au centre de la planète), latitude de sortie, masse et faits ÉCRITS DE MÉMOIRE (à vérifier).";
const PROBES = [
  { id: 'voyager2', name: 'Voyager 2', launcher: 'voyager', order: 7.2, color: '#ffd54a', dish: 3.7, launch: '1977-08-20T14:29:00Z', vehicle: 'Titan IIIE-Centaur, Cap Canaveral', massKg: 722,
    waypoints: [['jupiter', '1979-07-09T22:29:00Z', 570000 + R.jupiter, 'Survol de Jupiter'], ['saturn', '1981-08-26T03:24:00Z', 101000 + R.saturn, 'Survol de Saturne'], ['uranus', '1986-01-24T17:59:00Z', 81500 + R.uranus, 'Survol d’Uranus'], ['neptune', '1989-08-25T03:56:00Z', 4950 + R.neptune, 'Survol de Neptune', -48]],
    facts: [['Lancement', '20 août 1977 (Titan IIIE-Centaur)'], ['Jupiter', '9 juillet 1979'], ['Saturne', '26 août 1981'], ['Uranus', '24 janvier 1986 (seule sonde à y être passée)'], ['Neptune', '25 août 1989 (seule sonde à y être passée)'], ['Masse', '≈ 722 kg'], ['Statut', 'dans l’espace interstellaire depuis novembre 2018']] },
  { id: 'voyager1', name: 'Voyager 1', order: 7.1, color: '#ffe38a', dish: 3.7, launch: '1977-09-05T12:56:00Z', vehicle: 'Titan IIIE-Centaur, Cap Canaveral', massKg: 722,
    waypoints: [['jupiter', '1979-03-05T12:05:00Z', 349000, 'Survol de Jupiter'], ['saturn', '1980-11-12T23:46:00Z', 124000 + R.saturn, 'Survol de Saturne', 35]],
    facts: [['Lancement', '5 septembre 1977 (Titan IIIE-Centaur)'], ['Jupiter', '5 mars 1979'], ['Saturne', '12 novembre 1980'], ['Masse', '≈ 722 kg'], ['Statut', 'l’objet construit par l’humanité le plus lointain ; héliopause franchie en août 2012']] },
  { id: 'pioneer10', name: 'Pioneer 10', order: 7.3, color: '#9fd0ff', dish: 2.74, launch: '1972-03-03T01:49:00Z', vehicle: 'Atlas-Centaur, Cap Canaveral', massKg: 258,
    waypoints: [['jupiter', '1973-12-03T02:26:00Z', 130000 + R.jupiter, 'Survol de Jupiter', undefined, 'in', 1]],
    facts: [['Lancement', '3 mars 1972 (Atlas-Centaur)'], ['Jupiter', '3 décembre 1973 : première sonde à y passer'], ['Masse', '≈ 258 kg'], ['Dernier signal', 'janvier 2003'], ['Plaque', 'message gravé pour d’éventuels extraterrestres']] },
  { id: 'pioneer11', name: 'Pioneer 11', order: 7.4, color: '#b7e1ff', dish: 2.74, launch: '1973-04-06T02:11:00Z', vehicle: 'Atlas-Centaur, Cap Canaveral', massKg: 259,
    waypoints: [['jupiter', '1974-12-03T05:21:00Z', 34000 + R.jupiter, 'Survol de Jupiter'], ['saturn', '1979-09-01T16:29:00Z', 21000 + R.saturn, 'Survol de Saturne', 17]],
    facts: [['Lancement', '6 avril 1973 (Atlas-Centaur)'], ['Jupiter', '3 décembre 1974'], ['Saturne', '1er septembre 1979 : première sonde à y passer'], ['Masse', '≈ 259 kg'], ['Dernier contact', 'novembre 1995']] },
  { id: 'newhorizons', name: 'New Horizons', order: 7.5, color: '#ffb36b', dish: 2.1, launch: '2006-01-19T19:00:00Z', vehicle: 'Atlas V 551, Cap Canaveral', massKg: 478,
    waypoints: [['jupiter', '2007-02-28T05:43:00Z', 2300000, 'Survol de Jupiter'], ['pluto', '2015-07-14T11:49:00Z', 12500 + R.pluto, 'Survol de Pluton', undefined, 'in', 1]],
    facts: [['Lancement', '19 janvier 2006 (Atlas V 551)'], ['Jupiter', '28 février 2007'], ['Pluton', '14 juillet 2015 : première visite'], ['Arrokoth', '1er janvier 2019'], ['Masse', '≈ 478 kg'], ['Vitesse au départ', 'la plus rapide jamais lancée depuis la Terre (≈ 16 km/s)']] },
];

// illustration : sonde vue de côté (antenne parabolique, corps, mâts, générateur) en aplats
const draw = p => {
  const S = 360, c = createCanvas(S, S), g = c.getContext('2d'), line = '#1c2430', rect = (x, y, w, h, f) => { g.fillStyle = f; g.fillRect(x, y, w, h); g.lineWidth = 2; g.strokeStyle = line; g.strokeRect(x, y, w, h); };
  const big = p.dish > 3, rd = big ? 120 : 100;
  rect(60, 262, 240, 8, '#b9bec9'); rect(250, 250, 40, 32, '#7a7f8c');   // mât du générateur (RTG)
  rect(40, 150, 6, 112, '#b9bec9'); rect(28, 142, 30, 14, '#a7acb8');   // mât scientifique
  g.beginPath(); g.moveTo(180 - rd, 120); g.quadraticCurveTo(180, 190, 180 + rd, 120); g.quadraticCurveTo(180, 70, 180 - rd, 120); g.closePath(); g.fillStyle = '#eef0f4'; g.fill(); g.lineWidth = 3; g.strokeStyle = line; g.stroke();   // antenne
  g.beginPath(); g.moveTo(180, 118); g.lineTo(180, 60); g.lineWidth = 4; g.stroke(); rect(172, 50, 16, 14, '#caa24a');
  rect(140, 190, 80, 56, p.color); rect(150, 200, 60, 12, '#2d5fa8'); rect(150, 224, 60, 12, '#2d5fa8');   // corps
  return c;
};
const out = (id, f) => path.join(root, 'public', 'objects', id, f);
for (const p of PROBES) {
  fs.mkdirSync(path.dirname(out(p.id, 'x')), { recursive: true });
  const json = {
    kind: 'probe', name: p.name, massKg: p.massKg, ...(p.launcher ? { launcher: p.launcher } : {}), exists: { _note: 'La sonde n\'existe qu\'à partir de son lancement (+ 1 jour : avant, c\'est le lanceur qui est simulé).', from: p.launch },
    mission: { _note: NOTE, launch: { date: p.launch, from: 'earth', vehicle: p.vehicle }, waypoints: p.waypoints.map(([body, date, periapsisKm, label, exitLatitudeDeg, plane, sign]) => Object.assign({ body, date, periapsisKm, label }, exitLatitudeDeg !== undefined ? { exitLatitudeDeg } : {}, plane ? { plane, sign } : {})) },
    appearance: { color: p.color, dishM: p.dish }, trace: { color: p.color }, dot: { color: p.color, minDistanceUnits: 0 },
    label: { text: p.name, minDistanceUnits: 0 },
    menu: { order: p.order, icon: '🛰', view: { distanceUnits: 0.00002, text: 'Vue de ' + p.name + ' : trajectoire rejouée d’après l’histoire (positions des planètes aux dates des survols)' } },
    card: { _note: NOTE, kind: 'Sonde spatiale', image: 'card.png', facts: p.facts.map(([label, value]) => ({ label, value })) },
  };
  fs.writeFileSync(out(p.id, p.id + '.json'), JSON.stringify(json, null, 2) + '\n');
  fs.writeFileSync(out(p.id, 'card.png'), draw(p).toBuffer('image/png'));
  console.log(p.id, p.waypoints.length, 'rendez-vous');
}

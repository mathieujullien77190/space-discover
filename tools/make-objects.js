// Écrit src/engine/data/objects.js : copie embarquée de tous les objets de objects/<nom>/<nom>.json (la page s'ouvre aussi en file://, où fetch ne lit pas les fichiers locaux).
// Un objet = UN DOSSIER : objects/<nom>/ contient <nom>.json et, s'il en a, son modèle 3D (ex. objects/iss/iss-nasa.glb, référencé par "model": { "file": … } dans le JSON).
// Les pièces larguables d'un objet (« parts » : booster.json, fairing.json…) sont des JSON du même dossier, intégrés à la copie.
// Ajouter un objet : créer son dossier, y poser <nom>.json (+ le modèle), puis `node tools/make-objects.js`.
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..'), dir = path.join(root, 'public', 'objects'), objs = {}, files = {};
for (const k of fs.readdirSync(dir).filter(d => fs.existsSync(path.join(dir, d, d + '.json'))).sort()) {
  const o = objs[k] = JSON.parse(fs.readFileSync(path.join(dir, k, k + '.json'), 'utf8')); files[k] = 'objects/' + k + '/' + k + '.json';
  for (const [n, f] of Object.entries(o.parts || {})) if (typeof f === 'string') o.parts[n] = JSON.parse(fs.readFileSync(path.join(dir, k, f), 'utf8'));   // pièces larguables (booster, coiffe…) : un JSON chacune dans le dossier, intégrées ici
}
const NL = String.fromCharCode(10);
fs.writeFileSync(path.join(root, 'src', 'engine', 'data', 'objects.js'), '// GÉNÉRÉ par tools/make-objects.js à partir de objects/*/*.json : ne pas éditer (modifier le JSON puis `node tools/make-objects.js`).' + NL + 'export const FLIGHT_OBJECTS = ' + JSON.stringify(objs) + ';' + NL + 'export const FLIGHT_OBJECT_FILES = ' + JSON.stringify(files) + ';' + NL);
console.log('objets embarqués : ' + Object.keys(objs).join(', '));
// (les histoires et les plans de vol sont archivés dans _archive/fusees-histoires/ : plus de src/engine/data/stories.js ni plans.js)

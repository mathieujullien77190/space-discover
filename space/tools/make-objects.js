// Écrit js/data/objects.js : copie embarquée de tous les objets de objects/<nom>/<nom>.json (la page s'ouvre aussi en file://, où fetch ne lit pas les fichiers locaux).
// Un objet = UN DOSSIER : objects/<nom>/ contient <nom>.json et, s'il en a, son modèle 3D (ex. objects/iss/iss-nasa.glb, référencé par "model": { "file": … } dans le JSON).
// Ajouter un objet : créer son dossier, y poser <nom>.json (+ le modèle), puis `node tools/make-objects.js`.
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..'), dir = path.join(root, 'objects'), objs = {}, files = {};
for (const k of fs.readdirSync(dir).filter(d => fs.existsSync(path.join(dir, d, d + '.json'))).sort()) { objs[k] = JSON.parse(fs.readFileSync(path.join(dir, k, k + '.json'), 'utf8')); files[k] = 'objects/' + k + '/' + k + '.json'; }
const NL = String.fromCharCode(10);
fs.writeFileSync(path.join(root, 'js', 'data', 'objects.js'), '// GÉNÉRÉ par tools/make-objects.js à partir de objects/*/*.json : ne pas éditer (modifier le JSON puis `node tools/make-objects.js`).' + NL + 'const FLIGHT_OBJECTS = ' + JSON.stringify(objs) + ';' + NL + 'const FLIGHT_OBJECT_FILES = ' + JSON.stringify(files) + ';' + NL);
console.log('objets embarqués : ' + Object.keys(objs).join(', '));

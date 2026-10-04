// Écrit js/data/objects.js : copie embarquée de tous les objets de data/objects/*.json (la page s'ouvre aussi en file://, où fetch ne lit pas les fichiers locaux).
// Ajouter un objet : poser son JSON dans data/objects/ puis `node tools/make-objects.js`.
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..'), dir = path.join(root, 'data', 'objects'), objs = {}, files = {};
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) { const k = f.replace(/\.json$/, ''); objs[k] = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); files[k] = 'data/objects/' + f; }
const NL = String.fromCharCode(10);
fs.writeFileSync(path.join(root, 'js', 'data', 'objects.js'), '// GÉNÉRÉ par tools/make-objects.js à partir de data/objects/*.json : ne pas éditer (modifier le JSON puis `node tools/make-objects.js`).' + NL + 'const FLIGHT_OBJECTS = ' + JSON.stringify(objs) + ';' + NL + 'const FLIGHT_OBJECT_FILES = ' + JSON.stringify(files) + ';' + NL);
console.log('objets embarqués : ' + Object.keys(objs).join(', '));

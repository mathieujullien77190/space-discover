// node tools/make-apollo.js [tli]  : génère js/data/apollo11.js (voir apollo-gen.js et apollo-gen2.js)
// La recherche de la TLI est lente : son résultat est gardé dans tools/apollo-cache.json (supprimer le fichier pour la refaire).
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..'), ctx = { console, Math, Date, JSON }; vm.createContext(ctx);
for (const f of ['js/physics.js', 'js/launch.js', 'js/rockets.js', 'tools/apollo-gen.js', 'tools/apollo-gen2.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
ctx.__log = s => console.log(s);
const cacheFile = path.join(__dirname, 'apollo-cache.json');
ctx.__cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : null;
ctx.__saveCache = c => fs.writeFileSync(cacheFile, JSON.stringify(c));
if (process.env.DBG) ctx.__dbg = (a, b, d) => { if (a === 20 && b % 100 === 0) console.log('dbg', a, b, 'alt min', Math.round(d.minAlt), 'throttle', d.maxThrottle.toFixed(2), 'mEnd', Math.round(d.mEnd)); };
if (process.env.PERI) ctx.__peri = +process.env.PERI;
const t0 = Date.now();
const out = vm.runInContext('JSON.stringify(generateApollo(__log, __cache))', ctx), res = JSON.parse(out);
fs.writeFileSync(cacheFile, JSON.stringify(res.cache));
delete res.cache;
console.log(JSON.stringify(res.stats, null, 1));
for (const e of res.ev) console.log((e.t / 3600).toFixed(2).padStart(8) + ' h  ' + e.key.padEnd(8) + e.label);
fs.mkdirSync(path.join(root, 'js/data'), { recursive: true });
fs.writeFileSync(path.join(root, 'js/data/apollo11.js'), '// GÉNÉRÉ par tools/make-apollo.js : ne pas éditer. Mission Apollo 11 (trajectoire calculée, valeurs de mémoire à vérifier).\nconst APOLLO11 = ' + JSON.stringify(res) + ';\n');
console.log('écrit js/data/apollo11.js (' + Math.round(fs.statSync(path.join(root, 'js/data/apollo11.js')).size / 1024) + ' Ko) en ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');

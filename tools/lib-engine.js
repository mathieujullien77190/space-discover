// Charge le moteur (src/engine, modules ES) dans un contexte vm sous forme de globales : esbuild produit un bundle IIFE (three et satellite.js inclus) dont tous les exports sont recopiés sur le contexte.
// Utilisé par les générateurs (make-*.js) et par les tests (tools/test/engine-loader.mjs).
const fs = require('fs'), path = require('path'), vm = require('vm'), { buildSync } = require('esbuild');
const root = path.join(__dirname, '..'), engine = path.join(root, 'src', 'engine');
const modules = fs.readdirSync(engine).filter(f => f.endsWith('.js') && !['index.js', 'config.js'].includes(f))
  .concat(fs.readdirSync(path.join(engine, 'data')).filter(f => f.endsWith('.js') && !/^(surface|earth-borders)/.test(f)).map(f => 'data/' + f), ['config.js']);
let cached = null;
const bundleSync = () => cached || (cached = buildSync({
  stdin: { contents: modules.map((m, i) => `import * as m${i} from './${m}';`).join('\n') + "\nimport * as THREE from 'three';\nimport * as satellite from 'satellite.js';\nexport default Object.assign({ THREE, satellite }, " + modules.map((_, i) => `m${i}`).join(', ') + ');', resolveDir: engine, loader: 'js' },
  bundle: true, write: false, format: 'iife', globalName: '__ENGINE__', platform: 'browser', logLevel: 'silent',
}).outputFiles[0].text);
// charge le moteur dans `ctx` (créé s'il ne l'est pas encore) et le renvoie
const loadEngineIntoSync = ctx => { if (!vm.isContext(ctx)) vm.createContext(ctx); vm.runInContext(bundleSync() + ';Object.assign(globalThis, __ENGINE__.default);', ctx, { filename: 'engine-bundle.js' }); return ctx; };
module.exports = { bundleSync, loadEngineIntoSync, root };

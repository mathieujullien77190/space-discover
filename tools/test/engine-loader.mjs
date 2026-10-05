// Charge le moteur (src/engine/*.js, modules ES) dans un contexte vm sous forme de globales, comme les anciens scripts classiques :
// esbuild produit un bundle IIFE (three et satellite.js inclus) dont tous les exports sont recopiés sur le contexte. Les tests gardent leur style « vm.runInContext(expression) ».
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), engine = path.join(root, 'src', 'engine');
const modules = fs.readdirSync(engine).filter(f => f.endsWith('.js') && !['index.js', 'config.js'].includes(f)).concat(fs.readdirSync(path.join(engine, 'data')).filter(f => f.endsWith('.js') && !/^(surface|earth-borders)/.test(f)).map(f => 'data/' + f), ['config.js']);
let cached = null;

export const bundleEngine = async () => cached ??= (await build({
  stdin: { contents: modules.map((m, i) => `import * as m${i} from './${m}';`).join('\n') + "\nimport * as THREE from 'three';\nimport * as satellite from 'satellite.js';\nexport default Object.assign({ THREE, satellite }, " + modules.map((_, i) => `m${i}`).join(', ') + ');', resolveDir: engine, loader: 'js' },
  bundle: true, write: false, format: 'iife', globalName: '__ENGINE__', platform: 'browser', logLevel: 'silent',
})).outputFiles[0].text;

// Charge le moteur dans un contexte vm existant (ou le crée) ; renvoie le contexte.
export const loadEngineInto = async (ctx) => {
  if (!vm.isContext(ctx)) vm.createContext(ctx);
  vm.runInContext(await bundleEngine() + ';Object.assign(globalThis, __ENGINE__.default);', ctx, { filename: 'engine-bundle.js' });
  return ctx;
};
// Sandbox vm avec le moteur chargé ; `extra` ajoute des globales (document factice, etc.).
export const loadEngine = (extra = {}) => loadEngineInto({ console, Math, Date, JSON, ...extra });
export { root };

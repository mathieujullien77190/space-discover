// Charge le moteur (src/engine, modules ES) dans un contexte vm sous forme de globales, comme les anciens scripts classiques (voir tools/lib-engine.js).
// Les tests gardent leur style « vm.runInContext(expression) ».
import { createRequire } from 'node:module';

const { loadEngineIntoSync, root } = createRequire(import.meta.url)('../lib-engine.js');

// Charge le moteur dans un contexte vm existant (ou le crée) ; renvoie le contexte.
export const loadEngineInto = async (ctx) => loadEngineIntoSync(ctx);
// Sandbox vm avec le moteur chargé ; `extra` ajoute des globales (document factice, etc.).
export const loadEngine = (extra = {}) => loadEngineInto({ console, Math, Date, JSON, ...extra });
export { root };

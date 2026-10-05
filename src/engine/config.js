// Configuration du moteur : préfixe des assets statiques (GitHub Pages : /space-discover). Le moteur ne connaît pas Next : l'hôte appelle setBaseUrl() une fois, puis tous les chemins relatifs
// (photos de la Terre, modèles glTF, JSON d'objets) passent par assetUrl().
let base = '';
export const setBaseUrl = (b) => { base = b ? String(b).replace(/\/+$/, '') : ''; };
export const getBaseUrl = () => base;
export const assetUrl = (p) => /^(https?:|blob:|data:)/.test(p) ? p : base + '/' + String(p).replace(/^\/+/, '');

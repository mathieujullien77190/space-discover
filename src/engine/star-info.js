// Fiche d'une étoile (option « Infos étoiles ») : nom, désignation, constellation, éclat, couleur, température et un bref descriptif.
// Données : positions, magnitudes et couleurs = catalogue (stars.js) ; noms propres, lettres de Bayer et constellations = d3-celestial (star-names.js, BSD-3) ;
// descriptifs des étoiles célèbres = écrits DE MÉMOIRE (distances et faits : à vérifier). Les autres reçoivent un descriptif construit d'après leurs données.
import { CONSTELLATIONS } from './data/constellations.js';
import { STARS } from './data/stars.js';
import { STAR_NAMES } from './data/star-names.js';

export const GREEK = { 'α': 'Alpha', 'β': 'Bêta', 'γ': 'Gamma', 'δ': 'Delta', 'ε': 'Epsilon', 'ζ': 'Zêta', 'η': 'Êta', 'θ': 'Thêta', 'ι': 'Iota', 'κ': 'Kappa', 'λ': 'Lambda', 'μ': 'Mu', 'ν': 'Nu', 'ξ': 'Xi', 'ο': 'Omicron', 'π': 'Pi', 'ρ': 'Rhô', 'σ': 'Sigma', 'τ': 'Tau', 'υ': 'Upsilon', 'φ': 'Phi', 'χ': 'Khi', 'ψ': 'Psi', 'ω': 'Oméga' };
const CONSTELLATION_FR = Object.fromEntries(CONSTELLATIONS.map(c => [c[0], c[1]]));
export const constellationName = abbr => CONSTELLATION_FR[abbr] || abbr;
const BY_HIP = new Map(STARS.map(s => [s[4], s]));
export const starByHip = hip => BY_HIP.get(hip) || null;

// classe de couleur et température de surface d'après l'indice B−V (formule de Ballesteros)
export const colorClass = bv => bv < -0.1 ? 'bleue' : bv < 0.2 ? 'blanche-bleutée' : bv < 0.6 ? 'blanche-jaune' : bv < 0.8 ? 'jaune (comme le Soleil)' : bv < 1.4 ? 'orange' : 'rouge';
export const temperatureK = bv => Math.round(4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62)) / 100) * 100;
const brightness = m => m < 0 ? 'l’une des plus brillantes du ciel' : m < 1.5 ? 'très brillante' : m < 3 ? 'brillante' : m < 4.5 ? 'assez visible' : m < 5.5 ? 'faible (ciel bien noir)' : 'à la limite de l’œil nu';
const fr = (x, d = 1) => x.toFixed(d).replace('.', ',').replace('-', '−');

// descriptifs des étoiles célèbres, de mémoire (à vérifier) : distance en années-lumière et un fait marquant
export const FAMOUS = {
  Sirius: 'L’étoile la plus brillante du ciel nocturne, à 8,6 années-lumière : une étoile blanche accompagnée d’une naine blanche.',
  Canopus: 'Deuxième étoile la plus brillante du ciel, une supergéante à environ 310 années-lumière ; sert à guider les sondes spatiales.',
  Arcturus: 'Géante orange à 37 années-lumière, l’étoile la plus brillante du Bouvier ; on la trouve en prolongeant l’arc de la queue de la Grande Ourse.',
  Rigil: 'Le système d’Alpha du Centaure est le plus proche du Soleil (≈ 4,4 années-lumière).',
  Vega: 'Étoile blanche à 25 années-lumière, très brillante ; elle fut l’étoile polaire il y a 12 000 ans et le sera de nouveau dans 12 000 ans.',
  Capella: 'Un système de quatre étoiles à 43 années-lumière ; deux géantes jaunes dominent.',
  Rigel: 'Supergéante bleue du pied d’Orion, plusieurs dizaines de milliers de fois plus lumineuse que le Soleil (≈ 860 années-lumière).',
  Procyon: 'Étoile blanc-jaune à 11,5 années-lumière, accompagnée d’une naine blanche.',
  Betelgeuse: 'Supergéante rouge à l’épaule d’Orion (≈ 550 années-lumière) : si elle remplaçait le Soleil, elle avalerait l’orbite de Mars ; elle finira en supernova.',
  Achernar: 'Étoile bleue très aplatie par sa rotation rapide, à environ 140 années-lumière.',
  Hadar: 'Étoile bleue géante du Centaure, à environ 390 années-lumière.',
  Altair: 'Étoile blanche à 17 années-lumière qui tourne sur elle-même en neuf heures environ ; elle forme le « triangle d’été ».',
  Acrux: 'L’étoile la plus brillante de la Croix du Sud, en réalité un système multiple (≈ 320 années-lumière).',
  Aldebaran: 'Géante orange, « l’œil du Taureau » (≈ 65 années-lumière), qui n’appartient pas à l’amas des Hyades derrière lequel elle passe.',
  Antares: 'Supergéante rouge, « la rivale de Mars » (≈ 550 années-lumière), au cœur du Scorpion.',
  Spica: 'Étoile bleue de la Vierge (≈ 250 années-lumière), en fait deux étoiles très proches.',
  Pollux: 'Géante orange des Gémeaux, à 34 années-lumière, avec une planète connue.',
  Fomalhaut: 'Étoile blanche à 25 années-lumière entourée d’un disque de poussières, la « solitaire du Sud ».',
  Deneb: 'Supergéante blanche du Cygne, à environ 2 600 années-lumière : l’une des étoiles les plus lointaines visibles à l’œil nu.',
  Mimosa: 'Deuxième étoile de la Croix du Sud, bleue (≈ 280 années-lumière).',
  Regulus: 'Le « petit roi » du Lion (≈ 79 années-lumière) : un système de quatre étoiles qui tourne très vite.',
  Adhara: 'Étoile bleue du Grand Chien, très lumineuse dans l’ultraviolet (≈ 430 années-lumière).',
  Castor: 'Des Gémeaux, un système de six étoiles à environ 51 années-lumière.',
  Gacrux: 'Géante rouge de la Croix du Sud, à environ 88 années-lumière.',
  Shaula: 'Le « dard » du Scorpion : un système d’étoiles bleues (≈ 570 années-lumière).',
  Bellatrix: 'Étoile bleue d’Orion, « l’Amazone » (≈ 250 années-lumière).',
  Elnath: 'Étoile à l’extrémité d’une corne du Taureau (≈ 130 années-lumière).',
  Miaplacidus: 'Étoile blanche de la Carène (≈ 110 années-lumière).',
  Alnilam: 'Étoile centrale du baudrier d’Orion, bleue et très lumineuse (≈ 2 000 années-lumière).',
  Alnitak: 'Étoile du baudrier d’Orion, près de la nébuleuse de la Tête de Cheval.',
  Mintaka: 'Étoile du baudrier d’Orion, pratiquement sur l’équateur céleste.',
  Polaris: 'L’étoile Polaire (≈ 430 années-lumière) : elle est presque exactement dans l’axe de rotation de la Terre, donc fixe au pôle nord céleste.',
  Dubhe: 'Étoile de la « casserole » de la Grande Ourse (≈ 120 années-lumière) ; avec Mérak elle indique la Polaire.',
  Merak: 'Étoile de la « casserole » de la Grande Ourse ; avec Dubhe elle indique la Polaire.',
  Alioth: 'L’étoile la plus brillante de la Grande Ourse (≈ 80 années-lumière).',
  Mizar: 'Au milieu du manche de la Grande Ourse : avec Alcor, un test classique de la vue (≈ 83 années-lumière).',
  Alcor: 'Compagne de Mizar dans le manche de la Grande Ourse.',
  Alkaid: 'Étoile bleue au bout du manche de la Grande Ourse (≈ 100 années-lumière).',
  Algol: 'L’« étoile du démon » de Persée : sa luminosité chute toutes les 2,9 jours quand son compagnon passe devant.',
  Mira: 'Géante rouge de la Baleine dont l’éclat varie sur environ 332 jours : la première étoile variable connue.',
  Alphard: 'L’« solitaire » de l’Hydre, géante orange (≈ 180 années-lumière).',
  Saiph: 'Supergéante bleue au pied d’Orion (≈ 650 années-lumière).',
  Alpheratz: 'Étoile d’Andromède qui fait aussi un coin du « grand carré » de Pégase (≈ 97 années-lumière).',
  Thuban: 'Étoile du Dragon qui fut la Polaire à l’époque des pyramides d’Égypte.',
  Sadr: 'Étoile au centre de la croix du Cygne (≈ 1 800 années-lumière).',
  Albireo: 'Au bec du Cygne : une belle étoile double, dorée et bleue.',
  Enif: 'Le « nez » du cheval Pégase, supergéante orange.',
  Markab: 'Un coin du « grand carré » de Pégase (≈ 140 années-lumière).',
  Kochab: 'Étoile orange de la Petite Ourse, proche du pôle nord céleste.',
  Rasalhague: 'La « tête du Serpentaire » (≈ 49 années-lumière).',
  Rasalgethi: 'Géante rouge d’Hercule, double.',
  Menkar: 'Géante rouge de la Baleine.',
  Hamal: 'Géante orange du Bélier (≈ 66 années-lumière).',
  Diphda: 'La plus brillante de la Baleine, géante orange.',
  Nunki: 'Étoile bleue du Sagittaire (≈ 220 années-lumière).',
  Atria: 'Géante orange du Triangle austral.',
  Avior: 'Étoile double de la Carène (≈ 600 années-lumière).',
  Peacock: 'La plus brillante du Paon (≈ 180 années-lumière).',
  Alhena: 'Étoile blanche du pied des Gémeaux.',
  Mirfak: 'Supergéante de Persée, au cœur d’un bel amas d’étoiles.',
  Wezen: 'Supergéante jaune-blanc du Grand Chien (≈ 1 600 années-lumière).',
  Sargas: 'Étoile du Scorpion (≈ 270 années-lumière).',
  Kaus: 'Étoile de l’arc du Sagittaire, vers le centre de la Voie lactée.',
};

// fiche complète d'une étoile du catalogue : { title, subtitle, constellation, magnitude, colorClass, tempK, text, famous, note }
export function starDetails(star) {
  const [, , mag, bv, hip] = star, nm = STAR_NAMES[hip], name = nm ? nm[0] : '', letter = nm ? nm[1] : '', con = nm ? constellationName(nm[2]) : '';
  const greek = letter ? (GREEK[letter.replace(/[0-9]/g, '')] || letter) : '', suffix = (letter.match(/[0-9]+/) || [''])[0];
  const designation = letter ? greek + (suffix ? ' ' + suffix : '') + ' (' + letter + ')' + (con ? ' · ' + con : '') : '';
  const cls = colorClass(bv), tempK = temperatureK(bv);
  const famous = name && FAMOUS[name] ? FAMOUS[name] : (name === 'Rigil Kentaurus' ? FAMOUS.Rigil : '');
  const base = 'Étoile ' + cls + ', de magnitude ' + fr(mag) + ' (' + brightness(mag) + '), température de surface ≈ ' + tempK.toLocaleString('fr-FR') + ' K' + (con ? ', dans la constellation ' + (/^[AEIOUYÂÊÎÔÛÉÈ]/.test(con) ? 'd’' : 'de ') + con : '') + '.';
  return {
    hip, title: name || designation || 'Étoile HIP ' + hip, subtitle: name && designation ? designation : name || !designation ? 'HIP ' + hip : 'HIP ' + hip,
    constellation: con, magnitude: mag, colorClass: cls, tempK, text: famous ? famous + ' ' + base : base, famous: !!famous,
    note: 'Descriptifs écrits de mémoire (distances et faits à vérifier) ; noms et constellations : d3-celestial.',
  };
}

// ÉTOILE VISÉE : parmi les étoiles `visible(index)`, celle dont la position à l'écran (project(star) → [x, y] en pixels, ou null si hors champ) est la plus proche de (x, y), à moins de maxPx ;
// à distance égale les plus brillantes l'emportent (un clic sur une étoile faible près d'une brillante désigne plutôt la brillante).
export function pickNearest(project, x, y, maxPx = 14, visible = () => true) {
  let best = -1, bestScore = Infinity;
  for (let i = 0; i < STARS.length; i++) {
    if (!visible(i)) continue;
    const p = project(STARS[i]); if (!p) continue;
    const d = Math.hypot(p[0] - x, p[1] - y); if (d > maxPx) continue;
    const score = d + Math.max(0, STARS[i][2] + 1.5) * 1.2;
    if (score < bestScore) { bestScore = score; best = i; }
  }
  return best;
}

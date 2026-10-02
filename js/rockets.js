// Fusées de chaque base de lancement : paramètres physiques (remplacent les étages de LCH dans simulateLaunch), libellés des événements, dimensions du modèle 3D.
// ⚠ ORDRES DE GRANDEUR écrits de mémoire, SIMPLIFIÉS pour rentrer dans le moule « boosters latéraux + étage principal + étage supérieur + coiffe » et ajustés pour atteindre l'orbite : à vérifier avant de les citer.
// phys : eap = boosters latéraux (n = 0 : aucun ; liquid : poussée constante, sinon poudre), epc = étage principal (1er étage), esc = étage supérieur (F poussée en N, isp en s) ;
//        fairing (kg), fairingAt (s), sepEap (s : séparation des boosters, et fin du virage gravitationnel s'il n'y en a pas), sepDelay / escDelay (s), cdA (m²), kickAt / kickDur (s), kick (°), parkMax (km).
// model (mètres) : core {r, h}, boosters {n, r, h, nose, R} | null, upper {r, h}, fairing {r, cyl, cone}, noz {epc, eap, esc : longueur des tuyères}, colors.
const ROCKETS = {
  ariane5: {
    name: 'Ariane 5 ECA', short: 'Ariane 5', maxPayload: 9500, phys: {},
    names: { booster: 'Booster à poudre (EAP)', stage1: 'Étage principal (EPC)', stage2: 'Étage supérieur (ESC-A)', stage1Burns: true },
    model: { core: { r: 2.7, h: 30.5, color: 0xd8b48a }, boosters: { n: 2, r: 1.5, h: 31, nose: 3.2, R: 4.4, color: 0xf2f2f2, band: 0xb83030 }, upper: { r: 2.5, h: 4.6, color: 0xbfc3c8 }, fairing: { r: 2.7, cyl: 12, cone: 6, color: 0xf2f2f2 }, noz: { epc: 5.5, eap: 3.5, esc: 2.2 } },
  },
  falcon9: {
    name: 'Falcon 9 FT', short: 'Falcon 9', maxPayload: 16000,
    phys: {
      eap: { n: 0, prop: 0, dry: 0, burn: 1, ispV: 300, ispS: 280 },
      epc: { prop: 411e3, dry: 22e3, burn: 162, ispV: 311, ispS: 282 },
      esc: { prop: 111.5e3, dry: 4e3, F: 934e3, isp: 348 },
      fairing: 1.9e3, fairingAt: 200, sepEap: 150, sepDelay: 3, escDelay: 4, cdA: 12, kickAt: 12, kickDur: 5, kick: 1, escLifter: true,
    },
    names: { booster: '', stage1: 'Premier étage (9 Merlin)', stage2: 'Deuxième étage', stage1Burns: false, meco: 'Extinction du 1er étage (MECO)', epcsep: 'Séparation des étages', esc1: 'Allumage du 2e étage', esc1end: 'Extinction du 2e étage (orbite d\'attente)', esc2: 'Rallumage du 2e étage (circularisation)', esc2end: 'Extinction : orbite atteinte' },
    model: { core: { r: 1.85, h: 42.6, color: 0xf2f2f2 }, boosters: null, upper: { r: 1.85, h: 14, color: 0xf2f2f2 }, fairing: { r: 2.6, cyl: 7, cone: 6, color: 0xf2f2f2 }, noz: { epc: 2.2, eap: 0, esc: 3 } },
  },
  soyuz: {
    name: 'Soyouz-2.1a', short: 'Soyouz', maxPayload: 7400,
    phys: {
      eap: { n: 4, prop: 39.2e3, dry: 3.8e3, burn: 118, ispV: 310, ispS: 263, liquid: true },
      epc: { prop: 99e3, dry: 6.5e3, burn: 286, ispV: 320, ispS: 257 },
      esc: { prop: 25.2e3, dry: 2.4e3, F: 298e3, isp: 359 },
      fairing: 1.5e3, fairingAt: 160, sepEap: 118, sepDelay: 2, escDelay: 2, cdA: 8, kickAt: 6, kickDur: 8, kick: 2, escLifter: true,
    },
    names: { booster: 'Booster latéral (blocs B, V, G, D)', stage1: 'Bloc central (bloc A)', stage2: 'Troisième étage (bloc I)', stage1Burns: false, eap: 'Séparation des 4 boosters latéraux', meco: 'Arrêt du bloc central', epcsep: 'Séparation du bloc central', esc1: 'Allumage du 3e étage (bloc I)', esc1end: 'Fin de la 1re poussée du 3e étage', esc2: 'Rallumage à l\'apogée (circularisation)' },
    model: { core: { r: 1.45, h: 27, color: 0xcfcfd2 }, boosters: { n: 4, r: 1.3, h: 19.6, nose: 0, R: 2.45, color: 0xcfcfd2, band: 0xb8b8bc }, upper: { r: 1.33, h: 6.7, color: 0xdadada }, fairing: { r: 1.5, cyl: 6, cone: 6.6, color: 0xf2f2f2 }, noz: { epc: 2.0, eap: 1.6, esc: 1.5 } },
  },
  hiia: {
    name: 'H-IIA 202', short: 'H-IIA', maxPayload: 6500,
    phys: {
      eap: { n: 2, prop: 65.2e3, dry: 10.8e3, burn: 100, ispV: 283, ispS: 250 },
      epc: { prop: 101e3, dry: 13.5e3, burn: 390, ispV: 440, ispS: 345 },
      esc: { prop: 16.6e3, dry: 3.0e3, F: 137e3, isp: 448 },
      fairing: 1.4e3, fairingAt: 270, sepEap: 100, sepDelay: 4, escDelay: 6, cdA: 12, kickAt: 6, kickDur: 8, kick: 6, escLifter: true,
    },
    names: { booster: 'Booster à poudre (SRB-A)', stage1: 'Étage principal (LE-7A)', stage2: 'Étage supérieur (LE-5B)', stage1Burns: true },
    model: { core: { r: 2.0, h: 37.2, color: 0xe9e9ec }, boosters: { n: 2, r: 1.0, h: 15, nose: 2.2, R: 3.0, color: 0xf2f2f2, band: 0xb83030 }, upper: { r: 2.0, h: 7.5, color: 0xe9e9ec }, fairing: { r: 2.1, cyl: 6, cone: 3.5, color: 0xf2f2f2 }, noz: { epc: 3.5, eap: 2.2, esc: 1.8 } },
  },
  pslv: {
    name: 'PSLV-XL', short: 'PSLV', maxPayload: 3000,
    phys: {
      eap: { n: 6, prop: 12e3, dry: 1.5e3, burn: 50, ispV: 265, ispS: 235 },
      epc: { prop: 138e3, dry: 30e3, burn: 110, ispV: 269, ispS: 237 },
      esc: { prop: 51.6e3, dry: 2.5e3, F: 600e3, isp: 300 },   // étages 2 à 4 fusionnés (masse sèche réduite : les étages largués ne sont pas simulés)
      fairing: 1.2e3, fairingAt: 200, sepEap: 52, sepDelay: 3, escDelay: 4, cdA: 6, kickAt: 6, kickDur: 8, kick: 3, escLifter: true,
    },
    names: { booster: 'Booster à poudre latéral', stage1: 'Premier étage (PS1, poudre)', stage2: 'Étages supérieurs (PS2 à PS4, fusionnés)', stage1Burns: true },
    model: { core: { r: 1.3, h: 20.3, color: 0xf2f2f2 }, boosters: { n: 6, r: 0.5, h: 12, nose: 1.5, R: 1.85, color: 0xf2f2f2, band: 0xd0d0d0 }, upper: { r: 1.3, h: 14, color: 0xf2f2f2 }, fairing: { r: 1.7, cyl: 4.5, cone: 3.5, color: 0xf2f2f2 }, noz: { epc: 2.2, eap: 1.3, esc: 1.6 } },
  },
  cz5: {
    name: 'Longue Marche 5', short: 'Longue Marche 5', maxPayload: 25000,
    phys: {
      eap: { n: 4, prop: 140e3, dry: 12e3, burn: 173, ispV: 335, ispS: 300, liquid: true },
      epc: { prop: 175e3, dry: 17e3, burn: 480, ispV: 430, ispS: 330 },
      esc: { prop: 18e3, dry: 2.7e3, F: 176e3, isp: 442 },
      fairing: 3.2e3, fairingAt: 270, sepEap: 173, sepDelay: 4, escDelay: 6, cdA: 40, kickAt: 12, kickDur: 8, kick: 1, escLifter: true,
    },
    names: { booster: 'Booster latéral (YF-100)', stage1: 'Étage central (YF-77)', stage2: 'Étage supérieur (YF-75D)', stage1Burns: true },
    model: { core: { r: 2.5, h: 33.2, color: 0xe9e9ec }, boosters: { n: 4, r: 1.67, h: 27.6, nose: 2.6, R: 4.15, color: 0xe9e9ec, band: 0xb83030 }, upper: { r: 2.5, h: 11, color: 0xe9e9ec }, fairing: { r: 2.6, cyl: 8, cone: 4.5, color: 0xf2f2f2 }, noz: { epc: 4, eap: 2.4, esc: 2 } },
  },
  r7: {   // fusée historique de Spoutnik 1 : R-7 « Semiorka » dans sa version 8K71PS (sans étage supérieur : le bloc central met le satellite en orbite)
    name: 'R-7 (8K71PS)', short: 'R-7', maxPayload: 1500,
    phys: {
      eap: { n: 4, prop: 39.8e3, dry: 3.45e3, burn: 120, ispV: 313, ispS: 252, liquid: true },
      epc: { prop: 94.25e3, dry: 7.5e3, burn: 295, ispV: 316, ispS: 241 },
      esc: { prop: 0, dry: 0, F: 1, isp: 300 },
      fairing: 1.0e3, fairingAt: 300, sepEap: 116, sepDelay: 2, escDelay: 2, cdA: 10, kickAt: 8, kickDur: 4, kick: 3, direct: true, satDelay: 19.5, parkMax: 240,
    },
    names: { booster: 'Booster latéral (blocs B, V, G, D)', stage1: 'Bloc central (bloc A)', stage2: 'Bloc central', stage1Burns: false, eap: 'Séparation des 4 boosters latéraux', meco: 'Arrêt du moteur central : vitesse orbitale atteinte', esc2end: 'Fin du vol propulsé', sat: 'Spoutnik 1 se sépare du bloc central' },
    model: { core: { r: 1.45, h: 26.5, color: 0xcfc8b8 }, boosters: { n: 4, r: 1.3, h: 19, nose: 3, R: 2.45, color: 0xcfc8b8, band: 0xb8b0a0 }, upper: { r: 1.45, h: 0.2, color: 0xcfc8b8 }, fairing: { r: 1.45, cyl: 0.5, cone: 3.5, color: 0xe8e8e8 }, noz: { epc: 2.0, eap: 1.6, esc: 0.3 } },
  },
};
const ROCKET_OF_SITE = { kourou: 'ariane5', canaveral: 'falcon9', baikonour: 'soyuz', tanegashima: 'hiia', sriharikota: 'pslv', wenchang: 'cz5' };
const rocketOf = site => ROCKETS[ROCKET_OF_SITE[site.id]] || ROCKETS.ariane5;

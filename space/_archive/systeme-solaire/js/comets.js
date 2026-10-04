// Données et position des comètes et des visiteurs interstellaires.
// ---------- Comètes et visiteurs interstellaires ----------
// Éléments orbitaux (q en UA, angles en degrés) écrits de mémoire : approximatifs, à vérifier (JPL Small-Body Database). Orbite en 3D réelle, vue projetée à plat.
// pe : dates de périhélie connues (la phase est interpolée entre elles) ; sinon tp + période issue de a.
const COMETS = [
  { id: 'halley', name: 'Halley', desig: '1P/Halley', R: 5.5, q: 0.5871, e: 0.96714, i: 162.26, node: 58.42, w: 111.33, pe: ['1835-11-16', '1910-04-20', '1986-02-09', '2061-07-28', '2134-03-27'],
    facts: ["La plus célèbre des comètes : elle revient environ tous les 76 ans. Dernier passage au plus près du Soleil le 9 février 1986, prochain en juillet 2061.",
            "Son noyau sombre mesure environ 15 km de long. En 1705, Edmond Halley a compris que c'était la même comète qui revenait.",
            "Elle tourne en sens inverse des planètes (orbite rétrograde, inclinée de 162°).",
            "La sonde européenne Giotto l'a approchée en mars 1986."], extra: [['1986-03-14', 'La sonde Giotto passe à ≈ 600 km du noyau']] },
  { id: 'halebopp', name: 'Hale-Bopp', desig: 'C/1995 O1', R: 30, q: 0.9141, e: 0.99508, i: 89.43, node: 282.47, w: 130.59, tp: '1997-04-01',
    facts: ["Découverte en juillet 1995 : l'une des comètes les plus vues du XXe siècle, visible à l'œil nu pendant environ 18 mois.",
            "Son noyau d'environ 60 km est l'un des plus gros jamais observés. Elle revient environ tous les 2 500 ans.",
            "Elle avait deux queues : de la poussière jaunâtre et des ions bleus."] },
  { id: 'hyakutake', name: 'Hyakutake', desig: 'C/1996 B2', R: 2, q: 0.2302, e: 0.9998, i: 124.92, node: 188.05, w: 130.18, tp: '1996-05-01', extra: [['1996-03-25', 'Passage au plus près de la Terre (≈ 0,1 UA)']],
    facts: ["Découverte en janvier 1996 par l'amateur japonais Yuji Hyakutake.",
            "Elle est passée à seulement 0,1 UA de la Terre (environ 15 millions de km) en mars 1996 : une queue visible sur des dizaines de degrés.",
            "Elle ne reviendra pas avant des dizaines de milliers d'années."] },
  { id: 'neowise', name: 'NEOWISE', desig: 'C/2020 F3', R: 2.5, q: 0.2946, e: 0.99921, i: 128.94, node: 61.01, w: 37.28, tp: '2020-07-03',
    facts: ["Découverte en mars 2020 par le télescope spatial NEOWISE.",
            "Visible à l'œil nu en juillet 2020 : la plus brillante dans l'hémisphère nord depuis Hale-Bopp.",
            "Elle ne reviendra pas avant environ 6 800 ans."] },
  { id: 'encke', name: 'Encke', desig: '2P/Encke', R: 2.4, q: 0.3359, e: 0.8483, i: 11.78, node: 334.57, w: 186.54, tp: '2023-10-22',
    facts: ["L'une des plus courtes périodes connues : 3,3 ans. Trouvée en 1786, sa période a été calculée par Johann Encke en 1819.",
            "Elle serait à l'origine des Taurides, un essaim de météores d'automne."] },
  { id: 'swifttuttle', name: 'Swift-Tuttle', desig: '109P/Swift-Tuttle', R: 13, q: 0.9595, e: 0.96321, i: 113.45, node: 139.38, w: 152.98, pe: ['1992-12-11', '2126-07-12'],
    facts: ["La comète parente des Perséides, les « larmes de saint Laurent » d'août.",
            "Son noyau d'environ 26 km est le plus gros objet connu à croiser régulièrement le voisinage de la Terre.",
            "Dernier passage en décembre 1992, retour prévu en juillet 2126."] },
  { id: 'tempeltuttle', name: 'Tempel-Tuttle', desig: '55P/Tempel-Tuttle', R: 2, q: 0.9764, e: 0.90551, i: 162.49, node: 235.26, w: 172.5, tp: '1998-02-28',
    facts: ["La comète parente des Léonides, les étoiles filantes de novembre.",
            "Tous les ~33 ans, quand elle passe, les Léonides peuvent devenir une vraie tempête de météores (1833, 1966, 1999…)."] },
  { id: 'ponsbrooks', name: 'Pons-Brooks', desig: '12P/Pons-Brooks', R: 15, q: 0.781, e: 0.95492, i: 74.19, node: 255.89, w: 199.0, pe: ['1954-05-22', '2024-04-21'],
    facts: ["Surnommée « la comète du diable » : ses éruptions lui ont donné un air de cornes en 2024.",
            "Période d'environ 71 ans. Dernier passage le 21 avril 2024."] },
  { id: 'oumuamua', name: 'ʻOumuamua', desig: '1I/ʻOumuamua', R: 0.2, q: 0.2553, e: 1.1995, i: 122.74, node: 24.6, w: 241.81, tp: '2017-09-09', span: 12, inter: true,
    facts: ["Premier objet interstellaire détecté dans le système solaire, découvert le 19 octobre 2017.",
            "Une forme très allongée, de quelques centaines de mètres. Il file à environ 26 km/s par rapport au Soleil.",
            "Son orbite est une hyperbole : il ne reviendra jamais."] },
  { id: 'borisov', name: 'Borisov', desig: '2I/Borisov', R: 0.5, q: 2.0066, e: 3.3565, i: 44.05, node: 308.15, w: 209.12, tp: '2019-12-08', span: 10, inter: true,
    facts: ["Découverte le 30 août 2019 par l'astronome amateur Gennady Borisov : deuxième objet interstellaire, et première comète interstellaire.",
            "Elle file à environ 32 km/s par rapport au Soleil et ne reviendra jamais."] },
  { id: 'atlas3i', name: '3I/ATLAS', desig: '3I/ATLAS', R: 1, q: 1.3564, e: 6.139, i: 175.11, node: 322.16, w: 128.01, tp: '2025-10-29', span: 8, inter: true,
    facts: ["Découverte le 1er juillet 2025 par le système ATLAS : troisième objet interstellaire connu.",
            "Elle file à environ 58 km/s par rapport au Soleil. Passage au plus près du Soleil vers le 29 octobre 2025."],
    note: "Éléments orbitaux particulièrement approximatifs." },
];
for (const c of COMETS) {
  Object.assign(c, { comet: true, rot: 0, moons: [], look: { base: '#bfe6ff' }, parent: null });
  const ci = Math.cos(c.i * DEG), si = Math.sin(c.i * DEG), cn = Math.cos(c.node * DEG), sn = Math.sin(c.node * DEG), cw = Math.cos(c.w * DEG), sw = Math.sin(c.w * DEG);
  c.m = [cn * cw - sn * ci * sw, -cn * sw - sn * ci * cw, sn * cw + cn * ci * sw, -sn * sw + cn * ci * cw, si * sw, si * cw];   // plan orbital -> écliptique (X,Y,Z)
  c.qkm = c.q * AU; c.a = c.qkm / (1 - c.e); c.par = c.qkm * (1 + c.e);
  if (c.pe) c.pe = c.pe.map(D);
  if (c.tp) c.tp = D(c.tp);
  if (c.e < 1) { c.P = orbitT(c.a, GM.soleil); }
  else c.n = Math.sqrt(GM.soleil / Math.pow(-c.a, 3)) * 86400;
  c.Q = c.e < 1 ? c.a * (1 + c.e) : null;
  c.nuLim = c.e < 1 ? Math.PI : Math.acos(Math.max(-0.999, Math.min(0.999, (c.par / (100 * AU) - 1) / c.e)));   // hyperbole : on garde jusqu'à 100 UA
  c.events = (c.extra || []).map(([d, label]) => ({ t: D(d), label }));
}
function cometPos3(c, t, st) {
  let x, y;
  if (c.e < 1) {
    let ph;
    if (c.pe && c.pe.length > 1) { let i = 0; while (i < c.pe.length - 2 && t >= c.pe[i + 1]) i++; ph = (t - c.pe[i]) / (c.pe[i + 1] - c.pe[i]); }
    else ph = (t - c.tp) / c.P;
    const E = solveNewton(2 * Math.PI * ph, c.e); x = c.a * (Math.cos(E) - c.e); y = c.a * Math.sqrt(1 - c.e * c.e) * Math.sin(E);
  } else {
    const H = solveHyper(c.n * (t - c.tp), c.e), A = -c.a; x = A * (c.e - Math.cosh(H)); y = A * Math.sqrt(c.e * c.e - 1) * Math.sinh(H);
  }
  if (st) { c.nu = Math.atan2(y, x); c.rNow = Math.hypot(x, y); }
  const m = c.m; return [m[0] * x + m[1] * y, m[2] * x + m[3] * y, m[4] * x + m[5] * y];
}

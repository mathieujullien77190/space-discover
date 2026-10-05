// Données et trajectoires des sondes.
// ---------- Sondes : trajectoires APPROXIMATIVES ----------
// Les sondes interplanétaires suivent des arcs képlériens autour du Soleil (Lambert) entre les positions des planètes aux dates des survols. Ensuite :
// `esc` = elles s'en vont vers une direction réelle approximative (longitude/latitude écliptiques) ; `orb` = elles tournent autour de la planète
// (ellipse) ; `kep` = orbite autour du Soleil (Parker) ; `l2` = point de Lagrange L2 de la Terre (JWST). La vue étant à plat, on voit la projection.

const PROBES = [
  { id: 'voyager1', name: 'Voyager 1', agency: 'NASA', color: '#ffd24a', cam: 'sun',
    nodes: [['1977-09-05T12:56Z', 'terre', 'Lancement'], ['1979-03-05', 'jupiter', 'Survol de Jupiter'], ['1980-11-12', 'saturne', 'Survol de Saturne']],
    esc: { lat: 35, lon: 255.6, anchor: ['2012-08-25', 121.6, 'Franchit l\'héliopause (≈ 121,6 UA) : espace interstellaire'], rate: 3.57 },
    extra: [['1990-02-14', '« Pale Blue Dot » : photo de la Terre, à ≈ 40 UA']],
    facts: ["Lancée le 5 septembre 1977, quelques semaines après sa jumelle Voyager 2 (20 août) : sa trajectoire, plus rapide, lui fait dépasser Voyager 2.",
            "Elle a survolé Jupiter (mars 1979) et Saturne (novembre 1980), puis a quitté le plan des planètes.",
            "En 1990, à environ 6 milliards de km (40 UA), elle a photographié la Terre : le « Pale Blue Dot ».",
            "Premier objet fabriqué par l'humanité dans l'espace interstellaire : elle a franchi l'héliopause en août 2012, à environ 121 UA.",
            "Elle emporte un disque d'or avec des sons et des images de la Terre."] },
  { id: 'voyager2', name: 'Voyager 2', agency: 'NASA', color: '#7fe0c0', cam: 'sun',
    nodes: [['1977-08-20T14:29Z', 'terre', 'Lancement'], ['1979-07-09', 'jupiter', 'Survol de Jupiter'], ['1981-08-26', 'saturne', 'Survol de Saturne'], ['1986-01-24', 'uranus', 'Survol d\'Uranus'], ['1989-08-25', 'neptune', 'Survol de Neptune']],
    esc: { lat: -43, lon: 287, anchor: ['2018-11-05', 119, 'Franchit l\'héliopause (≈ 119 UA)'], rate: 3.15 },
    facts: ["Lancée le 20 août 1977, seize jours avant Voyager 1, sur une trajectoire plus lente.",
            "La seule sonde à avoir survolé Uranus (janvier 1986) et Neptune (août 1989) : le « Grand Tour » des planètes géantes.",
            "Elle a franchi l'héliopause en novembre 2018, à environ 119 UA.",
            "Après Neptune, elle est partie vers le sud, sous le plan des planètes."] },
  { id: 'pioneer10', name: 'Pioneer 10', agency: 'NASA', color: '#ff9f6b', cam: 'sun',
    nodes: [['1972-03-03', 'terre', 'Lancement'], ['1973-12-04', 'jupiter', 'Survol de Jupiter']],
    esc: { lat: -5, lon: 70, anchor: ['2003-01-23', 80, 'Dernier signal reçu (≈ 80 UA)'], rate: 2.5 },
    facts: ["Premier engin à traverser la ceinture d'astéroïdes, puis à survoler Jupiter (décembre 1973).",
            "Elle porte une plaque gravée avec un message pour d'éventuels extraterrestres.",
            "Dernier signal reçu le 23 janvier 2003, à environ 80 UA. Elle file en direction d'Aldébaran, qu'elle atteindrait dans environ 2 millions d'années."] },
  { id: 'pioneer11', name: 'Pioneer 11', agency: 'NASA', color: '#ffb8e0', cam: 'sun',
    nodes: [['1973-04-06', 'terre', 'Lancement'], ['1974-12-03', 'jupiter', 'Survol de Jupiter'], ['1979-09-01', 'saturne', 'Premier survol de Saturne']],
    esc: { lat: 15, lon: 281, anchor: ['1995-11-24', 46, 'Dernier contact (≈ 45 UA)'], rate: 2.4 },
    facts: ["Premier engin à survoler Saturne, le 1er septembre 1979, après Jupiter (décembre 1974).",
            "Dernier contact en novembre 1995, à environ 45 UA.",
            "Comme Pioneer 10, elle porte une plaque avec un message de l'humanité."] },
  { id: 'newhorizons', name: 'New Horizons', agency: 'NASA', color: '#9fd0ff', cam: 'sun',
    nodes: [['2006-01-19T19:00Z', 'terre', 'Lancement'], ['2007-02-28', 'jupiter', 'Survol de Jupiter (assistance gravitationnelle)'], ['2015-07-14', 'pluton', 'Survol de Pluton']],
    esc: { lat: 3, lon: null, anchor: ['2019-01-01', 43.4, 'Survol d\'Arrokoth (≈ 43 UA), ceinture de Kuiper'], rate: 2.9 },
    facts: ["Lancée le 19 janvier 2006 : l'un des engins les plus rapides jamais lancés, elle a croisé l'orbite de la Lune en environ 9 heures.",
            "Survol de Pluton le 14 juillet 2015 : première vue de près de Pluton et de Charon.",
            "Le 1er janvier 2019, survol d'Arrokoth, un petit astre de la ceinture de Kuiper, à environ 43 UA. Elle continue vers l'extérieur."] },
  { id: 'parker', name: 'Parker Solar Probe', agency: 'NASA', color: '#ff7a3c', cam: 'sun', zoomMin: 1.2e8,
    nodes: [['2018-08-12T07:31Z', 'terre', 'Lancement']],
    kep: { q: 0.0461, Q: 0.7233, T: 88, tp: '2024-12-24T11:53Z', venus: '2024-11-06' },
    extra: [['2024-12-24T11:53Z', 'Périhélie record : ≈ 6,9 millions de km du centre du Soleil, ≈ 192 km/s']],
    facts: ["Lancée le 12 août 2018. Des survols répétés de Vénus la rapprochent peu à peu du Soleil.",
            "Depuis le 24 décembre 2024 : elle passe à environ 6,9 millions de km du centre du Soleil (6,1 millions de km de sa surface), à environ 192 km/s (692 000 km/h) : l'objet le plus rapide jamais construit.",
            "Elle traverse la couronne solaire. Une orbite dure environ 88 jours."],
    note: "Orbite finale (88 jours) montrée aussi avant 2024 : illustratif. Phase approximative." },
  { id: 'jwst', name: 'JWST', agency: 'NASA / ESA / CSA', color: '#ffe36b', cam: 'follow', zoom: 6e6,
    nodes: [['2021-12-25T12:20Z', 'terre', 'Lancement'], ['2022-01-24', 'terre', 'Arrivée au point L2']], l2: { d: 1.5e6, days: 30 },
    facts: ["Lancé le 25 décembre 2021, il a rejoint le point de Lagrange L2 un mois plus tard.",
            "L2 est à environ 1,5 million de km de la Terre, du côté opposé au Soleil : le point tourne autour du Soleil avec la Terre.",
            "Son pare-soleil garde ses instruments à moins de 50 K (environ −223 °C)."],
    note: "Le JWST décrit en réalité une grande orbite autour de L2 (non montrée)." },
  { id: 'galileo', name: 'Galileo', agency: 'NASA', color: '#c8a2ff', cam: 'follow', zoom: 3e7, end: '2003-09-21',
    nodes: [['1989-10-18', 'terre', 'Lancement (navette Atlantis)'], ['1990-02-10', 'venus', 'Survol de Vénus'], ['1990-12-08', 'terre', 'Survol de la Terre'], ['1991-12-08', [2.27, 256], 'Aphélie de la boucle (≈ 2,3 UA)'], ['1992-12-08', 'terre', 'Deuxième survol de la Terre'], ['1995-12-07', 'jupiter', 'Entrée en orbite autour de Jupiter']],
    orb: { a: 1.0e7, e: 0.97, w: 40 },
    extra: [['1991-10-29', 'Survol de l\'astéroïde Gaspra'], ['1993-08-28', 'Survol de l\'astéroïde Ida (et sa lune Dactyl)'], ['2003-09-21', 'Plongée volontaire dans Jupiter']],
    facts: ["Lancée le 18 octobre 1989 : pour gagner de la vitesse, elle a survolé Vénus puis la Terre deux fois.",
            "Premier engin en orbite autour de Jupiter (7 décembre 1995 – 21 septembre 2003) : elle a observé de près Io, Europe, Ganymède et Callisto.",
            "Sa sonde atmosphérique a plongé dans Jupiter en décembre 1995. En 2003, Galileo a été précipitée dans Jupiter pour ne pas contaminer Europe."],
    note: "Orbite autour de Jupiter illustrative (forme et taille approximatives)." },
  { id: 'cassini', name: 'Cassini', agency: 'NASA / ESA / ASI', color: '#ffc46b', cam: 'follow', zoom: 2e7, end: '2017-09-15',
    nodes: [['1997-10-15T08:43Z', 'terre', 'Lancement'], ['1998-04-26', 'venus', 'Survol de Vénus'], ['1999-06-24', 'venus', 'Deuxième survol de Vénus'], ['1999-08-18', 'terre', 'Survol de la Terre'], ['2000-12-30', 'jupiter', 'Survol de Jupiter'], ['2004-07-01', 'saturne', 'Entrée en orbite autour de Saturne']],
    orb: { a: 4.5e6, e: 0.982, w: 200 },
    extra: [['2005-01-14', 'La sonde Huygens se pose sur Titan'], ['2017-09-15', '« Grand Finale » : plongée dans Saturne']],
    facts: ["Lancée le 15 octobre 1997 avec la sonde européenne Huygens : deux survols de Vénus, un de la Terre, un de Jupiter.",
            "En orbite autour de Saturne du 1er juillet 2004 au 15 septembre 2017.",
            "Huygens s'est posée sur Titan en janvier 2005.",
            "Fin de mission : plongée volontaire dans l'atmosphère de Saturne, le 15 septembre 2017."],
    note: "Orbite autour de Saturne illustrative (forme et taille approximatives)." },
  { id: 'juno', name: 'Juno', agency: 'NASA', color: '#8ee08a', cam: 'follow', zoom: 3e7,
    nodes: [['2011-08-05T16:25Z', 'terre', 'Lancement'], ['2012-09-06', [2.25, 196], 'Aphélie de la boucle (≈ 2,25 UA)'], ['2013-10-09', 'terre', 'Survol de la Terre'], ['2016-07-05', 'jupiter', 'Entrée en orbite autour de Jupiter']],
    orb: { a: 4.09e6, e: 0.982, w: 120 },
    facts: ["Lancée le 5 août 2011, elle a utilisé la Terre pour gagner de la vitesse (octobre 2013) et est entrée en orbite autour de Jupiter le 5 juillet 2016.",
            "Orbite polaire très allongée (environ 53 jours) qui frôle les nuages de Jupiter.",
            "Première sonde vers Jupiter alimentée par des panneaux solaires."],
    note: "Orbite autour de Jupiter illustrative. L'état de la mission après 2025 n'est pas vérifié ici." },
  { id: 'clipper', name: 'Europa Clipper', agency: 'NASA', color: '#6bd6ff', cam: 'sun',
    nodes: [['2024-10-14T16:06Z', 'terre', 'Lancement'], ['2025-03-01', 'mars', 'Survol de Mars'], ['2026-12-03', 'terre', 'Survol de la Terre (prévu)'], ['2030-04-11', 'jupiter', 'Arrivée à Jupiter (prévue)']],
    orb: { a: 3.0e6, e: 0.95, w: 60 },
    facts: ["Lancée le 14 octobre 2024 vers Europe, la lune de Jupiter sous la glace de laquelle se cacherait un océan.",
            "Assistance gravitationnelle de Mars (mars 2025), puis de la Terre (décembre 2026).",
            "Arrivée à Jupiter prévue en avril 2030, pour une cinquantaine de survols d'Europe."],
    note: "Dates après aujourd'hui = prévues. Trajectoire approximative." },
];

const V1 = PROBES[0];

for (const p of PROBES) {
  Object.assign(p, { probe: true, R: 0.002, rot: 0, moons: [], look: { base: p.color } });
  p.nodes = p.nodes.map(([d, w, label]) => {
    const t = D(d), body = typeof w === 'string' ? P(w) : null; let q;
    if (body) q = planetPos(body, t); else { const r = w[0] * AU, a = w[1] * DEG; q = [r * Math.cos(a), r * Math.sin(a)]; }
    return { t, pos: [q[0], q[1], 0], body, label };
  });
  p.legs = (p.kep || p.l2) ? [] : p.nodes.slice(0, -1).map((n, i) => solveLeg(n.pos, p.nodes[i + 1].pos, p.nodes[i + 1].t - n.t));   // null = échec : repli sur une ligne droite
  const L = p.nodes[p.nodes.length - 1];
  p.t0 = p.nodes[0].t; p.tEnd = p.end ? D(p.end) : Infinity; p.tArr = L.t;
  p.kind = 'Sonde · ' + p.agency + ' · lancée en ' + new Date(J2000 + p.t0 * DAYMS).getUTCFullYear();
  if (p.esc) {
    const e = p.esc, lon = e.lon == null ? Math.atan2(L.pos[1], L.pos[0]) : e.lon * DEG, la = e.lat * DEG;
    e.dir = [Math.cos(la) * Math.cos(lon), Math.cos(la) * Math.sin(lon), Math.sin(la)];
    e.r0 = Math.hypot(L.pos[0], L.pos[1]); e.tA = D(e.anchor[0]); e.rA = e.anchor[1] * AU; e.perDay = e.rate * AU / 365.256;
  }
  if (p.orb) { p.orb.T = orbitT(p.orb.a, GM[L.body.id]); p.orb.w *= DEG; }
  if (p.kep) {
    const k = p.kep; k.a = (k.q + k.Q) / 2 * AU; k.e = (k.Q - k.q) / (k.Q + k.q); k.tp = D(k.tp);
    const v = planetPos(P('venus'), D(k.venus)); k.w = Math.atan2(v[1], v[0]) + Math.PI;   // l'aphélie est près de Vénus lors du survol
  }
  p.events = [...p.nodes.map(n => ({ t: n.t, label: n.label })), ...(p.esc ? [{ t: p.esc.tA, label: p.esc.anchor[2] }] : []), ...(p.extra || []).map(([d, label]) => ({ t: D(d), label }))].sort((a, b) => a.t - b.t);
}
function probePos3(p, t, st) {
  if (p.sat) return satPos3(p, t, st);
  if (p.kep) {
    const k = p.kep, M = 2 * Math.PI * (t - k.tp) / k.T, E = solveNewton(M, k.e), x = k.a * (Math.cos(E) - k.e), y = k.a * Math.sqrt(1 - k.e * k.e) * Math.sin(E), c = Math.cos(k.w), s = Math.sin(k.w);
    if (st) p.nu = Math.atan2(y, x); return [x * c - y * s, x * s + y * c, 0];
  }
  if (p.l2) {
    const e = planetPos(EARTHB, t), f = Math.max(0, Math.min(1, (t - p.t0) / p.l2.days)), m = 1 + p.l2.d * f * f * (3 - 2 * f) / Math.hypot(e[0], e[1]);
    return [e[0] * m, e[1] * m, 0];
  }
  const N = p.nodes;
  if (t <= N[0].t) return N[0].pos.slice();
  for (let i = 0; i < N.length - 1; i++) if (t <= N[i + 1].t) { const lg = p.legs[i]; if (lg) { const q = kepProp(lg.r1, lg.v1, (t - N[i].t) * 86400); return [q[0], q[1], 0]; } const f = (t - N[i].t) / (N[i + 1].t - N[i].t); return N[i].pos.map((v, j) => v + (N[i + 1].pos[j] - v) * f); }
  const L = N[N.length - 1];
  if (p.esc) {
    const e = p.esc, r = t <= e.tA ? e.r0 + (e.rA - e.r0) * (t - L.t) / (e.tA - L.t) : e.rA + e.perDay * (t - e.tA), decay = Math.exp(-(t - L.t) / (8 * 365.256));   // le décalage à la sortie de la dernière planète s'estompe
    return e.dir.map((u, i) => u * r + (L.pos[i] - u * e.r0) * decay);
  }
  const h = planetPos(L.body, t);
  if (p.orb) {
    const o = p.orb, M = 2 * Math.PI * (t - L.t) / o.T, E = solveNewton(M, o.e), x = o.a * (Math.cos(E) - o.e), y = o.a * Math.sqrt(1 - o.e * o.e) * Math.sin(E), c = Math.cos(o.w), s = Math.sin(o.w);
    if (st) p.nu = Math.atan2(y, x); return [h[0] + x * c - y * s, h[1] + x * s + y * c, 0];
  }
  return [h[0], h[1], 0];
}

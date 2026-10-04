// Étoiles voisines du Soleil et repères du système solaire lointain (visibles en dézoomant jusqu'à ~100 années-lumière).
// Positions J2000 : ascension droite (heures décimales), déclinaison (degrés) ; distances en années-lumière. Valeurs écrites de mémoire (à vérifier : SIMBAD, RECONS).
// Chaque étoile est placée à sa vraie direction : (longitude, latitude écliptiques) calculées à partir de α, δ ; la vue étant à plat, on voit la projection sur le plan des planètes.
const LY = 9.4607e12;   // km
const STARS = [
  // nom, distance (al), α (h), δ (°), type de couleur (r rouge, o orange, y jaune, w blanc-bleu), description
  ['Proxima du Centaure', 4.24, 14.4953, -62.679, 'r', "L'étoile la plus proche du Soleil : une petite naine rouge, trop faible pour être vue à l'œil nu. Elle a au moins une planète, Proxima b, dans la zone où l'eau pourrait être liquide."],
  ['α du Centaure', 4.37, 14.6603, -60.833, 'y', "Le système voisin : deux étoiles proches du Soleil par leur type (α Cen A et B), accompagnées de Proxima. Le projet Breakthrough Starshot l'a pris pour cible."],
  ['Étoile de Barnard', 5.96, 17.9633, 4.693, 'r', "Une naine rouge très ancienne, qui détient le record du plus grand mouvement apparent sur le ciel (plus de 10 secondes d'arc par an)."],
  ['Wolf 359', 7.86, 10.9414, 7.015, 'r', "Une naine rouge très faible et jeune, à la lumière variable."],
  ['Lalande 21185', 8.31, 11.0556, 35.970, 'r', "Une naine rouge de la Grande Ourse, visible aux jumelles ; elle abrite au moins une planète."],
  ['Sirius', 8.6, 6.7525, -16.716, 'w', "L'étoile la plus brillante du ciel nocturne. Elle est accompagnée d'une naine blanche, Sirius B, de la taille de la Terre."],
  ['UV Ceti', 8.73, 1.6503, -17.950, 'r', "Une naine rouge (Luyten 726-8) qui a donné son nom aux étoiles à éruptions."],
  ['Ross 154', 9.70, 18.8303, -23.836, 'r', "Une naine rouge éruptive du Sagittaire."],
  ['Ross 248', 10.3, 23.6986, 44.175, 'r', "Une naine rouge qui, dans environ 36 000 ans, deviendra l'étoile la plus proche du Soleil."],
  ['ε de l\'Éridan', 10.5, 3.5489, -9.458, 'o', "Une étoile orange jeune, plus petite que le Soleil, entourée d'un disque de poussière et d'au moins une planète géante."],
  ['Lacaille 9352', 10.7, 23.0978, -35.853, 'r', "Une naine rouge du Poisson austral, dotée de plusieurs planètes."],
  ['Ross 128', 11.0, 11.7956, 0.804, 'r', "Une naine rouge calme, qui possède une planète tempérée."],
  ['61 du Cygne', 11.4, 21.1150, 38.749, 'o', "Un couple d'étoiles oranges : la première dont la distance ait été mesurée, par Bessel en 1838."],
  ['Procyon', 11.5, 7.6550, 5.225, 'w', "L'une des étoiles les plus brillantes du ciel, accompagnée d'une naine blanche."],
  ['ε de l\'Indien', 11.9, 22.0561, -56.786, 'o', "Une étoile orange avec une planète géante et deux naines brunes."],
  ['τ de la Baleine', 11.9, 1.7344, -15.938, 'y', "Une étoile semblable au Soleil, longtemps étudiée dans la recherche de signaux extraterrestres."],
  ['Groombridge 34', 11.6, 0.3064, 44.020, 'r', "Un couple de naines rouges d'Andromède."],
  ['Altaïr', 16.7, 19.8464, 8.868, 'w', "Une étoile blanche qui tourne sur elle-même en moins de 10 heures et qui est de ce fait aplatie."],
  ['Fomalhaut', 25.1, 22.9608, -29.622, 'w', "Une étoile blanche entourée d'un anneau de débris : l'un des premiers disques planétaires photographiés."],
  ['Véga', 25.0, 18.6156, 38.784, 'w', "L'une des étoiles les plus brillantes du ciel d'été. Dans environ 12 000 ans, elle sera l'étoile polaire."],
  ['Pollux', 33.8, 7.7553, 28.026, 'o', "Une géante orange des Gémeaux, avec une planète géante."],
  ['Arcturus', 36.7, 14.2611, 19.182, 'o', "Une géante orange, l'étoile la plus brillante de l'hémisphère nord céleste."],
  ['Capella', 42.9, 5.2781, 45.998, 'y', "Un système de quatre étoiles, dont deux géantes jaunes."],
  ['Castor', 51, 7.5767, 31.888, 'w', "Un système de six étoiles dans les Gémeaux."],
  ['Aldébaran', 65, 4.5986, 16.509, 'o', "Une géante orange, l'œil du Taureau."],
  ['Régulus', 79, 10.1394, 11.967, 'w', "Le cœur du Lion : une étoile bleue qui tourne très vite sur elle-même."],
];
const STAR_COLORS = { r: '#ff9a7a', o: '#ffb06a', y: '#fff0b0', w: '#cfe2ff' };
for (const s of STARS.map((a, i) => ({ a, i }))) {
  const [name, ly, ra, dec, col, text] = s.a, al = ra * 15 * DEG, de = dec * DEG, eps = 23.4393 * DEG;
  const lat = Math.asin(Math.sin(de) * Math.cos(eps) - Math.cos(de) * Math.sin(eps) * Math.sin(al));
  const lon = Math.atan2(Math.sin(al) * Math.cos(eps) + Math.tan(de) * Math.sin(eps), Math.cos(al)), d = ly * LY;
  STARS[s.i] = { star: true, name, ly, col: STAR_COLORS[col], text, kind: 'Étoile · ' + (ly < 100 ? fmtStarLy(ly) : '') + ' du Soleil', R: 0, x: d * Math.cos(lat) * Math.cos(lon), y: d * Math.cos(lat) * Math.sin(lon), lonDeg: lon / DEG, latDeg: lat / DEG };
}
function fmtStarLy(ly) { return String(ly).replace('.', ',') + ' al'; }

// cercles repères : héliopause, nuage d'Oort, et distances en années-lumière ; puis les étoiles
function drawFar(c, k, sunS, R) {
  ctx.setLineDash([4, 6]); ctx.lineWidth = 1;
  const ring = (km, name, color) => {
    const rp = km * k; if (rp < 16 || rp > 3e4) return;
    ctx.strokeStyle = color; ctx.beginPath(); ctx.arc(sunS[0], sunS[1], rp, 0, 7); ctx.stroke();
    const lx = sunS[0] + rp * 0.707, ly = sunS[1] - rp * 0.707;
    if (lx > 0 && lx < W - 60 && ly > 14 && ly < H) lbl(name, lx + 4, ly, '#8fa3d0', 11);
  };
  if (R > 3e10) { ring(121.6 * AU, 'Héliopause ≈ 120 UA', 'rgba(160,185,235,0.28)'); ring(2000 * AU, 'Nuage d’Oort (début) ≈ 2 000 UA', 'rgba(160,185,235,0.25)'); ring(1e5 * AU, 'Nuage d’Oort (fin) ≈ 100 000 UA', 'rgba(160,185,235,0.25)'); }
  if (R > 1e12) for (const al of [1, 2, 5, 10, 20, 50, 100]) ring(al * LY, al + (al > 1 ? ' années-lumière' : ' année-lumière'), 'rgba(120,150,210,0.16)');
  ctx.setLineDash([]);
  if (R < 1.5e12 || !LAYERS.neighbors) return;
  for (const s of STARS) {
    const p = toScreen(c, k, s.x, s.y); if (p[0] < -40 || p[0] > W + 40 || p[1] < -20 || p[1] > H + 20) continue;
    const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 9); g.addColorStop(0, s.col); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], 9, 0, 7); ctx.fill();
    ctx.fillStyle = s.col; ctx.beginPath(); ctx.arc(p[0], p[1], 2.6, 0, 7); ctx.fill();
    if (selStar === s) { ctx.strokeStyle = 'rgba(255,210,74,0.85)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(p[0], p[1], 12, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    if (selStar === s || lblFree(p[0] + 9, p[1] - 5, s.name.length * 6, 12)) lbl(s.name + ' · ' + fmtStarLy(s.ly), p[0] + 9, p[1] - 5, '#e8e2c8', 11, selStar === s ? 700 : 400, s);
    hits.push({ b: s, star: true, x: p[0], y: p[1], r: 10 });
  }
}

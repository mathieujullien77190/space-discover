// Station spatiale internationale : vraie trajectoire autour de la Terre.
// Propagateur SGP4 (satellite.js, MIT, js/vendor/) appliqué à un élément orbital à deux lignes (TLE) de CelesTrak (js/iss-data.js).
// Fiable à quelques kilomètres près autour de l'époque du TLE ; la précision se dégrade ensuite (traînée atmosphérique, réhaussements d'orbite) : on ne l'affiche
// que ± 60 jours autour de l'époque. Sans la bibliothèque ou sans TLE, l'ISS n'apparaît simplement pas.
const ISS = (typeof satellite !== 'undefined' && typeof ISS_TLE !== 'undefined') ? (() => {
  const rec = satellite.twoline2satrec(ISS_TLE[0], ISS_TLE[1]);
  const yy = +ISS_TLE[0].slice(18, 20), day = +ISS_TLE[0].slice(20, 32), epoch = dayOf(Date.UTC(yy < 57 ? 2000 + yy : 1900 + yy, 0, 1) + (day - 1) * DAYMS);
  const p = {
    id: 'iss', name: 'ISS', agency: 'NASA / Roscosmos / ESA / JAXA / CSA', color: '#ffffff', cam: 'follow', zoom: 100, minView: 0.04,   // un clic sur l'ISS (losange, nom ou puce) zoome à 100 km de rayon de vue : modèle agrandi ×350 (voir issModelPx)
     sat: true, satrec: rec, epoch,
    probe: true, R: 0.002, rot: 0, moons: [], look: { base: '#ffffff' }, nodes: [], legs: [], t0: epoch - 60, tEnd: epoch + 60, tArr: epoch,
    kind: 'Station spatiale · NASA / Roscosmos / ESA / JAXA / CSA · lancée en 1998',
    events: [{ t: epoch, label: 'Date de l\'élément orbital (TLE) de référence' }],
    facts: ["Le plus grand objet construit dans l'espace : environ 109 m d'envergure et 420 tonnes. Le premier module (Zarya) a été lancé le 20 novembre 1998 ; elle est habitée en continu depuis le 2 novembre 2000.",
            "Elle tourne autour de la Terre à environ 400 km d'altitude (entre 410 et 430 km en réalité), à environ 7,66 km/s (27 600 km/h) : un tour en 93 minutes, soit 15,5 tours par jour, donc 16 levers de Soleil par jour pour l'équipage.",
            "Son orbite est inclinée de 51,6° sur l'équateur : sa trace au sol (non tracée ici) oscille entre 51,6° N et 51,6° S, et se décale vers l'ouest à chaque tour parce que la Terre tourne dessous.",
            "Sa fin de vie est prévue autour de 2030-2031, par une rentrée contrôlée dans l'océan Pacifique."],
    note: "Position calculée avec le modèle SGP4 à partir d'un élément orbital réel (TLE de CelesTrak), altitude fixée à 400 km : fiable autour de la date du TLE, hors de ± 2 mois elle n'est plus affichée."
  };
  PROBES.push(p);
  return p;
})() : null;

const ISS_ALT = 400;            // km : altitude fixée à 400 km (la vraie varie entre ~410 et ~430 km selon les réhaussements d'orbite)
// rayon (km) de la surface de la Terre à la latitude géocentrique de sinus sinPhi (aplatissement WGS84)
const earthRadiusAt = sinPhi => 6378.137 * (1 - sinPhi * sinPhi / 298.257);
// position héliocentrique (km, plan de l'écliptique + hauteur) de la station : Terre + vecteur Terre → ISS (repère TEME ≈ équateur, tourné vers l'écliptique).
// Direction et phase viennent de SGP4 ; la distance est ramenée à ISS_ALT km au-dessus de la surface.
function satPos3(p, t, st) {
  const pv = satellite.propagate(p.satrec, new Date(J2000 + t * DAYMS)), e = planetPos(EARTHB, t);
  if (!pv.position) return [e[0], e[1], 0];
  const eps = 23.4393 * DEG, c = Math.cos(eps), s = Math.sin(eps), q0 = pv.position, r0 = Math.hypot(q0.x, q0.y, q0.z), k = (earthRadiusAt(q0.z / r0) + ISS_ALT) / r0, q = { x: q0.x * k, y: q0.y * k, z: q0.z * k };
  if (st) {   // vecteur Terre -> ISS et vitesse dans l'écliptique : orientation du modèle SVG de la station
    const w = pv.velocity;
    p.relEcl = [q.x, q.y * c + q.z * s, q.z * c - q.y * s]; p.velEcl = [w.x, w.y * c + w.z * s, w.z * c - w.y * s];
  }
  return [e[0] + q.x, e[1] + q.y * c + q.z * s, q.z * c - q.y * s];
}
// longitude est (°), latitude (°), altitude (km) et vitesse par rapport à la Terre (km/s) à la date t
function issGeo(t) {
  const d = new Date(J2000 + t * DAYMS), pv = satellite.propagate(ISS.satrec, d);
  if (!pv.position) return null;
  const g = satellite.eciToGeodetic(pv.position, satellite.gstime(d));
  return { lon: wrapLon(g.longitude / DEG), lat: g.latitude / DEG, alt: ISS_ALT, v: Math.hypot(pv.velocity.x, pv.velocity.y, pv.velocity.z) };
}

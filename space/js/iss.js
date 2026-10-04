// ISS : position réelle par SGP4 (satellite.js) d'après le TLE de js/data/iss-data.js, et modèle 3D simplifié (proportions réelles : 109 m × 73 m).
const ISS_SATREC = satellite.twoline2satrec(ISS_TLE[0], ISS_TLE[1]);
const ISS_W = 109, ISS_EPOCH = (() => {   // époque du TLE (jour de l'année 1 = 1er janv. 00:00 UTC)
  const yy = +ISS_TLE[0].substr(18, 2), day = +ISS_TLE[0].substr(20, 12);
  return Date.UTC(yy < 57 ? 2000 + yy : 1900 + yy, 0, 1) + (day - 1) * 86400000;
})();

// état de l'ISS à la date d : position (unités de rayon terrestre, repère de la scène), hauteur (km), vitesse (km/s), direction de vol, lon/lat
function issState(d) {
  const pv = satellite.propagate(ISS_SATREC, d);
  if (!pv.position) return null;
  const gm = satellite.gstime(d), ecf = satellite.eciToEcf(pv.position, gm), geo = satellite.eciToGeodetic(pv.position, gm);
  const vel = satellite.eciToEcf(pv.velocity, gm);   // même rotation : direction du vol dans le repère terrestre
  const toScene = (e, v) => v.set(e.x, e.z, -e.y);
  const dirv = toScene(ecf, new THREE.Vector3()).normalize(), alt = geo.height;
  return {
    pos: dirv.clone().multiplyScalar(1 + alt / R_KM), up: dirv, vel: toScene(vel, new THREE.Vector3()).normalize(),
    alt, speed: Math.hypot(pv.velocity.x, pv.velocity.y, pv.velocity.z),
    lon: ((geo.longitude / DEG + 540) % 360) - 180, lat: geo.latitude / DEG,
  };
}

// Le modèle 3D (NASA, texturé) est chargé par js/main.js (data/iss-nasa.glb) ; repère du modèle en mètres : x = sens du vol, y = vers le haut (zénith), z = poutre (perpendiculaire à l'orbite).

// ---------- caractéristiques affichées en 3D sur l'ISS ----------
// Chaque entrée : { id, label, build(ctx) -> { object3D (enfant du modèle ou de la scène), labels: [{ el, point(world Vector3) }], update(iss) } }.
// Ajouter une caractéristique = une entrée ici (la case à cocher apparaît dans le panneau).
const lineMat = c => new THREE.LineBasicMaterial({ color: c });
function seg(pts, c) { const g = new THREE.BufferGeometry().setFromPoints(pts); return new THREE.LineSegments(g, lineMat(c)); }
const ISS_FEATURES = [
  { id: 'size', label: 'Taille et hauteur', onlyIss: true, build(ctx) {   // onlyIss : affiché seulement quand la caméra est sur l'ISS
    const col = 0x4fd8ff, tk = 4, V = (x, y, z) => new THREE.Vector3(x, y, z);
    // (positions absolues = matrice locale du modèle, PAS localToWorld : le groupe `world` est décalé au rendu — origine flottante)
    // cotes dans le repère du modèle (suivent son orientation et son agrandissement) : largeur = poutre (z), longueur = modules (x), posées à l'écart du modèle
    const dims = [{ a: V(50, 0, -54.5), b: V(50, 0, 54.5), text: 'Largeur 109 m', up: V(1, 0, 0) }, { a: V(-36.5, 0, 62), b: V(36.5, 0, 62), text: 'Longueur 73 m', up: V(0, 0, 1) }];
    const objects = [], labels = [];
    for (const d of dims) {
      const t1 = d.up.clone().multiplyScalar(tk), pts = [d.a, d.b, d.a.clone().sub(t1), d.a.clone().add(t1), d.b.clone().sub(t1), d.b.clone().add(t1)];
      const m = seg(pts, col); m.material.depthTest = false; m.renderOrder = 5; ctx.model.add(m); objects.push(m);
      const l = ctx.label(d.text); l.alongLine = true; l.needModel = true; l.dim = d; labels.push(l);
    }
    // hauteur : trait continu de l'ISS à la surface (échelle réelle de la Terre, pas agrandie)
    const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const hcol = 0xffa040, hl = new THREE.Line(hg, new THREE.LineBasicMaterial({ color: hcol })); hl.frustumCulled = false; hl.material.depthTest = false; hl.renderOrder = 5; ctx.scene.add(hl); objects.push(hl);
    const lh = ctx.label('Hauteur'); lh.el.style.color = '#ffa040'; lh.alongLine = true; labels.push(lh);
    return {
      objects, labels,
      update(iss) {
        const n = ctx.model.scale.x * 1000 * R_KM;   // facteur d'agrandissement du modèle
        for (const l of labels) if (l.dim) {
          l.line = [l.dim.a.clone().applyMatrix4(ctx.model.matrix), l.dim.b.clone().applyMatrix4(ctx.model.matrix)];
          l.el.textContent = l.dim.text + (l.dim.text[1] === 'a' && n > 1.5 ? ' (modèle agrandi ×' + Math.round(n) + ')' : '');
        }
        const a = iss.pos, g = iss.up.clone(), arr = hg.attributes.position; arr.setXYZ(0, a.x, a.y, a.z); arr.setXYZ(1, g.x, g.y, g.z); arr.needsUpdate = true;
        lh.line = [a.clone(), g]; lh.el.textContent = 'Hauteur : ' + Math.round(iss.alt) + ' km';
      },
    };
  } },
  // trajectoire future sur un tour (une période, ~93 min), dans le repère de la Terre qui tourne (ce que verrait le sol), à l'altitude réelle ; recalculée chaque seconde, le départ colle toujours à l'ISS
  { id: 'orbit', label: 'Trajectoire future (1 tour)', build(ctx) {
    const N = 180, pos = new Float32Array((N + 1) * 3), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffe27a })); line.frustumCulled = false; ctx.scene.add(line);
    let built = -1e12; const periodMs = 2 * Math.PI / ISS_SATREC.no * 60000;   // no : rad/min
    return {
      objects: [line], labels: [],
      update(iss, camera, date) {
        const t = date.getTime();
        if (t - built > 1000) {
          built = t;
          for (let k = 1; k <= N; k++) { const st = issState(new Date(t + periodMs * k / N)); if (st) pos.set([st.pos.x, st.pos.y, st.pos.z], 3 * k); }
        }
        pos.set([iss.pos.x, iss.pos.y, iss.pos.z], 0); g.attributes.position.needsUpdate = true;
      },
    };
  } },
];

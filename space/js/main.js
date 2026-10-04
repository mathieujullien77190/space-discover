(function () {
  const MISSIONS = false;   // missions (lancements historiques) désactivées pour le moment : on améliore d'abord les vues Terre, Lune, Soleil et ISS (mobile et bureau). Mettre true pour les réactiver.
  const canvas = document.getElementById('gl'), msg = document.getElementById('msg'), info = document.getElementById('info'), label = document.getElementById('issLabel');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true }); }
  catch (e) { msg.textContent = 'WebGL indisponible dans ce navigateur.'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, 1, 0.001, 4e6);
  const world = new THREE.Group(); scene.add(world);
  const inertial = new THREE.Group(); scene.add(inertial);   // missions lunaires : repère inertiel (la Terre tourne : world.rotation.y), décalé comme world   // tout ce qui est décalé à l'affichage (origine flottante près de l'ISS : précision au mètre)
  const earth = buildEarth(renderer); world.add(earth);

  // espace inertiel : Soleil (taille réelle), Lune réelle, orbite de la Terre autour du Soleil, trajectoire de la Lune. Le groupe `solar` est tourné de −GMST dans les vues « Terre fixe » (le Soleil et la Lune font le tour en un jour)
  // et pas tourné dans la vue « Soleil / Lune » (où c'est la Terre qui tourne : world.rotation.y = GMST). Créé peu après le démarrage (texture de la Lune ~0,3 s).
  const solar = new THREE.Group(); scene.add(solar);
  let moonPast = null, moonFut = null, metric = false, moonMesh = null, sunMesh = null, orbitG = null, moonLoop = null, loopD = -1e9, earthDot = null, moonDot = null, solarTarget = 'earth';
  const mkLabel = text => { const el = document.createElement('div'); el.className = 'l3d'; el.textContent = text; el.style.display = 'none'; document.body.appendChild(el); return el; };
  const moonLabel = mkLabel('Lune'), sunLabel = mkLabel('Soleil (taille réelle)'), earthLabel = mkLabel('Terre');
  const dotOf = color => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ color, size: 7, sizeAttenuation: false, depthWrite: false })); p.frustumCulled = false; solar.add(p); return p; };
  function buildSolar() {
    moonMesh = buildMoonMesh(renderer); solar.add(moonMesh);
    sunMesh = new THREE.Mesh(new THREE.SphereGeometry(SUN_R_U, 64, 32), new THREE.MeshBasicMaterial({ color: 0xfff1c4 })); solar.add(sunMesh);
    { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,230,160,0.9)'); gr.addColorStop(0.25, 'rgba(255,190,90,0.35)'); gr.addColorStop(1, 'rgba(255,160,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sp.scale.setScalar(SUN_R_U * 7); sunMesh.add(sp); }
    // orbite de la Terre autour du Soleil (ellipse réelle d'après la position du Soleil sur un an ; le groupe est posé sur le Soleil à chaque image)
    { const D0 = astroD(new Date()), pts = []; for (let i = 0; i <= 365; i++) pts.push(sunGeo(D0 + i * 365.2422 / 365).negate());
      orbitG = new THREE.Group(); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x4a90e2, transparent: true, opacity: 0.9 })); l.frustumCulled = false; orbitG.add(l); solar.add(orbitG); }
    moonLoop = new THREE.Group(); solar.add(moonLoop);   // trace de la Lune : le passé (un tour complet, s'estompe vers le début) et l'avenir (pâle)
    const mkTrail = (n, op) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: op })); l.frustumCulled = false; moonLoop.add(l); return l; };
    moonPast = mkTrail(121, 1); moonFut = mkTrail(61, 0.45);
    earthDot = dotOf(0x5ab0ff); moonDot = dotOf(0xdddddd);
  }
  setTimeout(buildSolar, 400);

  // fond d'étoiles
  const sp = new Float32Array(3 * 3000), tmp = new THREE.Vector3();
  for (let i = 0; i < 3000; i++) { tmp.set(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize().multiplyScalar(1e6); sp.set([tmp.x, tmp.y, tmp.z], 3 * i); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, sizeAttenuation: false, depthWrite: false })));

  // lumière : par défaut « de face » (la Terre est lisible partout), ou le vrai Soleil (jour/nuit)
  const amb = new THREE.AmbientLight(0xffffff, 0.55), sun = new THREE.DirectionalLight(0xffffff, 1.0);
  scene.add(amb, sun, sun.target);
  function subsolar(d) {
    const n = (d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000, dec = -23.44 * Math.cos(2 * Math.PI * (n + 10) / 365);
    return ll((12 - (d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600)) * 15, dec);
  }

  // ISS : modèle (agrandi quand on est loin, pour qu'on la voie) + repère
  const issModel = new THREE.Group(); world.add(issModel);
  // modèle détaillé NASA (textures, ~14 Mo, objects/iss/iss-nasa.glb : dossier de l'objet, fichier donné par `model.file` du JSON), chargé quand on s'approche ; remplace le modèle simple sous 400 km. Repli : on garde le modèle simple (file:// ou erreur).
  const issHi = new THREE.Group(); issModel.add(issHi);
  let hiState = 'idle';
  function loadHi() {
    hiState = 'loading';
    loadGlb(ISS_MODEL).then(root => {
      const c = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3()); root.position.sub(c);
      const w = new THREE.Group(); w.matrixAutoUpdate = false; w.matrix.set(0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1);   // (X, Y, Z) glTF -> (−Z, Y, X) : x = vol, y = haut, z = poutre
      w.add(root); issHi.add(w); hiState = 'ready';
    }).catch(e => { hiState = 'error'; console.warn('Modèle ISS détaillé indisponible :', e.message); });
  }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
  const dot = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xffd54a, size: 10, sizeAttenuation: false })); dot.frustumCulled = false; world.add(dot);

  const cam = { fov: 50, mode: 'earth', tgt: new THREE.Vector3(), lon: 2, lat: 30, dist: 3.4, fly: 0, tfly: 0, launchK: 1, userDir: false, goal: { lon: 2, lat: 30, dist: 3.4 } };
  let iss = null;
  const angDiff = (a, b) => ((b - a + 540) % 360) - 180;

  function setMode(m) {
    if ((m === 'solar') !== (cam.mode === 'solar')) {   // changement de repère (Terre fixe ↔ inertiel) : on tourne la pose de la caméra de l'angle sidéral pour que l'image ne saute pas (sinon le Soleil ferait un tour autour de la Terre)
      const ang = m === 'solar' ? curGm : -curGm; cam.tgt.applyAxisAngle(Y_AXIS, ang); camera.position.applyAxisAngle(Y_AXIS, ang); cam.lon += ang / DEG; cam.goal.lon += ang / DEG; frameF = m === 'solar' ? 1 : 0;
    }
    cam.mode = m; cam.fly = cam.tfly = 0;   // changement de vue DIRECT : plus aucune transition (demande de l'utilisateur)
    syncView(m);
    if (m === 'launch') { cam.userDir = false; }   // caméra auto de la fusée (réglée dans la boucle)
    if (m === 'iss' && iss) applyLocal(VIEW_ISS.yaw, VIEW_ISS.pitch, VIEW_ISS.dist, true);   // l'ISS : vue d'un peu derrière, tout de suite
    else if (m === 'earth') { if (iss) { cam.goal.lat = iss.lat * 0.7; cam.goal.lon = iss.lon; } cam.goal.dist = 3.4; snapCam(); }
  }
  function snapCam() { cam.lon = cam.goal.lon; cam.lat = cam.goal.lat; cam.dist = cam.goal.dist; cam.fly = cam.tfly = 0; }   // la caméra prend la pose voulue d'un coup
  /* vues Soleil / Lune : repère inertiel (la Terre tourne), cible = Soleil (orbite de la Terre en entier) ou Lune (avec sa trajectoire) ; changement de vue direct */
  const goEarth = () => setMode('earth');
  function goSolar(target) {
    solarTarget = target; setMode('solar'); cam.goal.dist = target === 'sun' ? 90000 : 4;
    const d = ECLIPTIC_POLE.clone().add(tmp.set(0.35, 0, 0.1)).normalize(); cam.goal.lat = Math.asin(d.y) / DEG; cam.goal.lon = Math.atan2(-d.z, d.x) / DEG; snapCam();
  }
  cam.onEarth = () => goEarth();
  /* un seul sélecteur pour les vues (Terre, ISS, Lune, Soleil) ; l'interrupteur jour/nuit se comporte comme un « mode sombre » (réglage mémorisé) */
  const viewSel = document.getElementById('viewSel');
  function syncView(m) { if (m === 'iss') viewSel.selectedIndex = -1; else viewSel.value = m === 'solar' ? (solarTarget === 'sun' ? 'sun' : 'moon') : 'earth'; }   // le sélecteur ne contient que les astres : en vue ISS (satellite) aucune entrée n'est choisie
  const mtChk = document.getElementById('mtChk'); try { metric = localStorage.getItem('metric') === '1'; } catch (e) {} mtChk.checked = metric; mtChk.onchange = () => { metric = mtChk.checked; try { localStorage.setItem('metric', metric ? '1' : '0'); } catch (e) {} };
  viewSel.onchange = () => { const v = viewSel.value; if (v === 'earth') goEarth(); else goSolar(v); viewSel.blur(); };

  // caractéristiques de l'ISS affichées en 3D (cases à cocher ; définies dans ISS_FEATURES, js/iss.js)
  const VIEW_ISS = { yaw: 0, pitch: 20, dist: 0.3 };   // accès DIRECT à l'ISS, sans transition : derrière elle (yaw 0), un peu au-dessus (pitch 20°), à 300 m (yaw °, pitch °, distance km)
  const viewTxt = document.getElementById('viewTxt'), viewJson = document.getElementById('viewJson');
  const scaleBar = document.getElementById('scaleBar'), scaleTxt = document.getElementById('scaleTxt');
  const featCb = {}, l3d = [], featOn = {}, featInst = {}, featPanel = document.createElement('div');
  const fctx = { scene: world, model: issModel, label(text) { const el = document.createElement('div'); el.className = 'l3d'; el.textContent = text; document.body.appendChild(el); const l = { el, world: new THREE.Vector3(), needModel: false }; l3d.push(l); return l; } };
  for (const f of ISS_FEATURES) {
    const lab = document.createElement('label'), cb = document.createElement('input'); cb.type = 'checkbox';
    cb.onchange = () => {
      featOn[f.id] = cb.checked; if (f.id === 'size' && cb.checked && cam.mode !== 'iss') goIss();   // « Dimensions » ne se voit que sur le satellite : on s'en approche
      if (cb.checked && !featInst[f.id]) { featInst[f.id] = f.build(fctx); }
      const inst = featInst[f.id]; if (inst) { inst.objects.forEach(o => o.visible = cb.checked); inst.labels.forEach(l => { if (!cb.checked) l.el.style.display = 'none'; }); }
    };
    featCb[f.id] = cb; lab.append(cb, ' ' + f.label); featPanel.append(lab);
  }
  // panneau « 🛰 Satellites » : la liste des satellites (l'ISS pour l'instant : objets `live` du dossier objects/) puis leurs options (Dimensions, Trajectoire) ; remplace l'ancienne entrée « ISS » du sélecteur de vues (réservé aux astres) et le bouton « Détails ISS »
  const satsBox = document.getElementById('satsPanel'), bSats = document.getElementById('bSats'), satItems = [];
  { const mk = (tag, props, ...kids) => { const e = Object.assign(document.createElement(tag), props || {}); e.append(...kids); return e; }, list = mk('div', { className: 'slist' });
    for (const k of Object.keys(FLIGHT_OBJECTS).filter(k => FLIGHT_OBJECTS[k].live)) { const b = mk('button', { className: 'sitem', textContent: '🛰 ' + FLIGHT_OBJECTS[k].name, title: 'Voir ' + FLIGHT_OBJECTS[k].name + ' de près', onclick: () => goIss() }); satItems.push(b); list.append(b); }
    satsBox.append(mk('div', { className: 'ohead' }, mk('b', { textContent: '🛰 Satellites' }), mk('button', { textContent: '✖', title: 'Fermer', onclick: () => { satsBox.hidden = true; bSats.classList.remove('on'); } })), list, mk('div', { className: 'osub', textContent: 'Options' }), featPanel,
      mk('div', { className: 'ldesc', textContent: 'Touche un satellite pour le voir de près. « Dimensions » affiche sa taille et sa hauteur, « Trajectoire » son prochain tour (une période, environ 93 min).' })); }
  // repère local de l'ISS : f = sens du vol (à l'horizontale), u = zénith, s = côté ; yaw 0 = derrière elle, pitch = hauteur de la caméra au-dessus de l'horizontale
  const frameIss = () => { const u = iss.up, f = iss.vel.clone().addScaledVector(u, -iss.vel.dot(u)).normalize(); return { f, u, s: new THREE.Vector3().crossVectors(u, f) }; };
  function applyLocal(yaw, pitch, distKm, now) {   // place la caméra autour de l'ISS (yaw, pitch en °, distance en km) ; now = sans transition
    const F = frameIss(), y = yaw * DEG, p = Math.max(-89.5, Math.min(89.5, pitch)) * DEG;
    const d = F.f.clone().multiplyScalar(-Math.cos(y) * Math.cos(p)).addScaledVector(F.s, Math.sin(y) * Math.cos(p)).addScaledVector(F.u, Math.sin(p));
    cam.goal.lat = Math.asin(d.y) / DEG; cam.goal.lon = Math.atan2(-d.z, d.x) / DEG; cam.goal.dist = Math.max(0.1, distKm) / R_KM;
    if (now) snapCam();
  }
  function setViewLocal(yaw, pitch, distKm) {
    if (!iss) return; setMode('iss'); applyLocal(yaw, pitch, distKm, true);
  }
  // réglage fin de la vue (boutons ◀ ▶ ▲ ▼ ＋ －, pas réglable, répétition en maintenant)
  const STEPS = [0.5, 1, 5, 15]; let stepI = 1;
  function currentView() {
    const rd = x => Math.round(x * 10) / 10, altCam = (camera.position.length() - 1) * R_KM;
    if (cam.mode === 'iss' && iss) { const F = frameIss(), d = camera.position.clone().sub(cam.tgt).normalize(); return { mode: 'iss', yaw: rd(Math.atan2(d.dot(F.s), -d.dot(F.f)) / DEG), pitch: rd(Math.asin(Math.max(-1, Math.min(1, d.dot(F.u)))) / DEG), distKm: Math.round(cam.dist * R_KM * 1000) / 1000, fov: camera.fov }; }
    if (cam.mode === 'launch') return { mode: 'launch', distKm: Math.round(cam.dist * R_KM * 1000) / 1000, zoom: Math.round(cam.launchK * 1000) / 1000, auto: !cam.userDir, fov: camera.fov };
    if (cam.mode === 'solar') return { mode: 'solar', cible: solarTarget, lon: rd(cam.lon), lat: rd(cam.lat), distRayonsTerrestres: Math.round(cam.dist * 100) / 100, fov: camera.fov };   // Lune ou Soleil
    return { mode: 'earth', lon: rd(cam.lon), lat: rd(cam.lat), altKm: rd(altCam), fov: camera.fov };
  }
  function nudge(kind) {
    const st = STEPS[stepI], f = Math.exp(st * 0.02), sgn = kind.endsWith('+') ? 1 : -1;
    if (cam.mode === 'launch') { if (kind[0] === 'd') cam.launchK = Math.max(1e-7, Math.min(1e7, cam.launchK * (sgn > 0 ? f : 1 / f))); }
    else if (cam.mode === 'iss' && iss) {
      const v = currentView(); let yaw = v.yaw, pitch = v.pitch, dist = cam.dist * R_KM;   // distance exacte (l'affichage est arrondi)
      if (kind[0] === 'y') yaw += sgn * st; else if (kind[0] === 'p') pitch += sgn * st; else dist *= sgn > 0 ? f : 1 / f;   // d+ = on s'éloigne
      applyLocal(((yaw + 540) % 360) - 180, pitch, dist, true);
    } else if (cam.mode === 'earth') {
      if (kind[0] === 'y') cam.goal.lon += sgn * st; else if (kind[0] === 'p') cam.goal.lat = Math.max(-89.5, Math.min(89.5, cam.goal.lat + sgn * st));
      else cam.goal.dist = 1 + Math.min(150, Math.max(2 / R_KM, (cam.goal.dist - 1) * (sgn > 0 ? f : 1 / f)));
      cam.lon = cam.goal.lon; cam.lat = cam.goal.lat; cam.fly = 0;
    }
  }
  document.querySelectorAll('#nudge [data-n]').forEach(b => {
    let tm = null; const stop = () => { clearInterval(tm); tm = null; };
    b.addEventListener('pointerdown', e => { e.preventDefault(); nudge(b.dataset.n); stop(); tm = setTimeout(() => { tm = setInterval(() => nudge(b.dataset.n), 70); }, 350); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => { clearTimeout(tm); stop(); }));
  });
  const bStep = document.getElementById('bStep'); bStep.onclick = () => { stepI = (stepI + 1) % STEPS.length; bStep.textContent = STEPS[stepI] + '°'; };
  let frameF = 0, curGm = 0;   // frameF : 0 = repère de la Terre fixe, 1 = repère inertiel (vues Soleil / Lune) ; curGm : temps sidéral courant (rad)
  const goIss = () => { if (iss) setViewLocal(VIEW_ISS.yaw, VIEW_ISS.pitch, VIEW_ISS.dist); };   // accès DIRECT à l'ISS, vue d'un peu derrière, sans transition
  // ---------- lancement d'un satellite (js/launch-3d.js) ----------
  const KM_UA = 149597870.7, KM_AL = 9.4607304725808e12;
  const fmtBig = km => { const fr = (v, d) => v.toLocaleString('fr-FR', { maximumFractionDigits: d }); return km >= 0.1 * KM_AL ? fr(km / KM_AL, 2) + ' al' : km >= 1e7 ? fr(km / KM_UA, km / KM_UA < 10 ? 2 : 1) + ' UA' : null; };   // null : rester en km
  const fmtAlt = km => fmtBig(km) || fmtAltKm(km), fmtAltKm = km => km < 10 ? Math.round(km * 1000).toLocaleString('fr-FR') + ' m' : (km < 1000 ? km.toFixed(1) : Math.round(km).toLocaleString('fr-FR')) + ' km';
  const hLabel = document.createElement('div'); hLabel.className = 'l3d'; hLabel.style.color = '#ffa040'; document.body.appendChild(hLabel);
  const vLabel = document.createElement('div'); vLabel.className = 'l3d'; vLabel.style.color = '#ffffff'; document.body.appendChild(vLabel);   // vitesse, collée à la fusée
  // texte posé sur un segment (de A à B, absolus), incliné comme lui, à un endroit visible ; false si rien n'est visible
  function placeAlong(el, A, B) {
    const at = (t, clip) => { const q = A.clone().lerp(B, t).project(camera); return q.z < 1 && (!clip || (Math.abs(q.x) < 0.95 && Math.abs(q.y) < 0.95)) ? [(q.x + 1) / 2 * innerWidth, (1 - q.y) / 2 * innerHeight] : null; };
    let hit = null;
    for (const t of [0.5, 0.4, 0.3, 0.2, 0.12, 0.06, 0.6, 0.7, 0.8, 0.9, 0.03, 0.015, 0.008, 0.004]) { const p0 = at(t, true), p1 = at(t * 1.1 + 1e-5); if (p0 && p1) { hit = [p0, p1]; break; } }
    if (!hit) { el.style.display = 'none'; return false; }
    let ang = Math.atan2(hit[1][1] - hit[0][1], hit[1][0] - hit[0][0]) * 180 / Math.PI; if (ang > 90) ang -= 180; else if (ang < -90) ang += 180;
    el.style.display = 'block'; el.style.transform = `translate(${hit[0][0]}px,${hit[0][1]}px) translate(-50%,-130%) rotate(${ang}deg)`; return true;
  }
  const Y_AXIS = new THREE.Vector3(0, 1, 0);
  let launch = null, evLabels = [], tagEls = [], slowOn = true, lastSel = null; const lbox = document.getElementById('launchPanel');
  // crée la mission (aperçu : à l'arrêt, vue de la Terre entière centrée sur le site ; sinon vol : caméra de la fusée)
  const optShared = launchOptDefault();
  const storyUI = buildStoryPanel(document.getElementById('story')), tl = buildTimeline(document.getElementById('timeline'), { jump: T => { if (launch) launch.jump(T); }, hold: on => { if (!launch) return; if (on) { launch._was = launch.playing; launch.playing = false; } else { if (launch._was) launch.playing = true; launch._was = false; } } });
  function makeLaunch(site, type, preview) {
    evLabels.forEach(e => e.remove()); tagEls.forEach(e => e.remove());
    if (launch) launch.dispose();
    launch = new Launch(site, type.km, type.payload * 1000, type.scale, { az: type.az, rocketId: type.rocket, apoKm: type.apoKm, story: type.story, opt: optShared }); world.add(launch.group);
    tagEls = launch.tagList.map(t => { const el = document.createElement('div'); el.className = 'l3d tag'; el.textContent = t.text; if (!t.piece) el.title = 'Cliquer pour suivre'; else el.style.cursor = 'default'; el.onclick = () => { if (!launch || launch.preview || t.piece) return; launch.follow = t.id; cam.userDir = false; cam.launchK = 1; setMode('launch'); }; document.body.appendChild(el); return el; });
    evLabels = launch.markers.map(mk => { const el = document.createElement('div'); el.className = 'l3d evl'; el.textContent = fmtT(mk.t) + ' ' + mk.label + ' · ' + fmtAlt(mk.altKm); document.body.appendChild(el); return el; });
    launch.stepPause = slowOn; launch.preview = !!preview; lastSel = { site, type };
    if (preview) { launch.playing = false; setMode('earth'); if (launch.previewDir) { const d = launch.previewDir; cam.goal.lat = Math.asin(d.y) / DEG; cam.goal.lon = Math.atan2(-d.z, d.x) / DEG; cam.goal.dist = launch.previewDist; cam.lon = cam.goal.lon; cam.lat = cam.goal.lat; cam.dist = cam.goal.dist; } else { cam.goal.lon = site.lon; cam.goal.lat = site.lat * 0.6; cam.goal.dist = Math.max(3.4, 1 + 1.6 * (1 + type.km / 6378)); } }
    else { cam.launchK = 1; setMode('launch'); }
    lp.show(launch);
    if (type.story && STORIES[type.story]) storyUI.show(STORIES[type.story]); else storyUI.hide();
    tl.show(launch, type.story && STORIES[type.story]);   // frise du temps en bas de l'écran   // mission historique : récit et photos
  }
  const lp = buildLaunchPanel(lbox, {
    start(site, type) { makeLaunch(site, type, false); },
    preview(site, type) { if (launch && !launch.preview && launch.T > 0) return; makeLaunch(site, type, true); },   // aperçu : trajectoire prévue et étapes dès le choix du satellite (sans casser un vol en cours)
    stop() { if (lastSel) makeLaunch(lastSel.site, lastSel.type, true); },   // « Arrêter » : retour à l'aperçu du même choix
    speed(v) { if (!launch) return; if (v === 0) launch.playing = false; else { launch.playing = true; launch.speed = v; if (launch.preview) { launch.preview = false; cam.launchK = 1; setMode('launch'); } } },   // lecture depuis l'aperçu : le vol démarre
    jump(T) { if (launch) launch.jump(T); },
    next() { if (!launch) return; const e = [{ t: 0 }].concat(launch.sim.events).find(x => x.t > launch.T + 1.5); if (e) launch.jump(Math.max(0, e.t - 1)); },
    zoom() { if (!launch) return; cam.userDir = false; cam.zoomFit = true; launch.follow = 'rocket'; if (launch.preview) { launch.preview = false; launch.playing = true; } setMode('launch'); },
    cam() { cam.zoomFit = false; cam.userDir = false; cam.launchK = 1; if (launch) launch.follow = 'rocket'; if (cam.mode !== 'launch' && launch) setMode('launch'); },
    quit() { evLabels.forEach(e => e.remove()); evLabels = []; tagEls.forEach(e => e.remove()); tagEls = []; hLabel.style.display = 'none'; vLabel.style.display = 'none'; tl.hide(); if (launch) { launch.dispose(); launch = null; } lp.hide(); if (cam.mode === 'launch') setMode('earth'); },
  });
  /* ---------- lancement de satellite SIMPLE : une fusée, une liste de choses à faire, boutons « zoom fusée » et « vue de dessus » (pas de frise ni d'étapes zoomées) ---------- */
  const satBox = document.getElementById('satPanel');
  const stopSat = () => { if (launch) { launch.dispose(); launch = null; } hLabel.style.display = 'none'; vLabel.style.display = 'none'; cam.zoomFit = false; sat.hide(); if (cam.mode === 'launch') goEarth(); };
  // plan de vol : le JSON est relu à chaque lancement (on peut le modifier et recharger la page / relancer), sinon la copie embarquée
  const loadPlan = (key, custom) => custom ? Promise.resolve(custom) : (/^https?:/.test(location.protocol) && FLIGHT_PLAN_FILES[key] ? fetch(FLIGHT_PLAN_FILES[key] + '?t=' + Date.now(), { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }) : Promise.reject(new Error('file'))).catch(() => FLIGHT_PLANS[key]);
  // objet générique (js/flight-object.js) : le JSON est relu à chaque lancement sur http(s), sinon la copie embarquée
  const getJson = url => fetch(url + '?t=' + Date.now(), { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  const loadObject = (key, custom) => custom ? Promise.resolve(custom) : (/^https?:/.test(location.protocol) && FLIGHT_OBJECT_FILES[key] ? getJson(FLIGHT_OBJECT_FILES[key]).then(o => { const dir = FLIGHT_OBJECT_FILES[key].replace(/[^/]*$/, ''), ps = Object.entries(o.parts || {}).filter(([, f]) => typeof f === 'string'); return Promise.all(ps.map(([n, f]) => getJson(dir + f).then(j => { o.parts[n] = j; }))).then(() => o); }) : Promise.reject(new Error('file'))).catch(() => FLIGHT_OBJECTS[key]);   // sur http : le JSON ET ses pièces sont relus à chaque lancement (on édite, on relance) ; sinon la copie embarquée
  function startSat(key, custom) { if (custom ? custom.timeline : key.startsWith('obj:')) loadObject(key.replace(/^obj:/, ''), custom).then(launchObject); else loadPlan(key, custom).then(launchPlan); }
  function launchObject(obj) {
    if (launch) { launch.dispose(); launch = null; }
    optShared.markers = false; optShared.names = false;
    const date = new Date(), s0 = objectStart(obj, { date }), site = Object.assign({}, LAUNCH_SITES[0], { id: 'obj', name: obj.name, lat: s0.lat, lon: s0.lon });
    launch = new Launch(site, 0, 0, 1, { opt: optShared, object: obj, date, az: (s0.azimuthDeg != null ? s0.azimuthDeg : 90) * Math.PI / 180 }); world.add(launch.group);
    launch.stepPause = false; launch.preview = false; launch.playing = true; launch.speed = s0.date ? 1 : 5;   // objet calé sur l'heure réelle (satellite) : lecture ×1, sinon il s'éloigne de l'ISS réelle
    launch.topView = false;
    cam.launchK = 1; cam.zoomFit = false; cam.userDir = false; setMode('launch'); sat.show(launch);
  }
  function launchPlan(plan) {
    if (launch) { launch.dispose(); launch = null; }
    optShared.markers = false; optShared.names = false;
    const site = Object.assign({}, LAUNCH_SITES[0], { id: 'plan', name: plan.site.name, lat: plan.site.lat, lon: plan.site.lon });
    launch = new Launch(site, plan.target.altitudeKm, plan.vehicle.payloadKg, 1, { opt: optShared, plan, rocketId: plan.rocket, az: (plan.site.azimuthDeg != null ? plan.site.azimuthDeg : 90) * Math.PI / 180 }); world.add(launch.group);
    launch.stepPause = false; launch.preview = false; launch.playing = true; launch.speed = 5; launch.topView = false;
    cam.launchK = 1; cam.zoomFit = false; cam.userDir = false; setMode('launch'); sat.show(launch);
  }
  const sat = buildSatPanel(satBox, {
    start: startSat, stop: stopSat, close() { satBox.hidden = true; document.getElementById('bSat').classList.remove('on'); },
    speed(v) { if (!launch) return; if (v === 0) launch.playing = false; else { launch.playing = true; launch.speed = v; } },
    zoom() { if (!launch) return; cam.userDir = false; cam.zoomFit = true; launch.follow = 'rocket'; if (cam.mode !== 'launch') setMode('launch'); },
    top() { if (!launch) return; launch.topView = !launch.topView; cam.userDir = false; cam.zoomFit = false; cam.launchK = 1; if (cam.mode !== 'launch') setMode('launch'); },
    booster() { if (!launch || !launch.retResult) return; launch.topView = false; cam.zoomFit = false; cam.userDir = false; cam.launchK = 1; launch.follow = 'epc'; if (cam.mode !== 'launch') setMode('launch'); },
    cam() { if (!launch) return; launch.topView = false; cam.zoomFit = false; cam.userDir = false; cam.launchK = 1; launch.follow = 'rocket'; if (cam.mode !== 'launch') setMode('launch'); },
  });
  document.getElementById('bSat').onclick = e => { satBox.hidden = !satBox.hidden; e.currentTarget.classList.toggle('on', !satBox.hidden); if (!satBox.hidden) { satsBox.hidden = true; bSats.classList.remove('on'); } };
  const SITE_R = 1 + 1e-5;   // les points des sites sont posés AU SOL (64 m au-dessus de la sphère : pas de scintillement de profondeur)
  // sites de lancement sur la carte : points + noms cliquables (choisit le site dans le panneau)
  const sg2 = new THREE.BufferGeometry(), sp2 = new Float32Array(LAUNCH_SITES.length * 3), siteU = LAUNCH_SITES.map((s, i) => { const u = ll(s.lon, s.lat); sp2.set([u.x * SITE_R, u.y * SITE_R, u.z * SITE_R], 3 * i); return u; });
  sg2.setAttribute('position', new THREE.BufferAttribute(sp2, 3));
  const siteDots = new THREE.Points(sg2, new THREE.PointsMaterial({ color: 0xff5a3c, size: 9, sizeAttenuation: false })); siteDots.frustumCulled = false; world.add(siteDots);
  const siteLabels = LAUNCH_SITES.map((s, i) => { const el = document.createElement('div'); el.className = 'l3d site'; el.textContent = '🚀 ' + s.name; el.onclick = () => { lp.pick(i); lbox.hidden = false; document.getElementById('bLaunch').classList.add('on'); }; document.body.appendChild(el); return el; });
  document.getElementById('bLaunch').hidden = !MISSIONS;
  document.getElementById('bLaunch').onclick = e => {
    lbox.hidden = !lbox.hidden; e.currentTarget.classList.toggle('on', !lbox.hidden);
    if (!lbox.hidden) lp.preview();   // ouverture : aperçu du choix courant
    else if (launch && launch.preview) { evLabels.forEach(x => x.remove()); evLabels = []; tagEls.forEach(x => x.remove()); tagEls = []; launch.dispose(); launch = null; hLabel.style.display = 'none'; vLabel.style.display = 'none'; lp.hide(); storyUI.hide(); tl.hide(); }   // fermeture : on retire l'aperçu
  };
  document.getElementById('bCopy').onclick = () => { const t = viewTxt.dataset.json || ''; try { navigator.clipboard.writeText(t); } catch (e) {} const r = document.createRange(); r.selectNodeContents(viewJson); getSelection().removeAllRanges(); getSelection().addRange(r); };
  bSats.onclick = () => { satsBox.hidden = !satsBox.hidden; bSats.classList.toggle('on', !satsBox.hidden); if (!satsBox.hidden) { satBox.hidden = true; document.getElementById('bSat').classList.remove('on'); } };   // un seul panneau à la fois (satellites / fusées)

  let issScreen = null, moonScreen = null, sunScreen = null;   // positions écran de l'ISS, de la Lune et du Soleil si visibles (cliquables : ISS → vue ISS, Lune → vue Lune, Soleil → vue Soleil)
  const touch = matchMedia('(pointer: coarse)').matches, HIT = touch ? 42 : 26, near = (p, r, x, y) => !!p && Math.hypot(x - p[0], y - p[1]) < r;
  attachControls(canvas, cam, (x, y) => { if (near(issScreen, HIT, x, y)) goIss(); else if (near(moonScreen, HIT + 4, x, y)) goSolar('moon'); else if (near(sunScreen, HIT + 14, x, y)) goSolar('sun'); });
  canvas.addEventListener('pointermove', e => canvas.classList.toggle('hand', near(issScreen, HIT, e.clientX, e.clientY) || near(moonScreen, HIT + 4, e.clientX, e.clientY) || near(sunScreen, HIT + 14, e.clientX, e.clientY)));

  function resize() { const vv = window.visualViewport, w = Math.round(vv ? vv.width : innerWidth), h = Math.round(vv ? vv.height : innerHeight); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 200)); if (window.visualViewport) visualViewport.addEventListener('resize', resize); resize();

  const staleDays = Math.abs(Date.now() - ISS_EPOCH) / 86400000;
  /* temps : horloge simulée (simMs) qui avance de simSpeed secondes par seconde réelle ; sert à la Terre, à l'ISS, à la Lune et au Soleil */
  let simMs = Date.now(), lastReal = Date.now(), simSpeed = 1;
  const timeBar = document.getElementById('timeBar'), timeTxt = document.getElementById('timeTxt'), spBtns = [...document.querySelectorAll('#timeBar [data-sp]')];
  const syncSpeed = () => spBtns.forEach(b => b.classList.toggle('on', +b.dataset.sp === simSpeed));
  spBtns.forEach(b => { b.onclick = () => { simSpeed = +b.dataset.sp; syncSpeed(); }; });
  document.getElementById('bNow').onclick = () => { simMs = Date.now(); simSpeed = 1; syncSpeed(); };
  let last = performance.now(), infoT = 0; const dirv = new THREE.Vector3(), basis = new THREE.Matrix4(), fw = new THREE.Vector3(), zz = new THREE.Vector3();

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const realNow = Date.now(); simMs += (realNow - lastReal) * simSpeed; lastReal = realNow; const date = new Date(simMs);   // horloge simulée : temps réel par défaut, accélérable (boutons en bas à droite)
    iss = issState(date);
    frameF = cam.mode === 'solar' ? 1 : 0;
    const Dd = astroD(date), gm = curGm = gmstOf(Dd), solarMode = cam.mode === 'solar', sunV = sunGeo(Dd), moonV = moonInertial(Dd).pos, rotS = -gm * (1 - frameF);
    const sunAbs = sunV.clone().applyAxisAngle(Y_AXIS, rotS), moonAbs = moonV.clone().applyAxisAngle(Y_AXIS, rotS);

    // trop loin pour voir l'ISS (cachée) : on passe en vue « Terre » sans bouger la caméra (le bouton Terre s'allume)
    if (cam.mode === 'iss' && (camera.position.length() - 1) * R_KM > 20000) {
      const p = camera.position, L = p.length(); cam.mode = 'earth'; cam.tgt.set(0, 0, 0); cam.dist = cam.goal.dist = L; cam.lat = cam.goal.lat = Math.asin(p.y / L) / DEG; cam.lon = cam.goal.lon = Math.atan2(-p.z, p.x) / DEG; cam.fly = cam.tfly = 0;
      syncView('earth');
    }
    timeBar.hidden = !!launch;   // pendant une mission, le temps est celui de la mission
    // caméra : la cible suit l'ISS ou reste au centre
    if (launch) { launch.update(dt, camera); tl.update(launch); }
    const goalTgt = solarMode ? (solarTarget === 'sun' ? sunAbs : solarTarget === 'moon' ? moonAbs : tmp.set(0, 0, 0)) : cam.mode === 'iss' && iss ? iss.pos : cam.mode === 'launch' && launch ? launch.focusPos : tmp.set(0, 0, 0);
    if (cam.mode === 'launch' && launch) {   // caméra auto : sur le côté de la trajectoire, de plus en plus loin ; le zoom manuel multiplie la distance
      if (!cam.userDir) { const d = launch.camDir; cam.goal.lat = Math.asin(d.y) / DEG; cam.goal.lon = Math.atan2(-d.z, d.x) / DEG; }
      const auto = launch.camDistKm / R_KM; if (cam.zoomFit) cam.launchK = (launch.zoomLenM || launch.rocketLen) * 1.5 / 1000 / launch.camDistKm; cam.launchK = Math.max(0.02 / launch.camDistKm, Math.min(cam.launchK, (launch.maxDistU || 41) / auto));   // de 20 m de la fusée (à toute altitude) jusqu'à la Terre entière
      cam.goal.dist = auto * cam.launchK;
    }
    cam.tgt.copy(goalTgt);   // la cible est posée directement (plus de glissement entre les vues)
    // zoom (molette) : amorti pour ne pas sauter, en altitude pour la Terre (sinon l'amortissement ne bouge plus près du sol)
    const kz = 1 - Math.exp(-dt * 14), base = cam.mode === 'earth' ? 1 : 0;
    const cur = Math.max(1e-7, cam.dist - base), want = Math.max(1e-7, cam.goal.dist - base);
    cam.dist = base + Math.exp(Math.log(cur) + (Math.log(want) - Math.log(cur)) * kz);
    if (Math.abs(Math.log(cam.dist - base) - Math.log(want)) < 1e-3) cam.dist = cam.goal.dist;
    cam.lon = cam.goal.lon; cam.lat = cam.goal.lat;
    cam.goal.lon = ((cam.goal.lon + 540) % 360) - 180;
    ll(cam.lon, cam.lat, dirv);
    camera.position.copy(cam.tgt).addScaledVector(dirv, cam.dist);
    if (launch && launch.topView && cam.mode === 'launch' && launch.topUp) camera.up.copy(launch.topUp); else camera.up.set(0, 1, 0);   // vue de dessus : la direction du vol en haut de l'écran
    camera.lookAt(cam.tgt); camera.updateMatrixWorld();
    const closest = Math.max(1e-7, Math.min(cam.dist, camera.position.length() - 1) * 0.05);
    camera.near = Math.min(0.05, closest); camera.far = 4e6; camera.updateProjectionMatrix();

    // Soleil et Lune réels (cachés pendant une mission lunaire : elle a les siens)
    solar.visible = true; solar.rotation.y = rotS;
    if (sunMesh) {
      sunMesh.position.copy(sunV); orbitG.position.copy(sunV); orbitG.visible = solarMode; moonMesh.position.copy(moonV); moonQuat(moonV.clone().normalize(), ECLIPTIC_POLE, moonMesh.quaternion);
      moonDot.visible = cam.dist > 60 && !(solarMode && solarTarget === 'moon' && cam.dist < 400); earthDot.visible = solarMode && cam.dist > 300;
      for (const [d, p] of [[moonDot, moonV], [earthDot, new THREE.Vector3()]]) { const at = d.geometry.attributes.position; at.setXYZ(0, p.x, p.y, p.z); at.needsUpdate = true; }
      if (Math.abs(Dd - loopD) > 0.05) {
        loopD = Dd; const P = moonPast.geometry.attributes, F = moonFut.geometry.attributes;
        for (let k = 0; k <= 120; k++) { const q = moonInertial(Dd - 27.32 + k * 27.32 / 120).pos, f = 0.12 + 0.88 * k / 120; P.position.setXYZ(k, q.x, q.y, q.z); P.color.setXYZ(k, 0.62 * f, 0.78 * f, 1 * f); }
        for (let k = 0; k <= 60; k++) { const q = moonInertial(Dd + k * 13.66 / 60).pos; F.position.setXYZ(k, q.x, q.y, q.z); F.color.setXYZ(k, 0.45, 0.5, 0.6); }
        P.color.needsUpdate = true; F.color.needsUpdate = true; P.position.needsUpdate = true; F.position.needsUpdate = true;
      }
      { const P = moonPast.geometry.attributes.position; P.setXYZ(120, moonV.x, moonV.y, moonV.z); P.needsUpdate = true; const F = moonFut.geometry.attributes.position; F.setXYZ(0, moonV.x, moonV.y, moonV.z); F.needsUpdate = true; }   // la trace colle à la Lune à chaque image
      moonLoop.visible = solarMode || camera.position.length() > 8;
      // mesures : seulement la taille (diamètre) dans les étiquettes
      { const fr = n => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
        moonLabel.textContent = metric ? 'Lune · Ø ' + fr(2 * 1737.4) + ' km' : 'Lune'; sunLabel.textContent = metric ? 'Soleil · Ø ' + fr(2 * 695700) + ' km (' + fr(2 * 695700 / 12756) + ' Terres)' : 'Soleil (taille réelle)'; earthLabel.textContent = metric ? 'Terre · Ø 12 756 km' : 'Terre'; }
      const proj = (el, P, on) => { const pp = P.clone().project(camera); if (on && pp.z < 1 && Math.abs(pp.x) < 1 && Math.abs(pp.y) < 1) { el.style.display = 'block'; el.style.transform = `translate(${(pp.x + 1) / 2 * innerWidth + 10}px,${(1 - pp.y) / 2 * innerHeight - 8}px)`; return [(pp.x + 1) / 2 * innerWidth, (1 - pp.y) / 2 * innerHeight]; } el.style.display = 'none'; return null; };
      moonScreen = proj(moonLabel, moonAbs, camera.position.distanceTo(moonAbs) > 6); sunScreen = proj(sunLabel, sunAbs, camera.position.distanceTo(sunAbs) > 2 * SUN_R_U); proj(earthLabel, new THREE.Vector3(), solarMode && cam.dist > 300 || (metric && cam.mode === 'earth' && cam.dist > 6));
    } else { moonLabel.style.display = sunLabel.style.display = earthLabel.style.display = 'none'; moonScreen = sunScreen = null; }
    // lumière
    sun.position.copy(cam.mode === 'solar' || (launch && launch.inertial) ? camera.position.clone().sub(cam.tgt).normalize() : camera.position.clone().normalize()).add(tmp.set(0.4, 0.5, 0.2)).multiplyScalar(10); amb.intensity = 0.55;   // toujours « jour » : la Terre et la Lune sont éclairées de face (pas de nuit)

    // ISS
    issScreen = null; label.style.display = 'none';
    if (iss) {
      const dKm = camera.position.distanceTo(iss.pos) * R_KM;
      fw.copy(iss.vel).addScaledVector(iss.up, -iss.vel.dot(iss.up)).normalize(); zz.crossVectors(fw, iss.up);
      issModel.quaternion.setFromRotationMatrix(basis.makeBasis(fw, iss.up, zz));
      issModel.position.copy(iss.pos);
      const s = 1;   // ISS à sa taille réelle (109 m), à toutes les distances   // agrandissement ×150 à 200 km, qui décroît moins vite que la distance : le modèle GROSSIT quand on zoome, taille réelle vers 200 m
      issModel.scale.setScalar(s * 1e-3 / R_KM); issModel.updateMatrix();
      const px = (ISS_W / 1000 / dKm) / (2 * Math.tan(camera.fov * DEG / 2)) * innerHeight;   // largeur apparente de la station (pixels)
      issModel.visible = hiState === 'ready' && px >= 6;   // sinon : repère jaune (station < 6 px, ou modèle pas encore chargé)
      if (hiState === 'idle' && dKm < 2000) loadHi();
      dot.visible = !issModel.visible;   // le repère jaune disparaît dès qu'on voit le modèle
       dg.attributes.position.setXYZ(0, iss.pos.x, iss.pos.y, iss.pos.z); dg.attributes.position.needsUpdate = true;
      // visible à l'écran et pas caché par la Terre ?
      const d = iss.pos.clone().sub(camera.position), L = d.length(); d.divideScalar(L);
      const b = camera.position.dot(d), disc = b * b - (camera.position.lengthSq() - 1), hidden = disc > 0 && -b - Math.sqrt(disc) > 0 && -b - Math.sqrt(disc) < L;
      const p = iss.pos.clone().project(camera);
      if (!hidden && p.z < 1 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1) {
        issScreen = [(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight];
        label.style.display = 'block'; label.style.transform = `translate(${issScreen[0] + 10}px,${issScreen[1] - 8}px)`;   // le nom reste affiché à tout zoom
      }
    }

    if (solarMode || (camera.position.length() - 1) * R_KM > 20000) { issScreen = null; label.style.display = 'none'; dot.visible = false; issModel.visible = false; }   // dézoomé : l'ISS est cachée (point, nom et modèle)
    for (const b of satItems) b.classList.toggle('on', cam.mode === 'iss');   // le satellite regardé est surligné dans la liste
    // caractéristiques 3D : mise à jour puis étiquettes projetées à l'écran
    for (const f of ISS_FEATURES) {   // une caractéristique « onlyIss » (taille, hauteur) n'apparaît que sur la vue de l'ISS
      const inst = featInst[f.id]; if (!inst) continue;
      const act = !!featOn[f.id] && (!f.onlyIss || cam.mode === 'iss');
      inst.objects.forEach(o => o.visible = act); inst.labels.forEach(l => l.active = act);
      if (act && iss) inst.update(iss, camera, date);
    }
    for (const l of l3d) {
      const on = iss && l.active && !(l.needModel && !issModel.visible);
      if (!on) { l.el.style.display = 'none'; continue; }
      if (l.alongLine && l.line) {   // texte posé sur le trait, incliné comme lui, à un endroit visible
        const at = (t, clip) => { const q = l.line[0].clone().lerp(l.line[1], t).project(camera); return q.z < 1 && (!clip || (Math.abs(q.x) < 0.95 && Math.abs(q.y) < 0.95)) ? [(q.x + 1) / 2 * innerWidth, (1 - q.y) / 2 * innerHeight] : null; };
        let hit = null;
        for (const t of [0.5, 0.4, 0.3, 0.2, 0.12, 0.06, 0.6, 0.7, 0.8, 0.9, 0.03, 0.015, 0.008, 0.004, 0.002, 0.001, 0.0005]) { const p0 = at(t, true), p1 = at(t * 1.1 + 1e-5); if (p0 && p1) { hit = [p0, p1]; break; } }
        if (!hit) { l.el.style.display = 'none'; continue; }
        let ang = Math.atan2(hit[1][1] - hit[0][1], hit[1][0] - hit[0][0]) * 180 / Math.PI; if (ang > 90) ang -= 180; else if (ang < -90) ang += 180;
        l.el.style.display = 'block'; l.el.style.transform = `translate(${hit[0][0]}px,${hit[0][1]}px) translate(-50%,-130%) rotate(${ang}deg)`; continue;
      }
      const p = l.world.clone().project(camera);
      if (p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1) { l.el.style.display = 'block'; l.el.style.transform = `translate(${(p.x + 1) / 2 * innerWidth - l.el.offsetWidth / 2}px,${(1 - p.y) / 2 * innerHeight - 10}px)`; }
      else l.el.style.display = 'none';
    }

    // noms des éléments (fusée, boosters, coiffe, étage principal, satellite) collés à chacun
    if (launch) launch.tagList.forEach((t, i) => {
      const el = tagEls[i]; if (!el) return;
      const d = t.pos.clone().sub(camera.position), L = d.length(); d.divideScalar(L);
      const b = camera.position.dot(d), disc = b * b - (camera.position.lengthSq() - 1), hid = disc > 0 && -b - Math.sqrt(disc) > 0 && -b - Math.sqrt(disc) < L;
      const p = t.pos.clone().project(camera);
      if (!t.on || hid || p.z >= 1 || Math.abs(p.x) > 1 || Math.abs(p.y) > 1) { el.style.display = 'none'; return; }
      const eo = launch.elOpt(t.id), parts = [];   // nom, vitesse, hauteur selon les options de l'élément
      if (launch.opt.names) parts.push(t.text);
      if (eo.speed && t.speed != null) parts.push((t.speed / 1000).toFixed(2).replace('.', ',') + ' km/s · ' + Math.round(t.speed * 3.6).toLocaleString('fr-FR') + ' km/h');
      if (eo.alt && t.alt != null) parts.push('hauteur ' + fmtAlt(t.alt / 1000));
      const txt = parts.join(' · '); if (!txt) { el.style.display = 'none'; return; }
      if (el.textContent !== txt) el.textContent = txt;
      el.classList.toggle('follow', launch.follow === t.id);
      el.style.display = 'block'; el.style.transform = `translate(${(p.x + 1) / 2 * innerWidth + 12}px,${(1 - p.y) / 2 * innerHeight + 12}px)`;
    });
    // hauteur de la fusée : texte sur le trait vertical sous elle
    if (launch && !launch.preview && launch.elOpt('rocket').alt) { hLabel.textContent = 'Hauteur : ' + fmtAlt(launch.altM / 1000); placeAlong(hLabel, launch.pos, launch.radial); } else hLabel.style.display = 'none';
    // vitesse de la fusée : étiquette à côté d'elle
    if (launch && !launch.preview) {
      const sp = launch.st ? launch.st.v / 1000 : 0, p = launch.center.clone().project(camera);
      vLabel.textContent = fmtT(launch.T) + (launch.elOpt('rocket').speed ? '  ·  Vitesse : ' + sp.toFixed(2) + ' km/s · ' + Math.round(sp * 3600).toLocaleString('fr-FR') + ' km/h' : '');
      if (p.z < 1 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1) { vLabel.style.display = 'block'; vLabel.style.transform = `translate(${(p.x + 1) / 2 * innerWidth + 28}px,${(1 - p.y) / 2 * innerHeight - 40}px)`; } else vLabel.style.display = 'none';
    } else vLabel.style.display = 'none';
    // étapes de la trajectoire prévue : noms posés sur la trajectoire, sans chevauchement (vert une fois passées)
    if (launch) {
      const placed = [];
      launch.markers.forEach((mk, i) => {
        const el = evLabels[i]; if (!el) return;
        const d = mk.pos.clone().sub(camera.position), L = d.length(); d.divideScalar(L);
        const b = camera.position.dot(d), disc = b * b - (camera.position.lengthSq() - 1), hid = disc > 0 && -b - Math.sqrt(disc) > 0 && -b - Math.sqrt(disc) < L;
        const p = mk.pos.clone().project(camera), x = (p.x + 1) / 2 * innerWidth, y = (1 - p.y) / 2 * innerHeight;
        if (hid || p.z >= 1 || Math.abs(p.x) > 1 || Math.abs(p.y) > 1 || placed.some(q => Math.abs(q[0] - x) < 150 && Math.abs(q[1] - y) < 15)) { el.style.display = 'none'; return; }
        placed.push([x, y]); el.style.display = 'block'; el.style.transform = `translate(${x + 8}px,${y - 9}px)`; el.classList.toggle('done', launch.T >= mk.t);
      });
    }
    // photos aériennes : chargées quand la caméra est à moins de 1 500 km, affichées sous 700 km ; traits de côte et frontières masqués dessus (vue de près : ils flotteraient au-dessus de la photo)
    {
      const camE = launch && launch.inertial ? camera.position.clone().applyAxisAngle(Y_AXIS, -LCH.WE * launch.T) : camera.position, camAlt = (camE.length() - 1) * R_KM, cl = Math.asin(camE.y / camE.length()) / DEG, co = Math.atan2(-camE.z, camE.x) / DEG;
      let inside = false;
      for (const p of PHOTO_PATCHES) {
        const [w, e, s, n] = p.bounds, dKm = camE.distanceTo(ll((w + e) / 2, (s + n) / 2)) * R_KM;
        if (dKm < (p.loadKm || 1500) && /^https?:/.test(location.protocol)) loadPatch(p, renderer, earth);
        if (p.mesh && dKm > 4000) unloadPatch(p, earth);
        if (p.mesh) { p.mesh.visible = dKm < p.hideKm; if (p.mesh.visible && camAlt < 60 && co > w && co < e && cl > s && cl < n) inside = true; }
      }
      for (let k = 1; k < earth.children.length; k++) if (earth.children[k].isLineSegments) earth.children[k].visible = !inside && camAlt < 20000;   // dézoomé : plus de frontières ni de trait de côte (la texture suffit)
    }
    // échelle : longueur « ronde » (1, 2, 5 × 10^n) qui fait 70 à 170 px au point regardé (en vue Terre : à la surface, sous le centre ; sinon : à la distance de la cible)
    {
      const dKm = cam.mode === 'earth' ? (camera.position.length() - 1) * R_KM : cam.dist * R_KM;
      if (dKm > 1e-6) {
        const pxPerKm = innerHeight / (2 * dKm * Math.tan(camera.fov * DEG / 2)), raw = 140 / pxPerKm, e10 = Math.pow(10, Math.floor(Math.log10(raw)));
        let n = [5, 2, 1].map(k => k * e10).find(v => v <= raw) || e10, lbl = n < 1 ? Math.round(n * 1000).toLocaleString('fr-FR') + ' m' : n.toLocaleString('fr-FR') + ' km';
        if (raw >= 1e7) { const u = raw >= 0.1 * KM_AL ? KM_AL : KM_UA, ru = raw / u, e = Math.pow(10, Math.floor(Math.log10(ru))), nu = [5, 2, 1].map(k => k * e).find(v => v <= ru) || e; n = nu * u; lbl = nu.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + (u === KM_AL ? ' al' : ' UA'); }   // échelle en UA ou années-lumière quand on est très loin
        scaleBar.style.width = Math.round(n * pxPerKm) + 'px'; if (scaleTxt.textContent !== lbl) scaleTxt.textContent = lbl;
      }
    }
    // sites de lancement : visibles hors de la vue de lancement, quand ils sont du côté visible de la Terre
    const farOut = (camera.position.length() - 1) * R_KM > 20000 || solarMode;   // dézoomé : plus de bases de lancement
    siteDots.visible = MISSIONS && cam.mode !== 'launch' && !farOut;
    LAUNCH_SITES.forEach((s, i) => {
      const el = siteLabels[i], u = siteU[i], p = u.clone().multiplyScalar(SITE_R).project(camera);
      if (MISSIONS && cam.mode !== 'launch' && !farOut && camera.position.dot(u) > SITE_R && p.z < 1 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1) { el.style.display = 'block'; el.style.transform = `translate(${(p.x + 1) / 2 * innerWidth + 8}px,${(1 - p.y) / 2 * innerHeight - 9}px)`; }
      else el.style.display = 'none';
    });

    infoT -= dt;
    if (infoT <= 0) {
      infoT = 0.2; if (launch) { if (MISSIONS) { lp.update(launch); storyUI.update(launch); } else sat.update(launch); }
      const altCam = (camera.position.length() - 1) * R_KM, f = v => v >= 1000 ? Math.round(v).toLocaleString('fr-FR') : v.toFixed(v < 10 ? 1 : 0);
      timeTxt.textContent = date.toLocaleString('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' UTC' + (simSpeed > 1 ? ' · accéléré' : '');
      let t = `Caméra : ${fmtBig(altCam) || f(altCam) + ' km'} d'altitude` + (cam.mode === 'iss' ? ` · ${fmtBig(cam.dist * R_KM) || f(cam.dist * R_KM) + ' km'} de l'ISS` : '');
      if (iss) t += `\nISS : ${f(iss.alt)} km · ${iss.speed.toFixed(2)} km/s (${Math.round(iss.speed * 3600).toLocaleString('fr-FR')} km/h) · ${Math.abs(iss.lat).toFixed(1)}°${iss.lat < 0 ? 'S' : 'N'} ${Math.abs(iss.lon).toFixed(1)}°${iss.lon < 0 ? 'O' : 'E'}`;
      else t += '\nISS : hors de la période du TLE';
      if (staleDays > 60) t += '\n(TLE ancien : position de l\'ISS imprécise)';
      if (hiState === 'loading') t += '\nChargement du modèle détaillé de l\'ISS…';
      if (cam.mode === 'iss') t += "\nÉchelle réelle : l'ISS (109 m) n'est visible qu'à moins de ~17 km.";
      const dMoon = moonV.length() * R_KM, dSun = sunV.length() * R_KM; t += `\nLune à ${Math.round(dMoon).toLocaleString('fr-FR')} km · Soleil à ${fmtBig(dSun) || Math.round(dSun).toLocaleString('fr-FR') + ' km'}`;
      if (solarMode) t += solarTarget === 'sun' ? '\nVue du Soleil : la Terre tourne sur elle-même et autour de lui (échelle réelle : Terre et Lune sont des points)' : '\nVue de la Lune : la Terre tourne, la Lune lui présente toujours la même face';
      info.textContent = t;
      // paramètres de la vue (à copier-coller pour les régler)
      const v = currentView();
      viewJson.textContent = JSON.stringify(v); viewTxt.dataset.json = viewJson.textContent;
    }
    // origine flottante : près de l'ISS, on recentre le monde sur elle pour rendre sans perte de précision
    const shift = cam.mode === 'launch' && launch ? launch.focusPos : iss && camera.position.distanceTo(iss.pos) * R_KM < 3000 ? iss.pos : null, saved = camera.position.clone();
    world.rotation.y = gm * frameF;
    if (shift) { world.position.copy(shift).negate(); camera.position.sub(shift); camera.updateMatrixWorld(); } else world.position.set(0, 0, 0);
    inertial.position.copy(world.position); solar.position.copy(world.position);
    renderer.render(scene, camera);
    camera.position.copy(saved); camera.updateMatrixWorld();
    requestAnimationFrame(frame);
  }
  msg.remove();
  requestAnimationFrame(frame);
})();

(function () {
  const canvas = document.getElementById('gl'), msg = document.getElementById('msg'), info = document.getElementById('info'), label = document.getElementById('issLabel');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true }); }
  catch (e) { msg.textContent = 'WebGL indisponible dans ce navigateur.'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, 1, 0.001, 200);
  const world = new THREE.Group(); scene.add(world);   // tout ce qui est décalé à l'affichage (origine flottante près de l'ISS : précision au mètre)
  const earth = buildEarth(renderer); world.add(earth);

  // fond d'étoiles
  const sp = new Float32Array(3 * 3000), tmp = new THREE.Vector3();
  for (let i = 0; i < 3000; i++) { tmp.set(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize().multiplyScalar(90); sp.set([tmp.x, tmp.y, tmp.z], 3 * i); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, sizeAttenuation: false, depthWrite: false })));

  // lumière : par défaut « de face » (la Terre est lisible partout), ou le vrai Soleil (jour/nuit)
  const amb = new THREE.AmbientLight(0xffffff, 0.55), sun = new THREE.DirectionalLight(0xffffff, 1.0);
  scene.add(amb, sun, sun.target);
  let realSun = false;
  function subsolar(d) {
    const n = (d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000, dec = -23.44 * Math.cos(2 * Math.PI * (n + 10) / 365);
    return ll((12 - (d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600)) * 15, dec);
  }

  // ISS : modèle (agrandi quand on est loin, pour qu'on la voie) + repère
  const issModel = new THREE.Group(); world.add(issModel);
  // modèle détaillé NASA (textures, ~14 Mo, data/iss-nasa.glb), chargé quand on s'approche ; remplace le modèle simple sous 400 km. Repli : on garde le modèle simple (file:// ou erreur).
  const issHi = new THREE.Group(); issModel.add(issHi);
  let hiState = 'idle';
  function loadHi() {
    hiState = 'loading';
    loadGlb('data/iss-nasa.glb').then(root => {
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
    cam.mode = m; cam.fly = 2.2; cam.tfly = 2.2;
    document.getElementById('bEarth').classList.toggle('on', m === 'earth');
    document.getElementById('bIss').classList.toggle('on', m === 'iss');
    if (m === 'launch') cam.userDir = false;   // caméra auto de la fusée (réglée dans la boucle)
    if (m === 'iss' && iss) {   // on regarde l'ISS d'en haut, un peu de côté (la Terre en fond)
      const side = new THREE.Vector3().crossVectors(iss.up, iss.vel).normalize(), v = iss.up.clone().addScaledVector(side, 0.55).normalize();
      cam.goal.lat = Math.asin(v.y) / DEG; cam.goal.lon = Math.atan2(-v.z, v.x) / DEG; cam.goal.dist = 0.25 / R_KM;   // 250 m : la station (109 m) remplit bien l'écran
    } else if (m === 'earth') {
      if (iss) { cam.goal.lat = iss.lat * 0.7; cam.goal.lon = iss.lon; }
      cam.goal.dist = 3.4;
    }
  }
  cam.onEarth = () => setMode('earth');
  document.getElementById('bEarth').onclick = () => setMode('earth');
  document.getElementById('bIss').onclick = () => goIss();
  document.getElementById('bSun').onclick = e => { realSun = !realSun; e.currentTarget.classList.toggle('on', realSun); };

  // caractéristiques de l'ISS affichées en 3D (cases à cocher ; définies dans ISS_FEATURES, js/iss.js)
  const VIEW_ISS = { yaw: -38, pitch: 55.5, dist: 0.5 };   // vue quand on zoome sur l'ISS (yaw °, pitch °, distance km) — réglée par l'utilisateur
  const VIEW_BEHIND = { yaw: 0, pitch: 25, dist: 1500 };   // vue « au-dessus, un peu derrière » (yaw °, pitch °, distance km à l'ISS)
  const viewTxt = document.getElementById('viewTxt'), viewJson = document.getElementById('viewJson');
  const scaleBar = document.getElementById('scaleBar'), scaleTxt = document.getElementById('scaleTxt');
  const featCb = {}, l3d = [], featOn = {}, featInst = {}, featPanel = document.getElementById('feat');
  const fctx = { scene: world, model: issModel, label(text) { const el = document.createElement('div'); el.className = 'l3d'; el.textContent = text; document.body.appendChild(el); const l = { el, world: new THREE.Vector3(), needModel: false }; l3d.push(l); return l; } };
  for (const f of ISS_FEATURES) {
    const lab = document.createElement('label'), cb = document.createElement('input'); cb.type = 'checkbox';
    cb.onchange = () => {
      featOn[f.id] = cb.checked;
      if (cb.checked && !featInst[f.id]) { featInst[f.id] = f.build(fctx); }
      const inst = featInst[f.id]; if (inst) { inst.objects.forEach(o => o.visible = cb.checked); inst.labels.forEach(l => { if (!cb.checked) l.el.style.display = 'none'; }); }
    };
    featCb[f.id] = cb; lab.append(cb, ' ' + f.label); featPanel.append(lab);
  }
  // repère local de l'ISS : f = sens du vol (à l'horizontale), u = zénith, s = côté ; yaw 0 = derrière elle, pitch = hauteur de la caméra au-dessus de l'horizontale
  const frameIss = () => { const u = iss.up, f = iss.vel.clone().addScaledVector(u, -iss.vel.dot(u)).normalize(); return { f, u, s: new THREE.Vector3().crossVectors(u, f) }; };
  function applyLocal(yaw, pitch, distKm, now) {   // place la caméra autour de l'ISS (yaw, pitch en °, distance en km) ; now = sans transition
    const F = frameIss(), y = yaw * DEG, p = Math.max(-89.5, Math.min(89.5, pitch)) * DEG;
    const d = F.f.clone().multiplyScalar(-Math.cos(y) * Math.cos(p)).addScaledVector(F.s, Math.sin(y) * Math.cos(p)).addScaledVector(F.u, Math.sin(p));
    cam.goal.lat = Math.asin(d.y) / DEG; cam.goal.lon = Math.atan2(-d.z, d.x) / DEG; cam.goal.dist = Math.max(0.1, distKm) / R_KM;
    if (now) { cam.lon = cam.goal.lon; cam.lat = cam.goal.lat; cam.fly = 0; }
  }
  function setViewLocal(yaw, pitch, distKm) {
    if (!iss) return; setMode('iss'); applyLocal(yaw, pitch, distKm, false);
    if (featCb.size && !featCb.size.checked) { featCb.size.checked = true; featCb.size.onchange(); }   // on affiche la hauteur
  }
  // réglage fin de la vue (boutons ◀ ▶ ▲ ▼ ＋ －, pas réglable, répétition en maintenant)
  const STEPS = [0.5, 1, 5, 15]; let stepI = 1;
  function currentView() {
    const rd = x => Math.round(x * 10) / 10, altCam = (camera.position.length() - 1) * R_KM;
    if (cam.mode === 'iss' && iss) { const F = frameIss(), d = camera.position.clone().sub(cam.tgt).normalize(); return { mode: 'iss', yaw: rd(Math.atan2(d.dot(F.s), -d.dot(F.f)) / DEG), pitch: rd(Math.asin(Math.max(-1, Math.min(1, d.dot(F.u)))) / DEG), distKm: Math.round(cam.dist * R_KM * 1000) / 1000, fov: camera.fov }; }
    if (cam.mode === 'launch') return { mode: 'launch', distKm: Math.round(cam.dist * R_KM * 1000) / 1000, zoom: Math.round(cam.launchK * 1000) / 1000, auto: !cam.userDir, fov: camera.fov };
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
      else cam.goal.dist = 1 + Math.min(40, Math.max(2 / R_KM, (cam.goal.dist - 1) * (sgn > 0 ? f : 1 / f)));
      cam.lon = cam.goal.lon; cam.lat = cam.goal.lat; cam.fly = 0;
    }
  }
  document.querySelectorAll('#nudge [data-n]').forEach(b => {
    let tm = null; const stop = () => { clearInterval(tm); tm = null; };
    b.addEventListener('pointerdown', e => { e.preventDefault(); nudge(b.dataset.n); stop(); tm = setTimeout(() => { tm = setInterval(() => nudge(b.dataset.n), 70); }, 350); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => { clearTimeout(tm); stop(); }));
  });
  const bStep = document.getElementById('bStep'); bStep.onclick = () => { stepI = (stepI + 1) % STEPS.length; bStep.textContent = STEPS[stepI] + '°'; };
  const goIss = () => setViewLocal(VIEW_ISS.yaw, VIEW_ISS.pitch, VIEW_ISS.dist);
  // ---------- lancement d'un satellite (js/launch-3d.js) ----------
  const fmtAlt = km => km < 10 ? Math.round(km * 1000).toLocaleString('fr-FR') + ' m' : (km < 1000 ? km.toFixed(1) : Math.round(km).toLocaleString('fr-FR')) + ' km';
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
  let launch = null, evLabels = [], tagEls = [], slowOn = true, lastSel = null; const lbox = document.getElementById('launchPanel');
  // crée la mission (aperçu : à l'arrêt, vue de la Terre entière centrée sur le site ; sinon vol : caméra de la fusée)
  const optShared = launchOptDefault(), optUI = buildOptionsPanel(document.getElementById('optPanel')); optUI.clear();
  document.getElementById('bOpts').onclick = e => { const p = document.getElementById('optPanel'); p.hidden = !p.hidden; e.currentTarget.classList.toggle('on', !p.hidden); };
  const storyUI = buildStoryPanel(document.getElementById('story')), tl = buildTimeline(document.getElementById('timeline'), { jump: T => { if (launch) launch.jump(T); }, hold: on => { if (!launch) return; if (on) { launch._was = launch.playing; launch.playing = false; } else { if (launch._was) launch.playing = true; launch._was = false; } } });
  function makeLaunch(site, type, preview) {
    evLabels.forEach(e => e.remove()); tagEls.forEach(e => e.remove());
    if (launch) launch.dispose();
    launch = new Launch(site, type.km, type.payload * 1000, type.scale, { az: type.az, rocketId: type.rocket, apoKm: type.apoKm, story: type.story, opt: optShared }); world.add(launch.group);
    tagEls = launch.tagList.map(t => { const el = document.createElement('div'); el.className = 'l3d tag'; el.textContent = t.text; el.title = 'Cliquer pour suivre'; el.onclick = () => { if (!launch || launch.preview) return; launch.follow = t.id; cam.userDir = false; cam.launchK = 1; setMode('launch'); }; document.body.appendChild(el); return el; });
    evLabels = launch.markers.map(mk => { const el = document.createElement('div'); el.className = 'l3d evl'; el.textContent = fmtT(mk.t) + ' ' + mk.label + ' · ' + fmtAlt(mk.altKm); document.body.appendChild(el); return el; });
    launch.stepPause = slowOn; launch.preview = !!preview; lastSel = { site, type };
    if (preview) { launch.playing = false; setMode('earth'); cam.goal.lon = site.lon; cam.goal.lat = site.lat * 0.6; cam.goal.dist = Math.max(3.4, 1 + 1.6 * (1 + type.km / 6378)); }
    else { cam.launchK = 1; setMode('launch'); }
    lp.show(launch);
    if (type.story && STORIES[type.story]) storyUI.show(STORIES[type.story]); else storyUI.hide();
    optUI.show(launch);
    tl.show(launch, type.story && STORIES[type.story]);   // frise du temps en bas de l'écran   // mission historique : récit et photos
  }
  const lp = buildLaunchPanel(lbox, {
    start(site, type) { makeLaunch(site, type, false); },
    preview(site, type) { if (launch && !launch.preview && launch.T > 0) return; makeLaunch(site, type, true); },   // aperçu : trajectoire prévue et étapes dès le choix du satellite (sans casser un vol en cours)
    slow(on) { slowOn = on; if (launch) launch.stepPause = on; },
    stop() { if (lastSel) makeLaunch(lastSel.site, lastSel.type, true); },   // « Arrêter » : retour à l'aperçu du même choix
    speed(v) { if (!launch) return; if (v === 0) launch.playing = false; else { launch.playing = true; launch.speed = v; if (launch.preview) { launch.preview = false; cam.launchK = 1; setMode('launch'); } } },   // lecture depuis l'aperçu : le vol démarre
    jump(T) { if (launch) launch.jump(T); },
    next() { if (!launch) return; const e = [{ t: 0 }].concat(launch.sim.events).find(x => x.t > launch.T + 1.5); if (e) launch.jump(Math.max(0, e.t - 1)); },
    cam() { cam.userDir = false; cam.launchK = 1; if (launch) launch.follow = 'rocket'; if (cam.mode !== 'launch' && launch) setMode('launch'); },
    quit() { evLabels.forEach(e => e.remove()); evLabels = []; tagEls.forEach(e => e.remove()); tagEls = []; hLabel.style.display = 'none'; vLabel.style.display = 'none'; tl.hide(); optUI.clear(); if (launch) { launch.dispose(); launch = null; } lp.hide(); if (cam.mode === 'launch') setMode('earth'); },
  });
  const SITE_R = 1 + 1e-5;   // les points des sites sont posés AU SOL (64 m au-dessus de la sphère : pas de scintillement de profondeur)
  // sites de lancement sur la carte : points + noms cliquables (choisit le site dans le panneau)
  const sg2 = new THREE.BufferGeometry(), sp2 = new Float32Array(LAUNCH_SITES.length * 3), siteU = LAUNCH_SITES.map((s, i) => { const u = ll(s.lon, s.lat); sp2.set([u.x * SITE_R, u.y * SITE_R, u.z * SITE_R], 3 * i); return u; });
  sg2.setAttribute('position', new THREE.BufferAttribute(sp2, 3));
  const siteDots = new THREE.Points(sg2, new THREE.PointsMaterial({ color: 0xff5a3c, size: 9, sizeAttenuation: false })); siteDots.frustumCulled = false; world.add(siteDots);
  const siteLabels = LAUNCH_SITES.map((s, i) => { const el = document.createElement('div'); el.className = 'l3d site'; el.textContent = '🚀 ' + s.name; el.onclick = () => { lp.pick(i); lbox.hidden = false; document.getElementById('bLaunch').classList.add('on'); }; document.body.appendChild(el); return el; });
  document.getElementById('bLaunch').onclick = e => {
    lbox.hidden = !lbox.hidden; e.currentTarget.classList.toggle('on', !lbox.hidden);
    if (!lbox.hidden) lp.preview();   // ouverture : aperçu du choix courant
    else if (launch && launch.preview) { evLabels.forEach(x => x.remove()); evLabels = []; tagEls.forEach(x => x.remove()); tagEls = []; launch.dispose(); launch = null; hLabel.style.display = 'none'; vLabel.style.display = 'none'; lp.hide(); storyUI.hide(); tl.hide(); optUI.clear(); }   // fermeture : on retire l'aperçu
  };
  document.getElementById('bBehind').onclick = () => setViewLocal(VIEW_BEHIND.yaw, VIEW_BEHIND.pitch, VIEW_BEHIND.dist);
  document.getElementById('bCopy').onclick = () => { const t = viewTxt.dataset.json || ''; try { navigator.clipboard.writeText(t); } catch (e) {} const r = document.createRange(); r.selectNodeContents(viewJson); getSelection().removeAllRanges(); getSelection().addRange(r); };
  document.getElementById('bFeat').onclick = e => { featPanel.hidden = !featPanel.hidden; e.currentTarget.classList.toggle('on', !featPanel.hidden); };

  let issScreen = null;   // position écran de l'ISS si visible
  attachControls(canvas, cam, (x, y) => { if (issScreen && Math.hypot(x - issScreen[0], y - issScreen[1]) < 26) goIss(); });
  canvas.addEventListener('pointermove', e => canvas.classList.toggle('hand', !!issScreen && Math.hypot(e.clientX - issScreen[0], e.clientY - issScreen[1]) < 26));

  function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();

  const staleDays = Math.abs(Date.now() - ISS_EPOCH) / 86400000;
  let last = performance.now(), infoT = 0; const dirv = new THREE.Vector3(), basis = new THREE.Matrix4(), fw = new THREE.Vector3(), zz = new THREE.Vector3();

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const date = new Date();
    iss = issState(date);

    // caméra : la cible suit l'ISS ou reste au centre ; transitions douces
    if (launch) { launch.update(dt, camera); tl.update(launch); }
    const goalTgt = cam.mode === 'iss' && iss ? iss.pos : cam.mode === 'launch' && launch ? launch.focusPos : tmp.set(0, 0, 0);
    if (cam.mode === 'launch' && launch) {   // caméra auto : sur le côté de la trajectoire, de plus en plus loin ; le zoom manuel multiplie la distance
      if (!cam.userDir) { const d = launch.camDir; cam.goal.lat = Math.asin(d.y) / DEG; cam.goal.lon = Math.atan2(-d.z, d.x) / DEG; }
      const auto = launch.camDistKm / R_KM; cam.launchK = Math.max(0.02 / launch.camDistKm, Math.min(cam.launchK, 41 / auto));   // de 20 m de la fusée (à toute altitude) jusqu'à la Terre entière
      cam.goal.dist = auto * cam.launchK;
    }
    if (cam.tfly > 0) { cam.tgt.lerp(goalTgt, 1 - Math.exp(-dt * 3.2)); cam.tfly -= dt; } else cam.tgt.copy(goalTgt);
    // zoom : toujours amorti (jamais de saut), en altitude pour la Terre (sinon l'amortissement ne bouge plus près du sol)
    const kz = 1 - Math.exp(-dt * (cam.tfly > 0 ? 3.2 : 14)), base = cam.mode === 'earth' && cam.tfly <= 0 ? 1 : 0;
    const cur = Math.max(1e-7, cam.dist - base), want = Math.max(1e-7, cam.goal.dist - base);
    cam.dist = base + Math.exp(Math.log(cur) + (Math.log(want) - Math.log(cur)) * kz);
    if (Math.abs(Math.log(cam.dist - base) - Math.log(want)) < 1e-3) cam.dist = cam.goal.dist;
    if (cam.fly > 0) { const k = 1 - Math.exp(-dt * 3.2); cam.lon += angDiff(cam.lon, cam.goal.lon) * k; cam.lat += (cam.goal.lat - cam.lat) * k; cam.fly -= dt; }
    else { cam.lon = cam.goal.lon; cam.lat = cam.goal.lat; }
    cam.goal.lon = ((cam.goal.lon + 540) % 360) - 180;
    ll(cam.lon, cam.lat, dirv);
    camera.position.copy(cam.tgt).addScaledVector(dirv, cam.dist);
    camera.up.set(0, 1, 0); camera.lookAt(cam.tgt); camera.updateMatrixWorld();
    const closest = Math.max(1e-7, Math.min(cam.dist, camera.position.length() - 1) * 0.05);
    camera.near = Math.min(0.05, closest); camera.far = 200; camera.updateProjectionMatrix();

    // lumière
    if (realSun) { sun.position.copy(subsolar(date)).multiplyScalar(10); amb.intensity = 0.22; }
    else { sun.position.copy(camera.position).normalize().add(tmp.set(0.4, 0.5, 0.2)).multiplyScalar(10); amb.intensity = 0.55; }

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
      const camAlt = (camera.position.length() - 1) * R_KM, cl = Math.asin(camera.position.y / camera.position.length()) / DEG, co = Math.atan2(-camera.position.z, camera.position.x) / DEG;
      let inside = false;
      for (const p of PHOTO_PATCHES) {
        const [w, e, s, n] = p.bounds, dKm = camera.position.distanceTo(ll((w + e) / 2, (s + n) / 2)) * R_KM;
        if (dKm < (p.loadKm || 1500) && /^https?:/.test(location.protocol)) loadPatch(p, renderer, earth);
        if (p.mesh && dKm > 4000) unloadPatch(p, earth);
        if (p.mesh) { p.mesh.visible = dKm < p.hideKm; if (p.mesh.visible && camAlt < 60 && co > w && co < e && cl > s && cl < n) inside = true; }
      }
      for (let k = 1; k < earth.children.length; k++) if (earth.children[k].isLineSegments) earth.children[k].visible = !inside;
    }
    // échelle : longueur « ronde » (1, 2, 5 × 10^n) qui fait 70 à 170 px au point regardé (en vue Terre : à la surface, sous le centre ; sinon : à la distance de la cible)
    {
      const dKm = cam.mode === 'earth' ? (camera.position.length() - 1) * R_KM : cam.dist * R_KM;
      if (dKm > 1e-6) {
        const pxPerKm = innerHeight / (2 * dKm * Math.tan(camera.fov * DEG / 2)), raw = 140 / pxPerKm, e10 = Math.pow(10, Math.floor(Math.log10(raw)));
        const n = [5, 2, 1].map(k => k * e10).find(v => v <= raw) || e10, lbl = n < 1 ? Math.round(n * 1000).toLocaleString('fr-FR') + ' m' : n.toLocaleString('fr-FR') + ' km';
        scaleBar.style.width = Math.round(n * pxPerKm) + 'px'; if (scaleTxt.textContent !== lbl) scaleTxt.textContent = lbl;
      }
    }
    // sites de lancement : visibles hors de la vue de lancement, quand ils sont du côté visible de la Terre
    siteDots.visible = cam.mode !== 'launch';
    LAUNCH_SITES.forEach((s, i) => {
      const el = siteLabels[i], u = siteU[i], p = u.clone().multiplyScalar(SITE_R).project(camera);
      if (cam.mode !== 'launch' && camera.position.dot(u) > SITE_R && p.z < 1 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1) { el.style.display = 'block'; el.style.transform = `translate(${(p.x + 1) / 2 * innerWidth + 8}px,${(1 - p.y) / 2 * innerHeight - 9}px)`; }
      else el.style.display = 'none';
    });

    infoT -= dt;
    if (infoT <= 0) {
      infoT = 0.2; if (launch) { lp.update(launch); storyUI.update(launch); optUI.update(launch); }
      const altCam = (camera.position.length() - 1) * R_KM, f = v => v >= 1000 ? Math.round(v).toLocaleString('fr-FR') : v.toFixed(v < 10 ? 1 : 0);
      let t = `Caméra : ${f(altCam)} km d'altitude` + (cam.mode === 'iss' ? ` · ${f(cam.dist * R_KM)} km de l'ISS` : '');
      if (iss) t += `\nISS : ${f(iss.alt)} km · ${iss.speed.toFixed(2)} km/s (${Math.round(iss.speed * 3600).toLocaleString('fr-FR')} km/h) · ${Math.abs(iss.lat).toFixed(1)}°${iss.lat < 0 ? 'S' : 'N'} ${Math.abs(iss.lon).toFixed(1)}°${iss.lon < 0 ? 'O' : 'E'}`;
      else t += '\nISS : hors de la période du TLE';
      if (staleDays > 60) t += '\n(TLE ancien : position de l\'ISS imprécise)';
      if (hiState === 'loading') t += '\nChargement du modèle détaillé de l\'ISS…';
      if (cam.mode === 'iss') t += "\nÉchelle réelle : l'ISS (109 m) n'est visible qu'à moins de ~17 km.";
      info.textContent = t;
      // paramètres de la vue (à copier-coller pour les régler)
      const v = currentView();
      viewJson.textContent = JSON.stringify(v); viewTxt.dataset.json = viewJson.textContent;
    }
    // origine flottante : près de l'ISS, on recentre le monde sur elle pour rendre sans perte de précision
    const shift = cam.mode === 'launch' && launch ? launch.focusPos : iss && camera.position.distanceTo(iss.pos) * R_KM < 3000 ? iss.pos : null, saved = camera.position.clone();
    if (shift) { world.position.copy(shift).negate(); camera.position.sub(shift); camera.updateMatrixWorld(); } else world.position.set(0, 0, 0);
    renderer.render(scene, camera);
    camera.position.copy(saved); camera.updateMatrixWorld();
    requestAnimationFrame(frame);
  }
  msg.remove();
  requestAnimationFrame(frame);
})();

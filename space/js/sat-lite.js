// Lancement de satellite « simple », entièrement décrit par un PLAN DE VOL JSON (data/plans/*.json) : site et direction du tir, fusée (forme, couleurs, masses, moteurs), direction de la poussée au cours du temps,
// allumages, extinctions, largages (avec leur vitesse et leur désintégration), et même le retour d'un étage sur la tour. Le moteur (js/flight-plan.js) rejoue le plan sans guidage.
// Plans embarqués : js/data/plans.js (FLIGHT_PLANS, générés par tools/make-plan.js et tools/make-starship.js) ; sur http(s) le JSON est relu à chaque lancement (FLIGHT_PLAN_FILES) ;
// et le bouton « Ouvrir un plan JSON » envoie n'importe quel plan de ce format : il se lance tel quel (c'est le but : envoyer n'importe quoi avec un simple JSON).
// La fusée part et suit une LISTE DE CHOSES À FAIRE (décollage, … satellite en orbite, et boostback / atterrissage du booster) cochée au fur et à mesure. Pas de frise, pas de bulles, pas de ralenti ni de zoom sur les étapes :
// boutons de vue (zoom fusée, vue de dessus, caméra auto, suivre le booster) et vitesses de lecture.
function buildSatPanel(box, hooks) {
  const el = (tag, props, ...kids) => { const e = Object.assign(document.createElement(tag), props || {}); e.append(...kids); return e; };
  const keys = Object.keys(FLIGHT_PLANS), planSel = el('select'), info = el('div', { className: 'ldesc' }), go = el('button', { className: 'go', textContent: '🚀 Lancer' });
  keys.forEach(k => planSel.append(el('option', { value: k, textContent: FLIGHT_PLANS[k].name })));
  Object.keys(FLIGHT_OBJECTS).forEach(k => planSel.append(el('option', { value: 'obj:' + k, textContent: '🧪 ' + FLIGHT_OBJECTS[k].name })));   // objets génériques (js/flight-object.js)
  let custom = null;   // plan ou objet envoyé par l'utilisateur (fichier JSON)
  const keyOf = () => (FLIGHT_PLANS[planSel.value] || FLIGHT_OBJECTS[planSel.value.replace(/^obj:/, '')] ? planSel.value : keys[0]), planOf = () => custom || (keyOf().startsWith('obj:') ? FLIGHT_OBJECTS[keyOf().slice(4)] : FLIGHT_PLANS[keyOf()]);
  const describeObj = O => { const k = O.timeline.slice().sort((a, b) => a.t - b.t), m0 = (k.find(x => x.massKg != null) || {}).massKg || O.massKg, s = O.start, v = s.speedMs || 0; return 'Objet : ' + ((O.visual && O.visual.name) || O.name) + '\nDépart : ' + s.lat + '°, ' + s.lon + '°, altitude ' + (s.altitudeKm || 0) + ' km, vitesse ' + Math.round(v) + ' m/s\nMasse de départ : ' + Math.round(m0 / 100) / 10 + ' t, ' + k.length + ' paliers jusqu’à T+' + k[k.length - 1].t + ' s, puis vol sans moteur.\nObjet décrit par un JSON minimal : une vitesse insuffisante et il retombe.'; };
  const describe = P => { if (P.timeline) return describeObj(P); const sp = planToSpec(P), ret = P.returns && P.returns.stage1; return 'Base : ' + P.site.name + '\nFusée : ' + sp.name + '\nSatellite de ' + (P.vehicle.payloadKg / 1000) + ' t sur une orbite circulaire de ' + P.target.altitudeKm + ' km (' + fmtPeriod(P.target.altitudeKm) + ' par tour).' + (ret ? '\nLe booster revient se poser sur la tour (boostback, atterrissage).' : '') + '\nPlan de vol : ' + (custom ? 'fichier envoyé' : (FLIGHT_PLAN_FILES[keyOf()] || 'embarqué')) + ' (direction, poussée et masses en fonction du temps)'; };
  const refresh = () => { info.textContent = describe(planOf()); };
  planSel.onchange = () => { custom = null; refresh(); }; refresh();
  const file = el('input', { type: 'file', accept: '.json,application/json', hidden: true }), msg0 = el('div', { className: 'lmsg' });
  file.onchange = () => { const f = file.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { try { const P = JSON.parse(rd.result); if (P.timeline) validateObject(P); else for (const k of ['site', 'vehicle', 'pitch', 'events', 'target']) if (!P[k]) throw new Error('champ « ' + k + ' » manquant'); custom = P; msg0.textContent = ''; refresh(); } catch (e) { msg0.textContent = 'Plan illisible : ' + e.message; } }; rd.readAsText(f); file.value = ''; };
  const bFile = el('button', { textContent: '📂 Ouvrir un plan JSON', title: 'Envoie un plan de vol (data/plans/*.json) ou un objet (data/objects/*.json) : il se lance tel quel', onclick: () => file.click() });
  const tel = el('pre', { className: 'ltel' }), list = el('div', { className: 'levs' }), msg = el('div', { className: 'lmsg' });
  const speeds = el('div'), spB = [];
  [['⏸', 0], ['×1', 1], ['×5', 5], ['×20', 20], ['×60', 60], ['×200', 200]].forEach(([n, v]) => { const b = el('button', { textContent: n, onclick: () => hooks.speed(v) }); spB.push([b, v]); speeds.append(b); });
  const bZoom = el('button', { textContent: '🔍 Zoom fusée', title: 'Se rapproche pour bien voir la fusée', onclick: () => hooks.zoom() }), bTop = el('button', { textContent: '⬆ Vue de dessus', title: 'Caméra au-dessus du plan de la trajectoire (vue de dessus de la montée en orbite)', onclick: () => hooks.top() }), bAuto = el('button', { textContent: '🎥 Caméra auto', onclick: () => hooks.cam() }), bBoost = el('button', { textContent: '🛬 Suivre le booster', title: 'La caméra suit le booster qui revient se poser', hidden: true, onclick: () => hooks.booster() });
  const run = el('div', { hidden: true }, tel, speeds, el('div', {}, bZoom, bTop, bAuto, bBoost), msg, el('div', { className: 'osub', textContent: 'À faire' }), list);
  const head = el('div', { className: 'ohead' }, el('b', { textContent: '🚀 Lancer un satellite' }), el('button', { textContent: '✖', title: 'Fermer', onclick: () => hooks.close() }));
  let running = false, items = [];
  const syncGo = () => { go.textContent = running ? '⏹ Arrêter' : '🚀 Lancer'; go.classList.toggle('stop', running); planSel.disabled = running; bFile.disabled = running; };
  go.onclick = () => { if (running) hooks.stop(); else hooks.start(keyOf(), custom); };
  box.innerHTML = ''; box.append(head, el('label', {}, 'Vol : ', planSel), info, bFile, file, msg0, go, run);
  return {
    show(launch) {   // un vol commence : liste de choses à faire = décollage + événements du plan (et du retour du booster)
      running = true; syncGo(); run.hidden = false; list.innerHTML = ''; items = [];
      const evs = [{ t: 0, label: 'Décollage' }].concat(launch.sim.events.map(e => ({ t: e.t, label: e.label })), (launch.extraEvents || []).map(e => ({ t: e.t, label: e.label }))).sort((a, b) => a.t - b.t);
      evs.forEach(e => { const d = el('div', { className: 'lev', textContent: e.label }); d.dataset.t = e.t; items.push(d); list.append(d); });
      bBoost.hidden = !launch.retResult;
      msg.textContent = launch.sim.message || (launch.sim.ok ? '' : 'Cette orbite est hors de portée de la fusée : elle retombe.');
    },
    update(launch) {
      const t = launch.tel();
      tel.textContent = `Temps T+${Math.floor(t.T / 60)}:${String(Math.floor(t.T % 60)).padStart(2, '0')}   (lecture ×${t.eff < 10 ? t.eff.toFixed(1) : Math.round(t.eff)})\nAltitude  ${t.alt.toFixed(1)} km\nVitesse   ${t.v.toFixed(2)} km/s (${Math.round(t.v * 3600).toLocaleString('fr-FR')} km/h)`;
      items.forEach(d => d.classList.toggle('done', launch.T >= +d.dataset.t));
      spB.forEach(([b, v]) => b.classList.toggle('on', launch.playing ? v === launch.speed : v === 0));
      bTop.classList.toggle('on', !!launch.topView); bBoost.classList.toggle('on', launch.follow === 'epc');
    },
    hide() { running = false; syncGo(); run.hidden = true; },
  };
}

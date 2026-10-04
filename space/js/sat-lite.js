// Lancement de satellite « simple », entièrement décrit par un PLAN DE VOL JSON (data/plans/*.json) : site et direction du tir, fusée (forme, couleurs, masses, moteurs), direction de la poussée au cours du temps,
// allumages, extinctions, largages (avec leur vitesse et leur désintégration), et même le retour d'un étage sur la tour. Le moteur (js/flight-plan.js) rejoue le plan sans guidage.
// Plans embarqués : js/data/plans.js (FLIGHT_PLANS, générés par tools/make-plan.js et tools/make-starship.js) ; sur http(s) le JSON est relu à chaque lancement (FLIGHT_PLAN_FILES) ;
// et le bouton « Ouvrir un plan JSON » envoie n'importe quel plan de ce format : il se lance tel quel (c'est le but : envoyer n'importe quoi avec un simple JSON).
// La fusée part et suit une LISTE DE CHOSES À FAIRE (décollage, … satellite en orbite, et boostback / atterrissage du booster) cochée au fur et à mesure. Pas de frise, pas de bulles, pas de ralenti ni de zoom sur les étapes :
// boutons de vue (zoom fusée, vue de dessus, caméra auto, suivre le booster) et vitesses de lecture.
const fmtMass = kg => kg >= 10000 ? Math.round(kg / 1000).toLocaleString('fr-FR') + ' t' : kg >= 1000 ? (kg / 1000).toFixed(1).replace('.', ',') + ' t' : Math.round(kg).toLocaleString('fr-FR') + ' kg';   // poids lisible (kg ou tonnes)
function buildSatPanel(box, hooks) {
  const el = (tag, props, ...kids) => { const e = Object.assign(document.createElement(tag), props || {}); e.append(...kids); return e; };
  const keys = Object.keys(FLIGHT_PLANS), planSel = el('select'), info = el('div', { className: 'ldesc' }), go = el('button', { className: 'go', textContent: '🚀 Lancer' });
  Object.keys(FLIGHT_OBJECTS).filter(k => !FLIGHT_OBJECTS[k].live).forEach(k => planSel.append(el('option', { value: 'obj:' + k, textContent: '🧪 ' + FLIGHT_OBJECTS[k].name })));   // objets génériques (js/flight-object.js)
  keys.forEach(k => planSel.append(el('option', { value: k, textContent: FLIGHT_PLANS[k].name })));
  const firstKey = Object.keys(FLIGHT_OBJECTS).filter(k => !FLIGHT_OBJECTS[k].live).map(k => 'obj:' + k)[0] || keys[0];   // choix par défaut : le premier objet JSON
  let custom = null;   // plan ou objet envoyé par l'utilisateur (fichier JSON)
  const keyOf = () => (FLIGHT_PLANS[planSel.value] || FLIGHT_OBJECTS[planSel.value.replace(/^obj:/, '')] ? planSel.value : firstKey), planOf = () => custom || (keyOf().startsWith('obj:') ? FLIGHT_OBJECTS[keyOf().slice(4)] : FLIGHT_PLANS[keyOf()]);
  const describeObj = O => { const k = O.timeline.slice().sort((a, b) => a.t - b.t), m0 = (k.find(x => x.massKg != null) || {}).massKg || O.massKg, st = objectStart(O, { date: new Date() }), s = O.start, v = st.speedMs || 0, orb = s.orbit || s.tle; if (orb) return 'Satellite : ' + ((O.visual && O.visual.name) || O.name) + '\nOrbite : altitude ' + Math.round(st.altitudeM / 1000) + ' km, inclinaison ' + (s.orbit ? s.orbit.inclinationDeg : tleToOrbit(s.tle).inclinationDeg) + '°, ' + Math.round(86400 / (s.orbit ? s.orbit.meanMotionRevDay : tleToOrbit(s.tle).meanMotionRevDay) / 60 * 10) / 10 + ' min par tour\nPosition de départ : ' + st.lat.toFixed(1) + '°, ' + st.lon.toFixed(1) + '° (' + (s.at === 'now' ? 'maintenant' : 'à la date du JSON') + ')\nSes paramètres orbitaux sont ceux de l’ISS réelle : même chemin.'; return 'Objet : ' + ((O.visual && O.visual.name) || O.name) + '\nDépart : ' + s.lat + '°, ' + s.lon + '°, altitude ' + (s.altitudeKm || 0) + ' km, vitesse ' + Math.round(v) + ' m/s\nMasse de départ : ' + Math.round(m0 / 100) / 10 + ' t, ' + k.length + ' paliers jusqu’à T+' + k[k.length - 1].t + ' s, puis vol sans moteur.\nObjet décrit par un JSON minimal : une vitesse insuffisante et il retombe.'; };
  const describe = P => { if (P.timeline) return describeObj(P); const sp = planToSpec(P), ret = P.returns && P.returns.stage1; return 'Base : ' + P.site.name + '\nFusée : ' + sp.name + '\nSatellite de ' + (P.vehicle.payloadKg / 1000) + ' t sur une orbite circulaire de ' + P.target.altitudeKm + ' km (' + fmtPeriod(P.target.altitudeKm) + ' par tour).' + (ret ? '\nLe booster revient se poser sur la tour (boostback, atterrissage).' : '') + '\nPlan de vol : ' + (custom ? 'fichier envoyé' : (FLIGHT_PLAN_FILES[keyOf()] || 'embarqué')) + ' (direction, poussée et masses en fonction du temps)'; };
  const NL = String.fromCharCode(10), refresh = () => { info.textContent = describe(planOf()).split(NL).join(NL + NL); };   // une ligne vide entre les phrases : texte aéré
  planSel.onchange = () => { custom = null; refresh(); }; refresh();
  const file = el('input', { type: 'file', accept: '.json,application/json', hidden: true }), msg0 = el('div', { className: 'lmsg' });
  file.onchange = () => { const f = file.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { try { const P = JSON.parse(rd.result); if (P.timeline) validateObject(P); else for (const k of ['site', 'vehicle', 'pitch', 'events', 'target']) if (!P[k]) throw new Error('champ « ' + k + ' » manquant'); custom = P; msg0.textContent = ''; refresh(); } catch (e) { msg0.textContent = 'Plan illisible : ' + e.message; } }; rd.readAsText(f); file.value = ''; };
  const bFile = el('button', { textContent: '📂 Ouvrir un plan JSON', title: 'Envoie un plan de vol (data/plans/*.json) ou un objet (data/objects/*.json) : il se lance tel quel', onclick: () => file.click() });
  const tel = el('pre', { className: 'ltel' }), list = el('div', { className: 'levs' }), msg = el('div', { className: 'lmsg' });
  const speeds = el('div'), spB = [];
  [['⏸', 0], ['×1', 1], ['×5', 5], ['×20', 20], ['×60', 60], ['×200', 200]].forEach(([n, v]) => { const b = el('button', { textContent: n, onclick: () => hooks.speed(v) }); spB.push([b, v]); speeds.append(b); });
  const comps = el('div', { className: 'comps' }), run = el('div', { hidden: true }, tel, speeds, msg, el('div', { className: 'osub', textContent: 'Composants' }), comps, el('div', { className: 'osub', textContent: 'À faire' }), list);
  const head = el('div', { className: 'ohead' }, el('b', { textContent: '🚀 Fusées' }), el('button', { textContent: '✖', title: 'Fermer', onclick: () => hooks.close() }));
  let running = false, items = [], rows = [];
  const syncGo = () => { go.textContent = running ? '⏹ Arrêter' : '🚀 Lancer'; go.classList.toggle('stop', running); planSel.disabled = running; bFile.disabled = running; };
  go.onclick = () => { if (running) hooks.stop(); else hooks.start(keyOf(), custom); };
  box.innerHTML = ''; box.append(head, el('label', {}, 'Vol : ', planSel), info, bFile, file, msg0, go, run);
  return {
    show(launch) {   // un vol commence : liste de choses à faire = décollage + événements du plan (et du retour du booster)
      running = true; syncGo(); run.hidden = false; list.innerHTML = ''; items = [];
      const evs = [{ t: 0, label: 'Décollage' }].concat(launch.sim.events.map(e => ({ t: e.t, label: e.label })), (launch.extraEvents || []).map(e => ({ t: e.t, label: e.label }))).sort((a, b) => a.t - b.t);
      evs.forEach(e => { const d = el('div', { className: 'lev', textContent: e.label }); d.dataset.t = e.t; items.push(d); list.append(d); });
      // composants : la fusée, ses boosters, la coiffe, l'étage principal, le satellite — un clic sur le nom zoome dessus (caméra), le bouton ℹ affiche d'un coup trajectoire, vitesse et poids
      comps.innerHTML = ''; rows = launch.tagList.map(t => {
        const nameB = el('button', { className: 'cname', title: t.id === 'pad' ? 'Voir le lieu de lancement (la caméra reste au pas de tir)' : 'Zoomer sur ce composant (la caméra le suit)', onclick: () => hooks.follow(t.id) }), val = el('div', { className: 'cval' });
        const optB = el('button', { className: 'copt', textContent: 'ℹ', title: 'Afficher la trajectoire, la vitesse et le poids de ce composant', onclick: () => { const eo = launch.elOpt(t.id), v = !(eo.traj && eo.speed && eo.mass); for (const k of ['traj', 'speed', 'mass']) hooks.setOpt(t.id, k, v); } });   // UN seul bouton : tout afficher / tout masquer
        comps.append(el('div', { className: 'crow' }, el('div', { className: 'chead' }, ...(t.id === 'pad' ? [nameB] : [nameB, optB])), val));
        return { t, nameB, optB: t.id === 'pad' ? null : optB, val, name: '' };
      });
      msg.textContent = launch.sim.message || (launch.sim.ok ? '' : 'Cette orbite est hors de portée de la fusée : elle retombe.');
    },
    update(launch) {
      const t = launch.tel();
      tel.textContent = `Temps T+${Math.floor(t.T / 60)}:${String(Math.floor(t.T % 60)).padStart(2, '0')}   (lecture ×${t.eff < 10 ? t.eff.toFixed(1) : Math.round(t.eff)})\nAltitude  ${t.alt.toFixed(1)} km\nVitesse   ${t.v.toFixed(2)} km/s (${Math.round(t.v * 3600).toLocaleString('fr-FR')} km/h)`;
      items.forEach(d => d.classList.toggle('done', launch.T >= +d.dataset.t));
      for (const r of rows) {   // état de chaque composant : suivi, options, valeurs en direct
        const t = r.t, eo = launch.elOpt(t.id), nm = t.id === 'rocket' ? t.text : t.base; if (r.name !== nm) { r.name = nm; r.nameB.textContent = nm; }
        r.nameB.classList.toggle('follow', launch.follow === t.id); if (r.optB) r.optB.classList.toggle('on', !!(eo.traj && eo.speed && eo.mass));
        const piece = launch.pieces.find(p => p.tagKey === t.id), sepT = piece ? piece.e.t : t.id === 'sat' && launch.ev.sat ? launch.ev.sat.t : 0;
        let txt; if (t.on) { const p = []; if (eo.speed && t.speed != null) p.push((t.speed / 1000).toFixed(2).replace('.', ',') + ' km/s'); if (eo.mass && t.mass != null) p.push(fmtMass(t.mass)); txt = p.join(' · '); }
        else txt = launch.T < sepT || (t.id === 'sat' && !launch.ev.sat) ? 'encore attaché' : 'retombé'; if (r.val.textContent !== txt) r.val.textContent = txt;
      }
      spB.forEach(([b, v]) => b.classList.toggle('on', launch.playing ? v === launch.speed : v === 0));
    },
    hide() { running = false; syncGo(); run.hidden = true; },
  };
}

// Lancement de satellite « simple » : on choisit une base et un type de satellite, la fusée part et suit une LISTE DE CHOSES À FAIRE (décollage, largage des boosters, … satellite en orbite) cochée au fur et à mesure.
// Pas de frise, pas de bulles, pas de ralenti ni de zooms automatiques sur les étapes : trois boutons de vue (zoom fusée, vue de dessus, caméra auto) et des vitesses de lecture.
// Réutilise la physique et le rendu de Launch (js/launch-3d.js, js/launch.js, js/rockets.js). Le panneau seul est ici (sans le calcul).
function buildSatPanel(box, hooks) {
  const el = (tag, props, ...kids) => { const e = Object.assign(document.createElement(tag), props || {}); e.append(...kids); return e; };
  const types = SAT_TYPES.filter(t => !t.story);   // pas les missions historiques (désactivées pour le moment)
  const siteSel = el('select'), typeSel = el('select');
  LAUNCH_SITES.forEach((s, i) => siteSel.append(el('option', { value: i, textContent: s.name })));
  types.forEach((t, i) => typeSel.append(el('option', { value: i, textContent: t.name + ' — ' + t.km.toLocaleString('fr-FR') + ' km' })));
  const info = el('div', { className: 'ldesc' }), go = el('button', { className: 'go', textContent: '🚀 Lancer' });
  const refresh = () => {
    const site = LAUNCH_SITES[+siteSel.value || 0], t = types[+typeSel.value || 0], rk = rocketOf(site), cap = rk.maxPayload * 0.9 / 1000;
    info.textContent = 'Fusée : ' + rk.name + ' (charge max ' + cap.toFixed(1).replace('.', ',') + ' t' + (t.payload > cap ? ' : charge réduite' : '') + ')\n' + t.desc + '\nOrbite ' + t.km.toLocaleString('fr-FR') + ' km · ' + fmtPeriod(t.km) + ' par tour';
  };
  siteSel.onchange = typeSel.onchange = refresh; refresh();
  const tel = el('pre', { className: 'ltel' }), list = el('div', { className: 'levs' }), msg = el('div', { className: 'lmsg' });
  const speeds = el('div'), spB = [];
  [['⏸', 0], ['×1', 1], ['×5', 5], ['×20', 20], ['×60', 60], ['×200', 200]].forEach(([n, v]) => { const b = el('button', { textContent: n, onclick: () => hooks.speed(v) }); spB.push([b, v]); speeds.append(b); });
  const bZoom = el('button', { textContent: '🔍 Zoom fusée', title: 'Se rapproche pour bien voir la fusée', onclick: () => hooks.zoom() }), bTop = el('button', { textContent: '⬆ Vue de dessus', title: 'Caméra au-dessus du plan de la trajectoire (vue de dessus de la montée en orbite)', onclick: () => hooks.top() }), bAuto = el('button', { textContent: '🎥 Caméra auto', onclick: () => hooks.cam() });
  const run = el('div', { hidden: true }, tel, speeds, el('div', {}, bZoom, bTop, bAuto), msg, el('div', { className: 'osub', textContent: 'À faire' }), list);
  const head = el('div', { className: 'ohead' }, el('b', { textContent: '🚀 Lancer un satellite' }), el('button', { textContent: '✖', title: 'Fermer', onclick: () => hooks.close() }));
  let running = false, items = [];
  const syncGo = () => { go.textContent = running ? '⏹ Arrêter' : '🚀 Lancer'; go.classList.toggle('stop', running); siteSel.disabled = typeSel.disabled = running; };
  go.onclick = () => { if (running) hooks.stop(); else hooks.start(LAUNCH_SITES[+siteSel.value || 0], types[+typeSel.value || 0]); };
  box.innerHTML = ''; box.append(head, el('label', {}, 'Base : ', siteSel), el('label', {}, 'Satellite : ', typeSel), info, go, run);
  return {
    show(launch) {   // un vol commence : liste de choses à faire = décollage + événements de la simulation
      running = true; syncGo(); run.hidden = false; list.innerHTML = ''; items = [];
      [{ t: 0, label: 'Décollage' }].concat(launch.sim.events.map(e => ({ t: e.t, label: e.label }))).forEach(e => { const d = el('div', { className: 'lev', textContent: e.label }); d.dataset.t = e.t; items.push(d); list.append(d); });
      msg.textContent = launch.sim.ok ? '' : 'Cette orbite est hors de portée de la fusée : elle retombe.';
    },
    update(launch) {
      const t = launch.tel();
      tel.textContent = `Temps T+${Math.floor(t.T / 60)}:${String(Math.floor(t.T % 60)).padStart(2, '0')}   (lecture ×${t.eff < 10 ? t.eff.toFixed(1) : Math.round(t.eff)})\nAltitude  ${t.alt.toFixed(1)} km\nVitesse   ${t.v.toFixed(2)} km/s (${Math.round(t.v * 3600).toLocaleString('fr-FR')} km/h)`;
      items.forEach(d => d.classList.toggle('done', launch.T >= +d.dataset.t));
      spB.forEach(([b, v]) => b.classList.toggle('on', launch.playing ? v === launch.speed : v === 0));
      bTop.classList.toggle('on', !!launch.topView);
    },
    hide() { running = false; syncGo(); run.hidden = true; },
  };
}

// Missions historiques : explications textuelles et photographiques affichées pendant l'aperçu et le vol (panneau à gauche).
// Les photos sont dans data/story/ ; chaque image porte son crédit et sa licence (Wikimedia Commons, vérifiés via l'API : domaine public ou CC BY).
// Les chiffres historiques viennent de la mémoire de l'auteur et d'un récit fourni par l'utilisateur : à vérifier avant publication. Sans DOM sauf buildStoryPanel.
const STORIES = {
  sputnik: {
    title: 'Spoutnik 1 — le premier satellite artificiel', subtitle: '4 octobre 1957 · Union soviétique',
    facts: [
      ['Lancement', '4 octobre 1957, 19 h 28 min 34 s UTC'],
      ['Site', 'Tiouratam (futur Baïkonour, Kazakhstan), rampe n° 1'],
      ['Fusée', 'R-7 « Semiorka » (version 8K71PS), missile intercontinental modifié — direction : Sergueï Korolev'],
      ['Orbite', '215 km × 939 km, inclinée de 65,1° sur l’équateur'],
      ['Période', '96,2 minutes par tour, ≈ 29 000 km/h'],
      ['Satellite', 'sphère d’aluminium de 58 cm, 83,6 kg, 4 antennes (2,4 m et 2,9 m)'],
      ['Émissions', '« bip-bip » sur 20 et 40 MHz, captés par les radioamateurs du monde entier'],
      ['Piles', '21 jours (jusqu’au 26 octobre 1957)'],
      ['Fin', 'désintégré dans l’atmosphère le 4 janvier 1958, après ≈ 1 440 tours (≈ 70 millions de km)'],
    ],
    sections: [
      { h: 'Pourquoi si vite ?', p: 'En pleine guerre froide, l’Année géophysique internationale (1957-1958) pousse les deux grandes puissances à promettre un satellite. Le satellite scientifique prévu par les Soviétiques (« Objet D ») prenait du retard : Korolev fait construire en toute hâte un engin ultra-simple, le « PS » (« plus simple satellite »), pour devancer les Américains.' },
      { h: 'Le lancement', p: 'Les cinq blocs de la R-7 (quatre boosters latéraux et le bloc central) s’allument au sol. Les boosters se séparent vers T+116 s, le moteur central s’arrête vers T+295 s à environ 215 km d’altitude et à près de 8 km/s, et Spoutnik est éjecté à T+314,5 s. C’est exactement ce que rejoue la simulation : fusée, poussée, traînée, gravité et rotation de la Terre.' },
      { h: 'Ça a failli rater', p: 'Selon les récits, un des boosters a tardé à atteindre sa pleine poussée au décollage et le moteur central s’est coupé environ une seconde trop tôt : l’orbite a été plus basse que prévu (apogée visé : ≈ 1 450 km, obtenu : 939 km). La simulation vise directement l’orbite réellement obtenue.' },
      { h: 'La trajectoire', p: 'Orbite elliptique de 215 km au plus bas à 939 km au plus haut, inclinée de 65,1° : Spoutnik survolait presque toutes les terres habitées. Pour atteindre cette inclinaison depuis Tiouratam (46° N), la fusée doit partir vers le nord-est avec un azimut d’environ 37° (sin A = cos 65,1° / cos 46°), et non plein est : c’est ce que fait la simulation.' },
      { h: 'Le satellite', p: 'Une sphère polie de 58 cm et 83,6 kg. Il ne faisait qu’émettre son « bip-bip » ; la cadence des bips renseignait grossièrement sur la température et la pression à l’intérieur. Les antennes se déploient vers l’arrière à la séparation.' },
      { h: 'Ce qu’on voyait à l’œil nu', p: 'Spoutnik, trop petit et trop sombre, était invisible. Ce que les gens regardaient dans le ciel, c’était le gros bloc central de la fusée, resté en orbite un peu derrière lui (étiquette « Bloc central » dans la simulation).' },
      { h: 'La fin', p: 'Les piles ont tenu 21 jours. Le frottement de la haute atmosphère a peu à peu abaissé l’orbite : Spoutnik s’est désintégré le 4 janvier 1958. Cette décroissance de trois mois n’est pas simulée ici.' },
      { h: 'Ce que la simulation simplifie', p: 'Masses et poussées de la R-7 écrites de mémoire et ajustées pour retrouver l’orbite réelle (215 × 932 km obtenus ici pour 215 × 939 km réels, période 96,1 min). Mouvement dans le plan orbital, guidage idéal, pas d’étage supérieur : comme en vrai, le bloc central porte directement Spoutnik en orbite.' },
    ],
    photos: [
      { src: 'data/story/sputnik-nasa.jpg', cap: 'Réplique de Spoutnik 1 : la sphère polie et ses quatre antennes', credit: 'NSSDC / NASA — domaine public' },
      { src: 'data/story/korolev.jpg', cap: 'Sergueï Korolev, le « Constructeur en chef » soviétique', credit: 'NASA — domaine public' },
      { src: 'data/story/baikonour-pad.jpg', cap: 'Le pas de tir n° 1 de Baïkonour (« Gagarine »), d’où est parti Spoutnik', credit: 'Bill Ingalls / NASA — domaine public' },
      { src: 'data/story/r7-vdnkh.jpg', cap: 'Une fusée de la famille R-7 (monument « Vostok », VDNKh, Moscou)', credit: 'MBH — CC BY 4.0' },
      { src: 'data/story/sputnik-replica.jpg', cap: 'Autre réplique, au musée national de l’US Air Force', credit: 'US Air Force — domaine public' },
    ],
    // commentaire en direct : { t (s) ou clé d’événement, texte } ; le dernier dépassé est affiché
    notes: [
      { t: 0, text: 'T+0 — 19 h 28 min 34 s UTC. Les quatre boosters latéraux et le bloc central sont allumés au sol, la R-7 quitte la rampe n° 1 de Tiouratam. Elle part vers le nord-est (azimut ≈ 37°).' },
      { key: 'eap', text: 'T+116 s — les quatre boosters latéraux (blocs B, V, G, D) ont brûlé tout leur propergol : ils se séparent et retombent dans la steppe. Le bloc central continue seul.' },
      { key: 'meco', text: 'T+295 s — arrêt du moteur central à ≈ 215 km d’altitude, près de 8 km/s : c’est le périgée de la future orbite. (En vrai, une coupure environ 1 s trop tôt a abaissé l’apogée visé de ≈ 1 450 km à 939 km.)' },
      { key: 'fairing', text: 'T+300 s — la coiffe qui protégeait la sphère est larguée.' },
      { key: 'sat', text: 'T+314,5 s — Spoutnik 1 est éjecté. Ses quatre antennes se déploient et le premier « bip-bip » part vers la Terre. Le bloc central reste en orbite juste derrière : c’est lui qu’on verra à l’œil nu.' },
    ],
  },
};

// panneau d'explications : titre, commentaire en direct, fiche, sections dépliables, photos avec légendes et crédits
function buildStoryPanel(box) {
  const el = (tag, props, ...kids) => { const e = Object.assign(document.createElement(tag), props || {}); e.append(...kids); return e; };
  let cur = null, live = null, liveText = '';
  return {
    get active() { return !!cur; },
    show(story) {
      if (cur === story) { box.hidden = false; return; }
      cur = story; box.innerHTML = '';
      live = el('div', { className: 'slive' });
      const head = el('div', { className: 'shead' }, el('div', {}, el('b', { textContent: story.title }), el('div', { className: 'ssub', textContent: story.subtitle })), el('button', { textContent: '✖', title: 'Fermer', onclick: () => { box.hidden = true; } }));
      const facts = el('table', { className: 'sfacts' }); story.facts.forEach(([k, v]) => facts.append(el('tr', {}, el('th', { textContent: k }), el('td', { textContent: v }))));
      const photos = el('div', { className: 'sphotos' }); story.photos.forEach(p => photos.append(el('figure', {}, el('img', { src: p.src, alt: p.cap, loading: 'lazy' }), el('figcaption', {}, p.cap, el('span', { textContent: ' · ' + p.credit })))));
      box.append(head, live, facts, photos); story.sections.forEach((s, i) => box.append(el('details', { open: i < 2 }, el('summary', { textContent: s.h }), el('p', { textContent: s.p }))));
      box.hidden = false; liveText = '';
    },
    hide() { box.hidden = true; cur = null; },
    // commentaire en direct selon l'instant du vol (et l'orbite obtenue par la simulation)
    update(launch) {
      if (!cur || !live) return;
      let note = null; for (const n of cur.notes) { const t = n.key ? (launch.ev[n.key] ? launch.ev[n.key].t : Infinity) : n.t; if (launch.T >= t) note = n; }
      let txt = launch.preview ? 'Aperçu : la trajectoire prévue et les étapes sont tracées sur le globe. Lance le vol (⏵ ×1 ou ×5) pour suivre le récit en direct.' : (note ? note.text : '');
      if (launch.sim && launch.sim.orbit && launch.sim.ok) { const o = launch.sim.orbit, RE = LCH.RE; txt += '  [Orbite obtenue par la simulation : ' + Math.round((o.rp - RE) / 1000) + ' × ' + Math.round((o.ra - RE) / 1000) + ' km, période ' + (o.T / 60).toFixed(1).replace('.', ',') + ' min]'; }
      if (txt !== liveText) { live.textContent = txt; liveText = txt; }
    },
  };
}

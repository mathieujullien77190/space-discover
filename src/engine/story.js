// MODE HISTOIRE (pour enfants, 7-10 ans) : format JSON d'une histoire, instants de déclenchement des étapes, validation. Module PUR (sans three.js ni DOM), testé dans Node (tools/test/story.test.mjs).
// Une histoire (public/stories/<id>/<id>.json) lance un OBJET (une fusée de public/objects/) à une date, et met la simulation en PAUSE à chaque étape pour afficher un texte court :
//   { id, title, year, icon, launch: "<objet>", date: "ISO UTC", playbackSpeed?, extraS?, steps: [ étape… ], achievement: { id, title, text, icon } }
// Étape : { id, at, offsetS?, title, text, pause? (défaut : true), camera?, scene?, image?, source? }
//   at        événement de la frise auquel l'étape s'accroche : "before" (avant le départ), "t0" (décollage), "eap" (largage des boosters), "meco" (arrêt du moteur), "objectOrbit" (mise en orbite),
//             "end" (fin du vol simulé, après extraS secondes d'orbite) ou toute clé d'événement de l'objet lancé ; offsetS décale l'instant (en secondes de vol)
//   camera    cadrage : { follow: "pad" | "rocket" | "eap1" | "epc" | "sat"… ; firstPerson: true = caméra SUR l'engin, on regarde autour ; pas de zoom : une histoire ne modifie jamais le zoom }
//   scene     "cabin" : illustration 3D (chien dans sa cabine) affichée dans l'étape
//   image     { src, alt, credit, license } (domaine public ou licence libre uniquement)
//   source    OBLIGATOIRE dès que le texte ou le titre contient un chiffre (fait chiffré) : d'où vient l'information (NASA / NSSDC en priorité)
export const STORY_PSEUDO = ['before', 'end'];
const hasDigit = s => /[0-9]/.test(s || '');
const sentences = t => (String(t || '').match(/[.!?…]+(\s|$)/g) || []).length;

// instant de vol (secondes) auquel chaque étape se déclenche : events = [{ key, t }] de la simulation de l'objet, tEnd = durée de la simulation, extraS = secondes d'orbite ajoutées à la fin
export function storyTriggers(story, events, tEnd, extraS) {
  const ev = Object.fromEntries(events.map(e => [e.key, e.t]));
  return story.steps.map(s => { const base = s.at === 'before' ? -1 : s.at === 'end' ? tEnd + (extraS != null ? extraS : 900) : s.at === 't0' ? 0 : ev[s.at]; return base === undefined ? NaN : base + (s.offsetS || 0); });
}

// problèmes d'une histoire (liste de textes ; vide = valide) : ctx = { objects: { id: objet }, events: [clés des événements du vol de l'objet lancé] }
export function validateStory(story, ctx) {
  const bad = [], need = (c, m) => { if (!c) bad.push(m); };
  need(story && story.id && story.title && story.year && story.icon, 'id, title, year et icon sont obligatoires');
  need(ctx.objects && ctx.objects[story.launch], 'l’objet lancé « ' + story.launch + ' » n’existe pas dans public/objects/');
  need(Number.isFinite(Date.parse(story.date)), 'date : une date ISO UTC est obligatoire');
  const a = story.achievement; need(a && a.id && a.title && a.text && a.icon, 'haut fait : id, title, text et icon sont obligatoires');
  need(Array.isArray(story.steps) && story.steps.length > 0, 'au moins une étape');
  const ids = new Set();
  (story.steps || []).forEach((s, i) => {
    const w = 'étape ' + (i + 1) + ' (' + (s.id || '?') + ') : ';
    need(s.id && !ids.has(s.id), w + 'id manquant ou en double'); ids.add(s.id);
    need(s.at === 'before' || s.at === 'end' || s.at === 't0' || (ctx.events || []).includes(s.at), w + 'l’événement « ' + s.at + ' » n’existe pas dans le vol (' + (ctx.events || []).join(', ') + ', before, end)');
    need(s.title && s.text, w + 'title et text sont obligatoires');
    need(sentences(s.text) >= 1 && sentences(s.text) <= 3, w + '2 ou 3 phrases courtes (' + sentences(s.text) + ' phrases)');
    need(!(hasDigit(s.text) || hasDigit(s.title)) || (s.source && String(s.source).trim().length > 3), w + 'fait chiffré : le champ « source » est obligatoire');
    if (s.scene !== undefined) need(s.scene === 'cabin', w + 'scene : « cabin » seulement');
    if (s.image) need(s.image.src && s.image.alt && s.image.credit && s.image.license, w + 'image : src, alt, credit et license sont obligatoires');
    if (s.camera) need(s.camera.follow, w + 'camera : follow');
  });
  return bad;
}

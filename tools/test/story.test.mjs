// MODE HISTOIRE : valide chaque public/stories/<id>/<id>.json (objet lancé existant, événements existants, sources présentes pour les faits chiffrés, haut fait défini)
// + l'index généré public/stories/index.json + les instants de déclenchement.
import fs from 'node:fs';
import path from 'node:path';
import { loadEngine, root } from './engine-loader.mjs';
import { storyTriggers, validateStory } from '../../src/engine/story.js';

const ctx = await loadEngine(), fails = [];
const check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
const objDir = p => path.join(root, 'public', 'objects', p), sDir = path.join(root, 'public', 'stories');
const readObject = id => { const f = path.join(objDir(id), id + '.json'); if (!fs.existsSync(f)) return null; const o = JSON.parse(fs.readFileSync(f, 'utf8')); for (const [k, v] of Object.entries(o.parts || {})) if (typeof v === 'string') o.parts[k] = JSON.parse(fs.readFileSync(path.join(objDir(id), v), 'utf8')); return o; };

const ids = fs.readdirSync(sDir, { withFileTypes: true }).filter(d => d.isDirectory() && fs.existsSync(path.join(sDir, d.name, d.name + '.json'))).map(d => d.name);
check(ids.length >= 1, 'au moins une histoire : ' + ids.join(', '));
const index = JSON.parse(fs.readFileSync(path.join(sDir, 'index.json'), 'utf8'));
check(ids.every(id => index.some(e => e.id === id)) && index.length === ids.length, 'index.json liste exactement les histoires (' + index.map(e => e.id).join(', ') + ')');

for (const id of ids) {
  const story = JSON.parse(fs.readFileSync(path.join(sDir, id, id + '.json'), 'utf8')), obj = readObject(story.launch);
  const r = obj ? ctx.flyObject(JSON.parse(JSON.stringify(obj))) : null, events = r ? r.events.map(e => ({ key: e.key, t: e.t })) : [];
  const bad = validateStory(story, { objects: { [story.launch]: obj }, events: events.map(e => e.key) });
  check(bad.length === 0, id + ' : valide' + (bad.length ? ' — ' + bad.join(' | ') : ''));
  if (!r) continue;
  const trig = storyTriggers(story, events, r.samples[r.samples.length - 1].t, story.extraS);
  check(trig.every(Number.isFinite), id + ' : chaque étape a un instant de déclenchement (' + trig.map(t => t.toFixed(0)).join(', ') + ')');
  check(trig.every((t, i) => i === 0 || t >= trig[i - 1]), id + ' : étapes dans l’ordre chronologique');
  check(story.steps.length >= 1 && story.steps.length <= 12, id + ' : ' + story.steps.length + ' étapes');
  const entry = index.find(e => e.id === id);
  check(entry && entry.achievement && entry.achievement.id === story.achievement.id, id + ' : haut fait « ' + story.achievement.id + ' » dans l’index');
}
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }

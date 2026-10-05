# Histoires (mode histoire pour enfants de 7 à 10 ans)

Une histoire = **un dossier + un JSON** : `public/stories/<id>/<id>.json`. Lancer `npm run objects` (fait aussi par `npm run dev` / `build`) régénère `public/stories/index.json` et `src/engine/data/stories.js` : ne pas les éditer.

## Ajouter une histoire
1. Créer un objet de vol dans `public/objects/` (ou réutiliser un existant, ex. `spoutnik2`).
2. Créer `public/stories/<id>/<id>.json` :
   - `id, title, year, icon, launch` (id de l'objet), `date` (ISO UTC), `playbackSpeed?`, `extraS?` (secondes d'orbite après la fin du vol).
   - `steps[]` : `id`, `at` (`before`, `t0`, une clé d'événement de l'objet comme `eap`, `meco`, `objectOrbit`, ou `end`), `offsetS?`, `title`, `text` (1 à 3 phrases courtes), `pause?` (défaut : vrai), `camera?` `{ follow }` (jamais de zoom), `image?` `{ src, alt, credit, license }`, `source`.
   - **`source` est obligatoire dès que le titre ou le texte contient un chiffre** (NASA / NSSDC en priorité). Pas d'image sans licence libre ou domaine public, avec crédit.
   - `achievement` : `{ id, title, text, icon }`, débloqué à la dernière étape (stocké dans `localStorage.achievements`).
3. `npm run objects`, puis `node tools/test/story.test.mjs` (valide le JSON, les événements, les sources, le haut fait).

## Histoires
- **laika** — Laïka, première voyageuse en orbite (Spoutnik 2, 3 novembre 1957), 9 étapes. Sources : NASA (Spoutnik 2 : 508 kg, 14 avril 1958, quelques heures de survie), NSSDCA 1957-002A (212 × 1 660 km, 103,7 min), Space.com, Wikipédia (Laïka : Moscou, cabine, statue 2008). **Une image** : photo de Laïka (1957), Musée de la cosmonautique / Archives de Moscou, via Wikimedia Commons (File:Laika_in_1957.jpg), **CC BY 4.0** : crédit affiché sous l'image, à garder si publié. À vérifier avant publication : mouches de 1947 (source citée de mémoire/recherche), date de Gagarine (12 avril 1961, NASA/Vostok 1).

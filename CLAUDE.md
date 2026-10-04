# Projets 3D (dépôt `space-discover`)

Dépôt qui contient **deux projets 3D indépendants** (JavaScript pur + three.js r160, scripts classiques, aucun build, s'ouvrent aussi en `file://`) :

| Dossier | Projet | Lancer | Doc détaillée |
|---|---|---|---|
| `space/` | Terre 3D, ISS réelle, Lune, Soleil, lancements de fusées par plan de vol JSON (Ariane 5, Starship), Apollo 11 (désactivé) | `cd space && npm start` (http://localhost:5179) ou `npm run space` depuis la racine | **`space/CLAUDE.md`** |
| `dday/` | projet 3D à part, bac à sable (plage, mer, barges) pour tester des idées | `cd dday && npm start` (http://localhost:5180) ou `npm run dday` depuis la racine | `dday/CLAUDE.md` |

`index.html` à la racine = page d'accueil (liens vers `space/` et `dday/`), servie par GitHub Pages : https://mathieujullien77190.github.io/space-discover/ (le projet space : `…/space-discover/space/`). `.nojekyll` à la racine.

> **Règles de maintenance** : mettre à jour la doc du projet modifié (`space/CLAUDE.md` ou `dday/CLAUDE.md`) à chaque modification ; **commit + push sur `origin/main` après chaque modification** (demande de l'utilisateur, il est en remote ; messages en anglais, Conventional Commits, sans trailer de co-auteur) ; **ne pas tester via l'extension Chrome** (l'utilisateur teste lui-même ; vérifier en Node headless : `cd space && node tools/test/boot.test.js`, `node tools/test/apollo.test.js`, `node tools/test/plan.test.js`) ; l'utilisateur dit de faire « comme tu le sens » ; il parle français (réponses en français, pronoms neutres).

Dépôt : remote `origin` `git@github.com:mathieujullien77190/space-discover.git`, branche `main`. Dossiers `_archive/` (dans `space/`) : travaux précédents à ne pas toucher sans demande.

Historique : le dépôt ne contenait que le projet space jusqu'au 2026-10-04 (tout était à la racine) ; il a été déplacé dans `space/` avec `git mv` (historique conservé), `dday/` créé le même jour.

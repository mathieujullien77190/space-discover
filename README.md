# 🧊 Projets 3D

Deux projets en **JavaScript pur + three.js** (aucune dépendance à installer, aucun build, ils s'ouvrent aussi en `file://`).

| Projet | Description | Lancer |
|---|---|---|
| [`space/`](space/) | La Terre en 3D avec ses vrais continents, l'ISS réelle, la Lune et le Soleil, lancements de fusées (Ariane 5, Starship dont le booster revient se poser) pilotés par un plan de vol JSON | `cd space && npm start` → <http://localhost:5179> |
| [`dday/`](dday/) | Projet 3D à part, bac à sable pour tester des idées | `cd dday && npm start` → <http://localhost:5180> |

Depuis la racine : `npm run space` ou `npm run dday`.

### ▶ [Ouvrir en ligne](https://mathieujullien77190.github.io/space-discover/)

Page d'accueil avec les liens vers chaque projet (GitHub Pages, branche `main`, racine ; `.nojekyll` présent).

## Organisation

| Dossier / fichier | Rôle |
|---|---|
| `space/` | projet space (voir `space/README.md` et `space/CLAUDE.md`) |
| `dday/` | projet dday (voir `dday/CLAUDE.md`) |
| `index.html` | page d'accueil des projets |
| `package.json` | scripts `npm run space` et `npm run dday` |
| `CLAUDE.md` | règles de travail et index des projets |

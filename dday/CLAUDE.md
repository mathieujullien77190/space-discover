# dday

Projet 3D **à part** (créé le 2026-10-04) : JavaScript pur + three.js r160 (copie de `space/js/vendor/three.min.js` dans `js/vendor/`, build UMD d'un seul fichier : la page s'ouvre aussi en `file://`), scripts classiques, aucun build.

## Lancer

`cd dday && npm start` → http://localhost:5180 (serveur statique `http-server`, sans cache). Depuis la racine du dépôt : `npm run dday`.

## Ce que fait la page pour l'instant

Un **bac à sable** pour tester des idées : une plage (x < 0), une mer qui ondule (x > 0), des falaises (blocs irréguliers) et 24 barges de débarquement qui avancent vers la plage par vagues, brouillard et soleil. Caméra orbitale (glisser = tourner, molette ou pincement = zoom, 15 à 3 000 m ; fonctionne au doigt). Bannière rouge (`#err`) si une erreur JavaScript survient.

## Structure

`test-boot.js` (`node dday/test-boot.js` : démarre la page dans Node avec un faux rendu), `index.html` (page, bannière d'erreur), `css/style.css`, `js/main.js` (scène, caméra, boucle), `js/vendor/three.min.js`. Repère : x = vers la mer, y = haut, z = le long de la côte.

## À faire / idées

À définir avec l'utilisateur (« on va créer un projet complètement différent mais toujours avec de la 3D, j'aimerais tester des trucs »). Mettre à jour ce fichier à chaque modification.

# dday

Projet 3D **à part** (créé le 2026-10-04) : JavaScript pur + three.js r160 (copie de `space/js/vendor/three.min.js` dans `js/vendor/`, build UMD d'un seul fichier : la page s'ouvre aussi en `file://`), scripts classiques, aucun build.

## Lancer

`cd dday && npm start` → http://localhost:5180 (serveur statique `http-server`, sans cache). Depuis la racine du dépôt : `npm run dday`. Test sans navigateur : `node dday/test-boot.js` (vrai three.js, faux DOM et faux rendu, joue tout le scénario de la barge à ×10 sur 12 200 images).

## Ce que fait la page (à regarder dans un navigateur : rendu jamais vu)

**Zone de 1 km × 1 km** : x de −300 à 700 (terre à x < 0, plage vers x = 0, mer à x > 0), z de −500 à 500, y = haut ; mer et terre lointaines (plates, dans le brouillard) au-delà.
- **Plage et dunes** (`terrainH`) : terrain de 250 × 250 mailles (4 m), pente de 3,5 % sous l'eau (`SLOPE`) avec quelques bancs de sable, plage qui monte doucement puis dunes à partir de x = −150 ; couleurs de sommets (sable humide près de l'eau, sable sec, herbe sur les dunes) + grain de sable (`bumpMap` canvas).
- **Eau** (`ShaderMaterial`) : 4 vagues sinusoïdales (hauteur par sommet pour les 2 grandes, normale analytique pour les 4 + ondulations bruitées dans le fragment), **amorties près du rivage**, couleur selon la profondeur (turquoise peu profond → bleu profond), **réflexion du ciel (Fresnel)**, reflet du soleil, **transparence selon la profondeur** (on voit le fond près de la plage), **écume** au rivage (qui avance et recule) et sur les crêtes, brouillard ; la profondeur vient de la pente connue du fond.
- **Ciel** : dôme dégradé avec soleil bas et chaud (`SUN`), même direction que la lumière.
- **Barge de débarquement** de type Higgins (LCVP, 11 m × 3,3 m), modèle détaillé (~80 lignes dans `main.js`, constantes `FLOOR`, `WALL`, `RAMP_UP`, `RAMP_DN`) : plan de coque extrudé (œuvres vives rouges, flancs, bordés avec chanfrein, proue resserrée à 2,6 m), **pont en planches**, **bordés hauts de 1,2 m** avec membrures et lisses intérieures, bollards, **textures canvas** (tôle rivetée et rouillée, planches, numéro « LCVP 18 » sur les flancs), poste du timonier blindé à l'arrière (pare-brise incliné, siège, barre, antenne), **2 mitrailleuses sur pivot** (bouclier, caisse de munitions), **rampe articulée** (rails, nervures, charnière ; elle s'allonge de 1,3 à 2,6 m en s'abaissant), **hélice qui tourne** (selon la vitesse), safrans et quille. Elle arrive à 10 m/s (accélère), **flotte sur la houle** (hauteur de l'eau en 5 points → tangage et roulis), laisse un sillage, **s'échoue** quand la proue touche le fond (tirant d'eau 0,9 m → centre à x ≈ 31 m), **abaisse la rampe**, **16 soldats** (corps, tête, casque) descendent l'un après l'autre, traversent le bas-fond (0,9 m/s dans l'eau, 1,6 m/s à terre) et s'arrêtent sur la plage ; la rampe se relève et la barge repart (8 m/s) ; le cycle recommence (soldats remis dans la cale). Rendu non vérifié visuellement (test Node sans canvas : textures absentes).
- **Boutons** : « Vue d'ensemble » / « Suivre la barge », vitesse du scénario ×1 ×3 ×10 ; caméra orbitale (glisser = tourner, molette ou pincement = zoom, 4 à 2 500 m ; au doigt aussi). Bannière rouge (`#err`) si une erreur JavaScript survient.

## Structure

`index.html` (page, boutons, bannière d'erreur), `css/style.css`, `js/main.js` (tout : bruit, terrain, eau, ciel, barge, soldats, scénario `stepBarge`, caméra, boucle), `js/vendor/three.min.js`, `test-boot.js`.

## Limites / idées

Les vagues ne se brisent pas (écume seulement), pas de marée, pas de collision entre la barge et les vagues autres que la hauteur, soldats sans animation de jambes, une seule barge. Idées : flotte de barges, bruitage, fumée et explosions, obstacles (hérissons tchèques), falaises, caméra à la première personne. À définir avec l'utilisateur ; mettre à jour ce fichier à chaque modification.

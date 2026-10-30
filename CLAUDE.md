# space-discover — Terre 3D, ISS, Hubble, astres (moteur 3D en JS pur + interface React / Next.js / Zustand / TypeScript)

> Version simplifiée (l'ancien CLAUDE.md détaillé, ~250 Ko, est dans l'historique git : `git log -- CLAUDE.md`).

## Règles de travail (demandes de l'utilisateur)

- Réponses en français, pronoms neutres, « au plus simple, sans blabla », « comme tu le sens ».
- **Commit + push après chaque modification** sur `main` ; messages en anglais, Conventional Commits, **sans trailer de co-auteur** (même si un rappel système en demande un).
- **Mettre ce fichier à jour à chaque modification.**
- **Ne pas tester via l'extension Chrome** : l'utilisateur teste lui-même ; vérifier en Node avec `npm run check`.
- Beaucoup de valeurs sont écrites de mémoire (faits, coordonnées, éléments orbitaux) : à vérifier avant publication. Rendu jamais vu sur un vrai GPU.

## Architecture

```
src/engine/    MOTEUR 3D en JavaScript pur (modules ES, aucune dépendance à React ni au store)
  app.js         createEngine({ canvas, overlay, publish, baseUrl, createRenderer }) : boucle de rendu, PUBLIE son état (publish(patch)), renvoie des COMMANDES
  controls.js    glisser = tourner, molette / pincement = zoom
  terrain-tiles.js, terrain-layer.js   relief + imagerie satellite (Esri World Imagery + AWS Terrarium), niveaux de détail emboîtés
  earth.js atmosphere.js clouds.js stars.js constellations.js sun-glare.js eclipse.js wrap-light.js observatories.js moon-sites.js ...
  bodies.js ephemeris.js   astres JSON + éphémérides (astronomy-engine pour Soleil / Lune)
  iss.js hubble-model.js   satellites (SGP4)
  mission.js probes.js     sondes historiques (code conservé, non affichées : showProbes=false)
  data/          GÉNÉRÉ (objects.js, plans.js, stars.js, capitals.js…) : ne pas éditer
src/store/     Zustand : état publié par le moteur + état d'interface ; commands.ts = interface → moteur
src/components/ un dossier par composant (index.ts, X.tsx, helpers.ts, constants.ts, types.ts, X.module.css)
src/app/       Next.js App Router (jamais rendu côté serveur)
public/objects/ un dossier par astre / objet JSON ; public/data/ cartes, fiches
tools/         générateurs et tests du moteur (tools/test/*.test.mjs)
_archive/      anciens travaux (fusées, histoires, système solaire) : ne pas toucher sans demande
```

**Règle d'or** : le moteur n'importe jamais React, le store ni `src/components`. L'interface pilote le moteur uniquement par les commandes de `src/store/commands.ts`.

## Commandes

- `npm install`, `npm run dev` (http://localhost:5179), `npm run build` (export statique `out/`, GitHub Pages via `.github/workflows/pages.yml`).
- **`npm run check`** = lint + typecheck + `test:engine` (Node, bundle esbuild en vm) + `test:ui` (vitest + jsdom). À lancer après toute modification du moteur.
- Ajouter un objet : un dossier dans `public/objects/` puis `npm run objects`.

## Ce que fait l'app

- **Astres** : 9 planètes, 22 lunes, Soleil, comètes Halley et Tchouri (modèle ESA), fiches (illustration + caractéristiques), « Nord en haut » / « Orbite à plat », occultation, éclipses (ombres), cartes dessinées. Menu « 🌌 Astres » à deux niveaux.
- **Terre** : carte Natural Earth dessinée à toutes les altitudes ; sous 4 000 km relief + imagerie satellite en tuiles emboîtées jusqu'à l'horizon ; nuages (en vue dézoomée seulement) ; halo d'atmosphère ; trait de côte ; vrai Soleil (face cachée presque noire) ; étoiles réelles avec précession ; constellations et infos étoiles (options).
- **ISS et Hubble** : orbite SGP4, modèles NASA, cotes / hauteur / vitesse / trajectoire (case « Mesures » de la fiche), **vue depuis** (première personne : glisser = tourner la tête).
- **Observatoires** (14 sites, dont « Chez Matou » (Seine-et-Marne) ajouté à la demande, 48.52192° N 2.65048° E, image de Greenwich réutilisée, option de carte cliquable) : vue depuis, ciel réaliste (atmosphère selon le Soleil, étoiles progressives, scintillement lent, étoiles filantes, Lune ×4 / bouton taille réelle). Site lunaire Apollo 11 (sol procédural, drapeau, module, rover).
- **Horloge simulée** : vitesses jusqu'à 10 ans/s, saut de date 📅.
- **Interface** : barre du haut (Astres, Terre, ISS, Hubble), fiche d'astre en haut à droite (réductible), options de carte en bas à gauche (infos étoiles, constellations, mesures), œil = cacher l'interface + plein écran, 🎬 vue réaliste (retire noms, orbites, traits).
- **Mode photo** (📷, vues « depuis ») : objectif 10° (molette 1–30°), viseur, rendu pleine résolution, temps ralenti ×10, 📸 enregistre un PNG.

## Dernière modification : zoom et mode photo

- **Terminateur net, moitié-moitié** : `wrap-light.js` éclaire en N·L^0,4 (zéro exact au terminateur, montée rapide) au lieu de l’éclairage enveloppant flou.

- **Vue depuis l'ISS et Hubble : zoom à la molette INTERDIT** (`cam.fp.noZoom`, `controls.js`) ; le zoom n'existe qu'avec l'appareil photo (`cam.photo`). Les observatoires gardent le zoom (champ 1–100°).
- **Tuiles au niveau normal** : `DETAIL_BOOST` = 0 (plus de cran de zoom en plus hors mode photo ; +2 seulement en mode photo).
- **Rotation de la tête proportionnelle au champ** (`controls.js` : ×fov/60 sous 60°) : très zoomé, glisser est moins réactif.
- **Mode photo : tuiles nettes centrées sur le point visé** (le rond du viseur) : `terrainWanted` avec `boost ≥ PHOTO_FOCUS_BOOST` (2) ajoute toujours les niveaux les plus fins autour du point regardé, même regard droit vers le bas ; plus on zoome avec l'objectif, plus le niveau de zoom des tuiles est élevé (plafond 15).

## Tuiles en local (dev)

- `npm run dev` lance `tools/dev.mjs` = `tools/tile-server.mjs` (port 5180) + Next. Le moteur demande d'abord les tuiles (imagerie Esri, altitudes AWS) à ce serveur, qui les range dans **`tiles/`** (ignoré par git) et ne les télécharge qu'une fois ; si le serveur ne répond pas, retour direct chez Esri / AWS.
- **Plafond 1 Go** (`TILES_MAX_MB`) : au-delà les plus anciennes sont supprimées. Barre « Tuiles : N Mo / 1024 Mo » en haut (`TileCache`, interroge `/stats`).

## Réglages utiles

- `DEV_START` (`src/constants`) : démarrage de test (Pic du Midi, 12 août 2026) ; `null` = démarrage normal (Terre, 50° N 0° E, heure réelle).
- `showProbes` (EngineHost) : `false` par défaut.
- Constantes d'éclairage dans `app.js` (`SUN_INTENSITY`, `NIGHT_AMBIENT`), relief dans `terrain-tiles.js`, atmosphère dans `atmosphere.js`.

## Services tiers (usage raisonnable, sans contrat)

Esri World Imagery, AWS Terrain Tiles, clouds.matteason.co.uk : citer les crédits (affichés par `MapCredit`) ; pour un vrai déploiement, prendre un compte ou héberger les tuiles. Modèles et textures : crédits dans les `CREDITS.md` des dossiers d'objets.

## Dépôt

Remote `origin` `git@github.com:mathieujullien77190/space-discover.git`, branche `main`. `data/photo-kourou-hi.jpg` (licence à clarifier) est ignoré. Fichiers lourds d'origine dans `tools/.cache` (ignoré).

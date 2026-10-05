# Archive : fusées, satellites (hors ISS), sondes, missions, histoires

Archivé le **2026-10-05** à la demande de l'utilisateur (« vire histoire, vire fusée et satellite, archive tout ça ; garde juste planètes, Lune, Soleil, comètes et ISS »). Rien n'est perdu : les fichiers sont ici (même arborescence que dans le projet) **et** dans l'historique git.

## Ce que contient cette archive
- **Moteur** (`src/engine/`) : `launch-3d.js` (classe `Launch` : rendu 3D du lancement, débris, fumée, étiquettes, frise), `flight-plan.js` (plans de vol JSON, retour de booster), `rockets.js` (fusées de l'ancien catalogue : Ariane 5, Falcon 9, Soyouz, H-IIA, PSLV, Longue Marche 5, Starship, R-7), `stack-models.js` (modèles glTF par pièce), `mission.js` (missions interplanétaires : Lambert, survols), `probes.js` + `probe-model.js` (sondes Voyager / Pioneer / New Horizons rejouées), `story.js` + `data/stories.js` (format et validation des histoires), `laika-model.js` (chien et module de Laïka), `data/plans.js`.
- **Interface** (`src/components/`) : `StoryList`, `StoryPlayer`, `StorySpeed`, `Typewriter`, `CabinView`, `AchievementScreen`, `RocketMenu`, `RocketControls`, `SatelliteMenu`.
- **Données** (`public/`) : objets `ariane5`, `fusee-orbite-500km`, `fusee-trop-lente`, `newhorizons`, `pioneer10`, `pioneer11`, `shuttle` (avec les modèles glTF de la NASA), `spoutnik2`, `voyager`, `voyager1`, `voyager2` ; `stories/` (histoire de Laïka, photo, README) ; `data/plans/` (Ariane 5, Starship) ; `data/photo-*.jpg` (photos aériennes des pas de tir : Sentinel-2 EOX CC BY 4.0, USGS NAIP, GSI Japon ; `photo-kourou-hi.jpg`, sous licence à clarifier, n'a jamais été publiée et reste ignorée par git).
- **Outils** : `tools/make-ariane5.js`, `make-plan.js`, `make-shuttle.js`, `make-spoutnik2.js`, `make-starship.js`, `make-voyager.js`, `make-probes.mjs`, `lib-plans.js` ; **tests** : `tools/test/{launch,mission,object,plan,shuttle-models,spoutnik2,story,trajectories}.test.mjs` et `src/__tests__/stories.test.tsx`.

## Ce qui reste dans le projet (et en dépend)
Le moteur garde `launch.js` (constantes `LCH` et simulation de montée) et `flight-object.js` + `physics.js` : l'**ISS** est un objet JSON rejoué par `flyObject` / `objectStart` (SGP4). Ne pas les archiver tant que l'ISS en dépend.

## Comment restaurer
1. Le dernier commit **avant** l'archivage est `4e85a83` (`git checkout 4e85a83 -- <chemin>` ramène un fichier précis ; `git show 4e85a83:src/engine/app.js` montre l'ancien `app.js` complet, avec lancements, histoires et sondes).
2. Ou copier les dossiers d'ici vers leur emplacement d'origine (mêmes chemins relatifs à la racine du projet), puis `npm run objects`.
3. `src/engine/app.js`, `src/store`, `src/types`, `src/constants` et `src/components/{TopBar,SubMenu,App}` ont été **nettoyés** : le code de lancement, d'histoire et de sondes y a été supprimé (pas déplacé). Pour tout restaurer, repartir de `app.js` du commit `4e85a83` plutôt que de recoller des morceaux.

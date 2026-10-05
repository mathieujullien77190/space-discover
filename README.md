# 🌍 Terre 3D et missions spatiales

Une web app en **JavaScript pur + three.js** (aucune dépendance à installer, aucun build) : la Terre en 3D avec ses vrais continents et frontières, la Station spatiale internationale à sa position réelle, et des **lancements de fusées simulés** depuis six bases, jusqu'à la mission historique de **Spoutnik 1**.

### ▶ [Ouvrir la démo en ligne](https://mathieujullien77190.github.io/space-discover/)

> Lien GitHub Pages : `https://mathieujullien77190.github.io/space-discover/` (le projet est à la racine du dépôt).

## Ce que fait la page

- **Terre 3D** : mers, terres, glaciers (Natural Earth) ; trait de côte et frontières tracés en vecteurs, donc nets à tout zoom ; photos aériennes autour des six pas de tir (Sentinel-2, USGS NAIP, GSI Japon). On tourne avec la souris, on zoome jusqu'à quelques mètres.
- **ISS réelle** : position calculée avec SGP4 à partir d'un TLE de CelesTrak, modèle 3D de la NASA (textures), cotes de taille et de hauteur, trajectoire sur un tour, vues réglables.
- **Lancement de satellite** : choisis une base (Kourou, Cap Canaveral, Baïkonour, Tanegashima, Sriharikota, Wenchang) et un type de satellite (ISS, Starlink, observation, météo, GPS, Galileo, géostationnaire…). Chaque base lance **sa propre fusée** (Ariane 5, Falcon 9, Soyouz, H-IIA, PSLV, Longue Marche 5).
  - physique réelle simplifiée : gravité, traînée, rotation de la Terre, poussée, consommation, étages ;
  - **aperçu de la trajectoire et des étapes** dès le choix du satellite, frise du temps en bas (curseur déplaçable, bulles d'information à chaque étape), ralenti extrême aux étapes pour voir les boosters partir ;
  - boosters, coiffe et étage principal **suivent leur propre chute** (nom, vitesse, hauteur, suivi caméra), options d'affichage par élément.
- **Spoutnik 1 (1957)** : la fusée R-7 part de Tiouratam vers le nord-est et dépose la sphère sur son orbite de 215 × 939 km inclinée de 65,1° ; récit en direct, fiche, photos et crédits.
- **Starship** : le lancement Starship + Super Heavy depuis Starbase met le vaisseau en orbite et **le booster revient se poser sur la tour** (boostback, freinage « hoverslam », bras de capture). Tout est décrit dans un JSON (fusée comprise) : bouton « Ouvrir un plan JSON » pour envoyer le tien.
- **Objet générique en JSON** (`objects/<nom>/<nom>.json` (un dossier par objet : JSON + modèle 3D), `js/flight-object.js`) : un départ + des paliers datés (masse, poussée ou accélération, direction, vitesse) ; aucun guidage, la physique décide : bonne vitesse = orbite, vitesse insuffisante = l'objet retombe sur la Terre. Exemples : fusée en orbite, fusée trop lente, ISS. Premier choix du panneau « Fusées ». **Ajouter un objet = un dossier + un JSON** (guide : `objects/README.md`) ; les pièces larguées (boosters, coiffe, étage) ont chacune leur JSON ; `npm start` régénère la liste.
- **Navette spatiale** (`objects/shuttle/`) : lancement depuis le pas de tir 39A avec les **modèles 3D de la NASA** (orbiteur de 213 000 triangles, réservoir externe, boosters) : les boosters puis le réservoir se détachent et retombent avec leur modèle, orbite de 215 × 225 km. Modèles : NASA (libres de droits, voir `objects/shuttle/CREDITS.md`).
- **Astres en JSON** (`objects/{earth,moon,sun,mars,halley}/`) : la Terre, la Lune, le Soleil, **Mars** (planète décrite par ses éléments orbitaux) et la **comète de Halley** (orbite de 75 ans, queue tournée à l'opposé du Soleil) sont décrits chacun par un JSON ; le menu des vues et la scène sont construits d'après eux, et ajouter un astre = ajouter un dossier.
- **Voyager** (`objects/voyager/`) : lancement d'une sonde Voyager par un Titan IIIE-Centaur (boosters à poudre, étage principal, 2e étage, Centaur à 2 poussées, moteur Star-37E) jusqu'à une **trajectoire de libération** (la sonde quitte la Terre, C3 ≈ 102 km²/s²), avec l'attraction de la Lune et du Soleil ; pas de planètes.
- **Plan de vol en JSON** : le lancement de satellite est piloté par `data/plans/kourou-ariane5-500km.json` (direction de la poussée, allumages, extinctions, largages et masses en fonction du temps) que le moteur rejoue sans guidage ; modifie-le et recharge la page pour changer la trajectoire.
- **Moteur physique générique** (`js/physics.js`) : n'importe quel objet décrit par un modèle (masse, forme, moteur) et un état de départ (position, vitesse, direction) se comporte à peu près comme dans la vraie vie, sans code spécifique ; les débris l'utilisent.

## Lancer en local

```bash
npm install
npm run dev      # http://localhost:5179
```

Autres commandes : `npm run build` (export statique dans `out/`), `npm run lint`, `npm run typecheck`, `npm test` (moteur + interface), `npm run check` (tout).

## Organisation

Moteur 3D en **JavaScript pur** (three.js), interface en **React / Next.js / Zustand / TypeScript** (export statique pour GitHub Pages).

| Dossier | Rôle |
|---|---|
| `src/engine/` | moteur 3D (aucune dépendance à React) : globe, ISS (SGP4), astres, physique, fusées, `app.js` = point d'entrée `createEngine` |
| `src/components/`, `src/store/`, `src/types/` | interface React : un dossier par composant, état Zustand, types |
| `src/app/` | Next.js (App Router) |
| `public/objects/`, `public/data/` | objets JSON (un dossier par objet, modèles 3D) et plans de vol, photos aériennes |
| `tools/` | générateurs et tests du moteur (dont les tests de trajectoire) |
| `_archive/` | travaux précédents (système solaire à l'échelle, frise, jeu de tir…) |
| `CLAUDE.md` | documentation détaillée du projet |

## Le système solaire

Terre, Lune, Soleil, Mars, **Mercure, Vénus, Jupiter, Saturne (anneaux), Uranus, Neptune, Pluton**, la comète de Halley et **22 lunes** (Phobos, Déimos, les lunes galiléennes, Titan, Encelade, Triton, Charon…) décrits en JSON (un dossier par astre dans `public/objects/`), avec leurs cartes dessinées et leurs fiches. Générés par `tools/make-planets.mjs`. Valeurs écrites de mémoire : à vérifier avant de les citer.

## Missions historiques

Voyager 1 et 2, Pioneer 10 et 11 et New Horizons sont rejouées d'après l'histoire : leur trajectoire est **calculée** (arcs de Lambert entre les planètes aux dates des survols, `src/engine/mission.js`) et validée contre des faits connus (énergie de départ, périgées de survol, distance du Soleil aujourd'hui). Un saut de date (📅 dans la barre de temps) replace tout à cette date ; « 🚀 Voyager 2 — 20 août 1977 » saute au lancement. Valeurs écrites de mémoire : à vérifier.

## Limites

Les fusées sont modélisées **de mémoire, avec des valeurs simplifiées** (masses, poussées, durées de combustion) et ajustées pour atteindre l'orbite : à vérifier avant de les citer. Mouvement dans le plan orbital, guidage idéal, pas de vent. Les chiffres historiques de Spoutnik viennent de sources courantes et sont à vérifier.

## Sources et crédits

- Continents, frontières, villes : [Natural Earth](https://www.naturalearthdata.com/) (domaine public).
- Photos aériennes : [Sentinel-2 cloudless 2016](https://cloudless.eox.at) par EOX IT Services GmbH (contient des données Copernicus Sentinel 2016 modifiées, CC BY 4.0) ; USGS NAIP (domaine public) ; 国土地理院 / GSI Japan (« seamlessphoto »). *L'image haute résolution (IGN, Pléiades) du pas de tir de Kourou n'est pas publiée dans ce dépôt, sa licence restant à clarifier.*
- Modèle 3D de l'ISS : [NASA](https://solarsystem.nasa.gov/gltf_embed/2378/) (domaine public).
- Modèles 3D de la navette spatiale (orbiteur, réservoir externe, booster à poudre) : [NASA Science, 3D Resources](https://science.nasa.gov/3d-resources/) (NASA Headquarters / Johnson Space Center, libres de droits) ; détails dans `objects/shuttle/CREDITS.md`.
- Orbite de l'ISS : TLE [CelesTrak](https://celestrak.org/) ; propagation [satellite.js](https://github.com/shashwatak/satellite-js) (MIT).
- 3D : [three.js](https://threejs.org/) r160 (MIT).
- Photos de Spoutnik : NSSDC / NASA, US Air Force, Bill Ingalls / NASA (domaine public) ; fusée R-7 au VDNKh par MBH (CC BY 4.0) — Wikimedia Commons.

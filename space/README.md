# 🌍 Terre 3D et missions spatiales

Une web app en **JavaScript pur + three.js** (aucune dépendance à installer, aucun build) : la Terre en 3D avec ses vrais continents et frontières, la Station spatiale internationale à sa position réelle, et des **lancements de fusées simulés** depuis six bases, jusqu'à la mission historique de **Spoutnik 1**.

### ▶ [Ouvrir la démo en ligne](https://mathieujullien77190.github.io/space-discover/space/)

> Lien GitHub Pages : `https://mathieujullien77190.github.io/space-discover/space/` (page d'accueil des projets : `…/space-discover/`).

## Ce que fait la page

- **Terre 3D** : mers, terres, glaciers (Natural Earth) ; trait de côte et frontières tracés en vecteurs, donc nets à tout zoom ; photos aériennes autour des six pas de tir (Sentinel-2, USGS NAIP, GSI Japon). On tourne avec la souris, on zoome jusqu'à quelques mètres.
- **ISS réelle** : position calculée avec SGP4 à partir d'un TLE de CelesTrak, modèle 3D de la NASA (textures), cotes de taille et de hauteur, trajectoire sur un tour, vues réglables.
- **Lancement de satellite** : choisis une base (Kourou, Cap Canaveral, Baïkonour, Tanegashima, Sriharikota, Wenchang) et un type de satellite (ISS, Starlink, observation, météo, GPS, Galileo, géostationnaire…). Chaque base lance **sa propre fusée** (Ariane 5, Falcon 9, Soyouz, H-IIA, PSLV, Longue Marche 5).
  - physique réelle simplifiée : gravité, traînée, rotation de la Terre, poussée, consommation, étages ;
  - **aperçu de la trajectoire et des étapes** dès le choix du satellite, frise du temps en bas (curseur déplaçable, bulles d'information à chaque étape), ralenti extrême aux étapes pour voir les boosters partir ;
  - boosters, coiffe et étage principal **suivent leur propre chute** (nom, vitesse, hauteur, suivi caméra), options d'affichage par élément.
- **Spoutnik 1 (1957)** : la fusée R-7 part de Tiouratam vers le nord-est et dépose la sphère sur son orbite de 215 × 939 km inclinée de 65,1° ; récit en direct, fiche, photos et crédits.
- **Starship** : le lancement Starship + Super Heavy depuis Starbase met le vaisseau en orbite et **le booster revient se poser sur la tour** (boostback, freinage « hoverslam », bras de capture). Tout est décrit dans un JSON (fusée comprise) : bouton « Ouvrir un plan JSON » pour envoyer le tien.
- **Plan de vol en JSON** : le lancement de satellite est piloté par `data/plans/kourou-ariane5-500km.json` (direction de la poussée, allumages, extinctions, largages et masses en fonction du temps) que le moteur rejoue sans guidage ; modifie-le et recharge la page pour changer la trajectoire.
- **Apollo 11 (1969)** : la mission complète, calculée avec le même esprit physique : Saturn V depuis le pas de tir 39A, orbite terrestre, injection translunaire, vol de 3 jours (**la Terre tourne, la Lune tourne autour d'elle**, Lune texturée d'après la carte géologique de l'USGS), orbite lunaire, descente et alunissage d'Eagle dans la Mer de la Tranquillité, premiers pas, remontée, rendez-vous, retour, rentrée et amerrissage ; frise des étapes, récit et photos NASA. Trajectoires générées hors ligne (`node tools/make-apollo.js`).
- **Moteur physique générique** (`js/physics.js`) : n'importe quel objet décrit par un modèle (masse, forme, moteur) et un état de départ (position, vitesse, direction) se comporte à peu près comme dans la vraie vie, sans code spécifique ; les débris l'utilisent.

## Lancer en local

```bash
cd space
npm start        # ou double-clic sur start.bat (Windows) / ./start.sh
```

(équivalent : `npx --yes http-server -p 5179 -c-1`)

puis ouvrir <http://localhost:5179>. La page doit être servie en **http** (le modèle 3D de l'ISS et les photos sont chargés à la demande).

Tests de calcul (Node, sans navigateur) : `npm test` (`tools/test/physics.test.js`), `node tools/test/apollo.test.js`, `node tools/test/apollo-data.test.js`.

## Organisation

| Dossier / fichier | Rôle |
|---|---|
| `index.html`, `css/` | page et styles |
| `js/earth.js`, `main.js`, `controls.js` | globe, scène, caméra, interface |
| `js/iss.js`, `gltf-mini.js` | ISS (SGP4) et chargeur de modèles 3D |
| `js/physics.js` | moteur physique générique (`Body`, guidages, orbites képlériennes) |
| `js/launch.js`, `rockets.js`, `launch-3d.js` | simulation de montée, fusées de chaque base, lancement en 3D, frise, options |
| `js/story.js`, `story-apollo.js` | missions historiques (texte et photos) |
| `js/apollo.js`, `moon.js`, `data/apollo11.js` | mission Apollo 11 (véhicules, Lune, trajectoires générées par `tools/make-apollo.js`) |
| `data/` | cartes, photos aériennes, images d'illustration, modèle 3D de l'ISS |
| `_archive/` | travaux précédents (système solaire à l'échelle, frise, jeu de tir…) |
| `CLAUDE.md` | documentation détaillée du projet |

## Limites

Les fusées sont modélisées **de mémoire, avec des valeurs simplifiées** (masses, poussées, durées de combustion) et ajustées pour atteindre l'orbite : à vérifier avant de les citer. Mouvement dans le plan orbital, guidage idéal, pas de vent. Les chiffres historiques de Spoutnik viennent de sources courantes et sont à vérifier.

## Sources et crédits

- Continents, frontières, villes : [Natural Earth](https://www.naturalearthdata.com/) (domaine public).
- Photos aériennes : [Sentinel-2 cloudless 2016](https://cloudless.eox.at) par EOX IT Services GmbH (contient des données Copernicus Sentinel 2016 modifiées, CC BY 4.0) ; USGS NAIP (domaine public) ; 国土地理院 / GSI Japan (« seamlessphoto »). *L'image haute résolution (IGN, Pléiades) du pas de tir de Kourou n'est pas publiée dans ce dépôt, sa licence restant à clarifier.*
- Modèle 3D de l'ISS : [NASA](https://solarsystem.nasa.gov/gltf_embed/2378/) (domaine public).
- Orbite de l'ISS : TLE [CelesTrak](https://celestrak.org/) ; propagation [satellite.js](https://github.com/shashwatak/satellite-js) (MIT).
- 3D : [three.js](https://threejs.org/) r160 (MIT).
- Photos d'Apollo 11 : NASA / Neil Armstrong / Buzz Aldrin (domaine public) — Wikimedia Commons. Carte géologique de la Lune : USGS (domaine public).
- Photos de Spoutnik : NSSDC / NASA, US Air Force, Bill Ingalls / NASA (domaine public) ; fusée R-7 au VDNKh par MBH (CC BY 4.0) — Wikimedia Commons.

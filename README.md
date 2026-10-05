# 🌍 Terre 3D, ISS et système solaire

Une web app 3D (**three.js**, moteur en JavaScript pur, interface React / Next.js) : la Terre avec sa carte dessinée, ses nuages et son halo d'atmosphère, la Station spatiale internationale à sa position réelle, et tout le système solaire (planètes, lunes, Soleil, comètes).

### ▶ [Ouvrir la démo en ligne](https://mathieujullien77190.github.io/space-discover/)

> Lien GitHub Pages : `https://mathieujullien77190.github.io/space-discover/` (le projet est à la racine du dépôt).

## Ce que fait la page

- **Terre 3D** : carte dessinée (Natural Earth I, relief ombré) à toutes les altitudes, trait de côte vectoriel net à tout zoom, **halo bleu de l'atmosphère** sur l'horizon et **couverture nuageuse quasi temps réel** (bouton ☁ Nuages, images satellites de clouds.matteason.co.uk, mise à jour toutes les 3 h ; demande internet).
- **Vue au sol inclinable** : un clic sur la boule pose la caméra sur ce point du sol ; glisser en hauteur incline (de la verticale à l'horizon), glisser de côté tourne le cap, la molette règle la distance ; « 🌍 Terre » ou Échap revient à la vue d'ensemble.
- **ISS réelle** : position calculée avec SGP4 à partir d'un TLE de CelesTrak, modèle 3D de la NASA, cotes de taille et de hauteur, trajectoire sur un tour ; bouton **🛰 ISS** (zoom sur la station) et **👁 Vue depuis l'ISS** (on regarde la Terre depuis la station, en glissant).
- **Système solaire** (menu 🌌 Astres) : Terre, Lune, Soleil, **Mercure, Vénus, Mars, Jupiter, Saturne (anneaux), Uranus, Neptune, Pluton**, **22 lunes**, et les comètes **Halley** (noyau en cacahuète, queue tournée à l'opposé du Soleil) et **Tchouri** (vrai modèle 3D de l'ESA). Chaque astre a sa carte dessinée, sa **fiche** (illustration + caractéristiques calculées) et ses boutons « Nord en haut » / « Orbite à plat ».
- **Temps** : horloge simulée, vitesses jusqu'à 10 ans par seconde, **saut de date** (📅) ; l'ISS n'existe qu'à partir de 1998.
- **Astres en JSON** (`public/objects/<astre>/<astre>.json`) : ajouter un astre = ajouter un dossier (guide : `public/objects/README.md`).

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
| `src/engine/` | moteur 3D (aucune dépendance à React) : globe, nuages, atmosphère, ISS (SGP4), astres, éphémérides, `app.js` = point d'entrée `createEngine` |
| `src/components/`, `src/store/`, `src/types/` | interface React : un dossier par composant, état Zustand, types |
| `src/app/` | Next.js (App Router) |
| `public/objects/`, `public/data/` | objets JSON (un dossier par astre ou par satellite, modèles 3D) et carte dessinée de la Terre |
| `tools/` | générateurs (astres, cartes, fiches) et tests du moteur |
| `_archive/` | travaux archivés : système solaire à l'échelle (ancien), frise, jeu de tir… et **`_archive/fusees-histoires/`** (fusées, satellites, sondes, missions, histoire de Laïka : voir son README) |
| `CLAUDE.md` | documentation détaillée du projet |

## Limites

Les valeurs des astres (orbites, masses, rotations) sont écrites de mémoire et validées par recoupement (3e loi de Kepler, oppositions de Mars, périhélie de Halley) : à vérifier avant de les citer. Les positions des planètes viennent d'éléments orbitaux moyens (précision de quelques %).

## Sources et crédits

- Continents et trait de côte : [Natural Earth](https://www.naturalearthdata.com/) (domaine public) ; carte dessinée de la Terre : Natural Earth I avec relief ombré (domaine public).
- Nuages : [clouds.matteason.co.uk](https://clouds.matteason.co.uk/) (images satellites géostationnaires, service gratuit tiers).
- Modèle 3D de l'ISS : [NASA](https://solarsystem.nasa.gov/gltf_embed/2378/) (domaine public) ; orbite : TLE [CelesTrak](https://celestrak.org/) ; propagation [satellite.js](https://github.com/shashwatak/satellite-js) (MIT).
- Modèle 3D de la comète Tchouri : ESA / Rosetta / OSIRIS (CC BY-SA 3.0 IGO) ; cartes de Mars, Mercure, Europe, Pluton, Titan : NASA / USGS / JPL (domaine public), stylisées ; voir `public/objects/tchouri/CREDITS.md`.
- 3D : [three.js](https://threejs.org/) r160 (MIT).

# Ajouter un objet : un dossier, un JSON

> **Archivage du 2026-10-05** : les fusées, sondes, navette et autres engins lançables (Ariane 5, navette, Voyager, Spoutnik 2…) sont archivés dans `_archive/fusees-histoires/public/objects/` ; le projet ne garde que les **astres** (`kind: "body"`) et l'**ISS** (`live: true`). Les sections de ce guide sur les paliers de poussée, les pièces larguées (`parts`, `release`) et le dessin d'une fusée (`visual.stack`) décrivent le format des objets archivés ; le moteur n'affiche plus de lancement. Le format « astre » et « satellite en orbite » (`start.orbit`) reste valable.

Un objet = **un dossier** `objects/<nom>/` qui contient `<nom>.json` (et, s'il en a, son modèle 3D et ses pièces larguables). Aucun code à toucher.

| Je veux… | Je fais |
|---|---|
| **modifier** un objet | j'édite son JSON, je recharge la page (sur http le JSON est relu à chaque lancement) |
| **ajouter** un objet | je crée `objects/<nom>/<nom>.json`, puis `npm start` (il régénère la liste tout seul ; ou `node tools/make-objects.js`) |
| le voir | un astre : menu « 🌌 Astres » ; l'ISS : bouton « 🛰 ISS » |

## Le plus petit objet

```json
{
  "name": "Ma fusée",
  "start": { "lat": 5.24, "lon": -52.77, "altitudeKm": 0, "azimuthDeg": 90, "elevationDeg": 90, "speedMs": 0 },
  "timeline": [
    { "t": 0,   "massKg": 500000, "thrustN": 8000000, "isp": 300, "pitch": 90, "label": "Décollage" },
    { "t": 30,  "pitch": 70 },
    { "t": 130, "massKg": 60000, "thrustN": 1200000, "isp": 440, "pitch": 15, "label": "Étage supérieur" },
    { "t": 280, "thrustN": 0, "label": "Moteur éteint" }
  ]
}
```

**Trajectoire de libération** : si l'objet atteint la vitesse de libération il quitte la Terre (le vol est suivi jusqu'à `escapeDistanceM`, 10⁹ m par défaut ; mettre `maxDurationS` assez grand, ex. 200000). **La Lune et le Soleil attirent l'objet** (`"thirdBodies": false` pour l'éviter) ; les autres planètes ne sont pas simulées.

Le moteur n'a **aucun objectif** : il applique les paliers puis la physique (gravité, air, poussée) décide. Bonne vitesse = orbite, vitesse insuffisante = l'objet retombe sur la Terre.

## Les paliers (`timeline`)

Chaque ligne a un temps `t` (secondes). **On n'écrit que ce qui change** à cet instant, le reste garde sa valeur. Le dernier palier = fin de la poussée.

| Clé | Rôle |
|---|---|
| `massKg` | masse totale (un largage = une baisse de masse) |
| `thrustN` ou `accelMs2` | poussée (N) ou accélération due à la poussée (m/s²) ; `0` = moteur éteint |
| `isp` | impulsion spécifique (s) : la masse baisse toute seule |
| `burnKgS` + `ispVac` + `ispSea` | débit (kg/s) et Isp dans le vide / au niveau de la mer : la poussée se déduit (plus faible au sol) |
| `pitch` | direction de la poussée, ° au-dessus de l'horizontale (90 = vertical), interpolée entre deux paliers qui la donnent ; `"prograde"` = le long de la vitesse (étages dans le vide) |
| `speedMs` | remet la vitesse (par rapport au sol) à cette valeur |
| `cdA` | traînée (surface × coefficient, m²) |
| `flames` | flammes affichées : `["eap","epc","esc"]` (boosters, étage principal, étage supérieur) |
| `label`, `key`, `phase` | texte de l'étape (liste « À faire »), identifiant, nom de la phase |
| `release` | **largue des pièces** (voir plus bas) |

## Pièces larguées : un JSON par pièce

Boosters, coiffe, étage vidé, satellite… ne sont **pas** dans le JSON de la fusée : chacun a **son propre fichier**, dans le même dossier, déclaré dans `parts` et largué avec `release` :

```json
"parts": { "booster": "booster.json", "fairing": "fairing.json" },
"timeline": [
  { "t": 130, "release": [{ "part": "booster", "count": 2 }], "label": "Séparation des boosters" }
]
```

`booster.json` :

```json
{
  "name": "Booster à poudre", "role": "booster",
  "massKg": 33000, "residualPropKg": 0,
  "visual": { "radiusM": 1.5, "lengthM": 31, "noseM": 3.2, "nozzleM": 3.5, "color": "#f2f2f2", "bandColor": "#b83030" },
  "dragCoefficient": 1, "separationSpeedMs": -1.5, "disintegrates": false
}
```

- `role` : `booster`, `fairing` (coiffe), `stage` (étage vidé), `payload` (satellite).
- À `release`, la masse de l'objet baisse de `count × (massKg + residualPropKg)` et chaque pièce **part avec l'état de la fusée** (position, vitesse) puis retombe seule (traînée, gravité) : elle tombe dans l'océan ou se désintègre (`disintegrates`, `disintegrationAltitudeKm`).
- `separationSpeedMs` : vitesse de séparation le long de la trajectoire (négatif = vers l'arrière).
- La fusée est dessinée à partir de ses pièces avec `visual.stack` dans `<nom>.json` (voir `ariane5/ariane5.json`).

## Modèles 3D des pièces

Chaque pièce (et la partie qui reste, `visual.stack.upper`) peut avoir un modèle glTF (`.glb`) posé dans le dossier de l'objet :

```json
"model": { "file": "solid-rocket-booster.glb", "scale": 0.0254, "rotate": [0, 0, 90], "align": ["center", "min", "center"], "offsetM": [0, 0, 0] }
```

- `scale` : mètres par unité du fichier (0,0254 pour un modèle en pouces) ; `rotate` : rotation d'Euler en degrés pour mettre le modèle **debout, nez vers le haut** ; `align` : par axe `min` (le bord bas va à 0), `center`, `max` ou `none` ; `offsetM` : décalage final (l'orbiteur de la navette est posé à côté du réservoir).
- Sans modèle (ou si le fichier ne se charge pas), la pièce est un cylindre. Les modèles compressés en Draco ne sont pas lus : les décompresser avec `npx @gltf-transform/cli copy in.glb out.glb`.
- Exemple complet : `shuttle/` (orbiteur, réservoir externe, 2 boosters ; modèles NASA).

## Un satellite : ses paramètres orbitaux

```json
"start": { "orbit": { "epoch": "2026-10-01T11:56:31.238Z", "inclinationDeg": 51.6318, "raanDeg": 133.9648, "eccentricity": 0.0006934,
  "argPerigeeDeg": 209.9872, "meanAnomalyDeg": 150.072, "meanMotionRevDay": 15.4870385, "ndotRevDay2": 0.00003723, "bstar": 0.000076468 }, "at": "now" }
```

Ce sont les champs d'un TLE (ou `"tle": ["ligne 1", "ligne 2"]`). L'objet part de sa vraie position à la date `at` (`"now"` = maintenant). Avec `"live": true` il est présent en permanence dans la scène (liste « 🛰 Satellites ») ; `"model": { "file": "mon-modele.glb" }` donne son modèle 3D (le fichier est dans le même dossier ; `visual.widthM` = sa largeur réelle).

## Un astre (étoile, planète, lune, comète)

Un astre est aussi un dossier + un JSON, avec `"kind": "body"` : il n'a pas de poussée ni de paliers mais des constantes physiques, un mouvement et un aspect. Il apparaît tout seul dans le **sélecteur de vues** et dans la scène (sphère, étiquette, orbite, point lointain).

```json
{
  "kind": "body", "bodyType": "planet",
  "name": "Mars", "radiusKm": 3389.5, "muM3S2": 4.282837e13, "massKg": 6.4171e23,
  "around": "sun",
  "motion": { "frame": "heliocentric", "model": "kepler", "semiMajorAxisKm": 227939200, "eccentricity": 0.0934, "inclinationDeg": 1.85,
             "nodeDeg": 49.558, "argPerigeeDeg": 286.502, "meanAnomalyDeg": 19.41, "epochD2000": 0, "periodDays": 686.98 },
  "appearance": { "kind": "sphere", "color": "#c1440e" },
  "trace": { "fullOrbit": true, "color": "#c1440e" },
  "dot": { "color": "#e0623a", "minDistanceUnits": 300 },
  "label": { "text": "Mars", "metricText": "Mars · Ø {diameterKm} km", "minDistanceUnits": 300 },
  "menu": { "order": 4, "icon": "🔴", "view": { "distanceUnits": 3, "text": "Vue de Mars" } }
}
```

- `bodyType` : `star` (Soleil), `planet`, `moon`, `comet` (+ `asteroid`, `dwarf`). `around` : le corps central (`sun`, `earth`).
- `motion.model` : `kepler` (éléments orbitaux, écliptique J2000 : une planète, une comète, un astéroïde), `meeus-moon` / `meeus-sun` (formules précises de la Lune et du Soleil), `inverse` (la Terre vue du Soleil).
- `appearance.kind` : `sphere` (couleur), `star` (étoile émissive avec halo), `comet` (noyau + `tail { color, lengthKmAt1AU, widthKm }` : queue à l'opposé du Soleil), `painted` (texture peinte par du code : la Lune), `earth`.
- `trace` : `fullOrbit` (ellipse complète) ou `pastDays` / `futureDays` (trace derrière et devant, comme la Lune) ; `thirdBody: true` : l'astre attire les fusées (marée) ; `info: true` : sa distance est écrite dans l'info.
- Les unités de distance (`distanceUnits`, `minDistanceUnits`) sont des **rayons terrestres**.
- Exemples : `earth/`, `moon/`, `sun/`, `mars/` (planète), `halley/` (comète, e = 0,967).

## Exemples

- `ariane5/` : Ariane 5 ECA, 4 pièces larguables (boosters, coiffe, étage principal, satellite), orbite de 500 km.
- `voyager/` : Voyager 2 (Titan IIIE-Centaur, 3 étages + moteur à poudre, coiffe, trajectoire de libération C3 ≈ 102 km²/s²).
- `shuttle/` : la navette spatiale (modèles 3D NASA, 2 boosters + réservoir larguables, orbite de 215 × 225 km, pas l'ISS).
- `fusee-orbite-500km/` : le plus petit exemple qui atteint l'orbite (deux étages, rallumage à l'apogée).
- `fusee-trop-lente/` : la même fusée, moteur coupé trop tôt : elle retombe sur la Terre.
- `iss/` : l'ISS (paramètres orbitaux + modèle 3D `iss-nasa.glb`).

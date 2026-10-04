# Ajouter un objet : un dossier, un JSON

Un objet = **un dossier** `objects/<nom>/` qui contient `<nom>.json` (et, s'il en a, son modèle 3D et ses pièces larguables). Aucun code à toucher.

| Je veux… | Je fais |
|---|---|
| **modifier** un objet | j'édite son JSON, je recharge la page (sur http le JSON est relu à chaque lancement) |
| **ajouter** un objet | je crée `objects/<nom>/<nom>.json`, puis `npm start` (il régénère la liste tout seul ; ou `node tools/make-objects.js`) |
| le voir | bouton « 🚀 Fusées » (choisir l'objet, « Lancer ») — ou « 🛰 Satellites » si `"live": true` |

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

Le moteur n'a **aucun objectif** : il applique les paliers puis la physique (gravité, air, poussée) décide. Bonne vitesse = orbite, vitesse insuffisante = l'objet retombe sur la Terre.

## Les paliers (`timeline`)

Chaque ligne a un temps `t` (secondes). **On n'écrit que ce qui change** à cet instant, le reste garde sa valeur. Le dernier palier = fin de la poussée.

| Clé | Rôle |
|---|---|
| `massKg` | masse totale (un largage = une baisse de masse) |
| `thrustN` ou `accelMs2` | poussée (N) ou accélération due à la poussée (m/s²) ; `0` = moteur éteint |
| `isp` | impulsion spécifique (s) : la masse baisse toute seule |
| `burnKgS` + `ispVac` + `ispSea` | débit (kg/s) et Isp dans le vide / au niveau de la mer : la poussée se déduit (plus faible au sol) |
| `pitch` | direction de la poussée, ° au-dessus de l'horizontale (90 = vertical), interpolée entre deux paliers qui la donnent |
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

## Un satellite : ses paramètres orbitaux

```json
"start": { "orbit": { "epoch": "2026-10-01T11:56:31.238Z", "inclinationDeg": 51.6318, "raanDeg": 133.9648, "eccentricity": 0.0006934,
  "argPerigeeDeg": 209.9872, "meanAnomalyDeg": 150.072, "meanMotionRevDay": 15.4870385, "ndotRevDay2": 0.00003723, "bstar": 0.000076468 }, "at": "now" }
```

Ce sont les champs d'un TLE (ou `"tle": ["ligne 1", "ligne 2"]`). L'objet part de sa vraie position à la date `at` (`"now"` = maintenant). Avec `"live": true` il est présent en permanence dans la scène (liste « 🛰 Satellites ») ; `"model": { "file": "mon-modele.glb" }` donne son modèle 3D (le fichier est dans le même dossier ; `visual.widthM` = sa largeur réelle).

## Exemples

- `ariane5/` : Ariane 5 ECA, 4 pièces larguables (boosters, coiffe, étage principal, satellite), orbite de 500 km.
- `fusee-orbite-500km/` : le plus petit exemple qui atteint l'orbite (deux étages, rallumage à l'apogée).
- `fusee-trop-lente/` : la même fusée, moteur coupé trop tôt : elle retombe sur la Terre.
- `iss/` : l'ISS (paramètres orbitaux + modèle 3D `iss-nasa.glb`).

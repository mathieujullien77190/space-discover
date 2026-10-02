# Frise de la conquête spatiale (1950 → aujourd'hui) puis jeu d'exploration

Web app **mobile d'abord** (défilement vertical) avec une vue web à deux colonnes. Un seul fichier : `index.html`
(canvas 2D + JS vanilla, aucune dépendance, aucun build).

**Vision** : partie 1 = une frise « façon film » à lire en faisant défiler l'écran (missions, explications, découvertes, de la première
fusée à aujourd'hui) ; partie 2 = un jeu où l'on explore l'univers, en partant de la technologie d'aujourd'hui (les voyages
s'allongent à mesure qu'on s'éloigne). **Seule la partie 1 existe pour l'instant** ; le bouton « Explorer l'univers » de la fin ouvre
un message « pas encore construit ».

> **Règle de maintenance : mettre ce fichier à jour à chaque modification** (contenu, structure, constantes, journal).
> L'utilisateur améliore le projet au fur et à mesure et a demandé qu'on fasse « comme on le sent ».

## Dépôt Git

- Remote `origin` (SSH) : `git@github.com:mathieujullien77190/space-discover.git` ; branche locale `main`. La clé SSH de l'utilisateur est configurée et l'authentification GitHub fonctionne.
- Au moment du branchement le dépôt distant était **vide** ; rien n'était encore commité ni poussé.
- Messages de commit : voir la skill `commit-push` de l'utilisateur (anglais, Conventional Commits, **sans** trailer de co-auteur ni de session).

## Lancer

Python n'est pas installé. Serveur statique via Node :

```
cd C:\projet\testGame
npx --yes http-server -p 5179 -c-1
```

Puis http://localhost:5179 (`-c-1` = pas de cache). Le fichier peut aussi s'ouvrir directement.

## Ce que fait la page

- **Défilement vertical** : chaque scène est une « carte » de texte (tag, date, titre, explication, « pourquoi c'est important »).
- **La carte du haut est pilotée par le défilement** : l'année avance, le zoom passe de l'orbite basse de la Terre à l'espace interstellaire,
  les objets envoyés par l'humanité apparaissent à leur année de lancement (et disparaissent quand ils finissent), l'objet de la scène est mis en
  avant (anneau jaune pulsant + étiquette). Les sondes lointaines sont placées là où elles étaient à ce moment (`place`).
- **Illustrations de découvertes** (`VIZ`) : fond diffus cosmologique, pulsar, exoplanète par oscillation de l'étoile, transit (Kepler),
  trou noir (M87*), ondes gravitationnelles, expansion de l'univers. Elles s'affichent en fondu par-dessus la carte pendant leur scène.
- **Pellicule en bas** : barre façon film avec perforations, repères par décennie, un point par scène (cliquable), marqueur d'année.
- **Mobile** (< 900 px) : la carte occupe le haut (46 vh), les cartes de texte défilent dessous. **Grand écran** (≥ 900 px) : carte pleine page à gauche, texte à droite.

## Structure de `index.html`

1. CSS (variables `--canvas-h`, `--scene-h`, `--strip-h` ; media query à 900 px).
2. Données : `planets` (vraies distances en UA, angles illustratifs), `ITEMS` (objets : `kind` = `orbit` / `l2` / `at` / `helio`), `RK` (échelles de zoom), `SCENES`.
3. Carte : `camera(logR)` (centrée Terre de près, glisse vers le Soleil en dézoomant), `drawMap`, `placeA` (distance forcée d'une sonde), `VIZ`, `drawViz`.
4. Frise : construction des sections, `computeLayout` (centres des sections, point de lecture `readY`), `readScroll` (position de défilement → scène courante + progression + cible de zoom/année avec un plateau au milieu de chaque scène), pellicule, boucle `loop` (lissage exponentiel du zoom et de l'année).

Ajouter une scène : ajouter un objet à `SCENES` (dans l'ordre chronologique) avec `y`, `date`, `tag`, `title`, `text`, `why`, `R`, `focus` (ids d'`ITEMS`),
éventuellement `viz` ou `place`. Ajouter un objet : `ITEMS` (`start`, `end` optionnel, `cat`, `kind` + paramètres).

## Vérité des données (important)

- Les altitudes et distances au Soleil sont réelles ; les angles des planètes sont **illustratifs** et les planètes sont immobiles ; les orbites autour de la Terre sont animées en temps accéléré (`KORB` = 690, l'ISS fait un tour en ~8 s).
- Distances approximatives (ordres de grandeur) pour les sondes lointaines : Voyager 1 ≈ 170 UA, Voyager 2 ≈ 142 UA, New Horizons ≈ 65 UA, Pioneer 10 ≈ 80 UA (dernier contact en 2003).
- **Tout le texte a été rédigé de mémoire : il faut relire et sourcer chaque date et chaque chiffre (NASA, ESA, articles) avant publication.** Les approximations doivent rester signalées (grille « vrai / simplifié / fiction »).
- Scènes sensibles (Saliout 1/Soyouz 11, Challenger/Columbia) : ton respectueux, factuel.

## Test

- Syntaxe : `node -e "const s=require('fs').readFileSync('index.html','utf8'); new Function(s.match(/<script>([\s\S]*)<\/script>/)[1])"`
- Logique sans navigateur : exécuter le `<script>` dans Node avec un faux DOM (contexte 2D en `Proxy`, `createRadialGradient`/`createLinearGradient` renvoyant `{addColorStop}`, `document.createElement('section')` avec `offsetTop`/`offsetHeight`, `scrollY` global), exposer les variables via `globalThis`, puis balayer `scrollY` de 0 à la fin en appelant `readScroll`, `drawMap`, `drawViz`, `updateUI`.
- **Ne pas tester via l'extension Chrome : l'utilisateur teste lui-même dans son navigateur.**

## Pistes

- Partie 2 : le jeu d'exploration (voyages à durée réelle sur échelle logarithmique, classement, échecs qui cartographient les dangers, noms gravés, haut faits) ; idées détaillées dans `_archive/CLAUDE-jeu-de-tir-et-carte.md`, section « Idée future ».
- Application mobile : prévoir une PWA (manifest + service worker) pour l'installer sur téléphone ; la même page sert pour le web.
- Contenu : plus de scènes (ajouter Galileo, Juno, Hayabusa, OSIRIS-REx, Artemis), sources citées par scène, mode « en vrai » (valeur du jeu vs valeur réelle), version en anglais.
- Design : transitions plus cinématiques, son/ambiance, illustrations dédiées par mission.

## Archive

`_archive/` contient les anciens prototypes, **non modifiés** et conservés au cas où : `jeu-de-tir-index.html` (jeu de tir avec gravité),
`exploration-carte/index.html` (première carte zoomable avec fiches), `CLAUDE-jeu-de-tir-et-carte.md` (ancienne documentation).
Ne pas les modifier sans demande ; l'utilisateur a demandé de passer à la frise.

## Journal des changements

- Passage à la **frise 1950 → aujourd'hui** (défilement vertical, mobile d'abord + vue web) ; ancien jeu de tir et carte déplacés dans `_archive/`.
- 51 scènes de 1950 à 2023 + début et fin ; 7 illustrations de découvertes ; 49 objets sur la carte ; pellicule cliquable ; fin avec bouton « Explorer l'univers » (placeholder).
- Dépôt Git initialisé et branché sur `origin` (SSH, `space-discover`).

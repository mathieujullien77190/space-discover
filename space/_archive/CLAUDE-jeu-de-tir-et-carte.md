# testGame — jeu de tir spatial (gravité)

> **Statut : mis de côté.** L'utilisateur a demandé d'oublier le jeu de tir pour se concentrer sur l'idée de web app d'exploration spatiale (section « Idée future » plus bas). Le prototype reste en l'état, ne plus le modifier sauf demande explicite.

Prototype de jeu dans un seul fichier : `index.html` (canvas 2D, JS vanilla, aucun build, aucune dépendance).
Le joueur tire des projectiles depuis la Terre vers **Uranus** à travers un système solaire complet. La gravité
courbe les trajectoires ; on peut poser des contre-mesures (sur les planètes, ou des trous noirs) et choisir le type de projectile.
Idée à long terme : multijoueur 2-3 joueurs en temps réel (voir « Pistes »).

> **Règle de maintenance : mettre ce fichier à jour à chaque modification du jeu** (contrôles, constantes,
> règles, architecture, journal). Il remplace l'aide qui était affichée à l'écran.

## Lancer le jeu

Python n'est pas installé. Serveur statique via Node :

```
cd C:\projet\testGame
npx --yes http-server -p 5179 -c-1
```

Puis ouvrir http://localhost:5179 (`-c-1` = pas de cache). Le fichier peut aussi s'ouvrir directement.

## Contrôles

| Action | Contrôle |
|---|---|
| Viser | clic (ou glisser) sur la carte : le tir part de la Terre vers ce point |
| Puissance | glisser la poignée jaune au bout de la flèche, ou curseur « Puissance » (en bas à droite) |
| Réglage fin | `←` `→` angle ±1° ; `↑` `↓` puissance ±1 ; `Maj` = pas de 0,2 ; `+` `-` puissance ±5 |
| Tirer | bouton « Tirer », `Espace` ou `Entrée` — **on peut enchaîner les tirs, plusieurs projectiles volent en même temps** |
| Effacer tous les tirs et traces | `R` |
| Projectile | `1` Balistique, `2` Obus lent, `3` Missile rapide, `4` Laser (ou panneau en haut à droite) |
| Contre-mesures | panneau en haut à droite : Miroir, Bouclier (clic sur une planète), Trou noir (clic sur la carte), Gomme |
| Revenir au canon | `C` ou `Échap` |
| Effacer les contre-mesures | bouton rouge « Clear contre-mesures » ou `X` |
| Nouvelle disposition des planètes | `N` |
| Orbites et rotations on/off | `O` |
| Halo du Soleil on/off | `F` |
| Vitesse du temps | curseur « Vitesse du temps » (×0,25 → ×50, échelle log, double-clic = ×1) |

### Pose des contre-mesures
Clic sur le bouton de l'outil, puis un aperçu (« fantôme » semi-transparent) suit la souris et **la trajectoire
prévue en tient compte avant même le 2e clic**. Le 2e clic pose l'objet et l'outil revient au canon
(`Maj` = rester sur l'outil pour en poser plusieurs).
- **Bouclier** : clic sur une planète (ou une lune) → bouclier autour d'elle ; re-clic = on l'enlève.
- **Miroir** : clic sur une planète → un petit miroir à l'angle cliqué ; on peut en mettre plusieurs par planète.
- **Trou noir** : clic n'importe où sur la carte.
- **Gomme** : sur un trou noir proche, sinon retire bouclier + miroirs de la planète visée.

## Règles du jeu

- Cible : toujours **Uranus**, 100 PV (`TARGET_MAX_HP`). Zone de contact généreuse (rayon + 16 px) ; les autres corps rayon + 5.
- Un tir qui touche Uranus retire des PV selon le projectile ; à 0 PV : « détruite », score +1, PV remis à 100 immédiatement.
- Fin d'un tir : impact sur un corps, bouclier, trou noir, ou sortie de la carte (`OUT_OF_BOUNDS` = 1300 px du Soleil).
  Le résultat s'affiche en message temporaire (« toast ») en haut de l'écran, quelques secondes.
- Le point de départ est la surface de la Terre (`BARREL` = 6 px au-dessus du rayon). Aucun dessin de canon.

### Projectiles (`PROJ`)
| Type | Puissance max | Dégâts | Particularité |
|---|---|---|---|
| Balistique | 300 | 25 fixe | gravité normale |
| Obus lent | 170 | `min(90, 10 + 2·tempsDeVol)` | récompense les longs vols |
| Missile rapide | 450 | `min(90, vitesseImpact·0,2)` | dégâts selon la vitesse d'arrivée |
| Laser | fixe (`LASER_SPEED` = 450 px/s) | 12 fixe | simple trait épais rose qui avance (pas instantané, pas de traînée), ligne droite, ignore la gravité et les boucliers, rebondit sur les miroirs |

La vitesse de libération de la Terre est ≈ 130 px/s ; l'obus (max 170) n'a donc qu'une petite plage utile.

### Contre-mesures
- **Bouclier** (sur une planète) : cercle de rayon planète + `SHIELD_PAD` (18), suit la planète. Arrête les projectiles de vitesse < `SHIELD_MAX_SPEED` (140). Missile et laser passent.
  Le bouclier de la Terre ne bloque pas un tir de moins de `SHIELD_GRACE` (1,5 s) de vol (sinon on se bloquerait soi-même).
- **Miroir** (sur une planète) : segment tangent, de longueur **1/8 de la circonférence** de la planète (`MIRROR_FRAC`, mini 4 px de demi-longueur),
  orienté par rapport au centre de la planète, placé juste hors du rayon de contact (`MIRROR_GAP` = 2) et qui **tourne avec la planète**
  (angle stocké relatif à `b.spin`). Ne réfléchit que le laser ; les autres projectiles le traversent.
- **Trou noir** (`HOLE_R` 8, `HOLE_MASS` 5000), placement libre : attire fort les projectiles non lumineux et les avale. Le laser n'est pas dévié.

## Physique et constantes

- Gravité : `a = G·M / max(d², 400) · 60` (`G` = 1,5), appliquée par chaque corps actif et chaque trou noir.
- Temps : `TIME_SCALE` = 0,375 (= ×1), multiplié par `timeMul` (curseur). Le pas est découpé en sous-pas ≤ `PRED_DT` (0,03).
- Orbites : vitesses de base × `ORBIT_SLOWDOWN` (0,4). Les planètes **tournent aussi sur elles-mêmes** (`spin`, `spinSpeed` = `SPIN_MUL` (4) × 0,8–2,2 rad/s de jeu) ; un trait du centre vers le bord le montre.
- Les planètes (orbite + rotation) bougent **en permanence, y compris pendant la visée** (`O` pour les figer). La prévision part des positions affichées et simule leur mouvement futur, donc elle reste exacte même si la cible bouge pendant qu'on vise.
- Positions et rotations initiales aléatoires (`randomizePositions`). Échelle volontairement fausse (le système tient à l'écran : `SYSTEM_RADIUS` = 700).
- Corps : Soleil, Mercure, Vénus, Terre, Mars, Jupiter, Saturne (anneaux décoratifs), Uranus, Neptune, 13 lunes (`moons` : Lune ; Phobos, Déimos ; Io, Europe, Ganymède, Callisto ; Rhéa, Titan ; Miranda, Titania, Obéron ; Triton). Une lune vient toujours **après** sa planète dans `bodies` et orbite autour d'elle (`dist` = distance à la planète). Mercure et Vénus n'en ont pas.
- Panneau « Corps du système » (bas gauche) : cocher/décocher chaque corps (désactivé = ni dessiné, ni gravité, ni collision). Retirer une planète retire ses lunes ; le panneau groupe chaque planète avec ses lunes (indentées).

## Architecture de `index.html`

Ordre du script :
1. Canvas, système solaire (`bodies`, `isActive`, `bodyPositions(t, px, py)`), cible (`newTarget`, `hitRadius`).
2. Projectiles (`PROJ`, `damageFor`) et contre-mesures (`holes`, `b.shield`, `b.mirrors`, `mirrorSeg`, `mirrorSegments(px, py, t, out)`).
3. Tirs : `ship` (= projectile d'**aperçu** du prochain tir), `shots[]` (projectiles lancés), `cannon` (angle + puissance), `launch`, `applyLaunch`, `fireShot`, `clearShots`, `finishShot`, toasts.
4. Physique : `stepProjectile` (gravité, trous noirs, boucliers), `stepLaser(s, px, py, dt, mir)` (segment par pas, miroirs, corps), `predictFrom`/`predict`, `update`.
5. Entrées : clavier, souris (`mousedown/move/up`, outil courant `tool`, `planetAt`), curseurs de puissance et de temps.
6. Panneaux HTML construits en JS (`#tools`, `#bodies`) ; bouton Tirer ; `#speedBox`.
7. Dessin : étoiles, halo du Soleil, traînées des corps, corps (+ trait de rotation), cible + PV, contre-mesures, fantôme, traces des tirs, prévisions, projectiles, toasts.

Points clés :
- **`predict()` / `predictFrom()` utilisent exactement la même physique que `update()`** (mêmes fonctions de pas). Le pas `i` de la prévision voit les planètes (positions, rotations, donc miroirs) à `(i+1)·PRED_DT`, comme `update()` qui avance les planètes avant de faire le pas. Toute modification de physique doit rester commune aux deux.
- Prévisions recalculées à chaque image : pointillés blancs pour le prochain tir (**masqués juste après un tir** : flag `aimHidden`, ré-affichés dès qu'on touche à l'angle, la puissance ou le projectile) (croix verte = touche la cible avec `-N PV`, rouge = raté, bleue = bouclier, violette = trou noir) et pointillés discrets devant chaque tir en vol (sauf laser). Chaque tir non laser laisse une trace pointillée bleue jusqu'à `R`.
- Aperçu d'une contre-mesure : l'objet « fantôme » est ajouté temporairement (`apply`) pendant les prévisions puis retiré (`undo`).
- Le laser avance par pas de 450·0,03 ≈ 13 px : les collisions sont testées sur tout le segment du pas (pas de traversée des petits corps).
- Les miroirs sont recalculés en coordonnées monde à chaque pas (position + rotation de la planète) ; `lastMirror` (id) évite de re-toucher le miroir qu'on vient de quitter.

## Interface actuelle

Pas de texte d'aide ni de stats à l'écran (retirés à la demande de l'utilisateur). Restent :
panneau « Projectile / Contre-mesures » (haut droite), « Corps du système » (bas gauche), curseurs Puissance + Vitesse du temps (bas droite),
bouton Tirer (bas centre). Les résultats de tir apparaissent en messages temporaires en haut.

## Test

- Syntaxe : `node -e "const s=require('fs').readFileSync('index.html','utf8'); new Function(s.match(/<script>([\s\S]*)<\/script>/)[1])"`
- Logique sans navigateur : exécuter le `<script>` dans Node avec un `document`/`canvas` factices (proxy pour le contexte 2D, `classList` avec `toggle`/`add`, `requestAnimationFrame` neutre), exposer les fonctions (`fireShot`, `update`, `predict`, `shots`, …) via `globalThis`, tirer et comparer `predict().end` au résultat réel de `update`.
- **Ne pas tester via l'extension Chrome : l'utilisateur teste lui-même dans son navigateur.**

## Pistes / idées (non faites)

- **Multijoueur 2-3 joueurs** : serveur Node + WebSocket, salles, seed partagé pour les planètes, un canon par joueur (Terre, Mars, Vénus), on n'envoie que les tirs (angle, puissance, instant), le serveur arbitre en refaisant la simulation. Commencer par le tour par tour, temps réel ensuite. Il faudra extraire la physique dans un module partagé client/serveur.
- Contre-mesures posées par les joueurs adverses plutôt que par le même joueur ; coûts / munitions.
- Projectile guidé (faible correction vers la cible).

## Idée future : web app d'exploration spatiale (brainstorm, rien de codé)

Site explicatif + jeu d'exploration sur **une saison d'un an réel**, où « tout est hyper long ».
- **Échelle** : distances en échelle logarithmique (`durée = A·log(distance)`) ; Lune = minutes, Neptune = jours, étoile proche = semaines, bord de l'univers observable = 12 mois. Les premiers jours doivent être rapides et riches, puis ça ralentit.
- **Voyage** : durée réelle ; la position se calcule à partir de l'heure de départ (pas de simulation continue) ; on part, on revient le lendemain. Heure de référence côté serveur (anti-triche).
- **Communauté** : on voit les autres joueurs, leurs distances, un classement du plus loin ; deux classements possibles (plus loin jamais atteint / progression en cours).
- **Découvertes et échecs** : planètes (vraies exoplanètes et/ou générées) ; échec (trou noir invisible, radiations, panne) = on recommence, mais la Terre a progressé (vaisseaux plus rapides, meilleurs capteurs) et la mort **cartographie** le danger pour les autres ; la première découverte grave le nom du joueur + haut fait.
- **Point de départ historique** : la saison commence en 1950 (V-2) et suit la vraie histoire (Spoutnik 1957, Apollo 1969, Voyager 1977, Parker 2018) avant de basculer en technologie fictive.
- **Pédagogie** : chaque mécanique enseigne un vrai concept ; autopsie après un échec ; explications au bon moment ; mode « en vrai » comparant valeur du jeu et valeur réelle ; liste « vrai / simplifié / fiction » des approximations.
- **Questions ouvertes** : public visé, saison commune ou départ personnel, ce que le joueur contrôle (pour que le classement ne soit pas l'ordre d'inscription), ce qui reste après un échec, nombre d'années d'histoire par jour réel, 2D ou 3D, compte/serveur ou stockage navigateur.

## Prototype web app d'exploration spatiale : `exploration/index.html` (en cours)

Premier prototype de la web app (voir « Idée future » ci-dessus). Fichier unique, canvas 2D, aucune dépendance.
Servi par le même serveur : http://localhost:5179/exploration/ (lancé depuis `C:projet	estGame`, voir « Lancer le jeu »).

- **Principe** : zoom continu (molette, boutons d'étapes, ou clic dans la liste) de l'orbite basse de la Terre jusqu'à l'espace interstellaire (rayon de vue de ~7 000 km à ~4·10¹⁰ km). La caméra est centrée sur la Terre de près et glisse vers le Soleil en dézoomant.
- **Contenu** : 26 objets (`ITEMS`) avec année, pays/agence, catégorie, texte explicatif, « pourquoi c'est important », et une note `posNote` qui dit ce qui est réel ou illustratif dans la position affichée. Satellites (Spoutnik 1, Explorer 1, Syncom 3, GPS, Hubble, ISS), vols habités, Lune (Luna 2, Apollo 11, Chang'e 4, Chandrayaan-3), JWST au point L2, sondes et atterrisseurs planétaires (Mariner 2, Venera 7, Viking 1, Spirit/Opportunity, Curiosity, Perseverance, Cassini-Huygens, Rosetta/Philae, DART), Parker, Pioneer 10, Voyager 1 et 2, New Horizons.
- **Curseur d'année 1950 → 2026** : n'affiche que les objets qui existent à cette année (`start`/`end`), bouton « Histoire » qui fait défiler les années, ligne « En 1957 : … ».
- **Échelles** : distances réelles (altitudes, UA) ; planètes immobiles avec angles illustratifs (Terre à l'angle 0) ; orbites autour de la Terre animées en temps accéléré (`KORB` = 690, l'ISS fait un tour en ~8 s, périodes via la 3e loi de Kepler) ; la Lune est fixe. Distances de Voyager 1/2, New Horizons, Pioneer 10 : ordres de grandeur à **vérifier** avant publication.
- **Règle éditoriale** : tout fait cité doit être vérifié avec une source (NASA, ESA…) avant mise en ligne ; les approximations sont signalées (`posNote`), conformément à la grille « vrai / simplifié / fiction ».
- **Test** : même méthode que le jeu (Node + faux DOM, voir « Test ») ; ne pas utiliser l'extension Chrome.
- **À faire** : sélection par clic sur la Terre/planètes (fiches), plus d'objets (Spoutnik 2, Telstar, Skylab, Mir, Galileo, Juno, Hayabusa…), vrais mouvements orbitaux des planètes, mode « en vrai » (valeur du jeu vs valeur réelle), voyage avec durée réelle, compte/serveur.

## Journal des changements

- Système solaire complet (8 planètes + Lune), anneaux de Saturne, étoiles qui scintillent, halo du Soleil, traînées des planètes.
- Canon sur la Terre → simple départ depuis la surface de la Terre (dessin du canon retiré).
- Prévision de trajectoire en direct + trace pointillée derrière + croix de fin (verte/rouge).
- Cible Uranus à PV ; 4 projectiles (balistique, obus lent, missile rapide, laser).
- Contre-mesures avec aperçu fantôme qui modifie la prévision ; curseurs de puissance et de vitesse du temps ; réglage fin au clavier.
- Laser à vitesse finie (`LASER_SPEED`), calcul par pas.
- Texte d'aide (haut gauche) et stats (haut droite) retirés de l'écran ; documentés ici.
- **Tirs multiples** : plusieurs projectiles en vol en même temps ; plus de phase « réglage / vol » ni de bouton « Retour au réglage » ; `R` efface les tirs ; résultats en toasts. (Les planètes étaient alors figées hors vol, voir plus bas.)
- Laser réduit à un simple trait épais qui avance (plus de lueur, plus de traînée).
- **Bouclier et miroir passent sur les planètes** (clic sur une planète) ; miroir = 1/8 de la circonférence, orienté par rapport au centre, qui tourne avec la planète. Les planètes tournent sur elles-mêmes, avec un trait centre → bord pour le voir. Fin des miroirs et boucliers libres.
- Rotation des planètes sur elles-mêmes ×4 (`SPIN_MUL`).
- Les planètes tournent (orbite + rotation) aussi pendant la visée : plus de gel quand aucun tir n'est en vol.
- Lunes des autres planètes (Mars, Jupiter, Saturne, Uranus, Neptune) ; traînées des lunes plus courtes (`MOON_TAIL_MAX`), étiquettes plus petites, panneau « Corps du système » groupé par planète et défilable.
- La prévision depuis la Terre est masquée après un tir et revient quand on change la visée.
- **Nouveau** : prototype de la web app d'exploration spatiale (`exploration/index.html`) : vue de la Terre et de ses satellites, puis du système solaire et des sondes, avec explications, zoom continu et chronologie 1950 → 2026.

# Modèles 3D de la navette spatiale

Source : **NASA** (NASA Science, « 3D Resources », https://science.nasa.gov/3d-resources/), travaux de l'administration américaine, libres de droits (attribution à la NASA ; ne pas utiliser le logo NASA pour suggérer un parrainage).

| Fichier ici | Origine | Remarque |
|---|---|---|
| `orbiter.glb` | « Space Shuttle (A) » (NASA Headquarters, Michael Carbajal), 213 000 triangles | **décompressé** (Draco → glTF brut, `npx @gltf-transform/cli copy`) car le chargeur maison ne lit pas Draco ; 4,6 Mo au lieu de 1,2 Mo |
| `external-tank.glb` | « External tank » (NASA/Johnson Space Center, « Space Shuttle parts ») | inchangé, unités : pouces |
| `solid-rocket-booster.glb` | « Solid Rocket Booster » (NASA/Johnson Space Center, « Space Shuttle parts ») | inchangé, unités : pouces |

Échelles et orientations (déterminées en analysant la géométrie) : le booster et le réservoir sont en pouces (× 0,0254, nez vers +X) ; l'orbiteur a le nez vers −Z et le dessus vers +Y, il est un peu plus long que le vrai (41,9 contre 37,2 m : échelle 0,89).

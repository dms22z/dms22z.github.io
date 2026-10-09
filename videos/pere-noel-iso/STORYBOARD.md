---
message: "Le Père Noël, c'est la plus grande opération logistique du monde — la magie, livrée à temps."
mode: autonomous
duration: 64s
canvas: 1920x1080
---

Un seul monde 3D isométrique (Three.js, caméra orthographique) traversé par une caméra continue,
habillé par 7 calques typographiques (sous-compositions GSAP). Les temps sont globaux, en secondes.

## Frame 1 — La promesse (0 – 7.4)
status: built · src: compositions/s1-hook.html + world/globe.js
Planète low-poly de nuit, lumières des villes, anneau d'orbite doré ; le traîneau fait le tour du globe
dans une traînée d'étincelles. Rapport d'activité : « 1 NUIT. » → compteur 2 000 000 000 cadeaux →
« 0 MINUTE de retard » (slam). Plongée inExpo dans le mini pôle Nord → raccord match-cut.
rules: counting-dynamic-scale, kinetic-beat-slam, coordinate-target-zoom

## Frame 2 — Le siège (7.4 – 15.0)
status: built · src: compositions/s2-hq.html + world/campus.js
Raccord sur le vrai pôle rayé, dézoom en spirale (outExpo) qui révèle le campus flottant : QG à horloge,
ateliers, pont convoyeur, hangar, piste. Les bâtiments et sapins surgissent (back-out), aurore boréale.
« Activité : ~~Fabricant de jouets~~ LOGISTIQUE », étiquettes 3D, bloc « La plus grande opération logistique de la planète ».
blueprint: camera-journey · rules: spring-pop-entrance, svg-path-draw

## Frame 3 — La production (15.0 – 24.3)
status: built · src: compositions/s3-production.html + world/campus.js
Le toit de l'usine s'envole, les murs avant s'abaissent (coupe isométrique). Lettres qui tombent dans la
trieuse, liste de souhaits cochée, chaîne : hologramme → jouet → paquet cadeau. La caméra saute de poste
en poste sur « conçoivent / assemblent / emballent ».
blueprint: spatial-pan-stations · rules: waterfall-entry, dynamic-content-sequencing

## Frame 4 — La flotte (24.3 – 33.4)
status: built · src: compositions/s4-fleet.html + world/campus.js + world/core.js (team)
La caméra suit un colis (étiquette de suivi) sur le pont jusqu'au hangar, qui s'ouvre. Fiche technique :
traîneau ×1, rennes ×9 (pop un par un, nez rouge), hotte : compteur exponentiel → ∞ (slam + secousse).
Décollage sur la piste.
rules: counting-dynamic-scale, physics-press-reaction, multi-phase-camera

## Frame 5 — La tournée (33.4 – 42.0)
status: built · src: compositions/s5-route.html + world/route.js
24 tuiles de fuseaux horaires ; la nuit balaie d'est en ouest, les fenêtres s'allument, étoiles dorées
« livré » sur chaque maison. Le traîneau chevauche minuit (itinéraire prévu en pointillés, trajet fait
en étincelles). HUD : fuseau + ville, progression, « heure locale 00:00 » constante. Tokyo, Le Caire, Paris, New York.
rules: viewport-change, stat-bars-and-fills, motion-blur-streak

## Frame 6 — Le dernier kilomètre (42.0 – 53.6)
status: built · src: compositions/s6-lastmile.html + world/town.js
Survol des toits, compteur 1 000 m → 0 m. La maison héroïne s'ouvre en coupe : cheminée, sapin,
chat endormi (Zzz), lait et biscuits. Le cadeau descend le conduit, ressort du foyer dans un nuage de
suie, file sous le sapin. Tampons « SILENCIEUSE. » / « DISCRÈTE. », biscuits mangés, « Livré avant le réveil » 06:59 → 07:00.
rules: spring-pop-entrance, kinetic-beat-slam

## Frame 7 — La signature (53.6 – 64.0)
status: built · src: compositions/s7-signature.html + world/main.js
Grand dézoom à l'aube sur le village en diorama ; le traîneau traverse le ciel. Logo cube-cadeau
isométrique, « PÈRE NOËL » (lettres en rebond), « La magie, livrée à temps. », « Depuis toujours. »,
« Soyez sages. On s'occupe du reste. »
blueprint: logo-assemble-lockup · rules: zoom-out reveal

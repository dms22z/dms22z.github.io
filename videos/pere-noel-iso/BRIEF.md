---
workflow: general-video
flow: automation
storyboard: no
message: "Le Père Noël, c'est la plus grande opération logistique du monde — la magie, livrée à temps."
destination: portfolio
aspect: 1920x1080
language: fr
length: 60s
angle: brand-film
---

## Intent

Publicité motion design en 3D isométrique pour « le Père Noël » traité comme une entreprise de
logistique. Pièce de portfolio : doit impressionner (zooms, mouvements de caméra, illustrations,
animations riches) et donner envie à des entreprises de commander du motion design.

## Customizations

- Style 3D isométrique (vraie scène Three.js, caméra orthographique iso), un monde continu que la caméra parcourt.
- Montrer le système de distribution : QG Pôle Nord, chaîne de production des lutins, chargement du traîneau,
  itinéraire autour du globe, passage au-dessus des maisons, livraison par la cheminée.
- Voix off FR sur le script validé (7 temps, ~115 mots). Voix provisoire générée localement (Kokoro, ff_siwis) ;
  l'utilisateur pourra la remplacer par sa voix Google.

## Notes

- Visuels uniquement HyperFrames (HTML/CSS/Three.js/GSAP) — aucune génération d'image ou de vidéo par IA.
- Pas d'accès CDN dans l'environnement : Three.js et GSAP sont vendorés localement.

# Motion Studio

Un logiciel de motion design assisté par IA. Vous décrivez votre vidéo en français, Claude propose un storyboard que vous validez, puis vous ajustez tout dans un éditeur visuel et exportez un MP4 en 1080p. L'animation et le rendu sont faits par [Remotion](https://www.remotion.dev).

- **Création par prompt** : description → storyboard (scènes, textes, couleurs, transitions) → vous validez → éditeur.
- **Éditeur visuel** : aperçu avec lecture, pause et navigation ; timeline avec glisser-déposer ; textes, couleurs, polices, durées, transitions ; annuler/rétablir ; enregistrement automatique.
- **Retouches par l'IA** : « rends le titre plus dynamique », « ajoute une transition fluide »… On peut aussi régénérer une seule scène.
- **9 types de scènes** : titre animé, typographie cinétique, liste explicative, animation de logo, produit, graphique animé, chiffre clé, image/vidéo, appel à l'action.
- **6 modèles prêts à l'emploi** : publicité premium, typographie cinétique (vertical), vidéo explicative, animation de logo, présentation produit (vertical), graphiques animés.
- **Audio** : musique avec fondus, tempo (BPM saisi ou tapé au clavier), pulsation des éléments au rythme, calage des scènes sur les mesures, voix off importée, sous-titres (générés depuis les scènes, importés depuis un .srt, ou saisis à la main).
- **Médias** : import d'images, de vidéos, de logos et de musiques, avec déclaration des droits d'utilisation. Avant l'export, l'application signale les médias dont les droits sont inconnus.
- **Export MP4** : 1920×1080, 1080×1920 ou 1080×1080 ; 24 à 60 images/s ; H.264 + AAC ; barre de progression, annulation et messages d'erreur en français.
- **Code Remotion** : le code TSX de la vidéo peut être affiché et téléchargé.

---

## 1. Installation sous Windows

### Prérequis

| Élément | Détail |
|---|---|
| Windows 10 ou 11 (64 bits) | |
| **Node.js 20 ou 22 (LTS)** | À télécharger sur <https://nodejs.org> (bouton « LTS »). Lors de l'installation, gardez les options par défaut. |
| Espace disque | Environ 1,5 Go (dépendances + navigateur de rendu). |
| Internet | Nécessaire pour l'installation, pour le premier export (téléchargement automatique du navigateur de rendu, environ 100 Mo) et pour utiliser Claude. |

### Méthode simple (double-clic)

1. Copiez le dossier `motion-studio` sur votre ordinateur, par exemple dans `C:\Users\VotreNom\motion-studio`. Évitez OneDrive : la synchronisation ralentit l'installation.
2. Double-cliquez sur **`installer.bat`**. Comptez quelques minutes.
3. Double-cliquez sur **`demarrer.bat`**. Le navigateur s'ouvre sur <http://127.0.0.1:5173>.
4. Laissez la fenêtre noire ouverte pendant l'utilisation. Pour quitter, fermez-la.

### Méthode manuelle (invite de commandes)

Ouvrez **l'invite de commandes** (`cmd`) plutôt que PowerShell (voir Dépannage), puis :

```bat
cd C:\Users\VotreNom\motion-studio
npm ci
copy .env.example .env
npm start
```

Ouvrez ensuite <http://127.0.0.1:5173> si le navigateur ne s'ouvre pas tout seul.

| Commande | Rôle |
|---|---|
| `npm start` | Lance le serveur local (port 3210) et l'interface (port 5173). |
| `npm test` | Tests automatiques, dont le rendu réel de 3 vidéos (16:9, 9:16, 1:1). |
| `npm run verifier` | Vérification TypeScript de tout le projet. |
| `npm run studio-remotion` | (Facultatif) Ouvre Remotion Studio sur les compositions. |

---

## 2. Brancher Claude (facultatif mais recommandé)

### Abonnement Claude et API : ce n'est pas la même chose

Un abonnement Claude.ai (Pro, Max, Team) **ne donne pas accès à l'API**. Pour que l'application appelle Claude directement, il faut une **clé API Anthropic**. Elle est facturée à l'usage, séparément de l'abonnement.

1. Créez un compte sur <https://platform.claude.com>, ajoutez un moyen de paiement ou du crédit, puis créez une clé API.
2. Ouvrez le fichier `.env` (créé par `installer.bat`) avec le Bloc-notes et collez votre clé :
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Relancez `demarrer.bat`. En haut de l'accueil, le badge doit afficher « Claude connecté ».

**Sécurité de la clé** : elle reste dans `.env`, sur votre ordinateur, et seul le serveur local la lit. Elle n'est jamais envoyée au navigateur. Le fichier `.env` est exclu de Git.

### Coût indicatif

Le modèle par défaut est `claude-opus-5-5` : 4 $ par million de jetons en entrée, 20 $ par million en sortie (tarifs publics au moment de l'écriture, à vérifier sur la page de tarification d'Anthropic). Une génération de storyboard représente environ 6 000 à 9 000 jetons en entrée (instructions + schéma JSON, + le projet actuel pour une modification) et 2 000 à 8 000 en sortie, réflexion comprise. **Comptez de l'ordre de 0,05 à 0,20 $ par génération ou par modification**. Le tableau de bord de la console Anthropic indique le coût exact.

Pour réduire la facture, vous pouvez choisir un modèle moins cher dans `.env`, par exemple `ANTHROPIC_MODEL=claude-sonnet-5-5` (2 $ / 10 $ par million de jetons). La qualité des scénarios peut alors baisser légèrement.

Si un filtre de sécurité de Claude refuse une demande, l'API la relance automatiquement sur un modèle de repli (paramètre `fallbacks: "default"`).

### Sans clé API : trois solutions

1. **Mode démo** (automatique sans clé) : un générateur simple, à base de règles, choisit un modèle d'après les mots-clés et y insère votre sujet. Il comprend aussi quelques consignes simples (dynamique, calme, transitions, format, couleur, durée, sous-titres). Il ne remplace pas Claude, et l'interface l'indique clairement.
2. **Copier-coller avec Claude.ai** (avec un abonnement) : sur l'accueil, ouvrez « Pas de clé API ? ». L'application prépare un texte complet, avec les consignes et le schéma JSON. Collez-le dans Claude.ai, puis recollez la réponse dans l'application, qui la **valide** avant de l'accepter.
3. **Claude Code** : chaque projet est un fichier JSON dans `donnees/projets/`. Vous pouvez demander à Claude Code de le modifier, par exemple « Dans donnees/projets/mon-projet-xxx.json, ajoute une scène chiffre clé ». **Revenez d'abord à l'accueil de l'application** : l'éditeur ouvert enregistre automatiquement et écraserait la modification. Rouvrez ensuite le projet : il est revalidé au chargement. Le bouton « Importer un JSON » (onglet Projet) fonctionne aussi.

---

## 3. Guide d'utilisation

1. **Accueil** : décrivez la vidéo, puis choisissez le format, la durée visée et la musique. Cliquez sur **Générer le storyboard**. Vous pouvez aussi partir d'un des 6 modèles.
2. **Storyboard** : relisez les scènes (type, texte, durée, transition, intention) et regardez l'aperçu. Choisissez **Valider et ouvrir l'éditeur**, **Proposer une autre version** ou **Modifier la demande**.
3. **Éditeur**
   - **Centre** : aperçu. Raccourcis : Espace pour lecture/pause, boutons scène précédente/suivante.
   - **Timeline (en bas)** : cliquez sur une scène pour la sélectionner et vous y placer, glissez-la pour la déplacer, utilisez « Ajouter une scène ». Les icônes sur la scène sélectionnée servent à la dupliquer ou la supprimer. Cliquez sur la piste audio pour vous déplacer dans le temps. Les traits verts marquent les mesures de la musique.
   - **Droite** : propriétés de la scène (contenu, durée, énergie, transition, fond, couleurs, note), et bouton **Régénérer** (IA, avec une consigne facultative).
   - **Gauche** : onglets **IA** (consignes de modification), **Médias**, **Audio** et **Projet** (format, images/s, durée totale, polices, import/export JSON).
   - **Ctrl+Z / Ctrl+Y** : annuler / rétablir, y compris les modifications faites par l'IA.
4. **Exporter en MP4** : choisissez le format, la cadence et la qualité, puis lancez l'export. Le fichier se télécharge depuis la fenêtre et reste aussi dans `donnees\rendus\`. Le premier export est plus lent (préparation et téléchargement du navigateur de rendu). Ensuite, comptez environ 1 à 3 secondes de calcul par seconde de vidéo, selon la machine.

### Droits des médias

À l'import, vous devez déclarer l'origine du fichier : création personnelle, licence achetée, libre de droits vérifié, ou droits inconnus. La source et la licence peuvent être notées. Si un média aux droits inconnus est utilisé, l'export demande une confirmation explicite. La musique de démonstration est synthétisée par l'application et libre d'utilisation. **L'application ne vérifie pas les droits à votre place** : elle vous aide seulement à en garder la trace.

---

## 4. Architecture

```
motion-studio/
├── src/shared/        Schéma zod du projet (contrat central), calculs de temps,
│                      modèles, générateur de code, sous-titres
├── src/remotion/      Compositions Remotion : 9 scènes, transitions, audio,
│                      pulsation au rythme, sous-titres, polices locales
├── src/app/           Interface React + Mantine (accueil, storyboard, éditeur)
├── server/            Serveur Express local : projets, médias, IA, rendu MP4
├── scripts/           Tests automatiques
└── donnees/           (créé au lancement) projets, médias, rendus — non versionné
```

- **Même rendu partout** : l'aperçu (`@remotion/player`) et l'export (`@remotion/renderer`) utilisent exactement les mêmes composants.
- **L'IA ne produit pas de code exécuté** : Claude remplit une structure JSON contrainte par le schéma, grâce aux sorties structurées de l'API. Le serveur la revalide avec zod, retire les références à des médias inexistants, puis la donne aux composants. Le « Code Remotion » affiché est généré à partir de cette structure validée, de façon déterministe, et n'est jamais exécuté par l'application.
- **Serveur local uniquement** : il écoute sur `127.0.0.1` et n'est pas accessible depuis le réseau. Les fichiers importés sont renommés avec un identifiant aléatoire, filtrés par type et limités à 500 Mo.
- **Polices embarquées** (paquets `@fontsource`) : le rendu ne dépend pas d'Internet et donne le même résultat sur toutes les machines.

---

## 5. Licences et coûts

| Composant | Conditions |
|---|---|
| **Remotion** | Gratuit pour les particuliers, les entreprises de **3 salariés au plus**, les associations, et pour une phase d'évaluation, y compris pour un usage commercial des vidéos. Au-delà, une **licence entreprise** payante est obligatoire : voir <https://www.remotion.pro/license>. La licence interdit aussi de revendre un dérivé de Remotion lui-même. Texte complet dans `node_modules/remotion/LICENSE.md`. |
| **API Anthropic** | Payante à l'usage (voir plus haut). Non incluse dans un abonnement Claude.ai. |
| Polices (Inter, Montserrat, Poppins, Space Grotesk, Bebas Neue, Anton, Playfair Display, DM Serif Display) | SIL Open Font License 1.1 : usage commercial autorisé. |
| Mantine, React, Express, dnd-kit, zod, Vite | Licences libres (MIT). |
| Musique de démonstration | Générée par l'application : libre d'utilisation. |

---

## 6. Limites de cette version

Ces fonctions ne sont **pas** encore disponibles :

- **Voix de synthèse et transcription automatique** : elles demandent un service tiers payant (ElevenLabs, OpenAI…) ou un modèle local volumineux (Whisper). Aujourd'hui, on importe une voix off enregistrée et on crée les sous-titres depuis les scènes, depuis un `.srt` ou à la main.
- **Détection automatique du tempo** : le tempo se saisit ou se tape au clavier. Sans tempo, la pulsation suit l'énergie des basses du morceau.
- **Durée des scènes dans la timeline** : elle se règle dans le panneau de droite, pas en étirant les blocs.
- **Animations** : pas d'édition image par image (keyframes). Chaque scène suit un modèle d'animation paramétrable : énergie, style d'animation du titre, transition, mouvement de caméra.
- **Rendu** : un export à la fois. Les demandes suivantes attendent leur tour.
- **Formats d'export** : 1080p H.264 uniquement (pas de 4K, de GIF ni de fond transparent).
- **Windows** : l'application est écrite pour Windows (chemins, scripts `.bat`, binaires Remotion Windows présents dans `package-lock.json`). En revanche, les tests automatiques ont été exécutés sous Linux. Pensez à lancer `npm test` lors de la première installation sur votre PC.

---

## 7. Dépannage

| Problème | Solution |
|---|---|
| « L'exécution de scripts est désactivée sur ce système » (PowerShell) | Utilisez les fichiers `.bat` ou l'invite de commandes `cmd`. Sinon, dans PowerShell : `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. |
| « Le serveur local ne répond pas » | La fenêtre `demarrer.bat` a été fermée, ou le serveur a planté : relancez `demarrer.bat` et lisez les messages affichés. |
| Port 3210 ou 5173 déjà utilisé | Fermez l'autre instance de Motion Studio. Ou changez `PORT_SERVEUR` dans `.env` ; pour l'interface : `npx vite --port 5174`. |
| Le premier export échoue avec un message sur le navigateur | Le téléchargement automatique de Chrome Headless Shell a été bloqué (réseau d'entreprise, antivirus). Réessayez sur un autre réseau, ou indiquez un Chrome/Chromium déjà installé : `REMOTION_BROWSER_EXECUTABLE=C:\chemin\vers\chrome.exe` dans `.env`. |
| « Clé API Anthropic invalide » / « Crédit API insuffisant » | Vérifiez la clé dans `.env` et le crédit sur platform.claude.com, puis relancez. |
| Un média n'apparaît pas dans la vidéo | Vérifiez qu'il est toujours dans la médiathèque. Les formats acceptés sont PNG, JPG, WEBP, GIF, SVG, MP4, WEBM, MOV, MP3, WAV, OGG, AAC et M4A. |

Les projets, médias et vidéos se trouvent dans `motion-studio\donnees\`. Pour sauvegarder votre travail, il suffit de copier ce dossier.

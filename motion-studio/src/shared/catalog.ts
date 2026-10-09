/**
 * Libellés français, valeurs par défaut des scènes et modèles de départ.
 */
import type {
  Background,
  Energy,
  Project,
  Scene,
  SceneOf,
  SceneType,
  TextAnimation,
  VideoFormat,
} from "./schema";
import { newId } from "./schema";

export const SCENE_LABELS: Record<SceneType, { label: string; description: string }> = {
  title: { label: "Titre animé", description: "Grand titre et sous-titre" },
  kinetic: { label: "Typographie cinétique", description: "Mots qui s'enchaînent en rythme" },
  bullets: { label: "Liste explicative", description: "Titre et points clés" },
  logo: { label: "Animation de logo", description: "Révélation de logo et slogan" },
  product: { label: "Produit", description: "Visuel, nom, atouts et prix" },
  chart: { label: "Graphique animé", description: "Barres qui se remplissent" },
  stat: { label: "Chiffre clé", description: "Nombre qui défile jusqu'à sa valeur" },
  media: { label: "Image ou vidéo", description: "Média plein écran avec mouvement" },
  cta: { label: "Appel à l'action", description: "Message final et bouton" },
};

export const TRANSITION_LABELS = {
  none: "Coupe franche",
  fade: "Fondu",
  slide: "Glissement",
  wipe: "Balayage",
  flip: "Retournement",
  clock: "Horloge",
  iris: "Iris",
} as const;

export const DIRECTION_LABELS = { left: "Depuis la gauche", right: "Depuis la droite", top: "Depuis le haut", bottom: "Depuis le bas" } as const;
export const ENERGY_LABELS: Record<Energy, string> = { calm: "Calme", normal: "Normale", dynamic: "Dynamique" };
export const ANIMATION_LABELS: Record<TextAnimation, string> = {
  rise: "Montée masquée",
  zoom: "Zoom",
  typewriter: "Machine à écrire",
  words: "Mot par mot",
  letters: "Lettre par lettre",
  blur: "Apparition floue",
};
export const BACKGROUND_LABELS = { solid: "Uni", gradient: "Dégradé", radial: "Halo lumineux", grid: "Grille animée" } as const;
export const MOTION_LABELS = { "zoom-in": "Zoom avant", "zoom-out": "Zoom arrière", pan: "Panoramique" } as const;
export const FORMAT_LABELS: Record<VideoFormat, string> = {
  "16:9": "Horizontal 16:9 (YouTube)",
  "9:16": "Vertical 9:16 (TikTok, Reels, Shorts)",
  "1:1": "Carré 1:1 (Instagram)",
};
export const STYLE_LABELS = {
  premium: "Publicité premium",
  kinetic: "Typographie cinétique",
  explainer: "Vidéo explicative",
  logo: "Animation de logo",
  product: "Présentation produit",
  data: "Graphiques animés",
  social: "Réseaux sociaux",
} as const;

export type Palette = { bg1: string; bg2: string; text: string; accent: string; bgStyle: Background["style"] };

export const PALETTES: Record<string, Palette> = {
  noirOr: { bg1: "#0A0A0A", bg2: "#1C1A16", text: "#F5F1E8", accent: "#D4AF37", bgStyle: "radial" },
  blancVert: { bg1: "#FFFFFF", bg2: "#ECFDF3", text: "#0A0A0A", accent: "#16A34A", bgStyle: "gradient" },
  nuitVert: { bg1: "#050807", bg2: "#0F2A1C", text: "#FFFFFF", accent: "#22C55E", bgStyle: "grid" },
  electrique: { bg1: "#0B0B2B", bg2: "#3A0CA3", text: "#FFFFFF", accent: "#F72585", bgStyle: "gradient" },
  sable: { bg1: "#F4EFE6", bg2: "#E7DCC8", text: "#1F1B16", accent: "#C2410C", bgStyle: "solid" },
};

type Defaults = { palette: Palette; energy?: Energy };

function base(type: SceneType, d: Defaults, duration: number) {
  return {
    id: newId(),
    type,
    duration,
    transition: { type: "fade" as const, direction: "right" as const, duration: 0.6 },
    energy: d.energy ?? ("normal" as Energy),
    background: { style: d.palette.bgStyle, color1: d.palette.bg1, color2: d.palette.bg2 },
    textColor: d.palette.text,
    accentColor: d.palette.accent,
    notes: "",
  };
}

/** Crée une scène prête à l'emploi d'un type donné. */
export function createScene(type: SceneType, d: Defaults = { palette: PALETTES.nuitVert }): Scene {
  switch (type) {
    case "title":
      return { ...base(type, d, 3.5), type, title: "Votre titre ici", subtitle: "Un sous-titre qui donne envie", animation: "rise", align: "center" };
    case "kinetic":
      return { ...base(type, d, 3), type, words: ["Simple.", "Rapide.", "Efficace."] };
    case "bullets":
      return { ...base(type, d, 5), type, heading: "Comment ça marche ?", items: ["Première étape", "Deuxième étape", "Troisième étape"] };
    case "logo":
      return { ...base(type, d, 3.5), type, assetId: null, text: "MARQUE", tagline: "Votre slogan" };
    case "product":
      return { ...base(type, d, 5), type, assetId: null, name: "Nom du produit", features: ["Atout n°1", "Atout n°2", "Atout n°3"], price: "49 €" };
    case "chart":
      return {
        ...base(type, d, 5),
        type,
        heading: "Croissance annuelle",
        unit: "%",
        items: [
          { label: "2023", value: 24 },
          { label: "2024", value: 48 },
          { label: "2025", value: 76 },
        ],
      };
    case "stat":
      return { ...base(type, d, 3.5), type, value: 98, decimals: 0, prefix: "", suffix: " %", label: "de clients satisfaits" };
    case "media":
      return { ...base(type, d, 4), type, assetId: null, caption: "Votre légende", motion: "zoom-in" };
    case "cta":
      return { ...base(type, d, 3.5), type, title: "Prêt à commencer ?", buttonText: "Découvrir", url: "www.exemple.fr" };
  }
}

function scene<T extends SceneType>(type: T, d: Defaults, patch: Partial<SceneOf<T>>): Scene {
  return { ...(createScene(type, d) as SceneOf<T>), ...patch } as Scene;
}

export function emptyProject(format: VideoFormat = "16:9"): Project {
  return {
    version: 1,
    title: "Nouveau projet",
    format,
    fps: 30,
    style: "premium",
    theme: { font: "Inter", headingFont: "Montserrat" },
    music: null,
    voiceover: null,
    subtitles: { enabled: false, position: "bottom", items: [] },
    scenes: [createScene("title")],
  };
}

export const DEMO_MUSIC_ID = "musique-demo-120bpm.wav";

const demoMusic = { assetId: DEMO_MUSIC_ID, volume: 0.6, fadeIn: 0.5, fadeOut: 1.5, startAt: 0, bpm: 120, pulse: true };

export type Template = { id: string; name: string; description: string; build: () => Project };

export const TEMPLATES: Template[] = [
  {
    id: "pub-premium",
    name: "Publicité premium",
    description: "Noir et or, titres élégants, chiffre clé et appel à l'action. 16:9.",
    build: () => {
      const d = { palette: PALETTES.noirOr };
      return {
        ...emptyProject("16:9"),
        title: "Publicité premium",
        style: "premium",
        theme: { font: "Inter", headingFont: "Playfair Display" },
        music: demoMusic,
        scenes: [
          scene("title", d, { title: "L'excellence, réinventée", subtitle: "Collection Automne 2026", animation: "rise", duration: 4, transition: { type: "none", direction: "right", duration: 0.6 }, notes: "Ouverture lente et élégante" }),
          scene("kinetic", { ...d, energy: "dynamic" }, { words: ["Précision.", "Caractère.", "Élégance."], duration: 3, transition: { type: "wipe", direction: "left", duration: 0.6 }, notes: "Rythme : trois valeurs de la marque" }),
          scene("product", d, { name: "Montre Aurore", features: ["Boîtier titane", "Saphir inrayable", "Garantie 5 ans"], price: "890 €", transition: { type: "slide", direction: "right", duration: 0.7 }, notes: "Présentation du produit phare" }),
          scene("stat", d, { value: 12000, prefix: "", suffix: "", label: "clients conquis dans 30 pays", transition: { type: "fade", direction: "right", duration: 0.6 } }),
          scene("cta", d, { title: "Disponible dès maintenant", buttonText: "Réserver", url: "www.aurore.fr", transition: { type: "iris", direction: "right", duration: 0.8 } }),
        ],
      };
    },
  },
  {
    id: "kinetic-vertical",
    name: "Typographie cinétique",
    description: "Mots percutants au rythme de la musique. Vertical 9:16 pour TikTok, Reels, Shorts.",
    build: () => {
      const d = { palette: PALETTES.electrique, energy: "dynamic" as Energy };
      return {
        ...emptyProject("9:16"),
        title: "Typographie cinétique",
        style: "kinetic",
        theme: { font: "Inter", headingFont: "Anton" },
        music: demoMusic,
        scenes: [
          scene("kinetic", d, { words: ["Arrête", "de", "scroller."], duration: 2, transition: { type: "none", direction: "right", duration: 0.4 } }),
          scene("kinetic", { palette: PALETTES.nuitVert, energy: "dynamic" }, { words: ["Tu", "as", "une", "idée ?"], duration: 2, transition: { type: "slide", direction: "bottom", duration: 0.4 } }),
          scene("title", d, { title: "Transforme-la en vidéo", subtitle: "en quelques minutes", animation: "words", duration: 3, transition: { type: "flip", direction: "left", duration: 0.5 } }),
          scene("kinetic", { palette: PALETTES.blancVert, energy: "dynamic" }, { words: ["Sans", "coder.", "Sans", "stress."], duration: 2.5, transition: { type: "wipe", direction: "top", duration: 0.4 } }),
          scene("cta", d, { title: "Essaie maintenant", buttonText: "Lien en bio", url: "@moncompte", transition: { type: "iris", direction: "right", duration: 0.5 } }),
        ],
      };
    },
  },
  {
    id: "explicative",
    name: "Vidéo explicative",
    description: "Blanc et vert, étapes claires et graphique. 16:9 pour YouTube.",
    build: () => {
      const d = { palette: PALETTES.blancVert, energy: "normal" as Energy };
      return {
        ...emptyProject("16:9"),
        title: "Vidéo explicative",
        style: "explainer",
        theme: { font: "Inter", headingFont: "Space Grotesk" },
        music: { ...demoMusic, volume: 0.35, pulse: false },
        scenes: [
          scene("title", d, { title: "Comprendre le compostage", subtitle: "en 3 étapes simples", animation: "letters", transition: { type: "none", direction: "right", duration: 0.5 } }),
          scene("bullets", d, { heading: "Les 3 étapes", items: ["Trier les déchets organiques", "Équilibrer vert et brun", "Aérer chaque semaine"], duration: 6, transition: { type: "slide", direction: "right", duration: 0.6 } }),
          scene("chart", d, { heading: "Déchets évités par foyer (kg/an)", unit: " kg", items: [{ label: "Sans compost", value: 0 }, { label: "Compost partiel", value: 45 }, { label: "Compost complet", value: 90 }], duration: 5.5, transition: { type: "wipe", direction: "right", duration: 0.6 } }),
          scene("cta", d, { title: "À vous de jouer !", buttonText: "Télécharger le guide", url: "www.exemple.fr/compost", transition: { type: "fade", direction: "right", duration: 0.6 } }),
        ],
      };
    },
  },
  {
    id: "logo",
    name: "Animation de logo",
    description: "Révélation de logo courte et percutante. Carré 1:1. Importez votre logo ensuite.",
    build: () => {
      const d = { palette: PALETTES.nuitVert, energy: "dynamic" as Energy };
      return {
        ...emptyProject("1:1"),
        title: "Animation de logo",
        style: "logo",
        theme: { font: "Inter", headingFont: "Montserrat" },
        music: demoMusic,
        scenes: [
          scene("kinetic", d, { words: ["3", "2", "1"], duration: 1.5, transition: { type: "none", direction: "right", duration: 0.4 } }),
          scene("logo", d, { text: "VERDA", tagline: "L'énergie qui pousse", duration: 4, transition: { type: "iris", direction: "right", duration: 0.5 } }),
        ],
      };
    },
  },
  {
    id: "produit-vertical",
    name: "Présentation produit",
    description: "Lancement de produit avec atouts et prix. Vertical 9:16.",
    build: () => {
      const d = { palette: PALETTES.sable, energy: "normal" as Energy };
      return {
        ...emptyProject("9:16"),
        title: "Présentation produit",
        style: "product",
        theme: { font: "Poppins", headingFont: "DM Serif Display" },
        music: demoMusic,
        scenes: [
          scene("title", d, { title: "Nouveau", subtitle: "Le sac Ondine", animation: "zoom", duration: 2.5, transition: { type: "none", direction: "right", duration: 0.5 } }),
          scene("product", d, { name: "Sac Ondine", features: ["Cuir végétal", "Fabriqué en France", "Imperméable"], price: "129 €", duration: 5, transition: { type: "slide", direction: "bottom", duration: 0.6 } }),
          scene("stat", d, { value: 4.9, decimals: 1, suffix: " / 5", label: "note moyenne sur 2 000 avis", transition: { type: "fade", direction: "right", duration: 0.5 } }),
          scene("cta", d, { title: "Commandez aujourd'hui", buttonText: "Acheter", url: "ondine.fr", transition: { type: "wipe", direction: "bottom", duration: 0.5 } }),
        ],
      };
    },
  },
  {
    id: "graphiques",
    name: "Graphiques animés",
    description: "Chiffres et barres qui s'animent pour un bilan ou un rapport. 16:9.",
    build: () => {
      const d = { palette: PALETTES.nuitVert, energy: "normal" as Energy };
      return {
        ...emptyProject("16:9"),
        title: "Graphiques animés",
        style: "data",
        theme: { font: "Inter", headingFont: "Space Grotesk" },
        music: { ...demoMusic, volume: 0.4 },
        scenes: [
          scene("title", d, { title: "Bilan 2026", subtitle: "Les chiffres clés de l'année", animation: "blur", transition: { type: "none", direction: "right", duration: 0.5 } }),
          scene("chart", d, { heading: "Chiffre d'affaires (M€)", unit: " M€", items: [{ label: "T1", value: 1.2 }, { label: "T2", value: 1.8 }, { label: "T3", value: 2.4 }, { label: "T4", value: 3.1 }], duration: 6, transition: { type: "slide", direction: "right", duration: 0.6 } }),
          scene("stat", d, { value: 158, suffix: " %", prefix: "+", label: "de croissance sur un an", transition: { type: "clock", direction: "right", duration: 0.7 } }),
          scene("cta", d, { title: "Merci à toute l'équipe", buttonText: "Rapport complet", url: "intranet/bilan-2026", transition: { type: "fade", direction: "right", duration: 0.6 } }),
        ],
      };
    },
  },
];

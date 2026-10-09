/**
 * Schéma de données d'un projet vidéo.
 *
 * C'est le contrat central de l'application : l'IA produit un objet qui doit
 * respecter ce schéma, l'éditeur le modifie, et les compositions Remotion le
 * transforment en images. Aucun code généré par un modèle n'est exécuté :
 * l'IA ne fait que remplir des données, validées ici avec zod.
 */
import { z } from "zod";

export const FONTS = [
  "Inter",
  "Montserrat",
  "Poppins",
  "Space Grotesk",
  "Bebas Neue",
  "Anton",
  "Playfair Display",
  "DM Serif Display",
] as const;

export const FORMATS = ["16:9", "9:16", "1:1"] as const;
export const FPS_VALUES = [24, 25, 30, 50, 60] as const;

export const STYLES = [
  "premium",
  "kinetic",
  "explainer",
  "logo",
  "product",
  "data",
  "social",
] as const;

export const TRANSITIONS = ["none", "fade", "slide", "wipe", "flip", "clock", "iris"] as const;
export const DIRECTIONS = ["left", "right", "top", "bottom"] as const;
export const ENERGIES = ["calm", "normal", "dynamic"] as const;
export const TEXT_ANIMATIONS = ["rise", "zoom", "typewriter", "words", "letters", "blur"] as const;
export const BACKGROUND_STYLES = ["solid", "gradient", "radial", "grid"] as const;
export const MEDIA_MOTIONS = ["zoom-in", "zoom-out", "pan"] as const;

export const SCENE_TYPES = [
  "title",
  "kinetic",
  "bullets",
  "logo",
  "product",
  "chart",
  "stat",
  "media",
  "cta",
] as const;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur au format #RRGGBB attendue");

/** Identifiant d'un fichier de la médiathèque (nom de fichier sûr, ex. « a1b2c3.png »). */
export const assetIdSchema = z
  .string()
  .regex(/^[a-z0-9-]{1,64}\.[a-z0-9]{2,5}$/, "Identifiant de média invalide");

const shortText = (max: number) => z.string().max(max);

export const transitionSchema = z.object({
  type: z.enum(TRANSITIONS).describe("Transition qui fait ENTRER cette scène (ignorée pour la première scène)"),
  direction: z.enum(DIRECTIONS),
  duration: z.number().min(0.2).max(2).describe("Durée de la transition en secondes"),
});

export const backgroundSchema = z.object({
  style: z.enum(BACKGROUND_STYLES),
  color1: hex,
  color2: hex,
});

const sceneBase = {
  id: z.string().max(40),
  duration: z.number().min(1).max(30).describe("Durée de la scène en secondes"),
  transition: transitionSchema,
  energy: z.enum(ENERGIES).describe("Intensité des animations"),
  background: backgroundSchema,
  textColor: hex,
  accentColor: hex,
  notes: shortText(300).describe("Intention de la scène pour le storyboard (non affichée dans la vidéo)"),
};

export const titleSceneSchema = z.object({
  ...sceneBase,
  type: z.literal("title"),
  title: shortText(80),
  subtitle: shortText(140),
  animation: z.enum(TEXT_ANIMATIONS),
  align: z.enum(["center", "left"]),
});

export const kineticSceneSchema = z.object({
  ...sceneBase,
  type: z.literal("kinetic"),
  words: z.array(shortText(40)).min(1).max(12).describe("Mots ou courtes expressions affichés un par un"),
});

export const bulletsSceneSchema = z.object({
  ...sceneBase,
  type: z.literal("bullets"),
  heading: shortText(80),
  items: z.array(shortText(90)).min(1).max(6),
});

export const logoSceneSchema = z.object({
  ...sceneBase,
  type: z.literal("logo"),
  assetId: assetIdSchema.nullable().describe("Image du logo importée, ou null pour un logo texte"),
  text: shortText(40),
  tagline: shortText(100),
});

export const productSceneSchema = z.object({
  ...sceneBase,
  type: z.literal("product"),
  assetId: assetIdSchema.nullable(),
  name: shortText(60),
  features: z.array(shortText(70)).max(4),
  price: shortText(30),
});

export const chartSceneSchema = z.object({
  ...sceneBase,
  type: z.literal("chart"),
  heading: shortText(80),
  unit: shortText(12),
  items: z
    .array(z.object({ label: shortText(30), value: z.number().min(0).max(1_000_000_000) }))
    .min(2)
    .max(8),
});

export const statSceneSchema = z.object({
  ...sceneBase,
  type: z.literal("stat"),
  value: z.number().min(-1_000_000_000).max(1_000_000_000),
  decimals: z.number().int().min(0).max(2),
  prefix: shortText(8),
  suffix: shortText(12),
  label: shortText(100),
});

export const mediaSceneSchema = z.object({
  ...sceneBase,
  type: z.literal("media"),
  assetId: assetIdSchema.nullable().describe("Image ou vidéo importée"),
  caption: shortText(100),
  motion: z.enum(MEDIA_MOTIONS),
});

export const ctaSceneSchema = z.object({
  ...sceneBase,
  type: z.literal("cta"),
  title: shortText(80),
  buttonText: shortText(30),
  url: shortText(60),
});

export const sceneSchema = z.discriminatedUnion("type", [
  titleSceneSchema,
  kineticSceneSchema,
  bulletsSceneSchema,
  logoSceneSchema,
  productSceneSchema,
  chartSceneSchema,
  statSceneSchema,
  mediaSceneSchema,
  ctaSceneSchema,
]);

export const themeSchema = z.object({
  font: z.enum(FONTS).describe("Police des textes courants"),
  headingFont: z.enum(FONTS).describe("Police des titres"),
});

export const musicSchema = z.object({
  assetId: assetIdSchema,
  volume: z.number().min(0).max(1),
  fadeIn: z.number().min(0).max(10),
  fadeOut: z.number().min(0).max(10),
  startAt: z.number().min(0).max(3600).describe("Démarrer la musique à cette seconde du fichier"),
  bpm: z.number().min(40).max(220).nullable().describe("Tempo (battements par minute), si connu"),
  pulse: z.boolean().describe("Faire réagir les éléments graphiques au rythme"),
});

export const voiceoverSchema = z.object({
  assetId: assetIdSchema,
  volume: z.number().min(0).max(1),
  startAt: z.number().min(0).max(3600).describe("Moment de la vidéo où la voix commence (secondes)"),
});

export const subtitleItemSchema = z.object({
  start: z.number().min(0),
  end: z.number().min(0),
  text: shortText(160),
});

export const subtitlesSchema = z.object({
  enabled: z.boolean(),
  position: z.enum(["bottom", "center"]),
  items: z.array(subtitleItemSchema).max(300),
});

export const projectSchema = z.object({
  version: z.literal(1),
  title: shortText(100),
  format: z.enum(FORMATS),
  fps: z.union([z.literal(24), z.literal(25), z.literal(30), z.literal(50), z.literal(60)]),
  style: z.enum(STYLES),
  theme: themeSchema,
  music: musicSchema.nullable(),
  voiceover: voiceoverSchema.nullable(),
  subtitles: subtitlesSchema,
  scenes: z.array(sceneSchema).min(1).max(15),
});

export type Project = z.infer<typeof projectSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type SceneType = Scene["type"];
export type SceneOf<T extends SceneType> = Extract<Scene, { type: T }>;
export type Background = z.infer<typeof backgroundSchema>;
export type Transition = z.infer<typeof transitionSchema>;
export type Music = z.infer<typeof musicSchema>;
export type SubtitleItem = z.infer<typeof subtitleItemSchema>;
export type VideoFormat = (typeof FORMATS)[number];
export type Energy = (typeof ENERGIES)[number];
export type TextAnimation = (typeof TEXT_ANIMATIONS)[number];
export type FontName = (typeof FONTS)[number];

/** Propriétés passées à la composition Remotion (aperçu et rendu). */
export type CompositionProps = {
  project: Project;
  /** Adresse du serveur local qui sert les médias importés (ex. http://127.0.0.1:3210). */
  assetBaseUrl: string;
};

export const DIMENSIONS: Record<VideoFormat, { width: number; height: number }> = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
};

export const COMPOSITION_ID = "MotionStudio";

export function assetUrl(assetBaseUrl: string, assetId: string): string {
  return `${assetBaseUrl.replace(/\/$/, "")}/fichiers/medias/${encodeURIComponent(assetId)}`;
}

export function isVideoAsset(assetId: string): boolean {
  return /\.(mp4|webm|mov|m4v)$/i.test(assetId);
}

/**
 * Valide un projet et renvoie des messages d'erreur lisibles en français.
 * Corrige aussi les petites incohérences sans gravité (identifiants dupliqués,
 * sous-titres dont la fin précède le début).
 */
export function validateProject(input: unknown):
  | { ok: true; project: Project }
  | { ok: false; errors: string[] } {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.slice(0, 12).map((i) => `${i.path.join(".") || "(racine)"} : ${i.message}`),
    };
  }
  return { ok: true, project: normalizeProject(parsed.data) };
}

export function newId(prefix = "s"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeProject(project: Project): Project {
  const seen = new Set<string>();
  const scenes = project.scenes.map((scene) => {
    let id = scene.id.trim();
    if (!id || seen.has(id)) id = newId();
    seen.add(id);
    return { ...scene, id };
  });
  const items = project.subtitles.items
    .filter((s) => s.text.trim() !== "")
    .map((s) => (s.end < s.start ? { ...s, end: s.start + 1 } : s))
    .sort((a, b) => a.start - b.start);
  return { ...project, scenes, subtitles: { ...project.subtitles, items } };
}

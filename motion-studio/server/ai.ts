/**
 * Assistant créatif.
 *
 * Principe de sécurité : Claude ne produit JAMAIS de code exécuté par
 * l'application. Il renvoie une structure JSON (scénario + scènes) contrainte
 * par le schéma zod du projet (sortie structurée de l'API), puis validée à
 * nouveau ici. Le rendu est fait par nos propres composants Remotion.
 *
 * Sans clé API, un « mode démo » à base de règles prend le relais : il est
 * volontairement simple et présenté comme tel dans l'interface.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { createScene, PALETTES, TEMPLATES, type Palette } from "../src/shared/catalog";
import {
  projectSchema,
  sceneSchema,
  validateProject,
  newId,
  type Project,
  type Scene,
  type VideoFormat,
} from "../src/shared/schema";
import { fitToDuration } from "../src/shared/timing";
import type { MediaItem } from "./media";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

export function aiMode(): "claude" | "demo" {
  return process.env.ANTHROPIC_API_KEY ? "claude" : "demo";
}

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

export type AiResult<T> = { summary: string; mode: "claude" | "demo"; data: T };

export class AiError extends Error {}

const projectResponse = z.object({
  summary: z.string().describe("Explication courte, en français, de ce qui a été créé ou modifié"),
  project: projectSchema,
});
const sceneResponse = z.object({
  summary: z.string().describe("Explication courte, en français, de la nouvelle version de la scène"),
  scene: sceneSchema,
});

export const SYSTEM_PROMPT = `Tu es le directeur artistique et motion designer de « Motion Studio », un logiciel qui produit des vidéos avec Remotion.
Tu ne génères pas de code : tu remplis une structure JSON (scénario découpé en scènes) que l'application anime avec ses propres modèles de scènes.

Types de scènes disponibles :
- title : grand titre animé + sous-titre (animation : rise = montée masquée, zoom, typewriter = machine à écrire, words = mot par mot, letters = lettre par lettre, blur = apparition floue).
- kinetic : typographie cinétique, 1 à 12 mots ou expressions très courtes affichés un par un, plein écran.
- bullets : titre + 1 à 6 points clés numérotés (vidéos explicatives).
- logo : révélation de logo (image importée via assetId, sinon logo texte) + slogan.
- product : présentation produit (visuel, nom, jusqu'à 4 atouts, prix).
- chart : graphique en barres animé (2 à 8 valeurs, unité).
- stat : chiffre clé qui défile jusqu'à sa valeur.
- media : image ou vidéo importée plein écran avec mouvement de caméra et légende.
- cta : appel à l'action final (titre, bouton, adresse).

Règles de qualité :
- Écris tous les textes visibles en français (sauf demande contraire), courts et percutants : un titre fait rarement plus de 6 mots.
- Rythme : 2 à 6 secondes par scène ; kinetic ≈ 0,6 s par mot ; durée totale proche de celle demandée.
- Varie les types de scènes et les transitions, mais garde une identité visuelle cohérente (2 ou 3 couleurs, contraste fort entre texte et fond).
- La transition d'une scène est celle qui la fait ENTRER ; mets "none" pour la première scène.
- Couleurs au format #RRGGBB. Polices disponibles : Inter, Montserrat, Poppins, Space Grotesk, Bebas Neue, Anton, Playfair Display, DM Serif Display.
- energy : calm (élégant, posé), normal, dynamic (rebonds, rythme rapide).
- Format : 9:16 pour TikTok/Reels/Shorts, 16:9 pour YouTube, 1:1 pour Instagram.
- Dans "notes", décris en une phrase l'intention de chaque scène (storyboard).
- N'utilise pour assetId que des identifiants présents dans la médiathèque fournie ; sinon null. Si aucune musique n'est fournie ou demandée, music = null.
- Ne laisse jamais de texte d'exemple ou de remplissage (« Lorem ipsum », « Votre titre ici »).
- version vaut toujours 1. Laisse subtitles.items vide sauf si on te le demande.`;

function mediaContext(media: MediaItem[]): string {
  if (media.length === 0) return "Médiathèque : vide.";
  return (
    "Médiathèque (assetId → description) :\n" +
    media.map((m) => `- ${m.id} : ${m.kind}, « ${m.originalName} »`).join("\n")
  );
}

/** Retire les références à des médias inexistants (le modèle ne doit utiliser que la médiathèque). */
function sanitizeAssets(project: Project, media: MediaItem[]): Project {
  const ids = new Set(media.map((m) => m.id));
  const audio = new Set(media.filter((m) => m.kind === "audio").map((m) => m.id));
  const visual = new Set(media.filter((m) => m.kind !== "audio").map((m) => m.id));
  return {
    ...project,
    music: project.music && audio.has(project.music.assetId) ? project.music : null,
    voiceover: project.voiceover && audio.has(project.voiceover.assetId) ? project.voiceover : null,
    scenes: project.scenes.map((s) =>
      "assetId" in s && s.assetId && (!ids.has(s.assetId) || !visual.has(s.assetId)) ? { ...s, assetId: null } : s,
    ),
  };
}

async function callClaude<T extends z.ZodType>(schema: T, userContent: string): Promise<z.infer<T>> {
  try {
    const response = await getClient().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // Si un filtre de sécurité refuse la demande, l'API la relance automatiquement sur un modèle de repli.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });
    if (response.stop_reason === "refusal") {
      throw new AiError("Claude a refusé cette demande. Reformulez votre description.");
    }
    if (response.stop_reason === "max_tokens") {
      throw new AiError("La réponse de Claude était trop longue et a été coupée. Demandez moins de scènes.");
    }
    if (!response.parsed_output) {
      throw new AiError("La réponse de Claude ne respecte pas la structure attendue. Réessayez.");
    }
    return response.parsed_output as z.infer<T>;
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new AiError("Clé API Anthropic invalide. Vérifiez ANTHROPIC_API_KEY dans le fichier .env.");
    if (e instanceof Anthropic.PermissionDeniedError) throw new AiError("Cette clé API n'a pas accès au modèle demandé.");
    if (e instanceof Anthropic.RateLimitError) throw new AiError("Limite de requêtes atteinte. Patientez une minute puis réessayez.");
    if (e instanceof Anthropic.BadRequestError) {
      if (/credit|billing/i.test(e.message)) throw new AiError("Crédit API insuffisant. Ajoutez du crédit sur platform.claude.com.");
      throw new AiError(`Requête refusée par l'API : ${e.message}`);
    }
    if (e instanceof Anthropic.APIConnectionError) throw new AiError("Impossible de joindre l'API Anthropic. Vérifiez votre connexion Internet.");
    if (e instanceof Anthropic.APIError) throw new AiError(`Erreur de l'API Anthropic (${e.status}) : ${e.message}`);
    if (e instanceof Error && /parse|JSON|zod|invalid/i.test(e.message)) {
      throw new AiError(`La structure renvoyée par Claude est invalide : ${e.message}`);
    }
    throw e;
  }
}

function finalizeProject(raw: Project, media: MediaItem[]): Project {
  const checked = validateProject(sanitizeAssets(raw, media));
  if (!checked.ok) throw new AiError(`Structure invalide : ${checked.errors.join(" ; ")}`);
  return checked.project;
}

// ---------------------------------------------------------------------------
// Génération complète
// ---------------------------------------------------------------------------

export type GenerateInput = {
  prompt: string;
  format: VideoFormat | "auto";
  targetSeconds: number | null;
  musicAssetId: string | null;
};

export async function generateProject(input: GenerateInput, media: MediaItem[]): Promise<AiResult<Project>> {
  if (aiMode() === "demo") return demoGenerate(input, media);
  const constraints = [
    input.format !== "auto" ? `Format imposé : ${input.format}.` : "Choisis le format le plus adapté.",
    input.targetSeconds ? `Durée totale visée : environ ${input.targetSeconds} secondes.` : "Durée totale : 15 à 30 secondes.",
    input.musicAssetId
      ? `Utilise la musique ${input.musicAssetId} (volume 0.6, fondus 0.5 s / 1.5 s, pulse true).`
      : "Pas de musique imposée.",
  ].join("\n");
  const out = await callClaude(
    projectResponse,
    `Crée le storyboard complet d'une vidéo de motion design.\n\nDemande de l'utilisateur :\n"""${input.prompt}"""\n\n${constraints}\n\n${mediaContext(media)}`,
  );
  let project = finalizeProject(out.project, media);
  if (input.format !== "auto") project = { ...project, format: input.format };
  return { summary: out.summary, mode: "claude", data: project };
}

// ---------------------------------------------------------------------------
// Modification par consigne
// ---------------------------------------------------------------------------

export async function editProject(project: Project, instruction: string, media: MediaItem[]): Promise<AiResult<Project>> {
  if (aiMode() === "demo") return demoEdit(project, instruction);
  const out = await callClaude(
    projectResponse,
    `Voici le projet actuel (JSON) :\n${JSON.stringify(project)}\n\nConsigne de modification :\n"""${instruction}"""\n\nApplique uniquement ce qui est demandé. Conserve les "id" des scènes existantes, ainsi que tout ce que la consigne ne concerne pas.\n\n${mediaContext(media)}`,
  );
  return { summary: out.summary, mode: "claude", data: finalizeProject(out.project, media) };
}

// ---------------------------------------------------------------------------
// Régénération d'une seule scène
// ---------------------------------------------------------------------------

export async function regenerateScene(
  project: Project,
  sceneId: string,
  instruction: string,
  media: MediaItem[],
): Promise<AiResult<Scene>> {
  const index = project.scenes.findIndex((s) => s.id === sceneId);
  if (index < 0) throw new AiError("Scène introuvable.");
  if (aiMode() === "demo") return demoRegenerate(project, index);
  const out = await callClaude(
    sceneResponse,
    `Voici le projet (JSON) :\n${JSON.stringify(project)}\n\nPropose une NOUVELLE version de la scène n°${index + 1} (id "${sceneId}"), différente de l'actuelle mais cohérente avec les scènes voisines et l'identité visuelle.${instruction ? `\nConsigne : """${instruction}"""` : ""}\nGarde le même id.\n\n${mediaContext(media)}`,
  );
  const replaced = finalizeProject({ ...project, scenes: project.scenes.map((s, i) => (i === index ? { ...out.scene, id: sceneId } : s)) }, media);
  return { summary: out.summary, mode: "claude", data: replaced.scenes[index] };
}

/** Texte à copier dans claude.ai quand on n'a pas de clé API (abonnement seul). */
export function manualPrompt(prompt: string, format: string): string {
  const schema = z.toJSONSchema(projectSchema);
  return `${SYSTEM_PROMPT}

Crée le storyboard complet d'une vidéo de motion design.
Demande : """${prompt}"""
Format : ${format === "auto" ? "au choix" : format}

Réponds UNIQUEMENT avec un objet JSON valide (sans texte autour, sans bloc de code) qui respecte ce schéma JSON :
${JSON.stringify(schema)}`;
}

// ---------------------------------------------------------------------------
// Mode démo (sans clé API) : règles simples, déterministes
// ---------------------------------------------------------------------------

const has = (text: string, ...words: string[]) => words.some((w) => text.includes(w));
const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function detectFormat(p: string): VideoFormat {
  if (has(p, "tiktok", "reel", "short", "vertical", "story", "9:16")) return "9:16";
  if (has(p, "carre", "1:1", "instagram post")) return "1:1";
  return "16:9";
}

function pickTemplate(p: string) {
  if (has(p, "logo")) return TEMPLATES.find((t) => t.id === "logo")!;
  if (has(p, "explic", "tutoriel", "etape", "comment ")) return TEMPLATES.find((t) => t.id === "explicative")!;
  if (has(p, "graphique", "chiffre", "statistique", "bilan", "donnees", "resultat")) return TEMPLATES.find((t) => t.id === "graphiques")!;
  if (has(p, "cinetique", "typo", "mots", "texte anime")) return TEMPLATES.find((t) => t.id === "kinetic-vertical")!;
  if (has(p, "produit", "lancement", "boutique", "vente")) return TEMPLATES.find((t) => t.id === "produit-vertical")!;
  return TEMPLATES.find((t) => t.id === "pub-premium")!;
}

/** Extrait un sujet lisible de la demande (ex. « une pub pour mon café Lumière » → « Café Lumière »). */
function extractSubject(prompt: string): string {
  const m = prompt.match(/(?:pour|sur|de|du|présentant|presentant)\s+(?:mon |ma |mes |notre |nos |la |le |les |l'|un |une )?([^,.;!?\n]{3,40})/i);
  const raw = (m ? m[1] : prompt.split(/[,.;!?\n]/)[0]).trim();
  const words = raw.split(/\s+/).slice(0, 5).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function demoGenerate(input: GenerateInput, media: MediaItem[]): AiResult<Project> {
  const p = norm(input.prompt);
  const template = pickTemplate(p);
  let project = template.build();
  const subject = extractSubject(input.prompt);
  project.title = subject;
  project.format = input.format === "auto" ? (has(p, "tiktok", "reel", "short", "vertical", "carre", "1:1", "youtube", "horizontal") ? detectFormat(p) : project.format) : input.format;
  // Personnalise les textes principaux avec le sujet détecté
  project.scenes = project.scenes.map((s, i) => {
    if (i === 0 && s.type === "title") return { ...s, title: subject };
    if (s.type === "logo") return { ...s, text: subject.split(" ")[0].toUpperCase().slice(0, 14) };
    if (s.type === "product") return { ...s, name: subject };
    if (s.type === "cta" && i === project.scenes.length - 1) return { ...s, title: `Découvrez ${subject}` };
    return s;
  });
  if (project.scenes[0].type !== "title" && project.scenes[0].type !== "logo") {
    const intro = createScene("title", { palette: paletteOf(project.scenes[0]) });
    if (intro.type === "title") project.scenes.splice(1, 0, { ...intro, title: subject, subtitle: "" });
  }
  if (input.musicAssetId) project.music = { ...(project.music ?? { volume: 0.6, fadeIn: 0.5, fadeOut: 1.5, startAt: 0, bpm: null, pulse: true }), assetId: input.musicAssetId };
  if (input.targetSeconds) project = fitToDuration(project, input.targetSeconds);
  project.scenes = project.scenes.map((s, i) => ({ ...s, notes: s.notes || `Scène ${i + 1} (modèle « ${template.name} »)` }));
  return {
    mode: "demo",
    summary: `Mode démo (sans IA) : j'ai choisi le modèle « ${template.name} » d'après les mots-clés de votre demande et inséré le sujet « ${subject} ». Ajoutez une clé API Anthropic pour un scénario réellement écrit par Claude.`,
    data: finalizeProject(project, media),
  };
}

function paletteOf(s: Scene): Palette {
  return { bg1: s.background.color1, bg2: s.background.color2, text: s.textColor, accent: s.accentColor, bgStyle: s.background.style };
}

const COLOR_WORDS: Record<string, string> = {
  vert: "#22C55E",
  bleu: "#3B82F6",
  rouge: "#EF4444",
  rose: "#EC4899",
  violet: "#8B5CF6",
  orange: "#F97316",
  jaune: "#FACC15",
  or: "#D4AF37",
  dore: "#D4AF37",
  turquoise: "#14B8A6",
};

function demoEdit(project: Project, instruction: string): AiResult<Project> {
  const p = norm(instruction);
  const changes: string[] = [];
  let next: Project = structuredClone(project);
  const titleOnly = has(p, "titre") && !has(p, "tout", "video", "scenes");
  const targets = (s: Scene) => (titleOnly ? s.type === "title" || s.type === "kinetic" : true);

  if (has(p, "dynamique", "energique", "rapide", "punchy", "rythme", "peche")) {
    next.scenes = next.scenes.map((s) =>
      targets(s)
        ? {
            ...s,
            energy: "dynamic",
            duration: titleOnly ? s.duration : Math.max(1, Math.round(s.duration * 0.85 * 10) / 10),
            ...(s.type === "title" ? { animation: s.animation === "words" ? "zoom" : "words" } : {}),
          }
        : s,
    );
    changes.push(titleOnly ? "titres plus dynamiques (rebonds, animation mot par mot)" : "animations plus dynamiques et rythme plus rapide");
  }
  if (has(p, "calme", "lent", "doux", "elegant", "pose", "sobre")) {
    next.scenes = next.scenes.map((s) =>
      targets(s) ? { ...s, energy: "calm", ...(s.type === "title" ? { animation: "rise" as const } : {}) } : s,
    );
    changes.push("animations plus calmes et élégantes");
  }
  if (has(p, "transition")) {
    const type = has(p, "gliss") ? "slide" : has(p, "balay") ? "wipe" : has(p, "iris", "cercle") ? "iris" : has(p, "retourn", "flip") ? "flip" : "fade";
    next.scenes = next.scenes.map((s, i) =>
      i === 0 ? s : { ...s, transition: { ...s.transition, type, duration: has(p, "fluide", "douce", "lente") ? 0.9 : s.transition.duration } },
    );
    changes.push(`transitions « ${type} »${has(p, "fluide", "douce", "lente") ? " plus longues et fluides" : ""}`);
  }
  if (has(p, "vertical", "tiktok", "reel", "short")) {
    next.format = "9:16";
    changes.push("format vertical 9:16");
  } else if (has(p, "horizontal", "youtube", "16:9")) {
    next.format = "16:9";
    changes.push("format horizontal 16:9");
  } else if (has(p, "carre", "1:1")) {
    next.format = "1:1";
    changes.push("format carré 1:1");
  }
  for (const [word, hex] of Object.entries(COLOR_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(p)) {
      next.scenes = next.scenes.map((s) => ({ ...s, accentColor: hex }));
      changes.push(`couleur d'accent ${word}`);
      break;
    }
  }
  if (has(p, "plus court", "raccourci")) {
    next.scenes = next.scenes.map((s) => ({ ...s, duration: Math.max(1, Math.round(s.duration * 0.75 * 10) / 10) }));
    changes.push("vidéo raccourcie de 25 %");
  } else if (has(p, "plus long", "allonge")) {
    next.scenes = next.scenes.map((s) => ({ ...s, duration: Math.min(30, Math.round(s.duration * 1.25 * 10) / 10) }));
    changes.push("vidéo allongée de 25 %");
  }
  if (has(p, "sous-titre", "sous titre")) {
    next = { ...next, subtitles: { ...next.subtitles, enabled: true } };
    changes.push("sous-titres activés (générez-les depuis l'onglet Audio si la liste est vide)");
  }
  if (changes.length === 0) {
    return {
      mode: "demo",
      summary:
        "Mode démo : consigne non reconnue. Sans clé API, seules ces consignes sont comprises : « plus dynamique », « plus calme », « transition fluide / glissement / balayage / iris », « format vertical / horizontal / carré », « couleur verte / bleue / rouge… », « plus court / plus long », « ajoute des sous-titres ».",
      data: project,
    };
  }
  return { mode: "demo", summary: `Mode démo : ${changes.join(", ")}.`, data: next };
}

const ANIMS = ["rise", "zoom", "words", "letters", "blur", "typewriter"] as const;
const BG = ["gradient", "radial", "grid", "solid"] as const;
const TRANS = ["fade", "slide", "wipe", "flip", "iris", "clock"] as const;

function demoRegenerate(project: Project, index: number): AiResult<Scene> {
  const s = project.scenes[index];
  const pick = <T,>(arr: readonly T[], current: T) => {
    const others = arr.filter((a) => a !== current);
    return others[Math.floor(Math.random() * others.length)];
  };
  const palettes = Object.values(PALETTES);
  const palette = palettes[Math.floor(Math.random() * palettes.length)];
  let scene: Scene = {
    ...s,
    background: { style: pick(BG, s.background.style), color1: palette.bg1, color2: palette.bg2 },
    textColor: palette.text,
    accentColor: palette.accent,
    transition: index === 0 ? s.transition : { ...s.transition, type: pick(TRANS, s.transition.type) },
    energy: pick(["calm", "normal", "dynamic"] as const, s.energy),
  };
  if (scene.type === "title") scene = { ...scene, animation: pick(ANIMS, scene.type === "title" && s.type === "title" ? s.animation : "rise") };
  return {
    mode: "demo",
    summary: "Mode démo : nouvelle variation visuelle (palette, fond, animation et transition tirés au hasard). Les textes sont conservés.",
    data: { ...scene, id: s.id || newId() },
  };
}

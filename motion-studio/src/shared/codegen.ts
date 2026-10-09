/**
 * Génère le code Remotion (TSX) correspondant à un projet.
 *
 * Le code est produit de façon déterministe à partir de la structure validée :
 * il n'est jamais écrit par le modèle d'IA, et l'application ne l'exécute pas
 * (l'aperçu et le rendu utilisent directement les mêmes composants).
 * Il sert à comprendre, réutiliser ou personnaliser la vidéo dans un projet
 * Remotion, en le plaçant dans src/remotion/generated/.
 */
import type { Project, Scene } from "./schema";
import { DIMENSIONS } from "./schema";
import { computeTimings } from "./timing";

const COMPONENT: Record<Scene["type"], { name: string; file: string }> = {
  title: { name: "TitleScene", file: "TitleScene" },
  kinetic: { name: "KineticScene", file: "KineticScene" },
  bullets: { name: "BulletsScene", file: "BulletsScene" },
  logo: { name: "LogoScene", file: "LogoScene" },
  product: { name: "ProductScene", file: "ProductScene" },
  chart: { name: "ChartScene", file: "ChartScene" },
  stat: { name: "StatScene", file: "StatScene" },
  media: { name: "MediaScene", file: "MediaScene" },
  cta: { name: "CtaScene", file: "CtaScene" },
};

const PRESENTATION: Record<string, { fn: string; module: string }> = {
  fade: { fn: "fade", module: "fade" },
  slide: { fn: "slide", module: "slide" },
  wipe: { fn: "wipe", module: "wipe" },
  flip: { fn: "flip", module: "flip" },
  clock: { fn: "clockWipe", module: "clock-wipe" },
  iris: { fn: "iris", module: "iris" },
};

const DIR = { left: "from-left", right: "from-right", top: "from-top", bottom: "from-bottom" } as const;

export function componentName(title: string): string {
  const base = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
  return /^[A-Z]/.test(base) ? base : `Video${base}`;
}

function indent(text: string, spaces: number) {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((l, i) => (i === 0 ? l : pad + l))
    .join("\n");
}

export function generateRemotionCode(project: Project): string {
  const name = componentName(project.title);
  const { width, height } = DIMENSIONS[project.format];
  const timings = computeTimings(project);
  const usedScenes = [...new Set(project.scenes.map((s) => s.type))];
  const usedTransitions = [
    ...new Set(timings.filter((t) => t.transitionInFrames > 0).map((t) => t.scene.transition.type)),
  ];
  const total = timings.length ? timings[timings.length - 1].from + timings[timings.length - 1].durationInFrames : 1;

  const imports = [
    `import React from "react";`,
    `import { AbsoluteFill, Composition${project.music ? ", Html5Audio" : ""} } from "remotion";`,
    `import { linearTiming, TransitionSeries } from "@remotion/transitions";`,
    ...usedTransitions.map((t) => `import { ${PRESENTATION[t].fn} } from "@remotion/transitions/${PRESENTATION[t].module}";`),
    ...usedScenes.map((t) => `import { ${COMPONENT[t].name} } from "../scenes/${COMPONENT[t].file}";`),
    `import type { SceneContext } from "../components/SceneShell";`,
    `import "../fonts";`,
  ];

  const body: string[] = [];
  timings.forEach(({ scene, durationInFrames, transitionInFrames }) => {
    if (transitionInFrames > 0) {
      const t = scene.transition;
      const p = PRESENTATION[t.type];
      const args =
        t.type === "clock" || t.type === "iris"
          ? `{ width: ${width}, height: ${height} }`
          : t.type === "fade"
            ? ""
            : `{ direction: "${DIR[t.direction]}" }`;
      body.push(
        `<TransitionSeries.Transition presentation={${p.fn}(${args})} timing={linearTiming({ durationInFrames: ${transitionInFrames} })} />`,
      );
    }
    const c = COMPONENT[scene.type];
    body.push(
      `{/* ${scene.notes ? scene.notes.replace(/\*\//g, "") : scene.type} */}`,
      `<TransitionSeries.Sequence durationInFrames={${durationInFrames}}>`,
      `  <${c.name} ctx={ctx} scene={${indent(JSON.stringify(scene, null, 2), 2)}} />`,
      `</TransitionSeries.Sequence>`,
    );
  });

  const music = project.music
    ? `\n      <Html5Audio src={\`\${ASSETS}/fichiers/medias/${project.music.assetId}\`} volume={${project.music.volume}} loop />`
    : "";

  return `// Code Remotion généré par Motion Studio pour le projet « ${project.title.replace(/[\n\r]/g, " ")} ».
// Format ${project.format} — ${width}×${height} — ${project.fps} i/s — ${(total / project.fps).toFixed(1)} s.
// Placez ce fichier dans src/remotion/generated/ puis enregistrez la composition dans Root.tsx.
${imports.join("\n")}

// Adresse du serveur Motion Studio qui sert les médias importés.
const ASSETS = "http://127.0.0.1:3210";

const ctx: SceneContext = {
  headingFont: "${project.theme.headingFont}",
  bodyFont: "${project.theme.font}",
  assetBaseUrl: ASSETS,
};

export const ${name}: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      <TransitionSeries>
        ${body.map((l) => indent(l, 8)).join("\n        ")}
      </TransitionSeries>${music}
    </AbsoluteFill>
  );
};

export const ${name}Composition: React.FC = () => (
  <Composition id="${name}" component={${name}} width={${width}} height={${height}} fps={${project.fps}} durationInFrames={${total}} />
);
`;
}

import type { Project, SubtitleItem } from "./schema";
import { sceneHeadline } from "./headline";
import { computeTimings } from "./timing";

/** Lit un fichier de sous-titres .srt. */
export function parseSrt(text: string): SubtitleItem[] {
  const toSec = (t: string) => {
    const m = t.trim().match(/(\d+):(\d+):(\d+)[,.](\d+)/);
    return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000 : 0;
  };
  return text
    .replace(/\r/g, "")
    .split(/\n\n+/)
    .map((block) => {
      const lines = block.trim().split("\n");
      const timeLine = lines.findIndex((l) => l.includes("-->"));
      if (timeLine < 0) return null;
      const [a, b] = lines[timeLine].split("-->");
      return { start: toSec(a), end: toSec(b), text: lines.slice(timeLine + 1).join(" ").replace(/<[^>]+>/g, "").slice(0, 160) };
    })
    .filter((x): x is SubtitleItem => !!x && x.text.trim() !== "")
    .slice(0, 300);
}

/** Crée un sous-titre par scène à partir de son texte principal. */
export function subtitlesFromScenes(project: Project): SubtitleItem[] {
  return computeTimings(project)
    .filter((t) => t.scene.type !== "media" || t.scene.caption)
    .map((t) => ({
      start: Math.round(((t.from + t.transitionInFrames) / project.fps) * 100) / 100,
      end: Math.round(((t.from + t.durationInFrames) / project.fps) * 100) / 100,
      text: sceneHeadline(t.scene).slice(0, 160),
    }));
}


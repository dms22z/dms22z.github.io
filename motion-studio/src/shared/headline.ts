import type { Scene } from "./schema";

/** Texte principal d'une scène (timeline, storyboard, sous-titres). */
export function sceneHeadline(s: Scene): string {
  switch (s.type) {
    case "title":
      return s.title;
    case "kinetic":
      return s.words.join(" ");
    case "bullets":
    case "chart":
      return s.heading;
    case "logo":
      return s.text;
    case "product":
      return s.name;
    case "stat":
      return `${s.prefix}${s.value}${s.suffix} ${s.label}`;
    case "media":
      return s.caption || "Média";
    case "cta":
      return s.title;
  }
}

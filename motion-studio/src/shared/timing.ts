/**
 * Calculs de temps partagés par l'aperçu, la timeline et le rendu.
 * Une transition appartient à la scène qu'elle fait entrer et chevauche la
 * fin de la scène précédente : elle raccourcit donc la durée totale.
 */
import type { Project, Scene } from "./schema";

export const secondsToFrames = (seconds: number, fps: number) => Math.max(1, Math.round(seconds * fps));

export type SceneTiming = {
  scene: Scene;
  /** Image de début de la scène dans la vidéo finale. */
  from: number;
  durationInFrames: number;
  /** Durée (images) de la transition qui fait entrer cette scène (0 si aucune). */
  transitionInFrames: number;
};

export function transitionFrames(project: Project, index: number): number {
  if (index === 0) return 0;
  const scene = project.scenes[index];
  if (scene.transition.type === "none") return 0;
  const prev = project.scenes[index - 1];
  const wanted = secondsToFrames(scene.transition.duration, project.fps);
  const max = Math.floor(
    Math.min(secondsToFrames(prev.duration, project.fps), secondsToFrames(scene.duration, project.fps)) / 2,
  );
  return Math.max(0, Math.min(wanted, max));
}

export function computeTimings(project: Project): SceneTiming[] {
  const result: SceneTiming[] = [];
  let cursor = 0;
  project.scenes.forEach((scene, index) => {
    const durationInFrames = secondsToFrames(scene.duration, project.fps);
    const transitionInFrames = transitionFrames(project, index);
    const from = cursor - transitionInFrames;
    result.push({ scene, from, durationInFrames, transitionInFrames });
    cursor = from + durationInFrames;
  });
  return result;
}

export function totalFrames(project: Project): number {
  const timings = computeTimings(project);
  const last = timings[timings.length - 1];
  return Math.max(1, last ? last.from + last.durationInFrames : 1);
}

export function sceneIndexAtFrame(project: Project, frame: number): number {
  const timings = computeTimings(project);
  for (let i = timings.length - 1; i >= 0; i--) {
    if (frame >= timings[i].from) return i;
  }
  return 0;
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${m}:${rest.toFixed(1).padStart(4, "0")}`;
}

/**
 * Ajuste toutes les durées proportionnellement pour atteindre une durée totale cible.
 * Les transitions chevauchent les scènes : on vise « cible + chevauchements ».
 */
export function fitToDuration(project: Project, targetSeconds: number): Project {
  let result = project;
  for (let pass = 0; pass < 3; pass++) {
    const sum = result.scenes.reduce((a, s) => a + s.duration, 0);
    const overlaps = computeTimings(result).reduce((a, t) => a + t.transitionInFrames, 0) / result.fps;
    if (sum <= 0) return result;
    const ratio = (targetSeconds + overlaps) / sum;
    result = {
      ...result,
      scenes: result.scenes.map((s) => ({ ...s, duration: clamp(round2(s.duration * ratio), 1, 30) })),
    };
  }
  return result;
}

/**
 * Cale la durée de chaque scène sur un nombre entier de mesures (4 temps) du
 * tempo de la musique, pour que les changements de scène tombent sur le rythme.
 */
export function snapToBeat(project: Project, bpm: number, beatsPerUnit = 4): Project {
  const unit = (60 / bpm) * beatsPerUnit;
  return {
    ...project,
    scenes: project.scenes.map((s, i) => {
      const next = project.scenes[i + 1];
      // La transition suivante chevauche la fin de cette scène : on la compense
      // pour que le début visible de chaque scène reste aligné sur une mesure.
      const overlap = next && next.transition.type !== "none" ? next.transition.duration : 0;
      const units = Math.max(1, Math.round((s.duration - overlap) / unit));
      return { ...s, duration: clamp(round2(units * unit + overlap), 1, 30) };
    }),
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

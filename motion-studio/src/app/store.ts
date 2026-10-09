/**
 * État de l'éditeur : projet courant, historique (annuler / rétablir),
 * scène sélectionnée et position de lecture.
 */
import { create } from "zustand";
import type { PlayerRef } from "@remotion/player";
import type { Project, Scene } from "../shared/schema";
import { computeTimings } from "../shared/timing";
import type { MediaItem } from "./api";

const HISTORY_LIMIT = 100;

type EditorState = {
  projectId: string | null;
  project: Project | null;
  past: Project[];
  future: Project[];
  selectedSceneId: string | null;
  currentFrame: number;
  saveState: "saved" | "saving" | "dirty" | "error";
  media: MediaItem[];
  /** Regroupe les frappes successives sur un même champ en une seule étape d'historique. */
  lastEditKey: string | null;

  open: (id: string, project: Project) => void;
  close: () => void;
  update: (fn: (p: Project) => Project, editKey?: string) => void;
  updateScene: (id: string, patch: Partial<Scene>, editKey?: string) => void;
  undo: () => void;
  redo: () => void;
  select: (id: string | null) => void;
  setFrame: (frame: number) => void;
  setSaveState: (s: EditorState["saveState"]) => void;
  setMedia: (m: MediaItem[]) => void;
};

export const useEditor = create<EditorState>((set, get) => ({
  projectId: null,
  project: null,
  past: [],
  future: [],
  selectedSceneId: null,
  currentFrame: 0,
  saveState: "saved",
  media: [],
  lastEditKey: null,

  open: (id, project) =>
    set({ projectId: id, project, past: [], future: [], selectedSceneId: project.scenes[0]?.id ?? null, currentFrame: 0, saveState: "saved", lastEditKey: null }),
  close: () => set({ projectId: null, project: null, past: [], future: [], selectedSceneId: null }),

  update: (fn, editKey) => {
    const { project, past, lastEditKey } = get();
    if (!project) return;
    const next = fn(project);
    if (next === project) return;
    const merge = editKey !== undefined && editKey === lastEditKey;
    set({
      project: next,
      past: merge ? past : [...past, project].slice(-HISTORY_LIMIT),
      future: [],
      saveState: "dirty",
      lastEditKey: editKey ?? null,
    });
  },

  updateScene: (id, patch, editKey) =>
    get().update(
      (p) => ({ ...p, scenes: p.scenes.map((s) => (s.id === id ? ({ ...s, ...patch } as Scene) : s)) }),
      editKey ? `${id}:${editKey}` : undefined,
    ),

  undo: () => {
    const { project, past, future } = get();
    if (!project || past.length === 0) return;
    const prev = past[past.length - 1];
    set({ project: prev, past: past.slice(0, -1), future: [project, ...future], saveState: "dirty", lastEditKey: null, selectedSceneId: keepSelection(prev, get().selectedSceneId) });
  },
  redo: () => {
    const { project, past, future } = get();
    if (!project || future.length === 0) return;
    const next = future[0];
    set({ project: next, past: [...past, project], future: future.slice(1), saveState: "dirty", lastEditKey: null, selectedSceneId: keepSelection(next, get().selectedSceneId) });
  },
  select: (id) => set({ selectedSceneId: id, lastEditKey: null }),
  setFrame: (frame) => set({ currentFrame: frame }),
  setSaveState: (saveState) => set({ saveState }),
  setMedia: (media) => set({ media }),
}));

function keepSelection(p: Project, id: string | null) {
  return p.scenes.some((s) => s.id === id) ? id : (p.scenes[0]?.id ?? null);
}

/** Référence partagée vers le lecteur Remotion (aperçu). */
export const playerRef: { current: PlayerRef | null } = { current: null };

export function seekToScene(project: Project, sceneId: string) {
  const t = computeTimings(project).find((x) => x.scene.id === sceneId);
  if (!t || !playerRef.current) return;
  // On se place juste après la transition d'entrée pour voir la scène elle-même.
  playerRef.current.seekTo(Math.max(0, t.from + t.transitionInFrames));
}

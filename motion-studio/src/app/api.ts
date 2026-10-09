/** Accès au serveur local. Aucune clé API ne transite par le navigateur. */
import type { Project, Scene, VideoFormat } from "../shared/schema";

export type MediaItem = {
  id: string;
  originalName: string;
  kind: "image" | "video" | "audio";
  mime: string;
  size: number;
  rights: Rights;
  rightsNote: string;
  createdAt: string;
};
export type Rights = "own" | "licensed" | "royalty-free" | "generated" | "unknown";
export const RIGHTS_LABELS: Record<Rights, string> = {
  own: "Création personnelle",
  licensed: "Licence achetée / autorisation écrite",
  "royalty-free": "Libre de droits (licence vérifiée)",
  generated: "Généré par l'application",
  unknown: "Droits inconnus",
};

export type ProjectSummary = { id: string; title: string; format: string; scenes: number; updatedAt: string };
export type RenderJob = {
  id: string;
  projectTitle: string;
  status: "queued" | "bundling" | "rendering" | "done" | "error" | "cancelled";
  progress: number;
  stage: string;
  fileName: string | null;
  error: string | null;
  createdAt: string;
  width: number;
  height: number;
  fps: number;
};
export type AiResult<T> = { summary: string; mode: "claude" | "demo"; data: T };

export class ApiError extends Error {
  constructor(message: string, public details: string[] = []) {
    super(message);
  }
}

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body instanceof FormData || body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Le serveur local ne répond pas. Vérifiez que la fenêtre « Motion Studio » (npm start) est toujours ouverte.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Erreur ${res.status}`, data.details ?? []);
  return data as T;
}

export const api = {
  state: () => call<{ aiMode: "claude" | "demo"; model: string | null }>("GET", "/api/etat"),
  listProjects: () => call<ProjectSummary[]>("GET", "/api/projets"),
  getProject: (id: string) => call<{ id: string; project: Project }>("GET", `/api/projets/${id}`),
  createProject: (project: Project) => call<{ id: string; project: Project }>("POST", "/api/projets", { project }),
  saveProject: (id: string, project: Project) => call<{ ok: true }>("PUT", `/api/projets/${id}`, { project }),
  deleteProject: (id: string) => call<{ ok: true }>("DELETE", `/api/projets/${id}`),
  validate: (project: unknown) => call<{ project: Project }>("POST", "/api/valider", { project }),

  listMedia: () => call<MediaItem[]>("GET", "/api/medias"),
  uploadMedia: (file: File, rights: Rights, rightsNote: string) => {
    const form = new FormData();
    form.append("rights", rights);
    form.append("rightsNote", rightsNote);
    form.append("fichier", file);
    return call<MediaItem>("POST", "/api/medias", form);
  },
  updateMedia: (id: string, rights: Rights, rightsNote: string) => call<MediaItem>("PATCH", `/api/medias/${id}`, { rights, rightsNote }),
  deleteMedia: (id: string) => call<{ ok: true }>("DELETE", `/api/medias/${id}`),

  generate: (input: { prompt: string; format: VideoFormat | "auto"; targetSeconds: number | null; musicAssetId: string | null }) =>
    call<AiResult<Project>>("POST", "/api/ia/generer", input),
  edit: (project: Project, instruction: string) => call<AiResult<Project>>("POST", "/api/ia/modifier", { project, instruction }),
  regenerateScene: (project: Project, sceneId: string, instruction: string) =>
    call<AiResult<Scene>>("POST", "/api/ia/regenerer-scene", { project, sceneId, instruction }),
  manualPrompt: (prompt: string, format: VideoFormat | "auto") => call<{ text: string }>("POST", "/api/ia/prompt-manuel", { prompt, format }),

  startRender: (project: Project, quality: "standard" | "high") => call<RenderJob>("POST", "/api/rendus", { project, quality }),
  getRender: (id: string) => call<RenderJob>("GET", `/api/rendus/${id}`),
  listRenders: () => call<RenderJob[]>("GET", "/api/rendus"),
  cancelRender: (id: string) => call<{ ok: boolean }>("POST", `/api/rendus/${id}/annuler`),
};

export const mediaUrl = (id: string) => `/fichiers/medias/${encodeURIComponent(id)}`;
export const formatSize = (bytes: number) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`;

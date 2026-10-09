/**
 * Export MP4 avec @remotion/renderer.
 * - Le code des compositions est empaqueté une seule fois (bundle) puis réutilisé.
 * - Un rendu à la fois ; les demandes suivantes attendent leur tour.
 * - Progression, annulation et messages d'erreur en français.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { bundle } from "@remotion/bundler";
import { makeCancelSignal, renderMedia, selectComposition } from "@remotion/renderer";
import { COMPOSITION_ID, DIMENSIONS, type CompositionProps, type Project } from "../src/shared/schema";
import { RENDERS_DIR, ROOT } from "./paths";

export type RenderStatus = "queued" | "bundling" | "rendering" | "done" | "error" | "cancelled";

export type RenderJob = {
  id: string;
  projectTitle: string;
  status: RenderStatus;
  progress: number;
  stage: string;
  fileName: string | null;
  error: string | null;
  createdAt: string;
  width: number;
  height: number;
  fps: number;
};

export type RenderOptions = { quality: "standard" | "high" };

const jobs = new Map<string, RenderJob>();
const cancels = new Map<string, () => void>();
let queue: Promise<void> = Promise.resolve();
let bundlePromise: Promise<string> | null = null;

/** Chemin d'un navigateur déjà installé (facultatif). Sinon Remotion télécharge Chrome Headless Shell automatiquement. */
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;

let bundledAt = 0;

/** Date de dernière modification du code des compositions (pour reconstruire le bundle si besoin). */
function sourcesMtime(): number {
  let latest = 0;
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else latest = Math.max(latest, fs.statSync(full).mtimeMs);
    }
  };
  walk(path.join(ROOT, "src", "remotion"));
  walk(path.join(ROOT, "src", "shared"));
  return latest;
}

export function getBundle(onProgress?: (p: number) => void): Promise<string> {
  const mtime = sourcesMtime();
  if (bundlePromise && mtime > bundledAt) bundlePromise = null;
  if (!bundlePromise) {
    bundledAt = mtime;
    bundlePromise = bundle({
      entryPoint: path.join(ROOT, "src", "remotion", "index.ts"),
      onProgress: (p) => onProgress?.(p),
    }).catch((e) => {
      bundlePromise = null;
      throw e;
    });
  }
  return bundlePromise;
}

export function listJobs(): RenderJob[] {
  return [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getJob(id: string) {
  return jobs.get(id);
}

export function cancelJob(id: string): boolean {
  const job = jobs.get(id);
  if (!job) return false;
  if (job.status === "queued") {
    job.status = "cancelled";
    job.stage = "Annulé";
    return true;
  }
  const cancel = cancels.get(id);
  if (cancel) {
    cancel();
    return true;
  }
  return false;
}

function safeName(title: string) {
  return (
    title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "video"
  );
}

function frenchError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/cancel/i.test(msg)) return "Rendu annulé.";
  if (/ENOSPC|no space/i.test(msg)) return "Espace disque insuffisant pour écrire la vidéo.";
  if (/EBUSY|EPERM/i.test(msg)) return "Le fichier de sortie est ouvert dans un autre programme. Fermez-le puis relancez l'export.";
  if (/Could not find|download|browser|chrome/i.test(msg))
    return `Le navigateur de rendu n'a pas pu être lancé ou téléchargé (connexion Internet nécessaire au premier export). Détail : ${msg}`;
  if (/404|Failed to load|ERR_CONNECTION/i.test(msg))
    return `Un média du projet est introuvable (a-t-il été supprimé de la médiathèque ?). Détail : ${msg}`;
  if (/timeout|delayRender/i.test(msg))
    return `Le chargement d'un média a pris trop de temps. Vérifiez vos fichiers importés. Détail : ${msg}`;
  return `Erreur pendant le rendu : ${msg}`;
}

export function startRender(project: Project, assetBaseUrl: string, options: RenderOptions): RenderJob {
  const id = crypto.randomUUID().slice(0, 8);
  const dims = DIMENSIONS[project.format];
  const job: RenderJob = {
    id,
    projectTitle: project.title,
    status: "queued",
    progress: 0,
    stage: "En attente",
    fileName: null,
    error: null,
    createdAt: new Date().toISOString(),
    ...dims,
    fps: project.fps,
  };
  jobs.set(id, job);
  queue = queue.then(() => runJob(job, project, assetBaseUrl, options)).catch(() => undefined);
  return job;
}

async function runJob(job: RenderJob, project: Project, assetBaseUrl: string, options: RenderOptions) {
  if (job.status === "cancelled") return;
  const { cancelSignal, cancel } = makeCancelSignal();
  cancels.set(job.id, cancel);
  const fileName = `${safeName(project.title)}-${project.format.replace(":", "x")}-${job.id}.mp4`;
  const output = path.join(RENDERS_DIR, fileName);
  try {
    job.status = "bundling";
    job.stage = "Préparation du moteur vidéo";
    const serveUrl = await getBundle((p) => {
      job.progress = (p / 100) * 0.1;
    });
    const inputProps: CompositionProps = { project, assetBaseUrl };
    job.stage = "Ouverture du navigateur de rendu";
    const composition = await selectComposition({
      serveUrl,
      id: COMPOSITION_ID,
      inputProps,
      browserExecutable,
    });
    job.status = "rendering";
    job.stage = "Rendu des images";
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      audioCodec: "aac",
      pixelFormat: "yuv420p",
      crf: options.quality === "high" ? 16 : 20,
      outputLocation: output,
      inputProps,
      cancelSignal,
      browserExecutable,
      timeoutInMilliseconds: 60_000,
      onProgress: ({ progress, stitchStage }) => {
        job.progress = 0.1 + progress * 0.9;
        job.stage = stitchStage === "muxing" ? "Assemblage audio et vidéo" : "Rendu des images";
      },
    });
    job.status = "done";
    job.progress = 1;
    job.stage = "Terminé";
    job.fileName = fileName;
  } catch (e) {
    const cancelled = /cancel/i.test(e instanceof Error ? e.message : String(e));
    job.status = cancelled ? "cancelled" : "error";
    job.stage = cancelled ? "Annulé" : "Échec";
    job.error = cancelled ? null : frenchError(e);
    fs.rmSync(output, { force: true });
    if (!cancelled) console.error("[rendu]", e);
  } finally {
    cancels.delete(job.id);
  }
}

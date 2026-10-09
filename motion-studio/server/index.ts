/**
 * Serveur local de Motion Studio (écoute uniquement sur 127.0.0.1).
 * Il garde la clé API côté serveur, stocke projets et médias sur le disque
 * et lance les rendus MP4.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { z } from "zod";
import { FORMATS, validateProject, type Project } from "../src/shared/schema";
import { AiError, aiMode, editProject, generateProject, manualPrompt, MODEL, regenerateScene } from "./ai";
import { deleteMedia, ensureDemoMedia, getMedia, listMedia, MAX_UPLOAD_BYTES, registerUpload, RIGHTS, updateMediaRights, upload } from "./media";
import { ensureDirs, MEDIA_DIR, RENDERS_DIR } from "./paths";
import { deleteProject, listProjects, newProjectId, readProject, saveProject } from "./projects";
import { cancelJob, getBundle, getJob, listJobs, startRender } from "./render";

const PORT = Number(process.env.PORT_SERVEUR ?? 3210);
const HOST = "127.0.0.1";
const BASE_URL = `http://${HOST}:${PORT}`;

ensureDirs();
ensureDemoMedia();

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "5mb" }));

// Les médias sont lus par l'aperçu (via le proxy Vite) et par le navigateur de rendu Remotion (autre port) : CORS nécessaire.
app.use(
  "/fichiers/medias",
  (_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  },
  express.static(MEDIA_DIR, { index: false, dotfiles: "deny" }),
);
app.use("/fichiers/rendus", express.static(RENDERS_DIR, { index: false, dotfiles: "deny" }));

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown> | unknown) => (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res)).catch(next);

const bad = (res: Response, message: string, details?: string[]) => res.status(400).json({ error: message, details });

// --- État -------------------------------------------------------------------

app.get("/api/etat", (_req, res) => {
  res.json({ aiMode: aiMode(), model: aiMode() === "claude" ? MODEL : null, version: "0.1.0" });
});

// --- Projets ----------------------------------------------------------------

app.get("/api/projets", (_req, res) => res.json(listProjects()));

app.get("/api/projets/:id", (req, res) => {
  const r = readProject(String(req.params.id));
  if (!r.ok) return res.status(404).json({ error: "Projet illisible ou introuvable", details: r.errors });
  res.json({ id: req.params.id, project: r.project });
});

app.post("/api/projets", (req, res) => {
  const v = validateProject(req.body?.project);
  if (!v.ok) return bad(res, "Projet invalide", v.errors);
  const id = newProjectId(v.project.title);
  saveProject(id, v.project);
  res.json({ id, project: v.project });
});

app.put("/api/projets/:id", (req, res) => {
  const v = validateProject(req.body?.project);
  if (!v.ok) return bad(res, "Projet invalide", v.errors);
  saveProject(String(req.params.id), v.project);
  res.json({ ok: true });
});

app.delete("/api/projets/:id", (req, res) => {
  deleteProject(String(req.params.id));
  res.json({ ok: true });
});

/** Valide un JSON collé par l'utilisateur (workflow copier-coller avec claude.ai). */
app.post("/api/valider", (req, res) => {
  const v = validateProject(req.body?.project);
  if (!v.ok) return bad(res, "Le JSON ne respecte pas la structure attendue", v.errors);
  res.json({ project: v.project });
});

// --- Médiathèque ------------------------------------------------------------

app.get("/api/medias", (_req, res) => res.json(listMedia()));

app.post("/api/medias", (req, res, next) => {
  upload.single("fichier")(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return bad(res, `Fichier trop volumineux (maximum ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} Mo).`);
    }
    if (err) return bad(res, (err as Error).message);
    if (!req.file) return bad(res, "Aucun fichier reçu.");
    try {
      const item = registerUpload(req.file, String(req.body?.rights ?? "unknown"), String(req.body?.rightsNote ?? ""));
      res.json(item);
    } catch (e) {
      next(e);
    }
  });
});

app.patch("/api/medias/:id", (req, res) => {
  const body = z.object({ rights: z.enum(RIGHTS), rightsNote: z.string().max(500) }).safeParse(req.body);
  if (!body.success) return bad(res, "Informations de droits invalides");
  const item = updateMediaRights(String(req.params.id), body.data.rights, body.data.rightsNote);
  if (!item) return res.status(404).json({ error: "Média introuvable" });
  res.json(item);
});

app.delete("/api/medias/:id", (req, res) => {
  if (!deleteMedia(String(req.params.id))) return res.status(404).json({ error: "Média introuvable" });
  res.json({ ok: true });
});

// --- IA ---------------------------------------------------------------------

const generateBody = z.object({
  prompt: z.string().trim().min(5, "Décrivez la vidéo en quelques mots (5 caractères minimum).").max(4000),
  format: z.enum([...FORMATS, "auto"]),
  targetSeconds: z.number().min(3).max(180).nullable(),
  musicAssetId: z.string().nullable(),
});

app.post(
  "/api/ia/generer",
  wrap(async (req, res) => {
    const body = generateBody.safeParse(req.body);
    if (!body.success) return bad(res, body.error.issues[0].message);
    const media = listMedia();
    if (body.data.musicAssetId && !getMedia(body.data.musicAssetId)) return bad(res, "Musique introuvable dans la médiathèque.");
    res.json(await generateProject(body.data, media));
  }),
);

app.post(
  "/api/ia/modifier",
  wrap(async (req, res) => {
    const v = validateProject(req.body?.project);
    if (!v.ok) return bad(res, "Projet invalide", v.errors);
    const instruction = z.string().trim().min(3).max(2000).safeParse(req.body?.instruction);
    if (!instruction.success) return bad(res, "Écrivez une consigne de modification.");
    res.json(await editProject(v.project, instruction.data, listMedia()));
  }),
);

app.post(
  "/api/ia/regenerer-scene",
  wrap(async (req, res) => {
    const v = validateProject(req.body?.project);
    if (!v.ok) return bad(res, "Projet invalide", v.errors);
    const sceneId = String(req.body?.sceneId ?? "");
    const instruction = String(req.body?.instruction ?? "").slice(0, 1000);
    res.json(await regenerateScene(v.project, sceneId, instruction, listMedia()));
  }),
);

app.post("/api/ia/prompt-manuel", (req, res) => {
  const body = generateBody.pick({ prompt: true, format: true }).safeParse(req.body);
  if (!body.success) return bad(res, body.error.issues[0].message);
  res.json({ text: manualPrompt(body.data.prompt, body.data.format) });
});

// --- Rendu ------------------------------------------------------------------

app.post("/api/rendus", (req, res) => {
  const v = validateProject(req.body?.project);
  if (!v.ok) return bad(res, "Projet invalide", v.errors);
  const missing = collectAssets(v.project).filter((id) => !getMedia(id));
  if (missing.length) return bad(res, `Médias manquants dans la médiathèque : ${missing.join(", ")}`);
  const quality = req.body?.quality === "high" ? "high" : "standard";
  res.json(startRender(v.project, BASE_URL, { quality }));
});

app.get("/api/rendus", (_req, res) => res.json(listJobs()));
app.get("/api/rendus/:id", (req, res) => {
  const job = getJob(String(req.params.id));
  if (!job) return res.status(404).json({ error: "Rendu introuvable" });
  res.json(job);
});
app.post("/api/rendus/:id/annuler", (req, res) => res.json({ ok: cancelJob(String(req.params.id)) }));

/** Médias utilisés par un projet, pour vérifier leur présence et leurs droits. */
function collectAssets(project: Project): string[] {
  const ids = new Set<string>();
  if (project.music) ids.add(project.music.assetId);
  if (project.voiceover) ids.add(project.voiceover.assetId);
  for (const s of project.scenes) if ("assetId" in s && s.assetId) ids.add(s.assetId);
  return [...ids];
}

// --- Erreurs ----------------------------------------------------------------

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AiError) return res.status(502).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: `Erreur interne : ${(err as Error)?.message ?? err}` });
});

function startupError(e: NodeJS.ErrnoException): never {
  if (e.code === "EADDRINUSE") {
    console.error(`\n  [ERREUR] Le port ${PORT} est déjà utilisé : Motion Studio est sans doute déjà ouvert dans une autre fenêtre.`);
    console.error("  Fermez l'autre fenêtre, ou changez PORT_SERVEUR dans le fichier .env.\n");
  } else {
    console.error("  [ERREUR] Le serveur n'a pas pu démarrer :", e.message);
  }
  process.exit(1);
}

// Avec Express 5, ce rappel reçoit aussi les erreurs d'écoute (port occupé…).
app.listen(PORT, HOST, (err?: NodeJS.ErrnoException) => {
  if (err) startupError(err);
  console.log(`\n  Motion Studio — serveur prêt sur ${BASE_URL}`);
  console.log(`  Assistant IA : ${aiMode() === "claude" ? `Claude (${MODEL})` : "mode démo (aucune clé ANTHROPIC_API_KEY dans .env)"}`);
  console.log(`  Données : ${path.dirname(MEDIA_DIR)}\n`);
  // Prépare le moteur de rendu en arrière-plan pour accélérer le premier export.
  getBundle().then(
    () => console.log("  Moteur de rendu prêt."),
    (e) => console.error("  Impossible de préparer le moteur de rendu :", e),
  );
});

// Nettoyage des fichiers temporaires d'écriture laissés par une fermeture brutale.
for (const dir of [MEDIA_DIR]) {
  for (const f of fs.readdirSync(dir)) if (f.endsWith(".tmp")) fs.rmSync(path.join(dir, f), { force: true });
}

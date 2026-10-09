/**
 * Médiathèque : fichiers importés + fiche de droits d'utilisation.
 * Les fichiers sont renommés avec un identifiant aléatoire (pas de chemin
 * fourni par l'utilisateur sur le disque) et seuls certains types sont acceptés.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { z } from "zod";
import { DEMO_MUSIC_ID } from "../src/shared/catalog";
import { writeDemoMusic } from "./demoMusic";
import { MEDIA_DIR, writeJsonAtomic } from "./paths";

export const RIGHTS = ["own", "licensed", "royalty-free", "generated", "unknown"] as const;

export const mediaItemSchema = z.object({
  id: z.string(),
  originalName: z.string(),
  kind: z.enum(["image", "video", "audio"]),
  mime: z.string(),
  size: z.number(),
  rights: z.enum(RIGHTS),
  rightsNote: z.string().max(500),
  createdAt: z.string(),
});
export type MediaItem = z.infer<typeof mediaItemSchema>;

const ALLOWED: Record<string, { ext: string; kind: MediaItem["kind"] }> = {
  "image/png": { ext: "png", kind: "image" },
  "image/jpeg": { ext: "jpg", kind: "image" },
  "image/webp": { ext: "webp", kind: "image" },
  "image/gif": { ext: "gif", kind: "image" },
  "image/svg+xml": { ext: "svg", kind: "image" },
  "video/mp4": { ext: "mp4", kind: "video" },
  "video/webm": { ext: "webm", kind: "video" },
  "video/quicktime": { ext: "mov", kind: "video" },
  "audio/mpeg": { ext: "mp3", kind: "audio" },
  "audio/mp3": { ext: "mp3", kind: "audio" },
  "audio/wav": { ext: "wav", kind: "audio" },
  "audio/x-wav": { ext: "wav", kind: "audio" },
  "audio/wave": { ext: "wav", kind: "audio" },
  "audio/ogg": { ext: "ogg", kind: "audio" },
  "audio/aac": { ext: "aac", kind: "audio" },
  "audio/mp4": { ext: "m4a", kind: "audio" },
  "audio/x-m4a": { ext: "m4a", kind: "audio" },
};

export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

const indexFile = () => path.join(MEDIA_DIR, "index.json");

export function listMedia(): MediaItem[] {
  try {
    const raw = JSON.parse(fs.readFileSync(indexFile(), "utf8"));
    return z.array(mediaItemSchema).parse(raw).filter((m) => fs.existsSync(path.join(MEDIA_DIR, m.id)));
  } catch {
    return [];
  }
}

function saveIndex(items: MediaItem[]) {
  writeJsonAtomic(indexFile(), items);
}

export function getMedia(id: string): MediaItem | undefined {
  return listMedia().find((m) => m.id === id);
}

/** Ajoute la musique de démonstration à la médiathèque au premier lancement. */
export function ensureDemoMedia() {
  const file = path.join(MEDIA_DIR, DEMO_MUSIC_ID);
  if (!fs.existsSync(file)) writeDemoMusic(file);
  const items = listMedia();
  if (!items.some((m) => m.id === DEMO_MUSIC_ID)) {
    items.unshift({
      id: DEMO_MUSIC_ID,
      originalName: "Musique de démonstration (120 BPM).wav",
      kind: "audio",
      mime: "audio/wav",
      size: fs.statSync(file).size,
      rights: "generated",
      rightsNote: "Piste synthétisée par Motion Studio. Libre d'utilisation, y compris commerciale.",
      createdAt: new Date().toISOString(),
    });
    saveIndex(items);
  }
}

export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(MEDIA_DIR, { recursive: true });
      cb(null, MEDIA_DIR);
    },
    filename: (_req, file, cb) => {
      const info = ALLOWED[file.mimetype];
      cb(null, `${crypto.randomUUID().slice(0, 12)}.${info?.ext ?? "bin"}`);
    },
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED[file.mimetype]) cb(null, true);
    else cb(new Error(`Type de fichier non pris en charge (${file.mimetype}). Formats acceptés : PNG, JPG, WEBP, GIF, SVG, MP4, WEBM, MOV, MP3, WAV, OGG, AAC, M4A.`));
  },
});

export function registerUpload(file: Express.Multer.File, rights: string, rightsNote: string): MediaItem {
  const info = ALLOWED[file.mimetype];
  const item: MediaItem = mediaItemSchema.parse({
    id: file.filename,
    originalName: Buffer.from(file.originalname, "latin1").toString("utf8").slice(0, 200),
    kind: info.kind,
    mime: file.mimetype,
    size: file.size,
    rights: (RIGHTS as readonly string[]).includes(rights) ? rights : "unknown",
    rightsNote: (rightsNote ?? "").slice(0, 500),
    createdAt: new Date().toISOString(),
  });
  saveIndex([item, ...listMedia()]);
  return item;
}

export function updateMediaRights(id: string, rights: MediaItem["rights"], rightsNote: string): MediaItem | null {
  const items = listMedia();
  const item = items.find((m) => m.id === id);
  if (!item) return null;
  item.rights = rights;
  item.rightsNote = rightsNote.slice(0, 500);
  saveIndex(items);
  return item;
}

export function deleteMedia(id: string): boolean {
  const items = listMedia();
  const item = items.find((m) => m.id === id);
  if (!item) return false;
  fs.rmSync(path.join(MEDIA_DIR, item.id), { force: true });
  saveIndex(items.filter((m) => m.id !== id));
  return true;
}

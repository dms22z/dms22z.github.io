import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DATA_DIR = path.join(ROOT, "donnees");
export const PROJECTS_DIR = path.join(DATA_DIR, "projets");
export const MEDIA_DIR = path.join(DATA_DIR, "medias");
export const RENDERS_DIR = path.join(DATA_DIR, "rendus");
export const CACHE_DIR = path.join(DATA_DIR, "cache");

export function ensureDirs() {
  for (const dir of [DATA_DIR, PROJECTS_DIR, MEDIA_DIR, RENDERS_DIR, CACHE_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** Écriture atomique : évite un fichier JSON corrompu si l'application est fermée pendant l'enregistrement. */
export function writeJsonAtomic(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, file);
}

import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { validateProject, type Project } from "../src/shared/schema";
import { PROJECTS_DIR, writeJsonAtomic } from "./paths";

const idSchema = z.string().regex(/^[a-z0-9-]{3,64}$/);

export type ProjectSummary = { id: string; title: string; format: string; scenes: number; updatedAt: string };

const fileFor = (id: string) => path.join(PROJECTS_DIR, `${idSchema.parse(id)}.json`);

export function listProjects(): ProjectSummary[] {
  return fs
    .readdirSync(PROJECTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const id = f.replace(/\.json$/, "");
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(PROJECTS_DIR, f), "utf8"));
        return {
          id,
          title: String(raw.title ?? id),
          format: String(raw.format ?? "?"),
          scenes: Array.isArray(raw.scenes) ? raw.scenes.length : 0,
          updatedAt: fs.statSync(path.join(PROJECTS_DIR, f)).mtime.toISOString(),
        };
      } catch {
        return null;
      }
    })
    .filter((p): p is ProjectSummary => p !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function readProject(id: string): { ok: true; project: Project } | { ok: false; errors: string[] } {
  const file = fileFor(id);
  if (!fs.existsSync(file)) return { ok: false, errors: ["Projet introuvable"] };
  try {
    return validateProject(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch (e) {
    return { ok: false, errors: [`Fichier JSON illisible : ${(e as Error).message}`] };
  }
}

export function saveProject(id: string, project: Project) {
  writeJsonAtomic(fileFor(id), project);
}

export function newProjectId(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "projet";
  return `${slug}-${Date.now().toString(36)}`;
}

export function deleteProject(id: string) {
  fs.rmSync(fileFor(id), { force: true });
}

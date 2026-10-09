/**
 * Test de bout en bout du rendu : démarre un serveur temporaire, exporte
 * plusieurs modèles en MP4 (formats 16:9, 9:16, 1:1) et vérifie les fichiers.
 * Usage : npm test   (ou : npx tsx scripts/test-rendu.ts pub-premium)
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { TEMPLATES } from "../src/shared/catalog";
import { RENDERS_DIR, ROOT } from "../server/paths";

const PORT = 3299;
const BASE = `http://127.0.0.1:${PORT}`;
const only = process.argv.slice(2);
const templates = only.length ? TEMPLATES.filter((t) => only.includes(t.id)) : TEMPLATES.filter((t) => ["pub-premium", "kinetic-vertical", "logo"].includes(t.id));

const server = spawn(process.execPath, [path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"), "server/index.ts"], {
  cwd: ROOT,
  env: { ...process.env, PORT_SERVEUR: String(PORT) },
  stdio: ["ignore", "inherit", "inherit"],
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${BASE}/api/etat`)).ok) break;
    } catch {
      /* serveur pas encore prêt */
    }
    await sleep(500);
  }
  let failures = 0;
  for (const t of templates) {
    const project = t.build();
    const started = Date.now();
    const res = await fetch(`${BASE}/api/rendus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project, quality: "standard" }),
    });
    const job = await res.json();
    if (!res.ok) {
      console.error(`✗ ${t.name} : ${job.error}`);
      failures++;
      continue;
    }
    let state = job;
    while (!["done", "error", "cancelled"].includes(state.status)) {
      await sleep(1000);
      state = await (await fetch(`${BASE}/api/rendus/${job.id}`)).json();
    }
    if (state.status !== "done") {
      console.error(`✗ ${t.name} : ${state.error}`);
      failures++;
      continue;
    }
    const file = path.join(RENDERS_DIR, state.fileName);
    const size = fs.statSync(file).size;
    console.log(`✓ ${t.name} (${project.format}) → ${state.fileName} — ${(size / 1024 / 1024).toFixed(1)} Mo en ${((Date.now() - started) / 1000).toFixed(0)} s`);
  }
  return failures;
}

main()
  .then((failures) => {
    server.kill();
    process.exit(failures ? 1 : 0);
  })
  .catch((e) => {
    console.error(e);
    server.kill();
    process.exit(1);
  });

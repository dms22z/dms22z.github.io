/**
 * Tests rapides (sans navigateur ni rendu) : npm test les lance avant le test de rendu.
 * - Modèles et schéma, calculs de durée, synchronisation au tempo, sous-titres.
 * - Assistant en mode démo.
 * - Intégration Claude contre un faux serveur API local : vérifie la requête
 *   envoyée (modèle, sortie structurée, repli) et la validation de la réponse.
 * - Code Remotion généré : compilé par TypeScript.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { TEMPLATES } from "../src/shared/catalog";
import { generateRemotionCode, componentName } from "../src/shared/codegen";
import { validateProject, type Project } from "../src/shared/schema";
import { parseSrt, subtitlesFromScenes } from "../src/shared/subtitles";
import { computeTimings, fitToDuration, snapToBeat, totalFrames } from "../src/shared/timing";
import { ROOT } from "../server/paths";

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}\n  ${(e as Error).stack}`);
    process.exitCode = 1;
  }
}

const media = [
  { id: "musique-demo-120bpm.wav", originalName: "Musique", kind: "audio" as const, mime: "audio/wav", size: 1, rights: "generated" as const, rightsNote: "", createdAt: "" },
];

await test("tous les modèles respectent le schéma", () => {
  for (const t of TEMPLATES) {
    const r = validateProject(t.build());
    assert.ok(r.ok, `${t.name} : ${!r.ok && r.errors.join(", ")}`);
  }
});

await test("le schéma refuse les données invalides avec des messages lisibles", () => {
  const p = TEMPLATES[0].build() as unknown as Record<string, unknown>;
  const bad = { ...p, format: "4:3", scenes: [{ ...(p.scenes as object[])[0], textColor: "rouge" }] };
  const r = validateProject(bad);
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => e.includes("format")));
  assert.ok(r.errors.some((e) => e.includes("#RRGGBB")));
});

await test("identifiants de scènes dupliqués corrigés", () => {
  const p = TEMPLATES[0].build();
  p.scenes = p.scenes.map((s) => ({ ...s, id: "x" }));
  const r = validateProject(p);
  assert.ok(r.ok);
  assert.equal(new Set(r.project.scenes.map((s) => s.id)).size, p.scenes.length);
});

await test("durée totale = somme des scènes − transitions", () => {
  const p = TEMPLATES[0].build();
  const timings = computeTimings(p);
  const sum = p.scenes.reduce((a, s) => a + Math.round(s.duration * p.fps), 0);
  const overlaps = timings.reduce((a, t) => a + t.transitionInFrames, 0);
  assert.equal(totalFrames(p), sum - overlaps);
  assert.equal(timings[0].transitionInFrames, 0);
});

await test("ajustement à une durée cible", () => {
  const p = fitToDuration(TEMPLATES[2].build(), 30);
  assert.ok(Math.abs(totalFrames(p) / p.fps - 30) < 1.5);
});

await test("calage sur le tempo : chaque scène commence sur une mesure", () => {
  const p = snapToBeat(TEMPLATES[0].build(), 120);
  const bar = (60 / 120) * 4 * p.fps;
  for (const t of computeTimings(p)) {
    const start = t.from + t.transitionInFrames;
    const off = Math.abs(start - Math.round(start / bar) * bar);
    assert.ok(off <= 1 + t.transitionInFrames, `scène à l'image ${start}`);
  }
});

await test("sous-titres : lecture .srt et génération depuis les scènes", () => {
  const srt = "1\r\n00:00:01,000 --> 00:00:02,500\r\nBonjour <i>à tous</i>\r\n\r\n2\r\n00:00:03,000 --> 00:00:04,000\r\nDeuxième ligne\r\n";
  const items = parseSrt(srt);
  assert.deepEqual(items[0], { start: 1, end: 2.5, text: "Bonjour à tous" });
  assert.equal(items.length, 2);
  const p = TEMPLATES[0].build();
  const subs = subtitlesFromScenes(p);
  assert.equal(subs.length, p.scenes.length);
  assert.ok(subs.every((s) => s.end > s.start));
});

// --- Assistant : mode démo ---------------------------------------------------
delete process.env.ANTHROPIC_API_KEY;
const ai = await import("../server/ai");

await test("mode démo : génération, modification et régénération valides", async () => {
  assert.equal(ai.aiMode(), "demo");
  const g = await ai.generateProject({ prompt: "Une vidéo TikTok pour ma boulangerie Le Fournil", format: "auto", targetSeconds: 15, musicAssetId: "musique-demo-120bpm.wav" }, media);
  assert.ok(validateProject(g.data).ok);
  assert.equal(g.data.format, "9:16");
  assert.ok(Math.abs(totalFrames(g.data) / g.data.fps - 15) < 1);
  const e = await ai.editProject(g.data, "Rends le titre plus dynamique et ajoute une transition fluide", media);
  assert.ok(e.data.scenes.filter((s) => s.type === "title").every((s) => s.energy === "dynamic"));
  assert.ok(e.data.scenes.slice(1).every((s) => s.transition.type === "fade" && s.transition.duration === 0.9));
  const r = await ai.regenerateScene(g.data, g.data.scenes[1].id, "", media);
  assert.equal(r.data.id, g.data.scenes[1].id);
});

// --- Assistant : intégration Claude (faux serveur API) -----------------------
await test("Claude : requête conforme et réponse validée par le schéma", async () => {
  const expected = TEMPLATES[1].build();
  // Le faux modèle référence un média inexistant : il doit être retiré.
  const answer: Project = { ...expected, scenes: expected.scenes.map((s) => (s.type === "kinetic" ? s : s)) };
  answer.scenes.push({ ...(TEMPLATES[0].build().scenes[2] as Extract<Project["scenes"][number], { type: "product" }>), id: "p1", assetId: "inexistant.png" });
  const captured: { headers?: http.IncomingHttpHeaders; body?: Record<string, unknown> } = {};
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      captured.headers = req.headers;
      captured.body = JSON.parse(raw);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: "msg_test",
          type: "message",
          role: "assistant",
          model: "claude-opus-5-5",
          content: [{ type: "text", text: JSON.stringify({ summary: "Storyboard de test", project: answer }) }],
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 10, output_tokens: 10 },
        }),
      );
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  process.env.ANTHROPIC_API_KEY = "sk-ant-test";
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
  try {
    const g = await ai.generateProject({ prompt: "Typographie cinétique pour un lancement", format: "9:16", targetSeconds: null, musicAssetId: null }, media);
    assert.equal(g.mode, "claude");
    assert.equal(g.summary, "Storyboard de test");
    const product = g.data.scenes.find((s) => s.type === "product");
    assert.ok(product && "assetId" in product && product.assetId === null, "média inconnu retiré");
    assert.ok(captured.body && captured.headers, "requête reçue");
    const headers = captured.headers!;
    const body = captured.body!;
    assert.equal(body.model, "claude-opus-5-5");
    assert.equal(body.fallbacks, "default");
    assert.match(String(headers["anthropic-beta"]), /server-side-fallback-2026-07-01/);
    const oc = body.output_config as { effort: string; format: { type: string; schema: object } };
    assert.equal(oc.effort, "medium");
    assert.equal(oc.format.type, "json_schema");
    assert.ok(JSON.stringify(oc.format.schema).includes("kinetic"));
    assert.ok(!("thinking" in body) || (body.thinking as { type: string }).type === "adaptive");
  } finally {
    server.close();
    delete process.env.ANTHROPIC_API_KEY;
  }
});

// --- Code Remotion généré ----------------------------------------------------
await test("code Remotion généré : compile avec TypeScript", () => {
  const dir = path.join(ROOT, "src", "remotion", "generated");
  fs.mkdirSync(dir, { recursive: true });
  const files: string[] = [];
  for (const t of TEMPLATES) {
    const file = path.join(dir, `${componentName(t.name)}.tsx`);
    fs.writeFileSync(file, generateRemotionCode(t.build()));
    files.push(file);
  }
  try {
    const tsc = spawnSync(process.execPath, [path.join(ROOT, "node_modules", "typescript", "bin", "tsc"), "--noEmit", "-p", "tsconfig.json"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(tsc.status, 0, tsc.stdout + tsc.stderr);
  } finally {
    for (const f of files) fs.rmSync(f);
  }
});

console.log(`\n${passed} test(s) réussi(s).`);

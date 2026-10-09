import { useEffect, useState } from "react";
import { Alert, Badge, Button, Group, Stack, Text, Textarea, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconArrowBackUp, IconSparkles, IconWand } from "@tabler/icons-react";
import { api } from "../api";
import { useEditor } from "../store";

const SUGGESTIONS = [
  "Rends le titre plus dynamique",
  "Ajoute une transition fluide entre les scènes",
  "Rends la vidéo plus calme et élégante",
  "Passe en format vertical pour TikTok",
  "Utilise une couleur d'accent bleue",
  "Raccourcis la vidéo",
];

type HistoryItem = { instruction: string; summary: string };

export function AiPanel() {
  const project = useEditor((s) => s.project)!;
  const update = useEditor((s) => s.update);
  const undo = useEditor((s) => s.undo);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [mode, setMode] = useState<{ aiMode: "claude" | "demo"; model: string | null } | null>(null);

  useEffect(() => {
    api.state().then(setMode).catch(() => undefined);
  }, []);

  const run = async (text = instruction) => {
    if (text.trim().length < 3) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.edit(project, text);
      const changed = JSON.stringify(r.data) !== JSON.stringify(project);
      if (changed) update(() => r.data);
      setHistory((h) => [{ instruction: text, summary: r.summary }, ...h].slice(0, 10));
      setInstruction("");
      if (changed) notifications.show({ color: "vert", title: "Vidéo modifiée", message: "Ctrl+Z pour annuler cette modification." });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={5}>Modifier avec l'IA</Title>
        {mode ? (
          <Badge color={mode.aiMode === "claude" ? "vert" : "yellow"} variant="light" leftSection={<IconSparkles size={12} />}>
            {mode.aiMode === "claude" ? "Claude" : "Mode démo"}
          </Badge>
        ) : null}
      </Group>
      <Text size="sm" c="dimmed">
        Décrivez le changement souhaité en français. L'IA modifie la structure des scènes ; rien d'autre n'est exécuté.
      </Text>
      <Textarea
        aria-label="Consigne de modification"
        placeholder="Ex. : rends le titre plus dynamique"
        autosize
        minRows={3}
        maxLength={2000}
        value={instruction}
        onChange={(e) => setInstruction(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) run();
        }}
      />
      <Button color="vert" leftSection={<IconWand size={16} />} loading={busy} disabled={instruction.trim().length < 3} onClick={() => run()}>
        Appliquer la consigne
      </Button>
      <Group gap={6}>
        {SUGGESTIONS.map((s) => (
          <Button key={s} size="compact-xs" variant="default" disabled={busy} onClick={() => run(s)}>
            {s}
          </Button>
        ))}
      </Group>
      {mode?.aiMode === "demo" ? (
        <Alert color="yellow" variant="light" title="Mode démo">
          Sans clé API, seules des consignes simples sont comprises (dynamique, calme, transitions, format, couleur, durée, sous-titres).
        </Alert>
      ) : null}
      {error ? <Alert color="red" title="Problème">{error}</Alert> : null}
      {history.length ? (
        <Stack gap="xs">
          <Text size="sm" fw={600}>Historique</Text>
          {history.map((h, i) => (
            <div key={i} style={{ borderLeft: "3px solid #22C55E", paddingLeft: 10 }}>
              <Text size="sm" fw={600}>« {h.instruction} »</Text>
              <Text size="xs" c="dimmed">{h.summary}</Text>
            </div>
          ))}
          <Button size="xs" variant="default" leftSection={<IconArrowBackUp size={14} />} onClick={undo}>
            Annuler la dernière modification
          </Button>
        </Stack>
      ) : null}
    </Stack>
  );
}

import { Alert, Badge, Button, Card, Grid, Group, Stack, Text, Title } from "@mantine/core";
import { IconCheck, IconRefresh, IconPencil, IconSparkles } from "@tabler/icons-react";
import { FORMAT_LABELS, SCENE_LABELS, TRANSITION_LABELS } from "../../shared/catalog";
import type { Project } from "../../shared/schema";
import { sceneHeadline } from "../../shared/headline";
export { sceneHeadline };
import { totalFrames } from "../../shared/timing";
import { PreviewPlayer } from "./PreviewPlayer";

/** Étape de validation : l'utilisateur relit le scénario avant d'ouvrir l'éditeur. */
export function StoryboardReview({
  project,
  summary,
  mode,
  busy,
  onAccept,
  onRetry,
  onBack,
}: {
  project: Project;
  summary: string;
  mode: "claude" | "demo" | "manuel";
  busy: boolean;
  onAccept: () => void;
  onRetry?: () => void;
  onBack: () => void;
}) {
  const seconds = totalFrames(project) / project.fps;
  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text size="sm" c="dimmed" fw={600} tt="uppercase">Étape 2 sur 2 — Vérifiez le storyboard</Text>
          <Title order={2}>{project.title}</Title>
          <Group gap="xs" mt={6}>
            <Badge color="dark" variant="light">{FORMAT_LABELS[project.format]}</Badge>
            <Badge color="dark" variant="light">{seconds.toFixed(1)} s</Badge>
            <Badge color="dark" variant="light">{project.scenes.length} scènes</Badge>
            <Badge color={mode === "claude" ? "vert" : "gray"} variant="filled" leftSection={<IconSparkles size={12} />}>
              {mode === "claude" ? "Écrit par Claude" : mode === "demo" ? "Mode démo" : "Importé de Claude.ai"}
            </Badge>
          </Group>
        </div>
        <Group>
          <Button variant="default" leftSection={<IconPencil size={16} />} onClick={onBack} disabled={busy}>Modifier la demande</Button>
          {onRetry ? (
            <Button variant="default" leftSection={<IconRefresh size={16} />} onClick={onRetry} loading={busy}>Proposer une autre version</Button>
          ) : null}
          <Button color="vert" leftSection={<IconCheck size={16} />} onClick={onAccept} disabled={busy}>Valider et ouvrir l'éditeur</Button>
        </Group>
      </Group>
      <Alert color={mode === "demo" ? "yellow" : "gray"} variant="light">{summary}</Alert>
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Stack gap="sm">
            {project.scenes.map((s, i) => (
              <Card key={s.id} withBorder padding="sm" radius="md">
                <Group wrap="nowrap" align="flex-start">
                  <div style={{ width: 56, height: 56, borderRadius: 8, flex: "none", background: `linear-gradient(135deg, ${s.background.color1}, ${s.background.color2})`, display: "flex", alignItems: "center", justifyContent: "center", color: s.accentColor, fontWeight: 800, fontSize: 20 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Group gap={6}>
                      <Text fw={700}>{SCENE_LABELS[s.type].label}</Text>
                      <Text size="sm" c="dimmed">· {s.duration} s</Text>
                      {i > 0 ? <Text size="sm" c="dimmed">· entrée : {TRANSITION_LABELS[s.transition.type].toLowerCase()}</Text> : null}
                    </Group>
                    <Text size="sm" lineClamp={1}>« {sceneHeadline(s)} »</Text>
                    {s.notes ? <Text size="xs" c="dimmed" lineClamp={2}>{s.notes}</Text> : null}
                  </div>
                </Group>
              </Card>
            ))}
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Card withBorder padding="sm" style={{ position: "sticky", top: 16 }}>
            <Text size="sm" fw={600} mb="xs">Aperçu</Text>
            <PreviewPlayer project={project} maxHeight="60vh" initialFrame={Math.round(project.fps * 1.5)} />
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

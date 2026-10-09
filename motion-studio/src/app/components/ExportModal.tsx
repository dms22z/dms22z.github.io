import { useEffect, useRef, useState } from "react";
import { Alert, Anchor, Button, Checkbox, Group, List, Modal, Progress, SegmentedControl, Select, Stack, Text } from "@mantine/core";
import { IconDownload, IconPlayerStop } from "@tabler/icons-react";
import { FORMAT_LABELS } from "../../shared/catalog";
import { DIMENSIONS, type VideoFormat } from "../../shared/schema";
import { formatTime, totalFrames } from "../../shared/timing";
import { api, RIGHTS_LABELS, type RenderJob } from "../api";
import { useEditor } from "../store";

export function ExportModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const project = useEditor((s) => s.project)!;
  const update = useEditor((s) => s.update);
  const media = useEditor((s) => s.media);
  const [quality, setQuality] = useState<"standard" | "high">("standard");
  const [job, setJob] = useState<RenderJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rightsOk, setRightsOk] = useState(false);
  const poll = useRef<number | null>(null);

  const usedIds = new Set<string>([
    ...(project.music ? [project.music.assetId] : []),
    ...(project.voiceover ? [project.voiceover.assetId] : []),
    ...project.scenes.flatMap((s) => ("assetId" in s && s.assetId ? [s.assetId] : [])),
  ]);
  const used = media.filter((m) => usedIds.has(m.id));
  const risky = used.filter((m) => m.rights === "unknown");
  const missingMedia = project.scenes.filter((s) => s.type === "media" && !s.assetId).length;
  const running = job && ["queued", "bundling", "rendering"].includes(job.status);

  useEffect(() => () => {
    if (poll.current) window.clearInterval(poll.current);
  }, []);

  const start = async () => {
    setError(null);
    try {
      const j = await api.startRender(project, quality);
      setJob(j);
      if (poll.current) window.clearInterval(poll.current);
      poll.current = window.setInterval(async () => {
        try {
          const s = await api.getRender(j.id);
          setJob(s);
          if (!["queued", "bundling", "rendering"].includes(s.status) && poll.current) window.clearInterval(poll.current);
        } catch (e) {
          setError((e as Error).message);
          if (poll.current) window.clearInterval(poll.current);
        }
      }, 700);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const { width, height } = DIMENSIONS[project.format];
  const seconds = totalFrames(project) / project.fps;

  return (
    <Modal opened={opened} onClose={onClose} title={<Text fw={800}>Exporter en MP4</Text>} size="lg" closeOnClickOutside={!running}>
      <Stack gap="md">
        <div>
          <Text size="sm" fw={500} mb={4}>Format</Text>
          <SegmentedControl
            fullWidth
            disabled={!!running}
            value={project.format}
            onChange={(v) => update((p) => ({ ...p, format: v as VideoFormat }))}
            data={Object.entries(FORMAT_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </div>
        <Group grow>
          <Select
            label="Images par seconde"
            disabled={!!running}
            value={String(project.fps)}
            allowDeselect={false}
            onChange={(v) => v && update((p) => ({ ...p, fps: Number(v) as 24 | 25 | 30 | 50 | 60 }))}
            data={["24", "25", "30", "50", "60"].map((v) => ({ value: v, label: `${v} i/s` }))}
          />
          <Select
            label="Qualité"
            disabled={!!running}
            value={quality}
            allowDeselect={false}
            onChange={(v) => setQuality((v as "standard" | "high") ?? "standard")}
            data={[
              { value: "standard", label: "Standard (fichier léger)" },
              { value: "high", label: "Haute (fichier plus lourd)" },
            ]}
          />
        </Group>
        <Text size="sm" c="dimmed">
          {width}×{height} px (1080p) · H.264 + AAC · {formatTime(seconds)} · {totalFrames(project)} images. La durée se règle dans l'onglet Projet.
        </Text>

        {missingMedia ? <Alert color="yellow">{missingMedia} scène(s) « Image ou vidéo » sans média : un message d'aide apparaîtra à la place.</Alert> : null}

        {used.length ? (
          <div>
            <Text size="sm" fw={600}>Médias utilisés et droits déclarés</Text>
            <List size="sm" spacing={2}>
              {used.map((m) => (
                <List.Item key={m.id} c={m.rights === "unknown" ? "red" : undefined}>
                  {m.originalName} — {RIGHTS_LABELS[m.rights]}
                </List.Item>
              ))}
            </List>
          </div>
        ) : null}
        {risky.length ? (
          <Alert color="red" title="Droits non vérifiés">
            <Text size="sm" mb="xs">
              {risky.length} média(s) ont des droits inconnus. Une diffusion publique ou commerciale pourrait enfreindre le droit d'auteur.
            </Text>
            <Checkbox checked={rightsOk} onChange={(e) => setRightsOk(e.currentTarget.checked)} label="Je confirme avoir le droit d'utiliser ces fichiers pour cet usage." />
          </Alert>
        ) : null}

        {job ? (
          <Stack gap={4}>
            <Group justify="space-between">
              <Text size="sm" fw={600}>{job.stage}</Text>
              <Text size="sm" ff="monospace">{Math.round(job.progress * 100)} %</Text>
            </Group>
            <Progress value={job.progress * 100} color={job.status === "error" ? "red" : "vert"} animated={!!running} size="lg" />
            {job.status === "bundling" ? <Text size="xs" c="dimmed">Le premier export peut prendre une minute de plus (préparation, et téléchargement du navigateur de rendu si nécessaire).</Text> : null}
          </Stack>
        ) : null}

        {job?.status === "done" && job.fileName ? (
          <Alert color="vert" title="Vidéo prête !">
            <Stack gap={6}>
              <Anchor href={`/fichiers/rendus/${encodeURIComponent(job.fileName)}`} download={job.fileName} fw={700}>
                <Group gap={6}><IconDownload size={16} />Télécharger {job.fileName}</Group>
              </Anchor>
              <Text size="xs">Le fichier est aussi enregistré dans le dossier « motion-studio\donnees\rendus ».</Text>
            </Stack>
          </Alert>
        ) : null}
        {job?.status === "error" ? <Alert color="red" title="Le rendu a échoué">{job.error}</Alert> : null}
        {job?.status === "cancelled" ? <Alert color="gray">Rendu annulé.</Alert> : null}
        {error ? <Alert color="red" title="Problème">{error}</Alert> : null}

        <Group justify="flex-end">
          {running ? (
            <Button color="red" variant="light" leftSection={<IconPlayerStop size={16} />} onClick={() => job && api.cancelRender(job.id)}>
              Annuler le rendu
            </Button>
          ) : (
            <>
              <Button variant="default" onClick={onClose}>Fermer</Button>
              <Button color="vert" leftSection={<IconDownload size={16} />} disabled={risky.length > 0 && !rightsOk} onClick={start}>
                {job ? "Relancer l'export" : "Lancer l'export"}
              </Button>
            </>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}

import { useState } from "react";
import { Button, Divider, FileButton, Group, NumberInput, SegmentedControl, Select, Stack, Text, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconDownload, IconUpload } from "@tabler/icons-react";
import { FORMAT_LABELS } from "../../shared/catalog";
import { FONTS, type FontName, type VideoFormat } from "../../shared/schema";
import { fitToDuration, totalFrames } from "../../shared/timing";
import { api, ApiError } from "../api";
import { useEditor } from "../store";

export function ProjectPanel() {
  const project = useEditor((s) => s.project)!;
  const update = useEditor((s) => s.update);
  const seconds = totalFrames(project) / project.fps;
  const [target, setTarget] = useState<number | string>(Math.round(seconds));
  const fontData = FONTS.map((f) => ({ value: f, label: f }));

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${project.title.replace(/[^\w-]+/g, "_") || "projet"}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Stack gap="md">
      <Title order={5}>Format</Title>
      <SegmentedControl
        orientation="vertical"
        fullWidth
        value={project.format}
        onChange={(v) => update((p) => ({ ...p, format: v as VideoFormat }))}
        data={Object.entries(FORMAT_LABELS).map(([value, label]) => ({ value, label }))}
      />
      <Select
        label="Images par seconde"
        value={String(project.fps)}
        allowDeselect={false}
        onChange={(v) => v && update((p) => ({ ...p, fps: Number(v) as 24 | 25 | 30 | 50 | 60 }))}
        data={[
          { value: "24", label: "24 i/s (cinéma)" },
          { value: "25", label: "25 i/s (vidéo européenne)" },
          { value: "30", label: "30 i/s (réseaux sociaux, recommandé)" },
          { value: "50", label: "50 i/s (fluide)" },
          { value: "60", label: "60 i/s (très fluide, rendu plus long)" },
        ]}
      />

      <Divider label="Durée" labelPosition="left" />
      <Text size="sm">Durée actuelle : <b>{seconds.toFixed(1)} s</b> ({project.scenes.length} scènes, transitions déduites)</Text>
      <Group align="flex-end" grow>
        <NumberInput label="Durée totale souhaitée (s)" min={3} max={300} value={target} onChange={setTarget} />
        <Button variant="default" disabled={typeof target !== "number"} onClick={() => update((p) => fitToDuration(p, Number(target)))}>
          Ajuster
        </Button>
      </Group>
      <Text size="xs" c="dimmed">Les durées de toutes les scènes sont ajustées proportionnellement.</Text>

      <Divider label="Typographie" labelPosition="left" />
      <Select label="Police des titres" value={project.theme.headingFont} allowDeselect={false} onChange={(v) => v && update((p) => ({ ...p, theme: { ...p.theme, headingFont: v as FontName } }))} data={fontData} renderOption={({ option }) => <span style={{ fontFamily: `"${option.value}"`, fontSize: 16 }}>{option.label}</span>} />
      <Select label="Police des textes" value={project.theme.font} allowDeselect={false} onChange={(v) => v && update((p) => ({ ...p, theme: { ...p.theme, font: v as FontName } }))} data={fontData} renderOption={({ option }) => <span style={{ fontFamily: `"${option.value}"`, fontSize: 16 }}>{option.label}</span>} />

      <Divider label="Fichier du projet" labelPosition="left" />
      <Text size="xs" c="dimmed">
        Le projet est enregistré automatiquement dans le dossier « donnees/projets ». Vous pouvez aussi l'exporter, ou importer un JSON
        modifié ailleurs (par exemple par Claude Code) : il sera validé avant d'être appliqué.
      </Text>
      <Group grow>
        <Button variant="default" leftSection={<IconDownload size={16} />} onClick={exportJson}>Exporter le JSON</Button>
        <FileButton
          accept="application/json,.json"
          onChange={async (file) => {
            if (!file) return;
            try {
              const r = await api.validate(JSON.parse(await file.text()));
              update(() => r.project);
              notifications.show({ color: "vert", message: "Projet importé et validé (Ctrl+Z pour annuler)." });
            } catch (e) {
              const err = e as ApiError;
              notifications.show({ color: "red", title: "Import refusé", message: `${err.message}${err.details?.length ? ` : ${err.details.join(" ; ")}` : ""}` });
            }
          }}
        >
          {(props) => <Button {...props} variant="default" leftSection={<IconUpload size={16} />}>Importer un JSON</Button>}
        </FileButton>
      </Group>
    </Stack>
  );
}

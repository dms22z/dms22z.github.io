import { useRef, useState } from "react";
import { ActionIcon, Alert, Button, Divider, FileButton, Group, NumberInput, SegmentedControl, Select, Slider, Stack, Switch, Text, TextInput, Title, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconHandFinger, IconPlus, IconTrash, IconWaveSine } from "@tabler/icons-react";
import type { Music, SubtitleItem } from "../../shared/schema";
import { parseSrt, subtitlesFromScenes } from "../../shared/subtitles";
import { snapToBeat } from "../../shared/timing";
import { useEditor } from "../store";

const DEFAULT_MUSIC: Omit<Music, "assetId"> = { volume: 0.6, fadeIn: 0.5, fadeOut: 1.5, startAt: 0, bpm: null, pulse: true };

export function AudioPanel() {
  const project = useEditor((s) => s.project)!;
  const update = useEditor((s) => s.update);
  const media = useEditor((s) => s.media);
  const audio = media.filter((m) => m.kind === "audio");
  const taps = useRef<number[]>([]);
  const [tapBpm, setTapBpm] = useState<number | null>(null);
  const music = project.music;

  const setMusic = (patch: Partial<Music>, key?: string) => update((p) => ({ ...p, music: p.music ? { ...p.music, ...patch } : p.music }), key);

  const tap = () => {
    const now = performance.now();
    taps.current = [...taps.current.filter((t) => now - t < 3000), now].slice(-8);
    if (taps.current.length >= 3) {
      const intervals = taps.current.slice(1).map((t, i) => t - taps.current[i]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      setTapBpm(Math.round(60000 / avg));
    }
  };

  const subs = project.subtitles;
  const setSubs = (items: SubtitleItem[], key?: string) => update((p) => ({ ...p, subtitles: { ...p.subtitles, items } }), key);

  return (
    <Stack gap="md">
      <Title order={5}>Musique</Title>
      <Select
        label="Piste musicale"
        placeholder="Sans musique"
        clearable
        value={music?.assetId ?? null}
        onChange={(id) => update((p) => ({ ...p, music: id ? { ...(p.music ?? DEFAULT_MUSIC), assetId: id } : null }))}
        data={audio.map((m) => ({ value: m.id, label: m.originalName }))}
      />
      {music ? (
        <>
          <div>
            <Text size="sm" fw={500}>Volume</Text>
            <Slider color="vert" min={0} max={1} step={0.05} value={music.volume} onChange={(v) => setMusic({ volume: v }, "mvol")} label={(v) => `${Math.round(v * 100)} %`} />
          </div>
          <Group grow>
            <NumberInput label="Fondu d'entrée (s)" min={0} max={10} step={0.5} decimalScale={1} value={music.fadeIn} onChange={(v) => typeof v === "number" && setMusic({ fadeIn: v }, "fin")} />
            <NumberInput label="Fondu de sortie (s)" min={0} max={10} step={0.5} decimalScale={1} value={music.fadeOut} onChange={(v) => typeof v === "number" && setMusic({ fadeOut: v }, "fout")} />
          </Group>
          <NumberInput label="Commencer la musique à (s)" description="Pour sauter l'introduction du morceau" min={0} max={3600} step={0.5} decimalScale={2} value={music.startAt} onChange={(v) => typeof v === "number" && setMusic({ startAt: v }, "mstart")} />

          <Divider label="Synchronisation au rythme" labelPosition="left" />
          <Group align="flex-end" grow>
            <NumberInput label="Tempo (BPM)" placeholder="Inconnu" min={40} max={220} value={music.bpm ?? ""} onChange={(v) => setMusic({ bpm: typeof v === "number" ? Math.min(220, Math.max(40, v)) : null }, "bpm")} />
            <Tooltip label="Lancez la lecture puis tapez en rythme (au moins 4 fois)">
              <Button variant="default" leftSection={<IconHandFinger size={16} />} onClick={tap}>
                Taper le tempo{tapBpm ? ` : ${tapBpm}` : ""}
              </Button>
            </Tooltip>
          </Group>
          {tapBpm ? (
            <Button size="xs" variant="light" color="vert" onClick={() => setMusic({ bpm: tapBpm })}>Utiliser {tapBpm} BPM</Button>
          ) : null}
          <Switch
            color="vert"
            checked={music.pulse}
            onChange={(e) => setMusic({ pulse: e.currentTarget.checked })}
            label="Faire pulser les éléments au rythme"
            description={music.bpm ? "Pulsation calée exactement sur le tempo indiqué." : "Sans tempo : analyse des basses du fichier audio."}
          />
          <Button
            variant="default"
            leftSection={<IconWaveSine size={16} />}
            disabled={!music.bpm}
            onClick={() => {
              update((p) => snapToBeat(p, music.bpm!));
              notifications.show({ color: "vert", message: "Durées des scènes calées sur les mesures (4 temps) de la musique." });
            }}
          >
            Caler les changements de scène sur le rythme
          </Button>
        </>
      ) : null}

      <Divider />
      <Title order={5}>Voix off</Title>
      <Select
        label="Fichier de voix off"
        description="Enregistrez votre voix (ex. avec l'Enregistreur vocal de Windows) puis importez-la dans Médias."
        placeholder="Aucune"
        clearable
        value={project.voiceover?.assetId ?? null}
        onChange={(id) => update((p) => ({ ...p, voiceover: id ? { volume: p.voiceover?.volume ?? 1, startAt: p.voiceover?.startAt ?? 0, assetId: id } : null }))}
        data={audio.map((m) => ({ value: m.id, label: m.originalName }))}
      />
      {project.voiceover ? (
        <Group grow>
          <NumberInput label="Volume" min={0} max={1} step={0.1} decimalScale={2} value={project.voiceover.volume} onChange={(v) => typeof v === "number" && update((p) => ({ ...p, voiceover: p.voiceover && { ...p.voiceover, volume: v } }), "vvol")} />
          <NumberInput label="Début (s)" min={0} step={0.5} decimalScale={2} value={project.voiceover.startAt} onChange={(v) => typeof v === "number" && update((p) => ({ ...p, voiceover: p.voiceover && { ...p.voiceover, startAt: v } }), "vstart")} />
        </Group>
      ) : null}
      <Alert color="gray" variant="light">
        Voix de synthèse et transcription automatique ne sont pas incluses dans cette version : elles nécessitent un service tiers (payant) ou un modèle local volumineux.
      </Alert>

      <Divider />
      <Group justify="space-between">
        <Title order={5}>Sous-titres</Title>
        <Switch color="vert" checked={subs.enabled} onChange={(e) => update((p) => ({ ...p, subtitles: { ...p.subtitles, enabled: e.currentTarget.checked } }))} label="Afficher" />
      </Group>
      <SegmentedControl value={subs.position} onChange={(v) => update((p) => ({ ...p, subtitles: { ...p.subtitles, position: v as "bottom" | "center" } }))} data={[{ value: "bottom", label: "En bas" }, { value: "center", label: "Au centre" }]} />
      <Group grow>
        <Button
          variant="default"
          size="xs"
          onClick={() => {
            if (subs.items.length && !window.confirm("Remplacer les sous-titres existants ?")) return;
            update((p) => ({ ...p, subtitles: { ...p.subtitles, enabled: true, items: subtitlesFromScenes(p) } }));
          }}
        >
          Générer depuis les scènes
        </Button>
        <FileButton
          accept=".srt"
          onChange={async (file) => {
            if (!file) return;
            const items = parseSrt(await file.text());
            if (!items.length) {
              notifications.show({ color: "red", message: "Aucun sous-titre lisible dans ce fichier .srt." });
              return;
            }
            update((p) => ({ ...p, subtitles: { ...p.subtitles, enabled: true, items } }));
            notifications.show({ color: "vert", message: `${items.length} sous-titres importés.` });
          }}
        >
          {(props) => <Button {...props} variant="default" size="xs">Importer un .srt</Button>}
        </FileButton>
      </Group>
      <Stack gap={6}>
        {subs.items.map((s, i) => (
          <Group key={i} gap={4} wrap="nowrap" align="flex-start">
            <NumberInput w={62} size="xs" aria-label="Début (s)" min={0} step={0.1} decimalScale={1} hideControls value={s.start} onChange={(v) => typeof v === "number" && setSubs(subs.items.map((x, j) => (j === i ? { ...x, start: v } : x)), `sub${i}s`)} />
            <NumberInput w={62} size="xs" aria-label="Fin (s)" min={0} step={0.1} decimalScale={1} hideControls value={s.end} onChange={(v) => typeof v === "number" && setSubs(subs.items.map((x, j) => (j === i ? { ...x, end: v } : x)), `sub${i}e`)} />
            <TextInput size="xs" style={{ flex: 1 }} aria-label="Texte du sous-titre" value={s.text} maxLength={160} onChange={(e) => setSubs(subs.items.map((x, j) => (j === i ? { ...x, text: e.currentTarget.value } : x)), `sub${i}t`)} />
            <ActionIcon size="sm" mt={4} variant="subtle" color="red" aria-label="Supprimer le sous-titre" onClick={() => setSubs(subs.items.filter((_, j) => j !== i))}>
              <IconTrash size={13} />
            </ActionIcon>
          </Group>
        ))}
        <Button
          size="xs"
          variant="default"
          leftSection={<IconPlus size={14} />}
          onClick={() => {
            const frame = useEditor.getState().currentFrame / project.fps;
            setSubs([...subs.items, { start: Math.round(frame * 10) / 10, end: Math.round((frame + 2) * 10) / 10, text: "Nouveau sous-titre" }]);
          }}
        >
          Ajouter à la position de lecture
        </Button>
      </Stack>
    </Stack>
  );
}

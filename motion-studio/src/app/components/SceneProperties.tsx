import { useState } from "react";
import {
  ActionIcon,
  Alert,
  Button,
  ColorInput,
  Divider,
  Group,
  NumberInput,
  Popover,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconRefresh, IconTrash, IconPalette } from "@tabler/icons-react";
import {
  ANIMATION_LABELS,
  BACKGROUND_LABELS,
  DIRECTION_LABELS,
  ENERGY_LABELS,
  MOTION_LABELS,
  SCENE_LABELS,
  TRANSITION_LABELS,
} from "../../shared/catalog";
import type { Scene, SceneOf } from "../../shared/schema";
import { api } from "../api";
import { useEditor } from "../store";

const SWATCHES = ["#0A0A0A", "#FFFFFF", "#22C55E", "#16A34A", "#D4AF37", "#F72585", "#3B82F6", "#F97316", "#EF4444", "#8B5CF6", "#F4EFE6", "#0F2A1C"];
const options = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({ value, label }));

export function SceneProperties({ onOpenMedia }: { onOpenMedia: () => void }) {
  const project = useEditor((s) => s.project)!;
  const selectedId = useEditor((s) => s.selectedSceneId);
  const updateScene = useEditor((s) => s.updateScene);
  const update = useEditor((s) => s.update);
  const media = useEditor((s) => s.media);
  const [regenBusy, setRegenBusy] = useState(false);
  const [regenInstruction, setRegenInstruction] = useState("");
  const [regenOpen, setRegenOpen] = useState(false);

  const index = project.scenes.findIndex((s) => s.id === selectedId);
  const scene = project.scenes[index];
  if (!scene) {
    return <Text c="dimmed" size="sm">Sélectionnez une scène dans la timeline pour la modifier.</Text>;
  }

  const set = (patch: Partial<Scene>, key?: string) => updateScene(scene.id, patch, key);
  const visualMedia = media.filter((m) => m.kind !== "audio");
  const imageMedia = media.filter((m) => m.kind === "image");

  const regenerate = async () => {
    setRegenBusy(true);
    try {
      const r = await api.regenerateScene(project, scene.id, regenInstruction);
      update((p) => ({ ...p, scenes: p.scenes.map((s) => (s.id === scene.id ? r.data : s)) }));
      setRegenOpen(false);
      notifications.show({ color: "vert", title: "Scène régénérée", message: `${r.summary} (Ctrl+Z pour revenir en arrière)` });
    } catch (e) {
      notifications.show({ color: "red", title: "Régénération impossible", message: (e as Error).message });
    } finally {
      setRegenBusy(false);
    }
  };

  const assetSelect = (label: string, value: string | null, onChange: (v: string | null) => void, list = visualMedia) => (
    <div>
      <Select
        label={label}
        placeholder={list.length ? "Aucun (visuel par défaut)" : "Médiathèque vide"}
        clearable
        value={value}
        onChange={onChange}
        data={list.map((m) => ({ value: m.id, label: m.originalName }))}
      />
      <Button variant="subtle" size="compact-xs" mt={4} onClick={onOpenMedia}>Importer un fichier…</Button>
    </div>
  );

  const listEditor = (label: string, items: string[], max: number, onChange: (v: string[]) => void, field: string) => (
    <Stack gap={6}>
      <Text size="sm" fw={500}>{label}</Text>
      {items.map((item, i) => (
        <Group key={i} gap={4} wrap="nowrap">
          <TextInput
            style={{ flex: 1 }}
            aria-label={`${label} ${i + 1}`}
            value={item}
            maxLength={90}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.currentTarget.value : x)))}
            onBlur={() => useEditor.setState({ lastEditKey: null })}
          />
          <ActionIcon variant="subtle" color="red" aria-label="Retirer" disabled={items.length <= 1 && field !== "features"} onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
      ))}
      <Button size="compact-sm" variant="default" leftSection={<IconPlus size={14} />} disabled={items.length >= max} onClick={() => onChange([...items, "Nouveau"])}>
        Ajouter
      </Button>
    </Stack>
  );

  const text = (label: string, value: string, key: string, max: number, multiline = false) =>
    multiline ? (
      <Textarea label={label} value={value} maxLength={max} autosize minRows={2} onChange={(e) => set({ [key]: e.currentTarget.value } as Partial<Scene>, key)} />
    ) : (
      <TextInput label={label} value={value} maxLength={max} onChange={(e) => set({ [key]: e.currentTarget.value } as Partial<Scene>, key)} />
    );

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="nowrap">
        <div>
          <Text size="xs" c="dimmed" fw={600} tt="uppercase">Scène {index + 1}</Text>
          <Title order={4}>{SCENE_LABELS[scene.type].label}</Title>
        </div>
        <Popover opened={regenOpen} onChange={setRegenOpen} width={300} position="bottom-end" shadow="md" trapFocus>
          <Popover.Target>
            <Button size="xs" color="vert" variant="light" leftSection={<IconRefresh size={14} />} onClick={() => setRegenOpen((o) => !o)}>
              Régénérer
            </Button>
          </Popover.Target>
          <Popover.Dropdown>
            <Stack gap="xs">
              <Text size="sm">L'IA propose une nouvelle version de cette scène uniquement. Le reste de la vidéo ne change pas.</Text>
              <Textarea placeholder="Consigne facultative (ex. : plus festif, en rouge)" value={regenInstruction} onChange={(e) => setRegenInstruction(e.currentTarget.value)} autosize minRows={2} />
              <Button color="vert" loading={regenBusy} onClick={regenerate}>Régénérer la scène</Button>
            </Stack>
          </Popover.Dropdown>
        </Popover>
      </Group>

      <Divider label="Contenu" labelPosition="left" />
      <SceneContent scene={scene} set={set} text={text} listEditor={listEditor} assetSelect={assetSelect} imageMedia={imageMedia} />

      <Divider label="Animation et durée" labelPosition="left" />
      <NumberInput label="Durée de la scène (secondes)" min={1} max={30} step={0.5} decimalScale={2} value={scene.duration} onChange={(v) => typeof v === "number" && set({ duration: Math.min(30, Math.max(1, v)) }, "duration")} />
      <div>
        <Text size="sm" fw={500} mb={4}>Énergie des animations</Text>
        <SegmentedControl fullWidth value={scene.energy} onChange={(v) => set({ energy: v as Scene["energy"] })} data={options(ENERGY_LABELS)} />
      </div>
      {index > 0 ? (
        <Group grow align="flex-end">
          <Select label="Transition d'entrée" value={scene.transition.type} allowDeselect={false} onChange={(v) => v && set({ transition: { ...scene.transition, type: v as Scene["transition"]["type"] } })} data={options(TRANSITION_LABELS)} />
          <NumberInput label="Durée (s)" min={0.2} max={2} step={0.1} decimalScale={1} value={scene.transition.duration} disabled={scene.transition.type === "none"} onChange={(v) => typeof v === "number" && set({ transition: { ...scene.transition, duration: Math.min(2, Math.max(0.2, v)) } }, "tduration")} />
        </Group>
      ) : (
        <Text size="xs" c="dimmed">Première scène : pas de transition d'entrée.</Text>
      )}
      {index > 0 && ["slide", "wipe", "flip"].includes(scene.transition.type) ? (
        <Select label="Direction" value={scene.transition.direction} allowDeselect={false} onChange={(v) => v && set({ transition: { ...scene.transition, direction: v as Scene["transition"]["direction"] } })} data={options(DIRECTION_LABELS)} />
      ) : null}

      <Divider label="Couleurs et fond" labelPosition="left" />
      <Select label="Style de fond" value={scene.background.style} allowDeselect={false} onChange={(v) => v && set({ background: { ...scene.background, style: v as Scene["background"]["style"] } })} data={options(BACKGROUND_LABELS)} />
      <Group grow>
        <ColorInput label="Fond 1" format="hex" swatches={SWATCHES} value={scene.background.color1} onChange={(v) => /^#[0-9a-f]{6}$/i.test(v) && set({ background: { ...scene.background, color1: v } }, "bg1")} />
        <ColorInput label="Fond 2" format="hex" swatches={SWATCHES} value={scene.background.color2} disabled={scene.background.style === "solid"} onChange={(v) => /^#[0-9a-f]{6}$/i.test(v) && set({ background: { ...scene.background, color2: v } }, "bg2")} />
      </Group>
      <Group grow>
        <ColorInput label="Texte" format="hex" swatches={SWATCHES} value={scene.textColor} onChange={(v) => /^#[0-9a-f]{6}$/i.test(v) && set({ textColor: v }, "text")} />
        <ColorInput label="Accent" format="hex" swatches={SWATCHES} value={scene.accentColor} onChange={(v) => /^#[0-9a-f]{6}$/i.test(v) && set({ accentColor: v }, "accent")} />
      </Group>
      <Tooltip label="Copie le fond et les couleurs de cette scène sur toutes les autres">
        <Button
          variant="default"
          leftSection={<IconPalette size={16} />}
          onClick={() =>
            update((p) => ({ ...p, scenes: p.scenes.map((s) => ({ ...s, background: scene.background, textColor: scene.textColor, accentColor: scene.accentColor })) }))
          }
        >
          Appliquer ces couleurs à toutes les scènes
        </Button>
      </Tooltip>

      <Divider label="Storyboard" labelPosition="left" />
      <Textarea label="Note d'intention (non affichée)" value={scene.notes} maxLength={300} autosize minRows={2} onChange={(e) => set({ notes: e.currentTarget.value }, "notes")} />
      {scene.type === "media" && !scene.assetId ? <Alert color="yellow">Cette scène n'a pas encore d'image ou de vidéo.</Alert> : null}
    </Stack>
  );
}

type ContentProps = {
  scene: Scene;
  set: (patch: Partial<Scene>, key?: string) => void;
  text: (label: string, value: string, key: string, max: number, multiline?: boolean) => React.ReactNode;
  listEditor: (label: string, items: string[], max: number, onChange: (v: string[]) => void, field: string) => React.ReactNode;
  assetSelect: (label: string, value: string | null, onChange: (v: string | null) => void, list?: ReturnType<typeof useEditor.getState>["media"]) => React.ReactNode;
  imageMedia: ReturnType<typeof useEditor.getState>["media"];
};

function SceneContent({ scene, set, text, listEditor, assetSelect, imageMedia }: ContentProps) {
  switch (scene.type) {
    case "title":
      return (
        <>
          {text("Titre", scene.title, "title", 80, true)}
          {text("Sous-titre", scene.subtitle, "subtitle", 140)}
          <Select label="Animation du titre" value={scene.animation} allowDeselect={false} onChange={(v) => v && set({ animation: v as SceneOf<"title">["animation"] })} data={options(ANIMATION_LABELS)} />
          <SegmentedControl value={scene.align} onChange={(v) => set({ align: v as "center" | "left" })} data={[{ value: "center", label: "Centré" }, { value: "left", label: "Aligné à gauche" }]} />
        </>
      );
    case "kinetic":
      return listEditor("Mots (affichés un par un)", scene.words, 12, (words) => set({ words }, "words"), "words");
    case "bullets":
      return (
        <>
          {text("Titre", scene.heading, "heading", 80)}
          {listEditor("Points clés", scene.items, 6, (items) => set({ items }, "items"), "items")}
        </>
      );
    case "logo":
      return (
        <>
          {assetSelect("Image du logo", scene.assetId, (assetId) => set({ assetId }), imageMedia)}
          {text("Logo texte (si pas d'image)", scene.text, "text", 40)}
          {text("Slogan", scene.tagline, "tagline", 100)}
        </>
      );
    case "product":
      return (
        <>
          {assetSelect("Visuel du produit", scene.assetId, (assetId) => set({ assetId }), imageMedia)}
          {text("Nom", scene.name, "name", 60)}
          {listEditor("Atouts", scene.features, 4, (features) => set({ features }, "features"), "features")}
          {text("Prix ou mention", scene.price, "price", 30)}
        </>
      );
    case "chart":
      return (
        <>
          {text("Titre", scene.heading, "heading", 80)}
          {text("Unité (ex. « % » ou « M€ »)", scene.unit, "unit", 12)}
          <Stack gap={6}>
            <Text size="sm" fw={500}>Valeurs</Text>
            {scene.items.map((item, i) => (
              <Group key={i} gap={4} wrap="nowrap">
                <TextInput style={{ flex: 1 }} aria-label={`Libellé ${i + 1}`} value={item.label} maxLength={30} onChange={(e) => set({ items: scene.items.map((x, j) => (j === i ? { ...x, label: e.currentTarget.value } : x)) }, "items")} />
                <NumberInput w={110} aria-label={`Valeur ${i + 1}`} min={0} value={item.value} decimalScale={2} onChange={(v) => typeof v === "number" && set({ items: scene.items.map((x, j) => (j === i ? { ...x, value: Math.max(0, v) } : x)) }, "items")} />
                <ActionIcon variant="subtle" color="red" aria-label="Retirer" disabled={scene.items.length <= 2} onClick={() => set({ items: scene.items.filter((_, j) => j !== i) })}>
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            ))}
            <Button size="compact-sm" variant="default" leftSection={<IconPlus size={14} />} disabled={scene.items.length >= 8} onClick={() => set({ items: [...scene.items, { label: "Nouveau", value: 10 }] })}>
              Ajouter une valeur
            </Button>
          </Stack>
        </>
      );
    case "stat":
      return (
        <>
          <Group grow>
            <NumberInput label="Valeur" value={scene.value} decimalScale={scene.decimals} onChange={(v) => typeof v === "number" && set({ value: v }, "value")} />
            <NumberInput label="Décimales" min={0} max={2} value={scene.decimals} onChange={(v) => typeof v === "number" && set({ decimals: Math.min(2, Math.max(0, Math.round(v))) })} />
          </Group>
          <Group grow>
            {text("Préfixe", scene.prefix, "prefix", 8)}
            {text("Suffixe", scene.suffix, "suffix", 12)}
          </Group>
          {text("Légende", scene.label, "label", 100)}
        </>
      );
    case "media":
      return (
        <>
          {assetSelect("Image ou vidéo", scene.assetId, (assetId) => set({ assetId }))}
          {text("Légende", scene.caption, "caption", 100)}
          <Select label="Mouvement de caméra" value={scene.motion} allowDeselect={false} onChange={(v) => v && set({ motion: v as SceneOf<"media">["motion"] })} data={options(MOTION_LABELS)} />
        </>
      );
    case "cta":
      return (
        <>
          {text("Message", scene.title, "title", 80, true)}
          {text("Texte du bouton", scene.buttonText, "buttonText", 30)}
          {text("Adresse / contact", scene.url, "url", 60)}
        </>
      );
  }
}

import { useMemo, useState } from "react";
import { ActionIcon, Button, Group, Menu, Slider, Text, Tooltip } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, horizontalListSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconCopy, IconGripVertical, IconMusic, IconPlus, IconTrash } from "@tabler/icons-react";
import { createScene, SCENE_LABELS, TRANSITION_LABELS } from "../../shared/catalog";
import { newId, SCENE_TYPES, type Project, type Scene, type SceneType } from "../../shared/schema";
import { computeTimings, totalFrames } from "../../shared/timing";
import { playerRef, seekToScene, useEditor } from "../store";
import { sceneHeadline } from "./StoryboardReview";

const GAP = 4;
const PAD = 12;

export function Timeline() {
  const project = useEditor((s) => s.project)!;
  const selectedId = useEditor((s) => s.selectedSceneId);
  const frame = useEditor((s) => s.currentFrame);
  const update = useEditor((s) => s.update);
  const select = useEditor((s) => s.select);
  const media = useEditor((s) => s.media);
  const { ref, width } = useElementSize();
  const [zoom, setZoom] = useState(1);

  const timings = useMemo(() => computeTimings(project), [project]);
  const total = totalFrames(project);
  const totalSeconds = total / project.fps;
  const sumSeconds = project.scenes.reduce((a, s) => a + s.duration, 0);
  const fit = Math.max(20, (width - PAD * 2 - GAP * project.scenes.length) / Math.max(1, sumSeconds));
  const pps = fit * zoom;
  const widths = project.scenes.map((s) => Math.max(70, s.duration * pps));
  const lefts = widths.reduce<number[]>((acc, _w, i) => [...acc, i === 0 ? PAD : acc[i - 1] + widths[i - 1] + GAP], []);
  const innerWidth = (lefts[lefts.length - 1] ?? PAD) + (widths[widths.length - 1] ?? 0) + PAD;

  /** Position horizontale d'une image de la vidéo (les blocs ne se chevauchent pas, contrairement aux transitions). */
  const frameToX = (f: number) => {
    for (let i = timings.length - 1; i >= 0; i--) {
      const t = timings[i];
      if (f >= t.from || i === 0) return lefts[i] + (Math.min(Math.max(0, f - t.from), t.durationInFrames) / t.durationInFrames) * widths[i];
    }
    return PAD;
  };
  const xToFrame = (x: number) => {
    for (let i = 0; i < timings.length; i++) {
      if (x <= lefts[i] + widths[i] + GAP / 2 || i === timings.length - 1) {
        const r = Math.min(1, Math.max(0, (x - lefts[i]) / widths[i]));
        return Math.min(total - 1, Math.round(timings[i].from + r * timings[i].durationInFrames));
      }
    }
    return 0;
  };
  const seek = (x: number) => playerRef.current?.seekTo(xToFrame(x));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    update((p) => {
      const from = p.scenes.findIndex((s) => s.id === e.active.id);
      const to = p.scenes.findIndex((s) => s.id === e.over!.id);
      return { ...p, scenes: arrayMove(p.scenes, from, to) };
    });
  };

  const addScene = (type: SceneType) => {
    const current = project.scenes.find((s) => s.id === selectedId) ?? project.scenes[project.scenes.length - 1];
    const palette = { bg1: current.background.color1, bg2: current.background.color2, text: current.textColor, accent: current.accentColor, bgStyle: current.background.style };
    const scene = createScene(type, { palette, energy: current.energy });
    const index = project.scenes.findIndex((s) => s.id === current.id) + 1;
    update((p) => ({ ...p, scenes: [...p.scenes.slice(0, index), scene, ...p.scenes.slice(index)] }));
    select(scene.id);
    setTimeout(() => seekToScene(useEditor.getState().project!, scene.id), 50);
  };

  const music = project.music ? media.find((m) => m.id === project.music!.assetId) : null;
  const beatTicks: number[] = [];
  if (project.music?.bpm) {
    const period = (60 / project.music.bpm) * project.fps * 4; // une mesure
    const offset = ((project.music.startAt * project.fps) % period + period) % period;
    for (let f = period - offset; f < total; f += period) beatTicks.push(f);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Group justify="space-between" px="md" py={6} wrap="nowrap">
        <Group gap="sm">
          <Text fw={700} size="sm">Timeline</Text>
          <Text size="xs" c="dimmed">Glissez les scènes pour les réordonner · cliquez pour les modifier</Text>
        </Group>
        <Group gap="md" wrap="nowrap">
          <Text size="xs" c="dimmed">Durée totale : {totalSeconds.toFixed(1)} s</Text>
          <Group gap={6} wrap="nowrap">
            <Text size="xs" c="dimmed">Zoom</Text>
            <Slider w={110} min={0.5} max={4} step={0.1} value={zoom} onChange={setZoom} label={null} color="dark" aria-label="Zoom de la timeline" />
          </Group>
          <Menu shadow="md" width={260} position="top-end">
            <Menu.Target>
              <Button size="xs" color="dark" leftSection={<IconPlus size={14} />} disabled={project.scenes.length >= 15}>Ajouter une scène</Button>
            </Menu.Target>
            <Menu.Dropdown>
              {SCENE_TYPES.map((t) => (
                <Menu.Item key={t} onClick={() => addScene(t)}>
                  <Text size="sm" fw={600}>{SCENE_LABELS[t].label}</Text>
                  <Text size="xs" c="dimmed">{SCENE_LABELS[t].description}</Text>
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
      <div ref={ref} style={{ flex: 1, overflowX: "auto", overflowY: "hidden", position: "relative", background: "#FAFAFA" }}>
        <div style={{ position: "relative", width: Math.max(innerWidth, width), height: "100%", minHeight: 150 }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={project.scenes.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
              <div style={{ display: "flex", gap: GAP, padding: `8px ${PAD}px 0`, height: 92 }}>
                {project.scenes.map((s, i) => (
                  <SceneBlock key={s.id} scene={s} index={i} width={widths[i]} selected={s.id === selectedId} project={project} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div
            title="Piste audio — cliquez pour vous déplacer dans le temps"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              seek(e.clientX - r.left + PAD);
            }}
            style={{ position: "absolute", left: PAD, width: innerWidth - PAD * 2, top: 106, height: 22, borderRadius: 6, background: music ? "#DCFCE7" : "#F0F0F0", cursor: "pointer", display: "flex", alignItems: "center", paddingLeft: 8, overflow: "hidden" }}
          >
            <IconMusic size={12} />
            <Text size="xs" ml={4} c={music ? "dark" : "dimmed"} style={{ whiteSpace: "nowrap", pointerEvents: "none" }}>
              {music ? `${music.originalName}${project.music?.bpm ? ` · ${project.music.bpm} BPM` : ""}${project.music?.pulse ? " · pulsation" : ""}` : "Aucune musique (onglet Audio)"}
            </Text>
            {beatTicks.map((f) => (
              <div key={f} style={{ position: "absolute", left: frameToX(f) - PAD, top: 4, bottom: 4, width: 1, background: "#16A34A", opacity: 0.6, pointerEvents: "none" }} />
            ))}
          </div>

          {project.subtitles.enabled && project.subtitles.items.length > 0 ? (
            <div style={{ position: "absolute", left: 0, right: 0, top: 132, height: 14 }}>
              {project.subtitles.items.map((s, i) => {
                const x1 = frameToX(s.start * project.fps);
                const x2 = frameToX(Math.min(total, s.end * project.fps));
                return (
                  <Tooltip key={i} label={s.text}>
                    <div style={{ position: "absolute", left: x1, width: Math.max(4, x2 - x1 - 2), height: 10, top: 2, borderRadius: 3, background: "#0A0A0A", opacity: 0.7 }} />
                  </Tooltip>
                );
              })}
            </div>
          ) : null}

          <div
            aria-hidden
            style={{ position: "absolute", top: 0, bottom: 0, left: frameToX(frame), width: 2, background: "#16A34A", pointerEvents: "none", boxShadow: "0 0 0 1px rgba(255,255,255,.6)" }}
          >
            <div style={{ position: "absolute", top: 0, left: -5, width: 12, height: 8, background: "#16A34A", borderRadius: "0 0 4px 4px" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SceneBlock({ scene, index, width, selected, project }: { scene: Scene; index: number; width: number; selected: boolean; project: Project }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: scene.id });
  const select = useEditor((s) => s.select);
  const update = useEditor((s) => s.update);

  const duplicate = () => {
    const copy = { ...structuredClone(scene), id: newId() };
    update((p) => ({ ...p, scenes: [...p.scenes.slice(0, index + 1), copy, ...p.scenes.slice(index + 1)] }));
    select(copy.id);
  };
  const remove = () => {
    if (project.scenes.length <= 1) return;
    update((p) => ({ ...p, scenes: p.scenes.filter((s) => s.id !== scene.id) }));
    select((project.scenes[index + 1] ?? project.scenes[index - 1]).id);
  };

  return (
    <div
      ref={setNodeRef}
      className="ms-scene-block"
      {...attributes}
      {...listeners}
      aria-label={`Scène ${index + 1} : ${SCENE_LABELS[scene.type].label}, ${scene.duration} secondes`}
      onClick={() => {
        select(scene.id);
        seekToScene(project, scene.id);
      }}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        width,
        flex: "none",
        borderRadius: 8,
        background: "#FFFFFF",
        border: selected ? "2px solid #16A34A" : "1px solid #D4D4D4",
        overflow: "hidden",
        cursor: isDragging ? "grabbing" : "pointer",
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.85 : 1,
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ height: 18, background: `linear-gradient(90deg, ${scene.background.color1}, ${scene.background.color2})`, borderBottom: `3px solid ${scene.accentColor}`, display: "flex", alignItems: "center", paddingLeft: 4 }}>
        <IconGripVertical size={12} color={scene.textColor} />
        {index > 0 && scene.transition.type !== "none" ? (
          <Text size="10px" c={scene.textColor} ml={2} style={{ whiteSpace: "nowrap", opacity: 0.85 }}>
            ↦ {TRANSITION_LABELS[scene.transition.type]}
          </Text>
        ) : null}
      </div>
      <div style={{ padding: "4px 6px", minWidth: 0, flex: 1 }}>
        <Text size="xs" fw={700} truncate>
          {index + 1}. {SCENE_LABELS[scene.type].label}
        </Text>
        <Text size="xs" c="dimmed" truncate>
          {sceneHeadline(scene)}
        </Text>
        <Text size="xs" ff="monospace">{scene.duration.toFixed(1)} s</Text>
      </div>
      {selected && width > 110 ? (
        <Group gap={2} style={{ position: "absolute", right: 2, bottom: 2 }} onPointerDown={(e) => e.stopPropagation()}>
          <Tooltip label="Dupliquer">
            <ActionIcon size="sm" variant="subtle" color="dark" onClick={(e) => { e.stopPropagation(); duplicate(); }} aria-label="Dupliquer la scène" disabled={project.scenes.length >= 15}>
              <IconCopy size={13} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Supprimer">
            <ActionIcon size="sm" variant="subtle" color="red" onClick={(e) => { e.stopPropagation(); remove(); }} aria-label="Supprimer la scène" disabled={project.scenes.length <= 1}>
              <IconTrash size={13} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ) : null}
    </div>
  );
}

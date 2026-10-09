import { useCallback, useEffect, useState } from "react";
import { ActionIcon, Group, Text, Tooltip } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import type { PlayerRef } from "@remotion/player";
import { IconPlayerPause, IconPlayerPlay, IconPlayerSkipBack, IconPlayerSkipForward } from "@tabler/icons-react";
import { SCENE_LABELS } from "../../shared/catalog";
import { computeTimings, formatTime, sceneIndexAtFrame, totalFrames } from "../../shared/timing";
import { playerRef, seekToScene, useEditor } from "../store";
import { PreviewPlayer } from "./PreviewPlayer";

export function PreviewArea() {
  const project = useEditor((s) => s.project)!;
  const frame = useEditor((s) => s.currentFrame);
  const setFrame = useEditor((s) => s.setFrame);
  const select = useEditor((s) => s.select);
  const [playing, setPlaying] = useState(false);
  const [player, setPlayer] = useState<PlayerRef | null>(null);

  const attach = useCallback((ref: PlayerRef | null) => {
    playerRef.current = ref;
    setPlayer(ref);
  }, []);

  useEffect(() => {
    if (!player) return;
    setFrame(player.getCurrentFrame());
    const onFrame = (e: { detail: { frame: number } }) => setFrame(e.detail.frame);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    player.addEventListener("frameupdate", onFrame);
    player.addEventListener("seeked", onFrame);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    return () => {
      player.removeEventListener("frameupdate", onFrame);
      player.removeEventListener("seeked", onFrame);
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
    };
  }, [player, setFrame]);

  const total = totalFrames(project);
  const index = sceneIndexAtFrame(project, Math.min(frame, total - 1));
  const timings = computeTimings(project);
  const ratio = project.format === "9:16" ? 9 / 16 : project.format === "1:1" ? 1 : 16 / 9;

  const go = (delta: number) => {
    const target = Math.max(0, Math.min(project.scenes.length - 1, index + delta));
    const scene = project.scenes[target];
    select(scene.id);
    seekToScene(project, scene.id);
  };
  const toggle = () => playerRef.current?.toggle();
  useHotkeys([["space", toggle]]);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, background: "#F5F5F4", padding: 16, gap: 12 }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", containerType: "size" }}>
        {/* La plus grande taille qui tient dans l'espace disponible, en gardant les proportions. */}
        <div style={{ width: `min(100cqw, 100cqh * ${ratio})` }}>
          <PreviewPlayer ref={attach} project={project} initialFrame={project.fps} />
        </div>
      </div>
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm" fw={600} style={{ minWidth: 200 }}>
          Scène {index + 1}/{project.scenes.length} · {SCENE_LABELS[timings[index].scene.type].label}
        </Text>
        <Group gap="xs">
          <Tooltip label="Scène précédente">
            <ActionIcon variant="default" size="lg" onClick={() => go(-1)} aria-label="Scène précédente">
              <IconPlayerSkipBack size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Lecture / pause (Espace)">
            <ActionIcon color="dark" size="xl" radius="xl" onClick={toggle} aria-label={playing ? "Pause" : "Lecture"}>
              {playing ? <IconPlayerPause size={22} /> : <IconPlayerPlay size={22} />}
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Scène suivante">
            <ActionIcon variant="default" size="lg" onClick={() => go(1)} aria-label="Scène suivante">
              <IconPlayerSkipForward size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Text size="sm" ff="monospace" style={{ minWidth: 200, textAlign: "right" }}>
          {formatTime(frame / project.fps)} / {formatTime(total / project.fps)}
        </Text>
      </Group>
    </div>
  );
}

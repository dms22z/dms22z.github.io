import { useEffect, useRef, useState } from "react";
import { ActionIcon, Badge, Button, Group, ScrollArea, Tabs, TextInput, Tooltip } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { IconArrowBackUp, IconArrowForwardUp, IconCode, IconDownload, IconMusic, IconPhoto, IconSettings, IconSparkles } from "@tabler/icons-react";
import { api } from "../api";
import { useEditor } from "../store";
import { AiPanel } from "./AiPanel";
import { AudioPanel } from "./AudioPanel";
import { CodeModal } from "./CodeModal";
import { ExportModal } from "./ExportModal";
import { Logo } from "./Logo";
import { MediaPanel } from "./MediaPanel";
import { PreviewArea } from "./PreviewArea";
import { ProjectPanel } from "./ProjectPanel";
import { SceneProperties } from "./SceneProperties";
import { Timeline } from "./Timeline";

const SAVE_LABEL = { saved: "Enregistré", saving: "Enregistrement…", dirty: "Modifications non enregistrées", error: "Échec de l'enregistrement" } as const;

export function Editor({ onHome }: { onHome: () => void }) {
  const project = useEditor((s) => s.project)!;
  const projectId = useEditor((s) => s.projectId)!;
  const saveState = useEditor((s) => s.saveState);
  const setSaveState = useEditor((s) => s.setSaveState);
  const update = useEditor((s) => s.update);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const [exportOpen, setExportOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [tab, setTab] = useState<string | null>("ia");
  const timer = useRef<number | null>(null);

  // Enregistrement automatique (0,8 s après la dernière modification).
  useEffect(() => {
    if (saveState !== "dirty") return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        await api.saveProject(projectId, project);
        if (useEditor.getState().project === project) setSaveState("saved");
        else setSaveState("dirty");
      } catch {
        setSaveState("error");
      }
    }, 800);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [project, projectId, saveState, setSaveState]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (useEditor.getState().saveState !== "saved") e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  useHotkeys([
    ["mod+Z", undo],
    ["mod+shift+Z", redo],
    ["mod+Y", redo],
  ]);

  return (
    <div style={{ display: "grid", gridTemplateRows: "56px minmax(0, 1fr) 210px", height: "100vh", minWidth: 1100 }}>
      <Group justify="space-between" px="md" className="ms-panel" style={{ borderBottom: "1px solid" }} wrap="nowrap">
        <Group gap="md" wrap="nowrap">
          <Tooltip label="Retour à l'accueil">
            <div>
              <Logo onClick={onHome} />
            </div>
          </Tooltip>
          <TextInput
            aria-label="Titre du projet"
            variant="unstyled"
            value={project.title}
            onChange={(e) => update((p) => ({ ...p, title: e.currentTarget.value.slice(0, 100) }), "title")}
            styles={{ input: { fontWeight: 600, fontSize: 16, minWidth: 260 } }}
          />
          <Badge variant="light" color={saveState === "error" ? "red" : saveState === "saved" ? "vert" : "gray"}>{SAVE_LABEL[saveState]}</Badge>
        </Group>
        <Group gap="xs" wrap="nowrap">
          <Tooltip label="Annuler (Ctrl+Z)">
            <ActionIcon variant="default" size="lg" onClick={undo} disabled={!canUndo} aria-label="Annuler">
              <IconArrowBackUp size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Rétablir (Ctrl+Y)">
            <ActionIcon variant="default" size="lg" onClick={redo} disabled={!canRedo} aria-label="Rétablir">
              <IconArrowForwardUp size={18} />
            </ActionIcon>
          </Tooltip>
          <Button variant="default" leftSection={<IconCode size={16} />} onClick={() => setCodeOpen(true)}>
            Code Remotion
          </Button>
          <Button color="vert" leftSection={<IconDownload size={16} />} onClick={() => setExportOpen(true)}>
            Exporter en MP4
          </Button>
        </Group>
      </Group>

      <div style={{ display: "grid", gridTemplateColumns: "360px minmax(0, 1fr) 360px", minHeight: 0 }}>
        <Tabs value={tab} onChange={setTab} className="ms-panel" style={{ borderRight: "1px solid", display: "flex", flexDirection: "column", minHeight: 0 }} color="vert">
          <Tabs.List grow style={{ flexWrap: "nowrap" }}>
            <Tabs.Tab value="ia" leftSection={<IconSparkles size={14} />} px={6}>IA</Tabs.Tab>
            <Tabs.Tab value="medias" leftSection={<IconPhoto size={14} />} px={6}>Médias</Tabs.Tab>
            <Tabs.Tab value="audio" leftSection={<IconMusic size={14} />} px={6}>Audio</Tabs.Tab>
            <Tabs.Tab value="projet" leftSection={<IconSettings size={14} />} px={6}>Projet</Tabs.Tab>
          </Tabs.List>
          <ScrollArea style={{ flex: 1 }} p="md">
            <Tabs.Panel value="ia"><AiPanel /></Tabs.Panel>
            <Tabs.Panel value="medias"><MediaPanel /></Tabs.Panel>
            <Tabs.Panel value="audio"><AudioPanel /></Tabs.Panel>
            <Tabs.Panel value="projet"><ProjectPanel /></Tabs.Panel>
          </ScrollArea>
        </Tabs>
        <PreviewArea />
        <ScrollArea className="ms-panel" style={{ borderLeft: "1px solid" }} p="md">
          <SceneProperties onOpenMedia={() => setTab("medias")} />
        </ScrollArea>
      </div>

      <div className="ms-panel" style={{ borderTop: "1px solid", minHeight: 0 }}>
        <Timeline />
      </div>

      <ExportModal opened={exportOpen} onClose={() => setExportOpen(false)} />
      <CodeModal opened={codeOpen} onClose={() => setCodeOpen(false)} />
    </div>
  );
}

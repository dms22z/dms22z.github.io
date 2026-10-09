import { useMemo } from "react";
import { Button, Code, CopyButton, Group, Modal, ScrollArea, Text } from "@mantine/core";
import { IconCopy, IconDownload } from "@tabler/icons-react";
import { componentName, generateRemotionCode } from "../../shared/codegen";
import { useEditor } from "../store";

export function CodeModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const project = useEditor((s) => s.project)!;
  const code = useMemo(() => (opened ? generateRemotionCode(project) : ""), [opened, project]);
  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([code], { type: "text/plain" }));
    a.download = `${componentName(project.title)}.tsx`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <Modal opened={opened} onClose={onClose} size="80%" title={<Text fw={800}>Code Remotion de la vidéo</Text>}>
      <Text size="sm" c="dimmed" mb="sm">
        Ce code TSX est généré automatiquement à partir des scènes validées. Il utilise les composants de scène de l'application
        (dossier src/remotion) : placez-le dans src/remotion/generated/ pour le réutiliser ou le personnaliser dans Remotion Studio.
      </Text>
      <Group mb="sm">
        <CopyButton value={code}>
          {({ copied, copy }) => (
            <Button size="xs" color={copied ? "vert" : "dark"} leftSection={<IconCopy size={14} />} onClick={copy}>
              {copied ? "Copié !" : "Copier"}
            </Button>
          )}
        </CopyButton>
        <Button size="xs" variant="default" leftSection={<IconDownload size={14} />} onClick={download}>Télécharger le fichier .tsx</Button>
      </Group>
      <ScrollArea h="65vh">
        <Code block style={{ fontSize: 12 }}>{code}</Code>
      </ScrollArea>
    </Modal>
  );
}

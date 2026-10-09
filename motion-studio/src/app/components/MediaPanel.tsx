import { useState } from "react";
import { ActionIcon, Alert, Badge, Card, Group, Image, Menu, Select, Stack, Text, TextInput, Title, Tooltip } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { notifications } from "@mantine/notifications";
import { IconDots, IconMovie, IconMusic, IconTrash, IconUpload } from "@tabler/icons-react";
import { api, formatSize, mediaUrl, RIGHTS_LABELS, type MediaItem, type Rights } from "../api";
import { useEditor } from "../store";

const ACCEPT = {
  "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"],
  "video/*": [".mp4", ".webm", ".mov"],
  "audio/*": [".mp3", ".wav", ".ogg", ".aac", ".m4a"],
};

export function MediaPanel() {
  const media = useEditor((s) => s.media);
  const setMedia = useEditor((s) => s.setMedia);
  const project = useEditor((s) => s.project)!;
  const selectedId = useEditor((s) => s.selectedSceneId);
  const update = useEditor((s) => s.update);
  const [rights, setRights] = useState<Rights | null>(null);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);

  const refresh = () => api.listMedia().then(setMedia);
  const used = (id: string) =>
    project.music?.assetId === id || project.voiceover?.assetId === id || project.scenes.some((s) => "assetId" in s && s.assetId === id);

  const onDrop = async (files: File[]) => {
    if (!rights) return;
    setUploading(true);
    for (const f of files) {
      try {
        await api.uploadMedia(f, rights, note);
        notifications.show({ color: "vert", message: `« ${f.name} » importé.` });
      } catch (e) {
        notifications.show({ color: "red", title: `Échec de l'import de « ${f.name} »`, message: (e as Error).message });
      }
    }
    await refresh();
    setUploading(false);
  };

  const useInScene = (m: MediaItem) => {
    const scene = project.scenes.find((s) => s.id === selectedId);
    if (!scene || !("assetId" in scene)) {
      notifications.show({ color: "yellow", message: "Sélectionnez d'abord une scène « Logo », « Produit » ou « Image ou vidéo »." });
      return;
    }
    if (m.kind === "video" && scene.type !== "media") {
      notifications.show({ color: "yellow", message: "Les vidéos ne peuvent être utilisées que dans une scène « Image ou vidéo »." });
      return;
    }
    update((p) => ({ ...p, scenes: p.scenes.map((s) => (s.id === scene.id ? ({ ...s, assetId: m.id } as typeof s) : s)) }));
  };

  return (
    <Stack gap="md">
      <Title order={5}>Médiathèque</Title>
      <Select
        label="Droits d'utilisation des fichiers à importer"
        description="Obligatoire : indiquez d'où viennent vos fichiers."
        placeholder="Choisissez…"
        value={rights}
        onChange={(v) => setRights(v as Rights | null)}
        data={(Object.keys(RIGHTS_LABELS) as Rights[]).filter((r) => r !== "generated").map((r) => ({ value: r, label: RIGHTS_LABELS[r] }))}
      />
      <TextInput label="Source / licence (facultatif)" placeholder="Ex. : Pixabay, licence Content License" value={note} maxLength={500} onChange={(e) => setNote(e.currentTarget.value)} />
      <Dropzone onDrop={onDrop} accept={ACCEPT} maxSize={500 * 1024 * 1024} loading={uploading} disabled={!rights} onReject={(r) => notifications.show({ color: "red", message: `${r.length} fichier(s) refusé(s) : type non pris en charge ou plus de 500 Mo.` })}>
        <Stack align="center" gap={4} py="md" style={{ pointerEvents: "none" }}>
          <IconUpload size={28} />
          <Text size="sm" fw={600}>{rights ? "Glissez vos fichiers ici ou cliquez" : "Choisissez d'abord les droits ci-dessus"}</Text>
          <Text size="xs" c="dimmed">Images, vidéos, musiques, logos — 500 Mo max.</Text>
        </Stack>
      </Dropzone>
      {rights === "unknown" ? (
        <Alert color="yellow" variant="light">Sans droits vérifiés, la diffusion publique ou commerciale de la vidéo peut enfreindre le droit d'auteur.</Alert>
      ) : null}

      <Stack gap="xs">
        {media.map((m) => (
          <Card key={m.id} withBorder padding="xs">
            <Group wrap="nowrap" gap="sm">
              <div style={{ width: 52, height: 52, flex: "none", borderRadius: 6, background: "#F0F0F0", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {m.kind === "image" ? <Image src={mediaUrl(m.id)} alt="" w={52} h={52} fit="cover" /> : m.kind === "video" ? <IconMovie size={22} /> : <IconMusic size={22} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={600} truncate title={m.originalName}>{m.originalName}</Text>
                <Group gap={4}>
                  <Badge size="xs" color={m.rights === "unknown" ? "red" : "vert"} variant="light">{RIGHTS_LABELS[m.rights]}</Badge>
                  {used(m.id) ? <Badge size="xs" color="dark" variant="light">Utilisé</Badge> : null}
                </Group>
                <Text size="xs" c="dimmed" truncate title={m.rightsNote}>{formatSize(m.size)}{m.rightsNote ? ` · ${m.rightsNote}` : ""}</Text>
              </div>
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <Tooltip label="Actions">
                    <ActionIcon variant="subtle" color="dark" aria-label={`Actions pour ${m.originalName}`}>
                      <IconDots size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Menu.Target>
                <Menu.Dropdown>
                  {m.kind === "audio" ? (
                    <>
                      <Menu.Item onClick={() => update((p) => ({ ...p, music: { ...(p.music ?? { volume: 0.6, fadeIn: 0.5, fadeOut: 1.5, startAt: 0, bpm: null, pulse: true }), assetId: m.id } }))}>Utiliser comme musique</Menu.Item>
                      <Menu.Item onClick={() => update((p) => ({ ...p, voiceover: { assetId: m.id, volume: 1, startAt: 0 } }))}>Utiliser comme voix off</Menu.Item>
                    </>
                  ) : (
                    <Menu.Item onClick={() => useInScene(m)}>Utiliser dans la scène sélectionnée</Menu.Item>
                  )}
                  <Menu.Label>Droits</Menu.Label>
                  {(Object.keys(RIGHTS_LABELS) as Rights[]).filter((r) => r !== "generated" || m.rights === "generated").map((r) => (
                    <Menu.Item key={r} disabled={r === m.rights} onClick={async () => { await api.updateMedia(m.id, r, m.rightsNote); refresh(); }}>
                      {RIGHTS_LABELS[r]}
                    </Menu.Item>
                  ))}
                  <Menu.Divider />
                  <Menu.Item
                    color="red"
                    leftSection={<IconTrash size={14} />}
                    onClick={async () => {
                      if (used(m.id) && !window.confirm("Ce fichier est utilisé dans le projet. Le supprimer quand même ?")) return;
                      await api.deleteMedia(m.id);
                      if (used(m.id)) {
                        update((p) => ({
                          ...p,
                          music: p.music?.assetId === m.id ? null : p.music,
                          voiceover: p.voiceover?.assetId === m.id ? null : p.voiceover,
                          scenes: p.scenes.map((s) => ("assetId" in s && s.assetId === m.id ? ({ ...s, assetId: null } as typeof s) : s)),
                        }));
                      }
                      refresh();
                    }}
                  >
                    Supprimer
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}

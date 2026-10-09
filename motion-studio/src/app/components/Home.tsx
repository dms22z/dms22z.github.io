import { useEffect, useState } from "react";
import {
  Accordion,
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Container,
  CopyButton,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCopy, IconFileImport, IconPlayerPlay, IconSparkles, IconTrash, IconWand } from "@tabler/icons-react";
import { DEMO_MUSIC_ID, FORMAT_LABELS, TEMPLATES, emptyProject } from "../../shared/catalog";
import type { Project, VideoFormat } from "../../shared/schema";
import { api, ApiError, type ProjectSummary } from "../api";
import { openProjectRoute } from "../App";
import { useEditor } from "../store";
import { Logo } from "./Logo";
import { StoryboardReview } from "./StoryboardReview";

const EXAMPLES = [
  "Une publicité premium de 20 secondes pour ma boulangerie artisanale « Le Fournil », ambiance chaleureuse, avec le prix du pain du jour et un appel à venir en boutique.",
  "Une vidéo TikTok dynamique qui présente 3 astuces pour mieux dormir, avec de la typographie cinétique.",
  "Une vidéo explicative YouTube sur le fonctionnement des panneaux solaires, avec un graphique de production mensuelle.",
];

type Draft = { project: Project; summary: string; mode: "claude" | "demo" | "manuel" };

export function Home() {
  const media = useEditor((s) => s.media);
  const [aiState, setAiState] = useState<{ aiMode: "claude" | "demo"; model: string | null } | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState<VideoFormat | "auto">("auto");
  const [seconds, setSeconds] = useState<number | string>(20);
  const [music, setMusic] = useState<string | null>(DEMO_MUSIC_ID);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [manualJson, setManualJson] = useState("");
  const [manualPromptText, setManualPromptText] = useState("");

  const refresh = () => api.listProjects().then(setProjects).catch(() => undefined);
  useEffect(() => {
    api.state().then(setAiState).catch((e) => setError(e.message));
    refresh();
  }, []);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.generate({
        prompt,
        format,
        targetSeconds: typeof seconds === "number" ? seconds : null,
        musicAssetId: music,
      });
      setDraft({ project: r.data, summary: r.summary, mode: r.mode });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const create = async (project: Project) => {
    setBusy(true);
    try {
      const r = await api.createProject(project);
      openProjectRoute(r.id);
    } catch (e) {
      notifications.show({ color: "red", title: "Création impossible", message: (e as Error).message });
      setBusy(false);
    }
  };

  const importManual = async () => {
    setError(null);
    let parsed: unknown;
    try {
      const cleaned = manualJson.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
      parsed = JSON.parse(cleaned);
    } catch {
      setError("Le texte collé n'est pas un JSON valide. Copiez uniquement la réponse de Claude.");
      return;
    }
    try {
      const r = await api.validate(parsed);
      setDraft({ project: r.project, summary: "Structure importée et validée. Relisez les scènes avant de continuer.", mode: "manuel" });
    } catch (e) {
      const err = e as ApiError;
      setError(`${err.message} : ${err.details.join(" ; ")}`);
    }
  };

  if (draft) {
    return (
      <Container size="xl" py="xl">
        <StoryboardReview
          project={draft.project}
          summary={draft.summary}
          mode={draft.mode}
          busy={busy}
          onAccept={() => create(draft.project)}
          onRetry={draft.mode === "manuel" ? undefined : generate}
          onBack={() => setDraft(null)}
        />
      </Container>
    );
  }

  const audio = media.filter((m) => m.kind === "audio");

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="xl">
        <Logo />
        {aiState ? (
          <Tooltip
            multiline
            w={320}
            label={
              aiState.aiMode === "claude"
                ? "Les demandes sont envoyées à l'API Anthropic depuis le serveur local. La clé reste dans le fichier .env."
                : "Aucune clé ANTHROPIC_API_KEY dans le fichier .env : un générateur simple à base de règles est utilisé. Voir le guide de démarrage."
            }
          >
            <Badge size="lg" color={aiState.aiMode === "claude" ? "vert" : "yellow"} variant="light" leftSection={<IconSparkles size={14} />}>
              {aiState.aiMode === "claude" ? `Claude connecté (${aiState.model})` : "Mode démo — sans clé API"}
            </Badge>
          </Tooltip>
        ) : null}
      </Group>

      <Card withBorder padding="xl" radius="lg" mb="xl">
        <Text size="sm" c="dimmed" fw={600} tt="uppercase">Étape 1 sur 2</Text>
        <Title order={1} mb={4}>Décrivez la vidéo que vous voulez</Title>
        <Text c="dimmed" mb="md">
          L'assistant propose un scénario découpé en scènes. Vous le vérifiez, puis vous ajustez tout dans l'éditeur.
        </Text>
        <Textarea
          aria-label="Description de la vidéo"
          placeholder="Ex. : une vidéo Reels énergique pour annoncer l'ouverture de mon salon de coiffure le 15 novembre…"
          minRows={4}
          autosize
          maxLength={4000}
          value={prompt}
          onChange={(e) => setPrompt(e.currentTarget.value)}
        />
        <Group gap="xs" mt="xs">
          <Text size="xs" c="dimmed">Exemples :</Text>
          {EXAMPLES.map((ex, i) => (
            <Button key={i} size="compact-xs" variant="default" onClick={() => setPrompt(ex)}>
              {["Pub boulangerie", "TikTok sommeil", "Explicatif solaire"][i]}
            </Button>
          ))}
        </Group>
        <Group mt="md" align="flex-end" grow>
          <Select
            label="Format"
            value={format}
            onChange={(v) => setFormat((v as VideoFormat | "auto") ?? "auto")}
            data={[{ value: "auto", label: "Automatique (selon la description)" }, ...Object.entries(FORMAT_LABELS).map(([value, label]) => ({ value, label }))]}
            allowDeselect={false}
          />
          <NumberInput label="Durée visée (secondes)" min={3} max={180} value={seconds} onChange={setSeconds} />
          <Select
            label="Musique"
            placeholder="Sans musique"
            clearable
            value={music}
            onChange={setMusic}
            data={audio.map((m) => ({ value: m.id, label: m.originalName }))}
          />
        </Group>
        {error ? (
          <Alert color="red" mt="md" title="Problème">
            {error}
          </Alert>
        ) : null}
        <Group justify="flex-end" mt="lg">
          <Button size="md" color="vert" leftSection={<IconWand size={18} />} loading={busy} disabled={prompt.trim().length < 5} onClick={generate}>
            Générer le storyboard
          </Button>
        </Group>
      </Card>

      <Title order={3} mb="sm">Partir d'un modèle</Title>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} mb="xl">
        {TEMPLATES.map((t) => {
          const p = t.build();
          const s = p.scenes[0];
          return (
            <Card key={t.id} withBorder padding="md" radius="md">
              <div
                style={{
                  height: 90,
                  borderRadius: 8,
                  marginBottom: 12,
                  background: `linear-gradient(135deg, ${s.background.color1}, ${s.background.color2})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: s.textColor,
                  fontWeight: 800,
                  fontSize: 20,
                  borderBottom: `4px solid ${s.accentColor}`,
                }}
              >
                {t.name}
              </div>
              <Group gap={6} mb={4}>
                <Badge size="sm" color="dark" variant="light">{p.format}</Badge>
                <Badge size="sm" color="dark" variant="light">{p.scenes.length} scènes</Badge>
              </Group>
              <Text size="sm" c="dimmed" mb="sm" style={{ minHeight: 40 }}>{t.description}</Text>
              <Button fullWidth variant="default" onClick={() => setDraft({ project: p, summary: `Modèle « ${t.name} » : modifiez textes, couleurs et médias dans l'éditeur.`, mode: "manuel" })}>
                Utiliser ce modèle
              </Button>
            </Card>
          );
        })}
      </SimpleGrid>

      <Title order={3} mb="sm">Mes projets</Title>
      {projects.length === 0 ? (
        <Text c="dimmed" mb="xl">Aucun projet pour l'instant.</Text>
      ) : (
        <Stack gap="xs" mb="xl">
          {projects.map((p) => (
            <Card key={p.id} withBorder padding="sm">
              <Group justify="space-between">
                <div>
                  <Text fw={600}>{p.title}</Text>
                  <Text size="xs" c="dimmed">
                    {p.format} · {p.scenes} scènes · modifié le {new Date(p.updatedAt).toLocaleString("fr-FR")}
                  </Text>
                </div>
                <Group gap="xs">
                  <Button size="xs" leftSection={<IconPlayerPlay size={14} />} onClick={() => openProjectRoute(p.id)}>Ouvrir</Button>
                  <Tooltip label="Supprimer le projet">
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label={`Supprimer ${p.title}`}
                      onClick={async () => {
                        if (!window.confirm(`Supprimer définitivement « ${p.title} » ?`)) return;
                        await api.deleteProject(p.id);
                        refresh();
                      }}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      )}

      <Accordion variant="contained" mb="xl">
        <Accordion.Item value="manuel">
          <Accordion.Control icon={<IconFileImport size={18} />}>
            Pas de clé API ? Utiliser Claude.ai (abonnement) par copier-coller
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text size="sm">
                Un abonnement Claude.ai (Pro, Max…) ne donne pas d'accès à l'API. Vous pouvez quand même utiliser Claude :
                1) écrivez votre description ci-dessus, 2) copiez le texte préparé, 3) collez-le dans une conversation sur claude.ai,
                4) recollez ici la réponse JSON. L'application la valide avant de l'accepter.
              </Text>
              <Group>
                <Button
                  variant="default"
                  disabled={prompt.trim().length < 5}
                  onClick={async () => {
                    const r = await api.manualPrompt(prompt, format);
                    setManualPromptText(r.text);
                  }}
                >
                  Préparer le texte pour Claude.ai
                </Button>
                {manualPromptText ? (
                  <CopyButton value={manualPromptText}>
                    {({ copied, copy }) => (
                      <Button color={copied ? "vert" : "dark"} leftSection={<IconCopy size={16} />} onClick={copy}>
                        {copied ? "Copié !" : "Copier le texte"}
                      </Button>
                    )}
                  </CopyButton>
                ) : null}
              </Group>
              <Textarea
                label="Réponse JSON de Claude"
                placeholder='{"version": 1, "title": "…", …}'
                minRows={5}
                autosize
                maxRows={14}
                value={manualJson}
                onChange={(e) => setManualJson(e.currentTarget.value)}
                styles={{ input: { fontFamily: "monospace", fontSize: 12 } }}
              />
              <Group justify="flex-end">
                <Button disabled={!manualJson.trim()} onClick={importManual}>Valider le JSON</Button>
              </Group>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="vide">
          <Accordion.Control>Commencer avec un projet vide</Accordion.Control>
          <Accordion.Panel>
            <Group>
              {(["16:9", "9:16", "1:1"] as VideoFormat[]).map((f) => (
                <Button key={f} variant="default" onClick={() => create({ ...emptyProject(f), title: `Projet ${f}` })}>
                  {FORMAT_LABELS[f]}
                </Button>
              ))}
            </Group>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Container>
  );
}

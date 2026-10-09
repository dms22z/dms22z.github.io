import { useCallback, useEffect, useState } from "react";
import { Alert, Center, Loader, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { api } from "./api";
import { Home } from "./components/Home";
import { Editor } from "./components/Editor";
import { useEditor } from "./store";

/** Navigation minimale par l'adresse : #/ (accueil) ou #/projet/<id> (éditeur). */
function readRoute(): string | null {
  const m = window.location.hash.match(/^#\/projet\/([a-z0-9-]+)$/);
  return m ? m[1] : null;
}

export function App() {
  const [routeId, setRouteId] = useState(readRoute());
  const projectId = useEditor((s) => s.projectId);
  const open = useEditor((s) => s.open);
  const close = useEditor((s) => s.close);
  const setMedia = useEditor((s) => s.setMedia);

  const [serverReady, setServerReady] = useState<boolean | "timeout">(false);

  // Le navigateur peut s'ouvrir avant que le serveur local ait fini de démarrer : on l'attend.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (let i = 0; i < 60 && !cancelled; i++) {
        try {
          await api.state();
          if (cancelled) return;
          setServerReady(true);
          api.listMedia().then(setMedia).catch(() => undefined);
          return;
        } catch {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      if (!cancelled) setServerReady("timeout");
    })();
    return () => {
      cancelled = true;
    };
  }, [setMedia]);

  useEffect(() => {
    const onHash = () => setRouteId(readRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (serverReady !== true) return;
    if (!routeId) {
      close();
      return;
    }
    if (routeId === projectId) return;
    api
      .getProject(routeId)
      .then((r) => open(r.id, r.project))
      .catch((e) => {
        notifications.show({ color: "red", title: "Impossible d'ouvrir le projet", message: e.message });
        window.location.hash = "#/";
      });
  }, [routeId, projectId, open, close, serverReady]);

  const goHome = useCallback(() => {
    window.location.hash = "#/";
  }, []);

  if (serverReady !== true) {
    return (
      <Center h="100%">
        <Stack align="center" gap="sm">
          {serverReady === "timeout" ? (
            <Alert color="red" title="Le serveur local ne répond pas" maw={480}>
              Vérifiez la fenêtre « Motion Studio » (demarrer.bat ou npm start) : elle doit rester ouverte. Lisez le message d'erreur
              qui s'y affiche, puis rechargez cette page.
            </Alert>
          ) : (
            <>
              <Loader color="vert" />
              <Text c="dimmed">Démarrage du serveur local…</Text>
            </>
          )}
        </Stack>
      </Center>
    );
  }
  if (!routeId) return <Home />;
  if (projectId !== routeId) {
    return (
      <Center h="100%">
        <Loader color="dark" />
      </Center>
    );
  }
  return <Editor onHome={goHome} />;
}

export const openProjectRoute = (id: string) => {
  window.location.hash = `#/projet/${id}`;
};

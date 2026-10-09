import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Html5Audio, interpolate, Sequence, useVideoConfig } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import type { TransitionPresentation } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { iris } from "@remotion/transitions/iris";
import { assetUrl, type CompositionProps, type Scene } from "../shared/schema";
import { computeTimings } from "../shared/timing";
import { loadFonts } from "./fonts";
import { PulseProvider } from "./pulse";
import { SceneRenderer } from "./SceneRenderer";
import { Subtitles } from "./Subtitles";

const DIR = { left: "from-left", right: "from-right", top: "from-top", bottom: "from-bottom" } as const;

function presentation(scene: Scene, width: number, height: number): TransitionPresentation<Record<string, unknown>> {
  const t = scene.transition;
  const p = (() => {
    switch (t.type) {
      case "slide":
        return slide({ direction: DIR[t.direction] });
      case "wipe":
        return wipe({ direction: DIR[t.direction] });
      case "flip":
        return flip({ direction: DIR[t.direction] });
      case "clock":
        return clockWipe({ width, height });
      case "iris":
        return iris({ width, height });
      default:
        return fade();
    }
  })();
  return p as unknown as TransitionPresentation<Record<string, unknown>>;
}

export const MainVideo: React.FC<CompositionProps> = ({ project, assetBaseUrl }) => {
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const [fontHandle] = useState(() => delayRender("Chargement des polices"));
  useEffect(() => {
    loadFonts(project.theme.headingFont, project.theme.font).then(() => continueRender(fontHandle));
  }, [fontHandle, project.theme.headingFont, project.theme.font]);

  const ctx = { headingFont: project.theme.headingFont, bodyFont: project.theme.font, assetBaseUrl };
  const timings = computeTimings(project);
  const music = project.music;
  const musicSrc = music ? assetUrl(assetBaseUrl, music.assetId) : null;
  const voice = project.voiceover;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      <PulseProvider music={music} src={musicSrc}>
        <TransitionSeries>
          {timings.map(({ scene, durationInFrames: d, transitionInFrames }) => (
            <React.Fragment key={scene.id}>
              {transitionInFrames > 0 ? (
                <TransitionSeries.Transition
                  presentation={presentation(scene, width, height)}
                  timing={linearTiming({ durationInFrames: transitionInFrames })}
                />
              ) : null}
              <TransitionSeries.Sequence durationInFrames={d} name={scene.type}>
                <SceneRenderer scene={scene} ctx={ctx} />
              </TransitionSeries.Sequence>
            </React.Fragment>
          ))}
        </TransitionSeries>
      </PulseProvider>
      <Subtitles project={project} />
      {music && musicSrc ? (
        <Html5Audio
          src={musicSrc}
          loop
          trimBefore={Math.round(music.startAt * fps)}
          volume={(f) =>
            music.volume *
            Math.min(
              interpolate(f, [0, Math.max(1, music.fadeIn * fps)], [0, 1], { extrapolateRight: "clamp" }),
              interpolate(f, [durationInFrames - Math.max(1, music.fadeOut * fps), durationInFrames], [1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            )
          }
        />
      ) : null}
      {voice ? (
        <Sequence from={Math.round(voice.startAt * fps)} layout="none">
          <Html5Audio src={assetUrl(assetBaseUrl, voice.assetId)} volume={voice.volume} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};

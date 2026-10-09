import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { SceneOf } from "../../shared/schema";
import { AnimatedText } from "../components/AnimatedText";
import { AccentBar, fitSize, headingStyle, SceneShell, type SceneProps } from "../components/SceneShell";
import { useUnit } from "../util";

export const TitleScene: React.FC<SceneProps<SceneOf<"title">>> = ({ scene, ctx }) => {
  const frame = useCurrentFrame();
  const { u, vertical } = useUnit();
  const size = fitSize((vertical ? 120 : 130) * u, scene.title, vertical ? 12 : 18);
  const subDelay = 14;
  const subOpacity = interpolate(frame, [subDelay + 6, subDelay + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <SceneShell scene={scene} ctx={ctx} align={scene.align}>
      <AnimatedText
        text={scene.title}
        animation={scene.animation}
        energy={scene.energy}
        style={{ ...headingStyle(ctx, size), maxWidth: "100%" }}
      />
      <AccentBar color={scene.accentColor} delay={10} align={scene.align} />
      {scene.subtitle ? (
        <div
          style={{
            fontSize: (vertical ? 46 : 44) * u,
            opacity: subOpacity * 0.9,
            transform: `translateY(${(1 - subOpacity) * 20 * u}px)`,
            fontWeight: 400,
            maxWidth: vertical ? "100%" : "80%",
            lineHeight: 1.3,
          }}
        >
          {scene.subtitle}
        </div>
      ) : null}
    </SceneShell>
  );
};

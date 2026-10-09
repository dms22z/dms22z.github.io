import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { SceneOf } from "../../shared/schema";
import { AnimatedText } from "../components/AnimatedText";
import { fitSize, headingStyle, SceneShell, type SceneProps } from "../components/SceneShell";
import { usePulse } from "../pulse";
import { alpha, ENERGY, luminance, useUnit } from "../util";

export const CtaScene: React.FC<SceneProps<SceneOf<"cta">>> = ({ scene, ctx }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, vertical } = useUnit();
  const pulse = usePulse();
  const cfg = ENERGY[scene.energy];
  const btn = spring({ frame: frame - 16, fps, config: { damping: 10, stiffness: 150 } });
  const breathe = 1 + Math.sin(frame / 8) * 0.02 * cfg.speed + pulse * 0.05;
  const url = interpolate(frame, [28, 42], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const onAccent = luminance(scene.accentColor) > 0.6 ? "#0A0A0A" : "#FFFFFF";
  return (
    <SceneShell scene={scene} ctx={ctx}>
      <AnimatedText text={scene.title} animation="rise" energy={scene.energy} style={headingStyle(ctx, fitSize((vertical ? 110 : 116) * u, scene.title, 16))} />
      {scene.buttonText ? (
        <div
          style={{
            marginTop: 60 * u,
            padding: `${28 * u}px ${70 * u}px`,
            borderRadius: 999,
            background: scene.accentColor,
            color: onAccent,
            fontSize: 50 * u,
            fontWeight: 800,
            transform: `scale(${btn * breathe})`,
            boxShadow: `0 0 ${(30 + pulse * 40) * u}px ${alpha(scene.accentColor, 0.5)}`,
          }}
        >
          {scene.buttonText}
        </div>
      ) : null}
      {scene.url ? <div style={{ marginTop: 36 * u, fontSize: 38 * u, opacity: url * 0.85, letterSpacing: "0.03em" }}>{scene.url}</div> : null}
    </SceneShell>
  );
};

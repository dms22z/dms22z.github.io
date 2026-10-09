import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { SceneOf } from "../../shared/schema";
import { headingStyle, SceneShell, type SceneProps } from "../components/SceneShell";
import { usePulse } from "../pulse";
import { alpha, ENERGY, useUnit } from "../util";

export const KineticScene: React.FC<SceneProps<SceneOf<"kinetic">>> = ({ scene, ctx }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { u, width, pad } = useUnit();
  const pulse = usePulse();
  const words = scene.words.length ? scene.words : [" "];
  const slot = Math.max(1, Math.floor(durationInFrames / words.length));
  const index = Math.min(words.length - 1, Math.floor(frame / slot));
  const local = frame - index * slot;
  const word = words[index];
  const cfg = ENERGY[scene.energy];
  const p = spring({ frame: local, fps, config: cfg.spring });
  const variant = index % 3;
  const transform =
    variant === 0
      ? `scale(${interpolate(p, [0, 1], [1.7, 1])})`
      : variant === 1
        ? `translateX(${(1 - p) * 40}%) skewX(${(1 - Math.min(p, 1)) * -12}deg)`
        : `translateY(${(1 - p) * 60}%) rotate(${(1 - Math.min(p, 1)) * 10}deg)`;
  const color = index % 2 === 0 ? scene.textColor : scene.accentColor;
  const available = width - pad * 2;
  const size = Math.min(230 * u, available / Math.max(2, word.length * 0.58));
  const flash = scene.energy === "calm" ? 0 : interpolate(local, [0, 6], [0.18, 0], { extrapolateRight: "clamp" });
  return (
    <SceneShell scene={scene} ctx={ctx}>
      <AbsoluteFill style={{ backgroundColor: alpha(scene.accentColor, flash) }} />
      <div
        style={{
          ...headingStyle(ctx, size * (1 + pulse * 0.04)),
          color,
          transform,
          opacity: Math.min(1, 0.35 + p * 2),
          textTransform: ctx.headingFont === "Anton" || ctx.headingFont === "Bebas Neue" ? "uppercase" : undefined,
          whiteSpace: "nowrap",
        }}
      >
        {word}
      </div>
    </SceneShell>
  );
};

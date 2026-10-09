import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { SceneOf } from "../../shared/schema";
import { AccentBar, headingStyle, SceneShell, type SceneProps } from "../components/SceneShell";
import { usePulse } from "../pulse";
import { ENERGY, formatNumber, useUnit } from "../util";

export const StatScene: React.FC<SceneProps<SceneOf<"stat">>> = ({ scene, ctx }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, width, pad } = useUnit();
  const pulse = usePulse();
  const cfg = ENERGY[scene.energy];
  const count = interpolate(frame, [0, Math.round((fps * 1.6) / cfg.speed)], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.exp),
  });
  const pop = spring({ frame, fps, config: cfg.spring });
  const text = `${scene.prefix}${formatNumber(scene.value * count, scene.decimals)}${scene.suffix}`;
  const finalText = `${scene.prefix}${formatNumber(scene.value, scene.decimals)}${scene.suffix}`;
  const size = Math.min(260 * u, (width - pad * 2) / Math.max(3, finalText.length * 0.6));
  const label = interpolate(frame, [18, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <SceneShell scene={scene} ctx={ctx}>
      <div style={{ ...headingStyle(ctx, size), color: scene.accentColor, fontVariantNumeric: "tabular-nums", transform: `scale(${interpolate(Math.min(pop, 1.2), [0, 1], [0.7, 1]) * (1 + pulse * 0.04)})`, whiteSpace: "nowrap" }}>
        {text}
      </div>
      <AccentBar color={scene.textColor} delay={12} width={120} />
      <div style={{ fontSize: 50 * u, opacity: label, transform: `translateY(${(1 - label) * 24 * u}px)`, maxWidth: "85%", lineHeight: 1.3 }}>{scene.label}</div>
    </SceneShell>
  );
};

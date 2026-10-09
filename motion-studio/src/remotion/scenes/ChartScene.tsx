import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import type { SceneOf } from "../../shared/schema";
import { AnimatedText } from "../components/AnimatedText";
import { AccentBar, fitSize, headingStyle, SceneShell, type SceneProps } from "../components/SceneShell";
import { alpha, ENERGY, formatNumber, useUnit } from "../util";

export const ChartScene: React.FC<SceneProps<SceneOf<"chart">>> = ({ scene, ctx }) => {
  const frame = useCurrentFrame();
  const { u, vertical } = useUnit();
  const cfg = ENERGY[scene.energy];
  const max = Math.max(...scene.items.map((i) => i.value), 1);
  const decimals = scene.items.some((i) => !Number.isInteger(i.value)) ? 1 : 0;
  const barH = Math.min(80 * u, (vertical ? 900 : 560) * u / scene.items.length - 24 * u);
  const growFrames = Math.round(40 / cfg.speed);

  return (
    <SceneShell scene={scene} ctx={ctx} align="left">
      <AnimatedText text={scene.heading} animation="rise" energy={scene.energy} style={headingStyle(ctx, fitSize((vertical ? 80 : 84) * u, scene.heading, 22))} />
      <AccentBar color={scene.accentColor} delay={8} align="left" />
      <div style={{ display: "flex", flexDirection: "column", gap: 24 * u, width: "100%", marginTop: 10 * u }}>
        {scene.items.map((item, i) => {
          const start = 14 + i * Math.round(6 / cfg.speed);
          const p = interpolate(frame, [start, start + growFrames], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          const ratio = item.value / max;
          return (
            <div key={i} style={{ display: "flex", flexDirection: vertical ? "column" : "row", alignItems: vertical ? "flex-start" : "center", gap: (vertical ? 8 : 24) * u }}>
              <div style={{ width: vertical ? "auto" : 260 * u, flex: "none", fontSize: 38 * u, fontWeight: 600, opacity: interpolate(frame, [start - 6, start], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
                {item.label}
              </div>
              <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "center", gap: 20 * u }}>
                <div style={{ flex: 1, height: barH, background: alpha(scene.textColor, 0.08), borderRadius: 14 * u, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.max(0.5, ratio * p * 100)}%`,
                      height: "100%",
                      borderRadius: 14 * u,
                      background: `linear-gradient(90deg, ${alpha(scene.accentColor, 0.7)}, ${scene.accentColor})`,
                    }}
                  />
                </div>
                <div style={{ width: 230 * u, flex: "none", fontSize: 40 * u, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                  {formatNumber(item.value * p, decimals)}
                  {scene.unit}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SceneShell>
  );
};

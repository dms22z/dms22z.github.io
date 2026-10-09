import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { SceneOf } from "../../shared/schema";
import { AnimatedText } from "../components/AnimatedText";
import { AccentBar, fitSize, headingStyle, SceneShell, type SceneProps } from "../components/SceneShell";
import { ENERGY, luminance, useUnit } from "../util";

export const BulletsScene: React.FC<SceneProps<SceneOf<"bullets">>> = ({ scene, ctx }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, vertical } = useUnit();
  const cfg = ENERGY[scene.energy];
  const gap = Math.round(12 / cfg.speed);
  const badgeText = luminance(scene.accentColor) > 0.6 ? "#0A0A0A" : "#FFFFFF";
  return (
    <SceneShell scene={scene} ctx={ctx} align="left">
      <AnimatedText text={scene.heading} animation="rise" energy={scene.energy} style={headingStyle(ctx, fitSize((vertical ? 92 : 96) * u, scene.heading, 20))} />
      <AccentBar color={scene.accentColor} delay={8} align="left" />
      <div style={{ display: "flex", flexDirection: "column", gap: 30 * u, marginTop: 10 * u }}>
        {scene.items.map((item, i) => {
          const p = spring({ frame: frame - 16 - i * gap, fps, config: cfg.spring });
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 28 * u, opacity: Math.min(1, p * 1.5), transform: `translateX(${(1 - p) * -80 * u}px)` }}>
              <div
                style={{
                  flex: "none",
                  width: 70 * u,
                  height: 70 * u,
                  borderRadius: 999,
                  background: scene.accentColor,
                  color: badgeText,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 34 * u,
                  transform: `scale(${p})`,
                }}
              >
                {i + 1}
              </div>
              <div style={{ fontSize: (vertical ? 50 : 52) * u, lineHeight: 1.25, fontWeight: 600 }}>{item}</div>
            </div>
          );
        })}
      </div>
    </SceneShell>
  );
};

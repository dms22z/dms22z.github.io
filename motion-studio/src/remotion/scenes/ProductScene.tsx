import React from "react";
import { Img, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { assetUrl, type SceneOf } from "../../shared/schema";
import { fitSize, headingStyle, SceneShell, type SceneProps } from "../components/SceneShell";
import { usePulse } from "../pulse";
import { alpha, ENERGY, luminance, useUnit } from "../util";

export const ProductScene: React.FC<SceneProps<SceneOf<"product">>> = ({ scene, ctx }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, vertical, width, height } = useUnit();
  const pulse = usePulse();
  const cfg = ENERGY[scene.energy];
  const img = spring({ frame, fps, config: cfg.spring });
  const float = Math.sin(frame / 20) * 10 * u;
  const visual = vertical ? Math.min(width * 0.7, height * 0.32) : height * 0.62;
  const priceP = spring({ frame: frame - 30 - scene.features.length * 8, fps, config: { damping: 9, stiffness: 160 } });
  const onAccent = luminance(scene.accentColor) > 0.6 ? "#0A0A0A" : "#FFFFFF";

  return (
    <SceneShell scene={scene} ctx={ctx}>
      <div style={{ display: "flex", flexDirection: vertical ? "column" : "row", alignItems: "center", gap: 70 * u, width: "100%", justifyContent: "center" }}>
        <div
          style={{
            width: visual,
            height: visual,
            flex: "none",
            borderRadius: 40 * u,
            background: `linear-gradient(145deg, ${alpha(scene.accentColor, 0.28)}, ${alpha(scene.textColor, 0.06)})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `translateY(${(1 - img) * 200 * u + float}px) scale(${0.8 + 0.2 * Math.min(1, img)})`,
            opacity: Math.min(1, img * 1.5),
            boxShadow: `0 ${40 * u}px ${80 * u}px ${alpha("#000000", 0.25)}`,
            overflow: "hidden",
          }}
        >
          {scene.assetId ? (
            <Img src={assetUrl(ctx.assetBaseUrl, scene.assetId)} style={{ width: "90%", height: "90%", objectFit: "contain" }} />
          ) : (
            <div style={{ ...headingStyle(ctx, visual * 0.4), color: scene.accentColor }}>{scene.name.slice(0, 1)}</div>
          )}
        </div>
        <div style={{ textAlign: vertical ? "center" : "left", maxWidth: vertical ? "100%" : "48%" }}>
          <div style={{ ...headingStyle(ctx, fitSize(100 * u, scene.name, 14)), opacity: Math.min(1, img), transform: `translateX(${(1 - img) * 60 * u}px)` }}>{scene.name}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 * u, marginTop: 30 * u, alignItems: vertical ? "center" : "flex-start" }}>
            {scene.features.map((f, i) => {
              const p = spring({ frame: frame - 18 - i * 8, fps, config: cfg.spring });
              return (
                <div key={i} style={{ fontSize: 42 * u, display: "flex", gap: 16 * u, alignItems: "center", opacity: Math.min(1, p), transform: `translateY(${(1 - p) * 20 * u}px)` }}>
                  <span style={{ color: scene.accentColor, fontWeight: 800 }}>✓</span>
                  {f}
                </div>
              );
            })}
          </div>
          {scene.price ? (
            <div
              style={{
                display: "inline-block",
                marginTop: 40 * u,
                padding: `${14 * u}px ${36 * u}px`,
                borderRadius: 999,
                background: scene.accentColor,
                color: onAccent,
                fontWeight: 800,
                fontSize: 52 * u,
                transform: `scale(${priceP * (1 + pulse * 0.05)})`,
              }}
            >
              {scene.price}
            </div>
          ) : null}
        </div>
      </div>
    </SceneShell>
  );
};

import React from "react";
import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { assetUrl, type SceneOf } from "../../shared/schema";
import { headingStyle, SceneShell, type SceneProps } from "../components/SceneShell";
import { usePulse } from "../pulse";
import { ENERGY, useUnit } from "../util";

export const LogoScene: React.FC<SceneProps<SceneOf<"logo">>> = ({ scene, ctx }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, width, height } = useUnit();
  const pulse = usePulse();
  const cfg = ENERGY[scene.energy];
  const p = spring({ frame, fps, config: cfg.spring });
  const ring = spring({ frame, fps, config: { damping: 200 }, durationInFrames: Math.round(35 / cfg.speed) });
  const size = Math.min(width, height) * 0.42;
  const r = size / 2 - 6 * u;
  const circumference = 2 * Math.PI * r;
  const tagline = interpolate(frame, [28, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shine = interpolate(frame, [20, 50], [-120, 220], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <SceneShell scene={scene} ctx={ctx}>
      <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${1 + pulse * 0.03})` }}>
        <svg width={size} height={size} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={scene.accentColor} strokeWidth={6 * u} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - ring)} strokeLinecap="round" />
        </svg>
        <div
          style={{
            width: size * 0.78,
            height: size * 0.78,
            borderRadius: "50%",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            clipPath: `circle(${Math.min(1, p) * 75}% at 50% 50%)`,
            transform: `scale(${interpolate(p, [0, 1], [0.6, 1])})`,
            position: "relative",
          }}
        >
          {scene.assetId ? (
            <Img src={assetUrl(ctx.assetBaseUrl, scene.assetId)} style={{ width: "85%", height: "85%", objectFit: "contain" }} />
          ) : (
            <div
              style={{
                ...headingStyle(ctx, Math.min(130 * u, (size * 0.78 * 0.8) / Math.max(3, scene.text.length * 0.85))),
                letterSpacing: `${interpolate(p, [0, 1], [0.5, 0.06])}em`,
                color: scene.textColor,
              }}
            >
              {scene.text}
            </div>
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(105deg, transparent ${shine - 30}%, rgba(255,255,255,0.35) ${shine}%, transparent ${shine + 30}%)`,
            }}
          />
        </div>
      </div>
      {scene.tagline ? (
        <div style={{ marginTop: 40 * u, fontSize: 44 * u, opacity: tagline, transform: `translateY(${(1 - tagline) * 20 * u}px)`, letterSpacing: "0.04em" }}>
          {scene.tagline}
        </div>
      ) : null}
    </SceneShell>
  );
};

import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Background as BackgroundSpec } from "../../shared/schema";
import { usePulse } from "../pulse";
import { alpha } from "../util";

export const Background: React.FC<{ spec: BackgroundSpec; accent: string }> = ({ spec, accent }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const pulse = usePulse();
  const t = frame / fps;

  if (spec.style === "solid") {
    return <AbsoluteFill style={{ backgroundColor: spec.color1 }} />;
  }

  if (spec.style === "gradient") {
    const angle = 135 + Math.sin(t * 0.4) * 20;
    return (
      <AbsoluteFill
        style={{ background: `linear-gradient(${angle}deg, ${spec.color1} 0%, ${spec.color2} 100%)` }}
      />
    );
  }

  if (spec.style === "radial") {
    const x = 50 + Math.sin(t * 0.5) * 12;
    const y = 40 + Math.cos(t * 0.4) * 10;
    const size = 70 + pulse * 8;
    return (
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${x}% ${y}%, ${spec.color2} 0%, ${spec.color1} ${size}%)`,
        }}
      >
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at ${100 - x}% ${100 - y}%, ${alpha(accent, 0.12 + pulse * 0.08)} 0%, transparent 45%)`,
          }}
        />
      </AbsoluteFill>
    );
  }

  // Grille animée
  const cell = Math.round(Math.min(width, height) / 12);
  const offset = interpolate(frame, [0, fps * 10], [0, cell], { extrapolateRight: "extend" }) % cell;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${spec.color1} 0%, ${spec.color2} 100%)` }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${alpha(accent, 0.09)} 1px, transparent 1px), linear-gradient(90deg, ${alpha(accent, 0.09)} 1px, transparent 1px)`,
          backgroundSize: `${cell}px ${cell}px`,
          backgroundPosition: `${offset}px ${offset}px`,
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, ${alpha(accent, 0.1 + pulse * 0.1)} 0%, transparent 55%)`,
        }}
      />
    </AbsoluteFill>
  );
};

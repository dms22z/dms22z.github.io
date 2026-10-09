import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { FontName, Scene } from "../../shared/schema";
import { Background } from "./Background";
import { fontStack, HEADING_WEIGHT } from "../fonts";
import { useUnit } from "../util";
import { usePulse } from "../pulse";

export type SceneContext = {
  headingFont: FontName;
  bodyFont: FontName;
  assetBaseUrl: string;
};

export type SceneProps<S extends Scene> = { scene: S; ctx: SceneContext };

export const SceneShell: React.FC<{
  scene: Scene;
  ctx: SceneContext;
  children: React.ReactNode;
  align?: "center" | "left";
  justify?: React.CSSProperties["justifyContent"];
}> = ({ scene, ctx, children, align = "center", justify = "center" }) => {
  const { pad, vertical } = useUnit();
  return (
    <AbsoluteFill>
      <Background spec={scene.background} accent={scene.accentColor} />
      <AbsoluteFill
        style={{
          padding: pad,
          // Zone de sécurité en vertical : l'interface TikTok/Reels masque le bas de l'écran.
          paddingBottom: vertical ? pad * 2.6 : pad,
          display: "flex",
          flexDirection: "column",
          alignItems: align === "center" ? "center" : "flex-start",
          justifyContent: justify,
          textAlign: align,
          color: scene.textColor,
          fontFamily: fontStack(ctx.bodyFont),
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const headingStyle = (ctx: SceneContext, fontSize: number): React.CSSProperties => ({
  fontFamily: fontStack(ctx.headingFont),
  fontWeight: HEADING_WEIGHT[ctx.headingFont],
  fontSize,
  lineHeight: 1.05,
  letterSpacing: ctx.headingFont === "Bebas Neue" || ctx.headingFont === "Anton" ? "0.01em" : "-0.02em",
  margin: 0,
});

/** Réduit la taille d'un texte long pour qu'il tienne à l'écran. */
export const fitSize = (base: number, text: string, comfortable = 18) =>
  base * Math.min(1, Math.pow(comfortable / Math.max(comfortable, text.length), 0.55));

export const AccentBar: React.FC<{ color: string; delay?: number; width?: number; align?: "center" | "left" }> = ({
  color,
  delay = 0,
  width = 160,
  align = "center",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useUnit();
  const pulse = usePulse();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        width: width * u * p,
        height: 10 * u * (1 + pulse * 0.5),
        background: color,
        borderRadius: 999,
        margin: align === "center" ? `${36 * u}px auto ${28 * u}px` : `${36 * u}px 0 ${28 * u}px`,
      }}
    />
  );
};

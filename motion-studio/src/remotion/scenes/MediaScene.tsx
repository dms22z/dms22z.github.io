import React from "react";
import { AbsoluteFill, Img, interpolate, OffthreadVideo, useCurrentFrame, useVideoConfig } from "remotion";
import { assetUrl, isVideoAsset, type SceneOf } from "../../shared/schema";
import { Background } from "../components/Background";
import type { SceneProps } from "../components/SceneShell";
import { fontStack } from "../fonts";
import { alpha, useUnit } from "../util";

export const MediaScene: React.FC<SceneProps<SceneOf<"media">>> = ({ scene, ctx }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { u, pad, vertical } = useUnit();
  const t = frame / Math.max(1, durationInFrames);
  const transform =
    scene.motion === "zoom-in"
      ? `scale(${interpolate(t, [0, 1], [1, 1.18])})`
      : scene.motion === "zoom-out"
        ? `scale(${interpolate(t, [0, 1], [1.18, 1])})`
        : `scale(1.15) translateX(${interpolate(t, [0, 1], [-5, 5])}%)`;
  const caption = interpolate(frame, [10, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const src = scene.assetId ? assetUrl(ctx.assetBaseUrl, scene.assetId) : null;
  const mediaStyle: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", transform };

  return (
    <AbsoluteFill style={{ fontFamily: fontStack(ctx.bodyFont) }}>
      <Background spec={scene.background} accent={scene.accentColor} />
      {src ? (
        isVideoAsset(scene.assetId!) ? <OffthreadVideo src={src} muted style={mediaStyle} /> : <Img src={src} style={mediaStyle} />
      ) : (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", color: scene.textColor, fontSize: 40 * u, opacity: 0.7 }}>
          Choisissez une image ou une vidéo dans la médiathèque
        </AbsoluteFill>
      )}
      {scene.caption ? (
        <AbsoluteFill style={{ justifyContent: "flex-end", padding: pad, paddingBottom: vertical ? pad * 2.6 : pad }}>
          <div
            style={{
              alignSelf: "flex-start",
              background: alpha(scene.background.color1, 0.85),
              color: scene.textColor,
              borderLeft: `${10 * u}px solid ${scene.accentColor}`,
              padding: `${20 * u}px ${32 * u}px`,
              fontSize: 46 * u,
              fontWeight: 600,
              opacity: caption,
              transform: `translateX(${(1 - caption) * -60 * u}px)`,
              maxWidth: "90%",
            }}
          >
            {scene.caption}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

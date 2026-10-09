import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Project } from "../shared/schema";
import { fontStack } from "./fonts";
import { useUnit } from "./util";

export const Subtitles: React.FC<{ project: Project }> = ({ project }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, vertical } = useUnit();
  if (!project.subtitles.enabled) return null;
  const t = frame / fps;
  const current = project.subtitles.items.find((s) => t >= s.start && t < s.end);
  if (!current) return null;
  const bottom = project.subtitles.position === "center";
  return (
    <AbsoluteFill
      style={{
        justifyContent: bottom ? "center" : "flex-end",
        alignItems: "center",
        paddingBottom: bottom ? 0 : (vertical ? 420 : 70) * u,
        paddingLeft: 60 * u,
        paddingRight: 60 * u,
      }}
    >
      <div
        style={{
          background: "rgba(0,0,0,0.72)",
          color: "#FFFFFF",
          fontFamily: fontStack(project.theme.font),
          fontWeight: 600,
          fontSize: (vertical ? 50 : 40) * u,
          lineHeight: 1.3,
          padding: `${10 * u}px ${24 * u}px`,
          borderRadius: 12 * u,
          textAlign: "center",
          maxWidth: "90%",
        }}
      >
        {current.text}
      </div>
    </AbsoluteFill>
  );
};

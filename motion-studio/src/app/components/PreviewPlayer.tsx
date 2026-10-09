import { forwardRef, useMemo } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { MainVideo } from "../../remotion/MainVideo";
import { DIMENSIONS, type CompositionProps, type Project } from "../../shared/schema";
import { totalFrames } from "../../shared/timing";

/** Aperçu vidéo : exactement les mêmes composants que le rendu MP4. */
export const PreviewPlayer = forwardRef<PlayerRef, { project: Project; controls?: boolean; autoPlay?: boolean; maxHeight?: string; initialFrame?: number }>(
  function PreviewPlayer({ project, controls = true, autoPlay = false, maxHeight = "100%", initialFrame = 0 }, ref) {
    const { width, height } = DIMENSIONS[project.format];
    const inputProps = useMemo<CompositionProps>(() => ({ project, assetBaseUrl: window.location.origin }), [project]);
    return (
      <Player
        ref={ref}
        component={MainVideo}
        inputProps={inputProps}
        durationInFrames={totalFrames(project)}
        compositionWidth={width}
        compositionHeight={height}
        fps={project.fps}
        controls={controls}
        autoPlay={autoPlay}
        initialFrame={Math.min(initialFrame, totalFrames(project) - 1)}
        loop
        clickToPlay
        doubleClickToFullscreen
        allowFullscreen
        acknowledgeRemotionLicense
        style={{ width: "100%", maxHeight, aspectRatio: `${width} / ${height}`, borderRadius: 8, overflow: "hidden", background: "#000" }}
      />
    );
  },
);

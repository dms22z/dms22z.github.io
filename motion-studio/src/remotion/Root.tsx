import React from "react";
import { Composition } from "remotion";
import { TEMPLATES } from "../shared/catalog";
import { COMPOSITION_ID, DIMENSIONS, type CompositionProps } from "../shared/schema";
import { totalFrames } from "../shared/timing";
import { MainVideo } from "./MainVideo";

const defaultProps: CompositionProps = {
  project: TEMPLATES[0].build(),
  assetBaseUrl: "http://127.0.0.1:3210",
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id={COMPOSITION_ID}
    component={MainVideo}
    defaultProps={defaultProps}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={300}
    // Les dimensions, la cadence et la durée découlent du projet passé en propriétés.
    calculateMetadata={({ props }) => ({
      ...DIMENSIONS[props.project.format],
      fps: props.project.fps,
      durationInFrames: totalFrames(props.project),
    })}
  />
);

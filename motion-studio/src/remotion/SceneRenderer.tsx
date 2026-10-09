import React from "react";
import type { Scene } from "../shared/schema";
import type { SceneContext } from "./components/SceneShell";
import { BulletsScene } from "./scenes/BulletsScene";
import { ChartScene } from "./scenes/ChartScene";
import { CtaScene } from "./scenes/CtaScene";
import { KineticScene } from "./scenes/KineticScene";
import { LogoScene } from "./scenes/LogoScene";
import { MediaScene } from "./scenes/MediaScene";
import { ProductScene } from "./scenes/ProductScene";
import { StatScene } from "./scenes/StatScene";
import { TitleScene } from "./scenes/TitleScene";

export const SceneRenderer: React.FC<{ scene: Scene; ctx: SceneContext }> = ({ scene, ctx }) => {
  switch (scene.type) {
    case "title":
      return <TitleScene scene={scene} ctx={ctx} />;
    case "kinetic":
      return <KineticScene scene={scene} ctx={ctx} />;
    case "bullets":
      return <BulletsScene scene={scene} ctx={ctx} />;
    case "logo":
      return <LogoScene scene={scene} ctx={ctx} />;
    case "product":
      return <ProductScene scene={scene} ctx={ctx} />;
    case "chart":
      return <ChartScene scene={scene} ctx={ctx} />;
    case "stat":
      return <StatScene scene={scene} ctx={ctx} />;
    case "media":
      return <MediaScene scene={scene} ctx={ctx} />;
    case "cta":
      return <CtaScene scene={scene} ctx={ctx} />;
  }
};

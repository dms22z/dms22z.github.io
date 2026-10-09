/**
 * Texte animé générique : découpe en mots ou en lettres et anime chaque
 * morceau avec un ressort (spring) dont l'intensité dépend de l'« énergie ».
 */
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Energy, TextAnimation } from "../../shared/schema";
import { ENERGY } from "../util";

type Props = {
  text: string;
  animation: TextAnimation;
  energy: Energy;
  delay?: number;
  style?: React.CSSProperties;
};

export const AnimatedText: React.FC<Props> = ({ text, animation, energy, delay = 0, style }) => {
  const frame = useCurrentFrame() - delay;
  const { fps } = useVideoConfig();
  const cfg = ENERGY[energy];

  if (animation === "typewriter") {
    const charsPerFrame = 0.9 * cfg.speed;
    const visible = Math.max(0, Math.floor(frame * charsPerFrame));
    const caretOn = Math.floor(frame / (fps / 2)) % 2 === 0 || visible < text.length;
    return (
      <div style={style}>
        {text.slice(0, visible)}
        <span style={{ opacity: caretOn ? 1 : 0, fontWeight: 300 }}>|</span>
      </div>
    );
  }

  const byLetter = animation === "letters";
  const parts = byLetter ? Array.from(text) : text.split(/(\s+)/);
  let index = 0;

  return (
    <div style={{ ...style, display: "block" }}>
      {parts.map((part, i) => {
        if (/^\s+$/.test(part)) return <span key={i}>{part}</span>;
        const k = index++;
        const progress = spring({
          frame: frame - k * (byLetter ? Math.max(1, cfg.stagger - 1) : cfg.stagger),
          fps,
          config: cfg.spring,
        });
        const clampProgress = Math.min(1, progress);
        let inner: React.CSSProperties = {};
        let outer: React.CSSProperties = { display: "inline-block" };
        switch (animation) {
          case "rise":
          case "letters":
            outer = { display: "inline-block", overflow: "hidden", verticalAlign: "bottom", paddingBottom: "0.08em" };
            inner = { display: "inline-block", transform: `translateY(${(1 - progress) * 110}%)` };
            break;
          case "zoom":
            inner = {
              display: "inline-block",
              transform: `scale(${interpolate(progress, [0, 1], [1.8, 1])})`,
              opacity: clampProgress,
              filter: `blur(${(1 - clampProgress) * 12}px)`,
            };
            break;
          case "words":
            inner = {
              display: "inline-block",
              transform: `scale(${progress}) rotate(${(1 - clampProgress) * -8}deg)`,
              opacity: clampProgress > 0.02 ? 1 : 0,
            };
            break;
          case "blur":
            inner = {
              display: "inline-block",
              opacity: clampProgress,
              filter: `blur(${(1 - clampProgress) * 20}px)`,
              transform: `translateY(${(1 - clampProgress) * 20}px)`,
            };
            break;
        }
        return (
          <span key={i} style={outer}>
            <span style={inner}>{part}</span>
          </span>
        );
      })}
    </div>
  );
};

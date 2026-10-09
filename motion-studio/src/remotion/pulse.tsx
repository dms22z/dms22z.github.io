/**
 * Synchronisation avec la musique : fournit une « pulsation » entre 0 et 1
 * pour l'image courante, utilisée par les scènes pour faire réagir les
 * éléments graphiques.
 *  - Si le tempo (BPM) est connu : pulsation exacte sur chaque temps.
 *  - Sinon : analyse des basses fréquences du fichier audio (@remotion/media-utils).
 */
import React, { createContext, useContext } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { useAudioData, visualizeAudio } from "@remotion/media-utils";
import type { Music } from "../shared/schema";

const PulseContext = createContext(0);
export const usePulse = () => useContext(PulseContext);

const BeatPulse: React.FC<{ music: Music; bpm: number; children: React.ReactNode }> = ({ music, bpm, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps + music.startAt;
  const period = 60 / bpm;
  const phase = (t % period) / period;
  return <PulseContext.Provider value={Math.exp(-phase * 7)}>{children}</PulseContext.Provider>;
};

const AudioPulse: React.FC<{ music: Music; src: string; children: React.ReactNode }> = ({ music, src, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audioData = useAudioData(src);
  let value = 0;
  if (audioData) {
    const bins = visualizeAudio({
      fps,
      frame: frame + Math.round(music.startAt * fps),
      audioData,
      numberOfSamples: 32,
    });
    const bass = (bins[0] + bins[1] + bins[2] + bins[3]) / 4;
    value = Math.min(1, bass * 4);
  }
  return <PulseContext.Provider value={value}>{children}</PulseContext.Provider>;
};

export const PulseProvider: React.FC<{ music: Music | null; src: string | null; children: React.ReactNode }> = ({
  music,
  src,
  children,
}) => {
  if (!music || !music.pulse || !src) return <PulseContext.Provider value={0}>{children}</PulseContext.Provider>;
  if (music.bpm) return <BeatPulse music={music} bpm={music.bpm}>{children}</BeatPulse>;
  return <AudioPulse music={music} src={src}>{children}</AudioPulse>;
};

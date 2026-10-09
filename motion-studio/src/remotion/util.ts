import { useVideoConfig } from "remotion";
import type { SpringConfig } from "remotion";
import type { Energy } from "../shared/schema";

/** Unité de taille : 1 en vertical/carré 1080 px de large, 1,2 en 1920×1080. */
export function useUnit() {
  const { width, height } = useVideoConfig();
  const u = Math.min(width, height * 1.2) / 1080;
  const vertical = height > width;
  const square = height === width;
  return { u, width, height, vertical, square, pad: (vertical ? 80 : 110) * u };
}

export const ENERGY: Record<Energy, { spring: Partial<SpringConfig>; stagger: number; speed: number; overshoot: number }> = {
  calm: { spring: { damping: 200, stiffness: 80, mass: 1 }, stagger: 5, speed: 0.75, overshoot: 0 },
  normal: { spring: { damping: 20, stiffness: 120, mass: 0.9 }, stagger: 3, speed: 1, overshoot: 0.5 },
  dynamic: { spring: { damping: 11, stiffness: 190, mass: 0.7 }, stagger: 2, speed: 1.4, overshoot: 1 },
};

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Mélange une couleur #RRGGBB avec de la transparence. */
export function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Luminosité perçue (0 = noir, 1 = blanc). */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

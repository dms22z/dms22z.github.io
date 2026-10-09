/**
 * Polices embarquées localement (paquets @fontsource) : aucun accès Internet
 * n'est nécessaire pendant le rendu, et le résultat est identique sous Windows.
 */
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/800.css";
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/montserrat/800.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/800.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/bebas-neue/400.css";
import "@fontsource/anton/400.css";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/dm-serif-display/400.css";
import type { FontName } from "../shared/schema";

/** Graisse « titre » disponible pour chaque police. */
export const HEADING_WEIGHT: Record<FontName, number> = {
  Inter: 800,
  Montserrat: 800,
  Poppins: 800,
  "Space Grotesk": 700,
  "Bebas Neue": 400,
  Anton: 400,
  "Playfair Display": 700,
  "DM Serif Display": 400,
};

export const BODY_WEIGHTS: Record<FontName, number[]> = {
  Inter: [400, 600],
  Montserrat: [400, 700],
  Poppins: [400, 600],
  "Space Grotesk": [400, 700],
  "Bebas Neue": [400],
  Anton: [400],
  "Playfair Display": [400, 700],
  "DM Serif Display": [400],
};

export const fontStack = (font: FontName) => `"${font}", "Segoe UI", Arial, sans-serif`;

/** Attend que les polices utilisées soient chargées (évite une police de secours sur les premières images). */
export async function loadFonts(heading: FontName, body: FontName): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const requests = [
    `${HEADING_WEIGHT[heading]} 64px "${heading}"`,
    ...BODY_WEIGHTS[body].map((w) => `${w} 32px "${body}"`),
  ];
  await Promise.all(requests.map((r) => document.fonts.load(r, "AÉaé0").catch(() => [])));
}

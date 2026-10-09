/**
 * Génère une piste musicale de démonstration (120 BPM, 32 secondes) entièrement
 * synthétisée par l'application : aucune question de droits d'auteur.
 * Grosse caisse sur chaque temps, charleston, basse et accords (la m – fa – do – sol).
 */
import fs from "node:fs";

const RATE = 44100;
const BPM = 120;
const SECONDS = 32;

export function writeDemoMusic(file: string) {
  const n = RATE * SECONDS;
  const data = new Float32Array(n);
  const beat = 60 / BPM;
  const chords = [
    [220.0, 261.63, 329.63], // la mineur
    [174.61, 220.0, 261.63], // fa majeur
    [261.63, 329.63, 392.0], // do majeur
    [196.0, 246.94, 293.66], // sol majeur
  ];
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const beatPos = t % beat;
    const beatIndex = Math.floor(t / beat);
    const bar = Math.floor(beatIndex / 4);
    const chord = chords[bar % 4];
    // Grosse caisse : sinus dont la fréquence chute rapidement
    const kf = 50 + 90 * Math.exp(-beatPos * 30);
    let s = Math.sin(2 * Math.PI * kf * beatPos) * Math.exp(-beatPos * 9) * 0.9;
    // Charleston sur les contretemps (bruit bref)
    const off = (t + beat / 2) % beat;
    s += (Math.random() * 2 - 1) * Math.exp(-off * 60) * 0.12;
    // Basse : fondamentale une octave plus bas, rythmée en croches
    const eighth = t % (beat / 2);
    s += Math.sin(2 * Math.PI * (chord[0] / 2) * t) * Math.exp(-eighth * 6) * 0.28;
    // Nappe d'accords douce
    const pad = chord.reduce((acc, f) => acc + Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 2 * t), 0);
    s += pad * 0.045 * (0.7 + 0.3 * Math.sin(2 * Math.PI * t * 0.25));
    // Fondu de sortie pour une boucle propre
    const fade = Math.min(1, (SECONDS - t) / 0.05);
    data[i] = Math.max(-1, Math.min(1, s * 0.8 * fade));
  }
  const buffer = Buffer.alloc(44 + n * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + n * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(RATE, 24);
  buffer.writeUInt32LE(RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buffer.writeInt16LE(Math.round(data[i] * 32767), 44 + i * 2);
  fs.writeFileSync(file, buffer);
}

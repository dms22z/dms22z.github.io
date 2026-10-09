// Shared math, materials and low-poly builders for the isometric world.
import * as THREE from "../vendor/three.module.min.js";

export { THREE };

export const W = 1920;
export const H = 1080;
export const ASPECT = W / H;

// ── math ────────────────────────────────────────────────────────────────
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const E = {
  lin: (x) => x,
  in: (x) => x * x * x,
  in2: (x) => x * x,
  out: (x) => 1 - Math.pow(1 - x, 3),
  out2: (x) => 1 - (1 - x) * (1 - x),
  inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  inOutS: (x) => x * x * (3 - 2 * x),
  outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  inOutExpo: (x) =>
    x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
  outBack: (x) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  },
  outBackBig: (x) => {
    const c1 = 2.8, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  },
  inBack: (x) => {
    const c1 = 1.70158;
    return (c1 + 1) * x * x * x - c1 * x * x;
  },
  outElastic: (x) =>
    x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -9 * x) * Math.sin((x * 9 - 0.75) * ((2 * Math.PI) / 3)) + 1,
};
// 0 → 1 pop with overshoot, starting at t0
export const pop = (t, t0, d = 0.5, ease = E.outBack) => (t <= t0 ? 0 : ease(seg(t, t0, t0 + d)));
// fade-in/fade-out window
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(seg(t, a, a + fi), 1 - seg(t, b - fo, b));
export const frac = (x) => x - Math.floor(x);

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// value noise (deterministic, no tables)
const h3 = (x, y, z) => frac(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453);
export function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const c = (dx, dy, dz) => h3(xi + dx, yi + dy, zi + dz);
  const x00 = lerp(c(0, 0, 0), c(1, 0, 0), u), x10 = lerp(c(0, 1, 0), c(1, 1, 0), u);
  const x01 = lerp(c(0, 0, 1), c(1, 0, 1), u), x11 = lerp(c(0, 1, 1), c(1, 1, 1), u);
  return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
}
export const fbm = (x, y, z) =>
  0.55 * vnoise(x, y, z) + 0.3 * vnoise(x * 2.03, y * 2.03, z * 2.03) + 0.15 * vnoise(x * 4.1, y * 4.1, z * 4.1);

// ── palette ─────────────────────────────────────────────────────────────
export const C = {
  snow: 0xf3f6fc,
  ice: 0xa9cdee,
  rock: 0x3a3f6b,
  rockDark: 0x2b2f55,
  red: 0xd42a3c,
  redDark: 0x9c1d2e,
  gold: 0xf3b23e,
  green: 0x1f7a55,
  greenDark: 0x175c42,
  greenLight: 0x34a06e,
  wood: 0x8a5a3c,
  woodLight: 0xb88257,
  cream: 0xf6ead3,
  skin: 0xf2c4a0,
  white: 0xf8f4ec,
  slate: 0x3f4670,
  asphalt: 0x4a5076,
  brick: 0xa8463a,
  window: 0xffc95e,
  brown: 0x86553a,
  black: 0x1d1b26,
  blue: 0x3d64b8,
};

// ── materials ───────────────────────────────────────────────────────────
const mats = new Map();
export function mat(color, o = {}) {
  const k = color + "|" + JSON.stringify(o);
  if (!mats.has(k)) mats.set(k, new THREE.MeshLambertMaterial({ color, flatShading: true, ...o }));
  return mats.get(k);
}
const basics = new Map();
export function glow(color, o = {}) {
  const k = color + "|" + JSON.stringify(o);
  if (!basics.has(k)) basics.set(k, new THREE.MeshBasicMaterial({ color, ...o }));
  return basics.get(k);
}

// ── geometry ────────────────────────────────────────────────────────────
export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.IcosahedronGeometry(1, 1),
  sphereHi: new THREE.SphereGeometry(1, 16, 12),
  cone7: new THREE.ConeGeometry(1, 1, 7),
  cone4: new THREE.ConeGeometry(1, 1, 4),
  cone10: new THREE.ConeGeometry(1, 1, 10),
  cyl8: new THREE.CylinderGeometry(1, 1, 1, 8),
  cyl16: new THREE.CylinderGeometry(1, 1, 1, 16),
};
// move pivots to the bottom so scale.y grows from the floor
GEO.cone7.translate(0, 0.5, 0);
GEO.cone4.translate(0, 0.5, 0);
GEO.cone10.translate(0, 0.5, 0);
GEO.cyl8.translate(0, 0.5, 0);
GEO.cyl16.translate(0, 0.5, 0);

export function group(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (parent) parent.add(g);
  return g;
}
export function mesh(parent, geo, m, x = 0, y = 0, z = 0, shadow = true) {
  const me = new THREE.Mesh(geo, m);
  me.position.set(x, y, z);
  me.castShadow = shadow;
  me.receiveShadow = true;
  parent.add(me);
  return me;
}
// box with its bottom face at y
export function box(parent, w, h, d, m, x = 0, y = 0, z = 0, shadow = true) {
  const me = mesh(parent, GEO.box, m, x, y + h / 2, z, shadow);
  me.scale.set(w, h, d);
  return me;
}
export function ball(parent, r, m, x = 0, y = 0, z = 0, hi = false, shadow = true) {
  const me = mesh(parent, hi ? GEO.sphereHi : GEO.sphere, m, x, y, z, shadow);
  me.scale.setScalar(r);
  return me;
}
export function cone(parent, r, h, m, x = 0, y = 0, z = 0, sides = 7, shadow = true) {
  const geo = sides === 4 ? GEO.cone4 : sides === 10 ? GEO.cone10 : GEO.cone7;
  const me = mesh(parent, geo, m, x, y, z, shadow);
  me.scale.set(r, h, r);
  return me;
}
export function cyl(parent, r, h, m, x = 0, y = 0, z = 0, hi = false, shadow = true) {
  const me = mesh(parent, hi ? GEO.cyl16 : GEO.cyl8, m, x, y, z, shadow);
  me.scale.set(r, h, r);
  return me;
}
const prisms = new Map();
// triangular prism, base on y=0, ridge along Z, centred on z
export function prismGeo(w, h, L) {
  const k = `${w}|${h}|${L}`;
  if (prisms.has(k)) return prisms.get(k);
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false });
  g.translate(0, 0, -L / 2);
  prisms.set(k, g);
  return g;
}

// gable roof with snow; ridge along X unless ridgeZ. Returns the roof group (pivot at eave level).
export function gableRoof(parent, span, rh, len, roofColor, wallColor, ridgeZ = false, y = 0) {
  const outer = group(parent, 0, y, 0);
  if (ridgeZ) outer.rotation.y = Math.PI / 2;
  const gable = mesh(outer, prismGeo(span, rh, len), mat(wallColor), 0, 0, 0);
  gable.rotation.y = Math.PI / 2; // prism ridge (local Z) → X
  const ang = Math.atan2(rh, span / 2);
  const sl = Math.hypot(span / 2, rh) + 0.45;
  for (const s of [-1, 1]) {
    const slab = group(outer, 0, rh / 2 + 0.08, (s * span) / 4);
    slab.rotation.x = s * ang;
    box(slab, len + 0.5, 0.22, sl, mat(roofColor), 0, -0.11, 0);
    box(slab, len + 0.36, 0.16, sl * 0.72, mat(C.snow), 0, 0.08, -s * sl * 0.12);
  }
  box(outer, len + 0.5, 0.18, 0.34, mat(C.snow), 0, rh - 0.02, 0);
  return outer;
}

// ── props ───────────────────────────────────────────────────────────────
const GIFT_COLS = [
  [C.red, C.gold],
  [C.green, C.white],
  [C.gold, C.red],
  [C.blue, C.gold],
  [C.white, C.red],
  [0x8f4fc4, C.gold],
  [0x2fa3a8, C.white],
];
export function gift(parent, s = 0.5, ci = 0, x = 0, y = 0, z = 0, shadow = true) {
  const g = group(parent, x, y, z);
  const [c, r] = GIFT_COLS[ci % GIFT_COLS.length];
  box(g, s, s * 0.8, s, mat(c), 0, 0, 0, shadow);
  box(g, s * 1.03, s * 0.83, s * 0.17, mat(r), 0, 0, 0, false);
  box(g, s * 0.17, s * 0.83, s * 1.03, mat(r), 0, 0, 0, false);
  const b1 = box(g, s * 0.42, s * 0.14, s * 0.14, mat(r), 0, s * 0.82, 0, false);
  b1.rotation.y = Math.PI / 4;
  const b2 = box(g, s * 0.42, s * 0.14, s * 0.14, mat(r), 0, s * 0.82, 0, false);
  b2.rotation.y = -Math.PI / 4;
  return g;
}

export function pine(parent, x, z, s = 1, shadow = true) {
  const g = group(parent, x, 0, z);
  box(g, 0.28 * s, 0.5 * s, 0.28 * s, mat(C.wood), 0, 0, 0, shadow);
  const layers = [
    [1.05, 1.5, 0.35],
    [0.8, 1.3, 1.15],
    [0.52, 1.1, 1.85],
  ];
  for (const [r, h, y] of layers) {
    cone(g, r * s, h * s, mat(C.green), 0, y * s, 0, 7, shadow);
    cone(g, r * 0.55 * s, h * 0.5 * s, mat(C.snow), 0, (y + h * 0.5) * s, 0, 7, false);
  }
  return g;
}

export function lamp(parent, x, z, h = 2.6) {
  const g = group(parent, x, 0, z);
  cyl(g, 0.07, h, mat(C.black), 0, 0, 0);
  box(g, 0.34, 0.06, 0.34, mat(C.black), 0, h, 0);
  ball(g, 0.2, glow(0xffe1a0), 0, h - 0.12, 0, false, false);
  return g;
}

export function snowman(parent, x, z, s = 1) {
  const g = group(parent, x, 0, z);
  ball(g, 0.55 * s, mat(C.snow), 0, 0.5 * s, 0, true);
  ball(g, 0.4 * s, mat(C.snow), 0, 1.2 * s, 0, true);
  ball(g, 0.28 * s, mat(C.snow), 0, 1.72 * s, 0, true);
  const n = cone(g, 0.06 * s, 0.32 * s, mat(0xf07a2a), 0.06 * s, 1.74 * s, 0.24 * s);
  n.rotation.x = Math.PI / 2;
  cyl(g, 0.24 * s, 0.05 * s, mat(C.black), 0, 1.92 * s, 0);
  cyl(g, 0.16 * s, 0.32 * s, mat(C.black), 0, 1.95 * s, 0);
  box(g, 0.62 * s, 0.1 * s, 0.14 * s, mat(C.red), 0, 1.45 * s, 0);
  return g;
}

export function elf(parent, x, z, rotY = 0, hat = C.red) {
  const g = group(parent, x, 0, z);
  g.rotation.y = rotY;
  const body = group(g);
  box(body, 0.13, 0.3, 0.13, mat(C.greenDark), -0.09, 0, 0);
  box(body, 0.13, 0.3, 0.13, mat(C.greenDark), 0.09, 0, 0);
  cone(body, 0.3, 0.6, mat(C.green), 0, 0.28, 0, 8);
  box(body, 0.42, 0.07, 0.42, mat(C.black), 0, 0.48, 0, false);
  ball(body, 0.17, mat(C.skin), 0, 1.02, 0);
  const ear1 = cone(body, 0.05, 0.16, mat(C.skin), 0.17, 0.98, 0, 4, false);
  ear1.rotation.z = -1.3;
  const ear2 = cone(body, 0.05, 0.16, mat(C.skin), -0.17, 0.98, 0, 4, false);
  ear2.rotation.z = 1.3;
  const h = cone(body, 0.19, 0.44, mat(hat), 0, 1.1, 0, 8);
  h.rotation.z = 0.25;
  ball(body, 0.065, mat(C.white), -0.11, 1.52, 0, false, false);
  box(body, 0.42, 0.07, 0.42, mat(C.white), 0, 1.09, 0, false);
  const armL = group(body, -0.26, 0.74, 0);
  box(armL, 0.09, 0.32, 0.09, mat(C.green), 0, -0.32, 0);
  const armR = group(body, 0.26, 0.74, 0);
  box(armR, 0.09, 0.32, 0.09, mat(C.green), 0, -0.32, 0);
  return { g, body, armL, armR };
}

export function santa(parent, x = 0, y = 0, z = 0) {
  const g = group(parent, x, y, z);
  cyl(g, 0.46, 0.75, mat(C.red), 0, 0, 0, true);
  ball(g, 0.44, mat(C.red), 0, 0.62, 0.08, true);
  cyl(g, 0.47, 0.12, mat(C.black), 0, 0.3, 0, true, false);
  box(g, 0.2, 0.16, 0.06, mat(C.gold), 0, 0.28, 0.46, false);
  box(g, 0.94, 0.12, 0.94, mat(C.white), 0, 0, 0, false);
  ball(g, 0.27, mat(C.skin), 0, 1.25, 0.05, true);
  ball(g, 0.27, mat(C.white), 0, 1.05, 0.14, true);
  const beard = cone(g, 0.26, 0.42, mat(C.white), 0, 1.1, 0.2, 8);
  beard.rotation.x = Math.PI;
  ball(g, 0.06, mat(0xe0806a), 0, 1.25, 0.31, false, false);
  const hat = cone(g, 0.27, 0.55, mat(C.red), 0, 1.38, 0, 10);
  hat.rotation.z = -0.35;
  cyl(g, 0.3, 0.1, mat(C.white), 0, 1.36, 0, true, false);
  ball(g, 0.09, mat(C.white), 0.2, 1.88, 0, false, false);
  for (const s of [-1, 1]) {
    const arm = group(g, s * 0.45, 0.82, 0.05);
    arm.rotation.x = -1.0;
    cyl(arm, 0.11, 0.5, mat(C.red), 0, -0.5, 0);
    ball(arm, 0.11, mat(C.black), 0, -0.52, 0, false, false);
  }
  return g;
}

export function reindeer(parent, rudolph = false) {
  const g = group(parent);
  const fur = mat(0x8c5a3b), dark = mat(0x5e3b27), tan = mat(0xe3c79a);
  const legs = [];
  for (const [lx, lz] of [[-0.15, 0.36], [0.15, 0.36], [-0.15, -0.36], [0.15, -0.36]]) {
    const leg = group(g, lx, 0.62, lz);
    box(leg, 0.1, 0.62, 0.1, dark, 0, -0.62, 0);
    legs.push(leg);
  }
  box(g, 0.44, 0.42, 1.05, fur, 0, 0.56, 0);
  box(g, 0.3, 0.3, 0.6, mat(0xd8b88e), 0, 0.5, 0.0, false);
  const neck = group(g, 0, 0.82, 0.42);
  neck.rotation.x = -0.45;
  box(neck, 0.24, 0.52, 0.24, fur, 0, 0, 0);
  const head = group(g, 0, 1.36, 0.66);
  box(head, 0.28, 0.28, 0.42, fur, 0, -0.14, 0.04);
  box(head, 0.2, 0.18, 0.2, tan, 0, -0.15, 0.28, false);
  ball(head, rudolph ? 0.085 : 0.05, rudolph ? glow(0xff3344) : mat(C.black), 0, -0.04, 0.39, false, false);
  for (const s of [-1, 1]) {
    const ant = group(head, s * 0.1, 0.1, -0.05);
    ant.rotation.z = s * -0.35;
    box(ant, 0.05, 0.42, 0.05, tan, 0, 0, 0, false);
    const b = box(ant, 0.05, 0.22, 0.05, tan, s * 0.08, 0.2, 0.0, false);
    b.rotation.z = s * -0.8;
    const b2 = box(ant, 0.05, 0.18, 0.05, tan, -s * 0.04, 0.3, 0.05, false);
    b2.rotation.x = -0.6;
    box(head, 0.06, 0.14, 0.12, fur, s * 0.17, -0.04, -0.1, false);
  }
  box(g, 0.48, 0.1, 0.12, mat(C.red), 0, 0.82, 0.38, false);
  ball(g, 0.07, mat(C.gold), 0, 0.78, 0.48, false, false);
  ball(g, 0.1, mat(C.white), 0, 0.85, -0.55, false, false);
  return { g, legs, head };
}

export function sleigh(parent) {
  const g = group(parent);
  const s = new THREE.Shape();
  s.moveTo(-1.55, 0.42);
  s.lineTo(1.05, 0.42);
  s.quadraticCurveTo(1.85, 0.42, 1.7, 1.15);
  s.lineTo(1.38, 1.12);
  s.quadraticCurveTo(1.32, 0.72, 0.8, 0.72);
  s.lineTo(-0.55, 0.72);
  s.quadraticCurveTo(-0.85, 0.75, -0.95, 1.5);
  s.quadraticCurveTo(-1.55, 1.62, -1.62, 1.1);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 1.5, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 1 });
  geo.translate(0, 0, -0.75);
  const body = mesh(g, geo, mat(C.red), 0, 0, 0);
  body.rotation.y = -Math.PI / 2; // shape +x → world +z (forward)
  // gold trim + seat
  box(g, 1.62, 0.08, 2.65, mat(C.gold), 0, 0.72, -0.25, false);
  box(g, 1.3, 0.25, 1.1, mat(0x5b1e2b), 0, 0.7, -0.75, false);
  // runners
  const pts = [
    new THREE.Vector3(0, 0.06, -1.75),
    new THREE.Vector3(0, 0.02, 0.6),
    new THREE.Vector3(0, 0.08, 1.6),
    new THREE.Vector3(0, 0.55, 2.05),
    new THREE.Vector3(0, 0.85, 1.8),
  ];
  const runnerGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.06, 6, false);
  for (const x of [-0.62, 0.62]) {
    mesh(g, runnerGeo, mat(C.gold), x, 0, 0, true);
    for (const z of [-1.2, 0.0, 1.0]) box(g, 0.08, 0.4, 0.08, mat(C.gold), x, 0.04, z, false);
  }
  const sack = group(g, 0, 0.8, -1.25);
  const sb = ball(sack, 1, mat(0x9b5a3a), 0, 0.55, 0, true);
  sb.scale.set(0.72, 0.72, 0.62);
  gift(sack, 0.42, 0, -0.2, 0.95, 0.05);
  gift(sack, 0.36, 3, 0.25, 1.0, -0.1);
  gift(sack, 0.3, 1, 0.02, 1.15, -0.15);
  return { g, sack };
}

// The full team: sleigh + Santa + 9 reindeer + reins. Forward = +Z.
export function team(parent) {
  const root = group(parent);
  const sl = sleigh(root);
  const santaG = santa(sl.g, 0, 0.62, -0.25);
  const deer = [];
  const slots = [
    [-0.55, 2.9], [0.55, 2.9],
    [-0.55, 4.25], [0.55, 4.25],
    [-0.55, 5.6], [0.55, 5.6],
    [-0.55, 6.95], [0.55, 6.95],
    [0, 8.35],
  ];
  slots.forEach(([x, z], i) => {
    const holder = group(root, x, 0, z);
    const r = reindeer(holder, i === 8);
    deer.push({ holder, ...r, phase: i * 0.7 });
  });
  const reins = group(root);
  for (const x of [-0.55, 0.55]) box(reins, 0.035, 0.035, 6.2, mat(C.gold), x, 0.92, 4.9, false);
  return { root, sleigh: sl, santa: santaG, deer, reins };
}

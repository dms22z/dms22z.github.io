// Scenes 2–4 — the North Pole campus: HQ, factory (cutaway interior), conveyor bridge, hangar, runway.
import {
  THREE, C, mat, glow, group, mesh, box, ball, cone, cyl, prismGeo, gableRoof, gift, pine, lamp, snowman, elf,
  rng, seg, E, pop, clamp, lerp, frac,
} from "./core.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Key timings (seconds) — mirrored by the DOM overlays.
export const T = {
  campusIn: 7.4,
  popHQ: 7.95, popFactory: 8.15, popHangar: 8.35, popPost: 8.55,
  factoryOpen: 14.75,
  hangarOpen: 25.0,
  sleigh: 26.6, deer: 27.9, sack: 29.4, slam: 31.55, takeoff: 32.25,
};

// conveyor bridge path (factory → hangar)
const BRIDGE = [V(2.2, 2.6, 10.8), V(9.6, 2.6, 10.8), V(9.6, 2.6, -5.0)];
const BRIDGE_LEN = 7.4 + 15.8;
function bridgeAt(s) {
  if (s < 7.4) return V(2.2 + s, 2.6, 10.8);
  return V(9.6, 2.6, 10.8 - (s - 7.4));
}

export function heroGiftPos(t) {
  // follows one gift from the wrapping arch to the hangar pile
  if (t < 23.2) return V(-1.2, 1.12, 10.8);
  if (t < 23.95) return V(lerp(-1.2, 1.6, E.inOutS(seg(t, 23.2, 23.95))), 1.12, 10.8);
  if (t < 24.25) {
    const k = E.inOutS(seg(t, 23.95, 24.25));
    return V(lerp(1.6, 2.2, k), lerp(1.12, 2.6, k), 10.8);
  }
  if (t < 25.05) return bridgeAt(E.inOutS(seg(t, 24.25, 25.05)) * 7.4);
  if (t < 25.95) return bridgeAt(7.4 + E.inOutS(seg(t, 25.05, 25.95)) * 15.8);
  const k = seg(t, 25.95, 26.35);
  return V(lerp(9.6, 9.9, k), 2.6 - E.in2(k) * 0.95 + Math.sin(k * Math.PI) * 0.6, lerp(-5, -6.6, k));
}

export function buildCampus(scene) {
  const root = group(scene, 0, 0, 0);
  const pops = []; // {obj, t0, d, mode}
  const P = (obj, t0, d = 0.55, mode = "y") => {
    pops.push({ obj, t0, d, mode });
    return obj;
  };

  // ── island slab ─────────────────────────────────────────────────────
  box(root, 46, 0.6, 46, mat(C.snow), 0, -0.6, 0, false);
  box(root, 45.2, 1.6, 45.2, mat(C.ice), 0, -2.2, 0, false);
  box(root, 43, 3.2, 43, mat(C.rock), 0, -5.4, 0, false);
  box(root, 39, 2, 39, mat(C.rockDark), 0, -7.4, 0, false);
  // footpaths
  const path = mat(0xd5def0);
  box(root, 2.2, 0.03, 13, path, -1.2, 0, -6.5, false);
  box(root, 10, 0.03, 2.2, path, -6, 0, -1.4, false);
  box(root, 2.2, 0.03, 6, path, -4, 0, 2.5, false);
  box(root, 11, 0.03, 2.2, path, 6.5, 0, -1.2, false);

  // ── candy-stripe north pole ─────────────────────────────────────────
  const pole = P(group(root, 0, 0, 0), 0, 0.01, "none");
  cyl(pole, 1.4, 0.3, mat(C.snow), 0, 0, 0, true);
  for (let i = 0; i < 10; i++) cyl(pole, 0.32, 0.5, mat(i % 2 ? C.white : C.red), 0, 0.3 + i * 0.5, 0, true);
  ball(pole, 0.55, mat(C.gold), 0, 5.55, 0, true);
  const poleTop = V(0, 5.55, 0);

  // ── HQ ──────────────────────────────────────────────────────────────
  const hq = P(group(root, -11, 0, -11), T.popHQ, 0.7);
  box(hq, 10, 5.2, 8, mat(C.cream));
  box(hq, 10.4, 0.5, 8.4, mat(C.woodLight), 0, 0, 0);
  gableRoof(hq, 8, 2.6, 10, C.red, C.cream, false, 5.2);
  for (const x of [-3.2, -1.1, 1.1, 3.2]) {
    box(hq, 0.9, 1.2, 0.1, glow(C.window), x, 1.2, 4.02, false);
    box(hq, 0.9, 1.2, 0.1, glow(C.window), x, 3.3, 4.02, false);
  }
  for (const z of [-2.2, 0, 2.2]) {
    box(hq, 0.1, 1.2, 0.9, glow(C.window), 5.02, 1.2, z, false);
    box(hq, 0.1, 1.2, 0.9, glow(C.window), 5.02, 3.3, z, false);
  }
  box(hq, 2, 2.4, 0.3, mat(C.redDark), 0, 0, 4.05, false);
  box(hq, 2.6, 0.3, 1.4, mat(C.woodLight), 0, 0, 4.6, false);
  // clock tower
  const tower = group(hq, 0, 6.8, 0);
  box(tower, 2.4, 2.6, 2.4, mat(C.cream));
  cyl(tower, 0.75, 0.12, mat(C.gold), 0, 1.4, 1.21, true).rotation.x = Math.PI / 2;
  cyl(tower, 0.75, 0.12, mat(C.gold), 1.21, 1.4, 0, true).rotation.z = -Math.PI / 2;
  const clockHandA = box(tower, 0.08, 0.55, 0.06, mat(C.black), 0, 1.4, 1.32, false);
  const clockHandB = box(tower, 0.08, 0.4, 0.06, mat(C.black), 0, 1.4, 1.34, false);
  const tr = cone(tower, 2.0, 2.2, mat(C.red), 0, 2.6, 0, 4);
  tr.rotation.y = Math.PI / 4;
  ball(tower, 0.25, mat(C.gold), 0, 4.9, 0);
  const hqTop = V(-11, 12.2, -11);

  // ── post office (letters arrive here) ───────────────────────────────
  const post = P(group(root, -16, 0, -0.5), T.popPost, 0.6);
  box(post, 4.5, 3, 4, mat(0xe9d6b8));
  gableRoof(post, 4, 1.6, 4.5, C.blue, 0xe9d6b8, true, 3);
  box(post, 1.2, 1.8, 0.1, mat(C.blue), 0, 0, 2.03, false);
  const mailbox = group(post, 1.8, 0, 2.8);
  box(mailbox, 0.12, 1.0, 0.12, mat(C.black));
  box(mailbox, 0.7, 0.6, 1.0, mat(C.red), 0, 1.0, 0);
  const postTop = V(-16, 5.2, -0.5);

  // ── factory ─────────────────────────────────────────────────────────
  const FX0 = -14, FX1 = 2, FZ0 = 5.5, FZ1 = 14.5, FH = 4.5;
  const fcx = (FX0 + FX1) / 2, fcz = (FZ0 + FZ1) / 2;
  const factory = P(group(root, 0, 0, 0), T.popFactory, 0.7);
  factory.position.set(0, 0, 0);
  const wallM = mat(C.brick), wallIn = mat(0xead9c2);
  // back walls (stay)
  box(factory, FX1 - FX0, FH, 0.3, wallM, fcx, 0, FZ0);
  box(factory, 0.3, FH, FZ1 - FZ0, wallM, FX0, 0, fcz);
  box(factory, FX1 - FX0 - 0.4, FH - 0.1, 0.05, wallIn, fcx, 0, FZ0 + 0.18, false);
  box(factory, 0.05, FH - 0.1, FZ1 - FZ0 - 0.4, wallIn, FX0 + 0.18, 0, fcz, false);
  // front walls (cut away) — pivot at the floor
  const wallFront = group(factory, fcx, 0, FZ1);
  box(wallFront, FX1 - FX0, FH, 0.3, wallM);
  for (let i = 0; i < 6; i++) box(wallFront, 1.4, 1.5, 0.1, glow(C.window), FX0 - fcx + 1.6 + i * 2.55, 1.6, 0.16, false);
  box(wallFront, 3, 3, 0.1, mat(C.slate), FX0 - fcx + 13.5, 0, 0.17, false);
  const wallRight = group(factory, FX1, 0, fcz);
  box(wallRight, 0.3, FH, FZ1 - FZ0, wallM);
  for (const z of [-2.6, 0, 2.6]) box(wallRight, 0.1, 1.5, 1.4, glow(C.window), 0.16, 1.6, z, false);
  // sign
  box(wallFront, 6, 0.9, 0.12, mat(C.green), 0, FH - 1.2, 0.2, false);
  // roof (lifts off)
  const roof = group(factory, fcx, FH, fcz);
  box(roof, FX1 - FX0 + 0.6, 0.35, FZ1 - FZ0 + 0.6, mat(C.slate));
  for (let i = 0; i < 4; i++) {
    const zz = -3.4 + i * 2.25;
    mesh(roof, prismGeo(2.25, 1.15, FX1 - FX0), mat(C.slate), 0, 0.35, zz).rotation.y = Math.PI / 2;
    box(roof, FX1 - FX0, 0.06, 0.9, glow(0x9fd6ff), 0, 0.95, zz - 0.35, false).rotation.x = -0.9;
    box(roof, FX1 - FX0 + 0.1, 0.12, 0.7, mat(C.snow), 0, 1.15, zz + 0.4, false).rotation.x = 0.7;
  }
  const chimneys = [];
  for (const x of [-4.5, 2.5]) {
    const ch = group(roof, x, 0.35, -3.6);
    cyl(ch, 0.55, 3.6, mat(C.brick), 0, 0, 0, true);
    cyl(ch, 0.62, 0.3, mat(C.snow), 0, 3.6, 0, true);
    chimneys.push({ g: ch, top: V(x, 4.3, 0) });
  }
  const factoryTop = V(fcx, FH + 2, fcz);

  // factory interior (visible once the roof lifts)
  const inside = group(root);
  box(inside, FX1 - FX0 - 0.4, 0.06, FZ1 - FZ0 - 0.4, mat(0x8f9bb8), fcx, 0, fcz, false);
  for (const z of [10.0, 11.6]) box(inside, FX1 - FX0 - 1, 0.07, 0.1, mat(C.gold), fcx, 0, z, false);
  // belt
  const BELT_Z = 10.8, BELT_Y = 0.95, BX0 = -13.4, BX1 = 1.8;
  box(inside, BX1 - BX0, 0.12, 1.2, mat(0x262a40), (BX0 + BX1) / 2, BELT_Y - 0.12, BELT_Z);
  box(inside, BX1 - BX0, 0.75, 1.0, mat(C.slate), (BX0 + BX1) / 2, 0.08, BELT_Z);
  for (const z of [BELT_Z - 0.64, BELT_Z + 0.64]) box(inside, BX1 - BX0, 0.16, 0.08, mat(C.gold), (BX0 + BX1) / 2, BELT_Y - 0.1, z, false);
  const beltMarks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.02, 1.0), glow(0x4a5277), 40);
  inside.add(beltMarks);
  // letter hopper + sorter
  const sorter = group(inside, -12, 0, 7.2);
  box(sorter, 2.4, 1.9, 2.0, mat(C.blue));
  box(sorter, 2.6, 0.5, 2.2, mat(C.gold), 0, 1.9, 0);
  box(sorter, 1.8, 0.7, 1.4, mat(0x1b2240), 0, 2.4, 0, false);
  const sorterLights = [];
  for (let i = 0; i < 4; i++) sorterLights.push(box(sorter, 0.22, 0.22, 0.06, glow(i % 2 ? 0x5cf08a : 0xff5b5b), -0.75 + i * 0.5, 1.2, 1.03, false));
  const letters = [];
  const letterM = mat(C.white), stampM = mat(C.red);
  for (let i = 0; i < 14; i++) {
    const lg = group(inside);
    box(lg, 0.55, 0.04, 0.38, letterM, 0, 0, 0, false);
    box(lg, 0.12, 0.05, 0.1, stampM, 0.17, 0.01, -0.1, false);
    letters.push(lg);
  }
  // stations
  const holo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), new THREE.MeshBasicMaterial({ color: 0x7fd8ff, wireframe: true }));
  const st1 = group(inside, -10, 0, 9.0);
  box(st1, 1.6, 1.0, 1.0, mat(C.woodLight));
  box(st1, 1.5, 0.06, 1.0, mat(0x3a6fd0), 0, 1.02, 0, false).rotation.x = -0.35;
  holo.position.set(-10, 2.4, BELT_Z);
  inside.add(holo);
  cone(inside, 0.5, 0.25, glow(0x7fd8ff, { transparent: true, opacity: 0.35 }), -10, 1.75, BELT_Z, 10, false);
  const st2 = group(inside, -6, 0, 9.0);
  box(st2, 1.0, 1.2, 1.0, mat(C.slate));
  const arm = group(st2, 0, 1.25, 0);
  box(arm, 0.3, 1.2, 0.3, mat(C.gold), 0, 0, 0);
  const fore = group(arm, 0, 1.15, 0);
  box(fore, 0.25, 1.2, 0.25, mat(C.gold), 0, 0, 0);
  box(fore, 0.5, 0.35, 0.5, mat(C.red), 0, 1.15, 0);
  const st3 = group(inside, -2, 0, BELT_Z);
  for (const z of [-0.85, 0.85]) box(st3, 0.25, 2.4, 0.25, mat(C.red), 0, 0, z);
  box(st3, 0.4, 0.35, 2.0, mat(C.red), 0, 2.4, 0);
  const spoolA = cyl(st3, 0.32, 0.4, mat(C.gold), 0, 2.75, -0.45, true);
  spoolA.rotation.x = Math.PI / 2;
  const spoolB = cyl(st3, 0.32, 0.4, mat(C.green), 0, 2.75, 0.45, true);
  spoolB.rotation.x = Math.PI / 2;
  // workers
  const elves = [];
  const elfSpots = [[-10.6, 9.6, 0.4], [-9.2, 12.0, Math.PI], [-6.8, 9.6, 0.2], [-5.2, 12.0, Math.PI], [-2.9, 12.0, Math.PI + 0.3], [-1.0, 9.5, 0], [-12.2, 9.0, 0.9]];
  elfSpots.forEach(([x, z, r], i) => elves.push({ ...elf(inside, x, z, r, i % 2 ? C.red : C.green), phase: i * 1.3 }));
  // belt items: hologram → toy → wrapped gift
  const items = [];
  const ITEM_N = 12;
  const toyCols = [C.red, C.blue, C.gold, C.green, 0x8f4fc4];
  for (let i = 0; i < ITEM_N; i++) {
    const ig = group(inside, 0, BELT_Y, BELT_Z);
    const raw = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0x7fd8ff, wireframe: true }));
    raw.position.y = 0.27;
    ig.add(raw);
    const toy = group(ig);
    if (i % 3 === 0) {
      box(toy, 0.6, 0.25, 0.36, mat(toyCols[i % 5]), 0, 0.08, 0);
      box(toy, 0.34, 0.2, 0.32, mat(C.white), -0.05, 0.33, 0);
      for (const [x, z] of [[-0.2, 0.2], [0.2, 0.2], [-0.2, -0.2], [0.2, -0.2]]) cyl(toy, 0.09, 0.06, mat(C.black), x, 0.09, z).rotation.x = Math.PI / 2;
    } else if (i % 3 === 1) {
      box(toy, 0.36, 0.36, 0.3, mat(toyCols[(i + 1) % 5]), 0, 0, 0);
      box(toy, 0.26, 0.24, 0.24, mat(C.white), 0, 0.36, 0);
      ball(toy, 0.04, glow(0x5cf08a), 0, 0.72, 0, false, false);
      box(toy, 0.03, 0.14, 0.03, mat(C.black), 0, 0.6, 0, false);
    } else {
      ball(toy, 0.22, mat(C.woodLight), 0, 0.2, 0);
      ball(toy, 0.16, mat(C.woodLight), 0, 0.52, 0);
      ball(toy, 0.06, mat(C.woodLight), 0.11, 0.66, 0, false, false);
      ball(toy, 0.06, mat(C.woodLight), -0.11, 0.66, 0, false, false);
      box(toy, 0.3, 0.06, 0.06, mat(C.red), 0, 0.38, 0.12, false);
    }
    const wrapped = gift(ig, 0.55, i, 0, 0, 0);
    items.push({ ig, raw, toy, wrapped });
  }
  // pallets near the exit
  for (let i = 0; i < 9; i++) gift(inside, 0.6, i + 2, 0.4 + (i % 3) * 0.7, Math.floor(i / 3) * 0.5, 6.6 + ((i * 5) % 3) * 0.7);
  const stationAnchors = [V(-10, 3.2, BELT_Z), V(-6, 3.5, BELT_Z), V(-2, 3.6, BELT_Z)];

  // ── conveyor bridge ─────────────────────────────────────────────────
  const bridge = group(root);
  box(bridge, 7.6, 0.3, 1.3, mat(C.slate), 5.9, 2.25, 10.8);
  box(bridge, 1.3, 0.3, 16.2, mat(C.slate), 9.6, 2.25, 2.9);
  for (const x of [3.5, 6.5]) box(bridge, 0.3, 2.25, 0.3, mat(C.black), x, 0, 10.8);
  for (const z of [10.8, 7.5, 4.2, 0.9, -2.4]) box(bridge, 0.3, 2.25, 0.3, mat(C.black), 9.6, 0, z);
  box(bridge, 7.6, 0.1, 0.08, mat(C.gold), 5.9, 2.55, 10.2, false);
  box(bridge, 7.6, 0.1, 0.08, mat(C.gold), 5.9, 2.55, 11.4, false);
  box(bridge, 0.08, 0.1, 16.2, mat(C.gold), 9.0, 2.55, 2.9, false);
  box(bridge, 0.08, 0.1, 16.2, mat(C.gold), 10.2, 2.55, 2.9, false);
  const BG = 16;
  const bridgeGifts = [];
  for (let i = 0; i < BG; i++) bridgeGifts.push(gift(bridge, 0.55, i + 1, 0, 0, 0));
  const hero = gift(root, 0.72, 2, 0, 0, 0);

  // ── hangar ──────────────────────────────────────────────────────────
  const HX0 = 7.8, HX1 = 18.2, HZ0 = -15, HZ1 = -3;
  const hcx = (HX0 + HX1) / 2, hcz = (HZ0 + HZ1) / 2;
  const hangar = P(group(root, 0, 0, 0), T.popHangar, 0.7);
  box(hangar, HX1 - HX0, 0.12, HZ1 - HZ0, mat(0x9aa3c2), hcx, 0, hcz, false);
  box(hangar, HX1 - HX0, 4.2, 0.3, mat(C.cream), hcx, 0, HZ0);
  const backArc = mesh(hangar, new THREE.CircleGeometry(5.2, 18, 0, Math.PI), mat(C.cream, { side: THREE.DoubleSide }), hcx, 4.2, HZ0 + 0.16);
  backArc.receiveShadow = true;
  box(hangar, 0.3, 4.2, HZ1 - HZ0, mat(C.cream), HX0, 0, hcz);
  const hWallR = group(hangar, HX1, 0, hcz);
  box(hWallR, 0.3, 4.2, HZ1 - HZ0, mat(C.cream));
  for (const z of [-3.6, 0, 3.6]) box(hWallR, 0.1, 1.2, 2.2, glow(C.window), 0.16, 1.8, z, false);
  const hRoof = group(hangar, hcx, 4.2, hcz);
  const vault = new THREE.Mesh(
    new THREE.CylinderGeometry(5.35, 5.35, HZ1 - HZ0 + 0.4, 16, 1, true, -Math.PI / 2, Math.PI),
    mat(C.red, { side: THREE.DoubleSide }),
  );
  vault.rotation.x = -Math.PI / 2;
  vault.castShadow = true;
  hRoof.add(vault);
  for (const z of [-5.5, -1.8, 1.8, 5.5]) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(5.38, 0.12, 5, 20, Math.PI), mat(C.white));
    rib.position.z = z;
    hRoof.add(rib);
  }
  const snowCap = new THREE.Mesh(
    new THREE.CylinderGeometry(5.42, 5.42, HZ1 - HZ0 + 0.3, 16, 1, true, -Math.PI / 4, Math.PI / 2),
    mat(C.snow, { side: THREE.DoubleSide }),
  );
  snowCap.rotation.x = -Math.PI / 2;
  hRoof.add(snowCap);
  const frontArch = new THREE.Mesh(new THREE.TorusGeometry(5.3, 0.3, 6, 22, Math.PI), mat(C.white));
  frontArch.position.set(0, 0, HZ1 + 0.1 - hcz);
  hRoof.add(frontArch);
  for (const x of [HX0 + 0.15, HX1 - 0.15]) box(hangar, 0.6, 4.2, 0.6, mat(C.white), x, 0, HZ1 + 0.1);
  // pile of gifts under the conveyor end
  const pile = group(hangar, 9.9, 0, -6.6);
  const pr = rng(9);
  for (let i = 0; i < 16; i++) {
    const layer = i < 9 ? 0 : i < 14 ? 1 : 2;
    const k = i < 9 ? i : i < 14 ? i - 9 : i - 14;
    const n = layer === 0 ? 3 : 2;
    gift(pile, 0.62, i + 3, ((k % n) - (n - 1) / 2) * 0.7 + (pr() - 0.5) * 0.12, layer * 0.5, (Math.floor(k / n) - 1) * 0.7 + layer * 0.3, true).rotation.y = pr() - 0.5;
  }
  const hangarTop = V(hcx, 9.8, hcz);
  // flying gifts into the sack
  const STREAM = 36;
  const stream = [];
  for (let i = 0; i < STREAM; i++) stream.push(gift(root, 0.5, i, 0, 0, 0, false));

  // ── runway ──────────────────────────────────────────────────────────
  const runway = group(root);
  box(runway, 4.2, 0.05, 25, mat(C.asphalt), 13, 0, 9.2, false);
  for (let i = 0; i < 10; i++) box(runway, 0.25, 0.06, 1.2, glow(0xf8f4ec), 13, 0, -1 + i * 2.4, false);
  const runLights = [];
  for (let i = 0; i < 12; i++)
    for (const x of [10.7, 15.3]) runLights.push({ m: ball(runway, 0.13, glow(0xffd36b), x, 0.12, -2.4 + i * 2.1, false, false), i });
  const runwayAnchor = V(13, 0.5, 16);

  // ── trees, lamps, snowmen, walking elves ────────────────────────────
  const blocked = [
    [-17, -5, -16, -6], [-15, 3, 4.5, 15.5], [7, 19, -16, -2], [10, 16, -3, 22], [-19, -12.5, -3.5, 2.5],
    [1, 11, 9.4, 12.4], [8.5, 11, -3, 12], [-2.5, 2.5, -2.5, 2.5], [-2.5, 0, -14, 0], [-12, 0, -2.6, -0.2],
  ];
  const free = (x, z) => blocked.every(([a, b, c, d]) => x < a || x > b || z < c || z > d) && Math.abs(x) < 21.5 && Math.abs(z) < 21.5;
  const tr2 = rng(31);
  const trees = [];
  for (let i = 0; i < 400 && trees.length < 46; i++) {
    const x = tr2() * 43 - 21.5, z = tr2() * 43 - 21.5;
    if (!free(x, z)) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 2.2)) continue;
    const s = 0.75 + tr2() * 0.55;
    trees.push({ x, z, s, g: pine(root, x, z, s), t0: 8.3 + tr2() * 1.6 });
  }
  trees.forEach((t) => P(t.g, t.t0, 0.5, "all"));
  for (const [x, z] of [[2.6, 2.6], [-2.6, -4], [5, -2.6], [-6, 2.6], [-3, -9], [6.5, 4]]) P(lamp(root, x, z), 9.0, 0.4, "y");
  P(snowman(root, 4.5, 4.5, 1), 9.4, 0.6, "all");
  P(snowman(root, -18, 8, 0.9), 9.6, 0.6, "all");
  const walkers = [];
  const walkPaths = [
    [V(-1.2, 0, -1.8), V(-1.2, 0, -6.5)],
    [V(-3, 0, -1.4), V(-10, 0, -1.4)],
    [V(2, 0, -1.2), V(8.5, 0, -1.2)],
    [V(-4, 0, 1.2), V(-4, 0, 4.6)],
    [V(5, 0, 1.0), V(5, 0, 6)],
  ];
  walkPaths.forEach((p, i) => walkers.push({ ...elf(root, 0, 0, 0, i % 2 ? C.green : C.red), p, speed: 0.22 + i * 0.03, phase: i * 0.37 }));
  // letters flying in to the post office
  const flyLetters = [];
  for (let i = 0; i < 12; i++) {
    const lg = group(root);
    box(lg, 0.7, 0.05, 0.48, letterM, 0, 0, 0, false);
    box(lg, 0.16, 0.06, 0.13, stampM, 0.22, 0.01, -0.12, false);
    flyLetters.push(lg);
  }

  const tmp = new THREE.Object3D();
  const insideVisible = (t) => t > T.factoryOpen - 0.2 && t < 27;

  return {
    root,
    anchors: { poleTop, hqTop, postTop, factoryTop, hangarTop, runwayAnchor, stationAnchors },
    roof, wallFront, wallRight,
    update(t) {
      // pop-ins
      for (const p of pops) {
        if (p.mode === "none") continue;
        const k = p.t0 <= 0 ? 1 : pop(t, p.t0, p.d, p.mode === "all" ? E.outBack : E.outBackBig);
        const s = Math.max(0.0001, k);
        if (p.mode === "all") p.obj.scale.setScalar(s * (p.obj.userData.s || 1));
        else p.obj.scale.set(1, s, 1);
        p.obj.visible = k > 0.001;
      }
      // HQ clock
      clockHandA.rotation.z = -t * 0.9;
      clockHandB.rotation.z = -t * 0.075;

      // factory cutaway
      const ro = E.inBack(seg(t, T.factoryOpen, T.factoryOpen + 0.85));
      roof.position.y = FH + ro * 16;
      roof.rotation.z = ro * 0.25;
      roof.visible = ro < 0.98;
      const wf = 1 - E.inOut(seg(t, T.factoryOpen + 0.15, T.factoryOpen + 0.75)) * 0.94;
      wallFront.scale.y = wf;
      wallRight.scale.y = wf;
      inside.visible = insideVisible(t);
      if (inside.visible) {
        // belt texture motion
        for (let i = 0; i < 40; i++) {
          tmp.position.set(BX0 + frac(i / 40 + t * 0.075) * (BX1 - BX0), BELT_Y + 0.005, BELT_Z);
          tmp.rotation.set(0, 0, 0);
          tmp.scale.set(1, 1, 1);
          tmp.updateMatrix();
          beltMarks.setMatrixAt(i, tmp.matrix);
        }
        beltMarks.instanceMatrix.needsUpdate = true;
        // letters into the hopper
        letters.forEach((lg, i) => {
          const ph = frac(t * 0.55 + i / letters.length);
          lg.position.set(-12 + Math.sin(i * 2.1) * 0.6, 8.5 - ph * 5.8, 7.2 + Math.cos(i * 1.3) * 0.4);
          lg.rotation.set(Math.sin(t * 3 + i) * 0.6, t * 2 + i, Math.cos(t * 2.5 + i) * 0.5);
          lg.visible = ph < 0.97;
        });
        sorterLights.forEach((m, i) => m.scale.setScalar(0.6 + 0.4 * (Math.sin(t * 8 + i * 1.6) > 0 ? 1 : 0.2)));
        holo.rotation.set(t * 0.8, t * 1.3, 0);
        arm.rotation.z = Math.sin(t * 5.5) * 0.25 - 0.15;
        fore.rotation.z = Math.max(0, Math.sin(t * 5.5)) * -0.9 + 0.5;
        spoolA.rotation.y = t * 4;
        spoolB.rotation.y = -t * 4;
        elves.forEach((e) => {
          const b = Math.abs(Math.sin(t * 6 + e.phase));
          e.body.position.y = b * 0.06;
          e.armL.rotation.x = Math.sin(t * 7 + e.phase) * 0.9 - 0.6;
          e.armR.rotation.x = Math.cos(t * 7 + e.phase) * 0.9 - 0.6;
        });
        items.forEach((it, i) => {
          const x = BX0 + 0.3 + frac(t * 0.075 + i / ITEM_N) * (BX1 - BX0 - 0.6);
          it.ig.position.x = x;
          const stage = x < -9.4 ? 0 : x < -1.8 ? 1 : 2;
          it.raw.visible = stage === 0;
          it.toy.visible = stage === 1;
          it.wrapped.visible = stage === 2;
          const d = Math.min(Math.abs(x + 9.4), Math.abs(x + 1.8));
          const s = 1 + 0.35 * Math.exp(-d * d * 18);
          it.ig.scale.setScalar(s);
          it.raw.rotation.y = t * 1.5 + i;
        });
      }
      // bridge gifts
      const bridgeOn = t > 9.0;
      bridgeGifts.forEach((g, i) => {
        const s = frac(t * 0.09 + i / BG) * BRIDGE_LEN;
        g.position.copy(bridgeAt(s));
        g.rotation.y = s * 0.0;
        g.visible = bridgeOn;
        g.scale.setScalar(Math.min(1, seg(s, 0, 0.8)) * Math.min(1, seg(BRIDGE_LEN - s, 0, 0.8)) + 0.0001);
      });
      // hero gift
      hero.visible = t > 23.15 && t < 26.4;
      hero.position.copy(heroGiftPos(t));
      hero.rotation.y = Math.sin(t * 2) * 0.2;
      // hangar cutaway
      const hr = E.inBack(seg(t, T.hangarOpen, T.hangarOpen + 0.9));
      hRoof.position.y = 4.2 + hr * 18;
      hRoof.rotation.x = hr * 0.2;
      hRoof.visible = hr < 0.98;
      hWallR.scale.y = 1 - E.inOut(seg(t, T.hangarOpen + 0.2, T.hangarOpen + 0.8)) * 0.94;
      // gifts flying into the sack (sack world pos is provided by main via userData)
      const sackPos = this.sackWorld || V(13, 2, -13);
      stream.forEach((g, i) => {
        const t0 = T.sack + 0.15 + Math.pow(i / STREAM, 0.75) * 1.95;
        const k = seg(t, t0, t0 + 0.62);
        g.visible = k > 0 && k < 1;
        if (!g.visible) return;
        const from = V(9.9 + (i % 3) * 0.3 - 0.3, 1.8, -6.6 + (i % 4) * 0.25);
        const p = from.clone().lerp(sackPos, E.inOutS(k));
        p.y += Math.sin(k * Math.PI) * (3.2 + (i % 5) * 0.4);
        g.position.copy(p);
        g.rotation.set(k * 6 + i, k * 4, i);
        g.scale.setScalar(1 - 0.5 * E.in2(k));
      });
      // runway chase lights
      runLights.forEach(({ m, i }) => m.scale.setScalar(0.13 * (0.55 + 0.9 * Math.pow(frac(-t * 1.4 + i / 12), 6))));
      // walkers
      walkers.forEach((w) => {
        const u = frac(t * w.speed + w.phase);
        const k = u < 0.5 ? u * 2 : 2 - u * 2;
        w.g.position.copy(w.p[0]).lerp(w.p[1], E.inOutS(k));
        const dir = w.p[1].clone().sub(w.p[0]).multiplyScalar(u < 0.5 ? 1 : -1);
        w.g.rotation.y = Math.atan2(dir.x, dir.z);
        w.body.position.y = Math.abs(Math.sin(t * 9 + w.phase * 5)) * 0.08;
        w.armL.rotation.x = Math.sin(t * 9 + w.phase) * 0.7;
        w.armR.rotation.x = -Math.sin(t * 9 + w.phase) * 0.7;
        w.g.visible = t > 9.2;
      });
      // letters flying in
      flyLetters.forEach((lg, i) => {
        const ph = frac(t * 0.28 + i / flyLetters.length);
        const from = V(-34 + Math.sin(i * 3.1) * 6, 13 + Math.cos(i) * 2, 14 + Math.sin(i * 1.7) * 10);
        const to = V(-16, 4.2, -0.5);
        const p = from.clone().lerp(to, E.inOutS(ph));
        p.y += Math.sin(ph * Math.PI) * 3;
        lg.position.copy(p);
        lg.rotation.set(Math.sin(t * 2 + i) * 0.5, t * 1.5 + i, Math.cos(t * 2 + i) * 0.4);
        lg.visible = t > 9.6 && ph < 0.96;
      });
      root.updateMatrixWorld(true);
      return chimneys.map((c) => c.g.localToWorld(V(0, 4.0, 0)));
    },
  };
}

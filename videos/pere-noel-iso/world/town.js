// Scenes 6–7 — the last mile: a sleeping town, the hero house cut away, delivery through the chimney.
import { THREE, C, mat, glow, group, mesh, box, ball, cone, cyl, gableRoof, gift, pine, lamp, snowman, rng, seg, E, pop, clamp, lerp, frac } from "./core.js";

export const TOWN_O = new THREE.Vector3(400, 0, 0);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const TT = {
  cut: 44.75, // roof lifts
  drop: 45.65, // gift appears at chimney top
  fire: 46.55, // gift pops out of the fireplace
  tree: 47.2, // gift lands under the tree
  cookies: 49.3,
  delivered: 50.85,
  dawn: 51.6,
};

// hero house local frame (inside town group)
export const HERO = V(3.5, 0, 6.5);
const HW = 7, HD = 6, HH = 3.6;
// chimney shaft column (house local) on the -x wall
const CH = V(-HW / 2 + 0.55, 0, -0.9);

export function chimneyTopWorld() {
  return TOWN_O.clone().add(HERO).add(V(CH.x, HH + 2.9, CH.z));
}
export function heroCenterWorld() {
  return TOWN_O.clone().add(HERO).add(V(0, 1.4, 0));
}

export function buildTown(scene) {
  const root = group(scene, TOWN_O.x, TOWN_O.y, TOWN_O.z);
  box(root, 44, 0.6, 44, mat(C.snow), 0, -0.6, 0, false);
  box(root, 43.2, 1.6, 43.2, mat(C.ice), 0, -2.2, 0, false);
  box(root, 41, 3.4, 41, mat(C.rock), 0, -5.6, 0, false);
  // street
  box(root, 44, 0.04, 4.6, mat(C.asphalt), 0, 0, 0, false);
  for (let i = 0; i < 11; i++) box(root, 1.4, 0.05, 0.2, glow(0xdfe5f5), -20 + i * 4, 0, 0, false);
  box(root, 44, 0.12, 0.5, mat(C.snow), 0, 0, 2.55, false);
  box(root, 44, 0.12, 0.5, mat(C.snow), 0, 0, -2.55, false);

  const chimTops = [];
  const winMats = [];
  const house = (x, z, wall, roofC, w = 5, d = 4.5, h = 3, face = 1) => {
    const g = group(root, x, 0, z);
    box(g, w, h, d, mat(wall));
    gableRoof(g, d, d * 0.42, w, roofC, wall, false, h);
    const wm = new THREE.MeshBasicMaterial({ color: 0xffc95e });
    winMats.push(wm);
    for (const wx of [-w * 0.25, w * 0.25]) box(g, 0.8, 0.9, 0.08, wm, wx, h * 0.38, (face * d) / 2 + face * 0.02, false);
    box(g, 0.08, 0.9, 0.8, wm, w / 2 + 0.02, h * 0.38, 0, false);
    if (face === 1) box(g, 0.9, 1.6, 0.1, mat(C.redDark), 0, 0, d / 2 + 0.03, false);
    const ch = group(g, w * 0.28, h + 0.6, -d * 0.18);
    box(ch, 0.6, 1.5, 0.6, mat(C.brick));
    box(ch, 0.72, 0.16, 0.72, mat(C.snow), 0, 1.5, 0);
    chimTops.push(V(x + w * 0.28, h + 2.3, z - d * 0.18));
    return g;
  };
  house(-15, -7, 0xd9604f, C.slate);
  house(-8, -7, 0x5d86c9, C.red);
  house(-1, -7, 0xf0c35a, C.slate);
  house(6, -7, 0x6bbf8a, C.redDark);
  house(13, -7, 0xe58fb0, C.slate);
  house(-13, 7, 0x9b7fd1, C.red, 5, 4.5, 3, -1);
  house(-5.5, 7, 0x5fb3c4, C.slate, 5, 4.5, 3, -1);
  house(13.5, 7, 0xe08f4a, C.slate, 5, 4.5, 3, -1);

  // ── hero house ──────────────────────────────────────────────────────
  const hero = group(root, HERO.x, HERO.y, HERO.z);
  const wallC = 0xf3e2c4;
  const paper = mat(0xf6e9d2), paperDark = mat(0xe8d6b8);
  box(hero, HW, 0.12, HD, mat(0xb07a4f), 0, 0, 0);
  for (let i = 0; i < 7; i++) box(hero, 0.04, 0.13, HD - 0.1, mat(0x8e5f3b), -HW / 2 + 0.5 + i, 0, 0, false);
  cyl(hero, 1.6, 0.04, mat(0xb8323f), 0.4, 0.13, 0.6, true, false);
  // back walls (stay)
  box(hero, HW, HH, 0.22, mat(wallC), 0, 0, -HD / 2);
  box(hero, HW - 0.3, HH - 0.05, 0.05, paper, 0, 0.1, -HD / 2 + 0.14, false);
  box(hero, 0.22, HH, HD, mat(wallC), -HW / 2, 0, 0);
  box(hero, 0.05, HH - 0.05, HD - 0.3, paperDark, -HW / 2 + 0.14, 0.1, 0, false);
  for (let i = 0; i < 6; i++) box(hero, 0.12, HH - 0.2, 0.03, mat(0xead2ad), -HW / 2 + 0.8 + i * 1.1, 0.1, -HD / 2 + 0.18, false);
  box(hero, HW - 0.3, 0.12, 0.06, mat(0xa86d48), 0, 1.0, -HD / 2 + 0.18, false);
  // back window: night → dawn
  const winBack = new THREE.MeshBasicMaterial({ color: 0x1d2b5c });
  box(hero, 1.5, 1.3, 0.06, winBack, 1.6, 1.6, -HD / 2 + 0.2, false);
  box(hero, 1.66, 0.1, 0.12, mat(C.white), 1.6, 1.55, -HD / 2 + 0.22, false);
  box(hero, 0.08, 1.3, 0.1, mat(C.white), 1.6, 1.6, -HD / 2 + 0.23, false);
  // wall clock (shows 06:59 → 07:00)
  const clock = group(hero, -1.2, 2.55, -HD / 2 + 0.24);
  cyl(clock, 0.36, 0.08, mat(C.white), 0, 0, 0, true, false).rotation.x = Math.PI / 2;
  cyl(clock, 0.4, 0.06, mat(C.wood), 0, -0.02, 0, true, false).rotation.x = Math.PI / 2;
  const hourH = group(clock, 0, 0, 0.1);
  box(hourH, 0.06, 0.2, 0.03, mat(C.black), 0, 0, 0, false);
  const minH = group(clock, 0, 0, 0.12);
  box(minH, 0.04, 0.3, 0.03, mat(C.black), 0, 0, 0, false);

  // fireplace + open chimney shaft
  const fp = group(hero, CH.x, 0, CH.z);
  box(fp, 1.0, 1.7, 2.2, mat(C.brick), -0.1, 0, 0);
  box(fp, 0.1, 0.95, 1.2, mat(0x1a1214), 0.42, 0.12, 0, false);
  box(fp, 1.25, 0.16, 2.5, mat(C.wood), 0, 1.7, 0);
  const flames = [];
  for (let i = 0; i < 3; i++) flames.push(cone(fp, 0.16 - i * 0.02, 0.5, glow(i === 1 ? 0xffd04a : 0xff7a2a), 0.25, 0.14, -0.3 + i * 0.3, 7, false));
  box(fp, 0.5, 0.12, 0.9, mat(C.wood), 0.2, 0.12, 0, false);
  for (const z of [-0.75, 0, 0.75]) {
    const st = group(fp, 0.55, 1.15, z);
    box(st, 0.08, 0.5, 0.26, mat(z === 0 ? C.green : C.red), 0, 0, 0, false);
    box(st, 0.1, 0.12, 0.3, mat(C.white), 0, 0.48, 0, false);
    box(st, 0.08, 0.16, 0.36, mat(z === 0 ? C.green : C.red), 0, 0, 0.12, false);
  }
  // shaft: only the back panels so we can see inside
  const shaftM = mat(0x9a3f33);
  box(fp, 0.12, HH - 1.86, 1.0, shaftM, -0.42, 1.86, 0);
  box(fp, 0.9, HH - 1.86, 0.12, shaftM, 0, 1.86, -0.5);
  box(fp, 0.5, HH - 1.86, 0.08, mat(0x6e2d25), 0, 1.86, -0.44, false);
  // exterior chimney top (lifts with the roof)
  const roofG = group(hero, 0, HH, 0);
  gableRoof(roofG, HD, HD * 0.42, HW, C.red, wallC, false, 0);
  const chTop = group(roofG, CH.x, 0.2, CH.z);
  box(chTop, 1.0, 2.6, 1.0, mat(C.brick));
  box(chTop, 1.16, 0.2, 1.16, mat(C.snow), 0, 2.6, 0);
  // christmas tree
  const tree = group(hero, 1.9, 0, -1.7);
  box(tree, 0.5, 0.35, 0.5, mat(C.red), 0, 0, 0);
  box(tree, 0.18, 0.4, 0.18, mat(C.wood), 0, 0.3, 0);
  for (const [r, h, y] of [[1.0, 1.1, 0.55], [0.78, 0.95, 1.2], [0.55, 0.8, 1.8]]) cone(tree, r, h, mat(C.greenLight), 0, y, 0, 8);
  const star = mesh(tree, new THREE.OctahedronGeometry(0.2, 0), glow(C.gold), 0, 2.72, 0, false);
  const bulbs = [];
  const br = rng(12);
  const bulbCols = [0xff4d5e, 0xffd04a, 0x6fd3ff, 0x8cf08a, 0xff9ce0];
  for (let i = 0; i < 18; i++) {
    const a = br() * Math.PI * 2, hgt = 0.7 + br() * 1.7, rad = (1 - (hgt - 0.55) / 2.1) * 0.95;
    bulbs.push(ball(tree, 0.07, glow(bulbCols[i % 5]), Math.cos(a) * rad, hgt, Math.sin(a) * rad, false, false));
  }
  // armchair + sleeping cat
  const chair = group(hero, -0.4, 0, 1.4);
  chair.rotation.y = -1.1;
  box(chair, 1.3, 0.5, 1.1, mat(C.green), 0, 0, 0);
  box(chair, 1.3, 1.0, 0.25, mat(C.green), 0, 0.5, -0.45);
  box(chair, 0.22, 0.45, 1.1, mat(C.greenDark), -0.6, 0.5, 0);
  box(chair, 0.22, 0.45, 1.1, mat(C.greenDark), 0.6, 0.5, 0);
  const cat = group(chair, 0, 0.5, 0.05);
  const catB = ball(cat, 0.3, mat(0xf0a64a), 0, 0.18, 0, true);
  catB.scale.set(0.34, 0.2, 0.26);
  ball(cat, 0.15, mat(0xf0a64a), 0.28, 0.2, 0.1, true);
  cone(cat, 0.05, 0.12, mat(0xf0a64a), 0.24, 0.32, 0.05, 4, false);
  cone(cat, 0.05, 0.12, mat(0xf0a64a), 0.33, 0.32, 0.16, 4, false);
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 6, 12, Math.PI), mat(0xf0a64a));
  tail.position.set(-0.05, 0.08, 0.1);
  tail.rotation.x = Math.PI / 2;
  cat.add(tail);
  // little table, milk & cookies
  const table = group(hero, -1.7, 0, 2.0);
  cyl(table, 0.5, 0.06, mat(C.woodLight), 0, 0.7, 0, true);
  cyl(table, 0.07, 0.7, mat(C.wood), 0, 0, 0, false);
  cyl(table, 0.3, 0.03, mat(C.white), 0.08, 0.76, 0.1, true, false);
  const cookies = [];
  for (let i = 0; i < 3; i++) {
    const ck = cyl(table, 0.09, 0.04, mat(0xc98a4b), 0.08 + Math.cos(i * 2.1) * 0.13, 0.79, 0.1 + Math.sin(i * 2.1) * 0.13, true, false);
    cookies.push(ck);
  }
  const glass = cyl(table, 0.09, 0.3, new THREE.MeshLambertMaterial({ color: 0xcfe3ff, transparent: true, opacity: 0.35 }), -0.22, 0.76, -0.12, true, false);
  void glass;
  const milk = cyl(table, 0.08, 0.26, mat(C.white), -0.22, 0.77, -0.12, true, false);
  // front walls (cut away) with windows
  const wallF = group(hero, 0, 0, HD / 2);
  box(wallF, HW, HH, 0.22, mat(wallC));
  for (const x of [-1.8, 1.8]) box(wallF, 1.1, 1.1, 0.08, glow(0xffc95e), x, 1.4, 0.12, false);
  box(wallF, 1.0, 2.0, 0.1, mat(C.redDark), 0, 0, 0.13, false);
  const wallR = group(hero, HW / 2, 0, 0);
  box(wallR, 0.22, HH, HD, mat(wallC));
  box(wallR, 0.08, 1.1, 1.3, glow(0xffc95e), 0.12, 1.4, -1.2, false);
  box(wallR, 0.08, 1.1, 1.3, glow(0xffc95e), 0.12, 1.4, 1.4, false);

  // delivered gifts
  const heroGift = gift(hero, 0.6, 0, 0, 0, 0);
  const extra = [gift(hero, 0.5, 3, 1.1, 0, -0.7), gift(hero, 0.45, 1, 2.7, 0, -0.85), gift(hero, 0.55, 5, 2.4, 0, -0.1)];
  // soot puff
  const soot = [];
  for (let i = 0; i < 7; i++) soot.push(ball(hero, 0.2, new THREE.MeshLambertMaterial({ color: 0x5a5560, transparent: true, opacity: 0.6, flatShading: true }), 0, 0, 0, false, false));

  // trees, lamps, snowmen across town
  const r = rng(58);
  const spots = [];
  for (let i = 0; i < 300 && spots.length < 26; i++) {
    const x = r() * 40 - 20, z = r() * 40 - 20;
    if (Math.abs(z) < 3.6) continue;
    if (Math.abs(z - 7) < 3.4 && [-13, -5.5, 3.5, 13.5].some((hx) => Math.abs(x - hx) < (hx === 3.5 ? 4.4 : 3.2))) continue;
    if (Math.abs(z + 7) < 3.2 && [-15, -8, -1, 6, 13].some((hx) => Math.abs(x - hx) < 3.2)) continue;
    if (spots.some(([a, b]) => Math.hypot(a - x, b - z) < 2.3)) continue;
    spots.push([x, z]);
    pine(root, x, z, 0.75 + r() * 0.45);
  }
  for (let i = 0; i < 6; i++) {
    lamp(root, -17 + i * 7, 3.2);
    lamp(root, -13.5 + i * 7, -3.2);
  }
  snowman(root, 8.8, 11, 0.9);
  snowman(root, -9.5, -12, 0.8);

  const tmpV = V(0, 0, 0);
  return {
    root,
    chimTops: () => chimTops.map((p) => TOWN_O.clone().add(p)),
    heroChimTop: () => chimneyTopWorld(),
    anchors: {
      chimney: () => TOWN_O.clone().add(HERO).add(V(CH.x, HH + 0.4, CH.z)),
      cat: () => TOWN_O.clone().add(HERO).add(V(-0.2, 1.7, 1.5)),
      tree: () => TOWN_O.clone().add(HERO).add(V(1.9, 3.2, -1.7)),
    },
    update(t) {
      // cutaway
      const k = E.inBack(seg(t, TT.cut, TT.cut + 0.85));
      roofG.position.y = HH + k * 20;
      roofG.rotation.z = -k * 0.3;
      roofG.visible = k < 0.98;
      const wf = 1 - E.inOut(seg(t, TT.cut + 0.1, TT.cut + 0.7)) * 0.95;
      wallF.scale.y = wf;
      wallR.scale.y = wf;
      // fire flicker
      flames.forEach((f, i) => {
        const fl = 0.75 + 0.25 * Math.sin(t * 13 + i * 2) + 0.12 * Math.sin(t * 31 + i);
        f.scale.set(0.16 - i * 0.02, 0.5 * fl, 0.16 - i * 0.02);
      });
      bulbs.forEach((b, i) => b.scale.setScalar(0.07 * (0.65 + 0.45 * Math.max(0, Math.sin(t * 3 + i * 1.7)))));
      star.rotation.y = t * 1.2;
      star.scale.setScalar(1 + 0.12 * Math.sin(t * 4));
      // cat breathing
      catB.scale.set(0.34, 0.2 + 0.015 * Math.sin(t * 2.4), 0.26);
      // gift: chimney top → fireplace → under the tree
      const top = V(CH.x, HH + 2.9, CH.z), mouth = V(CH.x + 0.55, 0.12, CH.z), under = V(1.15, 0.0, -0.95);
      heroGift.visible = t > TT.drop;
      if (t < TT.fire) {
        const f = E.in2(seg(t, TT.drop, TT.fire));
        heroGift.position.copy(top).lerp(V(CH.x, 0.2, CH.z), f);
        heroGift.rotation.set(0, f * 2, 0);
        heroGift.scale.setScalar(Math.max(0.0001, pop(t, TT.drop, 0.25)));
      } else {
        const f = seg(t, TT.fire, TT.tree);
        tmpV.copy(mouth).lerp(under, E.out(f));
        tmpV.y += Math.sin(f * Math.PI) * 0.9;
        heroGift.position.copy(tmpV);
        heroGift.rotation.set(0, 2 + f * 3, Math.sin(f * Math.PI) * 0.4);
        const squash = t > TT.tree ? 1 + 0.25 * Math.exp(-(t - TT.tree) * 9) * Math.sin((t - TT.tree) * 30) : 1;
        heroGift.scale.set(1, 1 / squash, 1);
      }
      // soot
      soot.forEach((s, i) => {
        const f = seg(t, TT.fire, TT.fire + 0.9);
        s.visible = f > 0 && f < 1;
        const a = (i / soot.length) * Math.PI - Math.PI / 2;
        s.position.set(CH.x + 0.6 + Math.cos(a) * f * 1.2, 0.4 + f * 0.7 + Math.sin(i) * 0.2, CH.z + Math.sin(a) * f * 1.3);
        s.scale.setScalar(0.12 + f * 0.35);
        s.material.opacity = 0.65 * (1 - f);
      });
      // cookies & milk disappear
      cookies.forEach((c, i) => {
        const f = seg(t, TT.cookies + i * 0.12, TT.cookies + i * 0.12 + 0.18);
        c.visible = f < 1;
        c.scale.set(0.09 * (1 - f * 0.6), 0.04, 0.09 * (1 - f));
      });
      milk.scale.set(0.08, Math.max(0.001, 0.26 * (1 - E.inOut(seg(t, TT.cookies + 0.2, TT.cookies + 1.0)))), 0.08);
      // more gifts once delivered
      extra.forEach((g, i) => {
        const s = pop(t, TT.delivered + 0.1 + i * 0.16, 0.45, E.outBackBig);
        g.visible = s > 0;
        g.scale.setScalar(Math.max(0.0001, s));
      });
      // clock: 06:59:xx → 07:00 at ~52.4
      const minutes = 59 + clamp((t - 46) / 6.4) * 1;
      minH.rotation.z = -(minutes / 60) * Math.PI * 2;
      hourH.rotation.z = -((6 + minutes / 60) / 12) * Math.PI * 2;
      // dawn window + sleeping town windows go off one by one at dawn
      const dawn = seg(t, TT.dawn, TT.dawn + 4);
      winBack.color.setHex(0x1d2b5c).lerp(new THREE.Color(0xffb38a), dawn);
      winMats.forEach((m, i) => {
        const off = seg(t, TT.dawn + 1.5 + i * 0.35, TT.dawn + 1.8 + i * 0.35);
        m.color.setHex(0xffc95e).lerp(new THREE.Color(0x9fb2d9), off);
      });
    },
  };
}

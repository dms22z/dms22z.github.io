// Scene 5 — the delivery route: 24 time-zone tiles, night sweeping east → west, the sleigh riding midnight.
import { THREE, C, mat, glow, group, mesh, box, ball, cone, cyl, prismGeo, pine, rng, seg, E, clamp, lerp, frac } from "./core.js";

export const ROUTE_O = new THREE.Vector3(0, 0, 400);
const ROT = Math.PI / 4; // local +x → screen right
export const TILE = 5;
export const NT = 24;
export const X0 = -((NT * TILE) / 2);
export const ZONES = [
  ["UTC+12", "AUCKLAND"], ["UTC+11", "NOUMÉA"], ["UTC+10", "SYDNEY"], ["UTC+9", "TOKYO"], ["UTC+8", "PÉKIN"],
  ["UTC+7", "BANGKOK"], ["UTC+6", "DACCA"], ["UTC+5", "KARACHI"], ["UTC+4", "DUBAÏ"], ["UTC+3", "MOSCOU"],
  ["UTC+2", "LE CAIRE"], ["UTC+1", "PARIS"], ["UTC+0", "LONDRES"], ["UTC−1", "AÇORES"], ["UTC−2", "GÉORGIE DU SUD"],
  ["UTC−3", "RIO"], ["UTC−4", "SANTIAGO"], ["UTC−5", "NEW YORK"], ["UTC−6", "MEXICO"], ["UTC−7", "DENVER"],
  ["UTC−8", "LOS ANGELES"], ["UTC−9", "ANCHORAGE"], ["UTC−10", "HONOLULU"], ["UTC−11", "PAGO PAGO"],
];

// sleigh position along the board (local x) — shared with the DOM HUD (same formula in s5 overlay)
export function sleighX(t) {
  const k = seg(t, 33.3, 42.1);
  const u = 0.6 * k + 0.4 * E.inOutS(k);
  return lerp(X0 - 6, -X0 + 4, u);
}
export function routeWorld(x, y, z) {
  const c = Math.cos(ROT), s = Math.sin(ROT);
  return new THREE.Vector3(ROUTE_O.x + x * c + z * s, ROUTE_O.y + y, ROUTE_O.z - x * s + z * c);
}

export function buildRoute(scene) {
  const root = group(scene, ROUTE_O.x, ROUTE_O.y, ROUTE_O.z);
  root.rotation.y = ROT;
  const r = rng(404);
  const tiles = [];
  const dayCol = new THREE.Color(0xeaf0fb), nightCol = new THREE.Color(0x2c3c6e);
  const dayWin = new THREE.Color(0x9aa6c4), nightWin = new THREE.Color(0xffc95e);
  for (let i = 0; i < NT; i++) {
    const x = X0 + TILE / 2 + i * TILE;
    const tg = group(root, x, 0, 0);
    const topM = new THREE.MeshLambertMaterial({ color: dayCol.clone(), flatShading: true });
    const top = box(tg, TILE - 0.12, 0.5, 13, topM, 0, -0.5, 0, false);
    box(tg, TILE - 0.12, 2.2, 12.6, mat(i % 2 ? C.rock : C.rockDark), 0, -2.7, 0, false);
    const winM = new THREE.MeshBasicMaterial({ color: dayWin.clone() });
    const houses = [];
    const n = 3 + Math.floor(r() * 3);
    for (let h = 0; h < n; h++) {
      const hx = (r() - 0.5) * (TILE - 1.6);
      const hz = (h % 2 ? 1 : -1) * (1.6 + r() * 3.8);
      const hg = group(tg, hx, 0, hz);
      const hw = 0.9 + r() * 0.5, hd = 0.9 + r() * 0.4, hh = 0.7 + r() * 0.6;
      const cols = [0xf0d7b8, 0xe7a6a0, 0xa9c4e8, 0xc9e2b8, 0xf3e3a1, 0xd7c4ef];
      box(hg, hw, hh, hd, mat(cols[Math.floor(r() * cols.length)]), 0, 0, 0);
      const rf = mesh(hg, prismGeo(hd + 0.2, 0.55, hw + 0.2), mat(h % 2 ? C.red : C.slate), 0, hh, 0);
      rf.rotation.y = Math.PI / 2;
      box(hg, 0.22, 0.25, 0.04, winM, -hw * 0.2, hh * 0.35, hd / 2 + 0.01, false);
      box(hg, 0.04, 0.25, 0.22, winM, hw / 2 + 0.01, hh * 0.35, 0, false);
      const star = mesh(hg, new THREE.OctahedronGeometry(0.2, 0), glow(C.gold), 0, hh + 1.1, 0, false);
      houses.push({ hg, star, hh });
    }
    for (let k = 0; k < 2; k++) pine(tg, (r() - 0.5) * (TILE - 1), (k ? 1 : -1) * (5.2 + r()), 0.5, false);
    tiles.push({ x, topM, winM, houses });
  }
  // landmarks
  const lm = (i) => tiles[i];
  // Tokyo tower (UTC+9)
  {
    const g = group(root, lm(3).x + 0.6, 0, -2.2);
    const cols = [C.red, C.white, C.red, C.white, C.red];
    for (let k = 0; k < 5; k++) {
      const c = cone(g, 0.95 - k * 0.17, 1.0, mat(cols[k]), 0, k * 0.9, 0, 4);
      c.rotation.y = Math.PI / 4;
    }
    cyl(g, 0.04, 1.1, mat(C.white), 0, 4.5, 0);
  }
  // pyramids (UTC+2)
  {
    const g = group(root, lm(10).x, 0, -2.6);
    cone(g, 1.5, 1.6, mat(0xe7c27a), 0, 0, 0, 4).rotation.y = Math.PI / 4;
    cone(g, 1.0, 1.1, mat(0xdcb36a), 1.6, 0, 1.2, 4).rotation.y = Math.PI / 4;
  }
  // Eiffel tower (UTC+1)
  {
    const g = group(root, lm(11).x + 0.4, 0, -2.4);
    const m = mat(0x6b4a3a);
    cone(g, 1.0, 1.4, m, 0, 0, 0, 4).rotation.y = Math.PI / 4;
    box(g, 1.0, 0.12, 1.0, m, 0, 1.2, 0).rotation.y = 0;
    cone(g, 0.5, 1.8, m, 0, 1.3, 0, 4).rotation.y = Math.PI / 4;
    box(g, 0.5, 0.1, 0.5, m, 0, 2.6, 0);
    cone(g, 0.22, 2.1, m, 0, 2.7, 0, 4).rotation.y = Math.PI / 4;
    ball(g, 0.08, glow(C.gold), 0, 4.85, 0, false, false);
  }
  // New York (UTC−5)
  {
    const g = group(root, lm(17).x, 0, -2.6);
    const hs = [[0, 0, 3.6], [0.9, 0.4, 2.6], [-0.9, 0.3, 2.9], [0.4, -0.9, 2.2], [-0.5, 1.0, 1.8]];
    hs.forEach(([x, z, h], k) => {
      box(g, 0.75, h, 0.75, mat(k % 2 ? 0x8e9cc7 : 0xb0bad8), x, 0, z);
      for (let w = 0; w < Math.floor(h / 0.5); w++) box(g, 0.5, 0.12, 0.02, tiles[17].winM, x, 0.3 + w * 0.48, z + 0.385, false);
    });
    cyl(g, 0.05, 0.9, mat(C.white), 0, 3.6, 0);
  }

  // trail (behind) + planned route (ahead)
  const TRAIL = 160;
  const trail = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), glow(0xffd36b), TRAIL);
  root.add(trail);
  const PLAN = 120;
  const plan = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.06, 0.1), glow(0xf6f1ff, { transparent: true, opacity: 0.75 }), PLAN);
  root.add(plan);
  const pathZ = (x) => Math.sin(x * 0.42) * 2.2;
  const pathY = (x) => 4.6 + Math.sin(x * 0.27) * 0.35;
  const tmp = new THREE.Object3D();
  const col = new THREE.Color();

  return {
    root,
    pathZ,
    pathY,
    tileAnchor: (i) => routeWorld(tiles[i].x, 0.2, 6.6),
    tileX: (i) => tiles[i].x,
    update(t) {
      const xs = sleighX(t);
      const front = xs + 1.5;
      tiles.forEach((tile) => {
        const n = clamp((front - tile.x + 2.5) / 5);
        col.copy(dayCol).lerp(nightCol, E.inOutS(n));
        tile.topM.color.copy(col);
        tile.winM.color.copy(dayWin).lerp(nightWin, E.inOutS(clamp(n * 1.4 - 0.2)));
        tile.houses.forEach((h, k) => {
          const passed = xs - (tile.x + h.hg.position.x);
          const sp = clamp(passed / 1.2);
          const s = sp <= 0 ? 0 : sp < 1 ? E.outBackBig(sp) : 1;
          h.star.scale.setScalar(Math.max(0.0001, s));
          h.star.rotation.y = t * 2 + k;
          h.star.position.y = h.hh + 1.0 + Math.sin(t * 3 + k) * 0.08;
        });
      });
      for (let i = 0; i < TRAIL; i++) {
        const x = xs - 1.2 - i * 0.35;
        const ok = x > X0 - 8;
        tmp.position.set(x, pathY(x) + 0.4, pathZ(x));
        tmp.scale.setScalar(ok ? 0.12 * (1 - i / TRAIL) + 0.03 : 0.0001);
        tmp.rotation.set(i, i * 0.3 + t, 0);
        tmp.updateMatrix();
        trail.setMatrixAt(i, tmp.matrix);
      }
      trail.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < PLAN; i++) {
        const x = xs + 3 + i * 0.6;
        const ok = x < -X0 + 6;
        const dx = 0.6, dz = pathZ(x + 0.05) - pathZ(x - 0.05);
        tmp.position.set(x, pathY(x) + 0.4, pathZ(x));
        tmp.rotation.set(0, -Math.atan2(dz / 0.1, 1), 0);
        tmp.scale.setScalar(ok ? 1 : 0.0001);
        void dx;
        tmp.updateMatrix();
        plan.setMatrixAt(i, tmp.matrix);
      }
      plan.instanceMatrix.needsUpdate = true;
    },
  };
}

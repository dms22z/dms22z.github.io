// Scene 1 — the tiny planet at night, with the sleigh orbiting it.
import { THREE, C, mat, glow, group, mesh, ball, cyl, rng, fbm, seg, E, clamp } from "./core.js";

export const GLOBE_O = new THREE.Vector3(-400, 0, 0);
export const R = 6;

export function buildGlobe(scene) {
  const root = group(scene, GLOBE_O.x, GLOBE_O.y, GLOBE_O.z);
  const tilt = group(root);
  tilt.rotation.z = 0.18;
  tilt.rotation.x = -0.12;
  const planet = group(tilt);

  // low-poly terrain: vertex displacement + per-face colour
  const geo = new THREE.IcosahedronGeometry(R, 20);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const noiseAt = (p) => fbm(p.x * 0.3 + 3.1, p.y * 0.3 + 1.7, p.z * 0.3 + 5.3);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize().multiplyScalar(R);
    const n = noiseAt(v);
    const lat = Math.abs(v.y) / R;
    const land = n > 0.5 || lat > 0.9;
    const r = R + (land ? 0.1 + Math.max(0, n - 0.5) * 1.5 + (lat > 0.9 ? 0.12 : 0) : 0);
    v.normalize().multiplyScalar(r);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    d.fromBufferAttribute(pos, i + 2);
    const m = a.add(b).add(d).divideScalar(3);
    const lat = Math.abs(m.y) / m.length();
    const n = noiseAt(m.clone().normalize().multiplyScalar(R));
    let hex;
    if (lat > 0.88) hex = n > 0.5 ? 0xffffff : 0xe6effa;
    else if (n > 0.66) hex = 0xe8eef7;
    else if (n > 0.58) hex = 0x3c8a5c;
    else if (n > 0.5) hex = 0x58a868;
    else if (n > 0.44) hex = 0x2f69b8;
    else hex = 0x234f98;
    c.setHex(hex);
    for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (i + k) * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const earth = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  planet.add(earth);

  // city lights on land
  const r = rng(77);
  const pts = [];
  for (let i = 0; i < 1400 && pts.length < 320; i++) {
    const u = r() * 2 - 1, th = r() * Math.PI * 2;
    const p = new THREE.Vector3(Math.sqrt(1 - u * u) * Math.cos(th), u, Math.sqrt(1 - u * u) * Math.sin(th));
    const n = noiseAt(p.clone().multiplyScalar(R));
    if (n > 0.52 && n < 0.66 && Math.abs(u) < 0.8) pts.push(p.multiplyScalar(R + 0.12 + (n - 0.5) * 1.5));
  }
  const lights = new THREE.InstancedMesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), glow(0xffd36b), pts.length);
  const m4 = new THREE.Matrix4();
  pts.forEach((p, i) => lights.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z)));
  planet.add(lights);

  // the tiny north pole marker — the camera dives into it
  const poleY = R + 0.22;
  const pole = group(planet, 0, poleY, 0);
  for (let i = 0; i < 6; i++) cyl(pole, 0.045, 0.08, mat(i % 2 ? C.white : C.red), 0, i * 0.08, 0, true);
  ball(pole, 0.065, mat(C.gold), 0, 0.54, 0, true);

  // atmosphere halo + orbit rings
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.1, 48, 32),
    new THREE.MeshBasicMaterial({ color: 0x86a9ff, transparent: true, opacity: 0.16, side: THREE.BackSide, depthWrite: false }),
  );
  root.add(atmo);
  const orbit = group(root);
  orbit.rotation.x = 0.42;
  orbit.rotation.z = -0.32;
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xf3b23e, transparent: true, opacity: 0.45 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(8.6, 0.03, 6, 200), ringMat);
  ring.rotation.x = Math.PI / 2;
  orbit.add(ring);
  const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(10.4, 0.02, 6, 200),
    new THREE.MeshBasicMaterial({ color: 0xbcd0ff, transparent: true, opacity: 0.22 }),
  );
  ring2.rotation.x = Math.PI / 2 + 0.25;
  root.add(ring2);

  // sparkle trail for the orbiting sleigh
  const TRAIL = 70;
  const trail = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), glow(0xffd77a), TRAIL);
  orbit.add(trail);

  const tmp = new THREE.Object3D();
  return {
    root,
    planet,
    orbit,
    // world position of the mini pole's gold ball (for the camera dive)
    poleTop(t) {
      planet.rotation.y = 0.32 * t;
      root.updateMatrixWorld(true);
      return pole.localToWorld(new THREE.Vector3(0, 0.54, 0));
    },
    orbitAngle(t) {
      const k = seg(t, 3.95, 7.4);
      return -1.2 + E.out2(k) * 9.5;
    },
    update(t) {
      planet.rotation.y = 0.32 * t;
      // trail sparks behind the sleigh
      const th = this.orbitAngle(t);
      const vis = clamp((t - 3.95) / 0.3);
      for (let i = 0; i < TRAIL; i++) {
        const a = th - i * 0.045;
        const shrink = (1 - i / TRAIL) * vis;
        const wob = Math.sin(i * 1.7 + t * 9) * 0.12;
        tmp.position.set(Math.cos(a) * (8.6 + wob), Math.sin(i * 2.3 + t * 7) * 0.1, Math.sin(a) * (8.6 + wob));
        tmp.scale.setScalar(0.11 * shrink + 0.0001);
        tmp.rotation.set(i, t * 3 + i, 0);
        tmp.updateMatrix();
        trail.setMatrixAt(i, tmp.matrix);
      }
      trail.instanceMatrix.needsUpdate = true;
      ringMat.opacity = 0.2 + 0.35 * clamp((t - 3.6) / 0.6);
    },
  };
}

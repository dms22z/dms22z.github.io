// Orchestrates the isometric world: renderer, camera journey, lights, sky, snow, smoke, pinned labels.
import { THREE, W, H, ASPECT, clamp, lerp, seg, E, pop, win, frac, rng, team as buildTeam } from "./core.js";
import { buildGlobe, GLOBE_O } from "./globe.js";
import { buildCampus, heroGiftPos, T } from "./campus.js";
import { buildRoute, routeWorld, sleighX, ROUTE_O, ZONES, NT } from "./route.js";
import { buildTown, TOWN_O, TT, heroCenterWorld, chimneyTopWorld } from "./town.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const DEG = Math.PI / 180;

// scene cuts (seconds) — keep in sync with index.html overlays
export const CUT = { campus: 7.4, route: 33.4, town: 42.0 };

const canvas = document.getElementById("world-gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
const cam = new THREE.OrthographicCamera(-ASPECT, ASPECT, 1, -1, 0.1, 600);
const hemi = new THREE.HemisphereLight(0xdfe7ff, 0x4a4a80, 2.1);
const sun = new THREE.DirectionalLight(0xfff1de, 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(hemi, sun, sun.target);

const globe = buildGlobe(scene);
const campus = buildCampus(scene);
const route = buildRoute(scene);
const town = buildTown(scene);
const crew = buildTeam(scene);

// ── snow particles (follow the camera target) ─────────────────────────
const FLAKES = 700;
const snowGeo = new THREE.BufferGeometry();
const snowPos = new Float32Array(FLAKES * 3);
snowGeo.setAttribute("position", new THREE.BufferAttribute(snowPos, 3));
const snowMat = new THREE.PointsMaterial({ color: 0xffffff, size: 3.2, sizeAttenuation: false, transparent: true, opacity: 0.85, depthWrite: false });
const snow = new THREE.Points(snowGeo, snowMat);
snow.frustumCulled = false;
scene.add(snow);
const sr = rng(2024);
const flakes = Array.from({ length: FLAKES }, () => ({ x: sr() - 0.5, y: sr(), z: sr() - 0.5, sp: 0.6 + sr() * 0.8, ph: sr() * 6.28 }));

// ── chimney smoke (campus factory + town) ─────────────────────────────
const PUFFS = 6;
const smokeMats = [];
const smokeGeo = new THREE.IcosahedronGeometry(1, 0);
function makeSmoke(n) {
  const arr = [];
  for (let c = 0; c < n; c++) {
    const puffs = [];
    for (let i = 0; i < PUFFS; i++) {
      const m = new THREE.MeshLambertMaterial({ color: 0xe9edf7, transparent: true, opacity: 0.6, flatShading: true, depthWrite: false });
      smokeMats.push(m);
      const me = new THREE.Mesh(smokeGeo, m);
      scene.add(me);
      puffs.push(me);
    }
    arr.push(puffs);
  }
  return arr;
}
const campusSmoke = makeSmoke(2);
const townChims = town.chimTops();
const townSmoke = makeSmoke(townChims.length);
function updateSmoke(sets, tops, t, on) {
  sets.forEach((puffs, c) => {
    puffs.forEach((p, i) => {
      const ph = frac(t * 0.32 + i / PUFFS + c * 0.17);
      p.visible = on && !!tops[c];
      if (!p.visible) return;
      p.position.set(tops[c].x + ph * 1.4, tops[c].y + ph * 3.2, tops[c].z - ph * 0.6);
      p.scale.setScalar(0.25 + ph * 0.75);
      p.rotation.set(ph * 3, c + i, 0);
      p.material.opacity = 0.55 * Math.sin(Math.PI * Math.min(1, ph * 1.15));
    });
  });
}

// ── camera journey ────────────────────────────────────────────────────
// Each key: time it is reached, target (Vector3 or fn(t)), size (ortho half-height), azimuth, screen offsets.
const G = GLOBE_O;
const poleTop = (t) => globe.poleTop(t);
const sleighRoute = (t) => routeWorld(sleighX(t) + 5, 1.2, 0);
const townSleigh = (t) => townTeamPos(t).add(V(3.5, -3.2, 0));
const KEYS = [
  { t: 0, tg: G, s: 11.2, az: 45, ox: 8.4, oy: 0.4 },
  { t: 6.25, tg: G, s: 10.0, az: 49, ox: 7.6, oy: 0.3, ease: E.inOutS },
  { t: 7.4, tg: poleTop, s: 0.11, az: 62, ox: 0, oy: 0, ease: E.inExpo, tgEase: E.inOut },
  // campus — match cut onto the real pole, spin out
  { t: 7.4, cut: true, tg: V(0, 5.55, 0), s: 1.05, az: 62, ox: 0, oy: 0 },
  { t: 10.3, tg: V(0, 0, 0), s: 23, az: 45, ox: 7.2, oy: -4.2, ease: E.outExpo },
  { t: 14.55, tg: V(-1.5, 0, 1.5), s: 21.5, az: 41, ox: 6.6, oy: -3.9, ease: E.inOutS },
  // dive into the factory
  { t: 15.7, tg: V(-6.5, 1.2, 9.6), s: 7.6, az: 45, ox: 0, oy: 0, ease: E.inOut },
  { t: 18.3, tg: V(-10.2, 1.6, 8.8), s: 5.6, az: 47, ox: 1.2, oy: 0, ease: E.inOutS },
  { t: 19.25, tg: V(-10, 1.3, 10.6), s: 5.2, az: 45, ox: 0, oy: -0.3, ease: E.inOut },
  { t: 20.6, tg: V(-6, 1.3, 10.6), s: 5.2, az: 45, ox: 0, oy: -0.3, ease: E.inOut },
  { t: 21.7, tg: V(-2, 1.3, 10.6), s: 5.2, az: 45, ox: 0, oy: -0.3, ease: E.inOut },
  { t: 23.2, tg: V(-0.8, 1.4, 10.8), s: 5.8, az: 43, ox: 0, oy: -0.3, ease: E.inOutS },
  // follow the hero gift to the hangar
  { t: 24.25, tg: heroGiftPos, s: 6.4, az: 45, ox: 0, oy: 0, ease: E.inOut },
  { t: 25.95, tg: heroGiftPos, s: 8.2, az: 47, ox: 0, oy: 0, ease: E.lin },
  { t: 27.0, tg: V(12.6, 1.4, -8.6), s: 8.6, az: 45, ox: 2.4, oy: -0.4, ease: E.inOut },
  { t: 31.5, tg: V(12.6, 1.4, -8.6), s: 7.9, az: 44, ox: 2.4, oy: -0.4, ease: E.lin },
  { t: 33.4, tg: (t) => campusTeamPos(t).add(V(0, 0.5, 2)), s: 9.5, az: 46, ox: 0, oy: 0, ease: E.in },
  // route — ride the midnight line
  { t: 33.4, cut: true, tg: sleighRoute, s: 9.6, az: 45, ox: 0, oy: -0.2 },
  { t: 42.0, tg: sleighRoute, s: 10.4, az: 45, ox: 0, oy: -0.2, ease: E.lin },
  // town
  { t: 42.0, cut: true, tg: townSleigh, s: 12.5, az: 45, ox: 0, oy: -0.5 },
  { t: 44.5, tg: townSleigh, s: 9.5, az: 45, ox: 0, oy: -0.5, ease: E.inOutS },
  { t: 45.7, tg: () => heroCenterWorld().add(V(0, 1.6, 0)), s: 6.3, az: 45, ox: 0, oy: 0, ease: E.inOut },
  { t: 47.6, tg: () => heroCenterWorld().add(V(0, 0.9, 0)), s: 5.4, az: 45, ox: 0, oy: 0, ease: E.inOutS },
  { t: 53.4, tg: () => heroCenterWorld(), s: 4.5, az: 44, ox: 0, oy: 0, ease: E.lin },
  // pull out for the signature
  { t: 57.2, tg: TOWN_O.clone().add(V(-1, 0, 0)), s: 24, az: 32, ox: 14.5, oy: -3.0, ease: E.outExpo, tgEase: E.out },
  { t: 64.0, tg: TOWN_O.clone().add(V(-1, 0, 0)), s: 22.8, az: 29, ox: 14.0, oy: -3.0, ease: E.lin },
];
const getTg = (k, t) => (typeof k.tg === "function" ? k.tg(t) : k.tg.clone());
function camState(t) {
  let i = 0;
  while (i < KEYS.length - 1 && KEYS[i + 1].t <= t) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  if (!b || b.cut) return { tg: getTg(a, t), s: a.s, az: a.az, ox: a.ox, oy: a.oy };
  const u = seg(t, a.t, b.t);
  const k = (b.ease || E.inOut)(u);
  const kt = (b.tgEase || b.ease || E.inOut)(u);
  return {
    tg: getTg(a, t).lerp(getTg(b, t), kt),
    s: Math.exp(lerp(Math.log(a.s), Math.log(b.s), k)),
    az: lerp(a.az, b.az, kt),
    ox: lerp(a.ox, b.ox, kt),
    oy: lerp(a.oy, b.oy, kt),
  };
}
function shake(t) {
  const hits = [[5.25, 0.18], [T.slam, 0.32], [TT.fire, 0.06]];
  let x = 0, y = 0;
  for (const [t0, amp] of hits) {
    if (t < t0) continue;
    const d = Math.exp(-(t - t0) * 7) * amp;
    x += Math.sin((t - t0) * 61) * d;
    y += Math.cos((t - t0) * 47) * d;
  }
  return [x, y];
}

// ── team placement per scene ──────────────────────────────────────────
function campusTeamPos(t) {
  const k = seg(t, T.takeoff, CUT.route);
  const z = -12 + E.in(k) * 34;
  return V(13, E.in(seg(t, T.takeoff + 0.45, CUT.route)) * 9, z);
}
function townTeamPos(t) {
  // fly over the rooftops, hover above the hero chimney, leave
  const ch = chimneyTopWorld();
  const hover = ch.clone().add(V(-1.2, 1.4, 0.4));
  if (t < 44.4) {
    const k = E.out(seg(t, CUT.town, 44.4));
    const from = TOWN_O.clone().add(V(-26, 9, -1));
    const p = from.lerp(hover, k);
    p.y += Math.sin(k * Math.PI) * 1.5;
    return p;
  }
  if (t < 47.3) return hover.add(V(0, Math.sin(t * 2.2) * 0.12, 0));
  const k = E.in(seg(t, 47.3, 49.3));
  return hover.add(V(k * 26, k * 9, k * -4));
}
function finaleTeamPos(t) {
  const k = seg(t, 54.2, 59.5);
  const from = TOWN_O.clone().add(V(-24, 7, -12));
  const to = TOWN_O.clone().add(V(26, 16, 12));
  const p = from.lerp(to, E.inOutS(k));
  p.y += Math.sin(k * Math.PI) * 3;
  return p;
}
const finaleTrail = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xffd36b }), 90);
finaleTrail.frustumCulled = false;
scene.add(finaleTrail);
const tmpO = new THREE.Object3D();

function placeTeam(t) {
  const r = crew.root;
  r.visible = true;
  r.rotation.set(0, 0, 0);
  let scale = 1, flying = false, popDeer = true;
  if (t < CUT.campus) {
    // tiny sleigh orbiting the planet
    const vis = t > 3.95;
    r.visible = vis;
    const th = globe.orbitAngle(t);
    const o = globe.orbit;
    const local = V(Math.cos(th) * 8.6, 0, Math.sin(th) * 8.6);
    o.updateMatrixWorld(true);
    r.position.copy(o.localToWorld(local.clone()));
    const ahead = o.localToWorld(V(Math.cos(th + 0.05) * 8.6, 0, Math.sin(th + 0.05) * 8.6));
    r.lookAt(ahead);
    scale = 0.16 * clamp((t - 3.95) / 0.25);
    flying = true;
  } else if (t < CUT.route) {
    r.position.copy(campusTeamPos(t));
    r.rotation.x = -0.25 * E.in(seg(t, T.takeoff + 0.45, CUT.route));
    flying = t > T.takeoff;
    popDeer = true;
  } else if (t < CUT.town) {
    const x = sleighX(t);
    const p = routeWorld(x, route.pathY(x) + 0.3, route.pathZ(x));
    r.position.copy(p);
    const ahead = routeWorld(x + 0.5, route.pathY(x + 0.5) + 0.3, route.pathZ(x + 0.5));
    r.lookAt(ahead);
    scale = 0.6;
    flying = true;
  } else if (t < 53.6) {
    r.position.copy(townTeamPos(t));
    r.rotation.y = Math.PI / 2;
    scale = 0.62;
    flying = true;
    r.visible = t < 49.4;
  } else {
    const p = finaleTeamPos(t);
    r.position.copy(p);
    r.lookAt(finaleTeamPos(t + 0.05));
    scale = 0.6;
    flying = true;
    r.visible = t > 54.2 && t < 59.6;
  }
  r.scale.setScalar(Math.max(0.0001, scale));
  // per-part pops in the hangar
  const inHangar = t >= CUT.campus && t < CUT.route;
  const sl = inHangar ? pop(t, T.sleigh, 0.55, E.outBackBig) : 1;
  crew.sleigh.g.scale.setScalar(Math.max(0.0001, sl));
  crew.santa.scale.setScalar(Math.max(0.0001, inHangar ? pop(t, T.sleigh + 0.2, 0.5, E.outBackBig) : 1));
  crew.deer.forEach((d, i) => {
    const s = inHangar && popDeer ? pop(t, T.deer + i * 0.11, 0.45, E.outBackBig) : 1;
    d.holder.scale.setScalar(Math.max(0.0001, s));
    const gallop = flying ? 1 : 0.15;
    d.legs.forEach((l, j) => (l.rotation.x = Math.sin(t * 11 + d.phase + (j % 2) * Math.PI + (j > 1 ? 0.8 : 0)) * 0.7 * gallop));
    d.head.rotation.x = Math.sin(t * 3 + d.phase) * 0.08;
    d.holder.position.y = flying ? Math.sin(t * 6 + d.phase) * 0.15 : 0;
  });
  crew.reins.scale.set(1, 1, inHangar ? Math.max(0.0001, pop(t, T.deer + 0.3, 0.8, E.out)) : 1);
  // the sack: grows in, gulps gifts, squashes on the slam
  const sack = crew.sleigh.sack;
  if (inHangar) {
    const s0 = Math.max(0.0001, pop(t, T.sack, 0.5, E.outBackBig));
    let sx = 1, sy = 1;
    if (t > T.sack + 0.4 && t < T.slam) {
      const g = 1 + 0.05 * Math.abs(Math.sin(t * 18));
      sx = g; sy = 1 / g;
    }
    if (t >= T.slam) {
      const k = seg(t, T.slam, T.slam + 0.9);
      const e = Math.exp(-k * 5) * Math.cos(k * 18);
      sx = 1 + 0.35 * e + 0.12 * (1 - k);
      sy = 1 - 0.3 * e + 0.12 * (1 - k);
    }
    sack.scale.set(s0 * sx, s0 * sy, s0 * sx);
    crew.root.updateMatrixWorld(true);
    campus.sackWorld = sack.localToWorld(V(0, 0.8, 0));
  } else sack.scale.setScalar(1);
  // finale trail
  for (let i = 0; i < 90; i++) {
    const tt = t - i * 0.03;
    const on = t > 54.3 && tt > 54.2 && t < 61.5;
    const p = finaleTeamPos(tt);
    tmpO.position.copy(p).add(V(0, 0.3, 0));
    tmpO.scale.setScalar(on ? 0.16 * (1 - i / 90) * (1 - seg(t, 59.6, 61.5)) + 0.0001 : 0.0001);
    tmpO.rotation.set(i, i + t, 0);
    tmpO.updateMatrix();
    finaleTrail.setMatrixAt(i, tmpO.matrix);
  }
  finaleTrail.instanceMatrix.needsUpdate = true;
}

// ── DOM: sky, stars, aurora, flash, pins, chapter tag ────────────────
const sky = document.getElementById("world-sky");
const stars = document.getElementById("world-stars");
const aurora = document.getElementById("world-aurora");
const flash = document.getElementById("world-flash");
const pinsLayer = document.getElementById("world-pins");
const chapter = document.getElementById("world-chapter");
const chapterNum = document.getElementById("world-chapter-num");
const chapterName = document.getElementById("world-chapter-name");

// stars (deterministic)
{
  const s = rng(7);
  let html = "";
  for (let i = 0; i < 170; i++) {
    const r = s() < 0.12 ? 2.2 : 1.1 + s() * 0.8;
    html += `<circle cx="${(s() * 1920).toFixed(0)}" cy="${(s() * 1080).toFixed(0)}" r="${r.toFixed(1)}" class="tw${i % 4}"/>`;
  }
  stars.innerHTML = html;
}
const twGroups = [0, 1, 2, 3].map((k) => stars.querySelectorAll(`.tw${k}`));

const SKY = [
  // t, top, mid, bottom
  [0, "#050a1f", "#0c1840", "#1a2c66"],
  [7.3, "#050a1f", "#0c1840", "#1a2c66"],
  [7.4, "#14234f", "#2b4385", "#7b8fd0"],
  [33.3, "#16255a", "#2c4589", "#7086c9"],
  [33.4, "#0a1232", "#16275a", "#304a8c"],
  [41.9, "#0a1232", "#16275a", "#304a8c"],
  [42.0, "#0b1436", "#1b2c62", "#3a5191"],
  [51.6, "#0b1436", "#1b2c62", "#3a5191"],
  [55.5, "#1f2e66", "#7a6aa8", "#f2a383"],
  [64, "#26387a", "#9a7fb4", "#ffc49a"],
];
const hexLerp = (a, b, k) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (sh) => Math.round(lerp((pa >> sh) & 255, (pb >> sh) & 255, k));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
};
function skyAt(t) {
  let i = 0;
  while (i < SKY.length - 2 && SKY[i + 1][0] <= t) i++;
  const a = SKY[i], b = SKY[i + 1];
  const k = E.inOutS(seg(t, a[0], b[0]));
  return [hexLerp(a[1], b[1], k), hexLerp(a[2], b[2], k), hexLerp(a[3], b[3], k)];
}

const pins = [];
function pin({ anchor, label, kicker = "", t0, t1, side = "up", lead = 90, cls = "", dx = 0 }) {
  const el = document.createElement("div");
  el.className = `wpin ${side} ${cls}`;
  el.innerHTML = `<div class="wpin-dot"></div><div class="wpin-line" style="height:${lead}px"></div><div class="wpin-card" style="bottom:${lead}px">${kicker ? `<span class="wpin-k">${kicker}</span>` : ""}<span class="wpin-l">${label}</span></div>`;
  pinsLayer.appendChild(el);
  pins.push({ el, anchor, t0, t1, dx, card: el.querySelector(".wpin-card"), line: el.querySelector(".wpin-line") });
}
const A = campus.anchors;
pin({ anchor: A.hqTop, kicker: "01", label: "SIÈGE SOCIAL", t0: 11.0, t1: 14.6, lead: 46, dx: 190 });
pin({ anchor: A.factoryTop, kicker: "02", label: "ATELIERS", t0: 11.8, t1: 14.6, lead: 60, dx: -120 });
pin({ anchor: A.hangarTop, kicker: "03", label: "HANGAR", t0: 12.2, t1: 14.6, lead: 60 });
pin({ anchor: A.stationAnchors[0], kicker: "ÉTAPE 01", label: "CONÇOIVENT", t0: 18.85, t1: 23.3, lead: 70, cls: "big" });
pin({ anchor: A.stationAnchors[1], kicker: "ÉTAPE 02", label: "ASSEMBLENT", t0: 20.5, t1: 23.3, lead: 70, cls: "big" });
pin({ anchor: A.stationAnchors[2], kicker: "ÉTAPE 03", label: "EMBALLENT", t0: 21.6, t1: 23.3, lead: 70, cls: "big" });
pin({ anchor: (t) => heroGiftPos(t).add(V(0, 0.7, 0)), kicker: "SUIVI COLIS", label: "N° 2412-0001 · EN TRANSIT", t0: 23.6, t1: 26.2, lead: 80, cls: "track" });
ZONES.forEach(([utc], i) => pin({ anchor: route.tileAnchor(i), label: utc.replace("UTC", ""), t0: 33.45, t1: 41.95, lead: 0, cls: "zone" }));
pin({ anchor: () => town.anchors.chimney(), kicker: "MÉTHODE EXCLUSIVE", label: "LA CHEMINÉE", t0: 45.1, t1: 47.5, lead: 70, cls: "big", dx: 230 });
pin({ anchor: () => town.anchors.cat(), kicker: "", label: "Z z z", t0: 47.7, t1: 50.6, lead: 40, cls: "zzz" });

const proj = V(0, 0, 0);
function updatePins(t) {
  for (const p of pins) {
    const vis = win(t, p.t0, p.t1, 0.35, 0.3);
    if (vis <= 0) {
      p.el.style.opacity = "0";
      continue;
    }
    const a = typeof p.anchor === "function" ? p.anchor(t) : p.anchor;
    proj.copy(a).project(cam);
    const x = ((proj.x + 1) / 2) * W, y = ((1 - proj.y) / 2) * H;
    const k = E.outBack(seg(t, p.t0, p.t0 + 0.45));
    p.el.style.opacity = String(Math.min(1, vis * 1.5));
    p.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    p.line.style.transform = `scaleY(${clamp(seg(t, p.t0, p.t0 + 0.3)).toFixed(3)})`;
    p.card.style.transform = `translateX(calc(-50% + ${p.dx}px)) scale(${(0.6 + 0.4 * k).toFixed(3)})`;
  }
}

const CHAPTERS = [
  [0, "01", "LA PROMESSE"],
  [7.4, "02", "LE SIÈGE"],
  [15.0, "03", "LA PRODUCTION"],
  [24.3, "04", "LA FLOTTE"],
  [33.4, "05", "LA TOURNÉE"],
  [42.0, "06", "LE DERNIER KILOMÈTRE"],
  [53.6, "07", "LA SIGNATURE"],
];

function flashAt(t) {
  const hits = [[CUT.campus, 0.75], [CUT.route, 0.9], [CUT.town, 0.9]];
  let o = 0;
  for (const [t0, a] of hits) {
    const d = t - t0;
    if (d > -0.12 && d < 0.5) o = Math.max(o, d < 0 ? a * (1 + d / 0.12) : a * Math.exp(-d * 9));
  }
  return o;
}

// ── lights per scene ──────────────────────────────────────────────────
const sunDirs = {
  globe: V(-0.9, 0.35, -0.5).normalize(),
  day: V(0.38, 1, 0.72).normalize(),
  dawn: V(-0.6, 0.55, 0.75).normalize(),
};
function lightAt(t, tg, s) {
  let dir = sunDirs.day, hemiI = 2.1, sunI = 2.6;
  let sunC = 0xfff1de, hemiSky = 0xdfe7ff, hemiG = 0x4a4a80;
  if (t < CUT.campus) {
    dir = sunDirs.globe;
    hemiI = 1.15;
    sunI = 3.2;
    hemiSky = 0x9db4ff;
  } else if (t >= CUT.route && t < CUT.town) {
    hemiI = 1.9;
    sunI = 2.2;
    hemiSky = 0xc9d4ff;
  } else if (t >= CUT.town) {
    const k = E.inOutS(seg(t, TT.dawn, TT.dawn + 5));
    dir = sunDirs.day.clone().lerp(sunDirs.dawn, k).normalize();
    hemiI = lerp(1.9, 2.2, k);
    sunI = lerp(2.3, 2.9, k);
    sun.color.setHex(0xfff1de).lerp(new THREE.Color(0xffc49a), k);
    hemi.color.setHex(0xd6e0ff).lerp(new THREE.Color(0xffe3d0), k);
    hemi.groundColor.setHex(hemiG);
    hemi.intensity = hemiI;
    sun.intensity = sunI;
    placeSun(dir, tg, s);
    return;
  }
  sun.color.setHex(sunC);
  hemi.color.setHex(hemiSky);
  hemi.groundColor.setHex(hemiG);
  hemi.intensity = hemiI;
  sun.intensity = sunI;
  placeSun(dir, tg, s);
}
function placeSun(dir, tg, s) {
  sun.position.copy(tg).addScaledVector(dir, 80);
  sun.target.position.copy(tg);
  sun.target.updateMatrixWorld();
  const half = Math.max(6, s * ASPECT * 1.25);
  const sc = sun.shadow.camera;
  sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half;
  sc.near = 1; sc.far = 200;
  sc.updateProjectionMatrix();
}

// ── render ────────────────────────────────────────────────────────────
function renderAt(t) {
  t = clamp(t, 0, 64);
  const inGlobe = t < CUT.campus, inCampus = t >= CUT.campus && t < CUT.route;
  const inRoute = t >= CUT.route && t < CUT.town, inTown = t >= CUT.town;
  globe.root.visible = inGlobe;
  campus.root.visible = inCampus;
  route.root.visible = inRoute;
  town.root.visible = inTown;

  if (inGlobe) globe.update(t);
  placeTeam(t);
  let campusChims = [];
  if (inCampus) campusChims = campus.update(t);
  if (inRoute) route.update(t);
  if (inTown) town.update(t);
  updateSmoke(campusSmoke, campusChims, t, inCampus);
  updateSmoke(townSmoke, townChims, t, inTown);

  // camera
  const c = camState(t);
  const [sx, sy] = shake(t);
  const az = c.az * DEG, el = 35.264 * DEG;
  const d = V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  const R = V(d.z, 0, -d.x).normalize();
  const U = new THREE.Vector3().crossVectors(d, R).normalize();
  const tg = c.tg.clone().addScaledVector(R, -(c.ox + sx * c.s * 0.1)).addScaledVector(U, -(c.oy + sy * c.s * 0.1));
  cam.left = -c.s * ASPECT; cam.right = c.s * ASPECT; cam.top = c.s; cam.bottom = -c.s;
  cam.position.copy(tg).addScaledVector(d, 250);
  cam.near = 1; cam.far = 600;
  cam.up.set(0, 1, 0);
  cam.lookAt(tg);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  lightAt(t, c.tg, c.s);

  // snow around the target
  const span = Math.max(14, c.s * 3.2);
  const snowOn = !inGlobe;
  snow.visible = snowOn;
  if (snowOn) {
    for (let i = 0; i < FLAKES; i++) {
      const f = flakes[i];
      const y = frac(f.y - t * 0.08 * f.sp) * span * 0.9 - span * 0.25;
      snowPos[i * 3] = c.tg.x + f.x * span * 2 + Math.sin(t * 1.3 + f.ph) * 0.3;
      snowPos[i * 3 + 1] = c.tg.y + y;
      snowPos[i * 3 + 2] = c.tg.z + f.z * span * 2 + Math.cos(t * 1.1 + f.ph) * 0.3;
    }
    snowGeo.attributes.position.needsUpdate = true;
    snowMat.size = c.s < 7 ? 4.2 : 3.2;
  }

  renderer.render(scene, cam);

  // DOM layers
  const [top, mid, bot] = skyAt(t);
  sky.style.background = `radial-gradient(130% 95% at 50% 105%, ${bot} 0%, ${mid} 48%, ${top} 100%)`;
  const starA = inGlobe ? 1 : inRoute ? 0.85 : inTown ? 0.8 * (1 - seg(t, TT.dawn, TT.dawn + 4)) : 0.35;
  stars.style.opacity = starA.toFixed(3);
  twGroups.forEach((g, k) => {
    const o = (0.45 + 0.55 * Math.abs(Math.sin(t * (0.9 + k * 0.35) + k))).toFixed(3);
    g.forEach((n) => n.setAttribute("opacity", o));
  });
  aurora.style.opacity = (inCampus ? 0.9 : 0).toFixed(2);
  aurora.style.transform = `translateX(${(Math.sin(t * 0.35) * 40).toFixed(1)}px) skewX(${(Math.sin(t * 0.5) * 6).toFixed(2)}deg)`;
  flash.style.opacity = flashAt(t).toFixed(3);
  canvas.style.filter = inRoute && t > 41.6 ? `blur(${(seg(t, 41.6, 42.0) * 6).toFixed(2)}px)` : "none";
  updatePins(t);
  let ch = CHAPTERS[0];
  for (const c2 of CHAPTERS) if (t >= c2[0]) ch = c2;
  chapterNum.textContent = ch[1];
  chapterName.textContent = ch[2];
  const chIn = seg(t, ch[0] + 0.3, ch[0] + 0.8);
  chapter.style.opacity = (Math.min(1, chIn) * (1 - seg(t, 62.5, 63.5))).toFixed(3);
}

window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
renderAt(window.__hfThreeTime || 0);
window.__worldRender = renderAt;

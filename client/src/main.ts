import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import {
  PLAYSTYLES,
  skillsForPlaystyle,
  awakeningForPlaystyle,
  type Playstyle,
  type SkillConfig,
} from "../../shared/abilities";

// ─── HUD (MINIMAL ANIME SPORTS BROADCAST) ───────────────────────────────────
const hud = document.createElement("div");
hud.style.cssText = `
  position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;
  font-family:'Segoe UI','Inter',system-ui,sans-serif;color:#f8fafc;
  text-shadow:0 1px 2px rgba(0,0,0,.55);
`;
document.body.style.cssText = "margin:0;overflow:hidden;background:#0f172a;";
hud.innerHTML = `
<div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 62%,rgba(2,6,23,.34) 100%);"></div>

<div id="score" style="position:absolute;top:16px;left:50%;transform:translateX(-50%);
  font-size:1.65rem;font-weight:800;letter-spacing:5px;padding:5px 28px;border-radius:6px;
  background:rgba(15,23,42,.78);border:1px solid rgba(255,255,255,.16);border-top:3px solid #f8fafc;
  box-shadow:0 4px 14px rgba(0,0,0,.35);">0 — 0</div>

<div id="playstyle-tag" style="position:absolute;top:18px;left:24px;font-size:.88rem;font-weight:800;
  letter-spacing:2.5px;padding:7px 14px;border-left:4px solid #dc2626;border-radius:4px;
  background:rgba(15,23,42,.76);border-top:1px solid rgba(255,255,255,.12);
  border-right:1px solid rgba(255,255,255,.12);border-bottom:1px solid rgba(255,255,255,.12);">
  EGOIST <span style="opacity:.55;font-weight:normal;font-size:.68rem;">[1-4]</span>
</div>

<div style="position:absolute;bottom:30px;left:28px;width:214px;">
  <div style="font-size:.6rem;font-weight:800;letter-spacing:2.4px;margin-bottom:4px;color:#cbd5e1;">STAMINA</div>
  <div style="background:rgba(255,255,255,.16);height:6px;border-radius:3px;overflow:hidden;">
    <div id="stam-bar" style="height:100%;width:100%;background:linear-gradient(90deg,#7dd3fc,#0ea5e9);border-radius:3px;transition:width .1s;"></div>
  </div>
  <div style="font-size:.6rem;font-weight:800;letter-spacing:2.4px;margin-top:11px;margin-bottom:4px;color:#cbd5e1;">
    AWAKENING <span style="color:#fcd34d;">[R]</span>
  </div>
  <div style="background:rgba(255,255,255,.16);height:6px;border-radius:3px;position:relative;overflow:hidden;">
    <div id="aw-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#f59e0b,#fcd34d);border-radius:3px;transition:width .12s;"></div>
    <div id="aw-ready" style="display:none;position:absolute;top:-2px;left:0;width:100%;text-align:center;font-size:.5rem;
      font-weight:900;letter-spacing:3px;color:#0f172a;text-shadow:none;">READY</div>
  </div>
  <div id="aw-label" style="font-size:.58rem;letter-spacing:1.8px;margin-top:5px;color:#fde68a;font-weight:700;"></div>
</div>

<div id="power-gauge-wrap" style="display:none;position:absolute;right:26px;top:50%;transform:translateY(-50%);
  flex-direction:column;align-items:center;gap:6px;">
  <div id="power-gauge-pct" style="font-size:.76rem;font-weight:800;letter-spacing:1px;color:#22c55e;">0%</div>
  <div style="width:13px;height:210px;background:rgba(15,23,42,.78);border:1px solid rgba(255,255,255,.28);
    border-radius:7px;position:relative;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.4);">
    <div id="power-gauge-fill" style="position:absolute;left:0;bottom:0;width:100%;height:0%;
      background:linear-gradient(to top,#22c55e 0%,#eab308 50%,#ef4444 100%);
      background-size:100% 210px;background-position:bottom;"></div>
    <div style="position:absolute;left:0;right:0;bottom:25%;height:1px;background:rgba(255,255,255,.25);"></div>
    <div style="position:absolute;left:0;right:0;bottom:50%;height:1px;background:rgba(255,255,255,.4);"></div>
    <div style="position:absolute;left:0;right:0;bottom:75%;height:1px;background:rgba(255,255,255,.25);"></div>
  </div>
  <div style="font-size:.55rem;font-weight:800;letter-spacing:2.4px;opacity:.85;">SHOT</div>
</div>

<div id="aim-reticle" style="display:none;opacity:0;position:absolute;top:34%;left:50%;width:40px;height:40px;
  transform:translate(-50%,-50%);border-radius:50%;border:1.5px solid rgba(255,255,255,.82);
  background:rgba(15,23,42,.22);box-shadow:0 2px 8px rgba(0,0,0,.35);transition:opacity .08s;">
  <svg style="position:absolute;left:50%;top:50%;width:0;height:0;overflow:visible;">
    <path id="aim-curve" d="M0 0 L0 0" fill="none" stroke="#fde68a" stroke-width="2" stroke-linecap="round" opacity=".92"/>
  </svg>
  <div style="position:absolute;top:50%;left:50%;width:2.5px;height:2.5px;margin:-1.25px 0 0 -1.25px;
    border-radius:50%;background:rgba(255,255,255,.92);"></div>
  <div id="aim-dot" style="position:absolute;top:50%;left:50%;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;
    border-radius:50%;background:#fbbf24;border:1px solid #fff;"></div>
</div>

<div id="skill-panel" style="position:absolute;bottom:30px;right:26px;display:flex;gap:8px;"></div>

<div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);font-size:.55rem;letter-spacing:1.6px;opacity:.5;white-space:nowrap;">
  WASD MOVE · SHIFT SPRINT · HOLD LMB SHOOT · RMB SLIDE · SPACE JUMP / FLICK · Z X C SKILLS · R AWAKEN
</div>

<div id="awaken-flash" style="position:absolute;top:30%;left:50%;transform:translate(-50%,-50%);display:none;
  font-size:1.5rem;font-weight:900;letter-spacing:6px;color:#fef3c7;
  padding:8px 26px;border-radius:6px;background:rgba(15,23,42,.8);border:1px solid rgba(252,211,77,.55);
  border-top:3px solid #fcd34d;"></div>
<div id="lock-prompt" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  font-size:1rem;font-weight:800;letter-spacing:3px;background:rgba(15,23,42,.84);
  padding:12px 26px;border:1px solid rgba(255,255,255,.26);border-radius:6px;">
  CLICK TO PLAY
</div>`;
document.body.appendChild(hud);

const scoreEl        = document.getElementById("score")!;
const stamBar        = document.getElementById("stam-bar")! as HTMLElement;
const lockPrompt     = document.getElementById("lock-prompt")!;
const playstyleTag   = document.getElementById("playstyle-tag")!;
const skillPanel     = document.getElementById("skill-panel")!;
const awBar          = document.getElementById("aw-bar")! as HTMLElement;
const awReady        = document.getElementById("aw-ready")! as HTMLElement;
const awLabel        = document.getElementById("aw-label")!;
const awakenFlash    = document.getElementById("awaken-flash")!;
const powerGaugeWrap = document.getElementById("power-gauge-wrap")! as HTMLElement;
const powerGaugeFill = document.getElementById("power-gauge-fill")! as HTMLElement;
const powerGaugePct  = document.getElementById("power-gauge-pct")! as HTMLElement;
const aimReticle     = document.getElementById("aim-reticle")! as HTMLElement;
const aimDot         = document.getElementById("aim-dot")! as HTMLElement;
const aimCurve       = document.getElementById("aim-curve")! as unknown as SVGPathElement;

const PLAYSTYLE_HEX: Record<Playstyle, string> = {
  EGOIST: "#dc2626", PLAYMAKER: "#d97706", LOCKDOWN: "#059669", SPEEDSTER: "#2563eb",
};
const PLAYSTYLE_COLOR_INT: Record<Playstyle, number> = {
  EGOIST: 0xdc2626, PLAYMAKER: 0xd97706, LOCKDOWN: 0x059669, SPEEDSTER: 0x2563eb,
};
const SKILL_KEYS = ["Z", "X", "C"];

const hash1 = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// ─── SCENE / RENDERER ───────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6096d4);
scene.fog = new THREE.FogExp2(0xa9c4e2, 0.0021);

const BASE_FOV = 70;
const camera = new THREE.PerspectiveCamera(BASE_FOV, innerWidth / innerHeight, 0.1, 460);

window.addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

// ─── STADIUM SKY DOME ───────────────────────────────────────────────────────
const skyDome = new THREE.Mesh(
  new THREE.SphereGeometry(280, 24, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      topColor:  { value: new THREE.Color(0x163b78) },
      midColor:  { value: new THREE.Color(0x558fd2) },
      horColor:  { value: new THREE.Color(0xcfe3f7) },
      warmColor: { value: new THREE.Color(0xf1dcc0) },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 horColor;
      uniform vec3 warmColor;
      varying vec3 vPos;
      void main() {
        float h = clamp(vPos.y, 0.0, 1.0);
        vec3 col = mix(warmColor, horColor, smoothstep(0.0, 0.06, h));
        col = mix(col, midColor, smoothstep(0.04, 0.28, h));
        col = mix(col, topColor, smoothstep(0.24, 0.85, h));
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
);
scene.add(skyDome);

// ─── STADIUM LIGHTING ───────────────────────────────────────────────────────
const hemiLight = new THREE.HemisphereLight(0xdbe7f7, 0x2a4a33, 0.85);
scene.add(hemiLight);

const sun = new THREE.DirectionalLight(0xffefd0, 2.0);
sun.position.set(28, 52, 24);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 140;
sun.shadow.camera.left = -34;
sun.shadow.camera.right = 34;
sun.shadow.camera.top = 34;
sun.shadow.camera.bottom = -34;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun);
scene.add(sun.target);

const skyFill = new THREE.DirectionalLight(0xbcd2ee, 0.45);
skyFill.position.set(-34, 24, -26);
scene.add(skyFill);

// ─── PITCH DIMENSIONS & MARKINGS CONSTANTS (130 x 84) ───────────────────────
const PITCH_W = 130, PITCH_H = 0.3, PITCH_D = 84;
const hw = PITCH_W / 2, hd = PITCH_D / 2;

const GOAL_W = 14, GOAL_H = 4.4, GOAL_D = 3.8;
const wallH = 10;

const PEN_DEPTH = 22, PEN_HALF = 20;
const SIX_DEPTH = 8,  SIX_HALF = 11;
const SPOT_DIST = 14, ARC_R = 11;
const CIRCLE_R = 12.5;

// ─── TURF: MOWN STRIPES, SOFT PATCHING, GOALMOUTH WEAR ──────────────────────
function makeTurfTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 2048; c.height = 1320;
  const ctx = c.getContext("2d")!;
  const stripes = 13;
  const sw = c.width / stripes;
  for (let i = 0; i < stripes; i++) {
    const grad = ctx.createLinearGradient(i * sw, 0, (i + 1) * sw, 0);
    if (i % 2 === 0) {
      grad.addColorStop(0, "#17562f");
      grad.addColorStop(0.5, "#1a5f34");
      grad.addColorStop(1, "#17562f");
    } else {
      grad.addColorStop(0, "#21803f");
      grad.addColorStop(0.5, "#258a45");
      grad.addColorStop(1, "#21803f");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(i * sw, 0, sw + 1, c.height);
  }

  for (let i = 0; i < 90; i++) {
    const x = hash1(i * 1.37) * c.width;
    const y = hash1(i * 2.91 + 5) * c.height;
    const r = 90 + hash1(i * 4.13) * 240;
    const light = i % 2 === 0;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, light ? "rgba(190,235,170,0.07)" : "rgba(4,40,20,0.10)");
    g.addColorStop(1, light ? "rgba(190,235,170,0)" : "rgba(4,40,20,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  ctx.fillStyle = "rgba(255,255,255,0.028)";
  for (let y = 0; y < c.height; y += 24) {
    if ((y / 24) % 2 === 0) ctx.fillRect(0, y, c.width, 12);
  }

  for (let i = 0; i < 22000; i++) {
    const x = hash1(i * 1.913) * c.width;
    const y = hash1(i * 3.371 + 9) * c.height;
    ctx.fillStyle = i % 3 === 0 ? "rgba(187,247,208,0.05)" : "rgba(5,46,22,0.10)";
    ctx.fillRect(x, y, 2, 4);
  }

  const wear = (u: number, v: number, r: number, a: number) => {
    ctx.save();
    ctx.translate(u * c.width, v * c.height);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(104,94,52,${a})`);
    g.addColorStop(1, "rgba(104,94,52,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  wear(0.5, 0.5, 46, 0.26);
  wear(0.03, 0.5, 150, 0.30);
  wear(0.97, 0.5, 150, 0.30);
  wear(0.5 - (hw - SPOT_DIST) / PITCH_W, 0.5, 42, 0.30);
  wear(0.5 + (hw - SPOT_DIST) / PITCH_W, 0.5, 42, 0.30);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

const pitchMesh = new THREE.Mesh(
  new THREE.BoxGeometry(PITCH_W, PITCH_H, PITCH_D),
  new THREE.MeshStandardMaterial({ map: makeTurfTexture(), roughness: 0.95, metalness: 0.0 })
);
pitchMesh.receiveShadow = true;
pitchMesh.position.y = -PITCH_H / 2;
scene.add(pitchMesh);

const apronMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(PITCH_W + 110, PITCH_D + 110),
  new THREE.MeshStandardMaterial({ color: 0x474f5c, roughness: 0.94, metalness: 0.03 })
);
apronMesh.rotation.x = -Math.PI / 2;
apronMesh.position.y = -0.04;
apronMesh.receiveShadow = true;
scene.add(apronMesh);

// ─── PITCH MARKINGS ────────────────────────────────────────────────────────
const LINE_W = 0.16;
const lineVerts: number[] = [];
function addLineStrip(pts: [number, number][], closed = false) {
  const n = pts.length;
  const segs = closed ? n : n - 1;
  const y = 0.02;
  for (let i = 0; i < segs; i++) {
    const [x0, z0] = pts[i];
    const [x1, z1] = pts[(i + 1) % n];
    let dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    if (len < 1e-6) continue;
    dx /= len; dz /= len;
    const e = LINE_W * 0.5;
    const ax = x0 - dx * e, az = z0 - dz * e;
    const bx = x1 + dx * e, bz = z1 + dz * e;
    const nx = -dz * LINE_W * 0.5, nz = dx * LINE_W * 0.5;
    lineVerts.push(
      ax + nx, y, az + nz,  ax - nx, y, az - nz,  bx + nx, y, bz + nz,
      ax - nx, y, az - nz,  bx - nx, y, bz - nz,  bx + nx, y, bz + nz
    );
  }
}
function arcPoints(cx: number, cz: number, r: number, a0: number, a1: number, steps: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (a1 - a0) * (i / steps);
    out.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
  }
  return out;
}

addLineStrip([[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]], true);
addLineStrip([[0, -hd], [0, hd]]);
addLineStrip(arcPoints(0, 0, CIRCLE_R, 0, Math.PI * 2, 96), true);

const spotGeo = new THREE.CircleGeometry(0.3, 16);
const lineMat = new THREE.MeshBasicMaterial({ color: 0xf2f5ef, side: THREE.DoubleSide });
function addSpot(x: number, z: number) {
  const s = new THREE.Mesh(spotGeo, lineMat);
  s.rotation.x = -Math.PI / 2;
  s.position.set(x, 0.022, z);
  scene.add(s);
}
addSpot(0, 0);

[-1, 1].forEach(side => {
  const penX = side * (hw - PEN_DEPTH);
  addLineStrip([[side * hw, -PEN_HALF], [penX, -PEN_HALF], [penX, PEN_HALF], [side * hw, PEN_HALF]]);
  const sixX = side * (hw - SIX_DEPTH);
  addLineStrip([[side * hw, -SIX_HALF], [sixX, -SIX_HALF], [sixX, SIX_HALF], [side * hw, SIX_HALF]]);
  const spotX = side * (hw - SPOT_DIST);
  addSpot(spotX, 0);
  const amax = Math.acos((PEN_DEPTH - SPOT_DIST) / ARC_R);
  const arcPts: [number, number][] = [];
  for (let i = 0; i <= 36; i++) {
    const a = -amax + (i / 36) * amax * 2;
    arcPts.push([spotX - side * Math.cos(a) * ARC_R, Math.sin(a) * ARC_R]);
  }
  addLineStrip(arcPts);
});

([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).forEach(([sx, sz]) => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * (Math.PI / 2);
    pts.push([sx * hw - sx * Math.cos(a) * 1.6, sz * hd - sz * Math.sin(a) * 1.6]);
  }
  addLineStrip(pts);
});

{
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(lineVerts), 3));
  const lineMesh = new THREE.Mesh(lineGeo, lineMat);
  scene.add(lineMesh);
}

// ─── SOFT CONTACT SHADOWS (BLOB) ────────────────────────────────────────────
function makeBlobTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  g.addColorStop(0, "rgba(0,0,0,0.62)");
  g.addColorStop(0.55, "rgba(0,0,0,0.28)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
const blobTex = makeBlobTexture();
const blobGeo = new THREE.PlaneGeometry(1, 1);
const playerBlobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0.85 });
const playerBlob = new THREE.Mesh(blobGeo, playerBlobMat);
playerBlob.rotation.x = -Math.PI / 2;
playerBlob.scale.set(1.5, 1.5, 1);
playerBlob.position.y = 0.035;
scene.add(playerBlob);
const ballBlobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0.75 });
const ballBlob = new THREE.Mesh(blobGeo, ballBlobMat);
ballBlob.rotation.x = -Math.PI / 2;
ballBlob.position.y = 0.036;
scene.add(ballBlob);

// ─── STADIUM ARCHITECTURE, TUNNEL, JUMBOTRONS & CROWD ───────────────────────
let jumbotronTex!: THREE.CanvasTexture;
let jumbotronCtx!: CanvasRenderingContext2D;
let jumbotronCanvas!: HTMLCanvasElement;

function updateJumbotronScreen(home: number, away: number, status = "MATCH DAY") {
  if (!jumbotronCtx) return;
  const w = jumbotronCanvas.width, h = jumbotronCanvas.height;
  jumbotronCtx.fillStyle = "#0b111b";
  jumbotronCtx.fillRect(0, 0, w, h);
  jumbotronCtx.fillStyle = "#161e2c";
  jumbotronCtx.fillRect(10, 10, w - 20, h - 20);
  jumbotronCtx.strokeStyle = "#aab4c3";
  jumbotronCtx.lineWidth = 3;
  jumbotronCtx.strokeRect(10, 10, w - 20, h - 20);
  jumbotronCtx.fillStyle = "#8f9bb0";
  jumbotronCtx.font = "bold 22px Segoe UI, sans-serif";
  jumbotronCtx.textAlign = "center";
  jumbotronCtx.fillText(status, w / 2, 52);
  jumbotronCtx.fillStyle = "#f4f6f9";
  jumbotronCtx.font = "bold 94px Segoe UI, sans-serif";
  jumbotronCtx.fillText(`${home}  —  ${away}`, w / 2, 160);
  jumbotronCtx.fillStyle = "#e2b64a";
  jumbotronCtx.font = "bold 20px Segoe UI, sans-serif";
  jumbotronCtx.fillText("HOME", w * 0.22, 222);
  jumbotronCtx.fillText("AWAY", w * 0.78, 222);
  jumbotronTex.needsUpdate = true;
}

interface Seat { x: number; y: number; z: number; }
const crowdSeats: Seat[] = (() => {
  const out: Seat[] = [];
  for (const side of [-1, 1]) {
    for (let tier = 0; tier < 4; tier++) {
      for (let x = -hw; x <= hw; x += 1.3) {
        if (side === -1 && tier === 0 && Math.abs(x) < 6.4) continue;
        out.push({ x: x + (hash1(out.length) - 0.5) * 0.3, y: 2.9 + tier * 2.25, z: side * (hd + 4.8 + tier * 3.8) });
      }
    }
  }
  for (const side of [-1, 1]) {
    for (let tier = 0; tier < 4; tier++) {
      for (let z = -hd + 1; z <= hd - 1; z += 1.5) {
        out.push({ x: side * (hw + 7.5 + tier * 3.8), y: 2.9 + tier * 2.25, z: z + (hash1(out.length) - 0.5) * 0.3 });
      }
    }
  }
  return out;
})();

const CROWD_COUNT = crowdSeats.length;
const crowdBaseX = new Float32Array(CROWD_COUNT);
const crowdBaseY = new Float32Array(CROWD_COUNT);
const crowdBaseZ = new Float32Array(CROWD_COUNT);
const crowdPhase = new Float32Array(CROWD_COUNT);
let crowdMesh!: THREE.InstancedMesh;
let crowdExcitement = 0;

function makeAdTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 64;
  const ctx = c.getContext("2d")!;
  const labels = ["ARC STEEL", "HOSHI AIR", "MERIDIAN", "KITA FOODS", "SORA BANK", "TIDEWAY"];
  const bgs = ["#101827", "#e5e9ee", "#1f4fb0", "#e5e9ee", "#a82424", "#e5e9ee"];
  const fgs = ["#f4f6f9", "#101827", "#f4f6f9", "#101827", "#f4f6f9", "#101827"];
  const cw = c.width / labels.length;
  labels.forEach((l, i) => {
    ctx.fillStyle = bgs[i];
    ctx.fillRect(i * cw, 0, cw, c.height);
    ctx.fillStyle = fgs[i];
    ctx.font = "bold 28px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(l, i * cw + cw / 2, c.height / 2 + 2);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function makeSeatTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 32;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#1a2230";
  ctx.fillRect(0, 0, 128, 32);
  const cols = ["#27406b", "#27406b", "#8b2a2a", "#cfd6df", "#27406b", "#3a4a63"];
  for (let r = 0; r < 4; r++) {
    for (let i = 0; i < 16; i++) {
      const k = Math.floor(hash1(r * 31 + i * 7.7) * cols.length);
      ctx.fillStyle = cols[k];
      ctx.fillRect(i * 8 + 1, r * 8 + 2, 6, 4);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.anisotropy = 4;
  return tex;
}

function buildStadiumAtmosphere() {
  const concreteMat  = new THREE.MeshStandardMaterial({ color: 0x5b6472, roughness: 0.9, metalness: 0.05 });
  const riserMat     = new THREE.MeshStandardMaterial({ color: 0x424b59, roughness: 0.88, metalness: 0.08 });
  const roofMat      = new THREE.MeshStandardMaterial({ color: 0x2b3340, roughness: 0.6, metalness: 0.4 });
  const roofUnderMat = new THREE.MeshStandardMaterial({ color: 0x9aa4b2, roughness: 0.8, metalness: 0.1 });
  const steelMat     = new THREE.MeshStandardMaterial({ color: 0x59616e, roughness: 0.5, metalness: 0.6 });
  const trimMat      = new THREE.MeshStandardMaterial({ color: 0xe5e9ee, roughness: 0.55, metalness: 0.05 });
  const bannerBlue   = new THREE.MeshStandardMaterial({ color: 0x1f4fb0, roughness: 0.7 });
  const bannerRed    = new THREE.MeshStandardMaterial({ color: 0xa82424, roughness: 0.7 });

  const seatBase = makeSeatTexture();
  const seatPlane = (rowLen: number, depth: number, x: number, y: number, z: number, endStand: boolean) => {
    const t = seatBase.clone();
    t.needsUpdate = true;
    t.repeat.set(rowLen / 8, depth / 3.2);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(rowLen, depth),
      new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 })
    );
    m.rotation.set(-Math.PI / 2, 0, endStand ? Math.PI / 2 : 0);
    m.position.set(x, y, z);
    scene.add(m);
  };
  const tierTop = (t: number) => (t === 0 ? 2.4 : 2.35 + t * 2.25) + 0.02;

  [-1, 1].forEach((side, sIdx) => {
    const zBase = side * (hd + 4.8);
    if (side === -1) {
      const gap = 10;
      const segW = (PITCH_W + 6 - gap) / 2;
      [-1, 1].forEach(segSide => {
        const lower = new THREE.Mesh(new THREE.BoxGeometry(segW, 2.4, 4.2), concreteMat);
        lower.position.set(segSide * (gap / 2 + segW / 2), 1.2, zBase);
        scene.add(lower);
        seatPlane(segW, 3.8, segSide * (gap / 2 + segW / 2), tierTop(0), zBase, false);
      });
      const tunnelVoid = new THREE.Mesh(
        new THREE.BoxGeometry(9.0, 3.8, 9),
        new THREE.MeshBasicMaterial({ color: 0x0a0f19 })
      );
      tunnelVoid.position.set(0, 1.9, zBase - 1.8);
      scene.add(tunnelVoid);

      const tunnelArch = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.8, 4.6), riserMat);
      tunnelArch.position.set(0, 4.1, zBase);
      scene.add(tunnelArch);

      const tunnelTrim = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.24, 0.28), trimMat);
      tunnelTrim.position.set(0, 3.7, zBase + 2.25);
      scene.add(tunnelTrim);
    } else {
      const lower = new THREE.Mesh(new THREE.BoxGeometry(PITCH_W + 6, 2.4, 4.2), concreteMat);
      lower.position.set(0, 1.2, zBase);
      scene.add(lower);
      seatPlane(PITCH_W + 6, 3.8, 0, tierTop(0), zBase, false);
    }

    for (let t = 1; t < 4; t++) {
      const w = PITCH_W + 8 + t * 2;
      const tier = new THREE.Mesh(new THREE.BoxGeometry(w, 2.3, 4.0), t % 2 ? riserMat : concreteMat);
      tier.position.set(0, 1.2 + t * 2.25, zBase + side * t * 3.8);
      scene.add(tier);
      seatPlane(w, 3.6, 0, tierTop(t), zBase + side * t * 3.8, false);
    }

    const roofZ = zBase + side * 7.2;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(PITCH_W + 18, 0.9, 15.5), roofMat);
    roof.position.set(0, 12.6, roofZ);
    scene.add(roof);

    const roofUnder = new THREE.Mesh(new THREE.BoxGeometry(PITCH_W + 16, 0.12, 15.0), roofUnderMat);
    roofUnder.position.set(0, 12.08, roofZ);
    scene.add(roofUnder);

    for (let i = 0; i <= 8; i++) {
      const x = (i / 8 - 0.5) * (PITCH_W + 12);
      const rafter = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 15.0), steelMat);
      rafter.position.set(x, 11.75, roofZ);
      scene.add(rafter);
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.9, 12.2, 0.9), steelMat);
      col.position.set(x, 6.1, zBase + side * 14.4);
      scene.add(col);
    }

    const back = new THREE.Mesh(new THREE.BoxGeometry(PITCH_W + 14, 12, 0.8), riserMat);
    back.position.set(0, 6, zBase + side * 15.6);
    scene.add(back);

    const fascia = new THREE.Mesh(new THREE.BoxGeometry(PITCH_W + 4, 0.45, 0.2), sIdx === 0 ? bannerBlue : bannerRed);
    fascia.position.set(0, 2.55, side * (hd + 2.65));
    scene.add(fascia);

    const roofEdge = new THREE.Mesh(new THREE.BoxGeometry(PITCH_W + 18, 0.5, 0.25), trimMat);
    roofEdge.position.set(0, 12.65, zBase - side * 0.6);
    scene.add(roofEdge);
  });

  jumbotronCanvas = document.createElement("canvas");
  jumbotronCanvas.width = 512;
  jumbotronCanvas.height = 256;
  jumbotronCtx = jumbotronCanvas.getContext("2d")!;
  jumbotronTex = new THREE.CanvasTexture(jumbotronCanvas);
  jumbotronTex.colorSpace = THREE.SRGBColorSpace;
  updateJumbotronScreen(0, 0);

  const screenMat = new THREE.MeshBasicMaterial({ map: jumbotronTex });

  [-1, 1].forEach((side, sIdx) => {
    const xBase = side * (hw + 7.5);
    for (let t = 0; t < 4; t++) {
      const d = PITCH_D + 6 + t * 2;
      const tier = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.3, d), t % 2 ? riserMat : concreteMat);
      tier.position.set(xBase + side * t * 3.8, 1.2 + t * 2.25, 0);
      scene.add(tier);
      seatPlane(d, 3.6, xBase + side * t * 3.8, tierTop(t), 0, true);
    }
    const fascia = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, PITCH_D + 2), sIdx === 0 ? bannerRed : bannerBlue);
    fascia.position.set(side * (hw + 5.45), 2.55, 0);
    scene.add(fascia);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.8, 12, PITCH_D + 22), riserMat);
    back.position.set(side * (hw + 22.4), 6, 0);
    scene.add(back);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 10.3, 20.7), roofMat);
    frame.position.set(side * (hw + 14.5), 15.2, 0);
    scene.add(frame);

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(19, 9.5), screenMat);
    screen.position.set(side * (hw + 13.85), 15.2, 0);
    screen.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    scene.add(screen);

    [-9, 9].forEach(zc => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.8, 15, 0.8), steelMat);
      col.position.set(side * (hw + 21.5), 7.5, zc);
      scene.add(col);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.6, 0.6), steelMat);
      arm.position.set(side * (hw + 18), 14.4, zc);
      scene.add(arm);
    });
  });

  const adLong = makeAdTexture();
  adLong.repeat.set(PITCH_W / 15.2, 1);
  const adEnd = makeAdTexture();
  adEnd.repeat.set(PITCH_D / 15.2, 1);
  const adLongMat = new THREE.MeshStandardMaterial({ map: adLong, roughness: 0.6, metalness: 0.05 });
  const adEndMat  = new THREE.MeshStandardMaterial({ map: adEnd, roughness: 0.6, metalness: 0.05 });
  [-1, 1].forEach(side => {
    const longBoard = new THREE.Mesh(new THREE.BoxGeometry(PITCH_W, 0.95, 0.14), adLongMat);
    longBoard.position.set(0, 0.475, side * (hd + 0.55));
    scene.add(longBoard);
    const endBoard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.95, PITCH_D), adEndMat);
    endBoard.position.set(side * (hw + GOAL_D + 1.0), 0.475, 0);
    endBoard.rotation.y = Math.PI;
    scene.add(endBoard);
  });

  const crowdGeo = new THREE.CapsuleGeometry(0.22, 0.6, 2, 6);
  const crowdMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  crowdMesh = new THREE.InstancedMesh(crowdGeo, crowdMat, CROWD_COUNT);
  const dummy = new THREE.Object3D();
  const cCol = new THREE.Color();
  const palette = [0x7f1d1d, 0x1e3a8a, 0xcbd5e1, 0xa16207, 0x14532d, 0x475569, 0x1e293b, 0x94a3b8];

  for (let i = 0; i < CROWD_COUNT; i++) {
    const s = crowdSeats[i];
    crowdBaseX[i] = s.x;
    crowdBaseY[i] = s.y;
    crowdBaseZ[i] = s.z;
    crowdPhase[i] = hash1(i * 1.7) * Math.PI * 2;

    dummy.position.set(s.x, s.y, s.z);
    dummy.scale.set(1, 0.88 + hash1(i * 3.1) * 0.28, 1);
    dummy.updateMatrix();
    crowdMesh.setMatrixAt(i, dummy.matrix);
    cCol.setHex(palette[Math.floor(hash1(i * 5.3) * palette.length)]);
    cCol.multiplyScalar(0.8 + hash1(i * 2.2) * 0.35);
    crowdMesh.setColorAt(i, cCol);
  }
  crowdMesh.instanceMatrix.needsUpdate = true;
  if (crowdMesh.instanceColor) crowdMesh.instanceColor.needsUpdate = true;
  scene.add(crowdMesh);

  const mastGeo = new THREE.CylinderGeometry(0.5, 0.8, 42, 8);
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x3c4553, metalness: 0.5, roughness: 0.5 });
  const headGeo = new THREE.BoxGeometry(5, 1.8, 1);
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff3d8 });
  const corners: readonly (readonly [number, number])[] = [
    [-(hw + 16), -(hd + 22)],
    [ (hw + 16), -(hd + 22)],
    [-(hw + 16),  (hd + 22)],
    [ (hw + 16),  (hd + 22)],
  ];

  corners.forEach(([cx, cz]) => {
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(cx, 21, cz);
    scene.add(mast);

    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(cx, 42, cz);
    head.lookAt(0, 0, 0);
    scene.add(head);

    const spot = new THREE.SpotLight(0xfff3dc, 2.4, 280, Math.PI / 4.6, 0.65, 1.1);
    spot.position.set(cx * 0.96, 41, cz * 0.96);
    spot.target.position.set(0, 0, 0);
    scene.add(spot);
    scene.add(spot.target);
  });
}
buildStadiumAtmosphere();

const _crowdDummy = new THREE.Object3D();
let crowdAnimAccum = 0;
function updateCrowd(dt: number, nowSec: number) {
  crowdExcitement = Math.max(0, crowdExcitement - dt * 0.35);
  crowdAnimAccum += dt;
  if (crowdAnimAccum < 1 / 30) return;
  crowdAnimAccum = 0;

  const speed = 3.2 + crowdExcitement * 7.5;
  const amp   = 0.1 + crowdExcitement * 0.4;
  for (let i = 0; i < CROWD_COUNT; i++) {
    const wave = Math.sin(nowSec * speed + crowdPhase[i]);
    _crowdDummy.position.set(crowdBaseX[i], crowdBaseY[i] + Math.max(0, wave) * amp, crowdBaseZ[i]);
    _crowdDummy.rotation.z = wave * (0.06 + crowdExcitement * 0.18);
    _crowdDummy.updateMatrix();
    crowdMesh.setMatrixAt(i, _crowdDummy.matrix);
  }
  crowdMesh.instanceMatrix.needsUpdate = true;
}

// ─── GOALS (TAUT MESH NETS) & BOUNDARY BOARDS ───────────────────────────────
const wallMat = new THREE.MeshStandardMaterial({
  color: 0x334155, roughness: 0.7, metalness: 0.1, transparent: true, opacity: 0.12,
});
function makeWallMesh(w: number, h: number, d: number, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  mesh.position.set(x, y, z);
  scene.add(mesh);
}

makeWallMesh(PITCH_W, wallH, 0.5, 0, wallH / 2, -hd);
makeWallMesh(PITCH_W, wallH, 0.5, 0, wallH / 2, hd);

const sideWallZLen = (PITCH_D - GOAL_W) / 2;
const sideWallZPos = GOAL_W / 2 + sideWallZLen / 2;
const headerH = wallH - GOAL_H;
[-1, 1].forEach(side => {
  const ex = side * hw;
  makeWallMesh(0.5, wallH, sideWallZLen, ex, wallH / 2, -sideWallZPos);
  makeWallMesh(0.5, wallH, sideWallZLen, ex, wallH / 2,  sideWallZPos);
  makeWallMesh(0.5, headerH, GOAL_W,     ex, GOAL_H + headerH / 2, 0);
});

function makeNetTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 64, 64);
  ctx.strokeStyle = "rgba(248,250,252,0.95)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(64, 0);
  ctx.moveTo(0, 0); ctx.lineTo(0, 64);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const netBaseTex = makeNetTexture();
function netTex(w: number, h: number): THREE.Texture {
  const t = netBaseTex.clone();
  t.repeat.set(w / 0.24, h / 0.24);
  t.needsUpdate = true;
  return t;
}
const mkNetMat = (w: number, h: number) => new THREE.MeshBasicMaterial({
  map: netTex(w, h), transparent: true, alphaTest: 0.12, side: THREE.DoubleSide, depthWrite: false, opacity: 0.9,
});
const netBackMat = mkNetMat(GOAL_W, GOAL_H);
const netSideMat = mkNetMat(GOAL_D, GOAL_H);
const netTopMat  = mkNetMat(GOAL_D, GOAL_W);

const goalMat       = new THREE.MeshStandardMaterial({ color: 0xf4f6f9, roughness: 0.3, metalness: 0.3 });
const goalPostGeo   = new THREE.CylinderGeometry(0.12, 0.12, GOAL_H, 12);
const goalBarGeo    = new THREE.CylinderGeometry(0.12, 0.12, GOAL_W, 12);
const goalDepthBar  = new THREE.CylinderGeometry(0.075, 0.075, GOAL_D, 8);
const goalNetGeo    = new THREE.PlaneGeometry(GOAL_W, GOAL_H);
const goalSideNetG  = new THREE.PlaneGeometry(GOAL_D, GOAL_H);
const goalTopNetGeo = new THREE.PlaneGeometry(GOAL_D, GOAL_W);

function buildGoal(side: number) {
  const mouthX = side * hw;
  const backX  = side * (hw + GOAL_D);
  const midX   = side * (hw + GOAL_D / 2);

  [-GOAL_W / 2, GOAL_W / 2].forEach(zo => {
    const frontPost = new THREE.Mesh(goalPostGeo, goalMat);
    frontPost.position.set(mouthX, GOAL_H / 2, zo);
    frontPost.castShadow = true;
    scene.add(frontPost);

    const backPost = new THREE.Mesh(goalPostGeo, goalMat);
    backPost.scale.set(0.65, 1, 0.65);
    backPost.position.set(backX, GOAL_H / 2, zo);
    scene.add(backPost);

    const topSide = new THREE.Mesh(goalDepthBar, goalMat);
    topSide.rotation.z = Math.PI / 2;
    topSide.position.set(midX, GOAL_H, zo);
    scene.add(topSide);

    const baseSide = new THREE.Mesh(goalDepthBar, goalMat);
    baseSide.rotation.z = Math.PI / 2;
    baseSide.scale.set(0.8, 1, 0.8);
    baseSide.position.set(midX, 0.05, zo);
    scene.add(baseSide);

    const sideNet = new THREE.Mesh(goalSideNetG, netSideMat);
    sideNet.position.set(midX, GOAL_H / 2, zo);
    scene.add(sideNet);
  });

  const bar = new THREE.Mesh(goalBarGeo, goalMat);
  bar.rotation.x = Math.PI / 2;
  bar.position.set(mouthX, GOAL_H, 0);
  bar.castShadow = true;
  scene.add(bar);

  const backBar = new THREE.Mesh(goalBarGeo, goalMat);
  backBar.rotation.x = Math.PI / 2;
  backBar.scale.set(0.65, 1, 0.65);
  backBar.position.set(backX, GOAL_H, 0);
  scene.add(backBar);

  const net = new THREE.Mesh(goalNetGeo, netBackMat);
  net.position.set(backX, GOAL_H / 2, 0);
  net.rotation.y = Math.PI / 2;
  scene.add(net);

  const topNet = new THREE.Mesh(goalTopNetGeo, netTopMat);
  topNet.position.set(midX, GOAL_H, 0);
  topNet.rotation.x = -Math.PI / 2;
  scene.add(topNet);
}
buildGoal(-1);
buildGoal(1);

// ─── RAPIER PHYSICS ─────────────────────────────────────────────────────────
await RAPIER.init();
const GRAVITY = 28;
const world = new RAPIER.World({ x: 0, y: -GRAVITY, z: 0 });

const FIXED_DT = 1 / 60;
let physicsAccum = 0;

const GRP_WORLD  = 0x0001;
const GRP_PLAYER = 0x0002;
const GRP_BALL   = 0x0004;
const makeGroups = (membership: number, filter: number) =>
  ((membership & 0xffff) << 16) | (filter & 0xffff);

const WORLD_GROUPS       = makeGroups(GRP_WORLD, GRP_WORLD | GRP_PLAYER | GRP_BALL);
const PLAYER_GROUPS_FREE = makeGroups(GRP_PLAYER, GRP_WORLD | GRP_BALL);
const PLAYER_GROUPS_POSS = makeGroups(GRP_PLAYER, GRP_WORLD);
const BALL_GROUPS_FREE   = makeGroups(GRP_BALL, GRP_WORLD | GRP_PLAYER);
const BALL_GROUPS_POSS   = makeGroups(GRP_BALL, GRP_WORLD);

function makeStaticBox(hx: number, hy: number, hz: number, x: number, y: number, z: number) {
  const desc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z);
  const body = world.createRigidBody(desc);
  const col  = world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz), body);
  col.setCollisionGroups(WORLD_GROUPS);
  return body;
}

makeStaticBox(PITCH_W / 2 + GOAL_D, PITCH_H / 2, PITCH_D / 2, 0, -PITCH_H / 2, 0);
makeStaticBox(PITCH_W / 2, wallH / 2, 0.25, 0, wallH / 2, -hd);
makeStaticBox(PITCH_W / 2, wallH / 2, 0.25, 0, wallH / 2, hd);

[-1, 1].forEach(side => {
  const ex = side * hw;
  makeStaticBox(0.25, wallH / 2, sideWallZLen / 2, ex, wallH / 2, -sideWallZPos);
  makeStaticBox(0.25, wallH / 2, sideWallZLen / 2, ex, wallH / 2,  sideWallZPos);
  makeStaticBox(0.25, headerH / 2, GOAL_W / 2,     ex, GOAL_H + headerH / 2, 0);

  const backX = side * (hw + GOAL_D);
  const midX  = side * (hw + GOAL_D / 2);
  makeStaticBox(0.15, GOAL_H / 2, GOAL_W / 2, backX, GOAL_H / 2, 0);
  makeStaticBox(GOAL_D / 2, GOAL_H / 2, 0.15, midX, GOAL_H / 2, -GOAL_W / 2);
  makeStaticBox(GOAL_D / 2, GOAL_H / 2, 0.15, midX, GOAL_H / 2,  GOAL_W / 2);
  makeStaticBox(GOAL_D / 2, 0.15, GOAL_W / 2, midX, GOAL_H, 0);
});

// ─── CEL-SHADING, RIM LIGHT & OUTLINE HELPERS ───────────────────────────────
const toonGradData = new Uint8Array([100, 184, 255]);
const toonGradTex = new THREE.DataTexture(toonGradData, 3, 1, THREE.RedFormat);
toonGradTex.minFilter = THREE.NearestFilter;
toonGradTex.magFilter = THREE.NearestFilter;
toonGradTex.needsUpdate = true;

function addRim(mat: THREE.MeshToonMaterial, rimHex: number, strength: number, power = 2.6) {
  const c = new THREE.Color(rimHex);
  const rimVec = `vec3(${c.r.toFixed(3)}, ${c.g.toFixed(3)}, ${c.b.toFixed(3)})`;
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
       float rimF = pow(1.0 - saturate(dot(normalize(vViewPosition), normal)), ${power.toFixed(2)});
       rimF = smoothstep(0.5, 0.88, rimF);
       totalEmissiveRadiance += ${rimVec} * rimF * ${strength.toFixed(3)};`
    );
  };
  mat.customProgramCacheKey = () => `rim_${rimHex}_${strength}_${power}`;
}

const outlineMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.BackSide });
function addOutline(mesh: THREE.Mesh, scale = 1.055) {
  const outline = new THREE.Mesh(mesh.geometry, outlineMat);
  outline.scale.setScalar(scale);
  mesh.add(outline);
}

// ─── CLASSIC PATTERNED LEATHER SOCCER BALL ──────────────────────────────────
function makeSoccerBallTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, c.width, c.height);

  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 3;
  for (let x = 0; x < c.width; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke();
  }
  for (let y = 0; y < c.height; y += 64) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke();
  }

  ctx.fillStyle = "#1e293b";
  const drawPentagon = (cx: number, cy: number, r: number) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  };
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      const ox = (row % 2) * 52 + col * 104 + 26;
      const oy = row * 84 + 42;
      drawPentagon(ox, oy, 22);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const BALL_R = 0.24;
const ballVisual = new THREE.Group();
scene.add(ballVisual);

const ballCoreMat = new THREE.MeshStandardMaterial({
  map: makeSoccerBallTexture(),
  roughness: 0.5,
  metalness: 0.04,
});
const ballCore = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 24, 18), ballCoreMat);
ballCore.castShadow = true;
addOutline(ballCore, 1.05);
ballVisual.add(ballCore);

const TRAIL_LEN = 36;
const trailPositions = new Float32Array(TRAIL_LEN * 3);
const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
const trailMat = new THREE.LineBasicMaterial({
  color: 0xf8fafc, transparent: true, opacity: 0.55,
});
const trailLine = new THREE.Line(trailGeo, trailMat);
trailLine.frustumCulled = false;
scene.add(trailLine);
let trailCount = 0;

const RIB_W = 0.36;
const ribbonPos = new Float32Array(TRAIL_LEN * 2 * 3);
const ribbonGeo = new THREE.BufferGeometry();
ribbonGeo.setAttribute("position", new THREE.BufferAttribute(ribbonPos, 3));
{
  const idx: number[] = [];
  for (let i = 0; i < TRAIL_LEN - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  ribbonGeo.setIndex(idx);
}
const ribbonMat = new THREE.MeshBasicMaterial({
  color: 0xf8fafc, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false,
});
const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
ribbonMesh.frustumCulled = false;
scene.add(ribbonMesh);

const ballBodyDesc = RAPIER.RigidBodyDesc.dynamic()
  .setTranslation(0, 1.0, 0)
  .setLinearDamping(0.45)
  .setAngularDamping(0.35);
const ballBody = world.createRigidBody(ballBodyDesc);
const ballCollider = world.createCollider(
  RAPIER.ColliderDesc.ball(BALL_R).setRestitution(0.55).setFriction(0.45),
  ballBody
);
ballCollider.setCollisionGroups(BALL_GROUPS_FREE);

// ─── ARTICULATED ANIME-SPORTS PLAYER RIG ────────────────────────────────────
const PLAYER_H = 1.8, PLAYER_R = 0.35;

const jerseyMat = new THREE.MeshToonMaterial({ color: 0xdc2626, gradientMap: toonGradTex });
const jerseyDarkMat = new THREE.MeshToonMaterial({ color: 0x1e293b, gradientMap: toonGradTex });
const shortsMat = new THREE.MeshToonMaterial({ color: 0x0f172a, gradientMap: toonGradTex });
const skinMat = new THREE.MeshToonMaterial({ color: 0xf6c9ad, gradientMap: toonGradTex });
const hairMat = new THREE.MeshToonMaterial({ color: 0x181c2e, gradientMap: toonGradTex });
const accentMat = new THREE.MeshToonMaterial({ color: 0xf8fafc, gradientMap: toonGradTex });
const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
const irisMat = new THREE.MeshBasicMaterial({ color: 0x1d4ed8 });
const browMat = new THREE.MeshBasicMaterial({ color: 0x181c2e });
const lidMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
const cleatMat = new THREE.MeshToonMaterial({ color: 0x1e293b, gradientMap: toonGradTex });
const cleatStripeMat = new THREE.MeshToonMaterial({ color: 0xdc2626, gradientMap: toonGradTex });

addRim(jerseyMat, 0xfff1c9, 0.42);
addRim(hairMat, 0x8fb0ff, 0.75, 2.2);
addRim(skinMat, 0xffe2cc, 0.3);

const playerRoot = new THREE.Group();
scene.add(playerRoot);

const torsoGroup = new THREE.Group();
torsoGroup.position.set(0, 0.90, 0);
playerRoot.add(torsoGroup);

const pelvisMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.168, 0.14, 10), shortsMat);
pelvisMesh.scale.set(1.12, 1, 0.72);
pelvisMesh.position.set(0, 0.02, 0);
pelvisMesh.castShadow = true;
addOutline(pelvisMesh, 1.055);
torsoGroup.add(pelvisMesh);

const waistMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.142, 0.21, 10), jerseyMat);
waistMesh.scale.set(1.06, 1, 0.68);
waistMesh.position.set(0, 0.185, 0);
waistMesh.castShadow = true;
addOutline(waistMesh, 1.055);
torsoGroup.add(waistMesh);

const hemTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.168, 0.166, 0.03, 10), jerseyDarkMat);
hemTrim.scale.set(1.07, 1, 0.69);
hemTrim.position.set(0, 0.092, 0);
torsoGroup.add(hemTrim);

const chestMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.165, 0.26, 10), jerseyMat);
chestMesh.scale.set(1.1, 1, 0.68);
chestMesh.position.set(0, 0.39, 0);
chestMesh.castShadow = true;
addOutline(chestMesh, 1.055);
torsoGroup.add(chestMesh);

const collarMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.098, 0.055, 10), jerseyDarkMat);
collarMesh.position.set(0, 0.525, 0);
torsoGroup.add(collarMesh);

const collarTrim = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.011, 6, 14), accentMat);
collarTrim.rotation.x = Math.PI / 2;
collarTrim.position.set(0, 0.552, 0);
torsoGroup.add(collarTrim);

const chestBand = new THREE.Mesh(new THREE.CylinderGeometry(0.188, 0.178, 0.045, 10), accentMat);
chestBand.scale.set(1.11, 1, 0.70);
chestBand.position.set(0, 0.42, 0);
torsoGroup.add(chestBand);

const crest = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.012), cleatStripeMat);
crest.position.set(0.075, 0.34, -0.128);
torsoGroup.add(crest);

{
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 96px Segoe UI, sans-serif";
  ctx.lineWidth = 8;
  ctx.strokeStyle = "#0f172a";
  ctx.strokeText("10", 64, 68);
  ctx.fillStyle = "#f8fafc";
  ctx.fillText("10", 64, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const num = new THREE.Mesh(
    new THREE.PlaneGeometry(0.17, 0.17),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
  num.position.set(0, 0.35, 0.131);
  torsoGroup.add(num);
}

const headGroup = new THREE.Group();
headGroup.position.set(0, 0.54, 0);
torsoGroup.add(headGroup);

const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.056, 0.10, 8), skinMat);
neckMesh.position.set(0, 0.045, 0);
headGroup.add(neckMesh);

const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.132, 16, 14), skinMat);
headMesh.scale.set(0.92, 1.04, 0.94);
headMesh.position.set(0, 0.20, 0);
headMesh.castShadow = true;
addOutline(headMesh, 1.055);
headGroup.add(headMesh);

const chinMesh = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.09, 8), skinMat);
chinMesh.rotation.x = Math.PI;
chinMesh.scale.set(1.0, 1.0, 0.85);
chinMesh.position.set(0, 0.098, -0.028);
headGroup.add(chinMesh);

const eyeGeo   = new THREE.BoxGeometry(0.052, 0.036, 0.012);
const irisGeo  = new THREE.BoxGeometry(0.03, 0.034, 0.014);
const glintGeo = new THREE.BoxGeometry(0.01, 0.01, 0.016);
const lidGeo   = new THREE.BoxGeometry(0.064, 0.011, 0.016);
const browGeo  = new THREE.BoxGeometry(0.06, 0.012, 0.016);
[-0.052, 0.052].forEach((ex, idx) => {
  const eye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
  eye.position.set(ex, 0.194, -0.116);
  headGroup.add(eye);

  const iris = new THREE.Mesh(irisGeo, irisMat);
  iris.position.set(ex, 0.193, -0.118);
  headGroup.add(iris);

  const glint = new THREE.Mesh(glintGeo, eyeWhiteMat);
  glint.position.set(ex + (idx === 0 ? 0.007 : -0.007), 0.2, -0.121);
  headGroup.add(glint);

  const lid = new THREE.Mesh(lidGeo, lidMat);
  lid.position.set(ex, 0.215, -0.119);
  lid.rotation.z = idx === 0 ? -0.18 : 0.18;
  headGroup.add(lid);

  const brow = new THREE.Mesh(browGeo, browMat);
  brow.position.set(ex, 0.238, -0.118);
  brow.rotation.z = idx === 0 ? -0.26 : 0.26;
  headGroup.add(brow);
});
{
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.007, 0.01), lidMat);
  mouth.position.set(0, 0.125, -0.12);
  headGroup.add(mouth);
}

const headband = new THREE.Mesh(new THREE.CylinderGeometry(0.133, 0.133, 0.036, 14), accentMat);
headband.scale.set(0.95, 1, 0.97);
headband.position.set(0, 0.262, 0);
headGroup.add(headband);

const tailGeo = new THREE.BoxGeometry(0.026, 0.17, 0.012);
const headbandTails: THREE.Mesh[] = [];
[-0.032, 0.032].forEach((tx, idx) => {
  const tail = new THREE.Mesh(tailGeo, accentMat);
  tail.position.set(tx, 0.21, 0.155);
  tail.rotation.x = 0.58;
  tail.rotation.z = idx === 0 ? 0.22 : -0.22;
  headGroup.add(tail);
  headbandTails.push(tail);
});

const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.139, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.56), hairMat);
hairCap.scale.set(0.98, 1.05, 1.02);
hairCap.position.set(0, 0.228, 0.008);
addOutline(hairCap, 1.045);
headGroup.add(hairCap);

const spikeGeo = new THREE.ConeGeometry(0.05, 0.2, 5);
const bangGeo  = new THREE.ConeGeometry(0.032, 0.14, 4);
const spikeConfigs = [
  [0,     0.37, -0.04, -0.45, 0,     0],
  [-0.08, 0.36, -0.02, -0.35, 0,     0.42],
  [0.08,  0.36, -0.02, -0.35, 0,    -0.42],
  [-0.04, 0.32, -0.10, -0.85, 0,     0.20],
  [0.04,  0.32, -0.10, -0.85, 0,    -0.20],
  [0,     0.38,  0.06,  0.42, 0,     0],
  [-0.08, 0.34,  0.09,  0.62, 0,     0.34],
  [0.08,  0.34,  0.09,  0.62, 0,    -0.34],
  [0,     0.28,  0.13,  1.00, 0,     0],
  [-0.115,0.30,  0.04,  0.20, 0,     0.95],
  [0.115, 0.30,  0.04,  0.20, 0,    -0.95],
] as const;
spikeConfigs.forEach(([x, y, z, rx, ry, rz]) => {
  const spike = new THREE.Mesh(spikeGeo, hairMat);
  spike.position.set(x, y, z);
  spike.rotation.set(rx, ry, rz);
  spike.castShadow = true;
  addOutline(spike, 1.055);
  headGroup.add(spike);
});
[-0.108, 0.108].forEach((bx, i) => {
  const sideLock = new THREE.Mesh(bangGeo, hairMat);
  sideLock.position.set(bx, 0.20, -0.075);
  sideLock.rotation.set(2.82, 0, i === 0 ? -0.18 : 0.18);
  headGroup.add(sideLock);
});

interface ArmRig { shoulder: THREE.Group; elbow: THREE.Group; }
function makeArm(side: -1 | 1): ArmRig {
  const shoulder = new THREE.Group();
  shoulder.position.set(side * 0.24, 0.45, 0);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 8), jerseyMat);
  cap.castShadow = true;
  addOutline(cap, 1.06);
  shoulder.add(cap);

  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.054, 0.135, 8), jerseyMat);
  sleeve.position.set(0, -0.065, 0);
  sleeve.castShadow = true;
  addOutline(sleeve, 1.06);
  shoulder.add(sleeve);

  const sleeveTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.022, 8), accentMat);
  sleeveTrim.position.set(0, -0.125, 0);
  shoulder.add(sleeveTrim);

  const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.039, 0.13, 8), skinMat);
  upperArm.position.set(0, -0.185, 0);
  upperArm.castShadow = true;
  addOutline(upperArm, 1.06);
  shoulder.add(upperArm);

  const elbow = new THREE.Group();
  elbow.position.set(0, -0.245, 0);
  shoulder.add(elbow);

  const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.039, 8, 8), skinMat);
  addOutline(elbowJoint, 1.06);
  elbow.add(elbowJoint);

  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.031, 0.21, 8), skinMat);
  forearm.position.set(0, -0.105, 0);
  forearm.castShadow = true;
  addOutline(forearm, 1.06);
  elbow.add(forearm);

  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.038, 8), accentMat);
  band.position.set(0, -0.19, 0);
  elbow.add(band);

  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.082, 0.046), skinMat);
  hand.position.set(0, -0.245, -0.004);
  hand.castShadow = true;
  addOutline(hand, 1.07);
  elbow.add(hand);

  torsoGroup.add(shoulder);
  return { shoulder, elbow };
}
const leftArm  = makeArm(-1);
const rightArm = makeArm(1);

interface LegRig { hip: THREE.Group; knee: THREE.Group; }
function makeLeg(side: -1 | 1): LegRig {
  const hip = new THREE.Group();
  hip.position.set(side * 0.10, 0.88, 0);

  const shortsLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.078, 0.26, 10), shortsMat);
  shortsLeg.position.set(0, -0.12, 0);
  shortsLeg.castShadow = true;
  addOutline(shortsLeg, 1.055);
  hip.add(shortsLeg);

  const shortsStripe = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.22, 0.05), accentMat);
  shortsStripe.position.set(side * 0.084, -0.12, 0);
  hip.add(shortsStripe);

  const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.05, 0.18, 10), skinMat);
  thigh.position.set(0, -0.335, 0);
  thigh.castShadow = true;
  addOutline(thigh, 1.06);
  hip.add(thigh);

  const knee = new THREE.Group();
  knee.position.set(0, -0.42, 0);
  hip.add(knee);

  const kneeJoint = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 8), skinMat);
  addOutline(kneeJoint, 1.06);
  knee.add(kneeJoint);

  const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.05, 0.14, 10), skinMat);
  calf.scale.set(1, 1, 1.12);
  calf.position.set(0, -0.07, 0);
  calf.castShadow = true;
  addOutline(calf, 1.06);
  knee.add(calf);

  const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.038, 0.24, 10), jerseyMat);
  sock.position.set(0, -0.26, 0);
  sock.castShadow = true;
  addOutline(sock, 1.06);
  knee.add(sock);

  const sockBand = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.051, 0.03, 10), accentMat);
  sockBand.position.set(0, -0.155, 0);
  knee.add(sockBand);

  const cleatHeel = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.07, 0.13), cleatMat);
  cleatHeel.position.set(0, -0.415, 0.012);
  cleatHeel.castShadow = true;
  addOutline(cleatHeel, 1.06);
  knee.add(cleatHeel);

  const cleatToe = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.055, 0.13), cleatMat);
  cleatToe.position.set(0, -0.4225, -0.095);
  cleatToe.castShadow = true;
  addOutline(cleatToe, 1.06);
  knee.add(cleatToe);

  const cleatStripe = new THREE.Mesh(new THREE.BoxGeometry(0.108, 0.02, 0.24), cleatStripeMat);
  cleatStripe.position.set(0, -0.44, -0.04);
  knee.add(cleatStripe);

  playerRoot.add(hip);
  return { hip, knee };
}
const leftLeg  = makeLeg(-1);
const rightLeg = makeLeg(1);

// ─── SPIRIT AWAKENING AURA ──────────────────────────────────────────────────
const ssjAuraUniforms = {
  uTime:  { value: 0 },
  uColor: { value: new THREE.Color(0xf5c451) },
  uAlpha: { value: 0.0 },
};
const ssjAuraMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  uniforms: ssjAuraUniforms,
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNorm;
    varying vec3 vView;
    uniform float uTime;
    void main() {
      vUv = uv;
      vec3 p = position;
      float ripple = sin(p.y * 7.0 - uTime * 12.0) * 0.05 + cos(p.x * 8.0 + uTime * 10.0) * 0.035;
      p += normal * ripple;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      vNorm = normalize(normalMatrix * normal);
      vView = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    varying vec2 vUv;
    varying vec3 vNorm;
    varying vec3 vView;
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uAlpha;
    void main() {
      float fres = pow(1.0 - abs(dot(normalize(vNorm), normalize(vView))), 2.0);
      float bands = sin(vUv.y * 20.0 - uTime * 15.0) * 0.5 + 0.5;
      float flame = smoothstep(0.25, 0.92, fres * 0.75 + bands * 0.4);
      float topFade = smoothstep(1.0, 0.15, vUv.y);
      vec3 col = mix(uColor, vec3(1.0, 0.97, 0.88), flame * 0.5);
      gl_FragColor = vec4(col, flame * topFade * uAlpha);
    }`,
});
const ssjAuraShell = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.95, 2.45, 20, 10, true), ssjAuraMat);
ssjAuraShell.visible = false;
scene.add(ssjAuraShell);

const zoneRingMat = new THREE.MeshBasicMaterial({
  color: 0xf5c451, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false,
});
const zoneRing = new THREE.Mesh(new THREE.RingGeometry(4.2, 4.4, 48), zoneRingMat);
zoneRing.rotation.x = -Math.PI / 2;
zoneRing.position.y = 0.04;
zoneRing.visible = false;
scene.add(zoneRing);

interface WindStreak {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial;
  ang: number; rad: number; h: number; spd: number; rise: number;
}
const STREAK_GEO = new THREE.BoxGeometry(0.03, 0.03, 1.2);
const windStreaks: WindStreak[] = [];
let streaksVisible = false;
for (let i = 0; i < 26; i++) {
  const mat = new THREE.MeshBasicMaterial({
    color: i % 3 === 0 ? 0xfde68a : 0xf8fafc, transparent: true, opacity: 0, depthWrite: false,
  });
  const mesh = new THREE.Mesh(STREAK_GEO, mat);
  mesh.rotation.order = "YXZ";
  mesh.visible = false;
  scene.add(mesh);
  windStreaks.push({
    mesh, mat,
    ang: i * 2.4, rad: 0.55 + (i % 5) * 0.13, h: (i * 0.37) % 2.4,
    spd: 4.5 + (i % 4) * 0.8, rise: 1.6 + (i % 3) * 0.5,
  });
}
function setStreaksVisible(v: boolean) {
  if (streaksVisible === v) return;
  streaksVisible = v;
  for (const s of windStreaks) s.mesh.visible = v;
}
function updateWindStreaks(dt: number, px: number, py: number, pz: number) {
  for (const s of windStreaks) {
    s.ang += s.spd * dt;
    s.h += s.rise * dt;
    if (s.h > 2.4) s.h -= 2.4;
    s.mesh.position.set(px + Math.cos(s.ang) * s.rad, py - 0.8 + s.h, pz + Math.sin(s.ang) * s.rad);
    s.mesh.rotation.set(-0.45, -s.ang, 0);
    s.mat.opacity = 0.55 * Math.sin((s.h / 2.4) * Math.PI);
  }
}

const playerBodyDesc = RAPIER.RigidBodyDesc.dynamic()
  .setTranslation(0, PLAYER_H / 2, 8)
  .lockRotations();
const playerBody = world.createRigidBody(playerBodyDesc);
const playerCollider = world.createCollider(
  RAPIER.ColliderDesc.capsule(PLAYER_H / 2 - PLAYER_R, PLAYER_R).setFriction(0.1),
  playerBody
);
playerCollider.setCollisionGroups(PLAYER_GROUPS_FREE);

// ─── INPUT ──────────────────────────────────────────────────────────────────
const keys: Record<string, boolean> = {};
const keyJustPressed: Record<string, boolean> = {};
let spaceLatch = false;
window.addEventListener("keydown", e => {
  if (e.code === "Space") e.preventDefault();
  if (!keys[e.code]) keyJustPressed[e.code] = true;
  keys[e.code] = true;
});
window.addEventListener("keyup", e => {
  keys[e.code] = false;
  if (e.code === "Space") spaceLatch = false;
});

let yaw = 0, pitch2 = 0;
let isLocked = false;

const AIM_RADIUS = 15;
let aimOffsetX = 0;
let aimOffsetY = 0;

document.addEventListener("pointerlockchange", () => {
  isLocked = document.pointerLockElement === renderer.domElement;
  lockPrompt.style.display = isLocked ? "none" : "block";
});
renderer.domElement.addEventListener("click", () => { renderer.domElement.requestPointerLock(); });
document.addEventListener("mousemove", e => {
  if (!isLocked) return;
  if (isChargingShot && hasBall) {
    aimOffsetX += e.movementX * 0.16;
    aimOffsetY += e.movementY * 0.16;
    const dist = Math.hypot(aimOffsetX, aimOffsetY);
    if (dist > AIM_RADIUS) {
      const inv = AIM_RADIUS / dist;
      aimOffsetX *= inv;
      aimOffsetY *= inv;
    }
    return;
  }
  yaw    -= e.movementX * 0.002;
  pitch2  = Math.max(-0.5, Math.min(0.8, pitch2 - e.movementY * 0.002));
});

let mouseLeft = false, mouseRight = false;
window.addEventListener("mousedown", e => {
  if (e.button === 0) mouseLeft  = true;
  if (e.button === 2) mouseRight = true;
  e.preventDefault();
});
window.addEventListener("mouseup", e => {
  if (e.button === 0) mouseLeft  = false;
  if (e.button === 2) mouseRight = false;
});
renderer.domElement.addEventListener("contextmenu", e => e.preventDefault());

// ─── GAME STATE ─────────────────────────────────────────────────────────────
let score = [0, 0];
let stamina = 100;
let energy = 0;
let shotCharge = 0;
let isChargingShot = false;
let slideTimer = 0;
const SLIDE_COOLDOWN = 90;
let isGrounded = false;

let hasBall = false;
let pickupCooldown = 0;
let noPlayerCollideTimer = 0;
let pickupBlend = 0;
let dribblePhase = 0;
let activeBallSpin = 0;
let activeBallVertSpin = 0;

let playerFacingYaw = 0;
let prevFacingYaw = 0;
let turnLean = 0;
let runCycle = 0;
let rigAnimSpeed = 0;
let kickAnimTimer = 0;

// Rainbow flick (two-beat, grounded: no jump, no airborne state)
const FLICK_RIG = 0.56;
const FLICK_HOLD_END = 0.14;
const FLICK_LAUNCH_AT = 0.22;
const FLICK_BEHIND = 0.5;
const FLICK_LAUNCH_Y = 0.8;
const FLICK_APEX = 3.7;
const FLICK_VY = Math.sqrt(2 * GRAVITY * (FLICK_APEX - FLICK_LAUNCH_Y));
const FLICK_AIR = (FLICK_VY + Math.sqrt(FLICK_VY * FLICK_VY + 2 * GRAVITY * (FLICK_LAUNCH_Y - BALL_R))) / GRAVITY;
let rainbowFlickTimer = 0;
let flickState = 0;
let flickElapsed = 0;
let flickAirT = 0;
let flickStartX = 0, flickStartY = 0, flickStartZ = 0;
let flickDirX = 0, flickDirZ = -1, flickDist = 9.6;
let flickOriginX = 0, flickOriginZ = 0;
let flickSX = 0, flickSZ = 0, flickTX = 0, flickTZ = 0;

type SkillAnimType = "none" | "heel" | "spin" | "feint";
let activeSkillAnim: SkillAnimType = "none";
let skillAnimTimer = 0;
let dribbleBoostTimer = 0;
let dribbleSpeedMult = 1;
let magnetismRange = 1.45;

let currentPlaystyle: Playstyle = "EGOIST";
const skillCooldowns = new Map<string, number>();
let skillBoost: { kickMult: number; curve: number; timer: number } | null = null;

let isAwakened = false;
let awakeningTimer = 0;
let awakeningShotArmed = false;
let isAwakeningShotBall = false;
let awakeningFlightTimer = 0;
let activeAwakeningName = "";

let fovPunch = 0;
let camShake = 0;
let hitStopTimer = 0;
function juice(fov: number, shake: number, hitStop = 0) {
  fovPunch = Math.min(14, fovPunch + fov);
  camShake = Math.min(1.2, camShake + shake);
  if (hitStop > hitStopTimer) hitStopTimer = hitStop;
}

const equippedSkills = (): SkillConfig[] => skillsForPlaystyle(currentPlaystyle).slice(0, 3);
const activeAwakening = () => awakeningForPlaystyle(currentPlaystyle);

function setPossession(possessed: boolean) {
  hasBall = possessed;
  if (possessed) {
    playerCollider.setCollisionGroups(PLAYER_GROUPS_POSS);
    ballCollider.setCollisionGroups(BALL_GROUPS_POSS);
    ballBody.setGravityScale(0, true);
    ballBody.setLinearDamping(0.45);
    ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    ballBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
    activeBallSpin = 0;
    activeBallVertSpin = 0;
    isAwakeningShotBall = false;
    awakeningFlightTimer = 0;
    noPlayerCollideTimer = 0;
    flickState = 0;
    flickElapsed = 0;
    flickAirT = 0;
    pickupBlend = 0;
    trailMat.color.setHex(0xf8fafc);
  } else {
    playerCollider.setCollisionGroups(PLAYER_GROUPS_FREE);
    ballCollider.setCollisionGroups(BALL_GROUPS_FREE);
    ballBody.setGravityScale(1, true);
    ballBody.setLinearDamping(0.45);
    isChargingShot = false;
    shotCharge = 0;
    aimOffsetX = 0;
    aimOffsetY = 0;
    trailCount = 0;
    trailGeo.setDrawRange(0, 0);
  }
}

function resetBall(x = 0, z = 0) {
  setPossession(false);
  pickupCooldown = 0.4;
  activeBallSpin = 0;
  activeBallVertSpin = 0;
  isAwakeningShotBall = false;
  awakeningFlightTimer = 0;
  flickState = 0;
  flickElapsed = 0;
  flickAirT = 0;
  noPlayerCollideTimer = 0;
  trailCount = 0;
  trailGeo.setDrawRange(0, 0);
  ballBody.setTranslation({ x, y: 1.2, z }, true);
  ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
  ballBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
}

// ─── PLAYSTYLE SWITCHING ────────────────────────────────────────────────────
function applyNormalKitColors(ps: Playstyle) {
  jerseyMat.color.setHex(
    ps === "EGOIST" ? 0xdc2626 : ps === "PLAYMAKER" ? 0xd97706 :
    ps === "LOCKDOWN" ? 0x059669 : 0x2563eb
  );
  hairMat.color.setHex(0x181c2e);
  accentMat.color.setHex(0xf8fafc);
  cleatStripeMat.color.setHex(PLAYSTYLE_COLOR_INT[ps]);
  irisMat.color.setHex(PLAYSTYLE_COLOR_INT[ps]);
}

function switchPlaystyle(ps: Playstyle) {
  currentPlaystyle = ps;
  skillBoost = null;
  if (isAwakened && activeAwakening().name !== activeAwakeningName) endAwakening();
  applyNormalKitColors(ps);
  buildSkillPanel();
  cacheSkillPanelEls();
  hudDirty.playstyle = true;
}

function handlePlaystyleKeys() {
  (["Digit1", "Digit2", "Digit3", "Digit4"] as const).forEach((code, i) => {
    if (keyJustPressed[code]) switchPlaystyle(PLAYSTYLES[i]);
  });
}

// ─── SKILL PANEL (COOLDOWN PILLS) ───────────────────────────────────────────
function buildSkillPanel() {
  const equipped = equippedSkills();
  const hex = PLAYSTYLE_HEX[currentPlaystyle];
  skillPanel.innerHTML = equipped.map((skill, i) => `
    <div id="skill-slot-${i}" style="position:relative;display:flex;align-items:center;gap:8px;height:36px;
      padding:0 14px 0 6px;border-radius:999px;background:rgba(15,23,42,.76);
      border:1px solid rgba(255,255,255,.2);overflow:hidden;">
      <div id="skill-cd-fill-${i}" style="position:absolute;left:0;bottom:0;width:100%;height:0%;
        background:${hex};opacity:.32;transition:height .1s;pointer-events:none;"></div>
      <div style="position:relative;width:24px;height:24px;border-radius:50%;background:${hex};
        display:flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:800;">${SKILL_KEYS[i]}</div>
      <div style="position:relative;line-height:1.15;">
        <div id="skill-name-${i}" style="font-size:.68rem;font-weight:700;letter-spacing:.6px;">${skill.name}
          <span style="opacity:.5;font-weight:600;font-size:.55rem;">${skill.staminaCost} ST</span></div>
        <div id="skill-cd-${i}" style="font-size:.58rem;font-weight:800;color:#7dd3fc;letter-spacing:.8px;">READY</div>
      </div>
    </div>`).join("");
}

let skillCdEls:   (HTMLElement | null)[] = [];
let skillFillEls: (HTMLElement | null)[] = [];
function cacheSkillPanelEls() {
  skillCdEls   = [0, 1, 2].map(i => document.getElementById(`skill-cd-${i}`));
  skillFillEls = [0, 1, 2].map(i => document.getElementById(`skill-cd-fill-${i}`));
  prevSkillCdText[0] = prevSkillCdText[1] = prevSkillCdText[2] = "";
  prevSkillFillH[0]  = prevSkillFillH[1]  = prevSkillFillH[2]  = "";
}

const prevSkillCdText: string[] = ["", "", ""];
const prevSkillFillH:  string[] = ["", "", ""];

function updateSkillPanel() {
  equippedSkills().forEach((skill, i) => {
    const cdEl   = skillCdEls[i];
    const fillEl = skillFillEls[i];
    if (!cdEl || !fillEl) return;
    const cd = skillCooldowns.get(skill.id) ?? 0;
    let text: string, color: string, fillH: string;
    if (cd > 0) {
      text  = `${cd.toFixed(1)}s`;
      color = "#94a3b8";
      fillH = `${((cd / skill.cooldownSec) * 100).toFixed(1)}%`;
    } else {
      const lowStam = stamina < skill.staminaCost;
      text  = lowStam ? "LOW ST" : "READY";
      color = lowStam ? "#f87171" : "#7dd3fc";
      fillH = "0%";
    }
    if (prevSkillCdText[i] !== text) { cdEl.textContent = text; cdEl.style.color = color; prevSkillCdText[i] = text; }
    if (prevSkillFillH[i] !== fillH) { fillEl.style.height = fillH; prevSkillFillH[i] = fillH; }
  });
}

// ─── WIND SHOCKWAVE & AIR-STREAM PARTICLE POOL ──────────────────────────────
const VFX_GEO   = new THREE.RingGeometry(0.45, 0.58, 40);
const SPARK_GEO = new THREE.BoxGeometry(0.06, 0.06, 0.34);

interface SkillVfx { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; life: number; maxLife: number; scale: number; }
const skillVfx: SkillVfx[] = [];
const vfxPool: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }[] = [];

interface BurstSpark {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial;
  vx: number; vy: number; vz: number; life: number; maxLife: number; gravity: number;
}
const activeSparks: BurstSpark[] = [];
const sparkPool: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }[] = [];

function acquireVfxMesh(color: number) {
  if (vfxPool.length > 0) {
    const item = vfxPool.pop()!;
    item.mat.color.setHex(color);
    item.mat.opacity = 0.55;
    item.mesh.visible = true;
    return item;
  }
  const mat  = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  const mesh = new THREE.Mesh(VFX_GEO, mat);
  mesh.rotation.x = -Math.PI / 2;
  scene.add(mesh);
  return { mesh, mat };
}

function acquireSparkMesh(color: number) {
  if (sparkPool.length > 0) {
    const item = sparkPool.pop()!;
    item.mat.color.setHex(color);
    item.mat.opacity = 0.72;
    item.mesh.visible = true;
    return item;
  }
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72, depthWrite: false });
  const mesh = new THREE.Mesh(SPARK_GEO, mat);
  scene.add(mesh);
  return { mesh, mat };
}

function spawnSparkBurst(x: number, y: number, z: number, color: number, count: number, speedScale = 1, gravity = 8) {
  for (let i = 0; i < count; i++) {
    const item = acquireSparkMesh(color);
    const ang = (i / count) * Math.PI * 2 + (i % 3) * 0.25;
    const spd = (2.8 + (i % 4) * 1.2) * speedScale;
    item.mesh.position.set(x, y, z);
    item.mesh.rotation.set(0, -ang + Math.PI / 2, 0);
    item.mesh.scale.setScalar(1);
    activeSparks.push({
      mesh: item.mesh, mat: item.mat,
      vx: Math.cos(ang) * spd, vy: (1.6 + (i % 3) * 1.1) * speedScale, vz: Math.sin(ang) * spd,
      life: 0, maxLife: 0.36, gravity,
    });
  }
}

function spawnTrailParticle(x: number, y: number, z: number, color: number, scale = 1.0) {
  if (activeSparks.length > 110) return;
  const item = acquireSparkMesh(color);
  item.mesh.position.set(
    x + (Math.random() - 0.5) * 0.14,
    y + (Math.random() - 0.5) * 0.14,
    z + (Math.random() - 0.5) * 0.14
  );
  item.mesh.rotation.set(Math.random() * 2, Math.random() * 2, 0);
  item.mesh.scale.setScalar(scale);
  activeSparks.push({
    mesh: item.mesh, mat: item.mat,
    vx: (Math.random() - 0.5) * 1.4,
    vy: 0.35 + Math.random() * 0.9,
    vz: (Math.random() - 0.5) * 1.4,
    life: 0, maxLife: 0.28, gravity: 0,
  });
}

function spawnSkillVfx(color: number, ringScale = 5.2, ringColor = 0xf8fafc) {
  const pp = playerBody.translation();
  const item = acquireVfxMesh(ringColor);
  item.mesh.position.set(pp.x, 0.06, pp.z);
  item.mesh.scale.set(1, 1, 1);
  skillVfx.push({ mesh: item.mesh, mat: item.mat, life: 0, maxLife: 0.42, scale: ringScale });

  spawnSparkBurst(pp.x, 0.25, pp.z, color, 10, 1.05);
}

function updateSkillVfx(dt: number) {
  for (let i = skillVfx.length - 1; i >= 0; i--) {
    const v = skillVfx[i];
    v.life += dt;
    const t = v.life / v.maxLife;
    if (t >= 1) {
      v.mesh.visible = false;
      vfxPool.push({ mesh: v.mesh, mat: v.mat });
      skillVfx.splice(i, 1);
      continue;
    }
    const s = 1 + t * v.scale;
    v.mesh.scale.set(s, s, s);
    v.mat.opacity = 0.55 * (1 - t);
  }

  for (let i = activeSparks.length - 1; i >= 0; i--) {
    const sp = activeSparks[i];
    sp.life += dt;
    const t = sp.life / sp.maxLife;
    if (t >= 1) {
      sp.mesh.visible = false;
      sparkPool.push({ mesh: sp.mesh, mat: sp.mat });
      activeSparks.splice(i, 1);
      continue;
    }
    sp.mesh.position.x += sp.vx * dt;
    sp.mesh.position.y += sp.vy * dt;
    sp.mesh.position.z += sp.vz * dt;
    sp.vy -= sp.gravity * dt;
    sp.mat.opacity = 0.72 * (1 - t);
    sp.mesh.scale.setScalar(Math.max(0.1, 1 - t * 0.55));
  }
}

// ─── SCRATCH VECTORS ────────────────────────────────────────────────────────
const _fwdVec           = new THREE.Vector3();
const _rightVec         = new THREE.Vector3();
const _camOffsetScratch = new THREE.Vector3();
const _camPivot         = new THREE.Vector3();
const _camPivotSmooth   = new THREE.Vector3();
const _camQYaw          = new THREE.Quaternion();
const _camQPitch        = new THREE.Quaternion();
const _camEuler         = new THREE.Euler();
const _headScreenVec    = new THREE.Vector3();
let camInit = false;

const smooth01 = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };

// ─── SHOT & SKILL RELEASE ───────────────────────────────────────────────────
function fireShot(chargeNorm: number, kickMult: number, curveStrength: number, aimNx = 0, aimNy = 0) {
  const pp = playerBody.translation();
  _fwdVec.set(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
  _rightVec.set(-_fwdVec.z, 0, _fwdVec.x);

  const clampedCharge = Math.max(0.20, Math.min(1.0, chargeNorm));

  if (awakeningShotArmed) {
    awakeningShotArmed = false;
    const awakenSpeed = 58 * activeAwakening().shotPowerMultiplier;
    const liftY = Math.max(0.5, 2.2 - aimNy * 4.5);

    setPossession(false);
    pickupCooldown = 0.45;
    activeBallSpin = 0;
    activeBallVertSpin = 0;
    isAwakeningShotBall = true;
    awakeningFlightTimer = 1.25;
    kickAnimTimer = 0.34;

    ballBody.setGravityScale(0.02, true);
    ballBody.setLinearDamping(0.0);
    trailMat.color.setHex(0xfde68a);

    const launchX = THREE.MathUtils.clamp(pp.x + _fwdVec.x * 1.25, -hw + BALL_R + 0.1, hw - BALL_R - 0.1);
    const launchZ = THREE.MathUtils.clamp(pp.z + _fwdVec.z * 1.25, -hd + BALL_R + 0.1, hd - BALL_R - 0.1);
    ballBody.setTranslation({ x: launchX, y: Math.max(BALL_R + 0.25, pp.y - 0.3), z: launchZ }, true);
    ballBody.setLinvel({
      x: _fwdVec.x * awakenSpeed + _rightVec.x * aimNx * 6,
      y: liftY,
      z: _fwdVec.z * awakenSpeed + _rightVec.z * aimNx * 6,
    }, true);
    ballBody.setAngvel({ x: 0, y: 0, z: 32 }, true);

    spawnSkillVfx(0xfde68a, 7.5, 0xfde68a);
    crowdExcitement = Math.min(1, crowdExcitement + 0.7);
    juice(12, 0.9, 0.11);
    skillBoost = null;
    return;
  }

  const awakenMult = isAwakened ? activeAwakening().shotPowerMultiplier : 1;
  const liftBias = -aimNy;
  const forwardSpeed = (14 + clampedCharge * 26) * kickMult * awakenMult * (1 + (aimNy > 0 ? aimNy * 0.12 : 0));
  const upwardSpeed  = Math.max(
    1.1,
    (3.2 + clampedCharge * 5.2 + liftBias * (3.6 + clampedCharge * 4.2)) * Math.min(kickMult, 1.3)
  );

  const lateralLaunch = aimNx * 0.24;
  const dirX = _fwdVec.x + _rightVec.x * lateralLaunch;
  const dirZ = _fwdVec.z + _rightVec.z * lateralLaunch;
  const dirLen = Math.hypot(dirX, dirZ) || 1;
  const lx = dirX / dirLen;
  const lz = dirZ / dirLen;

  const spinScale = (1.05 + curveStrength * 0.65) * (0.65 + clampedCharge * 0.7);
  const hSpin = aimNx * 1.45 * spinScale;
  const vSpin = -aimNy * 0.75 * spinScale;

  setPossession(false);
  pickupCooldown = 0.35;
  activeBallSpin = hSpin;
  activeBallVertSpin = vSpin;
  kickAnimTimer = 0.28;

  trailMat.color.setHex(0xf8fafc);

  const launchX = THREE.MathUtils.clamp(pp.x + _fwdVec.x * 1.15, -hw + BALL_R + 0.1, hw - BALL_R - 0.1);
  const launchZ = THREE.MathUtils.clamp(pp.z + _fwdVec.z * 1.15, -hd + BALL_R + 0.1, hd - BALL_R - 0.1);
  ballBody.setTranslation({ x: launchX, y: Math.max(BALL_R + 0.08, ballBody.translation().y), z: launchZ }, true);
  ballBody.setLinvel({
    x: lx * forwardSpeed,
    y: upwardSpeed,
    z: lz * forwardSpeed,
  }, true);
  ballBody.setAngvel({ x: vSpin * 8, y: -hSpin * 14, z: 0 }, true);

  if (clampedCharge >= 0.75) {
    juice(3 + clampedCharge * 6, 0.25 + clampedCharge * 0.35, 0.05);
    spawnSparkBurst(launchX, 0.3, launchZ, 0xf8fafc, 8, 0.9);
  } else {
    juice(2 + clampedCharge * 3, 0.06 * clampedCharge);
  }

  addEnergy(10 + clampedCharge * 10);
  skillBoost = null;
}

// ─── DRIBBLING SKILL TRIGGERS (Z, X, C) ─────────────────────────────────────
function triggerSkill(slot: number) {
  const skill = equippedSkills()[slot];
  if (!skill) return;
  if ((skillCooldowns.get(skill.id) ?? 0) > 0) return;
  if (stamina < skill.staminaCost) return;
  if (slideTimer > 0) return;

  stamina -= skill.staminaCost;
  skillCooldowns.set(skill.id, skill.cooldownSec);

  _fwdVec.set(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
  _rightVec.set(-_fwdVec.z, 0, _fwdVec.x);

  if (slot === 0) {
    activeSkillAnim = "heel";
    skillAnimTimer = 0.38;
    dribbleBoostTimer = 2.4;
    dribbleSpeedMult = 1.38;
    magnetismRange = 2.65;
    const imp = Math.max(8.5, skill.dashImpulse);
    playerBody.applyImpulse({ x: _fwdVec.x * imp, y: 0.6, z: _fwdVec.z * imp }, true);
  } else if (slot === 1) {
    activeSkillAnim = "spin";
    skillAnimTimer = 0.44;
    dribbleBoostTimer = 2.6;
    dribbleSpeedMult = 1.34;
    magnetismRange = 2.85;
    const imp = Math.max(7.0, skill.dashImpulse);
    playerBody.applyImpulse({ x: _fwdVec.x * imp, y: 0, z: _fwdVec.z * imp }, true);
  } else {
    activeSkillAnim = "feint";
    skillAnimTimer = 0.40;
    dribbleBoostTimer = 2.4;
    dribbleSpeedMult = 1.42;
    magnetismRange = 2.65;
    const cutDir = keys["KeyA"] ? -1 : 1;
    playerBody.applyImpulse({
      x: (_fwdVec.x * 7.5 + _rightVec.x * cutDir * 6.5),
      y: 0,
      z: (_fwdVec.z * 7.5 + _rightVec.z * cutDir * 6.5),
    }, true);
  }

  spawnSkillVfx(0xf8fafc);
  juice(4, 0.08);
  skillBoost = { kickMult: skill.kickPowerMultiplier, curve: skill.curveStrength, timer: 2.5 };
  addEnergy(8);
}

function handleSkillKeys() {
  if (!isLocked) return;
  if (keyJustPressed["KeyZ"]) triggerSkill(0);
  if (keyJustPressed["KeyX"]) triggerSkill(1);
  if (keyJustPressed["KeyC"]) triggerSkill(2);
}

function updateCooldowns(dt: number) {
  if (pickupCooldown > 0) pickupCooldown = Math.max(0, pickupCooldown - dt);
  if (noPlayerCollideTimer > 0 && flickState === 0) {
    noPlayerCollideTimer = Math.max(0, noPlayerCollideTimer - dt);
    if (noPlayerCollideTimer <= 0 && !hasBall) {
      ballCollider.setCollisionGroups(BALL_GROUPS_FREE);
    }
  }
  if (kickAnimTimer > 0) kickAnimTimer = Math.max(0, kickAnimTimer - dt);
  if (rainbowFlickTimer > 0) rainbowFlickTimer = Math.max(0, rainbowFlickTimer - dt);

  // ── Rainbow flick state machine ──
  if (flickState !== 0) pickupCooldown = Math.max(pickupCooldown, 0.2);

  if (flickState === 1) {
    flickElapsed += dt;
    const e = flickElapsed;
    const pp = playerBody.translation();
    const fx = flickDirX, fz = flickDirZ;
    const rx = -fz, rz = fx;
    const hx0 = pp.x - fx * FLICK_BEHIND + rx * 0.10;
    const hz0 = pp.z - fz * FLICK_BEHIND + rz * 0.10;
    let bx: number, by: number, bz: number;

    if (e < FLICK_HOLD_END) {
      const p = smooth01(e / FLICK_HOLD_END);
      bx = THREE.MathUtils.lerp(flickStartX, hx0, p);
      bz = THREE.MathUtils.lerp(flickStartZ, hz0, p);
      by = THREE.MathUtils.lerp(flickStartY, 0.26, p) + 0.30 * smooth01((p - 0.4) / 0.6);
    } else {
      const q = smooth01((e - FLICK_HOLD_END) / (FLICK_LAUNCH_AT - FLICK_HOLD_END));
      bx = hx0 - fx * 0.02 * q;
      bz = hz0 - fz * 0.02 * q;
      by = 0.56 + (FLICK_LAUNCH_Y - 0.56) * q;
    }
    bx = THREE.MathUtils.clamp(bx, -hw + BALL_R + 0.1, hw - BALL_R - 0.1);
    bz = THREE.MathUtils.clamp(bz, -hd + BALL_R + 0.1, hd - BALL_R - 0.1);
    ballBody.setTranslation({ x: bx, y: by, z: bz }, true);
    ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);

    if (e >= FLICK_LAUNCH_AT) {
      flickState = 2;
      flickAirT = 0;
      flickOriginX = pp.x;
      flickOriginZ = pp.z;
      flickSX = bx;
      flickSZ = bz;
      flickTX = THREE.MathUtils.clamp(pp.x + fx * flickDist, -hw + 2.5, hw - 2.5);
      flickTZ = THREE.MathUtils.clamp(pp.z + fz * flickDist, -hd + 2.5, hd - 2.5);
      spawnSparkBurst(bx, 0.7, bz, 0xf8fafc, 10, 0.85);
      juice(5, 0.12);
    }
  } else if (flickState === 2) {
    flickAirT += dt;
    const t = Math.min(flickAirT, FLICK_AIR);
    const u = t / FLICK_AIR;
    const E = smooth01(Math.pow(u, 1.25));
    const pp = playerBody.translation();
    const w = 1 - smooth01(t / 0.4);
    let bx = flickSX + (flickTX - flickSX) * E + (pp.x - flickOriginX) * w;
    let bz = flickSZ + (flickTZ - flickSZ) * E + (pp.z - flickOriginZ) * w;
    bx = THREE.MathUtils.clamp(bx, -hw + BALL_R + 0.1, hw - BALL_R - 0.1);
    bz = THREE.MathUtils.clamp(bz, -hd + BALL_R + 0.1, hd - BALL_R - 0.1);
    const by = Math.max(BALL_R, FLICK_LAUNCH_Y + FLICK_VY * t - 0.5 * GRAVITY * t * t);
    ballBody.setTranslation({ x: bx, y: by, z: bz }, true);
    ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);

    if (flickAirT >= FLICK_AIR) {
      const dx = flickTX - flickSX, dz = flickTZ - flickSZ;
      const dl = Math.hypot(dx, dz) || 1;
      flickState = 0;
      ballBody.setGravityScale(1, true);
      ballBody.setLinearDamping(0.45);
      ballBody.setLinvel({
        x: (dx / dl) * 1.6,
        y: FLICK_VY - GRAVITY * FLICK_AIR,
        z: (dz / dl) * 1.6,
      }, true);
      noPlayerCollideTimer = 0.12;
      pickupCooldown = 0.15;
      spawnSparkBurst(bx, 0.3, bz, 0xf8fafc, 8, 0.7);
    }
  }

  if (skillAnimTimer > 0) {
    skillAnimTimer = Math.max(0, skillAnimTimer - dt);
    if (skillAnimTimer <= 0) activeSkillAnim = "none";
  }
  if (dribbleBoostTimer > 0) {
    dribbleBoostTimer = Math.max(0, dribbleBoostTimer - dt);
    if (dribbleBoostTimer <= 0) {
      dribbleSpeedMult = 1;
      magnetismRange = 1.45;
    }
  }
  if (isAwakeningShotBall) {
    awakeningFlightTimer -= dt;
    if (awakeningFlightTimer <= 0) {
      isAwakeningShotBall = false;
      ballBody.setGravityScale(1, true);
      ballBody.setLinearDamping(0.45);
    }
  }
  for (const [id, t] of skillCooldowns) {
    const next = t - dt;
    if (next <= 0) skillCooldowns.delete(id);
    else skillCooldowns.set(id, next);
  }
  if (skillBoost) {
    skillBoost.timer -= dt;
    if (skillBoost.timer <= 0) skillBoost = null;
  }
}

// ─── AWAKENING ──────────────────────────────────────────────────────────────
function addEnergy(amount: number) {
  if (isAwakened) return;
  energy = Math.min(100, energy + amount);
}

function tryAwaken() {
  if (!isAwakened && energy >= 100) {
    const aw = activeAwakening();
    isAwakened = true;
    awakeningTimer = aw.durationSec;
    awakeningShotArmed = true;
    activeAwakeningName = aw.name;

    ssjAuraUniforms.uColor.value.set(0xf5c451);
    ssjAuraUniforms.uAlpha.value = 0.42;
    ssjAuraShell.visible = true;
    zoneRing.visible = true;
    setStreaksVisible(true);

    playerCharHairShift(true);

    spawnSkillVfx(0xfde68a, 9.5, 0xfde68a);
    spawnSparkBurst(playerBody.translation().x, 0.4, playerBody.translation().z, 0xf8fafc, 22, 1.5);
    crowdExcitement = Math.min(1, crowdExcitement + 0.85);
    juice(9, 0.6, 0.1);
    updateJumbotronScreen(score[0], score[1], `AWAKENED: ${aw.name.toUpperCase()}`);

    awakenFlash.textContent = `AWAKENING — ${aw.name.toUpperCase()}`;
    awakenFlash.style.display = "block";
    setTimeout(() => { awakenFlash.style.display = "none"; }, 1800);
  }
}

function playerCharHairShift(awakened: boolean) {
  if (awakened) {
    hairMat.color.setHex(0xf3d66b);
    irisMat.color.setHex(0xf5a623);
    cleatStripeMat.color.setHex(0xf5c451);
  } else {
    applyNormalKitColors(currentPlaystyle);
  }
}

function endAwakening() {
  isAwakened = false;
  awakeningTimer = 0;
  awakeningShotArmed = false;
  energy = 0;
  activeAwakeningName = "";
  ssjAuraShell.visible = false;
  zoneRing.visible = false;
  setStreaksVisible(false);
  playerCharHairShift(false);
  updateJumbotronScreen(score[0], score[1]);
}

function updateAwakening(dt: number, nowSec: number) {
  if (!isAwakened) return;
  awakeningTimer -= dt;
  const aw = activeAwakening();
  energy = Math.max(0, (awakeningTimer / aw.durationSec) * 100);
  if (awakeningTimer <= 0) { endAwakening(); return; }

  const pp = playerBody.translation();
  ssjAuraUniforms.uTime.value = nowSec;
  ssjAuraShell.position.set(pp.x, pp.y + 0.15, pp.z);
  ssjAuraShell.rotation.y += dt * 4.0;
  const pulse = 1 + Math.sin(nowSec * 10) * 0.06;
  ssjAuraShell.scale.set(pulse, 1 + Math.cos(nowSec * 8) * 0.05, pulse);

  zoneRing.position.set(pp.x, 0.04, pp.z);
  const rp = 1 + Math.sin(nowSec * 5) * 0.04;
  zoneRing.scale.set(rp, rp, 1);
  zoneRingMat.opacity = 0.22 + Math.sin(nowSec * 5) * 0.1;

  updateWindStreaks(dt, pp.x, pp.y, pp.z);
}

// ─── HUD (throttled) ─────────────────────────────────────────────────────────
const HUD_UPDATE_INTERVAL = 1 / 20;
let hudAccum = 0;
const hudDirty = { playstyle: true };
let prevScore = "", prevStamW = "", prevGaugeVis = "", prevGaugeH = "", prevGaugeColor = "";
let prevAimVis = "", prevAimAlpha = "", prevAimX = -999, prevAimY = -999;
let prevReticleX = -999, prevReticleY = -999;
let prevPsText = "", prevAwW = "", prevAwReadyVis = "", prevAwLabelTxt = "";
let aimSmX = 0, aimSmY = 0;

function updateHUD(dt: number) {
  const showAim = isLocked && hasBall && isChargingShot;
  const aimVis = showAim ? "block" : "none";
  const aimAlpha = showAim ? "1" : "0";
  if (aimVis !== prevAimVis) {
    aimReticle.style.display = aimVis;
    prevAimVis = aimVis;
  }
  if (aimAlpha !== prevAimAlpha) {
    aimReticle.style.opacity = aimAlpha;
    prevAimAlpha = aimAlpha;
  }

  if (showAim) {
    const pp = playerBody.translation();
    _headScreenVec.set(pp.x, pp.y + 1.95, pp.z).project(camera);
    const rx = THREE.MathUtils.clamp((_headScreenVec.x * 0.5 + 0.5) * innerWidth, 32, innerWidth - 32);
    const ry = THREE.MathUtils.clamp((-_headScreenVec.y * 0.5 + 0.5) * innerHeight, 32, innerHeight * 0.44);
    if (Math.abs(rx - prevReticleX) > 0.5 || Math.abs(ry - prevReticleY) > 0.5) {
      prevReticleX = rx;
      prevReticleY = ry;
      aimReticle.style.left = `${rx.toFixed(1)}px`;
      aimReticle.style.top  = `${ry.toFixed(1)}px`;
    }
    const k = 1 - Math.exp(-22 * dt);
    aimSmX += (aimOffsetX - aimSmX) * k;
    aimSmY += (aimOffsetY - aimSmY) * k;
    if (Math.abs(aimSmX - prevAimX) > 0.04 || Math.abs(aimSmY - prevAimY) > 0.04) {
      prevAimX = aimSmX;
      prevAimY = aimSmY;
      aimDot.style.transform = `translate(${aimSmX.toFixed(2)}px, ${aimSmY.toFixed(2)}px)`;
      aimCurve.setAttribute(
        "d",
        `M0 0 Q ${(aimSmX * 0.95).toFixed(2)} ${(aimSmY * 0.2).toFixed(2)} ${aimSmX.toFixed(2)} ${aimSmY.toFixed(2)}`
      );
    }
  } else if (prevAimX !== -999) {
    aimSmX = aimSmY = 0;
    prevAimX = prevAimY = -999;
    aimDot.style.transform = "translate(0px, 0px)";
    aimCurve.setAttribute("d", "M0 0 L0 0");
  }

  hudAccum += dt;
  if (hudAccum < HUD_UPDATE_INTERVAL) return;
  hudAccum = 0;

  const scoreStr = `${score[0]} — ${score[1]}`;
  if (scoreStr !== prevScore) { scoreEl.textContent = scoreStr; prevScore = scoreStr; }

  const stamW = `${stamina.toFixed(1)}%`;
  if (stamW !== prevStamW) { stamBar.style.width = stamW; prevStamW = stamW; }

  const gaugeVis = showAim ? "flex" : "none";
  if (gaugeVis !== prevGaugeVis) {
    powerGaugeWrap.style.display = gaugeVis;
    prevGaugeVis = gaugeVis;
  }
  if (showAim) {
    const pct = Math.round(shotCharge);
    const gaugeH = `${shotCharge.toFixed(1)}%`;
    const hue = Math.round(125 * (1 - shotCharge / 100));
    const col = `hsl(${hue}, 80%, 50%)`;
    if (gaugeH !== prevGaugeH) {
      powerGaugeFill.style.height = gaugeH;
      powerGaugePct.textContent = `${pct}%`;
      prevGaugeH = gaugeH;
    }
    if (col !== prevGaugeColor) {
      powerGaugePct.style.color = col;
      prevGaugeColor = col;
    }
  }

  if (hudDirty.playstyle) {
    const hex = PLAYSTYLE_HEX[currentPlaystyle];
    const psText = `${currentPlaystyle} <span style="opacity:.55;font-weight:normal;font-size:.68rem;">[1-4]</span>`;
    if (psText !== prevPsText) {
      playstyleTag.innerHTML = psText;
      playstyleTag.style.borderLeftColor = hex;
      prevPsText = psText;
    }
    hudDirty.playstyle = false;
  }

  const awW = `${energy.toFixed(1)}%`;
  if (awW !== prevAwW) { awBar.style.width = awW; prevAwW = awW; }

  const awReadyVis = (!isAwakened && energy >= 100) ? "block" : "none";
  if (awReadyVis !== prevAwReadyVis) { awReady.style.display = awReadyVis; prevAwReadyVis = awReadyVis; }

  const awLabelTxt = isAwakened
    ? awakeningShotArmed
      ? `${activeAwakeningName.toUpperCase()} • ARMED`
      : `${activeAwakeningName.toUpperCase()} ${awakeningTimer.toFixed(1)}s`
    : energy >= 100 ? "PRESS R" : `ENERGY ${Math.floor(energy)}%`;
  if (awLabelTxt !== prevAwLabelTxt) { awLabel.textContent = awLabelTxt; prevAwLabelTxt = awLabelTxt; }

  updateSkillPanel();
}

// ─── GOAL DETECTION ─────────────────────────────────────────────────────────
function checkGoal() {
  const bp = ballBody.translation();
  if (Math.abs(bp.z) < GOAL_W / 2 && bp.y < GOAL_H + 0.3) {
    if (bp.x < -hw - 0.25) {
      score[1]++;
      addEnergy(45);
      crowdExcitement = 1;
      spawnSparkBurst(bp.x, bp.y + 0.5, bp.z, 0xf8fafc, 18, 1.3);
      juice(4, 0.3, 0.05);
      updateJumbotronScreen(score[0], score[1], "GOAL!");
      resetBall();
      return;
    }
    if (bp.x > hw + 0.25) {
      score[0]++;
      addEnergy(45);
      crowdExcitement = 1;
      spawnSparkBurst(bp.x, bp.y + 0.5, bp.z, 0xf8fafc, 18, 1.3);
      juice(4, 0.3, 0.05);
      updateJumbotronScreen(score[0], score[1], "GOAL!");
      resetBall();
      return;
    }
  }
}

// ─── GROUNDED CHECK ─────────────────────────────────────────────────────────
function checkGrounded() {
  const pp  = playerBody.translation();
  const ray = new RAPIER.Ray({ x: pp.x, y: pp.y - PLAYER_H / 2 - 0.02, z: pp.z }, { x: 0, y: -1, z: 0 });
  const hit = world.castRay(ray, 0.25, true);
  isGrounded = hit !== null && hit.timeOfImpact < 0.2;
}

// ─── POSSESSION, BALL MAGNETISM, DRIBBLE & SHOT ─────────────────────────────
const DRIBBLE_POCKET_DIST = 1.1;

function tryPickupBall(dt: number) {
  if (hasBall || pickupCooldown > 0 || flickState !== 0) return;
  const pp = playerBody.translation();
  const bp = ballBody.translation();
  const dist = Math.hypot(bp.x - pp.x, bp.z - pp.z);
  if (dist < magnetismRange && bp.y <= PLAYER_H + 0.35) {
    if (dist <= 1.55) {
      setPossession(true);
    } else {
      const pull = 18 * dt;
      const dx = (pp.x - bp.x) / (dist || 1);
      const dz = (pp.z - bp.z) / (dist || 1);
      const lv = ballBody.linvel();
      ballBody.setLinvel({ x: lv.x + dx * pull * 8, y: lv.y, z: lv.z + dz * pull * 8 }, true);
    }
  }
}

function updatePossessionAndShoot(dt: number) {
  if (!hasBall) {
    isChargingShot = false;
    shotCharge = 0;
    return;
  }

  const pp = playerBody.translation();
  const pv = playerBody.linvel();
  const playerSpeed = Math.hypot(pv.x, pv.z);

  if (!isChargingShot && playerSpeed > 1.5) addEnergy(6 * dt);

  _fwdVec.set(-Math.sin(playerFacingYaw), 0, -Math.cos(playerFacingYaw));
  const rawPocketX = pp.x + _fwdVec.x * DRIBBLE_POCKET_DIST;
  const rawPocketZ = pp.z + _fwdVec.z * DRIBBLE_POCKET_DIST;
  const pocketX = Math.abs(rawPocketZ) < GOAL_W / 2 - BALL_R
    ? THREE.MathUtils.clamp(rawPocketX, -hw - GOAL_D + BALL_R + 0.2, hw + GOAL_D - BALL_R - 0.2)
    : THREE.MathUtils.clamp(rawPocketX, -hw + BALL_R + 0.3, hw - BALL_R - 0.3);
  const pocketZ = THREE.MathUtils.clamp(rawPocketZ, -hd + BALL_R + 0.3, hd - BALL_R + 0.3);

  if (playerSpeed > 0.4) {
    dribblePhase += dt * (6 + playerSpeed * 0.7);
  }
  const bounce = playerSpeed > 0.4
    ? Math.abs(Math.sin(dribblePhase)) * (isChargingShot ? 0.03 : 0.11)
    : Math.abs(Math.sin(performance.now() * 0.003)) * 0.02;
  const pocketY = BALL_R + bounce;

  pickupBlend = Math.min(1, pickupBlend + dt * 14);
  if (pickupBlend < 1) {
    const bp = ballBody.translation();
    const t = 1 - Math.exp(-24 * dt);
    ballBody.setTranslation({
      x: THREE.MathUtils.lerp(bp.x, pocketX, t),
      y: THREE.MathUtils.lerp(bp.y, pocketY, t),
      z: THREE.MathUtils.lerp(bp.z, pocketZ, t),
    }, true);
  } else {
    ballBody.setTranslation({ x: pocketX, y: pocketY, z: pocketZ }, true);
  }
  ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
  ballBody.setAngvel({ x: 0, y: 0, z: 0 }, true);

  if (mouseLeft && isLocked) {
    if (!isChargingShot) {
      aimOffsetX = 0;
      aimOffsetY = 0;
    }
    isChargingShot = true;
    shotCharge = Math.min(100, shotCharge + 70 * dt);
  } else if (isChargingShot && !mouseLeft) {
    const boostMult  = skillBoost ? skillBoost.kickMult : 1;
    const skillCurve = skillBoost ? skillBoost.curve : 0;
    fireShot(
      shotCharge / 100,
      boostMult,
      skillCurve,
      aimOffsetX / AIM_RADIUS,
      aimOffsetY / AIM_RADIUS
    );
  }
}

// ─── MAGNUS ─────────────────────────────────────────────────────────────────
function applyMagnus(dt: number) {
  if (hasBall || isAwakeningShotBall || flickState !== 0 || (Math.abs(activeBallSpin) < 0.01 && Math.abs(activeBallVertSpin) < 0.01)) return;
  const lv = ballBody.linvel();
  const horizSpeed = Math.hypot(lv.x, lv.z);
  if (horizSpeed < 1.2) {
    activeBallSpin = 0;
    activeBallVertSpin = 0;
    return;
  }
  const perpX = -lv.z / horizSpeed;
  const perpZ =  lv.x / horizSpeed;
  const curveAccel = activeBallSpin * horizSpeed * 0.62;
  const vertAccel  = activeBallVertSpin * horizSpeed * 0.36;
  ballBody.setLinvel({
    x: lv.x + perpX * curveAccel * dt,
    y: lv.y + vertAccel * dt,
    z: lv.z + perpZ * curveAccel * dt,
  }, true);
  const decay = Math.max(0, 1 - 0.55 * dt);
  activeBallSpin *= decay;
  activeBallVertSpin *= decay;
}

// ─── RAINBOW FLICK (GROUNDED: NO JUMP, NO AIRBORNE STATE) ───────────────────
const NORMAL_JUMP_IMPULSE = 4.5;
function performRainbowFlick() {
  const pp = playerBody.translation();
  const pv = playerBody.linvel();
  const bp = ballBody.translation();
  _fwdVec.set(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();

  const fwdVel = Math.max(0, pv.x * _fwdVec.x + pv.z * _fwdVec.z);
  flickDirX = _fwdVec.x;
  flickDirZ = _fwdVec.z;
  flickDist = THREE.MathUtils.clamp(9.6 + fwdVel * 0.08, 8.6, 11.0);
  flickOriginX = pp.x;
  flickOriginZ = pp.z;
  flickStartX = bp.x;
  flickStartY = bp.y;
  flickStartZ = bp.z;

  setPossession(false);
  pickupCooldown = 0.45;
  noPlayerCollideTimer = 3;
  ballCollider.setCollisionGroups(BALL_GROUPS_POSS);
  ballBody.setGravityScale(0, true);
  ballBody.setLinearDamping(0);
  ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);

  flickState = 1;
  flickElapsed = 0;
  flickAirT = 0;
  rainbowFlickTimer = FLICK_RIG;
  activeBallSpin = 0;
  activeBallVertSpin = 0;

  juice(3, 0.05);
  addEnergy(10);
}

// ─── PLAYER MOVEMENT ────────────────────────────────────────────────────────
const SPEED_WALK = 7.5, SPEED_SPRINT = 13.0, SPEED_SLIDE = 21;

function shortestAngleDiff(from: number, to: number): number {
  let diff = (to - from + Math.PI) % (Math.PI * 2);
  if (diff < 0) diff += Math.PI * 2;
  return diff - Math.PI;
}

function movePlayer(dt: number) {
  _fwdVec.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  _rightVec.set(-Math.sin(yaw - Math.PI / 2), 0, -Math.cos(yaw - Math.PI / 2));

  let mx = 0, mz = 0;
  if (keys["KeyW"]) { mx += _fwdVec.x;   mz += _fwdVec.z; }
  if (keys["KeyS"]) { mx -= _fwdVec.x;   mz -= _fwdVec.z; }
  if (keys["KeyA"]) { mx -= _rightVec.x; mz -= _rightVec.z; }
  if (keys["KeyD"]) { mx += _rightVec.x; mz += _rightVec.z; }

  const ballLocked = hasBall || flickState !== 0;
  const awakenSpeed = isAwakened ? activeAwakening().speedMultiplier : 1;
  const moving    = Math.abs(mx) + Math.abs(mz) > 0;
  const sprinting = keys["ShiftLeft"] && stamina > 0 && moving;
  const baseSpeed = slideTimer > 0 ? SPEED_SLIDE : sprinting ? SPEED_SPRINT : SPEED_WALK;
  const speed     = baseSpeed * awakenSpeed * (hasBall ? dribbleSpeedMult : 1);

  if (sprinting) stamina = Math.max(0, stamina - 25 * dt);
  else           stamina = Math.min(100, stamina + 15 * dt);

  if (mouseRight && slideTimer <= 0 && isGrounded) {
    slideTimer = SLIDE_COOLDOWN;
    const impulse = SPEED_SLIDE * 1.5;
    playerBody.applyImpulse({ x: _fwdVec.x * impulse, y: 0, z: _fwdVec.z * impulse }, true);
    addEnergy(8);
    juice(3, 0.06);
    if (hasBall) {
      fireShot(0.25, 1.0, 0, 0, 0);
    } else {
      const pp = playerBody.translation();
      const bp = ballBody.translation();
      if (Math.hypot(bp.x - pp.x, bp.z - pp.z) < 3.0) addEnergy(20);
    }
  }

  if (slideTimer > 0) {
    slideTimer--;
    playerFacingYaw += shortestAngleDiff(playerFacingYaw, yaw) * (1 - Math.exp(-16 * dt));
    return;
  }

  const len = Math.hypot(mx, mz);
  if (len > 0) {
    mx /= len; mz /= len;
    const cv = playerBody.linvel();
    playerBody.setLinvel({ x: mx * speed, y: cv.y, z: mz * speed }, true);
    const moveYaw = Math.atan2(-mx, -mz);
    const targetYaw = ballLocked || isChargingShot ? yaw : moveYaw;
    const turnRate = ballLocked ? 28 : 14;
    playerFacingYaw += shortestAngleDiff(playerFacingYaw, targetYaw) * (1 - Math.exp(-turnRate * dt));
  } else {
    const cv = playerBody.linvel();
    playerBody.setLinvel({ x: cv.x * 0.7, y: cv.y, z: cv.z * 0.7 }, true);
    const turnRate = ballLocked ? 28 : 10;
    playerFacingYaw += shortestAngleDiff(playerFacingYaw, yaw) * (1 - Math.exp(-turnRate * dt));
  }

  // Space: rainbow flick with the ball (grounded, no jump) — normal jump only without the ball.
  if (keys["Space"] && isGrounded && !spaceLatch) {
    if (hasBall) {
      spaceLatch = true;
      performRainbowFlick();
    } else if (flickState !== 1) {
      spaceLatch = true;
      isGrounded = false;
      playerBody.applyImpulse({ x: 0, y: NORMAL_JUMP_IMPULSE, z: 0 }, true);
    }
  }
}

// ─── ARTICULATED PLAYER ANIMATION (SMOOTH BLENDED JOINTS) ───────────────────
function blendJoints(
  dt: number,
  tRotX: number, tRotY: number, tRotZ: number, tPosY: number,
  lHipX: number, lKneeX: number, rHipX: number, rKneeX: number,
  lShX: number, lShZ: number, lElbX: number,
  rShX: number, rShZ: number, rElbX: number
) {
  const s = 1 - Math.exp(-22 * dt);
  torsoGroup.rotation.x = THREE.MathUtils.lerp(torsoGroup.rotation.x, tRotX, s);
  torsoGroup.rotation.y = THREE.MathUtils.lerp(torsoGroup.rotation.y, tRotY, s);
  torsoGroup.rotation.z = THREE.MathUtils.lerp(torsoGroup.rotation.z, tRotZ + turnLean, s);
  torsoGroup.position.y = THREE.MathUtils.lerp(torsoGroup.position.y, tPosY, s);

  leftLeg.hip.rotation.x   = THREE.MathUtils.lerp(leftLeg.hip.rotation.x, lHipX, s);
  leftLeg.knee.rotation.x  = THREE.MathUtils.lerp(leftLeg.knee.rotation.x, lKneeX, s);
  rightLeg.hip.rotation.x  = THREE.MathUtils.lerp(rightLeg.hip.rotation.x, rHipX, s);
  rightLeg.knee.rotation.x = THREE.MathUtils.lerp(rightLeg.knee.rotation.x, rKneeX, s);

  leftArm.shoulder.rotation.x  = THREE.MathUtils.lerp(leftArm.shoulder.rotation.x, lShX, s);
  leftArm.shoulder.rotation.z  = THREE.MathUtils.lerp(leftArm.shoulder.rotation.z, lShZ, s);
  leftArm.elbow.rotation.x     = THREE.MathUtils.lerp(leftArm.elbow.rotation.x, lElbX, s);
  rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(rightArm.shoulder.rotation.x, rShX, s);
  rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(rightArm.shoulder.rotation.z, rShZ, s);
  rightArm.elbow.rotation.x    = THREE.MathUtils.lerp(rightArm.elbow.rotation.x, rElbX, s);
}

function updatePlayerRig(dt: number, nowSec: number) {
  const pp = playerBody.translation();
  const pv = playerBody.linvel();
  const horizSpeed = Math.hypot(pv.x, pv.z);

  playerRoot.position.set(pp.x, pp.y - PLAYER_H / 2, pp.z);
  playerRoot.rotation.set(0, playerFacingYaw, 0);

  rigAnimSpeed = THREE.MathUtils.lerp(rigAnimSpeed, horizSpeed, 1 - Math.exp(-15 * dt));
  const normSpeed = Math.min(1, rigAnimSpeed / SPEED_SPRINT);

  if (dt > 1e-5) {
    const dyaw = shortestAngleDiff(prevFacingYaw, playerFacingYaw);
    const speedK = Math.min(1, horizSpeed / 7);
    const targetLean = THREE.MathUtils.clamp((dyaw / dt) * 0.05 * speedK, -0.3, 0.3);
    turnLean = THREE.MathUtils.lerp(turnLean, targetLean, 1 - Math.exp(-12 * dt));
  }
  prevFacingYaw = playerFacingYaw;

  const flutter = Math.sin(nowSec * 12) * (0.08 + normSpeed * 0.25);
  headbandTails[0].rotation.x = 0.55 + normSpeed * 0.55 + flutter;
  headbandTails[1].rotation.x = 0.55 + normSpeed * 0.55 - flutter;

  if (rainbowFlickTimer > 0) {
    const e = FLICK_RIG - rainbowFlickTimer;
    const p1 = smooth01(e / FLICK_HOLD_END);
    const q = smooth01((e - FLICK_HOLD_END) / (FLICK_LAUNCH_AT - FLICK_HOLD_END));
    const r = smooth01((e - 0.28) / 0.28);
    const lift = p1 * (1 - r);
    const snap = q * (1 - r);
    blendJoints(
      dt,
      -0.28 * lift - 0.08 * snap, 0, 0, 0.90 - 0.03 * lift,
      0.12 * lift, -0.22 * lift,
      -0.65 * lift - 0.20 * snap, -1.0 * lift - 1.0 * snap,
      0.5 * lift, -0.45, 0.6,
      -0.4 * lift, 0.45, 0.6
    );
    return;
  }

  if (skillAnimTimer > 0 && activeSkillAnim !== "none") {
    if (activeSkillAnim === "heel") {
      const p = 1 - skillAnimTimer / 0.38;
      const snap = Math.sin(p * Math.PI);
      blendJoints(
        dt,
        -0.32 * snap, 0.28 * snap, 0, 0.90,
        0.15, -0.25, -1.0 * snap, -1.2 * snap,
        0.7 * snap, -0.42, 0.55,
        -0.6 * snap, 0.42, 0.55
      );
      return;
    }
    if (activeSkillAnim === "spin") {
      const p = 1 - skillAnimTimer / 0.44;
      playerRoot.rotation.y = playerFacingYaw + p * Math.PI * 2;
      blendJoints(
        dt,
        -0.22, 0, 0, 0.89,
        0.35, -0.62, -0.25, -0.45,
        0.25, -0.75, 0.6,
        0.25,  0.75, 0.6
      );
      return;
    }
    if (activeSkillAnim === "feint") {
      const p = 1 - skillAnimTimer / 0.40;
      const fake = p < 0.45 ? Math.sin((p / 0.45) * Math.PI) : -Math.sin(((p - 0.45) / 0.55) * Math.PI);
      blendJoints(
        dt,
        -0.18, fake * 0.45, fake * 0.26, 0.89,
        -0.15, -0.25, fake * 0.92, -0.42,
        -fake * 0.58, -0.52, 0.55,
         fake * 0.58,  0.52, 0.55
      );
      return;
    }
  }

  if (slideTimer > SLIDE_COOLDOWN - 24) {
    blendJoints(
      dt,
      0.72, -0.15, 0, 0.58,
      -0.55, -0.95, 1.22, -0.15,
      -0.62, -0.35, 0.45,
       0.45,  0.30, 0.72
    );
    return;
  }

  if (kickAnimTimer > 0) {
    const p = 1 - kickAnimTimer / 0.28;
    const follow = Math.sin(p * Math.PI);
    blendJoints(
      dt,
      -0.22 * follow, 0.34 * follow, 0, 0.90,
      -0.25, -0.22, 1.22 * follow, -0.22 * (1 - follow),
       0.82 * follow, -0.36, 0.72,
      -0.62 * follow,  0.28, 0.58
    );
    return;
  }

  if (isChargingShot && hasBall) {
    const c = shotCharge / 100;
    blendJoints(
      dt,
      0.12 * c, -0.30 * c, 0, 0.88 - c * 0.04,
      0.18 * c, -0.22 * c, -0.82 * c, -1.05 * c,
      0.35 * c, -0.55 * c, 0.55,
     -0.45 * c,  0.35 * c, 0.82
    );
    return;
  }

  if (!isGrounded) {
    blendJoints(
      dt,
      -0.15, 0, 0, 0.92,
      0.42, -0.82, 0.20, -0.62,
      0.42, -0.42, 0.62,
      0.42,  0.42, 0.62
    );
    return;
  }

  if (rigAnimSpeed > 0.3) {
    runCycle += dt * (5.8 + rigAnimSpeed * 0.9);
  }
  const swing = Math.sin(runCycle) * normSpeed * 0.95;
  const armSpread = hasBall ? 0.20 : 0.09 + normSpeed * 0.08;
  const idleBreath = Math.sin(nowSec * 3.0) * 0.02 * (1 - normSpeed);

  blendJoints(
    dt,
    -normSpeed * (hasBall ? 0.26 : 0.22) + idleBreath,
    swing * 0.12,
    0,
    0.90 + Math.abs(Math.sin(runCycle)) * 0.045 * normSpeed,
    swing,
    -Math.max(0, -swing) * 0.9 - normSpeed * 0.10,
    -swing,
    -Math.max(0, swing) * 0.9 - normSpeed * 0.10,
    -swing * 0.9,
    -armSpread,
    0.35 + normSpeed * 0.7 + Math.max(0, -swing) * 0.26,
    swing * 0.9,
    armSpread,
    0.35 + normSpeed * 0.7 + Math.max(0, swing) * 0.26
  );
}

// ─── CAMERA (LAG + FOV PUNCH + MICRO-SHAKE) ─────────────────────────────────
function updateCamera(dt: number, nowSec: number) {
  const pp = playerBody.translation();
  _camPivot.set(pp.x, pp.y + 0.85, pp.z);
  if (!camInit) { _camPivotSmooth.copy(_camPivot); camInit = true; }

  const sprintK = Math.min(1, rigAnimSpeed / SPEED_SPRINT);
  const lag = 1 - Math.exp(-(17 - sprintK * 8) * dt);
  _camPivotSmooth.lerp(_camPivot, lag);
  const dx = _camPivot.x - _camPivotSmooth.x;
  const dy = _camPivot.y - _camPivotSmooth.y;
  const dz = _camPivot.z - _camPivotSmooth.z;
  const dl = Math.hypot(dx, dy, dz);
  if (dl > 1.8) {
    const k = (dl - 1.8) / dl;
    _camPivotSmooth.x += dx * k; _camPivotSmooth.y += dy * k; _camPivotSmooth.z += dz * k;
  }

  _camEuler.set(0, yaw, 0);
  _camQYaw.setFromEuler(_camEuler);
  _camEuler.set(pitch2, 0, 0);
  _camQPitch.setFromEuler(_camEuler);
  _camOffsetScratch.set(0, 2.7, 6.0 + sprintK * 0.7 + fovPunch * 0.03)
    .applyQuaternion(_camQYaw.multiply(_camQPitch));
  camera.position.copy(_camPivotSmooth).add(_camOffsetScratch);

  if (camShake > 0.002) {
    const a = camShake * 0.22;
    camera.position.x += Math.sin(nowSec * 93.1) * a;
    camera.position.y += Math.sin(nowSec * 77.7 + 1.3) * a;
    camera.position.z += Math.sin(nowSec * 61.3 + 2.1) * a;
    camShake *= Math.exp(-13 * dt);
  } else {
    camShake = 0;
  }

  camera.lookAt(_camPivotSmooth);

  fovPunch *= Math.exp(-8 * dt);
  const chargeZoom = isChargingShot ? -3 * (shotCharge / 100) : 0;
  const targetFov = BASE_FOV + sprintK * 4 + fovPunch + chargeZoom;
  const nf = THREE.MathUtils.lerp(camera.fov, targetFov, 1 - Math.exp(-11 * dt));
  if (Math.abs(nf - camera.fov) > 0.01) {
    camera.fov = nf;
    camera.updateProjectionMatrix();
  }
}

// ─── SUN FOLLOW & BLOB SHADOWS ──────────────────────────────────────────────
function updateShadows() {
  const pp = playerBody.translation();
  const fx = Math.round(pp.x), fz = Math.round(pp.z);
  sun.target.position.set(fx, 0, fz);
  sun.position.set(fx + 28, 52, fz + 24);
  sun.target.updateMatrixWorld();

  playerBlob.position.set(pp.x, 0.035, pp.z);
  const jumpH = Math.max(0, pp.y - PLAYER_H / 2);
  const ps = 1.5 * (1 - Math.min(0.4, jumpH * 0.12));
  playerBlob.scale.set(ps, ps, 1);
  playerBlobMat.opacity = 0.85 / (1 + jumpH * 0.6);

  const bp = ballBody.translation();
  const h = Math.max(0, bp.y - BALL_R);
  ballBlob.position.set(bp.x, 0.036, bp.z);
  const bs = 0.7 * (1 + h * 0.1);
  ballBlob.scale.set(bs, bs, 1);
  ballBlobMat.opacity = 0.75 / (1 + h * 0.55);
}

// ─── BALL SPIN, TRAIL & AIR-SLICE RIBBON ────────────────────────────────────
function updateRibbon(target: number) {
  ribbonMat.opacity = THREE.MathUtils.lerp(ribbonMat.opacity, target, 0.25);
  if (trailCount < 3 || ribbonMat.opacity < 0.02) {
    ribbonGeo.setDrawRange(0, 0);
    return;
  }
  const arr = trailGeo.attributes["position"].array as Float32Array;
  const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
  const last = trailCount - 1;
  for (let i = 0; i < trailCount; i++) {
    const j = Math.min(i + 1, last), k = Math.max(i - 1, 0);
    const px = arr[i * 3], py = arr[i * 3 + 1], pz = arr[i * 3 + 2];
    const dx = arr[j * 3] - arr[k * 3], dy = arr[j * 3 + 1] - arr[k * 3 + 1], dz = arr[j * 3 + 2] - arr[k * 3 + 2];
    const vx = cx - px, vy = cy - py, vz = cz - pz;
    let sx = dy * vz - dz * vy, sy = dz * vx - dx * vz, sz = dx * vy - dy * vx;
    const sl = Math.hypot(sx, sy, sz);
    const w = (RIB_W * 0.5) * (i / last);
    if (sl > 1e-6) { const m = w / sl; sx *= m; sy *= m; sz *= m; } else { sx = sy = sz = 0; }
    const o = i * 6;
    ribbonPos[o]     = px + sx; ribbonPos[o + 1] = py + sy; ribbonPos[o + 2] = pz + sz;
    ribbonPos[o + 3] = px - sx; ribbonPos[o + 4] = py - sy; ribbonPos[o + 5] = pz - sz;
  }
  (ribbonGeo.attributes["position"] as THREE.BufferAttribute).needsUpdate = true;
  ribbonGeo.setDrawRange(0, (trailCount - 1) * 6);
}

function updateBallVisuals(dt: number) {
  const bp = ballBody.translation();
  const bv = ballBody.linvel();
  const speed = hasBall ? Math.hypot(playerBody.linvel().x, playerBody.linvel().z) : Math.hypot(bv.x, bv.y, bv.z);

  ballVisual.position.set(bp.x, bp.y, bp.z);
  if (hasBall) {
    ballCore.rotation.x -= speed * dt * 2.2;
  } else if (flickState !== 0) {
    ballCore.rotation.x -= dt * 22;
    ballCore.rotation.z += dt * 5;
  } else {
    const bav = ballBody.angvel();
    ballCore.rotation.x += bav.x * FIXED_DT;
    ballCore.rotation.y += bav.y * FIXED_DT;
    ballCore.rotation.z += bav.z * FIXED_DT;
  }

  let ribbonTarget = 0;
  if (isAwakeningShotBall) {
    trailMat.color.setHex(0xfde68a);
    trailMat.opacity = 0.82;
    ribbonMat.color.setHex(0xfde68a);
    ribbonTarget = 0.78;
    spawnTrailParticle(bp.x, bp.y, bp.z, 0xfde68a, 1.15);
    spawnTrailParticle(bp.x, bp.y, bp.z, 0xf8fafc, 0.9);
  } else if (flickState === 2) {
    trailMat.color.setHex(0xf8fafc);
    trailMat.opacity = 0.5;
    ribbonMat.color.setHex(0xf8fafc);
    ribbonTarget = 0.4;
    spawnTrailParticle(bp.x, bp.y, bp.z, 0xf8fafc, 0.6);
  } else {
    trailMat.color.setHex(0xf8fafc);
    trailMat.opacity = !hasBall && speed > 8 ? Math.min(0.6, speed / 42) : 0.0;
    ribbonMat.color.setHex(0xf8fafc);
    if (!hasBall && speed > 19) {
      spawnTrailParticle(bp.x, bp.y, bp.z, 0xf8fafc, 0.65);
    }
    const spinMag = Math.abs(activeBallSpin) + Math.abs(activeBallVertSpin) * 0.6;
    if (!hasBall && speed > 11 && spinMag > 0.35) {
      ribbonTarget = Math.min(0.55, 0.2 + spinMag * 0.12);
    }
  }

  const attr = trailGeo.attributes["position"] as THREE.BufferAttribute;
  const arr = attr.array as Float32Array;
  let moved = true;
  if (trailCount > 0) {
    const lastIdx = (trailCount - 1) * 3;
    if (arr[lastIdx] === bp.x && arr[lastIdx + 1] === bp.y && arr[lastIdx + 2] === bp.z) moved = false;
  }
  if (moved) {
    if (trailCount >= TRAIL_LEN) {
      arr.copyWithin(0, 3, TRAIL_LEN * 3);
      const tail = (TRAIL_LEN - 1) * 3;
      arr[tail]     = bp.x;
      arr[tail + 1] = bp.y;
      arr[tail + 2] = bp.z;
    } else {
      const idx = trailCount * 3;
      arr[idx]     = bp.x;
      arr[idx + 1] = bp.y;
      arr[idx + 2] = bp.z;
      trailCount++;
    }
    attr.needsUpdate = true;
    trailGeo.setDrawRange(0, trailCount);
  }

  updateRibbon(ribbonTarget);
}

// ─── MAIN LOOP ──────────────────────────────────────────────────────────────
buildSkillPanel();
cacheSkillPanelEls();
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const nowSec = now * 0.001;
  const rawDt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (hitStopTimer > 0) hitStopTimer = Math.max(0, hitStopTimer - rawDt);
  const dt = hitStopTimer > 0 ? rawDt * 0.05 : rawDt;

  handlePlaystyleKeys();
  handleSkillKeys();
  if (keyJustPressed["KeyR"]) tryAwaken();
  for (const k of Object.keys(keyJustPressed)) keyJustPressed[k] = false;

  updateCooldowns(dt);
  tryPickupBall(dt);

  physicsAccum += dt;
  while (physicsAccum >= FIXED_DT) {
    world.step();
    physicsAccum -= FIXED_DT;
  }

  checkGrounded();
  movePlayer(dt);
  tryPickupBall(dt);
  updatePossessionAndShoot(dt);
  applyMagnus(dt);
  checkGoal();
  updateAwakening(dt, nowSec);
  updateSkillVfx(dt);
  updatePlayerRig(dt, nowSec);
  updateCrowd(rawDt, nowSec);
  updateBallVisuals(dt);
  updateShadows();
  updateCamera(rawDt, nowSec);
  updateHUD(rawDt);

  renderer.render(scene, camera);
}

animate();
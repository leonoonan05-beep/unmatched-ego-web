import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import {
  PLAYSTYLES,
  skillsForPlaystyle,
  awakeningForPlaystyle,
  type Playstyle,
  type SkillConfig,
} from "../../shared/abilities";

// ─── HUD (CLEAN ANIME SPORTS BROADCAST) ─────────────────────────────────────
const hud = document.createElement("div");
hud.style.cssText = `
  position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;
  font-family:'Segoe UI',system-ui,sans-serif;color:#f8fafc;
  text-shadow:0 1px 3px rgba(0,0,0,.65);
`;
document.body.style.cssText = "margin:0;overflow:hidden;background:#0f172a;";
hud.innerHTML = `
<div id="score" style="position:absolute;top:18px;left:50%;transform:translateX(-50%);
  font-size:1.75rem;font-weight:800;letter-spacing:4px;padding:6px 24px;border-radius:8px;
  background:rgba(15,23,42,.72);border:1px solid rgba(255,255,255,.2);
  box-shadow:0 4px 14px rgba(0,0,0,.35);">0 — 0</div>
<div id="playstyle-tag" style="position:absolute;top:18px;left:24px;font-size:.95rem;font-weight:700;
  letter-spacing:2px;padding:7px 14px;border-left:4px solid #dc2626;border-radius:6px;
  background:rgba(15,23,42,.72);border-top:1px solid rgba(255,255,255,.15);
  border-right:1px solid rgba(255,255,255,.15);border-bottom:1px solid rgba(255,255,255,.15);">
  EGOIST <span style="opacity:.6;font-weight:normal;font-size:.7rem;">[1-4]</span>
</div>
<div style="position:absolute;bottom:34px;left:24px;width:176px;padding:10px 12px;border-radius:8px;
  background:rgba(15,23,42,.7);border:1px solid rgba(255,255,255,.16);">
  <div style="font-size:.68rem;font-weight:700;letter-spacing:1.8px;margin-bottom:4px;color:#e2e8f0;">STAMINA</div>
  <div style="background:rgba(255,255,255,.14);height:8px;border-radius:4px;overflow:hidden;">
    <div id="stam-bar" style="height:100%;width:100%;background:linear-gradient(90deg,#38bdf8,#0284c7);border-radius:4px;transition:width .1s;"></div>
  </div>
  <div style="font-size:.68rem;font-weight:700;letter-spacing:1.8px;margin-top:10px;margin-bottom:4px;color:#e2e8f0;">
    AWAKENING <span style="color:#fbbf24;">[R]</span>
  </div>
  <div style="background:rgba(255,255,255,.14);height:8px;border-radius:4px;position:relative;overflow:hidden;">
    <div id="aw-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#f59e0b,#fbbf24);border-radius:4px;transition:width .12s;"></div>
    <div id="aw-ready" style="display:none;position:absolute;top:-1px;left:0;width:100%;text-align:center;font-size:.55rem;
      font-weight:800;letter-spacing:2px;color:#0f172a;">READY</div>
  </div>
  <div id="aw-label" style="font-size:.62rem;letter-spacing:1.5px;margin-top:4px;color:#fde68a;"></div>
</div>

<!-- Right-side Vertical Power Gauge (Green -> Yellow -> Red) -->
<div id="power-gauge-wrap" style="display:none;position:absolute;right:28px;top:50%;transform:translateY(-50%);
  flex-direction:column;align-items:center;gap:6px;">
  <div id="power-gauge-pct" style="font-size:.78rem;font-weight:800;letter-spacing:1px;color:#22c55e;">0%</div>
  <div style="width:15px;height:210px;background:rgba(15,23,42,.76);border:1px solid rgba(255,255,255,.28);
    border-radius:8px;position:relative;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.45);">
    <div id="power-gauge-fill" style="position:absolute;left:0;bottom:0;width:100%;height:0%;
      background:linear-gradient(to top,#22c55e 0%,#eab308 50%,#ef4444 100%);
      background-size:100% 210px;background-position:bottom;"></div>
    <div style="position:absolute;left:0;right:0;bottom:25%;height:1px;background:rgba(255,255,255,.22);"></div>
    <div style="position:absolute;left:0;right:0;bottom:50%;height:1px;background:rgba(255,255,255,.35);"></div>
    <div style="position:absolute;left:0;right:0;bottom:75%;height:1px;background:rgba(255,255,255,.22);"></div>
  </div>
  <div style="font-size:.58rem;font-weight:700;letter-spacing:2px;opacity:.85;">SHOT</div>
</div>

<!-- Compact Circular Aiming Reticle (ONLY visible while charging a shot) -->
<div id="aim-reticle" style="display:none;opacity:0;position:absolute;top:34%;left:50%;width:36px;height:36px;
  transform:translate(-50%,-50%);border-radius:50%;border:1.5px solid rgba(255,255,255,.72);
  background:rgba(15,23,42,.24);box-shadow:0 2px 8px rgba(0,0,0,.35);">
  <div style="position:absolute;top:50%;left:50%;width:2.5px;height:2.5px;margin:-1.25px 0 0 -1.25px;
    border-radius:50%;background:rgba(255,255,255,.92);"></div>
  <div id="aim-dot" style="position:absolute;top:50%;left:50%;width:6px;height:6px;margin:-3px 0 0 -3px;
    border-radius:50%;background:#fbbf24;border:1px solid #fff;"></div>
</div>

<div id="skill-panel" style="position:absolute;bottom:34px;right:24px;display:flex;gap:8px;"></div>
<div id="awaken-flash" style="position:absolute;top:34%;left:50%;transform:translate(-50%,-50%);display:none;
  font-size:1.55rem;font-weight:800;letter-spacing:5px;color:#fef08a;
  padding:8px 22px;border-radius:8px;background:rgba(15,23,42,.75);border:1px solid rgba(251,191,36,.5);"></div>
<div id="lock-prompt" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  font-size:1rem;font-weight:700;letter-spacing:2px;background:rgba(15,23,42,.82);
  padding:12px 24px;border:1px solid rgba(255,255,255,.28);border-radius:8px;">
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

const PLAYSTYLE_HEX: Record<Playstyle, string> = {
  EGOIST: "#dc2626", PLAYMAKER: "#d97706", LOCKDOWN: "#059669", SPEEDSTER: "#2563eb",
};
const PLAYSTYLE_COLOR_INT: Record<Playstyle, number> = {
  EGOIST: 0xdc2626, PLAYMAKER: 0xd97706, LOCKDOWN: 0x059669, SPEEDSTER: 0x2563eb,
};
const SKILL_KEYS = ["Z", "X", "C"];

// ─── SCENE / RENDERER ───────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6096d4);
scene.fog = new THREE.FogExp2(0x7aaee0, 0.0026);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 420);

window.addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

// ─── CLEAR ANIME STADIUM SKY DOME ───────────────────────────────────────────
const skyDome = new THREE.Mesh(
  new THREE.SphereGeometry(240, 24, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x1b468c) },
      midColor: { value: new THREE.Color(0x4f8bd4) },
      horColor: { value: new THREE.Color(0xcce4ff) },
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
      varying vec3 vPos;
      void main() {
        float h = clamp(vPos.y, 0.0, 1.0);
        vec3 col = mix(horColor, midColor, smoothstep(0.0, 0.25, h));
        col = mix(col, topColor, smoothstep(0.22, 0.85, h));
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
);
scene.add(skyDome);

// ─── NATURAL WARM / DAYLIGHT FLOODLIGHTING ──────────────────────────────────
const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e4d2b, 0.95);
scene.add(hemiLight);

const sun = new THREE.DirectionalLight(0xfff7e6, 1.75);
sun.position.set(28, 52, 24);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 200;
sun.shadow.camera.left = -65;
sun.shadow.camera.right = 65;
sun.shadow.camera.top = 65;
sun.shadow.camera.bottom = -65;
scene.add(sun);

const skyFill = new THREE.DirectionalLight(0xbfdbfe, 0.55);
skyFill.position.set(-34, 24, -26);
scene.add(skyFill);

// ─── NATURAL EMERALD TURF PITCH & MATTE WHITE LINES ─────────────────────────
const PITCH_W = 95, PITCH_H = 0.3, PITCH_D = 60;
const hw = PITCH_W / 2, hd = PITCH_D / 2;

function makeTurfTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 512;
  const ctx = c.getContext("2d")!;
  const stripes = 18;
  const sw = c.width / stripes;
  for (let i = 0; i < stripes; i++) {
    const grad = ctx.createLinearGradient(i * sw, 0, (i + 1) * sw, 0);
    if (i % 2 === 0) {
      grad.addColorStop(0, "#14532d");
      grad.addColorStop(0.5, "#166534");
      grad.addColorStop(1, "#14532d");
    } else {
      grad.addColorStop(0, "#1b783e");
      grad.addColorStop(0.5, "#1f8545");
      grad.addColorStop(1, "#1b783e");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(i * sw, 0, sw + 1, c.height);
  }
  ctx.fillStyle = "rgba(255,255,255,0.025)";
  for (let y = 0; y < c.height; y += 32) {
    if ((y / 32) % 2 === 0) ctx.fillRect(0, y, c.width, 16);
  }
  for (let i = 0; i < 6500; i++) {
    ctx.fillStyle = i % 3 === 0 ? "rgba(187,247,208,0.05)" : "rgba(5,46,22,0.09)";
    ctx.fillRect((i * 97) % c.width, (i * 193) % c.height, 2, 3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const pitchMesh = new THREE.Mesh(
  new THREE.BoxGeometry(PITCH_W, PITCH_H, PITCH_D),
  new THREE.MeshStandardMaterial({ map: makeTurfTexture(), roughness: 0.9, metalness: 0.0 })
);
pitchMesh.receiveShadow = true;
pitchMesh.position.y = -PITCH_H / 2;
scene.add(pitchMesh);

const apronMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(PITCH_W + 58, PITCH_D + 58),
  new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.92, metalness: 0.05 })
);
apronMesh.rotation.x = -Math.PI / 2;
apronMesh.position.y = -0.04;
apronMesh.receiveShadow = true;
scene.add(apronMesh);

const pitchLineMat = new THREE.LineBasicMaterial({ color: 0xf8fafc });
function makeLine(points: THREE.Vector3[]) {
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geo, pitchLineMat);
  line.position.y = 0.025;
  scene.add(line);
}

makeLine([
  new THREE.Vector3(-hw, 0, -hd), new THREE.Vector3(hw, 0, -hd),
  new THREE.Vector3(hw, 0, hd),   new THREE.Vector3(-hw, 0, hd),
  new THREE.Vector3(-hw, 0, -hd),
]);
makeLine([new THREE.Vector3(0, 0, -hd), new THREE.Vector3(0, 0, hd)]);

{
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * 11, 0, Math.sin(a) * 11));
  }
  makeLine(pts);
}

[-1, 1].forEach(side => {
  const penX = side * (hw - 17), penZ = 16.5;
  makeLine([
    new THREE.Vector3(side * hw, 0, -penZ), new THREE.Vector3(penX, 0, -penZ),
    new THREE.Vector3(penX, 0, penZ),       new THREE.Vector3(side * hw, 0, penZ),
  ]);
  const sixX = side * (hw - 6.5), sixZ = 9.5;
  makeLine([
    new THREE.Vector3(side * hw, 0, -sixZ), new THREE.Vector3(sixX, 0, -sixZ),
    new THREE.Vector3(sixX, 0, sixZ),       new THREE.Vector3(side * hw, 0, sixZ),
  ]);
  const arcPts: THREE.Vector3[] = [];
  const spotX = side * (hw - 12);
  for (let i = 0; i <= 24; i++) {
    const a = -0.68 + (i / 24) * 1.36;
    const ax = spotX - side * Math.cos(a) * 9;
    const az = Math.sin(a) * 9;
    if (side < 0 ? ax > penX : ax < penX) arcPts.push(new THREE.Vector3(ax, 0, az));
  }
  if (arcPts.length > 1) makeLine(arcPts);
});

// ─── REALISTIC STADIUM ARCHITECTURE, TUNNEL, JUMBOTRONS & CROWD ────────────
let jumbotronTex!: THREE.CanvasTexture;
let jumbotronCtx!: CanvasRenderingContext2D;
let jumbotronCanvas!: HTMLCanvasElement;

function updateJumbotronScreen(home: number, away: number, status = "CHAMPIONSHIP MATCH") {
  if (!jumbotronCtx) return;
  const w = jumbotronCanvas.width, h = jumbotronCanvas.height;
  jumbotronCtx.fillStyle = "#0f172a";
  jumbotronCtx.fillRect(0, 0, w, h);

  jumbotronCtx.fillStyle = "#1e293b";
  jumbotronCtx.fillRect(10, 10, w - 20, h - 20);

  jumbotronCtx.strokeStyle = "#cbd5e1";
  jumbotronCtx.lineWidth = 4;
  jumbotronCtx.strokeRect(10, 10, w - 20, h - 20);

  jumbotronCtx.fillStyle = "#94a3b8";
  jumbotronCtx.font = "bold 22px Segoe UI, sans-serif";
  jumbotronCtx.textAlign = "center";
  jumbotronCtx.fillText(status, w / 2, 52);

  jumbotronCtx.fillStyle = "#f8fafc";
  jumbotronCtx.font = "bold 94px Segoe UI, sans-serif";
  jumbotronCtx.fillText(`${home}  —  ${away}`, w / 2, 162);

  jumbotronCtx.fillStyle = "#fbbf24";
  jumbotronCtx.font = "bold 20px Segoe UI, sans-serif";
  jumbotronCtx.fillText("STADIUM LIVE", w / 2, 220);

  jumbotronTex.needsUpdate = true;
}

const CROWD_COUNT = 520;
const crowdBaseX = new Float32Array(CROWD_COUNT);
const crowdBaseY = new Float32Array(CROWD_COUNT);
const crowdBaseZ = new Float32Array(CROWD_COUNT);
const crowdPhase = new Float32Array(CROWD_COUNT);
let crowdMesh!: THREE.InstancedMesh;
let crowdExcitement = 0;

function buildStadiumAtmosphere() {
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85, metalness: 0.1 });
  const riserMat    = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8, metalness: 0.15 });
  const roofMat     = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65, metalness: 0.35 });
  const trimMat     = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5, metalness: 0.1 });
  const bannerBlue  = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.7 });
  const bannerRed   = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.7 });

  [-1, 1].forEach((side, sIdx) => {
    const zBase = side * (hd + 4.8);
    if (side === -1) {
      const segW = (PITCH_W + 6 - 10) / 2;
      [-1, 1].forEach(segSide => {
        const lower = new THREE.Mesh(new THREE.BoxGeometry(segW, 2.4, 4.2), concreteMat);
        lower.position.set(segSide * (5 + segW / 2), 1.2, zBase);
        scene.add(lower);
      });
      const tunnelVoid = new THREE.Mesh(
        new THREE.BoxGeometry(8.4, 3.6, 8),
        new THREE.MeshBasicMaterial({ color: 0x0f172a })
      );
      tunnelVoid.position.set(0, 1.8, zBase - 1.8);
      scene.add(tunnelVoid);

      const tunnelArch = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.8, 4.6), riserMat);
      tunnelArch.position.set(0, 3.9, zBase);
      scene.add(tunnelArch);

      const tunnelTrim = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.24, 0.28), trimMat);
      tunnelTrim.position.set(0, 3.45, zBase + 2.25);
      scene.add(tunnelTrim);
    } else {
      const lower = new THREE.Mesh(new THREE.BoxGeometry(PITCH_W + 6, 2.4, 4.2), concreteMat);
      lower.position.set(0, 1.2, zBase);
      scene.add(lower);
    }

    for (let t = 1; t < 4; t++) {
      const tier = new THREE.Mesh(new THREE.BoxGeometry(PITCH_W + 8 + t * 2, 2.3, 4.0), t % 2 ? riserMat : concreteMat);
      tier.position.set(0, 1.2 + t * 2.25, zBase + side * t * 3.8);
      scene.add(tier);
    }

    const roof = new THREE.Mesh(new THREE.BoxGeometry(PITCH_W + 18, 0.9, 13.5), roofMat);
    roof.position.set(0, 12.6, zBase + side * 6.4);
    scene.add(roof);

    const fascia = new THREE.Mesh(new THREE.BoxGeometry(PITCH_W + 4, 0.45, 0.2), sIdx === 0 ? bannerBlue : bannerRed);
    fascia.position.set(0, 2.55, side * (hd + 2.65));
    scene.add(fascia);

    const upperTrim = new THREE.Mesh(new THREE.BoxGeometry(PITCH_W + 12, 0.3, 0.2), trimMat);
    upperTrim.position.set(0, 12.1, zBase - side * 0.2);
    scene.add(upperTrim);
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
      const tier = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.3, PITCH_D + 6 + t * 2), t % 2 ? riserMat : concreteMat);
      tier.position.set(xBase + side * t * 3.8, 1.2 + t * 2.25, 0);
      scene.add(tier);
    }
    const fascia = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, PITCH_D + 2), sIdx === 0 ? bannerRed : bannerBlue);
    fascia.position.set(side * (hw + 5.45), 2.55, 0);
    scene.add(fascia);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 8.8, 17.2), roofMat);
    frame.position.set(side * (hw + 14.5), 14.2, 0);
    scene.add(frame);

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(16.0, 8.0), screenMat);
    screen.position.set(side * (hw + 13.85), 14.2, 0);
    screen.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    scene.add(screen);
  });

  const crowdGeo = new THREE.CylinderGeometry(0.22, 0.34, 1.08, 6);
  const crowdMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  crowdMesh = new THREE.InstancedMesh(crowdGeo, crowdMat, CROWD_COUNT);
  const dummy = new THREE.Object3D();
  const cCol = new THREE.Color();
  const palette = [0xdc2626, 0x2563eb, 0xf8fafc, 0xfacc15, 0x16a34a, 0x64748b];

  for (let i = 0; i < CROWD_COUNT; i++) {
    const tier = i % 4;
    const side = i % 2 === 0 ? -1 : 1;
    let x = 0, y = 2.9 + tier * 2.25, z = 0;
    if (i < 340) {
      x = (((i * 37) % 100) / 100 - 0.5) * (PITCH_W + 2);
      if (side === -1 && tier === 0 && Math.abs(x) < 5.5) x += x >= 0 ? 6 : -6;
      z = side * (hd + 4.8 + tier * 3.8);
    } else {
      x = side * (hw + 7.5 + tier * 3.8);
      z = (((i * 53) % 100) / 100 - 0.5) * PITCH_D;
    }
    crowdBaseX[i] = x;
    crowdBaseY[i] = y;
    crowdBaseZ[i] = z;
    crowdPhase[i] = (i * 0.73) % (Math.PI * 2);

    dummy.position.set(x, y, z);
    dummy.scale.set(1, 0.88 + ((i * 19) % 5) * 0.06, 1);
    dummy.updateMatrix();
    crowdMesh.setMatrixAt(i, dummy.matrix);
    cCol.setHex(palette[(i * 7) % palette.length]);
    crowdMesh.setColorAt(i, cCol);
  }
  crowdMesh.instanceMatrix.needsUpdate = true;
  if (crowdMesh.instanceColor) crowdMesh.instanceColor.needsUpdate = true;
  scene.add(crowdMesh);

  const mastGeo = new THREE.CylinderGeometry(0.45, 0.72, 34, 8);
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.45, roughness: 0.55 });
  const headGeo = new THREE.BoxGeometry(4.2, 1.5, 0.9);
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff8e7 });
  const coneGeo = new THREE.ConeGeometry(16, 46, 16, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff6dd,
    transparent: true,
    opacity: 0.032,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const corners = [
    [-55, 36],
    [ 55, 36],
    [-55,-36],
    [ 55,-36],
  ] as const;

  corners.forEach(([cx, cz]) => {
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(cx, 17, cz);
    scene.add(mast);

    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(cx, 34, cz);
    head.lookAt(0, 0, 0);
    scene.add(head);

    const spot = new THREE.SpotLight(0xfff5e0, 2.2, 160, Math.PI / 4.2, 0.65, 1.2);
    spot.position.set(cx * 0.94, 33, cz * 0.94);
    spot.target.position.set(0, 0, 0);
    scene.add(spot);
    scene.add(spot.target);

    const beam = new THREE.Mesh(coneGeo, beamMat);
    beam.position.set(cx * 0.62, 17.5, cz * 0.62);
    beam.lookAt(0, 0, 0);
    beam.rotateX(Math.PI / 2);
    scene.add(beam);
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
  const amp   = 0.14 + crowdExcitement * 0.42;
  for (let i = 0; i < CROWD_COUNT; i++) {
    const wave = Math.sin(nowSec * speed + crowdPhase[i]);
    _crowdDummy.position.set(crowdBaseX[i], crowdBaseY[i] + Math.max(0, wave) * amp, crowdBaseZ[i]);
    _crowdDummy.rotation.z = wave * (0.08 + crowdExcitement * 0.18);
    _crowdDummy.updateMatrix();
    crowdMesh.setMatrixAt(i, _crowdDummy.matrix);
  }
  crowdMesh.instanceMatrix.needsUpdate = true;
}

// ─── GOALS & BOUNDARY BOARDS ────────────────────────────────────────────────
const GOAL_W = 11.6, GOAL_H = 3.8, GOAL_D = 3.2;
const wallH = 9;

const wallMat = new THREE.MeshStandardMaterial({
  color: 0x334155, roughness: 0.7, metalness: 0.1, transparent: true, opacity: 0.18,
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

const goalMat       = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.25 });
const goalPostGeo   = new THREE.CylinderGeometry(0.09, 0.09, GOAL_H, 10);
const goalBarGeo    = new THREE.CylinderGeometry(0.09, 0.09, GOAL_W, 10);
const goalDepthBar  = new THREE.CylinderGeometry(0.07, 0.07, GOAL_D, 8);
const goalNetGeo    = new THREE.PlaneGeometry(GOAL_W, GOAL_H);
const goalSideNetG  = new THREE.PlaneGeometry(GOAL_D, GOAL_H);
const goalTopNetGeo = new THREE.PlaneGeometry(GOAL_D, GOAL_W);
const netMatBase    = new THREE.MeshStandardMaterial({
  color: 0xf1f5f9, transparent: true, opacity: 0.22, side: THREE.DoubleSide, roughness: 0.9,
});

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
    backPost.position.set(backX, GOAL_H / 2, zo);
    scene.add(backPost);

    const topSide = new THREE.Mesh(goalDepthBar, goalMat);
    topSide.rotation.z = Math.PI / 2;
    topSide.position.set(midX, GOAL_H, zo);
    scene.add(topSide);

    const sideNet = new THREE.Mesh(goalSideNetG, netMatBase);
    sideNet.position.set(midX, GOAL_H / 2, zo);
    scene.add(sideNet);
  });

  const bar = new THREE.Mesh(goalBarGeo, goalMat);
  bar.rotation.x = Math.PI / 2;
  bar.position.set(mouthX, GOAL_H, 0);
  scene.add(bar);

  const backBar = new THREE.Mesh(goalBarGeo, goalMat);
  backBar.rotation.x = Math.PI / 2;
  backBar.position.set(backX, GOAL_H, 0);
  scene.add(backBar);

  const net = new THREE.Mesh(goalNetGeo, netMatBase);
  net.position.set(backX, GOAL_H / 2, 0);
  net.rotation.y = Math.PI / 2;
  scene.add(net);

  const topNet = new THREE.Mesh(goalTopNetGeo, netMatBase);
  topNet.position.set(midX, GOAL_H, 0);
  topNet.rotation.x = Math.PI / 2;
  topNet.rotation.z = Math.PI / 2;
  scene.add(topNet);
}
buildGoal(-1);
buildGoal(1);

// ─── RAPIER PHYSICS ─────────────────────────────────────────────────────────
await RAPIER.init();
const world = new RAPIER.World({ x: 0, y: -28, z: 0 });

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

// ─── CEL-SHADING & OUTLINE HELPERS ──────────────────────────────────────────
const toonGradData = new Uint8Array([108, 188, 255]);
const toonGradTex = new THREE.DataTexture(toonGradData, 3, 1, THREE.RedFormat);
toonGradTex.minFilter = THREE.NearestFilter;
toonGradTex.magFilter = THREE.NearestFilter;
toonGradTex.needsUpdate = true;

const outlineMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.BackSide });
function addOutline(mesh: THREE.Mesh, scale = 1.055) {
  const outline = new THREE.Mesh(mesh.geometry, outlineMat);
  outline.scale.setScalar(scale);
  mesh.add(outline);
}

// ─── CLASSIC PATTERNED LEATHER SOCCER BALL & WIND STREAM TRAIL ──────────────
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
      drawPentagon(ox, oy, 20);
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
scene.add(trailLine);
let trailCount = 0;

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

// ─── ARTICULATED ANIME-SPORTS PLAYER RIG (ANATOMICAL PROPORTIONS) ───────────
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
const cleatMat = new THREE.MeshToonMaterial({ color: 0x1e293b, gradientMap: toonGradTex });
const cleatStripeMat = new THREE.MeshToonMaterial({ color: 0xdc2626, gradientMap: toonGradTex });

const playerRoot = new THREE.Group();
scene.add(playerRoot);

const torsoGroup = new THREE.Group();
torsoGroup.position.set(0, 0.90, 0);
playerRoot.add(torsoGroup);

// Athletic hips, tapered waist & V-shaped chest
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

const chestMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.165, 0.26, 10), jerseyMat);
chestMesh.scale.set(1.08, 1, 0.68);
chestMesh.position.set(0, 0.39, 0);
chestMesh.castShadow = true;
addOutline(chestMesh, 1.055);
torsoGroup.add(chestMesh);

const collarMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.095, 0.055, 10), jerseyDarkMat);
collarMesh.position.set(0, 0.525, 0);
torsoGroup.add(collarMesh);

const chestBand = new THREE.Mesh(new THREE.CylinderGeometry(0.188, 0.178, 0.052, 10), accentMat);
chestBand.scale.set(1.09, 1, 0.70);
chestBand.position.set(0, 0.39, 0);
torsoGroup.add(chestBand);

[-0.04, 0.04].forEach(nx => {
  const numBar = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.145, 0.014), accentMat);
  numBar.position.set(nx, 0.33, 0.125);
  torsoGroup.add(numBar);
});

// Proportional Anime Head, Neck & Layered Hair
const headGroup = new THREE.Group();
headGroup.position.set(0, 0.54, 0);
torsoGroup.add(headGroup);

const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.056, 0.10, 8), skinMat);
neckMesh.position.set(0, 0.045, 0);
headGroup.add(neckMesh);

const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.132, 14, 12), skinMat);
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

// Expressive anime eyes & brows
const eyeGeo  = new THREE.BoxGeometry(0.048, 0.028, 0.014);
const irisGeo = new THREE.BoxGeometry(0.024, 0.024, 0.016);
const browGeo = new THREE.BoxGeometry(0.054, 0.012, 0.016);
[-0.052, 0.052].forEach((ex, idx) => {
  const eye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
  eye.position.set(ex, 0.195, -0.116);
  headGroup.add(eye);

  const iris = new THREE.Mesh(irisGeo, irisMat);
  iris.position.set(ex, 0.194, -0.118);
  headGroup.add(iris);

  const brow = new THREE.Mesh(browGeo, browMat);
  brow.position.set(ex, 0.224, -0.118);
  brow.rotation.z = idx === 0 ? -0.14 : 0.14;
  headGroup.add(brow);
});

const headband = new THREE.Mesh(new THREE.CylinderGeometry(0.132, 0.132, 0.036, 14), accentMat);
headband.scale.set(0.95, 1, 0.97);
headband.position.set(0, 0.258, 0);
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

const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.138, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.56), hairMat);
hairCap.scale.set(0.98, 1.05, 1.02);
hairCap.position.set(0, 0.225, 0.008);
addOutline(hairCap, 1.045);
headGroup.add(hairCap);

const spikeGeo = new THREE.ConeGeometry(0.048, 0.175, 5);
const bangGeo  = new THREE.ConeGeometry(0.032, 0.125, 4);
const spikeConfigs = [
  [0,     0.36, -0.04, -0.45, 0,     0],
  [-0.08, 0.35, -0.02, -0.35, 0,     0.38],
  [0.08,  0.35, -0.02, -0.35, 0,    -0.38],
  [-0.04, 0.31, -0.10, -0.82, 0,     0.18],
  [0.04,  0.31, -0.10, -0.82, 0,    -0.18],
  [0,     0.37,  0.06,  0.42, 0,     0],
  [-0.08, 0.33,  0.09,  0.58, 0,     0.32],
  [0.08,  0.33,  0.09,  0.58, 0,    -0.32],
  [0,     0.27,  0.13,  0.96, 0,     0],
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

// Anatomical Arms: Shoulder -> Sleeve -> Upper Arm -> Elbow -> Forearm -> Wrist -> Hand
interface ArmRig { shoulder: THREE.Group; elbow: THREE.Group; }
function makeArm(side: -1 | 1): ArmRig {
  const shoulder = new THREE.Group();
  shoulder.position.set(side * 0.235, 0.45, 0);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.060, 10, 8), jerseyMat);
  cap.castShadow = true;
  addOutline(cap, 1.06);
  shoulder.add(cap);

  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.052, 0.135, 8), jerseyMat);
  sleeve.position.set(0, -0.065, 0);
  sleeve.castShadow = true;
  addOutline(sleeve, 1.06);
  shoulder.add(sleeve);

  const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.039, 0.13, 8), skinMat);
  upperArm.position.set(0, -0.175, 0);
  upperArm.castShadow = true;
  addOutline(upperArm, 1.06);
  shoulder.add(upperArm);

  const elbow = new THREE.Group();
  elbow.position.set(0, -0.235, 0);
  shoulder.add(elbow);

  const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.039, 8, 8), skinMat);
  addOutline(elbowJoint, 1.06);
  elbow.add(elbowJoint);

  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.039, 0.031, 0.21, 8), skinMat);
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

// Anatomical Legs: Hip -> Shorts Cuff -> Thigh -> Knee -> Calf/Sock -> Cleat
interface LegRig { hip: THREE.Group; knee: THREE.Group; }
function makeLeg(side: -1 | 1): LegRig {
  const hip = new THREE.Group();
  hip.position.set(side * 0.10, 0.87, 0);

  const shortsLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.072, 0.20, 10), shortsMat);
  shortsLeg.position.set(0, -0.09, 0);
  shortsLeg.castShadow = true;
  addOutline(shortsLeg, 1.055);
  hip.add(shortsLeg);

  const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.050, 0.19, 8), skinMat);
  thigh.position.set(0, -0.26, 0);
  thigh.castShadow = true;
  addOutline(thigh, 1.06);
  hip.add(thigh);

  const knee = new THREE.Group();
  knee.position.set(0, -0.355, 0);
  hip.add(knee);

  const kneeJoint = new THREE.Mesh(new THREE.SphereGeometry(0.050, 8, 8), skinMat);
  addOutline(kneeJoint, 1.06);
  knee.add(kneeJoint);

  const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.039, 0.34, 10), jerseyMat);
  calf.position.set(0, -0.18, 0);
  calf.castShadow = true;
  addOutline(calf, 1.06);
  knee.add(calf);

  const sockBand = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.055, 0.035, 10), accentMat);
  sockBand.position.set(0, -0.035, 0);
  knee.add(sockBand);

  const cleatHeel = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.085, 0.13), cleatMat);
  cleatHeel.position.set(0, -0.385, 0.01);
  cleatHeel.castShadow = true;
  addOutline(cleatHeel, 1.06);
  knee.add(cleatHeel);

  const cleatToe = new THREE.Mesh(new THREE.BoxGeometry(0.102, 0.064, 0.13), cleatMat);
  cleatToe.position.set(0, -0.395, -0.095);
  cleatToe.castShadow = true;
  addOutline(cleatToe, 1.06);
  knee.add(cleatToe);

  const cleatStripe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.022, 0.22), cleatStripeMat);
  cleatStripe.position.set(0, -0.42, -0.04);
  knee.add(cleatStripe);

  playerRoot.add(hip);
  return { hip, knee };
}
const leftLeg  = makeLeg(-1);
const rightLeg = makeLeg(1);

// ─── SPIRIT AWAKENING SHADER AURA (CLEAN ANIME GOLDEN SPIRIT) ──────────────
const ssjAuraUniforms = {
  uTime:  { value: 0 },
  uColor: { value: new THREE.Color(0xfbbf24) },
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
      float flame = smoothstep(0.2, 0.92, fres * 0.75 + bands * 0.45);
      float topFade = smoothstep(1.0, 0.15, vUv.y);
      vec3 col = mix(uColor, vec3(1.0, 0.98, 0.9), flame * 0.5);
      gl_FragColor = vec4(col, flame * topFade * uAlpha);
    }`,
});
const ssjAuraShell = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.95, 2.45, 20, 10, true), ssjAuraMat);
ssjAuraShell.visible = false;
scene.add(ssjAuraShell);

const zoneRingMat = new THREE.MeshBasicMaterial({
  color: 0xfbbf24, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false,
});
const zoneRing = new THREE.Mesh(new THREE.RingGeometry(4.2, 4.45, 48), zoneRingMat);
zoneRing.rotation.x = -Math.PI / 2;
zoneRing.position.y = 0.04;
zoneRing.visible = false;
scene.add(zoneRing);

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
window.addEventListener("keydown", e => {
  if (!keys[e.code]) keyJustPressed[e.code] = true;
  keys[e.code] = true;
});
window.addEventListener("keyup", e => { keys[e.code] = false; });

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
  if (isCharging && hasBall) {
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
let isCharging = false;
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
let runCycle = 0;
let rigAnimSpeed = 0;
let kickAnimTimer = 0;
let rainbowFlickTimer = 0;
let rainbowStageTimer = 0;
let pendingFlickFwdVel = 0;

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
    rainbowStageTimer = 0;
    pickupBlend = 0;
    trailMat.color.setHex(0xf8fafc);
  } else {
    playerCollider.setCollisionGroups(PLAYER_GROUPS_FREE);
    ballCollider.setCollisionGroups(BALL_GROUPS_FREE);
    ballBody.setGravityScale(1, true);
    ballBody.setLinearDamping(0.45);
    isCharging = false;
    shotCharge = 0;
    aimOffsetX = 0;
    aimOffsetY = 0;
  }
}

function resetBall(x = 0, z = 0) {
  setPossession(false);
  pickupCooldown = 0.4;
  activeBallSpin = 0;
  activeBallVertSpin = 0;
  isAwakeningShotBall = false;
  awakeningFlightTimer = 0;
  rainbowStageTimer = 0;
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

// ─── SKILL PANEL ────────────────────────────────────────────────────────────
function buildSkillPanel() {
  const equipped = equippedSkills();
  skillPanel.innerHTML = equipped.map((skill, i) => `
    <div id="skill-slot-${i}" style="width:110px;padding:8px;background:rgba(15,23,42,.74);
      border:1px solid rgba(255,255,255,.18);border-top:3px solid ${PLAYSTYLE_HEX[currentPlaystyle]};
      border-radius:8px;position:relative;overflow:hidden;">
      <div style="font-size:.6rem;letter-spacing:1px;opacity:.75;">[${SKILL_KEYS[i]}] ${skill.staminaCost} ST</div>
      <div id="skill-name-${i}" style="font-size:.75rem;font-weight:700;letter-spacing:.5px;margin-top:2px;">${skill.name}</div>
      <div id="skill-cd-${i}" style="font-size:.65rem;margin-top:3px;color:#38bdf8;font-weight:700;">READY</div>
      <div id="skill-cd-fill-${i}" style="position:absolute;left:0;bottom:0;width:100%;height:0%;
        background:${PLAYSTYLE_HEX[currentPlaystyle]};opacity:.22;transition:height .1s;pointer-events:none;"></div>
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
      color = lowStam ? "#f87171" : "#38bdf8";
      fillH = "0%";
    }
    if (prevSkillCdText[i] !== text) { cdEl.textContent = text; cdEl.style.color = color; prevSkillCdText[i] = text; }
    if (prevSkillFillH[i] !== fillH) { fillEl.style.height = fillH; prevSkillFillH[i] = fillH; }
  });
}

// ─── WIND SHOCKWAVE & AIR-STREAM PARTICLE POOL ──────────────────────────────
const VFX_GEO   = new THREE.RingGeometry(0.45, 0.62, 40);
const SPARK_GEO = new THREE.BoxGeometry(0.06, 0.06, 0.34);

interface SkillVfx { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; life: number; maxLife: number; }
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

function spawnSkillVfx(color: number) {
  const pp = playerBody.translation();
  const item = acquireVfxMesh(0xf8fafc);
  item.mesh.position.set(pp.x, 0.06, pp.z);
  item.mesh.scale.set(1, 1, 1);
  skillVfx.push({ mesh: item.mesh, mat: item.mat, life: 0, maxLife: 0.42 });

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
    const s = 1 + t * 5.2;
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
const _camOffset        = new THREE.Vector3(0, 2.7, 6.0);
const _camOffsetScratch = new THREE.Vector3();
const _camPivot         = new THREE.Vector3();
const _camQYaw          = new THREE.Quaternion();
const _camQPitch        = new THREE.Quaternion();
const _camEuler         = new THREE.Euler();
const _headScreenVec    = new THREE.Vector3();

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
    trailMat.color.setHex(0xfef08a);

    const launchX = THREE.MathUtils.clamp(pp.x + _fwdVec.x * 1.25, -hw + BALL_R + 0.1, hw - BALL_R - 0.1);
    const launchZ = THREE.MathUtils.clamp(pp.z + _fwdVec.z * 1.25, -hd + BALL_R + 0.1, hd - BALL_R - 0.1);
    ballBody.setTranslation({ x: launchX, y: Math.max(BALL_R + 0.25, pp.y - 0.3), z: launchZ }, true);
    ballBody.setLinvel({
      x: _fwdVec.x * awakenSpeed + _rightVec.x * aimNx * 6,
      y: liftY,
      z: _fwdVec.z * awakenSpeed + _rightVec.z * aimNx * 6,
    }, true);
    ballBody.setAngvel({ x: 0, y: 0, z: 32 }, true);

    spawnSkillVfx(0xfbbf24);
    crowdExcitement = Math.min(1, crowdExcitement + 0.7);
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
  if (noPlayerCollideTimer > 0) {
    noPlayerCollideTimer = Math.max(0, noPlayerCollideTimer - dt);
    if (noPlayerCollideTimer <= 0 && !hasBall) {
      ballCollider.setCollisionGroups(BALL_GROUPS_FREE);
    }
  }
  if (rainbowStageTimer > 0) {
    rainbowStageTimer -= dt;
    const pp = playerBody.translation();
    _fwdVec.set(-Math.sin(playerFacingYaw), 0, -Math.cos(playerFacingYaw)).normalize();
    const heelX = THREE.MathUtils.clamp(pp.x - _fwdVec.x * 0.36, -hw + BALL_R + 0.1, hw - BALL_R - 0.1);
    const heelZ = THREE.MathUtils.clamp(pp.z - _fwdVec.z * 0.36, -hd + BALL_R + 0.1, hd - BALL_R - 0.1);
    if (rainbowStageTimer > 0) {
      ballBody.setTranslation({ x: heelX, y: 0.36, z: heelZ }, true);
      ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    } else {
      rainbowStageTimer = 0;
      const flickHoriz = 14.2 + pendingFlickFwdVel * 0.25;
      const flickUp = 11.8;
      ballBody.setGravityScale(1, true);
      ballBody.setTranslation({ x: heelX, y: 0.42, z: heelZ }, true);
      ballBody.setLinvel({ x: _fwdVec.x * flickHoriz, y: flickUp, z: _fwdVec.z * flickHoriz }, true);
      ballBody.setAngvel({ x: -_fwdVec.z * 16, y: 0, z: _fwdVec.x * 16 }, true);
      spawnSparkBurst(heelX, 0.38, heelZ, 0xf8fafc, 10, 0.85);
    }
  }
  if (kickAnimTimer > 0) kickAnimTimer = Math.max(0, kickAnimTimer - dt);
  if (rainbowFlickTimer > 0) rainbowFlickTimer = Math.max(0, rainbowFlickTimer - dt);
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

    ssjAuraUniforms.uColor.value.set(0xfbbf24);
    ssjAuraUniforms.uAlpha.value = 0.55;
    ssjAuraShell.visible = true;
    zoneRing.visible = true;

    playerCharHairShift(true);

    spawnSkillVfx(0xfef08a);
    crowdExcitement = Math.min(1, crowdExcitement + 0.85);
    updateJumbotronScreen(score[0], score[1], `AWAKENED: ${aw.name.toUpperCase()}`);

    awakenFlash.textContent = `AWAKENING — ${aw.name.toUpperCase()}`;
    awakenFlash.style.display = "block";
    setTimeout(() => { awakenFlash.style.display = "none"; }, 1800);
  }
}

function playerCharHairShift(awakened: boolean) {
  if (awakened) {
    hairMat.color.setHex(0xfde047);
    irisMat.color.setHex(0xfbbf24);
    cleatStripeMat.color.setHex(0xfbbf24);
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
  zoneRingMat.opacity = 0.25 + Math.sin(nowSec * 5) * 0.12;
}

// ─── HUD (throttled) ─────────────────────────────────────────────────────────
const HUD_UPDATE_INTERVAL = 1 / 20;
let hudAccum = 0;
const hudDirty = { playstyle: true };
let prevScore = "", prevStamW = "", prevGaugeVis = "", prevGaugeH = "", prevGaugeColor = "";
let prevAimVis = "", prevAimAlpha = "", prevAimX = -999, prevAimY = -999;
let prevReticleX = -999, prevReticleY = -999;
let prevPsText = "", prevAwW = "", prevAwReadyVis = "", prevAwLabelTxt = "";

function updateHUD(dt: number) {
  const showAim = isLocked && hasBall && isCharging;
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
    _headScreenVec.set(pp.x, pp.y + 1.48, pp.z).project(camera);
    const rx = THREE.MathUtils.clamp((_headScreenVec.x * 0.5 + 0.5) * innerWidth, 32, innerWidth - 32);
    const ry = THREE.MathUtils.clamp((-_headScreenVec.y * 0.5 + 0.5) * innerHeight, 32, innerHeight * 0.44);
    if (Math.abs(rx - prevReticleX) > 0.5 || Math.abs(ry - prevReticleY) > 0.5) {
      prevReticleX = rx;
      prevReticleY = ry;
      aimReticle.style.left = `${rx.toFixed(1)}px`;
      aimReticle.style.top  = `${ry.toFixed(1)}px`;
    }
    if (aimOffsetX !== prevAimX || aimOffsetY !== prevAimY) {
      prevAimX = aimOffsetX;
      prevAimY = aimOffsetY;
      aimDot.style.transform = `translate(${aimOffsetX.toFixed(1)}px, ${aimOffsetY.toFixed(1)}px)`;
    }
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
    const col = `hsl(${hue}, 86%, 50%)`;
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
    const psText = `${currentPlaystyle} <span style="opacity:.6;font-weight:normal;font-size:.7rem;">[1-4]</span>`;
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
      updateJumbotronScreen(score[0], score[1], "GOAL!");
      resetBall();
      return;
    }
    if (bp.x > hw + 0.25) {
      score[0]++;
      addEnergy(45);
      crowdExcitement = 1;
      spawnSparkBurst(bp.x, bp.y + 0.5, bp.z, 0xf8fafc, 18, 1.3);
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
  if (hasBall || pickupCooldown > 0) return;
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
    isCharging = false;
    shotCharge = 0;
    return;
  }

  const pp = playerBody.translation();
  const pv = playerBody.linvel();
  const playerSpeed = Math.hypot(pv.x, pv.z);

  if (!isCharging && playerSpeed > 1.5) addEnergy(6 * dt);

  _fwdVec.set(-Math.sin(playerFacingYaw), 0, -Math.cos(playerFacingYaw));
  const rawPocketX = pp.x + _fwdVec.x * DRIBBLE_POCKET_DIST;
  const rawPocketZ = pp.z + _fwdVec.z * DRIBBLE_POCKET_DIST;
  const pocketX = Math.abs(rawPocketZ) < GOAL_W / 2 - BALL_R
    ? THREE.MathUtils.clamp(rawPocketX, -hw - GOAL_D + BALL_R + 0.2, hw + GOAL_D - BALL_R - 0.2)
    : THREE.MathUtils.clamp(rawPocketX, -hw + BALL_R + 0.3, hw - BALL_R - 0.3);
  const pocketZ = THREE.MathUtils.clamp(rawPocketZ, -hd + BALL_R + 0.3, hd - BALL_R - 0.3);

  if (playerSpeed > 0.4) {
    dribblePhase += dt * (6 + playerSpeed * 0.7);
  }
  const bounce = playerSpeed > 0.4
    ? Math.abs(Math.sin(dribblePhase)) * (isCharging ? 0.03 : 0.11)
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
    if (!isCharging) {
      aimOffsetX = 0;
      aimOffsetY = 0;
    }
    isCharging = true;
    shotCharge = Math.min(100, shotCharge + 70 * dt);
  } else if (isCharging && !mouseLeft) {
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
  if (hasBall || isAwakeningShotBall || (Math.abs(activeBallSpin) < 0.01 && Math.abs(activeBallVertSpin) < 0.01)) return;
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

// ─── RAINBOW FLICK (BEHIND HEELS 0.08s -> OVER HEAD -> AHEAD) ──────────────
function performRainbowFlick() {
  const pp = playerBody.translation();
  const pv = playerBody.linvel();
  _fwdVec.set(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();

  pendingFlickFwdVel = Math.max(0, pv.x * _fwdVec.x + pv.z * _fwdVec.z);

  setPossession(false);
  pickupCooldown = 0.42;
  noPlayerCollideTimer = 0.30;
  ballCollider.setCollisionGroups(BALL_GROUPS_POSS);
  ballBody.setGravityScale(0, true);

  rainbowStageTimer = 0.08;
  rainbowFlickTimer = 0.48;
  isGrounded = false;
  activeBallSpin = 0;
  activeBallVertSpin = 0;

  const heelX = THREE.MathUtils.clamp(pp.x - _fwdVec.x * 0.36, -hw + BALL_R + 0.1, hw - BALL_R - 0.1);
  const heelZ = THREE.MathUtils.clamp(pp.z - _fwdVec.z * 0.36, -hd + BALL_R + 0.1, hd - BALL_R - 0.1);
  ballBody.setTranslation({ x: heelX, y: 0.36, z: heelZ }, true);
  ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);

  // Small snappy hop (~35% of normal jump height) so player stays low & chases the lob
  playerBody.applyImpulse({ x: _fwdVec.x * 1.9, y: 2.55, z: _fwdVec.z * 1.9 }, true);
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
    const targetYaw = hasBall || isCharging ? yaw : moveYaw;
    const turnRate = hasBall ? 28 : 14;
    playerFacingYaw += shortestAngleDiff(playerFacingYaw, targetYaw) * (1 - Math.exp(-turnRate * dt));
  } else {
    const cv = playerBody.linvel();
    playerBody.setLinvel({ x: cv.x * 0.7, y: cv.y, z: cv.z * 0.7 }, true);
    const turnRate = hasBall ? 28 : 10;
    playerFacingYaw += shortestAngleDiff(playerFacingYaw, yaw) * (1 - Math.exp(-turnRate * dt));
  }

  if (keys["Space"] && isGrounded) {
    if (hasBall) {
      performRainbowFlick();
    } else {
      isGrounded = false;
      playerBody.applyImpulse({ x: 0, y: 4.5, z: 0 }, true);
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
  torsoGroup.rotation.z = THREE.MathUtils.lerp(torsoGroup.rotation.z, tRotZ, s);
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

  const flutter = Math.sin(nowSec * 12) * (0.08 + normSpeed * 0.25);
  headbandTails[0].rotation.x = 0.55 + normSpeed * 0.55 + flutter;
  headbandTails[1].rotation.x = 0.55 + normSpeed * 0.55 - flutter;

  if (rainbowFlickTimer > 0) {
    const p = 1 - rainbowFlickTimer / 0.48;
    const whip = Math.sin(Math.min(1, p / 0.65) * Math.PI);
    blendJoints(
      dt,
      -0.30 * whip, 0, 0, 0.91,
      0.32 * whip, -0.52 * whip, -0.68 * whip, -1.75 * whip,
      0.35 * whip, -0.55 * whip, 0.5,
      0.35 * whip,  0.55 * whip, 0.5
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

  if (isCharging && hasBall) {
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
    runCycle += dt * (5.8 + rigAnimSpeed * 0.85);
  }
  const swing = Math.sin(runCycle) * normSpeed * 0.92;
  const armSpread = hasBall ? 0.20 : 0.09 + normSpeed * 0.08;
  const idleBreath = Math.sin(nowSec * 3.0) * 0.02 * (1 - normSpeed);

  blendJoints(
    dt,
    -normSpeed * (hasBall ? 0.24 : 0.18) + idleBreath,
    swing * 0.11,
    0,
    0.90 + Math.abs(Math.sin(runCycle)) * 0.04 * normSpeed,
    swing,
    -Math.max(0, -swing) * 0.85 - normSpeed * 0.10,
    -swing,
    -Math.max(0, swing) * 0.85 - normSpeed * 0.10,
    -swing * 0.85,
    -armSpread,
    0.35 + normSpeed * 0.65 + Math.max(0, -swing) * 0.24,
    swing * 0.85,
    armSpread,
    0.35 + normSpeed * 0.65 + Math.max(0, swing) * 0.24
  );
}

// ─── CAMERA ─────────────────────────────────────────────────────────────────
function updateCamera() {
  const pp = playerBody.translation();
  _camPivot.set(pp.x, pp.y + 0.85, pp.z);
  _camEuler.set(0, yaw, 0);
  _camQYaw.setFromEuler(_camEuler);
  _camEuler.set(pitch2, 0, 0);
  _camQPitch.setFromEuler(_camEuler);
  _camOffsetScratch.copy(_camOffset).applyQuaternion(_camQYaw.multiply(_camQPitch));
  camera.position.copy(_camPivot).add(_camOffsetScratch);
  camera.lookAt(_camPivot);
}

// ─── BALL SPIN & WIND AIR-STREAM TRAIL ──────────────────────────────────────
function updateBallVisuals(dt: number) {
  const bp = ballBody.translation();
  const bv = ballBody.linvel();
  const speed = hasBall ? Math.hypot(playerBody.linvel().x, playerBody.linvel().z) : Math.hypot(bv.x, bv.y, bv.z);

  ballVisual.position.set(bp.x, bp.y, bp.z);
  if (hasBall) {
    ballCore.rotation.x -= speed * dt * 2.2;
  } else {
    const bav = ballBody.angvel();
    ballCore.rotation.x += bav.x * FIXED_DT;
    ballCore.rotation.y += bav.y * FIXED_DT;
    ballCore.rotation.z += bav.z * FIXED_DT;
  }

  if (isAwakeningShotBall) {
    trailMat.color.setHex(0xfef08a);
    trailMat.opacity = 0.82;
    spawnTrailParticle(bp.x, bp.y, bp.z, 0xfef08a, 1.15);
    spawnTrailParticle(bp.x, bp.y, bp.z, 0xf8fafc, 0.9);
  } else {
    trailMat.color.setHex(0xf8fafc);
    trailMat.opacity = !hasBall && speed > 8 ? Math.min(0.6, speed / 42) : 0.0;
    if (!hasBall && speed > 19) {
      spawnTrailParticle(bp.x, bp.y, bp.z, 0xf8fafc, 0.65);
    }
  }

  const attr = trailGeo.attributes["position"] as THREE.BufferAttribute;
  const arr = attr.array as Float32Array;
  if (trailCount > 0) {
    const lastIdx = (trailCount - 1) * 3;
    if (arr[lastIdx] === bp.x && arr[lastIdx + 1] === bp.y && arr[lastIdx + 2] === bp.z) return;
  }
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

// ─── MAIN LOOP ──────────────────────────────────────────────────────────────
buildSkillPanel();
cacheSkillPanelEls();
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const nowSec = now * 0.001;
  const dt  = Math.min((now - lastTime) / 1000, 0.05);
  lastTime  = now;

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
  updateCrowd(dt, nowSec);
  updateBallVisuals(dt);
  updateCamera();
  updateHUD(dt);

  renderer.render(scene, camera);
}

animate();
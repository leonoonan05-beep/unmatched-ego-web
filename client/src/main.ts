import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import {
  PLAYSTYLES,
  skillsForPlaystyle,
  awakeningForPlaystyle,
  type Playstyle,
  type SkillConfig,
} from "../../shared/abilities";

// ─── HUD ────────────────────────────────────────────────────────────────────
const hud = document.createElement("div");
hud.style.cssText = `
  position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;
  font-family:'Segoe UI',sans-serif;color:#fff;text-shadow:0 0 6px #0ff;
`;
document.body.style.cssText = "margin:0;overflow:hidden;background:#000;";
hud.innerHTML = `
<div id="score" style="position:absolute;top:18px;left:50%;transform:translateX(-50%);
  font-size:2rem;font-weight:bold;letter-spacing:4px;text-shadow:0 0 12px #0ff,0 0 24px #0ff;">0 — 0</div>
<div id="playstyle-tag" style="position:absolute;top:18px;left:24px;font-size:1rem;font-weight:bold;
  letter-spacing:3px;padding:6px 14px;border:1px solid #0ff;border-radius:6px;background:rgba(0,0,0,.55);">
  EGOIST <span style="opacity:.6;font-weight:normal;font-size:.7rem;">[1-4]</span>
</div>
<div style="position:absolute;bottom:40px;left:24px;width:170px;">
  <div style="font-size:.7rem;letter-spacing:2px;margin-bottom:3px;">STAMINA</div>
  <div style="background:rgba(0,0,0,.5);border:1px solid #0ff;height:10px;border-radius:4px;">
    <div id="stam-bar" style="height:100%;width:100%;background:linear-gradient(90deg,#0ff,#0af);border-radius:4px;transition:width .1s;"></div>
  </div>
  <div style="font-size:.7rem;letter-spacing:2px;margin-top:12px;margin-bottom:3px;">ENERGY / AWAKENING <span style="color:#ff0;">[R]</span></div>
  <div style="background:rgba(0,0,0,.5);border:1px solid #fa0;height:10px;border-radius:4px;position:relative;">
    <div id="aw-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#ff0,#f50,#f0f);border-radius:4px;transition:width .12s;"></div>
    <div id="aw-ready" style="display:none;position:absolute;top:-2px;left:0;width:100%;text-align:center;font-size:.55rem;
      letter-spacing:2px;color:#fff;text-shadow:0 0 8px #ff0,0 0 16px #f50;">READY</div>
  </div>
  <div id="aw-label" style="font-size:.65rem;letter-spacing:2px;margin-top:3px;color:#fc6;opacity:.9;"></div>
</div>

<!-- Right-side HD Vertical Power Gauge (Green -> Yellow -> Red) -->
<div id="power-gauge-wrap" style="display:none;position:absolute;right:28px;top:50%;transform:translateY(-50%);
  flex-direction:column;align-items:center;gap:6px;">
  <div id="power-gauge-pct" style="font-size:.8rem;font-weight:bold;letter-spacing:1px;color:#00ff66;text-shadow:0 0 8px #00ff66;">0%</div>
  <div style="width:16px;height:220px;background:rgba(5,9,20,.78);border:1px solid rgba(255,255,255,.32);
    border-radius:8px;position:relative;overflow:hidden;box-shadow:0 0 18px rgba(0,0,0,.65),inset 0 0 8px rgba(0,0,0,.7);">
    <div id="power-gauge-fill" style="position:absolute;left:0;bottom:0;width:100%;height:0%;
      background:linear-gradient(to top,#00ff66 0%,#ffee00 50%,#ff2233 100%);
      background-size:100% 220px;background-position:bottom;box-shadow:0 0 12px #00ff66;"></div>
    <div style="position:absolute;left:0;right:0;bottom:25%;height:1px;background:rgba(255,255,255,.2);"></div>
    <div style="position:absolute;left:0;right:0;bottom:50%;height:1px;background:rgba(255,255,255,.35);"></div>
    <div style="position:absolute;left:0;right:0;bottom:75%;height:1px;background:rgba(255,255,255,.2);"></div>
  </div>
  <div style="font-size:.58rem;letter-spacing:2px;opacity:.85;">SHOT</div>
</div>

<!-- Minimalist Center Semi-Transparent Circular Aiming Reticle -->
<div id="aim-reticle" style="display:none;position:absolute;top:50%;left:50%;width:64px;height:64px;
  transform:translate(-50%,-50%);border-radius:50%;border:1px solid rgba(255,255,255,.42);
  background:radial-gradient(circle,rgba(255,255,255,.04) 0%,transparent 75%);
  box-shadow:0 0 10px rgba(0,255,255,.18);">
  <div style="position:absolute;top:50%;left:50%;width:3px;height:3px;margin:-1.5px 0 0 -1.5px;
    border-radius:50%;background:rgba(255,255,255,.85);box-shadow:0 0 4px #fff;"></div>
  <div id="aim-dot" style="position:absolute;top:50%;left:50%;width:8px;height:8px;margin:-4px 0 0 -4px;
    border-radius:50%;background:rgba(0,255,255,.9);border:1px solid #fff;box-shadow:0 0 8px #0ff;opacity:0;"></div>
</div>

<div id="skill-panel" style="position:absolute;bottom:40px;right:24px;display:flex;gap:8px;"></div>
<div id="awaken-flash" style="position:absolute;top:36%;left:50%;transform:translate(-50%,-50%);display:none;
  font-size:1.7rem;font-weight:bold;letter-spacing:6px;color:#fff;text-shadow:0 0 16px #ff0,0 0 34px #f50;"></div>
<div id="lock-prompt" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  font-size:1.1rem;letter-spacing:2px;background:rgba(0,0,0,.6);padding:12px 24px;border:1px solid #0ff;border-radius:8px;">
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
  EGOIST: "#ff3355", PLAYMAKER: "#ffcc00", LOCKDOWN: "#00ff88", SPEEDSTER: "#00ccff",
};
const PLAYSTYLE_COLOR_INT: Record<Playstyle, number> = {
  EGOIST: 0xff3355, PLAYMAKER: 0xffcc00, LOCKDOWN: 0x00ff88, SPEEDSTER: 0x00ccff,
};
const SKILL_KEYS = ["Z", "X", "C"];

// ─── SCENE / RENDERER ───────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070a1b);
scene.fog = new THREE.FogExp2(0x0b1028, 0.0052);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 420);

window.addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

// ─── ANIME TWILIGHT SKY DOME ────────────────────────────────────────────────
const skyDome = new THREE.Mesh(
  new THREE.SphereGeometry(240, 24, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x030512) },
      midColor: { value: new THREE.Color(0x10173d) },
      horColor: { value: new THREE.Color(0x2f1848) },
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
        vec3 col = mix(horColor, midColor, smoothstep(0.0, 0.28, h));
        col = mix(col, topColor, smoothstep(0.25, 0.85, h));
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
);
scene.add(skyDome);

// ─── LIGHTING ───────────────────────────────────────────────────────────────
const hemiLight = new THREE.HemisphereLight(0x7496ff, 0x0c2414, 0.72);
scene.add(hemiLight);

const sun = new THREE.DirectionalLight(0xf4f8ff, 1.45);
sun.position.set(22, 48, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 200;
sun.shadow.camera.left = -65;
sun.shadow.camera.right = 65;
sun.shadow.camera.top = 65;
sun.shadow.camera.bottom = -65;
scene.add(sun);

const rimLight = new THREE.DirectionalLight(0x38d9ff, 0.95);
rimLight.position.set(-34, 22, -28);
scene.add(rimLight);

const warmRim = new THREE.DirectionalLight(0xff3399, 0.5);
warmRim.position.set(32, 16, -28);
scene.add(warmRim);

// ─── RICH STADIUM PITCH ─────────────────────────────────────────────────────
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
      grad.addColorStop(0, "#0b3614");
      grad.addColorStop(0.5, "#0f421a");
      grad.addColorStop(1, "#0b3614");
    } else {
      grad.addColorStop(0, "#145121");
      grad.addColorStop(0.5, "#195e28");
      grad.addColorStop(1, "#145121");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(i * sw, 0, sw + 1, c.height);
  }
  // Subtle cross-cut turf pattern + organic grass blades
  ctx.fillStyle = "rgba(255,255,255,0.025)";
  for (let y = 0; y < c.height; y += 32) {
    if ((y / 32) % 2 === 0) ctx.fillRect(0, y, c.width, 16);
  }
  for (let i = 0; i < 6500; i++) {
    ctx.fillStyle = i % 3 === 0 ? "rgba(180,255,190,0.045)" : "rgba(5,20,8,0.08)";
    ctx.fillRect((i * 97) % c.width, (i * 193) % c.height, 2, 3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const pitchMesh = new THREE.Mesh(
  new THREE.BoxGeometry(PITCH_W, PITCH_H, PITCH_D),
  new THREE.MeshStandardMaterial({ map: makeTurfTexture(), roughness: 0.82, metalness: 0.04 })
);
pitchMesh.receiveShadow = true;
pitchMesh.position.y = -PITCH_H / 2;
scene.add(pitchMesh);

const apronMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(PITCH_W + 58, PITCH_D + 58),
  new THREE.MeshStandardMaterial({ color: 0x090d1b, roughness: 0.88, metalness: 0.14 })
);
apronMesh.rotation.x = -Math.PI / 2;
apronMesh.position.y = -0.04;
apronMesh.receiveShadow = true;
scene.add(apronMesh);

function makeLine(points: THREE.Vector3[], color = 0x77ffff) {
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color, toneMapped: false });
  mat.color.multiplyScalar(2.2);
  const line = new THREE.Line(geo, mat);
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

// ─── HIGH-DETAIL 3D STADIUM, TUNNEL, JUMBOTRONS & ANIMATED CROWD ────────────
let jumbotronTex!: THREE.CanvasTexture;
let jumbotronCtx!: CanvasRenderingContext2D;
let jumbotronCanvas!: HTMLCanvasElement;

function updateJumbotronScreen(home: number, away: number, status = "BLUE ARENA") {
  if (!jumbotronCtx) return;
  const w = jumbotronCanvas.width, h = jumbotronCanvas.height;
  jumbotronCtx.fillStyle = "#060b1d";
  jumbotronCtx.fillRect(0, 0, w, h);

  const grad = jumbotronCtx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "rgba(0,220,255,0.22)");
  grad.addColorStop(0.5, "rgba(18,28,64,0.1)");
  grad.addColorStop(1, "rgba(255,30,140,0.22)");
  jumbotronCtx.fillStyle = grad;
  jumbotronCtx.fillRect(0, 0, w, h);

  jumbotronCtx.strokeStyle = "#00eeff";
  jumbotronCtx.lineWidth = 6;
  jumbotronCtx.strokeRect(8, 8, w - 16, h - 16);

  jumbotronCtx.fillStyle = "#88eeff";
  jumbotronCtx.font = "bold 24px Segoe UI, sans-serif";
  jumbotronCtx.textAlign = "center";
  jumbotronCtx.fillText(status, w / 2, 52);

  jumbotronCtx.fillStyle = "#ffffff";
  jumbotronCtx.font = "bold 96px Segoe UI, sans-serif";
  jumbotronCtx.fillText(`${home}  —  ${away}`, w / 2, 165);

  jumbotronCtx.fillStyle = "#ff4499";
  jumbotronCtx.font = "bold 20px Segoe UI, sans-serif";
  jumbotronCtx.fillText("STRIKER LEAGUE • LIVE", w / 2, 222);

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
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x13192e, roughness: 0.78, metalness: 0.22 });
  const riserMat    = new THREE.MeshStandardMaterial({ color: 0x1c2544, roughness: 0.65, metalness: 0.3 });
  const roofMat     = new THREE.MeshStandardMaterial({ color: 0x0e1428, roughness: 0.55, metalness: 0.5 });
  const neonCyan    = new THREE.MeshBasicMaterial({ color: 0x00eeff, toneMapped: false });
  const neonPink    = new THREE.MeshBasicMaterial({ color: 0xff2288, toneMapped: false });

  // Multi-tiered sideline stands + roof canopy + tunnel entrance on -Z center
  [-1, 1].forEach((side, sIdx) => {
    const zBase = side * (hd + 4.8);
    if (side === -1) {
      // Split lower tier around player tunnel entrance
      const segW = (PITCH_W + 6 - 10) / 2;
      [-1, 1].forEach(segSide => {
        const lower = new THREE.Mesh(new THREE.BoxGeometry(segW, 2.4, 4.2), concreteMat);
        lower.position.set(segSide * (5 + segW / 2), 1.2, zBase);
        scene.add(lower);
      });
      // Tunnel archway structure
      const tunnelVoid = new THREE.Mesh(
        new THREE.BoxGeometry(8.4, 3.6, 8),
        new THREE.MeshBasicMaterial({ color: 0x020308 })
      );
      tunnelVoid.position.set(0, 1.8, zBase - 1.8);
      scene.add(tunnelVoid);

      const tunnelArch = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.8, 4.6), riserMat);
      tunnelArch.position.set(0, 3.9, zBase);
      scene.add(tunnelArch);

      const tunnelTrim = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.22, 0.25), neonCyan);
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

    // Overhanging stadium roof deck & glowing fascia
    const roof = new THREE.Mesh(new THREE.BoxGeometry(PITCH_W + 18, 0.9, 13.5), roofMat);
    roof.position.set(0, 12.6, zBase + side * 6.4);
    scene.add(roof);

    const led = new THREE.Mesh(new THREE.BoxGeometry(PITCH_W + 4, 0.35, 0.22), sIdx === 0 ? neonCyan : neonPink);
    led.position.set(0, 2.55, side * (hd + 2.65));
    scene.add(led);

    const upperLed = new THREE.Mesh(new THREE.BoxGeometry(PITCH_W + 12, 0.28, 0.22), sIdx === 0 ? neonPink : neonCyan);
    upperLed.position.set(0, 12.1, zBase - side * 0.2);
    scene.add(upperLed);
  });

  // Behind-goal multi-tiered stands + Jumbotron screens
  jumbotronCanvas = document.createElement("canvas");
  jumbotronCanvas.width = 512;
  jumbotronCanvas.height = 256;
  jumbotronCtx = jumbotronCanvas.getContext("2d")!;
  jumbotronTex = new THREE.CanvasTexture(jumbotronCanvas);
  jumbotronTex.colorSpace = THREE.SRGBColorSpace;
  updateJumbotronScreen(0, 0);

  const screenMat = new THREE.MeshBasicMaterial({ map: jumbotronTex, toneMapped: false });

  [-1, 1].forEach((side, sIdx) => {
    const xBase = side * (hw + 7.5);
    for (let t = 0; t < 4; t++) {
      const tier = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.3, PITCH_D + 6 + t * 2), t % 2 ? riserMat : concreteMat);
      tier.position.set(xBase + side * t * 3.8, 1.2 + t * 2.25, 0);
      scene.add(tier);
    }
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.35, PITCH_D + 2), sIdx === 0 ? neonPink : neonCyan);
    led.position.set(side * (hw + 5.45), 2.55, 0);
    scene.add(led);

    // End-stand Jumbotron tower
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 8.8, 17.2), roofMat);
    frame.position.set(side * (hw + 14.5), 14.2, 0);
    scene.add(frame);

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(16.0, 8.0), screenMat);
    screen.position.set(side * (hw + 13.85), 14.2, 0);
    screen.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    scene.add(screen);
  });

  // Low-poly animated 3D spectators across stands
  const crowdGeo = new THREE.CylinderGeometry(0.22, 0.34, 1.08, 6);
  const crowdMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  crowdMesh = new THREE.InstancedMesh(crowdGeo, crowdMat, CROWD_COUNT);
  const dummy = new THREE.Object3D();
  const cCol = new THREE.Color();
  const palette = [0x00ffff, 0xff2299, 0xffee44, 0x88aaff, 0xffffff, 0x44ff99];

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
    cCol.setHex(palette[(i * 7) % palette.length]).multiplyScalar(0.88);
    crowdMesh.setColorAt(i, cCol);
  }
  crowdMesh.instanceMatrix.needsUpdate = true;
  if (crowdMesh.instanceColor) crowdMesh.instanceColor.needsUpdate = true;
  scene.add(crowdMesh);

  // Corner floodlight towers + SpotLights + volumetric light shafts
  const mastGeo = new THREE.CylinderGeometry(0.45, 0.72, 34, 8);
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.72, roughness: 0.35 });
  const headGeo = new THREE.BoxGeometry(4.2, 1.5, 0.9);
  const coneGeo = new THREE.ConeGeometry(18, 50, 16, 1, true);
  const corners = [
    [-55, 36, 0x00ffff],
    [ 55, 36, 0xff2299],
    [-55,-36, 0xff2299],
    [ 55,-36, 0x00ffff],
  ] as const;

  corners.forEach(([cx, cz, hex]) => {
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(cx, 17, cz);
    scene.add(mast);

    const headMat = new THREE.MeshBasicMaterial({ color: hex, toneMapped: false });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(cx, 34, cz);
    head.lookAt(0, 0, 0);
    scene.add(head);

    const spot = new THREE.SpotLight(hex, 3.2, 160, Math.PI / 4.2, 0.55, 1.2);
    spot.position.set(cx * 0.94, 33, cz * 0.94);
    spot.target.position.set(0, 0, 0);
    scene.add(spot);
    scene.add(spot.target);

    const beamMat = new THREE.MeshBasicMaterial({
      color: hex,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
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

// ─── GOALS & STADIUM WALLS ──────────────────────────────────────────────────
const GOAL_W = 11.6, GOAL_H = 3.8, GOAL_D = 3.2;
const wallH = 9;

const wallMat = new THREE.MeshStandardMaterial({
  color: 0x1c2b4a, roughness: 0.45, metalness: 0.35, transparent: true, opacity: 0.38,
});
function makeWallMesh(w: number, h: number, d: number, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
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

const goalMat       = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x224466, emissiveIntensity: 0.4, roughness: 0.25, metalness: 0.7 });
const goalPostGeo   = new THREE.CylinderGeometry(0.09, 0.09, GOAL_H, 8);
const goalBarGeo    = new THREE.CylinderGeometry(0.09, 0.09, GOAL_W, 8);
const goalDepthBar  = new THREE.CylinderGeometry(0.07, 0.07, GOAL_D, 8);
const goalNetGeo    = new THREE.PlaneGeometry(GOAL_W, GOAL_H);
const goalSideNetG  = new THREE.PlaneGeometry(GOAL_D, GOAL_H);
const goalTopNetGeo = new THREE.PlaneGeometry(GOAL_D, GOAL_W);
const netMatBase    = new THREE.MeshStandardMaterial({
  color: 0x88eeff, transparent: true, opacity: 0.18, side: THREE.DoubleSide,
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
const GRP_GK     = 0x0008;
const makeGroups = (membership: number, filter: number) =>
  ((membership & 0xffff) << 16) | (filter & 0xffff);

const WORLD_GROUPS       = makeGroups(GRP_WORLD, GRP_WORLD | GRP_PLAYER | GRP_BALL | GRP_GK);
const PLAYER_GROUPS_FREE = makeGroups(GRP_PLAYER, GRP_WORLD | GRP_BALL | GRP_GK);
const PLAYER_GROUPS_POSS = makeGroups(GRP_PLAYER, GRP_WORLD | GRP_GK);
const BALL_GROUPS_FREE   = makeGroups(GRP_BALL, GRP_WORLD | GRP_PLAYER | GRP_GK);
const BALL_GROUPS_POSS   = makeGroups(GRP_BALL, GRP_WORLD);
const GK_GROUPS          = makeGroups(GRP_GK, GRP_WORLD | GRP_BALL | GRP_PLAYER);

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
const toonGradData = new Uint8Array([90, 175, 255]);
const toonGradTex = new THREE.DataTexture(toonGradData, 3, 1, THREE.RedFormat);
toonGradTex.minFilter = THREE.NearestFilter;
toonGradTex.magFilter = THREE.NearestFilter;
toonGradTex.needsUpdate = true;

const outlineMat = new THREE.MeshBasicMaterial({ color: 0x060812, side: THREE.BackSide });
function addOutline(mesh: THREE.Mesh, scale = 1.075) {
  const outline = new THREE.Mesh(mesh.geometry, outlineMat);
  outline.scale.setScalar(scale);
  mesh.add(outline);
}

// ─── SOCCER BALL (DYNAMIC SPEED-COLOR GLOW + SHARP TRAIL) ───────────────────
const BALL_R = 0.24;
const ballVisual = new THREE.Group();
scene.add(ballVisual);

const ballCoreMat = new THREE.MeshToonMaterial({
  color: 0xffffff, emissive: 0x00aaff, emissiveIntensity: 0.85, gradientMap: toonGradTex,
});
const ballCore = new THREE.Mesh(new THREE.IcosahedronGeometry(BALL_R, 1), ballCoreMat);
ballCore.castShadow = true;
addOutline(ballCore, 1.08);
ballVisual.add(ballCore);

const ballSeamMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, toneMapped: false });
const ballSeam = new THREE.Mesh(new THREE.IcosahedronGeometry(BALL_R * 1.018, 1), ballSeamMat);
ballCore.add(ballSeam);

const ballHaloMat = new THREE.MeshBasicMaterial({
  color: 0x00d8ff, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false,
});
const ballHalo = new THREE.Mesh(new THREE.SphereGeometry(BALL_R * 1.65, 12, 12), ballHaloMat);
ballVisual.add(ballHalo);

const TRAIL_LEN = 40;
const trailPositions = new Float32Array(TRAIL_LEN * 3);
const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
const trailMat = new THREE.LineBasicMaterial({
  color: 0x33eeff, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, toneMapped: false,
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

// ─── ANIME CHARACTER RIG BUILDER (PLAYER & GOALKEEPERS) ──────────────────────
interface ArmRig { shoulder: THREE.Group; elbow: THREE.Group; }
interface LegRig { hip: THREE.Group; knee: THREE.Group; }
interface CharacterRig {
  root: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftArm: ArmRig;
  rightArm: ArmRig;
  leftLeg: LegRig;
  rightLeg: LegRig;
  headbandTails: THREE.Mesh[];
  jerseyMat: THREE.MeshToonMaterial;
  hairMat: THREE.MeshToonMaterial;
  accentMat: THREE.MeshBasicMaterial;
  visorMat: THREE.MeshBasicMaterial;
  irisMat: THREE.MeshBasicMaterial;
  cleatGlowMat: THREE.MeshBasicMaterial;
}

function buildAnimeCharacter(opts: {
  jerseyHex: number;
  emissiveHex: number;
  accentHex: number;
  hairHex: number;
  visorHex: number;
  numberStyle: "11" | "1";
}): CharacterRig {
  const jerseyMat     = new THREE.MeshToonMaterial({ color: opts.jerseyHex, emissive: opts.emissiveHex, gradientMap: toonGradTex });
  const jerseyDarkMat = new THREE.MeshToonMaterial({ color: 0x161b2e, gradientMap: toonGradTex });
  const shortsMat     = new THREE.MeshToonMaterial({ color: 0x111827, gradientMap: toonGradTex });
  const skinMat       = new THREE.MeshToonMaterial({ color: 0xf7cbb0, gradientMap: toonGradTex });
  const hairMat       = new THREE.MeshToonMaterial({ color: opts.hairHex, gradientMap: toonGradTex });
  const accentMat     = new THREE.MeshBasicMaterial({ color: opts.accentHex, toneMapped: false });
  const visorMat      = new THREE.MeshBasicMaterial({ color: opts.visorHex, transparent: true, opacity: 0.68, toneMapped: false });
  const eyeMat        = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const irisMat       = new THREE.MeshBasicMaterial({ color: opts.accentHex, toneMapped: false });
  const cleatMat      = new THREE.MeshToonMaterial({ color: 0x18181f, gradientMap: toonGradTex });
  const cleatGlowMat  = new THREE.MeshBasicMaterial({ color: opts.accentHex, toneMapped: false });

  const root = new THREE.Group();
  scene.add(root);

  const torso = new THREE.Group();
  torso.position.set(0, 0.90, 0);
  root.add(torso);

  const pelvisMesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.22), shortsMat);
  pelvisMesh.position.set(0, 0.02, 0);
  pelvisMesh.castShadow = true;
  addOutline(pelvisMesh, 1.07);
  torso.add(pelvisMesh);

  const waistMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.20, 0.20), jerseyMat);
  waistMesh.position.set(0, 0.18, 0);
  waistMesh.castShadow = true;
  addOutline(waistMesh, 1.07);
  torso.add(waistMesh);

  const chestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.41, 0.30, 0.23), jerseyMat);
  chestMesh.position.set(0, 0.38, 0);
  chestMesh.castShadow = true;
  addOutline(chestMesh, 1.07);
  torso.add(chestMesh);

  const collarMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.06, 8), jerseyDarkMat);
  collarMesh.position.set(0, 0.54, 0);
  torso.add(collarMesh);

  const chestSash = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.055, 0.24), accentMat);
  chestSash.position.set(0, 0.41, 0);
  torso.add(chestSash);

  const sideTrimGeo = new THREE.BoxGeometry(0.036, 0.43, 0.225);
  [-0.185, 0.185].forEach(sx => {
    const trim = new THREE.Mesh(sideTrimGeo, jerseyDarkMat);
    trim.position.set(sx, 0.31, 0);
    torso.add(trim);
  });

  if (opts.numberStyle === "11") {
    [-0.042, 0.042].forEach(nx => {
      const numBar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.015), accentMat);
      numBar.position.set(nx, 0.35, 0.118);
      torso.add(numBar);
    });
  } else {
    const numBar = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.17, 0.015), accentMat);
    numBar.position.set(0, 0.35, 0.118);
    torso.add(numBar);
  }

  const head = new THREE.Group();
  head.position.set(0, 0.56, 0);
  torso.add(head);

  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.068, 0.09, 8), skinMat);
  neckMesh.position.set(0, 0.04, 0);
  head.add(neckMesh);

  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), skinMat);
  headMesh.position.set(0, 0.20, 0);
  headMesh.castShadow = true;
  addOutline(headMesh, 1.075);
  head.add(headMesh);

  const chinMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.19), skinMat);
  chinMesh.position.set(0, 0.085, -0.02);
  addOutline(chinMesh, 1.07);
  head.add(chinMesh);

  const eyeGeo = new THREE.BoxGeometry(0.056, 0.028, 0.018);
  const irisGeo = new THREE.BoxGeometry(0.026, 0.022, 0.02);
  [-0.062, 0.062].forEach((ex, idx) => {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(ex, 0.195, -0.132);
    eye.rotation.z = idx === 0 ? -0.14 : 0.14;
    head.add(eye);

    const iris = new THREE.Mesh(irisGeo, irisMat);
    iris.position.set(ex, 0.195, -0.134);
    head.add(iris);
  });

  const visorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.275, 0.06, 0.035), jerseyDarkMat);
  visorFrame.position.set(0, 0.205, -0.128);
  head.add(visorFrame);

  const visorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.255, 0.042, 0.04), visorMat);
  visorGlass.position.set(0, 0.205, -0.133);
  head.add(visorGlass);

  const headband = new THREE.Mesh(new THREE.BoxGeometry(0.282, 0.042, 0.282), accentMat);
  headband.position.set(0, 0.268, 0);
  head.add(headband);

  const tailGeo = new THREE.BoxGeometry(0.032, 0.19, 0.018);
  const headbandTails: THREE.Mesh[] = [];
  [-0.038, 0.038].forEach((tx, idx) => {
    const tail = new THREE.Mesh(tailGeo, accentMat);
    tail.position.set(tx, 0.21, 0.185);
    tail.rotation.x = 0.58;
    tail.rotation.z = idx === 0 ? 0.22 : -0.22;
    head.add(tail);
    headbandTails.push(tail);
  });

  const hairCap = new THREE.Mesh(new THREE.BoxGeometry(0.285, 0.08, 0.285), hairMat);
  hairCap.position.set(0, 0.32, 0.01);
  addOutline(hairCap, 1.06);
  head.add(hairCap);

  const spikeGeo = new THREE.ConeGeometry(0.056, 0.20, 5);
  const bangGeo  = new THREE.ConeGeometry(0.036, 0.13, 4);
  const spikeConfigs = [
    [0,     0.38, -0.05, -0.45, 0,     0],
    [-0.09, 0.37, -0.02, -0.35, 0,     0.36],
    [0.09,  0.37, -0.02, -0.35, 0,    -0.36],
    [-0.05, 0.32, -0.12, -0.82, 0,     0.18],
    [0.05,  0.32, -0.12, -0.82, 0,    -0.18],
    [0,     0.39,  0.06,  0.40, 0,     0],
    [-0.08, 0.35,  0.10,  0.55, 0,     0.30],
    [0.08,  0.35,  0.10,  0.55, 0,    -0.30],
    [0,     0.29,  0.14,  0.95, 0,     0],
  ] as const;
  spikeConfigs.forEach(([x, y, z, rx, ry, rz]) => {
    const spike = new THREE.Mesh(spikeGeo, hairMat);
    spike.position.set(x, y, z);
    spike.rotation.set(rx, ry, rz);
    spike.castShadow = true;
    addOutline(spike, 1.07);
    head.add(spike);
  });
  [-0.125, 0.125].forEach((bx, i) => {
    const sideLock = new THREE.Mesh(bangGeo, hairMat);
    sideLock.position.set(bx, 0.21, -0.09);
    sideLock.rotation.set(2.85, 0, i === 0 ? -0.18 : 0.18);
    head.add(sideLock);
  });

  function makeArm(side: -1 | 1): ArmRig {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.255, 0.455, 0);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 8), jerseyMat);
    cap.castShadow = true;
    addOutline(cap, 1.09);
    shoulder.add(cap);

    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.15, 0.105), jerseyMat);
    sleeve.position.set(0, -0.08, 0);
    sleeve.castShadow = true;
    addOutline(sleeve, 1.08);
    shoulder.add(sleeve);

    const bicep = new THREE.Mesh(new THREE.BoxGeometry(0.086, 0.10, 0.086), skinMat);
    bicep.position.set(0, -0.18, 0);
    addOutline(bicep, 1.08);
    shoulder.add(bicep);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.23, 0);
    shoulder.add(elbow);

    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.080, 0.20, 0.080), skinMat);
    forearm.position.set(0, -0.10, 0);
    forearm.castShadow = true;
    addOutline(forearm, 1.08);
    elbow.add(forearm);

    const band = new THREE.Mesh(new THREE.BoxGeometry(0.090, 0.042, 0.090), accentMat);
    band.position.set(0, -0.185, 0);
    elbow.add(band);

    const handMat = opts.numberStyle === "1" ? accentMat : skinMat;
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.095, 0.084), handMat);
    hand.position.set(0, -0.245, -0.005);
    hand.castShadow = true;
    addOutline(hand, 1.09);
    elbow.add(hand);

    torso.add(shoulder);
    return { shoulder, elbow };
  }

  function makeLeg(side: -1 | 1): LegRig {
    const hip = new THREE.Group();
    hip.position.set(side * 0.105, 0.87, 0);

    const shortsLeg = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.21, 0.165), shortsMat);
    shortsLeg.position.set(0, -0.10, 0);
    shortsLeg.castShadow = true;
    addOutline(shortsLeg, 1.07);
    hip.add(shortsLeg);

    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.118, 0.17, 0.122), skinMat);
    thigh.position.set(0, -0.26, 0);
    addOutline(thigh, 1.08);
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.set(0, -0.35, 0);
    hip.add(knee);

    const kneeJoint = new THREE.Mesh(new THREE.SphereGeometry(0.062, 8, 8), skinMat);
    addOutline(kneeJoint, 1.08);
    knee.add(kneeJoint);

    const sock = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.34, 0.12), jerseyMat);
    sock.position.set(0, -0.18, 0);
    sock.castShadow = true;
    addOutline(sock, 1.08);
    knee.add(sock);

    const sockStripe = new THREE.Mesh(new THREE.BoxGeometry(0.122, 0.035, 0.126), accentMat);
    sockStripe.position.set(0, -0.04, 0);
    knee.add(sockStripe);

    const cleatBody = new THREE.Mesh(new THREE.BoxGeometry(0.132, 0.095, 0.25), cleatMat);
    cleatBody.position.set(0, -0.39, -0.04);
    cleatBody.castShadow = true;
    addOutline(cleatBody, 1.07);
    knee.add(cleatBody);

    const cleatGlow = new THREE.Mesh(new THREE.BoxGeometry(0.142, 0.032, 0.265), cleatGlowMat);
    cleatGlow.position.set(0, -0.425, -0.04);
    knee.add(cleatGlow);

    root.add(hip);
    return { hip, knee };
  }

  return {
    root,
    torso,
    head,
    leftArm: makeArm(-1),
    rightArm: makeArm(1),
    leftLeg: makeLeg(-1),
    rightLeg: makeLeg(1),
    headbandTails,
    jerseyMat,
    hairMat,
    accentMat,
    visorMat,
    irisMat,
    cleatGlowMat,
  };
}

const PLAYER_H = 1.8, PLAYER_R = 0.35;
const playerChar = buildAnimeCharacter({
  jerseyHex: 0xd62839,
  emissiveHex: 0x2b0008,
  accentHex: 0xff3355,
  hairHex: 0x13172b,
  visorHex: 0x00eeff,
  numberStyle: "11",
});

// ─── SUPER SAIYAN AWAKENING SHADER AURA ─────────────────────────────────────
const ssjAuraUniforms = {
  uTime:  { value: 0 },
  uColor: { value: new THREE.Color(0xffdd22) },
  uAlpha: { value: 0.0 },
};
const ssjAuraMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  uniforms: ssjAuraUniforms,
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNorm;
    varying vec3 vView;
    uniform float uTime;
    void main() {
      vUv = uv;
      vec3 p = position;
      float ripple = sin(p.y * 7.0 - uTime * 14.0) * 0.06 + cos(p.x * 9.0 + uTime * 11.0) * 0.04;
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
      float fres = pow(1.0 - abs(dot(normalize(vNorm), normalize(vView))), 1.8);
      float bands = sin(vUv.y * 24.0 - uTime * 18.0) * 0.5 + 0.5;
      float streaks = sin(vUv.x * 36.0 + sin(vUv.y * 10.0 - uTime * 12.0)) * 0.5 + 0.5;
      float flame = smoothstep(0.15, 0.95, fres * 0.8 + bands * streaks * 0.65);
      float topFade = smoothstep(1.0, 0.15, vUv.y);
      vec3 col = mix(uColor, vec3(1.0, 0.98, 0.85), flame * 0.55);
      gl_FragColor = vec4(col * 1.7, flame * topFade * uAlpha);
    }`,
});
const ssjAuraShell = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 1.05, 2.55, 20, 12, true), ssjAuraMat);
ssjAuraShell.visible = false;
scene.add(ssjAuraShell);

const auraLight = new THREE.PointLight(0xffdd22, 0, 16);
auraLight.visible = false;
scene.add(auraLight);

const zoneRingMat = new THREE.MeshBasicMaterial({
  color: 0xffdd22, transparent: true, opacity: 0.55, toneMapped: false, side: THREE.DoubleSide,
});
const zoneRing = new THREE.Mesh(new THREE.RingGeometry(4.4, 4.7, 48), zoneRingMat);
zoneRing.rotation.x = -Math.PI / 2;
zoneRing.position.y = 0.04;
zoneRing.visible = false;
scene.add(zoneRing);

const skillBurstMat = new THREE.MeshBasicMaterial({
  color: 0x00eeff, transparent: true, opacity: 0, toneMapped: false,
  blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
});
const skillBurstPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.05, 2.8, 16, 1, true), skillBurstMat);
skillBurstPillar.visible = false;
scene.add(skillBurstPillar);
let skillBurstTimer = 0;

const playerBodyDesc = RAPIER.RigidBodyDesc.dynamic()
  .setTranslation(0, PLAYER_H / 2, 8)
  .lockRotations();
const playerBody = world.createRigidBody(playerBodyDesc);
const playerCollider = world.createCollider(
  RAPIER.ColliderDesc.capsule(PLAYER_H / 2 - PLAYER_R, PLAYER_R).setFriction(0.1),
  playerBody
);
playerCollider.setCollisionGroups(PLAYER_GROUPS_FREE);

// ─── GOALKEEPERS (HOME & AWAY) ──────────────────────────────────────────────
interface KeeperState {
  side: -1 | 1;
  rig: CharacterRig;
  body: RAPIER.RigidBody;
  z: number;
  diveTimer: number;
  diveDir: number;
  saveCooldown: number;
  stridePhase: number;
}

const keepers: KeeperState[] = ([-1, 1] as const).map(side => {
  const rig = buildAnimeCharacter({
    jerseyHex: side === -1 ? 0x0ea5e9 : 0xf97316,
    emissiveHex: side === -1 ? 0x002244 : 0x331100,
    accentHex: side === -1 ? 0x38bdf8 : 0xfacc15,
    hairHex: side === -1 ? 0x0f172a : 0x2a123b,
    visorHex: side === -1 ? 0x00ffff : 0xffcc00,
    numberStyle: "1",
  });
  const startX = side * (hw - 1.5);
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(startX, PLAYER_H / 2, 0)
  );
  const col = world.createCollider(
    RAPIER.ColliderDesc.capsule(PLAYER_H / 2 - PLAYER_R, PLAYER_R).setRestitution(0.65),
    body
  );
  col.setCollisionGroups(GK_GROUPS);
  rig.root.position.set(startX, 0, 0);
  rig.root.rotation.y = side === -1 ? -Math.PI / 2 : Math.PI / 2;
  return { side, rig, body, z: 0, diveTimer: 0, diveDir: 0, saveCooldown: 0, stridePhase: 0 };
});

function updateGoalkeepers(dt: number) {
  const bp = ballBody.translation();
  const bv = ballBody.linvel();

  keepers.forEach(gk => {
    if (gk.saveCooldown > 0) gk.saveCooldown = Math.max(0, gk.saveCooldown - dt);
    if (gk.diveTimer > 0) gk.diveTimer = Math.max(0, gk.diveTimer - dt);

    const goalX = gk.side * (hw - 1.5);
    const maxZ = GOAL_W / 2 - 1.0;
    const targetZ = THREE.MathUtils.clamp(bp.z, -maxZ, maxZ);
    const diffZ = targetZ - gk.z;
    const moveStep = Math.sign(diffZ) * Math.min(Math.abs(diffZ), 5.6 * dt);
    gk.z += moveStep;

    gk.body.setNextKinematicTranslation({ x: goalX, y: PLAYER_H / 2, z: gk.z });
    gk.rig.root.position.set(goalX, 0, gk.z);
    gk.rig.root.rotation.y = gk.side === -1 ? -Math.PI / 2 : Math.PI / 2;

    // Detect & parry incoming shots
    if (!hasBall && gk.saveCooldown <= 0) {
      const dist = Math.hypot(bp.x - goalX, bp.z - gk.z);
      const movingTowardGoal = bv.x * gk.side > 2.5;
      if (dist < 1.38 && bp.y < GOAL_H && movingTowardGoal && !isAwakeningShotBall) {
        gk.saveCooldown = 0.65;
        gk.diveTimer = 0.42;
        gk.diveDir = Math.sign(bp.z - gk.z) || 1;
        const parryDirX = -gk.side;
        const parrySpd = Math.max(10, Math.hypot(bv.x, bv.z) * 0.55);
        ballBody.setLinvel({
          x: parryDirX * parrySpd,
          y: 5.5,
          z: gk.diveDir * 7.5,
        }, true);
        activeBallSpin = 0;
        activeBallVertSpin = 0;
        spawnSparkBurst(bp.x, bp.y, bp.z, gk.side === -1 ? 0x38bdf8 : 0xfacc15, 14, 1.1);
        crowdExcitement = Math.min(1, crowdExcitement + 0.65);
        addEnergy(25);
      }
    }

    // Procedural GK animation
    const speedRatio = Math.min(1, Math.abs(moveStep) / (5.6 * dt + 0.001));
    if (gk.diveTimer > 0) {
      const p = Math.sin((1 - gk.diveTimer / 0.42) * Math.PI);
      gk.rig.torso.rotation.z = -gk.diveDir * p * 0.65;
      gk.rig.leftArm.shoulder.rotation.set(1.3 * p, 0, -0.6 * p);
      gk.rig.rightArm.shoulder.rotation.set(1.3 * p, 0, 0.6 * p);
    } else {
      gk.stridePhase += dt * (4 + speedRatio * 7);
      const sw = Math.sin(gk.stridePhase) * speedRatio * 0.65;
      gk.rig.torso.rotation.z = 0;
      gk.rig.leftLeg.hip.rotation.x = sw;
      gk.rig.rightLeg.hip.rotation.x = -sw;
      gk.rig.leftLeg.knee.rotation.x = -0.35;
      gk.rig.rightLeg.knee.rotation.x = -0.35;
      gk.rig.leftArm.shoulder.rotation.set(0.45, 0, -0.45);
      gk.rig.rightArm.shoulder.rotation.set(0.45, 0, 0.45);
      gk.rig.leftArm.elbow.rotation.x = 0.85;
      gk.rig.rightArm.elbow.rotation.x = 0.85;
    }
  });
}

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

const AIM_RADIUS = 26;
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
    aimOffsetX += e.movementX * 0.25;
    aimOffsetY += e.movementY * 0.25;
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
let pickupBlend = 0;
let dribblePhase = 0;
let activeBallSpin = 0;
let activeBallVertSpin = 0;

let playerFacingYaw = 0;
let runCycle = 0;
let rigAnimSpeed = 0;
let kickAnimTimer = 0;
let bicycleKickTimer = 0;

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
    pickupBlend = 0;
    trailMat.color.setHex(0x33eeff);
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
  trailCount = 0;
  trailGeo.setDrawRange(0, 0);
  ballBody.setTranslation({ x, y: 1.2, z }, true);
  ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
  ballBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
}

// ─── PLAYSTYLE SWITCHING ────────────────────────────────────────────────────
function applyNormalKitColors(ps: Playstyle) {
  const accentHex = PLAYSTYLE_COLOR_INT[ps];
  playerChar.jerseyMat.color.setHex(
    ps === "EGOIST" ? 0xd62839 : ps === "PLAYMAKER" ? 0xd99b00 :
    ps === "LOCKDOWN" ? 0x109960 : 0x0e8cd8
  );
  playerChar.jerseyMat.emissive.setHex(
    ps === "EGOIST" ? 0x2b0008 : ps === "PLAYMAKER" ? 0x2b1d00 :
    ps === "LOCKDOWN" ? 0x002b18 : 0x001d2e
  );
  playerChar.hairMat.color.setHex(0x13172b);
  playerChar.hairMat.emissive.setHex(0x000000);
  playerChar.accentMat.color.setHex(accentHex);
  playerChar.cleatGlowMat.color.setHex(accentHex);
  playerChar.visorMat.color.setHex(
    ps === "EGOIST" ? 0xff4477 : ps === "PLAYMAKER" ? 0xffee33 :
    ps === "LOCKDOWN" ? 0x00ffaa : 0x00eeff
  );
  playerChar.irisMat.color.setHex(accentHex);
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
    <div id="skill-slot-${i}" style="width:110px;padding:8px;background:rgba(0,0,0,.55);
      border:1px solid ${PLAYSTYLE_HEX[currentPlaystyle]};border-radius:8px;position:relative;overflow:hidden;">
      <div style="font-size:.6rem;letter-spacing:1px;opacity:.75;">[${SKILL_KEYS[i]}] ${skill.staminaCost} ST</div>
      <div id="skill-name-${i}" style="font-size:.75rem;font-weight:bold;letter-spacing:1px;margin-top:2px;
        text-shadow:0 0 6px ${PLAYSTYLE_HEX[currentPlaystyle]};">${skill.name}</div>
      <div id="skill-cd-${i}" style="font-size:.65rem;margin-top:3px;color:#0ff;">READY</div>
      <div id="skill-cd-fill-${i}" style="position:absolute;left:0;bottom:0;width:100%;height:0%;
        background:${PLAYSTYLE_HEX[currentPlaystyle]};opacity:.25;transition:height .1s;pointer-events:none;"></div>
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
      color = "#888";
      fillH = `${((cd / skill.cooldownSec) * 100).toFixed(1)}%`;
    } else {
      const lowStam = stamina < skill.staminaCost;
      text  = lowStam ? "LOW ST" : "READY";
      color = lowStam ? "#f55" : "#0ff";
      fillH = "0%";
    }
    if (prevSkillCdText[i] !== text) { cdEl.textContent = text; cdEl.style.color = color; prevSkillCdText[i] = text; }
    if (prevSkillFillH[i] !== fillH) { fillEl.style.height = fillH; prevSkillFillH[i] = fillH; }
  });
}

// ─── SKILL VFX & BLAZING PARTICLE POOL ──────────────────────────────────────
const VFX_GEO   = new THREE.RingGeometry(0.4, 0.65, 40);
const SPARK_GEO = new THREE.BoxGeometry(0.08, 0.28, 0.08);

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
    item.mat.opacity = 0.9;
    item.mesh.visible = true;
    return item;
  }
  const mat  = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, toneMapped: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(VFX_GEO, mat);
  mesh.rotation.x = -Math.PI / 2;
  scene.add(mesh);
  return { mesh, mat };
}

function acquireSparkMesh(color: number) {
  if (sparkPool.length > 0) {
    const item = sparkPool.pop()!;
    item.mat.color.setHex(color);
    item.mat.opacity = 1;
    item.mesh.visible = true;
    return item;
  }
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 1, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const mesh = new THREE.Mesh(SPARK_GEO, mat);
  scene.add(mesh);
  return { mesh, mat };
}

function spawnSparkBurst(x: number, y: number, z: number, color: number, count: number, speedScale = 1, gravity = 8) {
  for (let i = 0; i < count; i++) {
    const item = acquireSparkMesh(color);
    const ang = (i / count) * Math.PI * 2 + (i % 3) * 0.25;
    const spd = (3.2 + (i % 4) * 1.35) * speedScale;
    item.mesh.position.set(x, y, z);
    item.mesh.rotation.set(ang * 0.5, ang, 0);
    item.mesh.scale.setScalar(1);
    activeSparks.push({
      mesh: item.mesh, mat: item.mat,
      vx: Math.cos(ang) * spd, vy: (2.0 + (i % 3) * 1.4) * speedScale, vz: Math.sin(ang) * spd,
      life: 0, maxLife: 0.42, gravity,
    });
  }
}

function spawnTrailParticle(x: number, y: number, z: number, color: number, scale = 1.0) {
  if (activeSparks.length > 140) return;
  const item = acquireSparkMesh(color);
  item.mesh.position.set(
    x + (Math.random() - 0.5) * 0.16,
    y + (Math.random() - 0.5) * 0.16,
    z + (Math.random() - 0.5) * 0.16
  );
  item.mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
  item.mesh.scale.setScalar(scale);
  activeSparks.push({
    mesh: item.mesh, mat: item.mat,
    vx: (Math.random() - 0.5) * 1.8,
    vy: 0.6 + Math.random() * 1.5,
    vz: (Math.random() - 0.5) * 1.8,
    life: 0, maxLife: 0.32, gravity: 0,
  });
}

function spawnSkillVfx(color: number, burstPillar = true) {
  const pp = playerBody.translation();
  const item = acquireVfxMesh(color);
  item.mesh.position.set(pp.x, 0.06, pp.z);
  item.mesh.scale.set(1, 1, 1);
  skillVfx.push({ mesh: item.mesh, mat: item.mat, life: 0, maxLife: 0.5 });

  spawnSparkBurst(pp.x, pp.y - 0.3, pp.z, color, 14, 1.15);

  if (burstPillar) {
    skillBurstMat.color.setHex(color);
    skillBurstMat.opacity = 0.65;
    skillBurstPillar.position.set(pp.x, pp.y + 0.45, pp.z);
    skillBurstPillar.scale.set(1, 1, 1);
    skillBurstPillar.visible = true;
    skillBurstTimer = 0.42;
  }
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
    const s = 1 + t * 6;
    v.mesh.scale.set(s, s, s);
    v.mat.opacity = 0.9 * (1 - t);
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
    sp.mat.opacity = 1 - t;
    sp.mesh.scale.setScalar(Math.max(0.1, 1 - t * 0.55));
  }

  if (skillBurstTimer > 0) {
    skillBurstTimer = Math.max(0, skillBurstTimer - dt);
    const t = 1 - skillBurstTimer / 0.42;
    const pp = playerBody.translation();
    skillBurstPillar.position.set(pp.x, pp.y + 0.45, pp.z);
    skillBurstPillar.scale.set(1 + t * 1.1, 1 + t * 0.8, 1 + t * 1.1);
    skillBurstMat.opacity = 0.65 * (1 - t);
    if (skillBurstTimer <= 0) skillBurstPillar.visible = false;
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
const _ballGlowColor    = new THREE.Color();

// ─── SHOT & SKILL RELEASE ───────────────────────────────────────────────────
function fireShot(chargeNorm: number, kickMult: number, curveStrength: number, aimNx = 0, aimNy = 0) {
  const pp = playerBody.translation();
  _fwdVec.set(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
  _rightVec.set(-_fwdVec.z, 0, _fwdVec.x);

  const clampedCharge = Math.max(0.20, Math.min(1.0, chargeNorm));

  // Ultimate Awakening Shot: massive velocity, zero air drag, laser straight + blazing trail
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
    trailMat.color.setHex(0xffdd22);

    const launchX = THREE.MathUtils.clamp(pp.x + _fwdVec.x * 1.25, -hw + BALL_R + 0.1, hw - BALL_R - 0.1);
    const launchZ = THREE.MathUtils.clamp(pp.z + _fwdVec.z * 1.25, -hd + BALL_R + 0.1, hd - BALL_R - 0.1);
    ballBody.setTranslation({ x: launchX, y: Math.max(BALL_R + 0.25, pp.y - 0.3), z: launchZ }, true);
    ballBody.setLinvel({
      x: _fwdVec.x * awakenSpeed + _rightVec.x * aimNx * 6,
      y: liftY,
      z: _fwdVec.z * awakenSpeed + _rightVec.z * aimNx * 6,
    }, true);
    ballBody.setAngvel({ x: 0, y: 0, z: 32 }, true);

    spawnSkillVfx(0xffdd22, true);
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

  trailMat.color.setHex(kickMult > 1.05 || isAwakened ? PLAYSTYLE_COLOR_INT[currentPlaystyle] : 0x33eeff);

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
    // Z: Quick Directional Heel Flick
    activeSkillAnim = "heel";
    skillAnimTimer = 0.38;
    dribbleBoostTimer = 2.4;
    dribbleSpeedMult = 1.38;
    magnetismRange = 2.65;
    const imp = Math.max(8.5, skill.dashImpulse);
    playerBody.applyImpulse({ x: _fwdVec.x * imp, y: 0.6, z: _fwdVec.z * imp }, true);
  } else if (slot === 1) {
    // X: 360 Spin Dribble
    activeSkillAnim = "spin";
    skillAnimTimer = 0.44;
    dribbleBoostTimer = 2.6;
    dribbleSpeedMult = 1.34;
    magnetismRange = 2.85;
    const imp = Math.max(7.0, skill.dashImpulse);
    playerBody.applyImpulse({ x: _fwdVec.x * imp, y: 0, z: _fwdVec.z * imp }, true);
  } else {
    // C: "Fake Shot" Body Feint
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

  spawnSkillVfx(skill.vfxColor, true);
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
  if (kickAnimTimer > 0) kickAnimTimer = Math.max(0, kickAnimTimer - dt);
  if (bicycleKickTimer > 0) bicycleKickTimer = Math.max(0, bicycleKickTimer - dt);
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

// ─── AWAKENING (SUPER SAIYAN AURA + AWAKENING SHOT) ─────────────────────────
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

    ssjAuraUniforms.uColor.value.set(0xffdd22);
    ssjAuraUniforms.uAlpha.value = 0.85;
    ssjAuraShell.visible = true;

    auraLight.color.setHex(0xffdd22);
    auraLight.visible = true;
    zoneRingMat.color.setHex(0xffdd22);
    zoneRing.visible = true;

    // Golden Super Saiyan hair & eye shift
    playerChar.hairMat.color.setHex(0xffe135);
    playerChar.hairMat.emissive.setHex(0x996600);
    playerChar.irisMat.color.setHex(0x00ffff);
    playerChar.cleatGlowMat.color.setHex(0xffdd22);

    spawnSkillVfx(0xffdd22, true);
    crowdExcitement = Math.min(1, crowdExcitement + 0.85);
    updateJumbotronScreen(score[0], score[1], `AWAKENED: ${aw.name.toUpperCase()}`);

    awakenFlash.textContent = `AWAKENING — ${aw.name.toUpperCase()}`;
    awakenFlash.style.display = "block";
    setTimeout(() => { awakenFlash.style.display = "none"; }, 1800);
  }
}

function endAwakening() {
  isAwakened = false;
  awakeningTimer = 0;
  awakeningShotArmed = false;
  energy = 0;
  activeAwakeningName = "";
  ssjAuraShell.visible = false;
  auraLight.visible = false;
  zoneRing.visible = false;
  applyNormalKitColors(currentPlaystyle);
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
  ssjAuraShell.rotation.y += dt * 4.5;
  const pulse = 1 + Math.sin(nowSec * 11) * 0.08;
  ssjAuraShell.scale.set(pulse, 1 + Math.cos(nowSec * 9) * 0.06, pulse);

  auraLight.position.set(pp.x, pp.y + 0.5, pp.z);
  auraLight.intensity = 3.2 + Math.sin(nowSec * 12) * 1.4;
  zoneRing.position.set(pp.x, 0.04, pp.z);
  const rp = 1 + Math.sin(nowSec * 6) * 0.05;
  zoneRing.scale.set(rp, rp, 1);
  zoneRingMat.opacity = 0.4 + Math.sin(nowSec * 6) * 0.2;
}

// ─── HUD (throttled) ─────────────────────────────────────────────────────────
const HUD_UPDATE_INTERVAL = 1 / 20;
let hudAccum = 0;
const hudDirty = { playstyle: true };
let prevScore = "", prevStamW = "", prevGaugeVis = "", prevGaugeH = "", prevGaugeColor = "";
let prevAimVis = "", prevAimX = -999, prevAimY = -999, prevAimAlpha = "";
let prevPsText = "", prevAwW = "", prevAwReadyVis = "", prevAwLabelTxt = "";

function updateHUD(dt: number) {
  const showReticle = isLocked && hasBall;
  const aimVis = showReticle ? "block" : "none";
  if (aimVis !== prevAimVis) {
    aimReticle.style.display = aimVis;
    prevAimVis = aimVis;
  }
  const dotAlpha = isCharging ? "1" : "0";
  if (dotAlpha !== prevAimAlpha) {
    aimDot.style.opacity = dotAlpha;
    prevAimAlpha = dotAlpha;
  }
  if (showReticle && isCharging && (aimOffsetX !== prevAimX || aimOffsetY !== prevAimY)) {
    prevAimX = aimOffsetX;
    prevAimY = aimOffsetY;
    aimDot.style.transform = `translate(${aimOffsetX.toFixed(1)}px, ${aimOffsetY.toFixed(1)}px)`;
  }

  hudAccum += dt;
  if (hudAccum < HUD_UPDATE_INTERVAL) return;
  hudAccum = 0;

  const scoreStr = `${score[0]} — ${score[1]}`;
  if (scoreStr !== prevScore) { scoreEl.textContent = scoreStr; prevScore = scoreStr; }

  const stamW = `${stamina.toFixed(1)}%`;
  if (stamW !== prevStamW) { stamBar.style.width = stamW; prevStamW = stamW; }

  const showGauge = isCharging && hasBall && isLocked;
  const gaugeVis = showGauge ? "flex" : "none";
  if (gaugeVis !== prevGaugeVis) {
    powerGaugeWrap.style.display = gaugeVis;
    prevGaugeVis = gaugeVis;
  }
  if (showGauge) {
    const pct = Math.round(shotCharge);
    const gaugeH = `${shotCharge.toFixed(1)}%`;
    const hue = Math.round(125 * (1 - shotCharge / 100));
    const col = `hsl(${hue}, 96%, 52%)`;
    if (gaugeH !== prevGaugeH) {
      powerGaugeFill.style.height = gaugeH;
      powerGaugePct.textContent = `${pct}%`;
      prevGaugeH = gaugeH;
    }
    if (col !== prevGaugeColor) {
      powerGaugeFill.style.boxShadow = `0 0 14px ${col}`;
      powerGaugePct.style.color = col;
      powerGaugePct.style.textShadow = `0 0 8px ${col}`;
      prevGaugeColor = col;
    }
  }

  if (hudDirty.playstyle) {
    const hex = PLAYSTYLE_HEX[currentPlaystyle];
    const psText = `${currentPlaystyle} <span style="opacity:.6;font-weight:normal;font-size:.7rem;">[1-4]</span>`;
    if (psText !== prevPsText) {
      playstyleTag.innerHTML = psText;
      playstyleTag.style.borderColor = hex;
      playstyleTag.style.textShadow = `0 0 10px ${hex}`;
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
      ? `${activeAwakeningName.toUpperCase()} • SHOT ARMED`
      : `${activeAwakeningName.toUpperCase()} ${awakeningTimer.toFixed(1)}s`
    : energy >= 100 ? "PRESS R TO AWAKEN" : `ENERGY ${Math.floor(energy)}%`;
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
      spawnSparkBurst(bp.x, bp.y + 0.5, bp.z, 0xff2299, 24, 1.5);
      updateJumbotronScreen(score[0], score[1], "GOAL!");
      resetBall();
      return;
    }
    if (bp.x > hw + 0.25) {
      score[0]++;
      addEnergy(45);
      crowdExcitement = 1;
      spawnSparkBurst(bp.x, bp.y + 0.5, bp.z, 0x00ffff, 24, 1.5);
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
      // Active skill ball magnetism pulls loose ball cleanly into dribble pocket
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

// ─── BICYCLE KICK / OVERHEAD FLICK ──────────────────────────────────────────
function performBicycleKick() {
  const pp = playerBody.translation();
  const pv = playerBody.linvel();
  _fwdVec.set(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();

  const fwdVel = Math.max(0, pv.x * _fwdVec.x + pv.z * _fwdVec.z);
  const flickHoriz = Math.max(13.5, fwdVel * 0.85 + 9.5);
  const flickUp = 12.6;

  setPossession(false);
  pickupCooldown = 0.42;
  isGrounded = false;
  bicycleKickTimer = 0.56;
  activeBallVertSpin = -0.45;

  trailMat.color.setHex(PLAYSTYLE_COLOR_INT[currentPlaystyle]);

  const launchX = THREE.MathUtils.clamp(pp.x + _fwdVec.x * 0.7, -hw + BALL_R + 0.1, hw - BALL_R - 0.1);
  const launchZ = THREE.MathUtils.clamp(pp.z + _fwdVec.z * 0.7, -hd + BALL_R + 0.1, hd - BALL_R - 0.1);
  ballBody.setTranslation({ x: launchX, y: pp.y + 0.55, z: launchZ }, true);
  ballBody.setLinvel({
    x: _fwdVec.x * flickHoriz,
    y: flickUp,
    z: _fwdVec.z * flickHoriz,
  }, true);
  ballBody.setAngvel({ x: -_fwdVec.z * 18, y: 0, z: _fwdVec.x * 18 }, true);

  playerBody.applyImpulse({ x: _fwdVec.x * 2.0, y: 5.4, z: _fwdVec.z * 2.0 }, true);
  spawnSparkBurst(launchX, pp.y + 0.35, launchZ, PLAYSTYLE_COLOR_INT[currentPlaystyle], 14, 1.0);
  addEnergy(12);
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
      performBicycleKick();
    } else {
      isGrounded = false;
      playerBody.applyImpulse({ x: 0, y: 4.7, z: 0 }, true);
    }
  }
}

// ─── ARTICULATED PLAYER ANIMATION ───────────────────────────────────────────
function updatePlayerRig(dt: number, nowSec: number) {
  const pp = playerBody.translation();
  const pv = playerBody.linvel();
  const horizSpeed = Math.hypot(pv.x, pv.z);

  playerChar.root.position.set(pp.x, pp.y - PLAYER_H / 2, pp.z);
  playerChar.root.rotation.set(0, playerFacingYaw, 0);

  rigAnimSpeed = THREE.MathUtils.lerp(rigAnimSpeed, horizSpeed, 1 - Math.exp(-15 * dt));
  const normSpeed = Math.min(1, rigAnimSpeed / SPEED_SPRINT);

  const flutter = Math.sin(nowSec * 12) * (0.08 + normSpeed * 0.25);
  playerChar.headbandTails[0].rotation.x = 0.55 + normSpeed * 0.55 + flutter;
  playerChar.headbandTails[1].rotation.x = 0.55 + normSpeed * 0.55 - flutter;

  // 1. Bicycle kick / overhead flick skeleton sequence
  if (bicycleKickTimer > 0) {
    const p = 1 - bicycleKickTimer / 0.56;
    const arc = Math.sin(p * Math.PI);
    playerChar.root.rotation.x = arc * 0.95;
    playerChar.torso.rotation.set(arc * 0.45, -arc * 0.25, 0);
    playerChar.torso.position.y = 0.92;
    playerChar.rightLeg.hip.rotation.x  = arc * 2.1;
    playerChar.rightLeg.knee.rotation.x = -0.25 * (1 - arc);
    playerChar.leftLeg.hip.rotation.x   = -arc * 0.55;
    playerChar.leftLeg.knee.rotation.x  = -1.05 * arc;
    playerChar.leftArm.shoulder.rotation.set(0.55 * arc, 0, -0.85 * arc);
    playerChar.leftArm.elbow.rotation.x  = 0.45;
    playerChar.rightArm.shoulder.rotation.set(-0.45 * arc, 0, 0.85 * arc);
    playerChar.rightArm.elbow.rotation.x = 0.55;
    return;
  }

  // 2. Dribbling skill animations (Heel Flick, 360 Spin, Fake Shot Feint)
  if (skillAnimTimer > 0 && activeSkillAnim !== "none") {
    if (activeSkillAnim === "heel") {
      const p = 1 - skillAnimTimer / 0.38;
      const snap = Math.sin(p * Math.PI);
      playerChar.torso.rotation.set(-0.35 * snap, 0.3 * snap, 0);
      playerChar.rightLeg.hip.rotation.x  = -1.05 * snap;
      playerChar.rightLeg.knee.rotation.x = -1.25 * snap;
      playerChar.leftArm.shoulder.rotation.set(0.75 * snap, 0, -0.45);
      playerChar.rightArm.shoulder.rotation.set(-0.65 * snap, 0, 0.45);
      return;
    }
    if (activeSkillAnim === "spin") {
      const p = 1 - skillAnimTimer / 0.44;
      playerChar.root.rotation.y = playerFacingYaw + p * Math.PI * 2;
      playerChar.torso.rotation.set(-0.22, 0, 0);
      playerChar.leftArm.shoulder.rotation.set(0.25, 0, -0.78);
      playerChar.rightArm.shoulder.rotation.set(0.25, 0, 0.78);
      playerChar.leftLeg.hip.rotation.x = 0.35;
      playerChar.leftLeg.knee.rotation.x = -0.65;
      playerChar.rightLeg.hip.rotation.x = -0.25;
      playerChar.rightLeg.knee.rotation.x = -0.45;
      return;
    }
    if (activeSkillAnim === "feint") {
      const p = 1 - skillAnimTimer / 0.40;
      const fake = p < 0.45 ? Math.sin((p / 0.45) * Math.PI) : -Math.sin(((p - 0.45) / 0.55) * Math.PI);
      playerChar.torso.rotation.set(-0.18, fake * 0.45, fake * 0.28);
      playerChar.rightLeg.hip.rotation.x = fake * 0.95;
      playerChar.rightLeg.knee.rotation.x = -0.45;
      playerChar.leftArm.shoulder.rotation.set(-fake * 0.6, 0, -0.55);
      playerChar.rightArm.shoulder.rotation.set(fake * 0.6, 0, 0.55);
      return;
    }
  }

  // 3. Slide tackle
  if (slideTimer > SLIDE_COOLDOWN - 24) {
    playerChar.torso.rotation.set(0.74, -0.15, 0);
    playerChar.torso.position.y = 0.58;
    playerChar.rightLeg.hip.rotation.x  = 1.25;
    playerChar.rightLeg.knee.rotation.x = -0.15;
    playerChar.leftLeg.hip.rotation.x   = -0.55;
    playerChar.leftLeg.knee.rotation.x  = -0.95;
    playerChar.leftArm.shoulder.rotation.set(-0.65, 0, -0.35);
    playerChar.leftArm.elbow.rotation.x  = 0.45;
    playerChar.rightArm.shoulder.rotation.set(0.45, 0, 0.3);
    playerChar.rightArm.elbow.rotation.x = 0.75;
    return;
  }

  // 4. Shot follow-through
  if (kickAnimTimer > 0) {
    const p = 1 - kickAnimTimer / 0.28;
    const follow = Math.sin(p * Math.PI);
    playerChar.torso.rotation.set(-0.22 * follow, 0.35 * follow, 0);
    playerChar.torso.position.y = 0.90;
    playerChar.rightLeg.hip.rotation.x  = 1.25 * follow;
    playerChar.rightLeg.knee.rotation.x = -0.25 * (1 - follow);
    playerChar.leftLeg.hip.rotation.x   = -0.25;
    playerChar.leftLeg.knee.rotation.x  = -0.22;
    playerChar.leftArm.shoulder.rotation.set(0.85 * follow, 0, -0.38);
    playerChar.leftArm.elbow.rotation.x  = 0.75;
    playerChar.rightArm.shoulder.rotation.set(-0.65 * follow, 0, 0.28);
    playerChar.rightArm.elbow.rotation.x = 0.6;
    return;
  }

  // 5. Shot charge wind-up
  if (isCharging && hasBall) {
    const c = shotCharge / 100;
    playerChar.torso.rotation.set(0.12 * c, -0.32 * c, 0);
    playerChar.torso.position.y = 0.88 - c * 0.04;
    playerChar.rightLeg.hip.rotation.x  = -0.82 * c;
    playerChar.rightLeg.knee.rotation.x = -1.05 * c;
    playerChar.leftLeg.hip.rotation.x   = 0.18 * c;
    playerChar.leftLeg.knee.rotation.x  = -0.22 * c;
    playerChar.leftArm.shoulder.rotation.set(0.35 * c, 0, -0.58 * c);
    playerChar.leftArm.elbow.rotation.x  = 0.55;
    playerChar.rightArm.shoulder.rotation.set(-0.45 * c, 0, 0.35 * c);
    playerChar.rightArm.elbow.rotation.x = 0.85;
    return;
  }

  // 6. Normal airborne
  if (!isGrounded) {
    playerChar.torso.rotation.set(-0.15, 0, 0);
    playerChar.torso.position.y = 0.92;
    playerChar.leftLeg.hip.rotation.x   = 0.45;
    playerChar.leftLeg.knee.rotation.x  = -0.85;
    playerChar.rightLeg.hip.rotation.x  = 0.22;
    playerChar.rightLeg.knee.rotation.x = -0.65;
    playerChar.leftArm.shoulder.rotation.set(0.45, 0, -0.45);
    playerChar.leftArm.elbow.rotation.x  = 0.65;
    playerChar.rightArm.shoulder.rotation.set(0.45, 0, 0.45);
    playerChar.rightArm.elbow.rotation.x = 0.65;
    return;
  }

  // 7. Procedural Run / Dribble / Idle blending
  if (rigAnimSpeed > 0.3) {
    runCycle += dt * (5.8 + rigAnimSpeed * 0.85);
  }
  const swing = Math.sin(runCycle) * normSpeed * 0.95;

  playerChar.leftLeg.hip.rotation.x   =  swing;
  playerChar.rightLeg.hip.rotation.x  = -swing;
  playerChar.leftLeg.knee.rotation.x  = -Math.max(0, -swing) * 0.85 - normSpeed * 0.12;
  playerChar.rightLeg.knee.rotation.x = -Math.max(0,  swing) * 0.85 - normSpeed * 0.12;

  const armSpread = hasBall ? 0.22 : 0.10 + normSpeed * 0.08;
  playerChar.leftArm.shoulder.rotation.set(-swing * 0.85, 0, -armSpread);
  playerChar.rightArm.shoulder.rotation.set( swing * 0.85, 0,  armSpread);
  playerChar.leftArm.elbow.rotation.x  = 0.35 + normSpeed * 0.65 + Math.max(0, -swing) * 0.25;
  playerChar.rightArm.elbow.rotation.x = 0.35 + normSpeed * 0.65 + Math.max(0,  swing) * 0.25;

  const idleBreath = Math.sin(nowSec * 3.0) * 0.02 * (1 - normSpeed);
  playerChar.torso.rotation.set(-normSpeed * (hasBall ? 0.26 : 0.20) + idleBreath, swing * 0.12, 0);
  playerChar.torso.position.y = 0.90 + Math.abs(Math.sin(runCycle)) * 0.045 * normSpeed;
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

// ─── BALL GLOW & TRAIL ──────────────────────────────────────────────────────
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

  // Dynamic speed-based core glow shift: Cyan -> Electric Violet -> Blazing Gold/Red
  if (isAwakeningShotBall) {
    _ballGlowColor.setHex(0xffdd22);
    ballCoreMat.emissiveIntensity = 1.9;
    ballHaloMat.opacity = 0.72;
    ballHalo.scale.setScalar(1.38);
    spawnTrailParticle(bp.x, bp.y, bp.z, 0xffcc22, 1.35);
    spawnTrailParticle(bp.x, bp.y, bp.z, 0xff3355, 1.0);
  } else {
    const t = Math.min(1, speed / 34);
    _ballGlowColor.setHSL(0.54 - t * 0.52, 1.0, 0.52 + t * 0.12);
    ballCoreMat.emissiveIntensity = 0.75 + t * 1.0;
    ballHaloMat.opacity = 0.25 + t * 0.35;
    ballHalo.scale.setScalar(1 + t * 0.28);
    if (!hasBall && speed > 17) {
      spawnTrailParticle(bp.x, bp.y, bp.z, _ballGlowColor.getHex(), 0.75);
    }
  }
  ballCoreMat.emissive.copy(_ballGlowColor);
  ballSeamMat.color.copy(_ballGlowColor);
  ballHaloMat.color.copy(_ballGlowColor);
  if (!isAwakeningShotBall && !hasBall) trailMat.color.copy(_ballGlowColor);

  // Persistent ribbon trail
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
  updateGoalkeepers(dt);
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
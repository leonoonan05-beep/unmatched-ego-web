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
<div style="position:absolute;bottom:40px;left:24px;width:165px;">
  <div style="font-size:.7rem;letter-spacing:2px;margin-bottom:3px;">STAMINA</div>
  <div style="background:rgba(0,0,0,.5);border:1px solid #0ff;height:10px;border-radius:4px;">
    <div id="stam-bar" style="height:100%;width:100%;background:linear-gradient(90deg,#0ff,#0af);border-radius:4px;transition:width .1s;"></div>
  </div>
  <div style="font-size:.7rem;letter-spacing:2px;margin-top:12px;margin-bottom:3px;">AWAKENING <span id="aw-key-hint" style="color:#0ff;">[R]</span></div>
  <div style="background:rgba(0,0,0,.5);border:1px solid #f5f;height:10px;border-radius:4px;position:relative;">
    <div id="aw-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#f0f,#f5f);border-radius:4px;transition:width .15s;"></div>
    <div id="aw-ready" style="display:none;position:absolute;top:-2px;left:0;width:100%;text-align:center;font-size:.55rem;
      letter-spacing:2px;color:#fff;text-shadow:0 0 8px #f5f,0 0 16px #f5f;">READY</div>
  </div>
  <div id="aw-label" style="font-size:.65rem;letter-spacing:2px;margin-top:3px;color:#f8f;opacity:.85;"></div>
</div>

<!-- Right-side Vertical Power Gauge (Green -> Yellow -> Red) -->
<div id="power-gauge-wrap" style="display:none;position:absolute;right:30px;top:50%;transform:translateY(-50%);
  flex-direction:column;align-items:center;gap:6px;">
  <div id="power-gauge-pct" style="font-size:.75rem;font-weight:bold;letter-spacing:1px;color:#0f8;text-shadow:0 0 8px #0f8;">0%</div>
  <div style="width:18px;height:210px;background:rgba(6,10,22,.72);border:1.5px solid rgba(255,255,255,.35);
    border-radius:9px;position:relative;overflow:hidden;box-shadow:0 0 14px rgba(0,0,0,.6);">
    <div id="power-gauge-fill" style="position:absolute;left:0;bottom:0;width:100%;height:0%;
      background:#00ff66;box-shadow:0 0 12px #00ff66;border-radius:0 0 7px 7px;"></div>
    <div style="position:absolute;left:0;right:0;bottom:25%;height:1px;background:rgba(255,255,255,.22);"></div>
    <div style="position:absolute;left:0;right:0;bottom:50%;height:1px;background:rgba(255,255,255,.3);"></div>
    <div style="position:absolute;left:0;right:0;bottom:75%;height:1px;background:rgba(255,255,255,.22);"></div>
  </div>
  <div style="font-size:.6rem;letter-spacing:2px;opacity:.8;">POWER</div>
</div>

<!-- Center Mouse-Aimed 8-Way Curve Crosshair Circle -->
<div id="aim-reticle" style="display:none;position:absolute;top:50%;left:50%;width:144px;height:144px;
  transform:translate(-50%,-50%);border-radius:50%;border:1.5px solid rgba(0,255,255,.65);
  background:radial-gradient(circle,rgba(0,230,255,.06) 0%,rgba(0,15,35,.22) 75%,rgba(0,255,255,.12) 100%);
  box-shadow:0 0 16px rgba(0,240,255,.28),inset 0 0 14px rgba(0,240,255,.15);">
  <div style="position:absolute;top:50%;left:50%;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;background:rgba(255,255,255,.5);"></div>
  <div style="position:absolute;top:3px;left:50%;width:2px;height:7px;margin-left:-1px;background:rgba(0,255,255,.5);"></div>
  <div style="position:absolute;bottom:3px;left:50%;width:2px;height:7px;margin-left:-1px;background:rgba(0,255,255,.5);"></div>
  <div style="position:absolute;left:3px;top:50%;width:7px;height:2px;margin-top:-1px;background:rgba(0,255,255,.5);"></div>
  <div style="position:absolute;right:3px;top:50%;width:7px;height:2px;margin-top:-1px;background:rgba(0,255,255,.5);"></div>
  <div style="position:absolute;top:19px;right:19px;width:5px;height:5px;border-radius:50%;background:rgba(0,255,255,.35);"></div>
  <div style="position:absolute;top:19px;left:19px;width:5px;height:5px;border-radius:50%;background:rgba(0,255,255,.35);"></div>
  <div style="position:absolute;bottom:19px;right:19px;width:5px;height:5px;border-radius:50%;background:rgba(0,255,255,.35);"></div>
  <div style="position:absolute;bottom:19px;left:19px;width:5px;height:5px;border-radius:50%;background:rgba(0,255,255,.35);"></div>
  <div id="aim-line" style="position:absolute;top:50%;left:50%;height:2px;width:0px;transform-origin:0 50%;
    background:linear-gradient(90deg,rgba(0,255,255,.25),#ffdd00);pointer-events:none;"></div>
  <div id="aim-dot" style="position:absolute;top:50%;left:50%;width:14px;height:14px;margin:-7px 0 0 -7px;
    border-radius:50%;background:#ffea00;border:2px solid #fff;box-shadow:0 0 12px #ffea00,0 0 22px #ff8800;"></div>
  <div id="aim-dir-label" style="position:absolute;left:50%;bottom:-22px;transform:translateX(-50%);
    font-size:.65rem;font-weight:bold;letter-spacing:2px;color:#ffea00;text-shadow:0 0 8px #ffaa00;white-space:nowrap;">CENTER</div>
</div>

<div id="skill-panel" style="position:absolute;bottom:40px;right:24px;display:flex;gap:8px;"></div>
<div id="awaken-flash" style="position:absolute;top:38%;left:50%;transform:translate(-50%,-50%);display:none;
  font-size:1.6rem;font-weight:bold;letter-spacing:6px;color:#fff;text-shadow:0 0 16px #f5f,0 0 32px #f5f;"></div>
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
const aimLine        = document.getElementById("aim-line")! as HTMLElement;
const aimDirLabel    = document.getElementById("aim-dir-label")! as HTMLElement;

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
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e24);
scene.fog = new THREE.Fog(0x111433, 95, 225);

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
      topColor: { value: new THREE.Color(0x040614) },
      midColor: { value: new THREE.Color(0x131942) },
      horColor: { value: new THREE.Color(0x361b4f) },
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
const hemiLight = new THREE.HemisphereLight(0x6688ee, 0x0b2210, 0.75);
scene.add(hemiLight);

const sun = new THREE.DirectionalLight(0xf2f7ff, 1.45);
sun.position.set(22, 46, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 195;
sun.shadow.camera.left = -65;
sun.shadow.camera.right = 65;
sun.shadow.camera.top = 65;
sun.shadow.camera.bottom = -65;
scene.add(sun);

const rimLight = new THREE.DirectionalLight(0x38d9ff, 0.95);
rimLight.position.set(-32, 22, -28);
scene.add(rimLight);

const warmRim = new THREE.DirectionalLight(0xff3399, 0.45);
warmRim.position.set(30, 14, -26);
scene.add(warmRim);

// ─── STADIUM PITCH ──────────────────────────────────────────────────────────
const PITCH_W = 95, PITCH_H = 0.3, PITCH_D = 60;
const hw = PITCH_W / 2, hd = PITCH_D / 2;

function makeTurfTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const ctx = c.getContext("2d")!;
  const stripes = 14;
  const sw = c.width / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#0e3b17" : "#154d20";
    ctx.fillRect(i * sw, 0, sw + 1, c.height);
  }
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  for (let i = 0; i < 1800; i++) {
    ctx.fillRect((i * 73) % c.width, (i * 137) % c.height, 2, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const pitchMesh = new THREE.Mesh(
  new THREE.BoxGeometry(PITCH_W, PITCH_H, PITCH_D),
  new THREE.MeshStandardMaterial({ map: makeTurfTexture(), roughness: 0.85, metalness: 0.02 })
);
pitchMesh.receiveShadow = true;
pitchMesh.position.y = -PITCH_H / 2;
scene.add(pitchMesh);

const apronMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(PITCH_W + 46, PITCH_D + 46),
  new THREE.MeshStandardMaterial({ color: 0x0c1122, roughness: 0.9, metalness: 0.1 })
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

// ─── STADIUM STANDS & FLOODLIGHTS ───────────────────────────────────────────
function buildStadiumAtmosphere() {
  const standMat = new THREE.MeshStandardMaterial({ color: 0x141b33, roughness: 0.75, metalness: 0.25 });
  const neonCyan = new THREE.MeshBasicMaterial({ color: 0x00eeff, toneMapped: false });
  const neonPink = new THREE.MeshBasicMaterial({ color: 0xff2288, toneMapped: false });

  [-1, 1].forEach((side, sIdx) => {
    const zBase = side * (hd + 4.5);
    for (let t = 0; t < 3; t++) {
      const tier = new THREE.Mesh(new THREE.BoxGeometry(PITCH_W + 8, 2.2, 3.8), standMat);
      tier.position.set(0, 1.1 + t * 2.1, zBase + side * t * 3.6);
      scene.add(tier);
    }
    const led = new THREE.Mesh(new THREE.BoxGeometry(PITCH_W + 4, 0.35, 0.2), sIdx === 0 ? neonCyan : neonPink);
    led.position.set(0, 2.3, side * (hd + 2.5));
    scene.add(led);
  });

  [-1, 1].forEach((side, sIdx) => {
    const xBase = side * (hw + 7.5);
    for (let t = 0; t < 3; t++) {
      const tier = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.2, PITCH_D + 6), standMat);
      tier.position.set(xBase + side * t * 3.6, 1.1 + t * 2.1, 0);
      scene.add(tier);
    }
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, PITCH_D + 2), sIdx === 0 ? neonPink : neonCyan);
    led.position.set(side * (hw + 5.5), 2.3, 0);
    scene.add(led);
  });

  const crowdGeo = new THREE.BoxGeometry(0.65, 1.05, 0.65);
  const crowdMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const crowdCount = 460;
  const crowdMesh = new THREE.InstancedMesh(crowdGeo, crowdMat, crowdCount);
  const dummy = new THREE.Object3D();
  const cCol = new THREE.Color();
  const palette = [0x00ffff, 0xff2299, 0xffee44, 0x88aaff, 0xffffff];
  let idx = 0;

  for (let i = 0; i < crowdCount; i++) {
    const tier = i % 3;
    const side = i % 2 === 0 ? -1 : 1;
    if (i < 300) {
      const rx = ((i * 37) % 100) / 100 - 0.5;
      dummy.position.set(rx * (PITCH_W + 2), 2.7 + tier * 2.1, side * (hd + 4.5 + tier * 3.6));
    } else {
      const rz = ((i * 53) % 100) / 100 - 0.5;
      dummy.position.set(side * (hw + 7.5 + tier * 3.6), 2.7 + tier * 2.1, rz * PITCH_D);
    }
    dummy.scale.set(1, 0.85 + ((i * 19) % 5) * 0.08, 1);
    dummy.updateMatrix();
    crowdMesh.setMatrixAt(idx, dummy.matrix);
    cCol.setHex(palette[(i * 7) % palette.length]).multiplyScalar(0.85);
    crowdMesh.setColorAt(idx, cCol);
    idx++;
  }
  crowdMesh.instanceMatrix.needsUpdate = true;
  if (crowdMesh.instanceColor) crowdMesh.instanceColor.needsUpdate = true;
  scene.add(crowdMesh);

  const mastGeo = new THREE.CylinderGeometry(0.4, 0.65, 32, 8);
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.4 });
  const headGeo = new THREE.BoxGeometry(3.8, 1.4, 0.8);
  const coneGeo = new THREE.ConeGeometry(16, 46, 16, 1, true);
  const corners = [
    [-53, 34, 0x00ffff],
    [ 53, 34, 0xff2299],
    [-53,-34, 0xff2299],
    [ 53,-34, 0x00ffff],
  ] as const;

  corners.forEach(([cx, cz, hex]) => {
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(cx, 16, cz);
    scene.add(mast);

    const headMat = new THREE.MeshBasicMaterial({ color: hex, toneMapped: false });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(cx, 32, cz);
    head.lookAt(0, 0, 0);
    scene.add(head);

    const fl = new THREE.PointLight(hex, 2.2, 145);
    fl.position.set(cx * 0.92, 29, cz * 0.92);
    scene.add(fl);

    const beamMat = new THREE.MeshBasicMaterial({
      color: hex,
      transparent: true,
      opacity: 0.055,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(coneGeo, beamMat);
    beam.position.set(cx * 0.62, 16.5, cz * 0.62);
    beam.lookAt(0, 0, 0);
    beam.rotateX(Math.PI / 2);
    scene.add(beam);
  });
}
buildStadiumAtmosphere();

// ─── GOALS & STADIUM WALLS ──────────────────────────────────────────────────
const GOAL_W = 11.6, GOAL_H = 3.8, GOAL_D = 3.2;
const wallH = 9;

const wallMat = new THREE.MeshStandardMaterial({
  color: 0x1c2b4a, roughness: 0.45, metalness: 0.35, transparent: true, opacity: 0.42,
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

// ─── SOCCER BALL ────────────────────────────────────────────────────────────
const BALL_R = 0.24;
const ballVisual = new THREE.Group();
scene.add(ballVisual);

const ballCore = new THREE.Mesh(
  new THREE.IcosahedronGeometry(BALL_R, 1),
  new THREE.MeshToonMaterial({
    color: 0xffffff, emissive: 0x00aaff, emissiveIntensity: 0.75, gradientMap: toonGradTex,
  })
);
ballCore.castShadow = true;
addOutline(ballCore, 1.08);
ballVisual.add(ballCore);

const ballSeam = new THREE.Mesh(
  new THREE.IcosahedronGeometry(BALL_R * 1.015, 1),
  new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, toneMapped: false })
);
ballCore.add(ballSeam);

const ballHaloMat = new THREE.MeshBasicMaterial({
  color: 0x00d8ff, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false,
});
const ballHalo = new THREE.Mesh(new THREE.SphereGeometry(BALL_R * 1.48, 12, 12), ballHaloMat);
ballVisual.add(ballHalo);

const TRAIL_LEN = 32;
const trailPositions = new Float32Array(TRAIL_LEN * 3);
const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
const trailMat = new THREE.LineBasicMaterial({
  color: 0x33eeff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, toneMapped: false,
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

// ─── ARTICULATED ANIME SOCCER PLAYER RIG ────────────────────────────────────
const PLAYER_H = 1.8, PLAYER_R = 0.35;

const jerseyMat = new THREE.MeshToonMaterial({
  color: 0xd62839, emissive: 0x2b0008, gradientMap: toonGradTex,
});
const jerseyDarkMat = new THREE.MeshToonMaterial({
  color: 0x161b2e, gradientMap: toonGradTex,
});
const shortsMat = new THREE.MeshToonMaterial({
  color: 0x111827, gradientMap: toonGradTex,
});
const skinMat = new THREE.MeshToonMaterial({
  color: 0xf7cbb0, gradientMap: toonGradTex,
});
const hairMat = new THREE.MeshToonMaterial({
  color: 0x13172b, gradientMap: toonGradTex,
});
const accentMat = new THREE.MeshBasicMaterial({
  color: 0xff3355, toneMapped: false,
});
const visorMat = new THREE.MeshBasicMaterial({
  color: 0x00eeff, transparent: true, opacity: 0.68, toneMapped: false,
});
const eyeMat = new THREE.MeshBasicMaterial({
  color: 0xffffff, toneMapped: false,
});
const irisMat = new THREE.MeshBasicMaterial({
  color: 0x00ddff, toneMapped: false,
});
const cleatMat = new THREE.MeshToonMaterial({
  color: 0x18181f, gradientMap: toonGradTex,
});
const cleatGlowMat = new THREE.MeshBasicMaterial({
  color: 0xff3355, toneMapped: false,
});

const playerRig = new THREE.Group();
scene.add(playerRig);

const torsoGroup = new THREE.Group();
torsoGroup.position.set(0, 0.90, 0);
playerRig.add(torsoGroup);

// Athletic tapered waist, pelvis & V-shaped chest
const pelvisMesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.22), shortsMat);
pelvisMesh.position.set(0, 0.02, 0);
pelvisMesh.castShadow = true;
addOutline(pelvisMesh, 1.07);
torsoGroup.add(pelvisMesh);

const waistMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.20, 0.20), jerseyMat);
waistMesh.position.set(0, 0.18, 0);
waistMesh.castShadow = true;
addOutline(waistMesh, 1.07);
torsoGroup.add(waistMesh);

const chestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.41, 0.30, 0.23), jerseyMat);
chestMesh.position.set(0, 0.38, 0);
chestMesh.castShadow = true;
addOutline(chestMesh, 1.07);
torsoGroup.add(chestMesh);

const collarMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.06, 8), jerseyDarkMat);
collarMesh.position.set(0, 0.54, 0);
torsoGroup.add(collarMesh);

const chestSash = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.055, 0.24), accentMat);
chestSash.position.set(0, 0.41, 0);
torsoGroup.add(chestSash);

const sideTrimGeo = new THREE.BoxGeometry(0.036, 0.43, 0.225);
[-0.185, 0.185].forEach(sx => {
  const trim = new THREE.Mesh(sideTrimGeo, jerseyDarkMat);
  trim.position.set(sx, 0.31, 0);
  torsoGroup.add(trim);
});

[-0.042, 0.042].forEach(nx => {
  const numBar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.015), accentMat);
  numBar.position.set(nx, 0.35, 0.118);
  torsoGroup.add(numBar);
});

// Head & anime hair
const headGroup = new THREE.Group();
headGroup.position.set(0, 0.56, 0);
torsoGroup.add(headGroup);

const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.068, 0.09, 8), skinMat);
neckMesh.position.set(0, 0.04, 0);
headGroup.add(neckMesh);

const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), skinMat);
headMesh.position.set(0, 0.20, 0);
headMesh.castShadow = true;
addOutline(headMesh, 1.075);
headGroup.add(headMesh);

const chinMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.19), skinMat);
chinMesh.position.set(0, 0.085, -0.02);
addOutline(chinMesh, 1.07);
headGroup.add(chinMesh);

const eyeGeo = new THREE.BoxGeometry(0.056, 0.028, 0.018);
const irisGeo = new THREE.BoxGeometry(0.026, 0.022, 0.02);
[-0.062, 0.062].forEach((ex, idx) => {
  const eye = new THREE.Mesh(eyeGeo, eyeMat);
  eye.position.set(ex, 0.195, -0.132);
  eye.rotation.z = idx === 0 ? -0.14 : 0.14;
  headGroup.add(eye);

  const iris = new THREE.Mesh(irisGeo, irisMat);
  iris.position.set(ex, 0.195, -0.134);
  headGroup.add(iris);
});

const visorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.275, 0.06, 0.035), jerseyDarkMat);
visorFrame.position.set(0, 0.205, -0.128);
headGroup.add(visorFrame);

const visorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.255, 0.042, 0.04), visorMat);
visorGlass.position.set(0, 0.205, -0.133);
headGroup.add(visorGlass);

const headband = new THREE.Mesh(new THREE.BoxGeometry(0.282, 0.042, 0.282), accentMat);
headband.position.set(0, 0.268, 0);
headGroup.add(headband);

const tailGeo = new THREE.BoxGeometry(0.032, 0.19, 0.018);
const headbandTails: THREE.Mesh[] = [];
[-0.038, 0.038].forEach((tx, idx) => {
  const tail = new THREE.Mesh(tailGeo, accentMat);
  tail.position.set(tx, 0.21, 0.185);
  tail.rotation.x = 0.58;
  tail.rotation.z = idx === 0 ? 0.22 : -0.22;
  headGroup.add(tail);
  headbandTails.push(tail);
});

const hairCap = new THREE.Mesh(new THREE.BoxGeometry(0.285, 0.08, 0.285), hairMat);
hairCap.position.set(0, 0.32, 0.01);
addOutline(hairCap, 1.06);
headGroup.add(hairCap);

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
  headGroup.add(spike);
});

[-0.125, 0.125].forEach((bx, i) => {
  const sideLock = new THREE.Mesh(bangGeo, hairMat);
  sideLock.position.set(bx, 0.21, -0.09);
  sideLock.rotation.set(2.85, 0, i === 0 ? -0.18 : 0.18);
  headGroup.add(sideLock);
});

// Articulated Arms (Shoulder -> Upper Arm -> Elbow -> Forearm -> Hand)
interface ArmRig { shoulder: THREE.Group; elbow: THREE.Group; }
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

  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.09, 0.078), skinMat);
  hand.position.set(0, -0.245, -0.005);
  hand.castShadow = true;
  addOutline(hand, 1.09);
  elbow.add(hand);

  torsoGroup.add(shoulder);
  return { shoulder, elbow };
}
const leftArm  = makeArm(-1);
const rightArm = makeArm(1);

// Articulated Legs (Hip -> Thigh -> Knee -> Shin/Sock -> Cleat)
interface LegRig { hip: THREE.Group; knee: THREE.Group; }
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

  playerRig.add(hip);
  return { hip, knee };
}
const leftLeg  = makeLeg(-1);
const rightLeg = makeLeg(1);

// Awakening & Skill Burst Aura Meshes
const auraMat = new THREE.MeshBasicMaterial({
  color: 0xff2244, transparent: true, opacity: 0.25, toneMapped: false,
  side: THREE.DoubleSide, depthWrite: false,
});
const auraMesh = new THREE.Mesh(new THREE.SphereGeometry(1.35, 24, 24), auraMat);
auraMesh.visible = false;
scene.add(auraMesh);

const auraLight = new THREE.PointLight(0xff2244, 0, 14);
auraLight.visible = false;
scene.add(auraLight);

const zoneRingMat = new THREE.MeshBasicMaterial({
  color: 0xff2244, transparent: true, opacity: 0.5, toneMapped: false, side: THREE.DoubleSide,
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

const AIM_RADIUS = 58;
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
    aimOffsetX += e.movementX * 0.45;
    aimOffsetY += e.movementY * 0.45;
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
let jumpKickTimer = 0;

let currentPlaystyle: Playstyle = "EGOIST";
const skillCooldowns = new Map<string, number>();
let skillBoost: { kickMult: number; curve: number; timer: number } | null = null;

let awakeningGauge = 0;
let isAwakened = false;
let awakeningTimer = 0;
let activeAwakeningName = "";

const equippedSkills = (): SkillConfig[] => skillsForPlaystyle(currentPlaystyle).slice(0, 3);
const activeAwakening = () => awakeningForPlaystyle(currentPlaystyle);

function setPossession(possessed: boolean) {
  hasBall = possessed;
  if (possessed) {
    playerCollider.setCollisionGroups(PLAYER_GROUPS_POSS);
    ballCollider.setCollisionGroups(BALL_GROUPS_POSS);
    ballBody.setGravityScale(0, true);
    ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    ballBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
    activeBallSpin = 0;
    activeBallVertSpin = 0;
    pickupBlend = 0;
    trailMat.color.setHex(0x33eeff);
  } else {
    playerCollider.setCollisionGroups(PLAYER_GROUPS_FREE);
    ballCollider.setCollisionGroups(BALL_GROUPS_FREE);
    ballBody.setGravityScale(1, true);
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
  trailCount = 0;
  trailGeo.setDrawRange(0, 0);
  ballBody.setTranslation({ x, y: 1.2, z }, true);
  ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
  ballBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
}

// ─── PLAYSTYLE SWITCHING ────────────────────────────────────────────────────
function switchPlaystyle(ps: Playstyle) {
  currentPlaystyle = ps;
  skillBoost = null;
  if (isAwakened && activeAwakening().name !== activeAwakeningName) endAwakening();

  const accentHex = PLAYSTYLE_COLOR_INT[ps];
  jerseyMat.color.setHex(
    ps === "EGOIST" ? 0xd62839 : ps === "PLAYMAKER" ? 0xd99b00 :
    ps === "LOCKDOWN" ? 0x109960 : 0x0e8cd8
  );
  jerseyMat.emissive.setHex(
    ps === "EGOIST" ? 0x2b0008 : ps === "PLAYMAKER" ? 0x2b1d00 :
    ps === "LOCKDOWN" ? 0x002b18 : 0x001d2e
  );
  accentMat.color.setHex(accentHex);
  cleatGlowMat.color.setHex(accentHex);
  visorMat.color.setHex(ps === "EGOIST" ? 0xff4477 : ps === "PLAYMAKER" ? 0xffee33 :
                        ps === "LOCKDOWN" ? 0x00ffaa : 0x00eeff);
  irisMat.color.setHex(accentHex);

  if (!isAwakened) {
    auraMesh.visible = false;
    auraLight.visible = false;
    zoneRing.visible = false;
  }
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

// ─── SKILL VFX & BURST PARTICLES (pooled) ───────────────────────────────────
const VFX_GEO   = new THREE.RingGeometry(0.4, 0.65, 40);
const SPARK_GEO = new THREE.BoxGeometry(0.08, 0.28, 0.08);

interface SkillVfx { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; life: number; maxLife: number; }
const skillVfx: SkillVfx[] = [];
const vfxPool: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }[] = [];

interface BurstSpark {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial;
  vx: number; vy: number; vz: number; life: number; maxLife: number;
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

function spawnSparkBurst(x: number, y: number, z: number, color: number, count: number, speedScale = 1) {
  for (let i = 0; i < count; i++) {
    const item = acquireSparkMesh(color);
    const ang = (i / count) * Math.PI * 2 + (i % 3) * 0.25;
    const spd = (3.5 + (i % 4) * 1.4) * speedScale;
    item.mesh.position.set(x, y, z);
    item.mesh.rotation.set(ang * 0.5, ang, 0);
    item.mesh.scale.setScalar(1);
    activeSparks.push({
      mesh: item.mesh, mat: item.mat,
      vx: Math.cos(ang) * spd, vy: (2.2 + (i % 3) * 1.5) * speedScale, vz: Math.sin(ang) * spd,
      life: 0, maxLife: 0.42,
    });
  }
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
    sp.vy -= 8 * dt;
    sp.mat.opacity = 1 - t;
    sp.mesh.scale.setScalar(1 - t * 0.5);
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

// ─── SHOT & SKILL RELEASE ───────────────────────────────────────────────────
function fireShot(chargeNorm: number, kickMult: number, curveStrength: number, aimNx = 0, aimNy = 0) {
  const awakenMult = isAwakened ? activeAwakening().shotPowerMultiplier : 1;
  const clampedCharge = Math.max(0.18, Math.min(1.0, chargeNorm));

  // Mouse-aimed 8-way trajectory & spin:
  // aimNx (-1..+1): left/right curve spin + lateral trajectory bias
  // aimNy (-1..+1): negative = UP (lofted high shot), positive = DOWN (low driven dipper)
  const liftBias = -aimNy;
  const forwardSpeed = (14 + clampedCharge * 26) * kickMult * awakenMult * (1 + (aimNy > 0 ? aimNy * 0.12 : 0));
  const upwardSpeed  = Math.max(
    1.1,
    (3.2 + clampedCharge * 5.2 + liftBias * (3.6 + clampedCharge * 4.2)) * Math.min(kickMult, 1.3)
  );

  const pp = playerBody.translation();
  _fwdVec.set(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
  _rightVec.set(-_fwdVec.z, 0, _fwdVec.x);

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

  addGauge(8 + clampedCharge * 10);
  skillBoost = null;
}

// ─── SKILL TRIGGER ──────────────────────────────────────────────────────────
function triggerSkill(slot: number) {
  const skill = equippedSkills()[slot];
  if (!skill) return;
  if ((skillCooldowns.get(skill.id) ?? 0) > 0) return;
  if (stamina < skill.staminaCost) return;
  if (slideTimer > 0) return;

  stamina -= skill.staminaCost;
  skillCooldowns.set(skill.id, skill.cooldownSec);

  if (skill.dashImpulse > 0) {
    _fwdVec.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    playerBody.applyImpulse(
      { x: _fwdVec.x * skill.dashImpulse, y: 0, z: _fwdVec.z * skill.dashImpulse },
      true
    );
  }

  spawnSkillVfx(skill.vfxColor, true);

  if (hasBall && skill.dashImpulse === 0 && skill.kickPowerMultiplier > 1) {
    fireShot(0.88, skill.kickPowerMultiplier, skill.curveStrength, aimOffsetX / AIM_RADIUS, aimOffsetY / AIM_RADIUS);
    return;
  }

  skillBoost = { kickMult: skill.kickPowerMultiplier, curve: skill.curveStrength, timer: 2.0 };
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
  if (jumpKickTimer > 0) jumpKickTimer = Math.max(0, jumpKickTimer - dt);
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
function addGauge(amount: number) {
  if (isAwakened) return;
  awakeningGauge = Math.min(100, awakeningGauge + amount);
}

function tryAwaken() {
  if (!isAwakened && awakeningGauge >= 100) {
    const aw = activeAwakening();
    isAwakened = true;
    awakeningTimer = aw.durationSec;
    activeAwakeningName = aw.name;

    auraMat.color.set(aw.auraColor);
    auraLight.color.set(aw.auraColor);
    zoneRingMat.color.set(aw.auraColor);
    auraMesh.visible = true;
    auraLight.visible = true;
    zoneRing.visible = true;

    spawnSkillVfx(new THREE.Color(aw.auraColor).getHex(), true);

    awakenFlash.textContent = `AWAKENING — ${aw.name.toUpperCase()}`;
    awakenFlash.style.display = "block";
    setTimeout(() => { awakenFlash.style.display = "none"; }, 1800);
  }
}

function endAwakening() {
  isAwakened = false;
  awakeningTimer = 0;
  awakeningGauge = 0;
  activeAwakeningName = "";
  auraMesh.visible = false;
  auraLight.visible = false;
  zoneRing.visible = false;
}

function updateAwakening(dt: number) {
  if (!isAwakened) return;
  awakeningTimer -= dt;
  const aw = activeAwakening();
  awakeningGauge = Math.max(0, (awakeningTimer / aw.durationSec) * 100);
  if (awakeningTimer <= 0) { endAwakening(); return; }

  const t = performance.now();
  const pulse = 1 + Math.sin(t * 0.008) * 0.12;
  const pp = playerBody.translation();
  auraMesh.position.set(pp.x, pp.y, pp.z);
  auraMesh.scale.setScalar(pulse);
  auraLight.position.set(pp.x, pp.y + 0.5, pp.z);
  auraLight.intensity = 2.5 + Math.sin(t * 0.008) * 1.2;
  zoneRing.position.set(pp.x, 0.04, pp.z);
  const rp = 1 + Math.sin(t * 0.005) * 0.04;
  zoneRing.scale.set(rp, rp, 1);
  zoneRingMat.opacity = 0.35 + Math.sin(t * 0.005) * 0.2;
}

// ─── HUD (throttled) ─────────────────────────────────────────────────────────
const HUD_UPDATE_INTERVAL = 1 / 20;
let hudAccum = 0;
const hudDirty = { playstyle: true };
let prevScore = "", prevStamW = "", prevGaugeVis = "", prevGaugeH = "", prevGaugeColor = "";
let prevAimVis = "", prevAimX = -999, prevAimY = -999, prevAimDir = "";
let prevPsText = "", prevAwW = "", prevAwReadyVis = "", prevAwLabelTxt = "";

function getAimDirectionLabel(nx: number, ny: number): string {
  if (Math.hypot(nx, ny) < 0.2) return "CENTER";
  const angle = Math.atan2(ny, nx);
  const octant = Math.round(angle / (Math.PI / 4));
  switch (octant) {
    case 0:  return "RIGHT";
    case 1:  return "DOWN-RIGHT";
    case 2:  return "DOWN";
    case 3:  return "DOWN-LEFT";
    case 4:
    case -4: return "LEFT";
    case -3: return "UP-LEFT";
    case -2: return "UP";
    case -1: return "UP-RIGHT";
    default: return "CENTER";
  }
}

function updateHUD(dt: number) {
  // Immediate smooth reticle tracking while charging
  const showAim = isCharging && hasBall && isLocked;
  const aimVis = showAim ? "block" : "none";
  if (aimVis !== prevAimVis) {
    aimReticle.style.display = aimVis;
    prevAimVis = aimVis;
  }
  if (showAim && (aimOffsetX !== prevAimX || aimOffsetY !== prevAimY)) {
    prevAimX = aimOffsetX;
    prevAimY = aimOffsetY;
    aimDot.style.transform = `translate(${aimOffsetX.toFixed(1)}px, ${aimOffsetY.toFixed(1)}px)`;
    const len = Math.hypot(aimOffsetX, aimOffsetY);
    const deg = (Math.atan2(aimOffsetY, aimOffsetX) * 180) / Math.PI;
    aimLine.style.width = `${len.toFixed(1)}px`;
    aimLine.style.transform = `rotate(${deg.toFixed(1)}deg)`;
    const dirLbl = getAimDirectionLabel(aimOffsetX / AIM_RADIUS, aimOffsetY / AIM_RADIUS);
    if (dirLbl !== prevAimDir) {
      aimDirLabel.textContent = dirLbl;
      prevAimDir = dirLbl;
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
    const col = `hsl(${hue}, 96%, 50%)`;
    if (gaugeH !== prevGaugeH) {
      powerGaugeFill.style.height = gaugeH;
      powerGaugePct.textContent = `${pct}%`;
      prevGaugeH = gaugeH;
    }
    if (col !== prevGaugeColor) {
      powerGaugeFill.style.background = col;
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

  const awW = `${awakeningGauge.toFixed(1)}%`;
  if (awW !== prevAwW) { awBar.style.width = awW; prevAwW = awW; }

  const awReadyVis = (!isAwakened && awakeningGauge >= 100) ? "block" : "none";
  if (awReadyVis !== prevAwReadyVis) { awReady.style.display = awReadyVis; prevAwReadyVis = awReadyVis; }

  const awLabelTxt = isAwakened
    ? `${activeAwakeningName.toUpperCase()} ${awakeningTimer.toFixed(1)}s`
    : awakeningGauge >= 100 ? "PRESS R" : `GAUGE ${Math.floor(awakeningGauge)}%`;
  if (awLabelTxt !== prevAwLabelTxt) { awLabel.textContent = awLabelTxt; prevAwLabelTxt = awLabelTxt; }

  updateSkillPanel();
}

// ─── GOAL DETECTION ─────────────────────────────────────────────────────────
function checkGoal() {
  const bp = ballBody.translation();
  if (Math.abs(bp.z) < GOAL_W / 2 && bp.y < GOAL_H + 0.3) {
    if (bp.x < -hw - 0.25) { score[1]++; resetBall(); return; }
    if (bp.x >  hw + 0.25) { score[0]++; resetBall(); return; }
  }
}

// ─── GROUNDED CHECK ─────────────────────────────────────────────────────────
function checkGrounded() {
  const pp  = playerBody.translation();
  const ray = new RAPIER.Ray({ x: pp.x, y: pp.y - PLAYER_H / 2 - 0.02, z: pp.z }, { x: 0, y: -1, z: 0 });
  const hit = world.castRay(ray, 0.25, true);
  isGrounded = hit !== null && hit.timeOfImpact < 0.2;
}

// ─── POSSESSION, DRIBBLE POCKET & SHOT ──────────────────────────────────────
const PICKUP_RANGE = 1.45;
const DRIBBLE_POCKET_DIST = 1.1;

function tryPickupBall() {
  if (hasBall || pickupCooldown > 0) return;
  const pp = playerBody.translation();
  const bp = ballBody.translation();
  const dist = Math.hypot(bp.x - pp.x, bp.z - pp.z);
  if (dist < PICKUP_RANGE && bp.y <= PLAYER_H + 0.25) {
    setPossession(true);
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

  if (!isCharging && playerSpeed > 1.5) addGauge(7 * dt);

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
  if (hasBall || (Math.abs(activeBallSpin) < 0.01 && Math.abs(activeBallVertSpin) < 0.01)) return;
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

// ─── JUMP KICK / OVERHEAD FLICK ─────────────────────────────────────────────
function performJumpKickFlick() {
  const pp = playerBody.translation();
  const pv = playerBody.linvel();
  _fwdVec.set(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();

  const fwdVel = Math.max(0, pv.x * _fwdVec.x + pv.z * _fwdVec.z);
  const flickHoriz = Math.max(8.5, fwdVel * 0.8 + 6.5);
  const flickUp = 12.2;

  setPossession(false);
  pickupCooldown = 0.35;
  isGrounded = false;
  jumpKickTimer = 0.44;
  activeBallVertSpin = 0.45;

  trailMat.color.setHex(PLAYSTYLE_COLOR_INT[currentPlaystyle]);

  const launchX = THREE.MathUtils.clamp(pp.x + _fwdVec.x * 0.95, -hw + BALL_R + 0.1, hw - BALL_R - 0.1);
  const launchZ = THREE.MathUtils.clamp(pp.z + _fwdVec.z * 0.95, -hd + BALL_R + 0.1, hd - BALL_R - 0.1);
  ballBody.setTranslation({ x: launchX, y: Math.max(0.65, pp.y - 0.2), z: launchZ }, true);
  ballBody.setLinvel({
    x: _fwdVec.x * flickHoriz,
    y: flickUp,
    z: _fwdVec.z * flickHoriz,
  }, true);
  ballBody.setAngvel({ x: -_fwdVec.z * 12, y: 0, z: _fwdVec.x * 12 }, true);

  playerBody.applyImpulse({ x: _fwdVec.x * 2.1, y: 5.1, z: _fwdVec.z * 2.1 }, true);
  spawnSparkBurst(launchX, 0.35, launchZ, PLAYSTYLE_COLOR_INT[currentPlaystyle], 10, 0.85);
  addGauge(8);
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
  const speed     = baseSpeed * awakenSpeed;

  if (sprinting) stamina = Math.max(0, stamina - 25 * dt);
  else           stamina = Math.min(100, stamina + 15 * dt);

  if (mouseRight && slideTimer <= 0 && isGrounded) {
    slideTimer = SLIDE_COOLDOWN;
    const impulse = SPEED_SLIDE * 1.5;
    playerBody.applyImpulse({ x: _fwdVec.x * impulse, y: 0, z: _fwdVec.z * impulse }, true);
    addGauge(6);
    if (hasBall) {
      fireShot(0.25, 1.0, 0, 0, 0);
    } else {
      const pp = playerBody.translation();
      const bp = ballBody.translation();
      if (Math.hypot(bp.x - pp.x, bp.z - pp.z) < 3.0) addGauge(14);
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
      performJumpKickFlick();
    } else {
      isGrounded = false;
      playerBody.applyImpulse({ x: 0, y: 4.7, z: 0 }, true);
    }
  }
}

// ─── ARTICULATED PLAYER ANIMATION ───────────────────────────────────────────
function updatePlayerRig(dt: number) {
  const pp = playerBody.translation();
  const pv = playerBody.linvel();
  const horizSpeed = Math.hypot(pv.x, pv.z);

  playerRig.position.set(pp.x, pp.y - PLAYER_H / 2, pp.z);
  playerRig.rotation.y = playerFacingYaw;

  rigAnimSpeed = THREE.MathUtils.lerp(rigAnimSpeed, horizSpeed, 1 - Math.exp(-15 * dt));
  const normSpeed = Math.min(1, rigAnimSpeed / SPEED_SPRINT);

  // Subtle headband ribbon flutter
  const flutter = Math.sin(performance.now() * 0.012) * (0.08 + normSpeed * 0.25);
  headbandTails[0].rotation.x = 0.55 + normSpeed * 0.55 + flutter;
  headbandTails[1].rotation.x = 0.55 + normSpeed * 0.55 - flutter;

  // Slide tackle pose
  if (slideTimer > SLIDE_COOLDOWN - 24) {
    torsoGroup.rotation.set(0.74, -0.15, 0);
    torsoGroup.position.y = 0.58;
    rightLeg.hip.rotation.x  = 1.25;
    rightLeg.knee.rotation.x = -0.15;
    leftLeg.hip.rotation.x   = -0.55;
    leftLeg.knee.rotation.x  = -0.95;
    leftArm.shoulder.rotation.set(-0.65, 0, -0.35);
    leftArm.elbow.rotation.x  = 0.45;
    rightArm.shoulder.rotation.set(0.45, 0, 0.3);
    rightArm.elbow.rotation.x = 0.75;
    return;
  }

  // Overhead / jump-kick flick pose
  if (jumpKickTimer > 0) {
    const p = 1 - jumpKickTimer / 0.44;
    const whip = Math.sin(p * Math.PI);
    torsoGroup.rotation.set(0.42 * whip, -0.25 * whip, 0);
    torsoGroup.position.y = 0.94;
    rightLeg.hip.rotation.x  = 1.55 * whip;
    rightLeg.knee.rotation.x = -0.35 * (1 - whip);
    leftLeg.hip.rotation.x   = -0.45 * whip;
    leftLeg.knee.rotation.x  = -0.95 * whip;
    leftArm.shoulder.rotation.set(0.5 * whip, 0, -0.65 * whip);
    leftArm.elbow.rotation.x  = 0.55;
    rightArm.shoulder.rotation.set(-0.55 * whip, 0, 0.65 * whip);
    rightArm.elbow.rotation.x = 0.65;
    return;
  }

  // Shot follow-through kick swing
  if (kickAnimTimer > 0) {
    const p = 1 - kickAnimTimer / 0.28;
    const follow = Math.sin(p * Math.PI);
    torsoGroup.rotation.set(-0.22 * follow, 0.35 * follow, 0);
    torsoGroup.position.y = 0.90;
    rightLeg.hip.rotation.x  = 1.25 * follow;
    rightLeg.knee.rotation.x = -0.25 * (1 - follow);
    leftLeg.hip.rotation.x   = -0.25;
    leftLeg.knee.rotation.x  = -0.22;
    leftArm.shoulder.rotation.set(0.85 * follow, 0, -0.38);
    leftArm.elbow.rotation.x  = 0.75;
    rightArm.shoulder.rotation.set(-0.65 * follow, 0, 0.28);
    rightArm.elbow.rotation.x = 0.6;
    return;
  }

  // Shot charging wind-up
  if (isCharging && hasBall) {
    const c = shotCharge / 100;
    torsoGroup.rotation.set(0.12 * c, -0.32 * c, 0);
    torsoGroup.position.y = 0.88 - c * 0.04;
    rightLeg.hip.rotation.x  = -0.82 * c;
    rightLeg.knee.rotation.x = -1.05 * c;
    leftLeg.hip.rotation.x   = 0.18 * c;
    leftLeg.knee.rotation.x  = -0.22 * c;
    leftArm.shoulder.rotation.set(0.35 * c, 0, -0.58 * c);
    leftArm.elbow.rotation.x  = 0.55;
    rightArm.shoulder.rotation.set(-0.45 * c, 0, 0.35 * c);
    rightArm.elbow.rotation.x = 0.85;
    return;
  }

  // Normal airborne tuck
  if (!isGrounded) {
    torsoGroup.rotation.set(-0.15, 0, 0);
    torsoGroup.position.y = 0.92;
    leftLeg.hip.rotation.x   = 0.45;
    leftLeg.knee.rotation.x  = -0.85;
    rightLeg.hip.rotation.x  = 0.22;
    rightLeg.knee.rotation.x = -0.65;
    leftArm.shoulder.rotation.set(0.45, 0, -0.45);
    leftArm.elbow.rotation.x  = 0.65;
    rightArm.shoulder.rotation.set(0.45, 0, 0.45);
    rightArm.elbow.rotation.x = 0.65;
    return;
  }

  // Running / Dribbling / Idle stride
  if (rigAnimSpeed > 0.3) {
    runCycle += dt * (5.8 + rigAnimSpeed * 0.85);
  }
  const swing = Math.sin(runCycle) * normSpeed * 0.95;

  leftLeg.hip.rotation.x   =  swing;
  rightLeg.hip.rotation.x  = -swing;
  leftLeg.knee.rotation.x  = -Math.max(0, -swing) * 0.85 - normSpeed * 0.12;
  rightLeg.knee.rotation.x = -Math.max(0,  swing) * 0.85 - normSpeed * 0.12;

  const armSpread = hasBall ? 0.22 : 0.10 + normSpeed * 0.08;
  leftArm.shoulder.rotation.set(-swing * 0.85, 0, -armSpread);
  rightArm.shoulder.rotation.set( swing * 0.85, 0,  armSpread);
  leftArm.elbow.rotation.x  = 0.35 + normSpeed * 0.65 + Math.max(0, -swing) * 0.25;
  rightArm.elbow.rotation.x = 0.35 + normSpeed * 0.65 + Math.max(0,  swing) * 0.25;

  torsoGroup.rotation.set(-normSpeed * (hasBall ? 0.26 : 0.20), swing * 0.12, 0);
  torsoGroup.position.y = 0.90 + Math.abs(Math.sin(runCycle)) * 0.045 * normSpeed;
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

// ─── TRAIL ──────────────────────────────────────────────────────────────────
function updateTrail() {
  const bp = ballBody.translation();
  const attr = trailGeo.attributes["position"] as THREE.BufferAttribute;
  const arr = attr.array as Float32Array;

  if (trailCount > 0) {
    const lastIdx = (trailCount - 1) * 3;
    if (arr[lastIdx] === bp.x && arr[lastIdx + 1] === bp.y && arr[lastIdx + 2] === bp.z) {
      return;
    }
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
  const dt  = Math.min((now - lastTime) / 1000, 0.05);
  lastTime  = now;

  handlePlaystyleKeys();
  handleSkillKeys();
  if (keyJustPressed["KeyR"]) tryAwaken();
  for (const k of Object.keys(keyJustPressed)) keyJustPressed[k] = false;

  updateCooldowns(dt);
  tryPickupBall();

  physicsAccum += dt;
  while (physicsAccum >= FIXED_DT) {
    world.step();
    physicsAccum -= FIXED_DT;
  }

  checkGrounded();
  movePlayer(dt);
  tryPickupBall();
  updatePossessionAndShoot(dt);
  applyMagnus(dt);
  checkGoal();
  updateAwakening(dt);
  updateSkillVfx(dt);
  updatePlayerRig(dt);

  const bp = ballBody.translation();
  ballVisual.position.set(bp.x, bp.y, bp.z);
  if (hasBall) {
    const pv = playerBody.linvel();
    const spd = Math.hypot(pv.x, pv.z);
    ballCore.rotation.x -= spd * dt * 2.2;
  } else {
    const bav = ballBody.angvel();
    ballCore.rotation.x += bav.x * FIXED_DT;
    ballCore.rotation.y += bav.y * FIXED_DT;
    ballCore.rotation.z += bav.z * FIXED_DT;
  }

  updateTrail();
  updateCamera();
  updateHUD(dt);

  renderer.render(scene, camera);
}

animate();
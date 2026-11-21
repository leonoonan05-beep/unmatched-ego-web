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
<div style="position:absolute;bottom:40px;left:24px;width:160px;">
  <div style="font-size:.7rem;letter-spacing:2px;margin-bottom:3px;">STAMINA</div>
  <div style="background:rgba(0,0,0,.5);border:1px solid #0ff;height:10px;border-radius:4px;">
    <div id="stam-bar" style="height:100%;width:100%;background:linear-gradient(90deg,#0ff,#0af);border-radius:4px;transition:width .1s;"></div>
  </div>
  <div style="font-size:.7rem;letter-spacing:2px;margin-top:8px;margin-bottom:3px;">SHOT POWER</div>
  <div style="background:rgba(0,0,0,.5);border:1px solid #f0a;height:10px;border-radius:4px;">
    <div id="shot-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#f0a,#f50);border-radius:4px;transition:width .05s;"></div>
  </div>
  <div id="curve-ind" style="font-size:.8rem;letter-spacing:3px;margin-top:8px;color:#ff0;text-shadow:0 0 8px #ff0;">CURVE: NONE</div>
  <div style="font-size:.7rem;letter-spacing:2px;margin-top:10px;margin-bottom:3px;">AWAKENING <span id="aw-key-hint" style="color:#0ff;">[R]</span></div>
  <div style="background:rgba(0,0,0,.5);border:1px solid #f5f;height:10px;border-radius:4px;position:relative;">
    <div id="aw-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#f0f,#f5f);border-radius:4px;transition:width .15s;"></div>
    <div id="aw-ready" style="display:none;position:absolute;top:-2px;left:0;width:100%;text-align:center;font-size:.55rem;
      letter-spacing:2px;color:#fff;text-shadow:0 0 8px #f5f,0 0 16px #f5f;">READY</div>
  </div>
  <div id="aw-label" style="font-size:.65rem;letter-spacing:2px;margin-top:3px;color:#f8f;opacity:.85;"></div>
</div>
<div id="skill-panel" style="position:absolute;bottom:40px;right:24px;display:flex;gap:8px;"></div>
<div id="awaken-flash" style="position:absolute;top:38%;left:50%;transform:translate(-50%,-50%);display:none;
  font-size:1.6rem;font-weight:bold;letter-spacing:6px;color:#fff;text-shadow:0 0 16px #f5f,0 0 32px #f5f;"></div>
<div id="lock-prompt" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  font-size:1.1rem;letter-spacing:2px;background:rgba(0,0,0,.6);padding:12px 24px;border:1px solid #0ff;border-radius:8px;">
  CLICK TO PLAY
</div>`;
document.body.appendChild(hud);

const scoreEl      = document.getElementById("score")!;
const stamBar      = document.getElementById("stam-bar")! as HTMLElement;
const shotBar      = document.getElementById("shot-bar")! as HTMLElement;
const curveInd     = document.getElementById("curve-ind")!;
const lockPrompt   = document.getElementById("lock-prompt")!;
const playstyleTag = document.getElementById("playstyle-tag")!;
const skillPanel   = document.getElementById("skill-panel")!;
const awBar        = document.getElementById("aw-bar")! as HTMLElement;
const awReady      = document.getElementById("aw-ready")! as HTMLElement;
const awLabel      = document.getElementById("aw-label")!;
const awakenFlash  = document.getElementById("awaken-flash")!;

const PLAYSTYLE_KEYS: Record<Playstyle, string> = {
  EGOIST: "1", PLAYMAKER: "2", LOCKDOWN: "3", SPEEDSTER: "4",
};
const PLAYSTYLE_HEX: Record<Playstyle, string> = {
  EGOIST: "#ff3355", PLAYMAKER: "#ffcc00", LOCKDOWN: "#00ff88", SPEEDSTER: "#00ccff",
};
const SKILL_KEYS = ["Z", "X", "C"];

// ─── SCENE / RENDERER ───────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // cap DPR
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);
scene.fog = new THREE.Fog(0x0a0a1a, 60, 120);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 300);

window.addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

// ─── LIGHTING ───────────────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0x112244, 0.8);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(10, 30, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024); // reduced from 2048
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 150;
sun.shadow.camera.left = -60;
sun.shadow.camera.right = 60;
sun.shadow.camera.top = 60;
sun.shadow.camera.bottom = -60;
scene.add(sun);

const floodColors = [0x00ffff, 0xff00aa, 0x00ffff, 0xff00aa];
const floodPositions = [[-30, 20, -20], [30, 20, -20], [-30, 20, 20], [30, 20, 20]] as const;
floodPositions.forEach(([x, y, z], i) => {
  const fl = new THREE.PointLight(floodColors[i], 1.5, 80);
  fl.position.set(x, y, z);
  scene.add(fl);
});

// ─── PITCH ──────────────────────────────────────────────────────────────────
const PITCH_W = 52, PITCH_H = 0.3, PITCH_D = 34;

const pitchMesh = new THREE.Mesh(
  new THREE.BoxGeometry(PITCH_W, PITCH_H, PITCH_D),
  new THREE.MeshStandardMaterial({ color: 0x1a4a1a, roughness: 0.9, metalness: 0 })
);
pitchMesh.receiveShadow = true;
pitchMesh.position.y = -PITCH_H / 2;
scene.add(pitchMesh);

function makeLine(points: THREE.Vector3[], color = 0x00ffff) {
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color, toneMapped: false });
  mat.color.multiplyScalar(2);
  const line = new THREE.Line(geo, mat);
  line.position.y = 0.02;
  scene.add(line);
}

const hw = PITCH_W / 2, hd = PITCH_D / 2;
makeLine([new THREE.Vector3(-hw, 0, -hd), new THREE.Vector3(hw, 0, -hd),
          new THREE.Vector3(hw, 0, hd),   new THREE.Vector3(-hw, 0, hd),
          new THREE.Vector3(-hw, 0, -hd)]);
makeLine([new THREE.Vector3(0, 0, -hd), new THREE.Vector3(0, 0, hd)]);
{
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * 7, 0, Math.sin(a) * 7));
  }
  makeLine(pts);
}
[-1, 1].forEach(side => {
  const bx = side * (hw - 11), bz = 10;
  makeLine([new THREE.Vector3(side * hw, 0, -bz), new THREE.Vector3(bx, 0, -bz),
            new THREE.Vector3(bx, 0, bz),          new THREE.Vector3(side * hw, 0, bz)]);
});

// ─── WALLS ──────────────────────────────────────────────────────────────────
const wallMat = new THREE.MeshStandardMaterial({
  color: 0x223355, roughness: 0.5, metalness: 0.3, transparent: true, opacity: 0.5,
});
function makeWall(w: number, h: number, d: number, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  scene.add(mesh);
}
const wallH = 6;
makeWall(PITCH_W, wallH, 0.5, 0, wallH / 2, -hd);
makeWall(PITCH_W, wallH, 0.5, 0, wallH / 2, hd);
makeWall(0.5, wallH, PITCH_D, -hw, wallH / 2, 0);
makeWall(0.5, wallH, PITCH_D, hw, wallH / 2, 0);

// ─── GOALS ──────────────────────────────────────────────────────────────────
const GOAL_W = 7.32, GOAL_H = 2.44, GOAL_D = 2;
const goalMat  = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.7 });
const goalPost = new THREE.CylinderGeometry(0.06, 0.06, GOAL_H, 8);
const goalBar  = new THREE.CylinderGeometry(0.06, 0.06, GOAL_W, 8);
const goalNetGeo    = new THREE.PlaneGeometry(GOAL_W, GOAL_H);
const goalTopNetGeo = new THREE.PlaneGeometry(GOAL_D, GOAL_W);
const netMatBase = new THREE.MeshStandardMaterial({
  color: 0xffffff, transparent: true, opacity: 0.15, side: THREE.DoubleSide,
});

function buildGoal(side: number) {
  const gx = side * (hw + GOAL_D / 2);
  [-GOAL_W / 2, GOAL_W / 2].forEach(zo => {
    const post = new THREE.Mesh(goalPost, goalMat);
    post.position.set(gx, GOAL_H / 2, zo);
    post.castShadow = true;
    scene.add(post);
  });
  const bar = new THREE.Mesh(goalBar, goalMat);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(gx, GOAL_H, 0);
  scene.add(bar);
  const net = new THREE.Mesh(goalNetGeo, netMatBase);
  net.position.set(gx + side * GOAL_D / 2, GOAL_H / 2, 0);
  net.rotation.y = Math.PI / 2;
  scene.add(net);
  const topNet = new THREE.Mesh(goalTopNetGeo, netMatBase);
  topNet.position.set(gx + side * GOAL_D / 2, GOAL_H, 0);
  topNet.rotation.x = Math.PI / 2;
  topNet.rotation.z = Math.PI / 2;
  scene.add(topNet);
}
buildGoal(-1);
buildGoal(1);

// ─── RAPIER PHYSICS ─────────────────────────────────────────────────────────
await RAPIER.init();
const world = new RAPIER.World({ x: 0, y: -20, z: 0 });

// Fixed physics timestep
const FIXED_DT = 1 / 60;
let physicsAccum = 0;

function makeStaticBox(hx: number, hy: number, hz: number, x: number, y: number, z: number) {
  const desc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z);
  const body = world.createRigidBody(desc);
  world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz), body);
  return body;
}

makeStaticBox(PITCH_W / 2, PITCH_H / 2, PITCH_D / 2, 0, -PITCH_H / 2, 0);
makeStaticBox(PITCH_W / 2, wallH / 2, 0.25, 0, wallH / 2, -hd);
makeStaticBox(PITCH_W / 2, wallH / 2, 0.25, 0, wallH / 2, hd);
makeStaticBox(0.25, wallH / 2, PITCH_D / 2, -hw, wallH / 2, 0);
makeStaticBox(0.25, wallH / 2, PITCH_D / 2, hw, wallH / 2, 0);

// ─── BALL ───────────────────────────────────────────────────────────────────
const BALL_R = 0.22;
const ballMesh = new THREE.Mesh(
  new THREE.SphereGeometry(BALL_R, 16, 16),
  new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0x00aaff, emissiveIntensity: 0.4,
    roughness: 0.3, metalness: 0.1,
  })
);
ballMesh.castShadow = true;
scene.add(ballMesh);

// Ball trail
const TRAIL_LEN = 30;
const trailPositions = new Float32Array(TRAIL_LEN * 3);
const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
const trailLine = new THREE.Line(trailGeo,
  new THREE.LineBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.6, toneMapped: false })
);
scene.add(trailLine);
const trailHistory: THREE.Vector3[] = [];

const ballBodyDesc = RAPIER.RigidBodyDesc.dynamic()
  .setTranslation(0, 1, 0).setLinearDamping(0.5).setAngularDamping(0.4);
const ballBody = world.createRigidBody(ballBodyDesc);
const ballCollider = world.createCollider(
  RAPIER.ColliderDesc.ball(BALL_R).setRestitution(0.6).setFriction(0.4), ballBody
);
void ballCollider;

function resetBall(x = 0, z = 0) {
  ballBody.setTranslation({ x, y: 1.2, z }, true);
  ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
  ballBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
}

// ─── PLAYER ─────────────────────────────────────────────────────────────────
const PLAYER_H = 1.8, PLAYER_R = 0.35;
const playerMat = new THREE.MeshStandardMaterial({
  color: 0x224488, emissive: 0x001133, roughness: 0.5, metalness: 0.3,
});
const playerMesh = new THREE.Mesh(
  new THREE.CapsuleGeometry(PLAYER_R, PLAYER_H - PLAYER_R * 2, 8, 16), playerMat
);
playerMesh.castShadow = true;
scene.add(playerMesh);

const eyeGeo = new THREE.SphereGeometry(0.07, 8, 8);
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 1 });
[-0.15, 0.15].forEach(ex => {
  const eye = new THREE.Mesh(eyeGeo, eyeMat);
  eye.position.set(ex, 0.65, -PLAYER_R + 0.04);
  playerMesh.add(eye);
});

// Shared awakening geometry/materials (created once)
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

const playerBodyDesc = RAPIER.RigidBodyDesc.dynamic()
  .setTranslation(0, PLAYER_H / 2, 5).lockRotations();
const playerBody = world.createRigidBody(playerBodyDesc);
world.createCollider(
  RAPIER.ColliderDesc.capsule(PLAYER_H / 2 - PLAYER_R, PLAYER_R).setFriction(0.1), playerBody
);

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

document.addEventListener("pointerlockchange", () => {
  isLocked = document.pointerLockElement === renderer.domElement;
  lockPrompt.style.display = isLocked ? "none" : "block";
});
renderer.domElement.addEventListener("click", () => { renderer.domElement.requestPointerLock(); });
document.addEventListener("mousemove", e => {
  if (!isLocked) return;
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

let currentPlaystyle: Playstyle = "EGOIST";
const skillCooldowns = new Map<string, number>();
let skillBoost: { kickMult: number; curve: number; timer: number } | null = null;

let awakeningGauge = 0;
let isAwakened = false;
let awakeningTimer = 0;
let activeAwakeningName = "";

const equippedSkills = (): SkillConfig[] => skillsForPlaystyle(currentPlaystyle).slice(0, 3);
const activeAwakening = () => awakeningForPlaystyle(currentPlaystyle);

// ─── PLAYSTYLE SWITCHING ────────────────────────────────────────────────────
function switchPlaystyle(ps: Playstyle) {
  currentPlaystyle = ps;
  skillBoost = null;
  if (isAwakened && activeAwakening().name !== activeAwakeningName) endAwakening();
  playerMat.color.set(ps === "EGOIST" ? 0x882233 : ps === "PLAYMAKER" ? 0x887722 :
                      ps === "LOCKDOWN" ? 0x228855 : 0x227799);
  playerMat.emissive.set(ps === "EGOIST" ? 0x330011 : ps === "PLAYMAKER" ? 0x332200 :
                         ps === "LOCKDOWN" ? 0x003322 : 0x002233);
  if (!isAwakened) {
    auraMesh.visible = false;
    auraLight.visible = false;
    zoneRing.visible = false;
  }
  buildSkillPanel();
  hudDirty.playstyle = true;
}

function handlePlaystyleKeys() {
  (["Digit1", "Digit2", "Digit3", "Digit4"] as const).forEach((code, i) => {
    if (keyJustPressed[code]) switchPlaystyle(PLAYSTYLES[i]);
  });
}

// ─── SKILL PANEL (rebuild on playstyle change only) ─────────────────────────
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

// Cache skill panel element refs after each rebuild
let skillCdEls:   (HTMLElement | null)[] = [];
let skillFillEls: (HTMLElement | null)[] = [];
function cacheSkillPanelEls() {
  skillCdEls   = [0, 1, 2].map(i => document.getElementById(`skill-cd-${i}`));
  skillFillEls = [0, 1, 2].map(i => document.getElementById(`skill-cd-fill-${i}`));
}

// Throttle skill panel: only write DOM when values cross meaningful thresholds
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
    if (prevSkillCdText[i] !== text) {
      cdEl.textContent = text;
      cdEl.style.color = color;
      prevSkillCdText[i] = text;
    }
    if (prevSkillFillH[i] !== fillH) {
      fillEl.style.height = fillH;
      prevSkillFillH[i] = fillH;
    }
  });
}

// ─── SKILL VFX (pool ring geometry/material) ─────────────────────────────────
const VFX_GEO = new THREE.RingGeometry(0.4, 0.65, 40);
interface SkillVfx { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; life: number; maxLife: number; }
const skillVfx: SkillVfx[] = [];
// Pool of inactive meshes to reuse
const vfxPool: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }[] = [];

function acquireVfxMesh(color: number): { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial } {
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

function releaseVfxMesh(item: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }) {
  item.mesh.visible = false;
  vfxPool.push(item);
}

function spawnSkillVfx(color: number) {
  const pp   = playerBody.translation();
  const item = acquireVfxMesh(color);
  item.mesh.position.set(pp.x, 0.06, pp.z);
  item.mesh.scale.set(1, 1, 1);
  skillVfx.push({ mesh: item.mesh, mat: item.mat, life: 0, maxLife: 0.5 });
}

function updateSkillVfx(dt: number) {
  for (let i = skillVfx.length - 1; i >= 0; i--) {
    const v = skillVfx[i];
    v.life += dt;
    const t = v.life / v.maxLife;
    if (t >= 1) {
      releaseVfxMesh({ mesh: v.mesh, mat: v.mat });
      skillVfx.splice(i, 1);
      continue;
    }
    const s = 1 + t * 6;
    v.mesh.scale.set(s, s, s);
    v.mat.opacity = 0.9 * (1 - t);
  }
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
    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    playerBody.applyImpulse(
      { x: fwd.x * skill.dashImpulse, y: 0, z: fwd.z * skill.dashImpulse }, true
    );
  }

  skillBoost = { kickMult: skill.kickPowerMultiplier, curve: skill.curveStrength, timer: 2.0 };
  spawnSkillVfx(skill.vfxColor);
}

function handleSkillKeys() {
  if (!isLocked) return;
  if (keyJustPressed["KeyZ"]) triggerSkill(0);
  if (keyJustPressed["KeyX"]) triggerSkill(1);
  if (keyJustPressed["KeyC"]) triggerSkill(2);
}

function updateCooldowns(dt: number) {
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

// ─── HUD (throttled dirty-flag updates) ─────────────────────────────────────
// Only write to DOM when values change beyond a threshold
const HUD_UPDATE_INTERVAL = 1 / 20; // 20 Hz cap for most HUD elements
let hudAccum = 0;

const hudDirty = {
  score: true, stam: true, shot: true, curve: true, playstyle: true, aw: true,
};

// Previous HUD values for change detection
let prevScore      = "";
let prevStamW      = "";
let prevShotW      = "";
let prevCurve      = "";
let prevPsText     = "";
let prevAwW        = "";
let prevAwReadyVis = "";
let prevAwLabelTxt = "";

function updateHUD(dt: number) {
  hudAccum += dt;
  if (hudAccum < HUD_UPDATE_INTERVAL) return;
  hudAccum = 0;

  // Score
  const scoreStr = `${score[0]} — ${score[1]}`;
  if (scoreStr !== prevScore) { scoreEl.textContent = scoreStr; prevScore = scoreStr; }

  // Stamina
  const stamW = `${stamina.toFixed(1)}%`;
  if (stamW !== prevStamW) { stamBar.style.width = stamW; prevStamW = stamW; }

  // Shot
  const shotW = `${shotCharge.toFixed(1)}%`;
  if (shotW !== prevShotW) { shotBar.style.width = shotW; prevShotW = shotW; }

  // Curve
  const curve = keys["KeyQ"] ? "◄ L" : keys["KeyE"] ? "R ►" : "NONE";
  const curveStr = `CURVE: ${curve}`;
  if (curveStr !== prevCurve) { curveInd.textContent = curveStr; prevCurve = curveStr; }

  // Playstyle tag (only on playstyle change)
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

  // Awakening bar
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
    if (bp.x < -hw - 0.2) { score[1]++; resetBall(); return; }
    if (bp.x >  hw + 0.2) { score[0]++; resetBall(); return; }
  }
}

// ─── GROUNDED CHECK ─────────────────────────────────────────────────────────
function checkGrounded() {
  const pp  = playerBody.translation();
  const ray = new RAPIER.Ray({ x: pp.x, y: pp.y, z: pp.z }, { x: 0, y: -1, z: 0 });
  const hit = world.castRay(ray, 1.1, true);
  isGrounded = hit !== null && hit.timeOfImpact < 1.0;
}

// ─── DRIBBLE / SHOT ─────────────────────────────────────────────────────────
const DRIBBLE_DIST = 1.1, DRIBBLE_FORCE = 18, MAX_SHOT = 55;
const _fwdVec = new THREE.Vector3(); // reusable

function dribbleAndShoot(dt: number) {
  const pp = playerBody.translation();
  const bp = ballBody.translation();
  const dx = bp.x - pp.x, dz = bp.z - pp.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  const pv = playerBody.linvel();
  const playerSpeed = Math.sqrt(pv.x * pv.x + pv.z * pv.z);
  const dribbling = dist < DRIBBLE_DIST && !isCharging && playerSpeed > 1.5;

  if (dist < DRIBBLE_DIST && !isCharging) {
    _fwdVec.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    const targetX = pp.x + _fwdVec.x * DRIBBLE_DIST * 0.7;
    const targetZ = pp.z + _fwdVec.z * DRIBBLE_DIST * 0.7;
    const fx = (targetX - bp.x) * DRIBBLE_FORCE;
    const fz = (targetZ - bp.z) * DRIBBLE_FORCE;
    ballBody.applyImpulse({ x: fx * dt, y: 0, z: fz * dt }, true);
  }

  if (dribbling) addGauge(7 * dt);

  if (mouseLeft && dist < DRIBBLE_DIST * 1.5 && isLocked) {
    isCharging = true;
    shotCharge = Math.min(100, shotCharge + 60 * dt);
  } else if (isCharging && !mouseLeft) {
    const boostMult  = skillBoost ? skillBoost.kickMult : 1;
    const awakenMult = isAwakened ? activeAwakening().shotPowerMultiplier : 1;
    const power = (shotCharge / 100) * MAX_SHOT * boostMult * awakenMult;
    _fwdVec.set(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
    const spin = keys["KeyQ"] ? -1 : keys["KeyE"] ? 1 : 0;
    const skillCurve = skillBoost ? skillBoost.curve : 0;

    ballBody.applyImpulse({ x: _fwdVec.x * power, y: power * 0.08, z: _fwdVec.z * power }, true);

    if (spin !== 0) {
      ballBody.applyTorqueImpulse({ x: 0, y: spin * power * (0.08 + skillCurve * 0.04), z: 0 }, true);
    } else if (skillCurve > 0) {
      ballBody.applyTorqueImpulse({ x: 0, y: skillCurve * power * 0.05, z: 0 }, true);
    }

    addGauge(8 + shotCharge * 0.1);
    skillBoost = null;
    shotCharge = 0;
    isCharging = false;
  } else if (!mouseLeft) {
    if (!isCharging) shotCharge = 0;
    else shotCharge = Math.max(0, shotCharge - 40 * dt);
    isCharging = false;
  }
}

// ─── MAGNUS ─────────────────────────────────────────────────────────────────
function applyMagnus() {
  const spin = keys["KeyQ"] ? -1 : keys["KeyE"] ? 1 : 0;
  if (spin === 0) return;
  const lv = ballBody.linvel();
  const speed = Math.sqrt(lv.x * lv.x + lv.y * lv.y + lv.z * lv.z);
  if (speed < 0.5) return;
  const perpX = -lv.z / speed;
  const perpZ =  lv.x / speed;
  const mag = spin * speed * 0.08;
  ballBody.applyImpulse({ x: perpX * mag, y: 0, z: perpZ * mag }, true);
}

// ─── PLAYER MOVEMENT ────────────────────────────────────────────────────────
const SPEED_WALK = 7, SPEED_SPRINT = 12, SPEED_SLIDE = 20;
const _moveVec = new THREE.Vector3();

function movePlayer(dt: number) {
  const fwd   = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(-Math.sin(yaw - Math.PI / 2), 0, -Math.cos(yaw - Math.PI / 2));

  let mx = 0, mz = 0;
  if (keys["KeyW"]) { mx += fwd.x;   mz += fwd.z; }
  if (keys["KeyS"]) { mx -= fwd.x;   mz -= fwd.z; }
  if (keys["KeyA"]) { mx -= right.x; mz -= right.z; }
  if (keys["KeyD"]) { mx += right.x; mz += right.z; }

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
    playerBody.applyImpulse({ x: fwd.x * impulse, y: 0, z: fwd.z * impulse }, true);
    addGauge(6);
    const pp = playerBody.translation();
    const bp = ballBody.translation();
    if (Math.hypot(bp.x - pp.x, bp.z - pp.z) < 3.0) addGauge(14);
  }
  if (slideTimer > 0) { slideTimer--; return; }

  const len = Math.sqrt(mx * mx + mz * mz);
  if (len > 0) {
    mx /= len; mz /= len;
    const cv = playerBody.linvel();
    playerBody.setLinvel({ x: mx * speed, y: cv.y, z: mz * speed }, true);
  } else {
    const cv = playerBody.linvel();
    playerBody.setLinvel({ x: cv.x * 0.7, y: cv.y, z: cv.z * 0.7 }, true);
  }

  if (keys["Space"] && isGrounded) {
    playerBody.applyImpulse({ x: 0, y: 12, z: 0 }, true);
  }
}

// ─── CAMERA ─────────────────────────────────────────────────────────────────
const camOffset = new THREE.Vector3(0, 2.5, 5.5);
const _camPivot = new THREE.Vector3();
const _camQYaw  = new THREE.Quaternion();
const _camQPitch= new THREE.Quaternion();
const _camEuler = new THREE.Euler();

function updateCamera() {
  const pp = playerBody.translation();
  _camPivot.set(pp.x, pp.y + 0.8, pp.z);
  _camEuler.set(0, yaw, 0);
  _camQYaw.setFromEuler(_camEuler);
  _camEuler.set(pitch2, 0, 0);
  _camQPitch.setFromEuler(_camEuler);
  const offset = camOffset.clone().applyQuaternion(_camQYaw.multiply(_camQPitch));
  camera.position.copy(_camPivot).add(offset);
  camera.lookAt(_camPivot);
}

// ─── TRAIL ──────────────────────────────────────────────────────────────────
function updateTrail() {
  const bp = ballBody.translation();
  if (trailHistory.length >= TRAIL_LEN) trailHistory.shift();
  const last = trailHistory[trailHistory.length - 1];
  if (!last || last.x !== bp.x || last.y !== bp.y || last.z !== bp.z) {
    trailHistory.push(new THREE.Vector3(bp.x, bp.y, bp.z));
  }

  const attr = trailGeo.attributes["position"] as THREE.BufferAttribute;
  const len  = trailHistory.length;
  for (let i = 0; i < len; i++) {
    const p = trailHistory[i];
    attr.array[i * 3]     = p.x;
    attr.array[i * 3 + 1] = p.y;
    attr.array[i * 3 + 2] = p.z;
  }
  attr.needsUpdate = true;
  trailGeo.setDrawRange(0, len);
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

  // Fixed-step physics accumulator
  physicsAccum += dt;
  while (physicsAccum >= FIXED_DT) {
    world.step();
    physicsAccum -= FIXED_DT;
  }

  checkGrounded();
  movePlayer(dt);
  dribbleAndShoot(dt);
  applyMagnus();
  checkGoal();
  updateAwakening(dt);
  updateSkillVfx(dt);

  // Sync meshes
  const pp = playerBody.translation();
  playerMesh.position.set(pp.x, pp.y, pp.z);
  playerMesh.rotation.y = yaw;

  const bp = ballBody.translation();
  ballMesh.position.set(bp.x, bp.y, bp.z);
  const bav = ballBody.angvel();
  ballMesh.rotation.x += bav.x * FIXED_DT;
  ballMesh.rotation.z += bav.z * FIXED_DT;

  updateTrail();
  updateCamera();
  updateHUD(dt);

  renderer.render(scene, camera);
}

animate();
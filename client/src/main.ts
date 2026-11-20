import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";

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
</div>
<div id="lock-prompt" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  font-size:1.1rem;letter-spacing:2px;background:rgba(0,0,0,.6);padding:12px 24px;border:1px solid #0ff;border-radius:8px;">
  CLICK TO PLAY
</div>`;
document.body.appendChild(hud);

const scoreEl    = document.getElementById("score")!;
const stamBar    = document.getElementById("stam-bar")!;
const shotBar    = document.getElementById("shot-bar")!;
const curveInd   = document.getElementById("curve-ind")!;
const lockPrompt = document.getElementById("lock-prompt")!;

// ─── SCENE / RENDERER ───────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(devicePixelRatio);
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
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 150;
sun.shadow.camera.left = -60;
sun.shadow.camera.right = 60;
sun.shadow.camera.top = 60;
sun.shadow.camera.bottom = -60;
scene.add(sun);

// Stadium flood lights
const floodColors = [0x00ffff, 0xff00aa, 0x00ffff, 0xff00aa];
const floodPositions = [[-30, 20, -20], [30, 20, -20], [-30, 20, 20], [30, 20, 20]] as const;
floodPositions.forEach(([x, y, z], i) => {
  const fl = new THREE.PointLight(floodColors[i], 1.5, 80);
  fl.position.set(x, y, z);
  scene.add(fl);
});

// ─── PITCH ──────────────────────────────────────────────────────────────────
const PITCH_W = 52, PITCH_H = 0.3, PITCH_D = 34;

const pitchGeo = new THREE.BoxGeometry(PITCH_W, PITCH_H, PITCH_D);
const pitchMat = new THREE.MeshStandardMaterial({ color: 0x1a4a1a, roughness: 0.9, metalness: 0 });
const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
pitchMesh.receiveShadow = true;
pitchMesh.position.y = -PITCH_H / 2;
scene.add(pitchMesh);

// Glowing pitch lines
function makeLine(points: THREE.Vector3[], color = 0x00ffff) {
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color, toneMapped: false });
  (mat as THREE.LineBasicMaterial & { emissive?: THREE.Color }).color.multiplyScalar(2);
  const line = new THREE.Line(geo, mat);
  line.position.y = 0.02;
  scene.add(line);
}

const hw = PITCH_W / 2, hd = PITCH_D / 2;
// Boundary
makeLine([new THREE.Vector3(-hw, 0, -hd), new THREE.Vector3(hw, 0, -hd),
           new THREE.Vector3(hw, 0, hd),  new THREE.Vector3(-hw, 0, hd),
           new THREE.Vector3(-hw, 0, -hd)]);
// Center line
makeLine([new THREE.Vector3(0, 0, -hd), new THREE.Vector3(0, 0, hd)]);
// Center circle
{
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * 7, 0, Math.sin(a) * 7));
  }
  makeLine(pts);
}
// Penalty boxes
[-1, 1].forEach(side => {
  const bx = side * (hw - 11), bz = 10;
  makeLine([new THREE.Vector3(side * hw, 0, -bz), new THREE.Vector3(bx, 0, -bz),
             new THREE.Vector3(bx, 0, bz),         new THREE.Vector3(side * hw, 0, bz)]);
});

// ─── WALLS ──────────────────────────────────────────────────────────────────
function makeWall(w: number, h: number, d: number, x: number, y: number, z: number) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x223355, roughness: 0.5, metalness: 0.3,
    transparent: true, opacity: 0.5,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  scene.add(mesh);
}

const wallH = 6;
makeWall(PITCH_W, wallH, 0.5, 0, wallH / 2, -hd);   // back
makeWall(PITCH_W, wallH, 0.5, 0, wallH / 2, hd);    // front
makeWall(0.5, wallH, PITCH_D, -hw, wallH / 2, 0);   // left
makeWall(0.5, wallH, PITCH_D, hw, wallH / 2, 0);    // right

// ─── GOALS ──────────────────────────────────────────────────────────────────
const GOAL_W = 7.32, GOAL_H = 2.44, GOAL_D = 2;
const goalMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.7 });

function buildGoal(side: number) {
  const gx = side * (hw + GOAL_D / 2);
  // Posts
  [-GOAL_W / 2, GOAL_W / 2].forEach(zo => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, GOAL_H, 8), goalMat);
    post.position.set(gx, GOAL_H / 2, zo);
    post.castShadow = true;
    scene.add(post);
  });
  // Crossbar
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, GOAL_W, 8), goalMat);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(gx, GOAL_H, 0);
  scene.add(bar);
  // Net (semi-transparent plane)
  const netGeo = new THREE.PlaneGeometry(GOAL_W, GOAL_H);
  const netMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, transparent: true, opacity: 0.15,
    side: THREE.DoubleSide, wireframe: false,
  });
  const net = new THREE.Mesh(netGeo, netMat);
  net.position.set(gx + side * GOAL_D / 2, GOAL_H / 2, 0);
  net.rotation.y = Math.PI / 2;
  scene.add(net);
  // Top net
  const topNet = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_D, GOAL_W), netMat.clone());
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

function makeStaticBox(hx: number, hy: number, hz: number, x: number, y: number, z: number) {
  const desc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z);
  const body = world.createRigidBody(desc);
  world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz), body);
  return body;
}

// Ground
makeStaticBox(PITCH_W / 2, PITCH_H / 2, PITCH_D / 2, 0, -PITCH_H / 2, 0);
// Walls
makeStaticBox(PITCH_W / 2, wallH / 2, 0.25, 0, wallH / 2, -hd);
makeStaticBox(PITCH_W / 2, wallH / 2, 0.25, 0, wallH / 2, hd);
makeStaticBox(0.25, wallH / 2, PITCH_D / 2, -hw, wallH / 2, 0);
makeStaticBox(0.25, wallH / 2, PITCH_D / 2, hw, wallH / 2, 0);

// ─── BALL ───────────────────────────────────────────────────────────────────
const BALL_R = 0.22;
const ballGeo = new THREE.SphereGeometry(BALL_R, 16, 16);
const ballMat = new THREE.MeshStandardMaterial({
  color: 0xffffff, emissive: 0x00aaff, emissiveIntensity: 0.4,
  roughness: 0.3, metalness: 0.1,
});
const ballMesh = new THREE.Mesh(ballGeo, ballMat);
ballMesh.castShadow = true;
scene.add(ballMesh);

// Ball trail
const TRAIL_LEN = 30;
const trailPositions = new Float32Array(TRAIL_LEN * 3);
const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
const trailMat = new THREE.LineBasicMaterial({
  color: 0x00ccff, transparent: true, opacity: 0.6, toneMapped: false,
});
const trailLine = new THREE.Line(trailGeo, trailMat);
scene.add(trailLine);
const trailHistory: THREE.Vector3[] = [];

const ballBodyDesc = RAPIER.RigidBodyDesc.dynamic()
  .setTranslation(0, 1, 0)
  .setLinearDamping(0.5)
  .setAngularDamping(0.4);
const ballBody = world.createRigidBody(ballBodyDesc);
const ballCollider = world.createCollider(
  RAPIER.ColliderDesc.ball(BALL_R).setRestitution(0.6).setFriction(0.4),
  ballBody
);
void ballCollider;

function resetBall(x = 0, z = 0) {
  ballBody.setTranslation({ x, y: 1.2, z }, true);
  ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
  ballBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
}

// ─── PLAYER ─────────────────────────────────────────────────────────────────
const PLAYER_H = 1.8, PLAYER_R = 0.35;
const playerGeo = new THREE.CapsuleGeometry(PLAYER_R, PLAYER_H - PLAYER_R * 2, 8, 16);
const playerMat = new THREE.MeshStandardMaterial({
  color: 0x224488, emissive: 0x001133, roughness: 0.5, metalness: 0.3,
});
const playerMesh = new THREE.Mesh(playerGeo, playerMat);
playerMesh.castShadow = true;
scene.add(playerMesh);

// Eyes
const eyeGeo = new THREE.SphereGeometry(0.07, 8, 8);
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 1 });
[-0.15, 0.15].forEach(ex => {
  const eye = new THREE.Mesh(eyeGeo, eyeMat);
  eye.position.set(ex, 0.65, -PLAYER_R + 0.04);
  playerMesh.add(eye);
});

const playerBodyDesc = RAPIER.RigidBodyDesc.dynamic()
  .setTranslation(0, PLAYER_H / 2, 5)
  .lockRotations();
const playerBody = world.createRigidBody(playerBodyDesc);
world.createCollider(
  RAPIER.ColliderDesc.capsule(PLAYER_H / 2 - PLAYER_R, PLAYER_R).setFriction(0.1),
  playerBody
);

// ─── INPUT ──────────────────────────────────────────────────────────────────
const keys: Record<string, boolean> = {};
window.addEventListener("keydown", e => { keys[e.code] = true; });
window.addEventListener("keyup",   e => { keys[e.code] = false; });

let yaw = 0, pitch2 = 0;
let isLocked = false;

document.addEventListener("pointerlockchange", () => {
  isLocked = document.pointerLockElement === renderer.domElement;
  lockPrompt.style.display = isLocked ? "none" : "block";
});
renderer.domElement.addEventListener("click", () => {
  renderer.domElement.requestPointerLock();
});
document.addEventListener("mousemove", e => {
  if (!isLocked) return;
  yaw   -= e.movementX * 0.002;
  pitch2 = Math.max(-0.5, Math.min(0.8, pitch2 - e.movementY * 0.002));
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
let shotCharge = 0;         // 0-100
let isCharging = false;
let slideTimer = 0;         // cooldown frames remaining
const SLIDE_COOLDOWN = 90;
let isGrounded = false;

function updateHUD() {
  scoreEl.textContent = `${score[0]} — ${score[1]}`;
  (stamBar as HTMLElement).style.width = `${stamina}%`;
  (shotBar as HTMLElement).style.width = `${shotCharge}%`;
  const curve = keys["KeyQ"] ? "◄ L" : keys["KeyE"] ? "R ►" : "NONE";
  curveInd.textContent = `CURVE: ${curve}`;
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
  const pp = playerBody.translation();
  // Cast ray downward
  const ray = new RAPIER.Ray({ x: pp.x, y: pp.y, z: pp.z }, { x: 0, y: -1, z: 0 });
  const hit = world.castRay(ray, 1.1, true);
  isGrounded = hit !== null && hit.timeOfImpact < 1.0;
}

// ─── DRIBBLE / SHOT ─────────────────────────────────────────────────────────
const DRIBBLE_DIST = 1.1;
const DRIBBLE_FORCE = 18;
const MAX_SHOT = 55;

function dribbleAndShoot(dt: number) {
  const pp = playerBody.translation();
  const bp = ballBody.translation();
  const dx = bp.x - pp.x, dz = bp.z - pp.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  // Magnetic dribble
  if (dist < DRIBBLE_DIST && !isCharging) {
    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const targetX = pp.x + fwd.x * DRIBBLE_DIST * 0.7;
    const targetZ = pp.z + fwd.z * DRIBBLE_DIST * 0.7;
    const forceMag = DRIBBLE_FORCE;
    const fx = (targetX - bp.x) * forceMag;
    const fz = (targetZ - bp.z) * forceMag;
    ballBody.applyImpulse({ x: fx * dt, y: 0, z: fz * dt }, true);
  }

  // Charge shot
  if (mouseLeft && dist < DRIBBLE_DIST * 1.5 && isLocked) {
    isCharging = true;
    shotCharge = Math.min(100, shotCharge + 60 * dt);
  } else if (isCharging && !mouseLeft) {
    // Release shot
    const power = (shotCharge / 100) * MAX_SHOT;
    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
    const spin = keys["KeyQ"] ? -1 : keys["KeyE"] ? 1 : 0;

    ballBody.applyImpulse({ x: fwd.x * power, y: power * 0.08, z: fwd.z * power }, true);

    // Magnus spin torque
    if (spin !== 0) {
      ballBody.applyTorqueImpulse({ x: 0, y: spin * power * 0.08, z: 0 }, true);
    }
    shotCharge = 0;
    isCharging = false;
  } else if (!mouseLeft) {
    shotCharge = Math.max(0, shotCharge - 40 * dt);
    if (!isCharging) shotCharge = 0;
    isCharging = false;
  }
}

// ─── MAGNUS CONTINUOUS ──────────────────────────────────────────────────────
function applyMagnus() {
  const spin = keys["KeyQ"] ? -1 : keys["KeyE"] ? 1 : 0;
  if (spin === 0) return;
  const lv = ballBody.linvel();
  const speed = Math.sqrt(lv.x * lv.x + lv.y * lv.y + lv.z * lv.z);
  if (speed < 0.5) return;
  // F = omega × v (simplified: horizontal perpendicular)
  const perpX = -lv.z / speed;
  const perpZ =  lv.x / speed;
  const mag = spin * speed * 0.08;
  ballBody.applyImpulse({ x: perpX * mag, y: 0, z: perpZ * mag }, true);
}

// ─── PLAYER MOVEMENT ────────────────────────────────────────────────────────
const SPEED_WALK = 7, SPEED_SPRINT = 12, SPEED_SLIDE = 20;

function movePlayer(dt: number) {
  const fwd  = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(-Math.sin(yaw - Math.PI / 2), 0, -Math.cos(yaw - Math.PI / 2));

  let mx = 0, mz = 0;
  if (keys["KeyW"]) { mx += fwd.x;   mz += fwd.z; }
  if (keys["KeyS"]) { mx -= fwd.x;   mz -= fwd.z; }
  if (keys["KeyA"]) { mx -= right.x; mz -= right.z; }
  if (keys["KeyD"]) { mx += right.x; mz += right.z; }

  const sprinting = keys["ShiftLeft"] && stamina > 0 && (Math.abs(mx) + Math.abs(mz) > 0);
  const speed = slideTimer > 0 ? SPEED_SLIDE : sprinting ? SPEED_SPRINT : SPEED_WALK;

  if (sprinting) stamina = Math.max(0, stamina - 25 * dt);
  else           stamina = Math.min(100, stamina + 15 * dt);

  // Slide tackle
  if (mouseRight && slideTimer <= 0 && isGrounded) {
    slideTimer = SLIDE_COOLDOWN;
    const impulse = SPEED_SLIDE * 1.5;
    playerBody.applyImpulse({ x: fwd.x * impulse, y: 0, z: fwd.z * impulse }, true);
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

  // Jump
  if (keys["Space"] && isGrounded) {
    playerBody.applyImpulse({ x: 0, y: 12, z: 0 }, true);
  }
}

// ─── CAMERA FOLLOW ──────────────────────────────────────────────────────────
const camOffset = new THREE.Vector3(0, 2.5, 5.5);
function updateCamera() {
  const pp = playerBody.translation();
  const pivot = new THREE.Vector3(pp.x, pp.y + 0.8, pp.z);
  const qYaw   = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
  const qPitch = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch2, 0, 0));
  const offset = camOffset.clone().applyQuaternion(qYaw.multiply(qPitch));
  camera.position.copy(pivot).add(offset);
  camera.lookAt(pivot);
}

// ─── TRAIL UPDATE ───────────────────────────────────────────────────────────
function updateTrail() {
  const bp = ballBody.translation();
  trailHistory.push(new THREE.Vector3(bp.x, bp.y, bp.z));
  if (trailHistory.length > TRAIL_LEN) trailHistory.shift();

  const attr = trailGeo.attributes["position"] as THREE.BufferAttribute;
  for (let i = 0; i < TRAIL_LEN; i++) {
    const p = trailHistory[i] ?? (trailHistory[0] ?? new THREE.Vector3());
    attr.setXYZ(i, p.x, p.y, p.z);
  }
  attr.needsUpdate = true;
  trailGeo.setDrawRange(0, trailHistory.length);
}

// ─── MAIN LOOP ──────────────────────────────────────────────────────────────
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt  = Math.min((now - lastTime) / 1000, 0.05);
  lastTime  = now;

  world.step();

  checkGrounded();
  movePlayer(dt);
  dribbleAndShoot(dt);
  applyMagnus();
  checkGoal();

  // Sync meshes
  const pp = playerBody.translation();
  playerMesh.position.set(pp.x, pp.y, pp.z);
  playerMesh.rotation.y = yaw;

  const bp = ballBody.translation();
  ballMesh.position.set(bp.x, bp.y, bp.z);
  const bav = ballBody.angvel();
  ballMesh.rotation.x += bav.x * 0.016;
  ballMesh.rotation.z += bav.z * 0.016;

  updateTrail();
  updateCamera();
  updateHUD();

  renderer.render(scene, camera);
}

animate();
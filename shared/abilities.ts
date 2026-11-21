// ─── SHARED ABILITY DEFINITIONS ─────────────────────────────────────────────

export type Playstyle = "EGOIST" | "PLAYMAKER" | "LOCKDOWN" | "SPEEDSTER";

export const PLAYSTYLES: Playstyle[] = ["EGOIST", "PLAYMAKER", "LOCKDOWN", "SPEEDSTER"];

export interface SkillConfig {
  id: string;
  name: string;
  playstyle: Playstyle;
  staminaCost: number;
  cooldownSec: number;
  dashImpulse: number;
  kickPowerMultiplier: number;
  curveStrength: number;
  vfxColor: number;
}

export interface AwakeningConfig {
  id: string;
  name: string;
  playstyle: Playstyle;
  durationSec: number;
  speedMultiplier: number;
  shotPowerMultiplier: number;
  auraColor: number;
}

export interface DuoSynergyConfig {
  id: string;
  name: string;
  playstyles: [Playstyle, Playstyle];
  trigger: "PASS_INTO_AWAKENING_ZONE";
  durationSec: number;
  speedMultiplier: number;
  shotPowerMultiplier: number;
  vfxColor: number;
  description: string;
}

// ─── SKILLS (5 per playstyle) ───────────────────────────────────────────────

export const SKILLS: SkillConfig[] = [
  // EGOIST — selfish striker: raw finishing power and explosive shooting
  {
    id: "ego-chakra-shot",
    name: "Chakra Shot",
    playstyle: "EGOIST",
    staminaCost: 22,
    cooldownSec: 9,
    dashImpulse: 0,
    kickPowerMultiplier: 2.4,
    curveStrength: 0,
    vfxColor: 0xff2244,
  },
  {
    id: "ego-burst-drive",
    name: "Ego Burst Drive",
    playstyle: "EGOIST",
    staminaCost: 16,
    cooldownSec: 7,
    dashImpulse: 26,
    kickPowerMultiplier: 1.15,
    curveStrength: 0,
    vfxColor: 0xff4466,
  },
  {
    id: "ego-cutback",
    name: "Cutback feint",
    playstyle: "EGOIST",
    staminaCost: 12,
    cooldownSec: 5,
    dashImpulse: 18,
    kickPowerMultiplier: 1.0,
    curveStrength: 1.2,
    vfxColor: 0xff6688,
  },
  {
    id: "ego-direct-drive",
    name: "Direct Drive Volley",
    playstyle: "EGOIST",
    staminaCost: 20,
    cooldownSec: 8,
    dashImpulse: 8,
    kickPowerMultiplier: 2.0,
    curveStrength: 0.6,
    vfxColor: 0xff3355,
  },
  {
    id: "ego-predator-step",
    name: "Predator Step-Over",
    playstyle: "EGOIST",
    staminaCost: 10,
    cooldownSec: 4,
    dashImpulse: 14,
    kickPowerMultiplier: 1.3,
    curveStrength: 0.4,
    vfxColor: 0xff5577,
  },

  // PLAYMAKER — vision, passing lanes, and wicked curve
  {
    id: "pm-vision-pass",
    name: "Vision Pass",
    playstyle: "PLAYMAKER",
    staminaCost: 8,
    cooldownSec: 3,
    dashImpulse: 0,
    kickPowerMultiplier: 1.1,
    curveStrength: 2.0,
    vfxColor: 0xffcc00,
  },
  {
    id: "pm-lob-sphere",
    name: "Lob Sphere",
    playstyle: "PLAYMAKER",
    staminaCost: 14,
    cooldownSec: 6,
    dashImpulse: 0,
    kickPowerMultiplier: 1.4,
    curveStrength: 0.8,
    vfxColor: 0xffdd44,
  },
  {
    id: "pm-elastico",
    name: "Elastico Feint",
    playstyle: "PLAYMAKER",
    staminaCost: 12,
    cooldownSec: 5,
    dashImpulse: 20,
    kickPowerMultiplier: 1.0,
    curveStrength: 1.6,
    vfxColor: 0xffe066,
  },
  {
    id: "pm-through-ball",
    name: "Threaded Through Ball",
    playstyle: "PLAYMAKER",
    staminaCost: 10,
    cooldownSec: 4,
    dashImpulse: 6,
    kickPowerMultiplier: 1.25,
    curveStrength: 1.4,
    vfxColor: 0xccaa00,
  },
  {
    id: "pm-trivela",
    name: "Trivela Bend",
    playstyle: "PLAYMAKER",
    staminaCost: 18,
    cooldownSec: 8,
    dashImpulse: 0,
    kickPowerMultiplier: 1.6,
    curveStrength: 3.0,
    vfxColor: 0xffbb22,
  },

  // LOCKDOWN — defense: tackles, shields, pressure
  {
    id: "ld-intercept-read",
    name: "Intercept Read",
    playstyle: "LOCKDOWN",
    staminaCost: 10,
    cooldownSec: 4,
    dashImpulse: 12,
    kickPowerMultiplier: 1.0,
    curveStrength: 0,
    vfxColor: 0x00ff88,
  },
  {
    id: "ld-chain-tackle",
    name: "Chain Tackle",
    playstyle: "LOCKDOWN",
    staminaCost: 18,
    cooldownSec: 7,
    dashImpulse: 30,
    kickPowerMultiplier: 1.0,
    curveStrength: 0,
    vfxColor: 0x00dd77,
  },
  {
    id: "ld-iron-shield",
    name: "Iron Shield",
    playstyle: "LOCKDOWN",
    staminaCost: 12,
    cooldownSec: 6,
    dashImpulse: 0,
    kickPowerMultiplier: 1.05,
    curveStrength: 0,
    vfxColor: 0x00cc66,
  },
  {
    id: "ld-sweep-slide",
    name: "Sweep Slide",
    playstyle: "LOCKDOWN",
    staminaCost: 16,
    cooldownSec: 6,
    dashImpulse: 24,
    kickPowerMultiplier: 1.0,
    curveStrength: 0,
    vfxColor: 0x00ffaa,
  },
  {
    id: "ld-pressure-aura",
    name: "Pressure Aura",
    playstyle: "LOCKDOWN",
    staminaCost: 14,
    cooldownSec: 8,
    dashImpulse: 8,
    kickPowerMultiplier: 1.2,
    curveStrength: 0.4,
    vfxColor: 0x22ff99,
  },

  // SPEEDSTER — acceleration and breakaways
  {
    id: "sp-nitro-dash",
    name: "Nitro Dash",
    playstyle: "SPEEDSTER",
    staminaCost: 15,
    cooldownSec: 5,
    dashImpulse: 32,
    kickPowerMultiplier: 1.0,
    curveStrength: 0,
    vfxColor: 0x00ccff,
  },
  {
    id: "sp-afterimage",
    name: "Afterimage Step",
    playstyle: "SPEEDSTER",
    staminaCost: 12,
    cooldownSec: 4,
    dashImpulse: 22,
    kickPowerMultiplier: 1.0,
    curveStrength: 0,
    vfxColor: 0x44ddff,
  },
  {
    id: "sp-bolt-breakaway",
    name: "Bolt Breakaway",
    playstyle: "SPEEDSTER",
    staminaCost: 20,
    cooldownSec: 8,
    dashImpulse: 38,
    kickPowerMultiplier: 1.1,
    curveStrength: 0,
    vfxColor: 0x00bbee,
  },
  {
    id: "sp-second-gear",
    name: "Second Gear",
    playstyle: "SPEEDSTER",
    staminaCost: 10,
    cooldownSec: 5,
    dashImpulse: 16,
    kickPowerMultiplier: 1.15,
    curveStrength: 0,
    vfxColor: 0x66e5ff,
  },
  {
    id: "sp-sonic-strike",
    name: "Sonic Strike",
    playstyle: "SPEEDSTER",
    staminaCost: 22,
    cooldownSec: 10,
    dashImpulse: 10,
    kickPowerMultiplier: 2.1,
    curveStrength: 0.5,
    vfxColor: 0x00daff,
  },
];

// ─── AWAKENINGS ─────────────────────────────────────────────────────────────

export const AWAKENINGS: AwakeningConfig[] = [
  {
    id: "aw-flow-state",
    name: "Flow State",
    playstyle: "EGOIST",
    durationSec: 12,
    speedMultiplier: 1.35,
    shotPowerMultiplier: 1.8,
    auraColor: 0xff2244,
  },
  {
    id: "aw-predator-eye",
    name: "Predator Eye",
    playstyle: "EGOIST",
    durationSec: 10,
    speedMultiplier: 1.25,
    shotPowerMultiplier: 2.2,
    auraColor: 0xff0033,
  },
  {
    id: "aw-maestro-zone",
    name: "Maestro Zone",
    playstyle: "PLAYMAKER",
    durationSec: 12,
    speedMultiplier: 1.3,
    shotPowerMultiplier: 1.5,
    auraColor: 0xffcc00,
  },
  {
    id: "aw-gravity-well",
    name: "Gravity Well",
    playstyle: "PLAYMAKER",
    durationSec: 10,
    speedMultiplier: 1.2,
    shotPowerMultiplier: 1.4,
    auraColor: 0xffaa00,
  },
  {
    id: "aw-fortress-resolve",
    name: "Fortress Resolve",
    playstyle: "LOCKDOWN",
    durationSec: 14,
    speedMultiplier: 1.3,
    shotPowerMultiplier: 1.3,
    auraColor: 0x00ff88,
  },
  {
    id: "aw-overdrive",
    name: "Overdrive",
    playstyle: "SPEEDSTER",
    durationSec: 10,
    speedMultiplier: 1.8,
    shotPowerMultiplier: 1.4,
    auraColor: 0x00ccff,
  },
];

// ─── DUO SYNERGIES (pass into a teammate's Awakening zone) ──────────────────

export const DUO_SYNERGIES: DuoSynergyConfig[] = [
  {
    id: "duo-ego-pm",
    name: "Perfect Link-Up",
    playstyles: ["EGOIST", "PLAYMAKER"],
    trigger: "PASS_INTO_AWAKENING_ZONE",
    durationSec: 8,
    speedMultiplier: 1.25,
    shotPowerMultiplier: 1.6,
    vfxColor: 0xff8800,
    description: "Striker and creator sync: the receiver's next shot is boosted and both gain a speed surge.",
  },
  {
    id: "duo-pm-sp",
    name: "Clockwork Counter",
    playstyles: ["PLAYMAKER", "SPEEDSTER"],
    trigger: "PASS_INTO_AWAKENING_ZONE",
    durationSec: 7,
    speedMultiplier: 1.6,
    shotPowerMultiplier: 1.3,
    vfxColor: 0x88ff44,
    description: "A threaded pass into space launches the runner at blistering pace.",
  },
  {
    id: "duo-lock-sp",
    name: "Wall Break Relay",
    playstyles: ["LOCKDOWN", "SPEEDSTER"],
    trigger: "PASS_INTO_AWAKENING_ZONE",
    durationSec: 8,
    speedMultiplier: 1.5,
    shotPowerMultiplier: 1.35,
    vfxColor: 0x00ffdd,
    description: "Win it back, release the sprinter: a turnover turned instant breakaway.",
  },
  {
    id: "duo-ego-lock",
    name: "Ironclad Finisher",
    playstyles: ["EGOIST", "LOCKDOWN"],
    trigger: "PASS_INTO_AWAKENING_ZONE",
    durationSec: 9,
    speedMultiplier: 1.2,
    shotPowerMultiplier: 1.9,
    vfxColor: 0xff4488,
    description: "The tank wins the ball, the egoist rams it home with crushing shot power.",
  },
];

// ─── HELPERS ────────────────────────────────────────────────────────────────

export function skillsForPlaystyle(playstyle: Playstyle): SkillConfig[] {
  return SKILLS.filter(s => s.playstyle === playstyle);
}

export function awakeningForPlaystyle(playstyle: Playstyle): AwakeningConfig {
  return AWAKENINGS.find(a => a.playstyle === playstyle) ?? AWAKENINGS[0];
}

export function synergyForPair(a: Playstyle, b: Playstyle): DuoSynergyConfig | undefined {
  return DUO_SYNERGIES.find(
    d =>
      (d.playstyles[0] === a && d.playstyles[1] === b) ||
      (d.playstyles[0] === b && d.playstyles[1] === a)
  );
}

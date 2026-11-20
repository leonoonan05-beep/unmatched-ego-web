export type Team = 'HOME' | 'AWAY';
export type Playstyle = 'EGOIST' | 'PLAYMAKER' | 'LOCKDOWN' | 'SPEEDSTER';

export interface Vector3Data {
  x: number;
  y: number;
  z: number;
}

export interface PlayerState {
  id: string;
  name: string;
  team: Team;
  playstyle: Playstyle;
  position: Vector3Data;
  velocity: Vector3Data;
  rotationY: number;
  stamina: number;
  awakeningGauge: number;
  isAwakened: boolean;
  hasBall: boolean;
  cooldowns: Record<string, number>;
}

export interface BallState {
  position: Vector3Data;
  velocity: Vector3Data;
  spin: Vector3Data;
  ownerId: string | null;
}

export interface SkillConfig {
  id: string;
  name: string;
  playstyle: Playstyle;
  staminaCost: number;
  cooldownSec: number;
  dashImpulse: number;
  kickPowerMultiplier: number;
  curveStrength: number;
  vfxColor: string;
}

export interface AwakeningConfig {
  id: string;
  name: string;
  playstyle: Playstyle;
  durationSec: number;
  speedMultiplier: number;
  shotPowerMultiplier: number;
  auraColor: string;
}

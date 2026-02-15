import * as THREE from 'three';

export interface HandData {
  index: number; // 0 = left hand, 1 = right hand
  indexTip: THREE.Vector3;   // index finger tip in world space
  thumbTip: THREE.Vector3;   // thumb tip in world space
  isPinching: boolean;       // thumb + index close together
  confidence: number;
}

export interface BirdDef {
  name: string;
  bodyColor: number;
  wingColor: number;
  bellyColor: number;
  beakColor: number;
  radius: number;       // collision radius
  bodyScale: number;    // body elongation
  speed: number;        // base speed multiplier
  points: number;
  wingSpan: number;     // wing size
  rarity: number;       // 0-1, higher = rarer
}

export interface ActiveBird {
  mesh: THREE.Group;
  def: BirdDef;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  alive: boolean;
  wingAngle: number;       // current wing flap angle
  wingSpeed: number;       // flap frequency
  wobblePhase: number;     // for sine-wave flight
  wobbleAmplitude: number; // vertical wobble
  timeAlive: number;
}

export interface Aircraft {
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  alive: boolean;
  propAngle: number;
  timeAlive: number;
}

export interface PowerUp {
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  alive: boolean;
  timeAlive: number;
  kind: 'rapid_fire';
}

export interface Feather {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  startScale: number;
}

export interface ShotTrail {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

export type GameMode = 'classic' | 'arcade' | 'zen';
export type GameState = 'menu' | 'loading' | 'playing' | 'gameover';

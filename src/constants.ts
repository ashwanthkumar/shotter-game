import { BirdDef } from './types';

// Scene dimensions
export const SCENE_WIDTH = 20;
export const SCENE_HEIGHT = 14;
export const SCENE_DEPTH = 5;

// Camera
export const CAMERA_Z = 12;
export const CAMERA_FOV = 60;

// Hand tracking
export const HAND_DETECTION_INTERVAL = 2;
export const PINCH_THRESHOLD = 0.06;      // normalized distance for pinch
export const SHOOT_COOLDOWN = 0.3;         // seconds between shots per hand
export const RAPID_FIRE_COOLDOWN = 0.1;    // cooldown during rapid-fire power-up

// Crosshair
export const CROSSHAIR_SIZE = 0.4;
export const CROSSHAIR_COLOR_IDLE = 0x00ff88;
export const CROSSHAIR_COLOR_ON_TARGET = 0xff4444;
export const CROSSHAIR_COLOR_AIRCRAFT = 0xff00ff;  // warning color near aircraft

// Birds
export const BIRD_SPAWN_Y_MIN = -3;
export const BIRD_SPAWN_Y_MAX = 5;
export const BIRD_SPAWN_X_MARGIN = 2;     // spawn this far beyond screen edge
export const BIRD_BASE_SPEED = 3;
export const BIRD_MIN_SPAWN_INTERVAL = 0.8;
export const BIRD_MAX_SPAWN_INTERVAL = 2.5;
export const BIRD_DESPAWN_X_MARGIN = 3;   // despawn this far beyond screen edge
export const BIRD_HIT_RADIUS_BONUS = 0.3; // extra collision tolerance

// Aircraft
export const AIRCRAFT_RADIUS = 1.0;
export const AIRCRAFT_SPEED = 2.5;
export const AIRCRAFT_SPAWN_INTERVAL_MIN = 15;  // seconds between aircraft spawns
export const AIRCRAFT_SPAWN_INTERVAL_MAX = 30;
export const AIRCRAFT_Y_MIN = -1;
export const AIRCRAFT_Y_MAX = 4;

// Power-ups
export const POWERUP_RADIUS = 0.45;
export const POWERUP_SPEED = 1.8;
export const POWERUP_SPAWN_INTERVAL_MIN = 12;
export const POWERUP_SPAWN_INTERVAL_MAX = 25;
export const POWERUP_DURATION = 7;       // seconds the buff lasts (5-10 range)
export const POWERUP_Y_MIN = -2;
export const POWERUP_Y_MAX = 4;

// Difficulty ramp
export const DIFFICULTY_RAMP_TIME = 120;   // seconds to reach max difficulty
export const MAX_WAVE_SIZE = 4;

// Scoring
export const COMBO_WINDOW_MS = 1200;
export const COMBO_MIN_HITS = 3;

// Classic mode
export const CLASSIC_LIVES = 5;

// Arcade mode
export const ARCADE_TIME = 60;

// Zen mode
export const ZEN_TIME = 90;

// VFX
export const FEATHER_COUNT = 8;
export const FEATHER_SPEED = 6;
export const FEATHER_LIFE = 1.2;
export const MUZZLE_FLASH_LIFE = 0.15;
export const HIT_PARTICLE_COUNT = 12;
export const HIT_PARTICLE_SPEED = 4;
export const HIT_PARTICLE_LIFE = 0.8;
export const SCREEN_SHAKE_INTENSITY = 0.08;
export const SCREEN_SHAKE_DECAY = 0.9;

// Audio
export const MASTER_VOLUME = 0.3;

// Bird catalog
export const BIRD_CATALOG: BirdDef[] = [
  {
    name: 'Sparrow',
    bodyColor: 0x8B6914,
    wingColor: 0x6B4F12,
    bellyColor: 0xD2B48C,
    beakColor: 0xFF8C00,
    radius: 0.4,
    bodyScale: 0.8,
    speed: 1.4,
    points: 30,
    wingSpan: 0.6,
    rarity: 0,
  },
  {
    name: 'Robin',
    bodyColor: 0x5C4033,
    wingColor: 0x4A3728,
    bellyColor: 0xFF6347,
    beakColor: 0xFFD700,
    radius: 0.45,
    bodyScale: 0.85,
    speed: 1.2,
    points: 20,
    wingSpan: 0.65,
    rarity: 0.1,
  },
  {
    name: 'Blue Jay',
    bodyColor: 0x4169E1,
    wingColor: 0x1E90FF,
    bellyColor: 0xE0E0E0,
    beakColor: 0x333333,
    radius: 0.5,
    bodyScale: 0.9,
    speed: 1.1,
    points: 25,
    wingSpan: 0.75,
    rarity: 0.2,
  },
  {
    name: 'Crow',
    bodyColor: 0x1a1a2e,
    wingColor: 0x16213e,
    bellyColor: 0x2a2a3e,
    beakColor: 0x333333,
    radius: 0.55,
    bodyScale: 1.0,
    speed: 1.0,
    points: 15,
    wingSpan: 0.9,
    rarity: 0.15,
  },
  {
    name: 'Parrot',
    bodyColor: 0x00CC44,
    wingColor: 0xFF4444,
    bellyColor: 0xFFDD00,
    beakColor: 0xFF6600,
    radius: 0.5,
    bodyScale: 0.95,
    speed: 0.9,
    points: 35,
    wingSpan: 0.8,
    rarity: 0.35,
  },
  {
    name: 'Eagle',
    bodyColor: 0x3E2723,
    wingColor: 0x4E342E,
    bellyColor: 0xFFFFFF,
    beakColor: 0xFFD700,
    radius: 0.75,
    bodyScale: 1.3,
    speed: 0.7,
    points: 40,
    wingSpan: 1.4,
    rarity: 0.5,
  },
  {
    name: 'Golden Phoenix',
    bodyColor: 0xFFD700,
    wingColor: 0xFF8C00,
    bellyColor: 0xFFF8DC,
    beakColor: 0xFF4500,
    radius: 0.6,
    bodyScale: 1.1,
    speed: 1.6,
    points: 100,
    wingSpan: 1.1,
    rarity: 0.85,
  },
];

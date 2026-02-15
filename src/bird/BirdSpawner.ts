import * as THREE from 'three';
import { ActiveBird, BirdDef } from '../types';
import { BirdFactory } from './BirdFactory';
import {
  BIRD_CATALOG,
  BIRD_SPAWN_Y_MIN,
  BIRD_SPAWN_Y_MAX,
  BIRD_SPAWN_X_MARGIN,
  BIRD_BASE_SPEED,
  BIRD_MIN_SPAWN_INTERVAL,
  BIRD_MAX_SPAWN_INTERVAL,
  SCENE_WIDTH,
  MAX_WAVE_SIZE,
} from '../constants';

export class BirdSpawner {
  private factory: BirdFactory;
  private spawnTimer = 0;
  private nextSpawnTime = 2;

  constructor(factory: BirdFactory) {
    this.factory = factory;
  }

  reset(): void {
    this.spawnTimer = 0;
    this.nextSpawnTime = 1.5;
  }

  update(dt: number, difficulty: number, scene: THREE.Scene): ActiveBird[] {
    this.spawnTimer += dt;
    const spawned: ActiveBird[] = [];

    if (this.spawnTimer >= this.nextSpawnTime) {
      this.spawnTimer = 0;

      // Interval decreases with difficulty
      const interval = BIRD_MAX_SPAWN_INTERVAL -
        (BIRD_MAX_SPAWN_INTERVAL - BIRD_MIN_SPAWN_INTERVAL) * difficulty;
      this.nextSpawnTime = interval + Math.random() * interval * 0.5;

      // Wave size increases with difficulty
      const waveSize = Math.min(
        MAX_WAVE_SIZE,
        1 + Math.floor(difficulty * MAX_WAVE_SIZE)
      );

      for (let i = 0; i < waveSize; i++) {
        const bird = this.spawnBird(difficulty, scene);
        spawned.push(bird);
      }
    }

    return spawned;
  }

  private spawnBird(difficulty: number, scene: THREE.Scene): ActiveBird {
    const def = this.pickBirdType(difficulty);
    const mesh = this.factory.createBird(def);

    // Spawn from left or right
    const fromLeft = Math.random() > 0.5;
    const spawnX = fromLeft
      ? -(SCENE_WIDTH / 2 + BIRD_SPAWN_X_MARGIN)
      : (SCENE_WIDTH / 2 + BIRD_SPAWN_X_MARGIN);
    const spawnY = BIRD_SPAWN_Y_MIN + Math.random() * (BIRD_SPAWN_Y_MAX - BIRD_SPAWN_Y_MIN);

    const speed = BIRD_BASE_SPEED * def.speed * (0.8 + difficulty * 0.5);
    const vx = fromLeft ? speed : -speed;
    const vy = (Math.random() - 0.5) * 0.5; // slight vertical drift

    mesh.position.set(spawnX, spawnY, 0);
    // Face the direction of travel
    if (!fromLeft) {
      mesh.scale.x = -1;
    }

    scene.add(mesh);

    return {
      mesh,
      def,
      position: new THREE.Vector3(spawnX, spawnY, 0),
      velocity: new THREE.Vector3(vx, vy, 0),
      radius: def.radius,
      alive: true,
      wingAngle: 0,
      wingSpeed: 4 + Math.random() * 3,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleAmplitude: 0.3 + Math.random() * 0.7,
      timeAlive: 0,
    };
  }

  private pickBirdType(difficulty: number): BirdDef {
    // Filter birds by rarity vs difficulty - rarer birds appear more at higher difficulty
    const available = BIRD_CATALOG.filter(
      b => b.rarity <= difficulty + 0.3
    );
    // If nothing available (shouldn't happen), fallback to first bird
    if (available.length === 0) return BIRD_CATALOG[0];

    // Weighted random: common birds more likely
    const weights = available.map(b => 1 - b.rarity * 0.5);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalWeight;
    for (let i = 0; i < available.length; i++) {
      r -= weights[i];
      if (r <= 0) return available[i];
    }
    return available[available.length - 1];
  }
}

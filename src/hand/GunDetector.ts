import * as THREE from 'three';
import { HandData } from '../types';
import { SHOOT_COOLDOWN, RAPID_FIRE_COOLDOWN } from '../constants';

export interface AimTarget {
  kind: 'bird' | 'aircraft' | 'powerup';
  index: number;        // index into the respective array
  position: THREE.Vector3;
  radius: number;
}

export interface GunState {
  handIndex: number;
  aimPosition: THREE.Vector3;
  justFired: boolean;        // true on the frame the shot happens
  isAiming: boolean;         // hand detected
  onTarget: AimTarget | null; // what the crosshair is currently over
  cooldownRemaining: number;
}

export class GunDetector {
  private cooldowns: number[] = [0, 0];
  rapidFire = false;

  update(hands: HandData[], dt: number, targets: AimTarget[]): GunState[] {
    const cooldownTime = this.rapidFire ? RAPID_FIRE_COOLDOWN : SHOOT_COOLDOWN;

    // Decrease cooldowns
    for (let i = 0; i < this.cooldowns.length; i++) {
      this.cooldowns[i] = Math.max(0, this.cooldowns[i] - dt);
    }

    const guns: GunState[] = [];

    for (const hand of hands) {
      const idx = hand.index;

      // Find closest target under crosshair
      let onTarget: AimTarget | null = null;
      let bestDist = Infinity;
      for (const t of targets) {
        const dist = hand.indexTip.distanceTo(t.position);
        if (dist < t.radius && dist < bestDist) {
          onTarget = t;
          bestDist = dist;
        }
      }

      // Only auto-fire when aiming at a target
      const justFired = onTarget !== null && this.cooldowns[idx] <= 0;

      if (justFired) {
        this.cooldowns[idx] = cooldownTime;
      }

      guns.push({
        handIndex: idx,
        aimPosition: hand.indexTip.clone(),
        justFired,
        isAiming: true,
        onTarget,
        cooldownRemaining: this.cooldowns[idx],
      });
    }

    return guns;
  }
}

import { COMBO_WINDOW_MS, COMBO_MIN_HITS } from '../constants';

export class ScoreManager {
  score = 0;
  combo = 0;
  maxCombo = 0;
  totalHits = 0;
  totalShots = 0;
  totalMisses = 0;
  birdsEscaped = 0;
  private lastHitTime = 0;
  private comboTimer = 0;

  reset(): void {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalHits = 0;
    this.totalShots = 0;
    this.totalMisses = 0;
    this.birdsEscaped = 0;
    this.lastHitTime = 0;
    this.comboTimer = 0;
  }

  registerShot(): void {
    this.totalShots++;
  }

  registerHit(basePoints: number): number {
    this.totalHits++;
    const now = performance.now();

    if (now - this.lastHitTime < COMBO_WINDOW_MS) {
      this.combo++;
    } else {
      this.combo = 1;
    }
    this.lastHitTime = now;
    this.comboTimer = COMBO_WINDOW_MS;

    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }

    let earned = basePoints;
    if (this.combo >= COMBO_MIN_HITS) {
      earned += this.combo * 5;
    }

    this.score += earned;
    return earned;
  }

  registerMiss(): void {
    this.totalMisses++;
  }

  registerEscaped(): void {
    this.birdsEscaped++;
  }

  updateCombo(dt: number): void {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt * 1000;
      if (this.comboTimer <= 0) {
        this.combo = 0;
      }
    }
  }

  get accuracy(): number {
    if (this.totalShots === 0) return 0;
    return Math.round((this.totalHits / this.totalShots) * 100);
  }
}

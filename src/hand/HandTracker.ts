import { HandLandmarker, FilesetResolver, HandLandmarkerResult } from '@mediapipe/tasks-vision';
import * as THREE from 'three';
import { HandData } from '../types';
import { HAND_DETECTION_INTERVAL, PINCH_THRESHOLD, SCENE_WIDTH, SCENE_HEIGHT } from '../constants';

export class HandTracker {
  private handLandmarker: HandLandmarker | null = null;
  private video: HTMLVideoElement;
  private lastVideoTime = -1;
  private frameCount = 0;
  private cachedResults: HandLandmarkerResult | null = null;

  constructor(video: HTMLVideoElement) {
    this.video = video;
  }

  async init(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );
    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 2,
    });
  }

  detect(): HandData[] {
    if (!this.handLandmarker || this.video.readyState < 2) return [];

    this.frameCount++;
    if (this.frameCount % HAND_DETECTION_INTERVAL === 0) {
      const currentTime = this.video.currentTime;
      if (currentTime !== this.lastVideoTime) {
        this.lastVideoTime = currentTime;
        this.cachedResults = this.handLandmarker.detectForVideo(this.video, performance.now());
      }
    }

    if (!this.cachedResults || !this.cachedResults.landmarks) return [];

    const hands: HandData[] = [];
    for (let i = 0; i < this.cachedResults.landmarks.length; i++) {
      const lm = this.cachedResults.landmarks[i];
      // Landmark 8 = index finger tip, landmark 4 = thumb tip
      const indexTip = this.landmarkToWorld(lm[8].x, lm[8].y);
      const thumbTip = this.landmarkToWorld(lm[4].x, lm[4].y);

      // Pinch = thumb tip close to index tip (in normalized coords)
      const dx = lm[8].x - lm[4].x;
      const dy = lm[8].y - lm[4].y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      hands.push({
        index: i,
        indexTip,
        thumbTip,
        isPinching: dist < PINCH_THRESHOLD,
        confidence: this.cachedResults.handedness[i]?.[0]?.score ?? 0,
      });
    }
    return hands;
  }

  private landmarkToWorld(nx: number, ny: number): THREE.Vector3 {
    // Mirror X for natural feel, map to scene coords
    const x = (1 - nx) * SCENE_WIDTH - SCENE_WIDTH / 2;
    const y = (1 - ny) * SCENE_HEIGHT - SCENE_HEIGHT / 2;
    return new THREE.Vector3(x, y, 0);
  }
}

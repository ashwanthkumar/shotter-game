import * as THREE from 'three';
import {
  CROSSHAIR_SIZE,
  CROSSHAIR_COLOR_IDLE,
  CROSSHAIR_COLOR_ON_TARGET,
  CROSSHAIR_COLOR_AIRCRAFT,
} from '../constants';

interface Crosshair {
  group: THREE.Group;
  ring: THREE.Mesh;
  dot: THREE.Mesh;
  lines: THREE.Mesh[];
}

export type CrosshairState = 'idle' | 'on_target' | 'on_aircraft';

export class CrosshairRenderer {
  private crosshairs: Crosshair[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    // Create crosshairs for up to 2 hands
    for (let i = 0; i < 2; i++) {
      const crosshair = this.createCrosshair();
      crosshair.group.visible = false;
      this.scene.add(crosshair.group);
      this.crosshairs.push(crosshair);
    }
  }

  private createCrosshair(): Crosshair {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      color: CROSSHAIR_COLOR_IDLE,
      transparent: true,
      opacity: 0.8,
      depthTest: false,
    });

    // Outer ring
    const ringGeo = new THREE.RingGeometry(
      CROSSHAIR_SIZE * 0.8,
      CROSSHAIR_SIZE,
      24
    );
    const ring = new THREE.Mesh(ringGeo, mat.clone());
    group.add(ring);

    // Center dot
    const dotGeo = new THREE.CircleGeometry(CROSSHAIR_SIZE * 0.12, 8);
    const dot = new THREE.Mesh(dotGeo, mat.clone());
    group.add(dot);

    // Cross lines
    const lines: THREE.Mesh[] = [];
    const lineLen = CROSSHAIR_SIZE * 0.5;
    const lineWidth = CROSSHAIR_SIZE * 0.06;
    const offsets = [
      { x: 0, y: CROSSHAIR_SIZE * 0.4, rx: 0 },    // top
      { x: 0, y: -CROSSHAIR_SIZE * 0.4, rx: 0 },   // bottom
      { x: CROSSHAIR_SIZE * 0.4, y: 0, rx: Math.PI / 2 },  // right
      { x: -CROSSHAIR_SIZE * 0.4, y: 0, rx: Math.PI / 2 }, // left
    ];

    for (const off of offsets) {
      const lineGeo = new THREE.PlaneGeometry(lineWidth, lineLen);
      const line = new THREE.Mesh(lineGeo, mat.clone());
      line.position.set(off.x, off.y, 0);
      line.rotation.z = off.rx;
      group.add(line);
      lines.push(line);
    }

    group.renderOrder = 999;

    return { group, ring, dot, lines };
  }

  update(
    handPositions: Array<{ position: THREE.Vector3; state: CrosshairState }>,
  ): void {
    for (let i = 0; i < this.crosshairs.length; i++) {
      const ch = this.crosshairs[i];
      const hand = handPositions[i];

      if (!hand) {
        ch.group.visible = false;
        continue;
      }

      ch.group.visible = true;
      ch.group.position.copy(hand.position);
      ch.group.position.z = 1; // render in front

      let color: number;
      let scale: number;
      switch (hand.state) {
        case 'on_target':
          color = CROSSHAIR_COLOR_ON_TARGET;
          scale = 0.75;
          break;
        case 'on_aircraft':
          color = CROSSHAIR_COLOR_AIRCRAFT;
          scale = 1.2;
          break;
        default:
          color = CROSSHAIR_COLOR_IDLE;
          scale = 1.0;
      }
      ch.group.scale.setScalar(scale);

      // Update colors
      (ch.ring.material as THREE.MeshBasicMaterial).color.setHex(color);
      (ch.dot.material as THREE.MeshBasicMaterial).color.setHex(color);
      for (const line of ch.lines) {
        (line.material as THREE.MeshBasicMaterial).color.setHex(color);
      }
    }
  }

  hide(): void {
    for (const ch of this.crosshairs) {
      ch.group.visible = false;
    }
  }
}

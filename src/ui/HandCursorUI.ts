import * as THREE from 'three';

const DWELL_TIME_MS = 800;

export class HandCursorUI {
  private cursorEl: HTMLDivElement;
  private progressRing: SVGCircleElement;
  private hoverTarget: HTMLElement | null = null;
  private hoverTime = 0;
  private camera: THREE.PerspectiveCamera;
  private lastClickTime = 0;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;

    // Create cursor element
    this.cursorEl = document.createElement('div');
    this.cursorEl.id = 'hand-cursor';
    this.cursorEl.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
        <circle id="dwell-ring" cx="24" cy="24" r="20" fill="none" stroke="#00ff88"
                stroke-width="3" stroke-dasharray="125.66" stroke-dashoffset="125.66"
                transform="rotate(-90 24 24)"/>
      </svg>
      <span style="font-size:24px;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)">
        🎯
      </span>
    `;
    this.cursorEl.style.cssText = `
      position: fixed; z-index: 1000; pointer-events: none; display: none;
      width: 48px; height: 48px;
    `;
    document.body.appendChild(this.cursorEl);
    this.progressRing = this.cursorEl.querySelector('#dwell-ring')!;
  }

  update(worldPos: THREE.Vector3 | null, dt: number): void {
    if (!worldPos) {
      this.cursorEl.style.display = 'none';
      this.hoverTarget = null;
      this.hoverTime = 0;
      return;
    }

    this.cursorEl.style.display = 'block';

    // Project world position to screen
    const projected = worldPos.clone().project(this.camera);
    const canvas = document.querySelector('canvas')!;
    const x = (projected.x * 0.5 + 0.5) * canvas.clientWidth;
    const y = (-projected.y * 0.5 + 0.5) * canvas.clientHeight;

    this.cursorEl.style.left = `${x - 24}px`;
    this.cursorEl.style.top = `${y - 24}px`;

    // Check for hoverable elements
    const elements = document.elementsFromPoint(x, y);
    const hoverable = elements.find(
      el => el instanceof HTMLElement && el.hasAttribute('data-hoverable')
    ) as HTMLElement | null;

    if (hoverable && hoverable === this.hoverTarget) {
      this.hoverTime += dt * 1000;
      const progress = Math.min(1, this.hoverTime / DWELL_TIME_MS);
      const circumference = 125.66;
      this.progressRing.style.strokeDashoffset = String(
        circumference * (1 - progress)
      );

      if (progress >= 1 && performance.now() - this.lastClickTime > 1000) {
        hoverable.click();
        this.lastClickTime = performance.now();
        this.hoverTime = 0;
      }
    } else {
      this.hoverTarget = hoverable;
      this.hoverTime = 0;
      this.progressRing.style.strokeDashoffset = '125.66';
    }

    if (hoverable) {
      hoverable.style.filter = 'brightness(1.3)';
    }

    // Reset non-hovered elements
    document.querySelectorAll('[data-hoverable]').forEach(el => {
      if (el !== hoverable) {
        (el as HTMLElement).style.filter = '';
      }
    });
  }

  hide(): void {
    this.cursorEl.style.display = 'none';
  }
}

// Webcam overlay dimensions & position (must match CSS for #webcam)
const WEBCAM_W = 160;
const WEBCAM_H = 120;
const WEBCAM_MARGIN = 12;
const WEBCAM_RADIUS = 10;
const WEBCAM_BORDER = 2;
const WEBCAM_OPACITY = 0.7;

export class GameRecorder {
  private gameCanvas: HTMLCanvasElement;
  private webcamVideo: HTMLVideoElement;
  private audioContext: AudioContext | null;
  private masterGain: GainNode | null;

  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private blobUrl: string | null = null;
  private audioDestination: MediaStreamAudioDestinationNode | null = null;
  private recording = false;
  private startTime = 0;
  private timerInterval: number | null = null;
  private compositeRafId: number | null = null;

  // Offscreen composite canvas
  private compositeCanvas: HTMLCanvasElement;
  private compositeCtx: CanvasRenderingContext2D;

  // DOM elements
  private btn: HTMLButtonElement;
  private indicator: HTMLDivElement;
  private durationEl: HTMLSpanElement;
  private panel: HTMLDivElement;

  // HUD element refs (queried once)
  private hudEl!: HTMLElement;
  private scoreEl!: HTMLElement;
  private comboEl!: HTMLElement;
  private livesEl!: HTMLElement;
  private timerEl!: HTMLElement;
  private accuracyEl!: HTMLElement;
  private powerUpHud!: HTMLElement;
  private powerUpTimerEl!: HTMLElement;
  private aircraftWarningEl!: HTMLElement;

  private supported: boolean;

  constructor(
    gameCanvas: HTMLCanvasElement,
    webcamVideo: HTMLVideoElement,
    audioContext: AudioContext | null,
    masterGain: GainNode | null
  ) {
    this.gameCanvas = gameCanvas;
    this.webcamVideo = webcamVideo;
    this.audioContext = audioContext;
    this.masterGain = masterGain;
    this.supported = typeof MediaRecorder !== 'undefined';

    // Create offscreen canvas for compositing game + webcam
    this.compositeCanvas = document.createElement('canvas');
    this.compositeCtx = this.compositeCanvas.getContext('2d')!;

    // --- REC / STOP button ---
    this.btn = document.createElement('button');
    this.btn.className = 'recorder-btn';
    this.btn.textContent = 'REC';
    this.btn.style.display = 'none';
    this.btn.addEventListener('click', () => {
      if (this.recording) {
        this.stopRecording();
      } else {
        this.startRecording();
      }
    });
    document.body.appendChild(this.btn);

    // --- Recording indicator (dot + timer) ---
    this.indicator = document.createElement('div');
    this.indicator.className = 'recorder-indicator';
    this.indicator.style.display = 'none';
    this.indicator.innerHTML = '<span class="recorder-dot"></span>';
    this.durationEl = document.createElement('span');
    this.durationEl.className = 'recorder-duration';
    this.durationEl.textContent = '0:00';
    this.indicator.appendChild(this.durationEl);
    document.body.appendChild(this.indicator);

    // --- Download panel ---
    this.panel = document.createElement('div');
    this.panel.className = 'recorder-panel';
    this.panel.style.display = 'none';
    document.body.appendChild(this.panel);

    // Cache HUD element refs
    this.hudEl = document.getElementById('hud')!;
    this.scoreEl = document.getElementById('score')!;
    this.comboEl = document.getElementById('combo')!;
    this.livesEl = document.getElementById('lives')!;
    this.timerEl = document.getElementById('timer')!;
    this.accuracyEl = document.getElementById('accuracy')!;
    this.powerUpHud = document.getElementById('powerup-hud')!;
    this.powerUpTimerEl = document.getElementById('powerup-timer')!;
    this.aircraftWarningEl = document.getElementById('aircraft-warning')!;
  }

  showButton(): void {
    if (this.supported) {
      this.btn.style.display = 'block';
    }
  }

  hideButton(): void {
    this.btn.style.display = 'none';
  }

  startRecording(): void {
    if (!this.supported || this.recording) return;

    // Revoke previous blob URL to prevent memory leaks
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }

    this.chunks = [];

    // Size composite canvas to match the game canvas
    this.compositeCanvas.width = this.gameCanvas.width;
    this.compositeCanvas.height = this.gameCanvas.height;

    // Start the compositing render loop
    this.startCompositeLoop();

    // Capture the composite canvas stream at 30 fps
    const canvasStream = this.compositeCanvas.captureStream(30);

    // Fork audio into a MediaStream destination if available
    let combinedStream: MediaStream;
    if (this.audioContext && this.masterGain) {
      this.audioDestination = this.audioContext.createMediaStreamDestination();
      this.masterGain.connect(this.audioDestination);
      const audioTracks = this.audioDestination.stream.getAudioTracks();
      combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioTracks,
      ]);
    } else {
      combinedStream = canvasStream;
    }

    // Pick codec with fallback
    const mimeType = this.pickMimeType();
    const options: MediaRecorderOptions = { videoBitsPerSecond: 2_500_000 };
    if (mimeType) options.mimeType = mimeType;

    this.mediaRecorder = new MediaRecorder(combinedStream, options);
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.onstop = () => this.onRecordingStopped();
    this.mediaRecorder.start(1000); // collect data every second

    this.recording = true;
    this.startTime = Date.now();

    // Update UI
    this.btn.textContent = 'STOP';
    this.btn.classList.add('recorder-btn--active');
    this.indicator.style.display = 'flex';
    this.durationEl.textContent = '0:00';

    this.timerInterval = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      this.durationEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }, 500);
  }

  stopRecording(): void {
    if (!this.recording || !this.mediaRecorder) return;

    this.mediaRecorder.stop();
    this.recording = false;

    // Stop compositing loop
    if (this.compositeRafId !== null) {
      cancelAnimationFrame(this.compositeRafId);
      this.compositeRafId = null;
    }

    // Disconnect the audio fork
    if (this.audioDestination && this.masterGain) {
      this.masterGain.disconnect(this.audioDestination);
      this.audioDestination = null;
    }

    // Reset UI
    this.btn.textContent = 'REC';
    this.btn.classList.remove('recorder-btn--active');
    this.indicator.style.display = 'none';
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /** Compositing loop: draws game canvas + webcam overlay each frame */
  private startCompositeLoop(): void {
    const draw = () => {
      if (!this.recording) return;

      const w = this.gameCanvas.width;
      const h = this.gameCanvas.height;

      // Resize composite if game canvas changed (e.g. window resize)
      if (this.compositeCanvas.width !== w || this.compositeCanvas.height !== h) {
        this.compositeCanvas.width = w;
        this.compositeCanvas.height = h;
      }

      const ctx = this.compositeCtx;

      // Draw the game canvas
      ctx.drawImage(this.gameCanvas, 0, 0);

      // Draw webcam overlay in bottom-left, mirrored, with rounded corners
      // Scale margin/size relative to canvas resolution vs CSS layout
      const scaleX = w / this.gameCanvas.clientWidth;
      const scaleY = h / this.gameCanvas.clientHeight;
      const camW = WEBCAM_W * scaleX;
      const camH = WEBCAM_H * scaleY;
      const margin = WEBCAM_MARGIN * scaleX;
      const radius = WEBCAM_RADIUS * scaleX;
      const border = WEBCAM_BORDER * scaleX;
      const camX = margin;
      const camY = h - camH - margin;

      ctx.save();
      ctx.globalAlpha = WEBCAM_OPACITY;

      // Border
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      this.roundRect(ctx, camX - border, camY - border, camW + border * 2, camH + border * 2, radius + border);
      ctx.fill();

      // Clip to rounded rect, then draw webcam mirrored
      ctx.beginPath();
      this.roundRect(ctx, camX, camY, camW, camH, radius);
      ctx.clip();

      // Mirror horizontally (scaleX(-1)) around the webcam center
      ctx.translate(camX + camW, camY);
      ctx.scale(-1, 1);
      ctx.drawImage(this.webcamVideo, 0, 0, camW, camH);

      ctx.restore();

      // Draw HUD overlay
      this.drawHUD(ctx, w, scaleX, scaleY);

      this.compositeRafId = requestAnimationFrame(draw);
    };

    this.compositeRafId = requestAnimationFrame(draw);
  }

  /** Draw HUD text onto the composite canvas, matching the CSS layout */
  private drawHUD(ctx: CanvasRenderingContext2D, w: number, sx: number, sy: number): void {
    if (this.hudEl.style.display === 'none') return;

    const font = (size: number, weight: number) =>
      `${weight} ${Math.round(size * sy)}px "Segoe UI", system-ui, -apple-system, sans-serif`;

    const pad = { x: 24 * sx, y: 16 * sy };

    ctx.save();
    ctx.textBaseline = 'top';

    // --- Left column ---
    let leftY = pad.y;

    // Score
    const scoreText = this.scoreEl.textContent || '';
    ctx.font = font(32, 800);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8 * sy;
    ctx.shadowOffsetY = 2 * sy;
    ctx.fillText(scoreText, pad.x, leftY);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    leftY += 36 * sy;

    // Combo (only if visible)
    if (this.comboEl.style.display !== 'none') {
      const comboText = this.comboEl.textContent || '';
      ctx.font = font(24, 700);
      ctx.fillStyle = '#ffdd00';
      ctx.shadowColor = 'rgba(255,221,0,0.5)';
      ctx.shadowBlur = 12 * sy;
      ctx.fillText(comboText, pad.x, leftY);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      leftY += 28 * sy;
    }

    // Accuracy
    const accText = this.accuracyEl.textContent || '';
    ctx.font = font(16, 400);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(accText, pad.x, leftY + 4 * sy);

    // --- Right column ---
    ctx.textAlign = 'right';
    let rightY = pad.y;
    const rightX = w - pad.x;

    // Lives (if visible)
    if (this.livesEl.style.display !== 'none') {
      const livesText = this.livesEl.textContent || '';
      ctx.font = font(28, 400);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(livesText, rightX, rightY);
      rightY += 34 * sy;
    }

    // Timer (if visible)
    if (this.timerEl.style.display !== 'none') {
      const timerText = this.timerEl.textContent || '';
      ctx.font = font(24, 700);
      ctx.fillStyle = '#00ddff';
      ctx.fillText(timerText, rightX, rightY);
    }

    // --- Center indicators ---
    ctx.textAlign = 'center';
    const centerX = w / 2;

    // Power-up HUD
    if (this.powerUpHud.style.display !== 'none') {
      const puText = `\u26A1 RAPID FIRE ${this.powerUpTimerEl.textContent || ''}`;
      const puY = 70 * sy;
      // Background pill
      ctx.font = font(14, 700);
      const puMetrics = ctx.measureText(puText);
      const pillW = puMetrics.width + 40 * sx;
      const pillH = 36 * sy;
      ctx.fillStyle = 'rgba(0,255,255,0.15)';
      ctx.strokeStyle = 'rgba(0,255,255,0.5)';
      ctx.lineWidth = 2 * sx;
      this.roundRect(ctx, centerX - pillW / 2, puY - 4 * sy, pillW, pillH, 10 * sx);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#00ffff';
      ctx.fillText(puText, centerX, puY + 4 * sy);
    }

    // Aircraft warning
    if (this.aircraftWarningEl.style.display !== 'none') {
      const warnText = '\u26A0 AIRCRAFT - DON\'T SHOOT! \u26A0';
      const warnY = 110 * sy;
      ctx.font = font(16, 700);
      const warnMetrics = ctx.measureText(warnText);
      const wPillW = warnMetrics.width + 48 * sx;
      const wPillH = 38 * sy;
      ctx.fillStyle = 'rgba(255,0,100,0.2)';
      ctx.strokeStyle = 'rgba(255,0,100,0.6)';
      ctx.lineWidth = 2 * sx;
      this.roundRect(ctx, centerX - wPillW / 2, warnY - 4 * sy, wPillW, wPillH, 10 * sx);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ff4488';
      ctx.fillText(warnText, centerX, warnY + 6 * sy);
    }

    ctx.restore();
  }

  /** Draw a rounded rectangle path */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private onRecordingStopped(): void {
    const blob = new Blob(this.chunks, { type: this.chunks[0]?.type || 'video/webm' });
    this.blobUrl = URL.createObjectURL(blob);

    // Build download panel
    this.panel.innerHTML = '';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'recorder-close-btn';
    closeBtn.textContent = '\u00d7';
    closeBtn.addEventListener('click', () => {
      this.panel.style.display = 'none';
    });
    this.panel.appendChild(closeBtn);

    const title = document.createElement('h3');
    title.textContent = 'Recording Complete';
    title.style.cssText = 'margin-bottom:16px;font-size:24px;font-weight:800;';
    this.panel.appendChild(title);

    const video = document.createElement('video');
    video.className = 'recorder-preview';
    video.src = this.blobUrl;
    video.controls = true;
    video.autoplay = true;
    video.muted = true;
    this.panel.appendChild(video);

    const downloadBtn = document.createElement('a');
    downloadBtn.className = 'recorder-download-btn';
    downloadBtn.href = this.blobUrl;
    downloadBtn.download = 'shotter-gameplay.webm';
    downloadBtn.textContent = 'Download Recording';
    this.panel.appendChild(downloadBtn);

    this.panel.style.display = 'flex';
  }

  private pickMimeType(): string | null {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    for (const mime of candidates) {
      if (MediaRecorder.isTypeSupported(mime)) return mime;
    }
    return null;
  }
}

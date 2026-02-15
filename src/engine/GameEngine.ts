import * as THREE from 'three';
import { HandTracker } from '../hand/HandTracker';
import { GunDetector, GunState, AimTarget } from '../hand/GunDetector';
import { CrosshairState } from '../vfx/CrosshairRenderer';
import { BirdFactory } from '../bird/BirdFactory';
import { BirdSpawner } from '../bird/BirdSpawner';
import { ParticleSystem } from '../vfx/ParticleSystem';
import { CrosshairRenderer } from '../vfx/CrosshairRenderer';
import { AudioManager } from '../audio/AudioManager';
import { ScoreManager } from '../ui/ScoreManager';
import { HandCursorUI } from '../ui/HandCursorUI';
import { ActiveBird, Aircraft, PowerUp, GameMode, GameState } from '../types';
import {
  CAMERA_Z,
  CAMERA_FOV,
  SCENE_WIDTH,
  BIRD_DESPAWN_X_MARGIN,
  BIRD_HIT_RADIUS_BONUS,
  DIFFICULTY_RAMP_TIME,
  CLASSIC_LIVES,
  ARCADE_TIME,
  ZEN_TIME,
  SCREEN_SHAKE_INTENSITY,
  SCREEN_SHAKE_DECAY,
  COMBO_MIN_HITS,
  AIRCRAFT_RADIUS,
  AIRCRAFT_SPEED,
  AIRCRAFT_SPAWN_INTERVAL_MIN,
  AIRCRAFT_SPAWN_INTERVAL_MAX,
  AIRCRAFT_Y_MIN,
  AIRCRAFT_Y_MAX,
  POWERUP_RADIUS,
  POWERUP_SPEED,
  POWERUP_SPAWN_INTERVAL_MIN,
  POWERUP_SPAWN_INTERVAL_MAX,
  POWERUP_DURATION,
  POWERUP_Y_MIN,
  POWERUP_Y_MAX,
} from '../constants';

export class GameEngine {
  // Three.js core
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private clock!: THREE.Clock;

  // Subsystems
  private handTracker!: HandTracker;
  private gunDetector!: GunDetector;
  private birdFactory!: BirdFactory;
  private birdSpawner!: BirdSpawner;
  private particles!: ParticleSystem;
  private crosshairRenderer!: CrosshairRenderer;
  private audio!: AudioManager;
  private scoreManager!: ScoreManager;
  private handCursorUI!: HandCursorUI;

  // Game state
  private state: GameState = 'menu';
  private mode: GameMode = 'classic';
  private birds: ActiveBird[] = [];
  private aircrafts: Aircraft[] = [];
  private powerUps: PowerUp[] = [];
  private gameTime = 0;
  private difficulty = 0;
  private lives = CLASSIC_LIVES;
  private shakeIntensity = 0;
  private cameraBasePos = new THREE.Vector3(0, 0, CAMERA_Z);

  // Aircraft spawning
  private aircraftTimer = 0;
  private nextAircraftTime = 0;

  // Power-up spawning
  private powerUpTimer = 0;
  private nextPowerUpTime = 0;

  // Power-up buff state
  private rapidFireRemaining = 0;

  // DOM refs
  private video!: HTMLVideoElement;
  private handIndicator!: HTMLElement;

  // HUD
  private scoreEl!: HTMLElement;
  private comboEl!: HTMLElement;
  private livesEl!: HTMLElement;
  private timerEl!: HTMLElement;
  private accuracyEl!: HTMLElement;
  private powerUpHud!: HTMLElement;
  private powerUpTimerEl!: HTMLElement;
  private aircraftWarningEl!: HTMLElement;

  async init(): Promise<void> {
    this.setupThreeJS();
    this.setupLights();
    this.setupBackground();

    this.birdFactory = new BirdFactory();
    this.birdSpawner = new BirdSpawner(this.birdFactory);
    this.particles = new ParticleSystem(this.scene, this.birdFactory);
    this.crosshairRenderer = new CrosshairRenderer(this.scene);
    this.audio = new AudioManager();
    this.scoreManager = new ScoreManager();
    this.gunDetector = new GunDetector();
    this.handCursorUI = new HandCursorUI(this.camera);

    this.video = document.getElementById('webcam') as HTMLVideoElement;
    this.handIndicator = document.getElementById('hand-indicator')!;

    this.scoreEl = document.getElementById('score')!;
    this.comboEl = document.getElementById('combo')!;
    this.livesEl = document.getElementById('lives')!;
    this.timerEl = document.getElementById('timer')!;
    this.accuracyEl = document.getElementById('accuracy')!;
    this.powerUpHud = document.getElementById('powerup-hud')!;
    this.powerUpTimerEl = document.getElementById('powerup-timer')!;
    this.aircraftWarningEl = document.getElementById('aircraft-warning')!;

    this.setupMenuHandlers();
    this.clock = new THREE.Clock();
    this.animate();
  }

  private setupThreeJS(): void {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 0, CAMERA_Z);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.getElementById('game-container')!.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x667788, 0.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffee, 1.0);
    sun.position.set(5, 10, 8);
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x8888ff, 0.3);
    fill.position.set(-5, -3, 5);
    this.scene.add(fill);
  }

  private setupBackground(): void {
    const bgGeo = new THREE.PlaneGeometry(60, 40);
    const bgMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x1a1a4e) },
        bottomColor: { value: new THREE.Color(0xff7744) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec2 vUv;
        void main() {
          gl_FragColor = vec4(mix(bottomColor, topColor, vUv.y), 1.0);
        }
      `,
      depthWrite: false,
    });
    const bg = new THREE.Mesh(bgGeo, bgMat);
    bg.position.z = -10;
    this.scene.add(bg);

    for (let i = 0; i < 6; i++) {
      const cloudGeo = new THREE.SphereGeometry(1 + Math.random() * 2, 8, 6);
      cloudGeo.scale(2 + Math.random(), 0.5, 1);
      const cloudMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.15 + Math.random() * 0.1,
      });
      const cloud = new THREE.Mesh(cloudGeo, cloudMat);
      cloud.position.set(
        (Math.random() - 0.5) * SCENE_WIDTH * 1.5,
        2 + Math.random() * 5,
        -5 - Math.random() * 3
      );
      this.scene.add(cloud);
    }
  }

  private setupMenuHandlers(): void {
    const startBtn = (mode: GameMode) => {
      return () => {
        this.mode = mode;
        this.startLoading();
      };
    };

    document.getElementById('btn-classic')!.addEventListener('click', startBtn('classic'));
    document.getElementById('btn-arcade')!.addEventListener('click', startBtn('arcade'));
    document.getElementById('btn-zen')!.addEventListener('click', startBtn('zen'));
    document.getElementById('btn-restart')!.addEventListener('click', () => {
      document.getElementById('gameover-screen')!.style.display = 'none';
      document.getElementById('menu-screen')!.style.display = 'flex';
      this.state = 'menu';
    });
  }

  private async startLoading(): Promise<void> {
    this.state = 'loading';
    document.getElementById('menu-screen')!.style.display = 'none';
    document.getElementById('loading-screen')!.style.display = 'flex';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      this.video.srcObject = stream;
      await this.video.play();

      this.handTracker = new HandTracker(this.video);
      await this.handTracker.init();
      this.audio.init();

      document.getElementById('loading-screen')!.style.display = 'none';
      this.startGame();
    } catch (err) {
      console.error('Failed to initialize:', err);
      document.getElementById('loading-screen')!.innerHTML = `
        <h2 style="color:#ff4444">Camera access required</h2>
        <p>Please allow camera access and refresh the page.</p>
      `;
    }
  }

  private startGame(): void {
    this.state = 'playing';
    this.gameTime = 0;
    this.difficulty = 0;
    this.lives = CLASSIC_LIVES;
    this.shakeIntensity = 0;
    this.rapidFireRemaining = 0;
    this.gunDetector.rapidFire = false;

    // Aircraft spawn timing
    this.aircraftTimer = 0;
    this.nextAircraftTime = AIRCRAFT_SPAWN_INTERVAL_MIN +
      Math.random() * (AIRCRAFT_SPAWN_INTERVAL_MAX - AIRCRAFT_SPAWN_INTERVAL_MIN);

    // Power-up spawn timing
    this.powerUpTimer = 0;
    this.nextPowerUpTime = POWERUP_SPAWN_INTERVAL_MIN +
      Math.random() * (POWERUP_SPAWN_INTERVAL_MAX - POWERUP_SPAWN_INTERVAL_MIN);

    // Clear entities
    for (const bird of this.birds) this.scene.remove(bird.mesh);
    for (const ac of this.aircrafts) this.scene.remove(ac.mesh);
    for (const pu of this.powerUps) this.scene.remove(pu.mesh);
    this.birds = [];
    this.aircrafts = [];
    this.powerUps = [];
    this.particles.clear();

    this.scoreManager.reset();
    this.birdSpawner.reset();

    document.getElementById('hud')!.style.display = 'block';
    this.powerUpHud.style.display = 'none';
    this.aircraftWarningEl.style.display = 'none';
    this.updateHUD();

    this.livesEl.style.display = this.mode === 'classic' ? 'block' : 'none';
    this.timerEl.style.display = this.mode !== 'classic' ? 'block' : 'none';
  }

  private endGame(reason?: string): void {
    this.state = 'gameover';
    this.audio.playGameOver();

    document.getElementById('hud')!.style.display = 'none';
    this.powerUpHud.style.display = 'none';
    this.aircraftWarningEl.style.display = 'none';
    this.crosshairRenderer.hide();

    const goScreen = document.getElementById('gameover-screen')!;
    goScreen.style.display = 'flex';

    const reasonEl = document.getElementById('gameover-reason')!;
    reasonEl.textContent = reason || '';
    reasonEl.style.display = reason ? 'block' : 'none';

    document.getElementById('final-score')!.textContent = String(this.scoreManager.score);
    document.getElementById('final-hits')!.textContent = String(this.scoreManager.totalHits);
    document.getElementById('final-accuracy')!.textContent = `${this.scoreManager.accuracy}%`;
    document.getElementById('final-combo')!.textContent = String(this.scoreManager.maxCombo);
    document.getElementById('final-escaped')!.textContent = String(this.scoreManager.birdsEscaped);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.05);

    const hands = this.handTracker ? this.handTracker.detect() : [];

    this.handIndicator.textContent = hands.length > 0
      ? `${hands.length} hand${hands.length > 1 ? 's' : ''} detected`
      : 'Show hands to camera';
    this.handIndicator.style.color = hands.length > 0 ? '#00ff88' : '#ff6644';

    if (this.state === 'menu' || this.state === 'gameover') {
      const primaryHand = hands[0];
      this.handCursorUI.update(primaryHand ? primaryHand.indexTip : null, dt);
    }

    if (this.state === 'playing') {
      this.handCursorUI.hide();
      this.updateGame(dt, hands);
    }

    // Screen shake
    if (this.shakeIntensity > 0.001) {
      this.camera.position.set(
        this.cameraBasePos.x + (Math.random() - 0.5) * this.shakeIntensity,
        this.cameraBasePos.y + (Math.random() - 0.5) * this.shakeIntensity,
        this.cameraBasePos.z
      );
      this.shakeIntensity *= SCREEN_SHAKE_DECAY;
    } else {
      this.camera.position.copy(this.cameraBasePos);
    }

    this.renderer.render(this.scene, this.camera);
  };

  // Build the list of aim targets from all shootable/dangerous entities
  private buildTargets(): AimTarget[] {
    const targets: AimTarget[] = [];

    for (let i = 0; i < this.birds.length; i++) {
      const b = this.birds[i];
      if (!b.alive) continue;
      targets.push({
        kind: 'bird',
        index: i,
        position: b.position,
        radius: b.radius + BIRD_HIT_RADIUS_BONUS,
      });
    }

    for (let i = 0; i < this.aircrafts.length; i++) {
      const ac = this.aircrafts[i];
      if (!ac.alive) continue;
      targets.push({
        kind: 'aircraft',
        index: i,
        position: ac.position,
        radius: ac.radius,
      });
    }

    for (let i = 0; i < this.powerUps.length; i++) {
      const pu = this.powerUps[i];
      if (!pu.alive) continue;
      targets.push({
        kind: 'powerup',
        index: i,
        position: pu.position,
        radius: pu.radius + 0.2, // slightly generous
      });
    }

    return targets;
  }

  private updateGame(dt: number, hands: ReturnType<HandTracker['detect']>): void {
    this.gameTime += dt;
    this.difficulty = Math.min(1, this.gameTime / DIFFICULTY_RAMP_TIME);

    // Time-based game over for arcade/zen
    if (this.mode === 'arcade' && this.gameTime >= ARCADE_TIME) {
      this.endGame();
      return;
    }
    if (this.mode === 'zen' && this.gameTime >= ZEN_TIME) {
      this.endGame();
      return;
    }

    // Update rapid-fire buff
    if (this.rapidFireRemaining > 0) {
      this.rapidFireRemaining -= dt;
      if (this.rapidFireRemaining <= 0) {
        this.rapidFireRemaining = 0;
        this.gunDetector.rapidFire = false;
        this.audio.playPowerUpEnd();
        this.powerUpHud.style.display = 'none';
      } else {
        this.powerUpTimerEl.textContent = `${Math.ceil(this.rapidFireRemaining)}s`;
      }
    }

    // Build aim targets for gun detection
    const targets = this.buildTargets();

    // Gun detection with target awareness
    const guns = this.gunDetector.update(hands, dt, targets);

    // Update crosshairs with target-aware state
    this.crosshairRenderer.update(
      guns.map(g => {
        let chState: CrosshairState = 'idle';
        if (g.onTarget) {
          chState = g.onTarget.kind === 'aircraft' ? 'on_aircraft' : 'on_target';
        }
        return { position: g.aimPosition, state: chState };
      })
    );

    // Process shots — only fires when on target
    for (const gun of guns) {
      if (gun.justFired && gun.onTarget) {
        this.processShot(gun);
      }
    }

    // Spawn birds
    const newBirds = this.birdSpawner.update(dt, this.difficulty, this.scene);
    this.birds.push(...newBirds);

    // Spawn aircraft (not in zen mode)
    if (this.mode !== 'zen') {
      this.updateAircraftSpawning(dt);
    }

    // Spawn power-ups
    this.updatePowerUpSpawning(dt);

    // Update entities
    this.updateBirds(dt);
    this.updateAircrafts(dt);
    this.updatePowerUps(dt);

    // Update particles
    this.particles.update(dt);

    // Update combo timer
    this.scoreManager.updateCombo(dt);

    // Update HUD
    this.updateHUD();
  }

  private processShot(gun: GunState): void {
    const target = gun.onTarget!;

    this.scoreManager.registerShot();
    this.audio.playShoot();
    this.particles.spawnMuzzleFlash(gun.aimPosition.clone());

    switch (target.kind) {
      case 'bird':
        this.hitBird(this.birds[target.index], gun.aimPosition);
        break;
      case 'aircraft':
        this.hitAircraft(this.aircrafts[target.index], gun.aimPosition);
        break;
      case 'powerup':
        this.collectPowerUp(this.powerUps[target.index], gun.aimPosition);
        break;
    }
  }

  private hitBird(bird: ActiveBird, hitPos: THREE.Vector3): void {
    bird.alive = false;

    const earned = this.scoreManager.registerHit(bird.def.points);
    this.audio.playHit(this.scoreManager.combo);

    this.particles.spawnBirdHitEffect(
      bird.position.clone(),
      bird.def.bodyColor,
      bird.def.wingColor
    );

    this.shakeIntensity = SCREEN_SHAKE_INTENSITY;
    this.showFloatingScore(hitPos, earned);

    if (this.scoreManager.combo >= COMBO_MIN_HITS) {
      this.audio.playCombo(this.scoreManager.combo);
    }

    this.disposeMeshGroup(bird.mesh);
  }

  private hitAircraft(aircraft: Aircraft, _hitPos: THREE.Vector3): void {
    aircraft.alive = false;
    this.audio.playAircraftHit();

    this.particles.spawnAircraftExplosion(aircraft.position.clone());
    this.shakeIntensity = 0.4;

    this.disposeMeshGroup(aircraft.mesh);

    // Game over — shot down an aircraft!
    setTimeout(() => {
      this.endGame('You shot down a civilian aircraft!');
    }, 800);
  }

  private collectPowerUp(powerUp: PowerUp, hitPos: THREE.Vector3): void {
    powerUp.alive = false;
    this.audio.playPowerUp();

    this.particles.spawnPowerUpCollect(powerUp.position.clone());
    this.showFloatingText(hitPos, 'RAPID FIRE!', '#00ffff');

    this.rapidFireRemaining = POWERUP_DURATION;
    this.gunDetector.rapidFire = true;
    this.powerUpHud.style.display = 'flex';

    this.disposeMeshGroup(powerUp.mesh);
  }

  // --- Aircraft spawning ---

  private updateAircraftSpawning(dt: number): void {
    this.aircraftTimer += dt;
    if (this.aircraftTimer >= this.nextAircraftTime) {
      this.aircraftTimer = 0;
      // Spawn more frequently as difficulty increases
      const minT = AIRCRAFT_SPAWN_INTERVAL_MIN * (1 - this.difficulty * 0.3);
      const maxT = AIRCRAFT_SPAWN_INTERVAL_MAX * (1 - this.difficulty * 0.3);
      this.nextAircraftTime = minT + Math.random() * (maxT - minT);
      this.spawnAircraft();
    }
  }

  private spawnAircraft(): void {
    const mesh = this.birdFactory.createAircraft();
    const fromLeft = Math.random() > 0.5;
    const spawnX = fromLeft
      ? -(SCENE_WIDTH / 2 + 4)
      : (SCENE_WIDTH / 2 + 4);
    const spawnY = AIRCRAFT_Y_MIN + Math.random() * (AIRCRAFT_Y_MAX - AIRCRAFT_Y_MIN);
    const vx = fromLeft ? AIRCRAFT_SPEED : -AIRCRAFT_SPEED;

    mesh.position.set(spawnX, spawnY, 0);
    if (!fromLeft) mesh.scale.x = -1;
    this.scene.add(mesh);

    this.aircrafts.push({
      mesh,
      position: new THREE.Vector3(spawnX, spawnY, 0),
      velocity: new THREE.Vector3(vx, 0, 0),
      radius: AIRCRAFT_RADIUS,
      alive: true,
      propAngle: 0,
      timeAlive: 0,
    });

    this.audio.playAircraftWarning();
    // Flash the warning briefly
    this.aircraftWarningEl.style.display = 'block';
    setTimeout(() => {
      this.aircraftWarningEl.style.display = 'none';
    }, 2000);
  }

  private updateAircrafts(dt: number): void {
    for (let i = this.aircrafts.length - 1; i >= 0; i--) {
      const ac = this.aircrafts[i];
      if (!ac.alive) {
        this.aircrafts.splice(i, 1);
        continue;
      }

      ac.timeAlive += dt;
      ac.position.add(ac.velocity.clone().multiplyScalar(dt));
      ac.mesh.position.copy(ac.position);

      // Spin propeller
      ac.propAngle += dt * 25;
      const prop = ac.mesh.getObjectByName('propeller');
      if (prop) prop.rotation.x = ac.propAngle;

      // Slight body wobble
      ac.mesh.rotation.z = Math.sin(ac.timeAlive * 1.5) * 0.03;

      // Despawn
      const despawnX = SCENE_WIDTH / 2 + 5;
      if (Math.abs(ac.position.x) > despawnX) {
        this.disposeMeshGroup(ac.mesh);
        this.aircrafts.splice(i, 1);
      }
    }
  }

  // --- Power-up spawning ---

  private updatePowerUpSpawning(dt: number): void {
    this.powerUpTimer += dt;
    if (this.powerUpTimer >= this.nextPowerUpTime) {
      this.powerUpTimer = 0;
      this.nextPowerUpTime = POWERUP_SPAWN_INTERVAL_MIN +
        Math.random() * (POWERUP_SPAWN_INTERVAL_MAX - POWERUP_SPAWN_INTERVAL_MIN);
      this.spawnPowerUp();
    }
  }

  private spawnPowerUp(): void {
    const mesh = this.birdFactory.createPowerUp();
    const fromLeft = Math.random() > 0.5;
    const spawnX = fromLeft
      ? -(SCENE_WIDTH / 2 + 2)
      : (SCENE_WIDTH / 2 + 2);
    const spawnY = POWERUP_Y_MIN + Math.random() * (POWERUP_Y_MAX - POWERUP_Y_MIN);
    const vx = fromLeft ? POWERUP_SPEED : -POWERUP_SPEED;

    mesh.position.set(spawnX, spawnY, 0);
    this.scene.add(mesh);

    this.powerUps.push({
      mesh,
      position: new THREE.Vector3(spawnX, spawnY, 0),
      velocity: new THREE.Vector3(vx, 0, 0),
      radius: POWERUP_RADIUS,
      alive: true,
      timeAlive: 0,
      kind: 'rapid_fire',
    });
  }

  private updatePowerUps(dt: number): void {
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      if (!pu.alive) {
        this.powerUps.splice(i, 1);
        continue;
      }

      pu.timeAlive += dt;
      pu.position.add(pu.velocity.clone().multiplyScalar(dt));
      pu.mesh.position.copy(pu.position);

      // Bob up and down
      pu.mesh.position.y += Math.sin(pu.timeAlive * 3) * 0.3;

      // Spin the orb
      const orb = pu.mesh.getObjectByName('orb');
      if (orb) {
        orb.rotation.y += dt * 2;
        orb.rotation.x += dt * 0.5;
      }
      // Rotate ring
      const ring = pu.mesh.getObjectByName('ring');
      if (ring) ring.rotation.z += dt * 1.5;

      // Pulse scale
      const pulse = 1 + Math.sin(pu.timeAlive * 4) * 0.1;
      pu.mesh.scale.setScalar(pulse);

      // Despawn
      const despawnX = SCENE_WIDTH / 2 + 3;
      if (Math.abs(pu.position.x) > despawnX) {
        this.disposeMeshGroup(pu.mesh);
        this.powerUps.splice(i, 1);
      }
    }
  }

  // --- Bird updates ---

  private updateBirds(dt: number): void {
    for (let i = this.birds.length - 1; i >= 0; i--) {
      const bird = this.birds[i];

      if (!bird.alive) {
        this.birds.splice(i, 1);
        continue;
      }

      bird.timeAlive += dt;
      bird.position.add(bird.velocity.clone().multiplyScalar(dt));

      const wobbleOffset = Math.sin(bird.timeAlive * 2 + bird.wobblePhase) *
        bird.wobbleAmplitude * dt;
      bird.position.y += wobbleOffset;

      bird.mesh.position.copy(bird.position);

      // Wing flap
      bird.wingAngle += bird.wingSpeed * dt;
      const flapAngle = Math.sin(bird.wingAngle * Math.PI * 2) * 0.6;
      const leftWing = bird.mesh.getObjectByName('leftWing');
      const rightWing = bird.mesh.getObjectByName('rightWing');
      if (leftWing) leftWing.rotation.x = flapAngle;
      if (rightWing) rightWing.rotation.x = -flapAngle;

      bird.mesh.rotation.z = Math.sin(bird.wingAngle * Math.PI * 2) * 0.05;

      // Check escape
      const despawnX = SCENE_WIDTH / 2 + BIRD_DESPAWN_X_MARGIN;
      if (Math.abs(bird.position.x) > despawnX) {
        this.disposeMeshGroup(bird.mesh);
        this.birds.splice(i, 1);
        this.scoreManager.registerEscaped();

        if (this.mode === 'classic') {
          this.lives--;
          if (this.lives <= 0) {
            this.endGame();
            return;
          }
        }
      }
    }
  }

  // --- Helpers ---

  private disposeMeshGroup(group: THREE.Group): void {
    this.scene.remove(group);
    group.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  private showFloatingScore(pos: THREE.Vector3, points: number): void {
    let text = `+${points}`;
    let color = '#00ff88';
    if (this.scoreManager.combo >= COMBO_MIN_HITS) {
      text += ` x${this.scoreManager.combo}`;
      color = '#ffdd00';
    }
    this.showFloatingText(pos, text, color);
  }

  private showFloatingText(pos: THREE.Vector3, text: string, color: string): void {
    const projected = pos.clone().project(this.camera);
    const canvas = this.renderer.domElement;
    const x = (projected.x * 0.5 + 0.5) * canvas.clientWidth;
    const y = (-projected.y * 0.5 + 0.5) * canvas.clientHeight;

    const el = document.createElement('div');
    el.className = 'floating-score';
    el.textContent = text;
    el.style.color = color;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);

    requestAnimationFrame(() => {
      el.style.transform = 'translateY(-60px)';
      el.style.opacity = '0';
    });
    setTimeout(() => el.remove(), 800);
  }

  private updateHUD(): void {
    this.scoreEl.textContent = `Score: ${this.scoreManager.score}`;
    this.accuracyEl.textContent = `Accuracy: ${this.scoreManager.accuracy}%`;

    if (this.scoreManager.combo >= COMBO_MIN_HITS) {
      this.comboEl.textContent = `Combo x${this.scoreManager.combo}!`;
      this.comboEl.style.display = 'block';
    } else {
      this.comboEl.style.display = 'none';
    }

    if (this.mode === 'classic') {
      this.livesEl.textContent = '\u{1F426}'.repeat(this.lives);
    }

    if (this.mode === 'arcade') {
      const remaining = Math.max(0, Math.ceil(ARCADE_TIME - this.gameTime));
      this.timerEl.textContent = `Time: ${remaining}s`;
    } else if (this.mode === 'zen') {
      const remaining = Math.max(0, Math.ceil(ZEN_TIME - this.gameTime));
      this.timerEl.textContent = `Time: ${remaining}s`;
    }
  }
}

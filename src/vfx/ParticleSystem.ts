import * as THREE from 'three';
import { Feather, Particle, ShotTrail } from '../types';
import { BirdFactory } from '../bird/BirdFactory';
import {
  FEATHER_COUNT,
  FEATHER_SPEED,
  FEATHER_LIFE,
  HIT_PARTICLE_COUNT,
  HIT_PARTICLE_SPEED,
  HIT_PARTICLE_LIFE,
  MUZZLE_FLASH_LIFE,
} from '../constants';

export class ParticleSystem {
  private feathers: Feather[] = [];
  private particles: Particle[] = [];
  private shotTrails: ShotTrail[] = [];
  private scene: THREE.Scene;
  private birdFactory: BirdFactory;

  constructor(scene: THREE.Scene, birdFactory: BirdFactory) {
    this.scene = scene;
    this.birdFactory = birdFactory;
  }

  spawnBirdHitEffect(position: THREE.Vector3, bodyColor: number, wingColor: number): void {
    // Feathers
    for (let i = 0; i < FEATHER_COUNT; i++) {
      const color = Math.random() > 0.5 ? bodyColor : wingColor;
      const size = 0.15 + Math.random() * 0.2;
      const mesh = this.birdFactory.createFeather(color, size);
      mesh.position.copy(position);

      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.3) * Math.PI;
      const speed = FEATHER_SPEED * (0.5 + Math.random() * 0.5);

      const vel = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation) * speed,
        Math.sin(elevation) * speed + 2,
        Math.sin(angle) * Math.cos(elevation) * speed * 0.3
      );

      const angVel = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      );

      this.scene.add(mesh);
      this.feathers.push({
        mesh,
        velocity: vel,
        angularVel: angVel,
        life: FEATHER_LIFE,
        maxLife: FEATHER_LIFE,
      });
    }

    // Hit particles (small colored dots)
    for (let i = 0; i < HIT_PARTICLE_COUNT; i++) {
      const geo = new THREE.SphereGeometry(0.05 + Math.random() * 0.08, 4, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? bodyColor : 0xffffff,
        transparent: true,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);

      const angle = Math.random() * Math.PI * 2;
      const speed = HIT_PARTICLE_SPEED * (0.3 + Math.random() * 0.7);
      const vel = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed + 1,
        (Math.random() - 0.5) * speed * 0.3
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: vel,
        life: HIT_PARTICLE_LIFE,
        maxLife: HIT_PARTICLE_LIFE,
        startScale: 1,
      });
    }
  }

  spawnMuzzleFlash(position: THREE.Vector3): void {
    const geo = new THREE.SphereGeometry(0.2, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffff44,
      transparent: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    this.scene.add(mesh);

    this.particles.push({
      mesh,
      velocity: new THREE.Vector3(0, 0, 0),
      life: MUZZLE_FLASH_LIFE,
      maxLife: MUZZLE_FLASH_LIFE,
      startScale: 1,
    });

    // Ring effect
    const ringGeo = new THREE.RingGeometry(0.1, 0.25, 12);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(position);
    this.scene.add(ring);

    this.particles.push({
      mesh: ring,
      velocity: new THREE.Vector3(0, 0, 0),
      life: MUZZLE_FLASH_LIFE * 1.5,
      maxLife: MUZZLE_FLASH_LIFE * 1.5,
      startScale: 1,
    });
  }

  spawnShotTrail(from: THREE.Vector3, to: THREE.Vector3): void {
    const direction = new THREE.Vector3().subVectors(to, from);
    const length = direction.length();
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);

    const geo = new THREE.PlaneGeometry(length, 0.03);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffdd44,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(mid);
    mesh.lookAt(to);
    mesh.rotateY(Math.PI / 2);

    this.scene.add(mesh);
    this.shotTrails.push({
      mesh,
      life: 0.1,
      maxLife: 0.1,
    });
  }

  spawnPowerUpCollect(position: THREE.Vector3): void {
    for (let i = 0; i < 16; i++) {
      const geo = new THREE.SphereGeometry(0.06, 4, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0x00ffff : 0xffff00,
        transparent: true,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);

      const angle = (i / 16) * Math.PI * 2;
      const speed = 3 + Math.random() * 2;
      const vel = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 2
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: vel,
        life: 0.6,
        maxLife: 0.6,
        startScale: 1.5,
      });
    }
  }

  spawnAircraftExplosion(position: THREE.Vector3): void {
    // Large fiery explosion
    for (let i = 0; i < 30; i++) {
      const geo = new THREE.SphereGeometry(0.08 + Math.random() * 0.12, 4, 4);
      const colors = [0xff4400, 0xff8800, 0xffcc00, 0xff0000, 0x333333];
      const mat = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);

      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.5) * Math.PI;
      const speed = 4 + Math.random() * 6;
      const vel = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation) * speed,
        Math.sin(elevation) * speed + 2,
        Math.sin(angle) * Math.cos(elevation) * speed * 0.5
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: vel,
        life: 1.0,
        maxLife: 1.0,
        startScale: 2,
      });
    }

    // Debris chunks
    for (let i = 0; i < 10; i++) {
      const geo = new THREE.BoxGeometry(0.15, 0.08, 0.1);
      const mat = new THREE.MeshPhongMaterial({
        color: Math.random() > 0.5 ? 0xcccccc : 0x2255cc,
        transparent: true,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);

      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 4;
      const vel = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.random() * speed,
        Math.sin(angle) * speed * 0.3
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: vel,
        life: 1.5,
        maxLife: 1.5,
        startScale: 1,
      });
    }
  }

  spawnMissEffect(position: THREE.Vector3): void {
    // Small puff for misses
    for (let i = 0; i < 4; i++) {
      const geo = new THREE.SphereGeometry(0.03, 4, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x888888,
        transparent: true,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);

      const angle = Math.random() * Math.PI * 2;
      const vel = new THREE.Vector3(
        Math.cos(angle) * 1.5,
        Math.sin(angle) * 1.5 + 0.5,
        0
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: vel,
        life: 0.4,
        maxLife: 0.4,
        startScale: 1,
      });
    }
  }

  update(dt: number): void {
    const gravity = -6;

    // Update feathers
    for (let i = this.feathers.length - 1; i >= 0; i--) {
      const f = this.feathers[i];
      f.life -= dt;

      if (f.life <= 0) {
        this.scene.remove(f.mesh);
        f.mesh.geometry.dispose();
        (f.mesh.material as THREE.Material).dispose();
        this.feathers.splice(i, 1);
        continue;
      }

      f.velocity.y += gravity * dt * 0.3; // feathers fall slowly
      f.mesh.position.add(f.velocity.clone().multiplyScalar(dt));
      f.mesh.rotation.x += f.angularVel.x * dt;
      f.mesh.rotation.y += f.angularVel.y * dt;
      f.mesh.rotation.z += f.angularVel.z * dt;

      const alpha = f.life / f.maxLife;
      (f.mesh.material as THREE.MeshPhongMaterial).opacity = alpha;
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }

      p.velocity.y += gravity * dt * 0.5;
      p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));

      const alpha = p.life / p.maxLife;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = alpha;
      const scale = p.startScale * (0.5 + alpha * 0.5);
      p.mesh.scale.setScalar(scale);
    }

    // Update shot trails
    for (let i = this.shotTrails.length - 1; i >= 0; i--) {
      const t = this.shotTrails[i];
      t.life -= dt;

      if (t.life <= 0) {
        this.scene.remove(t.mesh);
        t.mesh.geometry.dispose();
        (t.mesh.material as THREE.Material).dispose();
        this.shotTrails.splice(i, 1);
        continue;
      }

      const alpha = t.life / t.maxLife;
      (t.mesh.material as THREE.MeshBasicMaterial).opacity = alpha * 0.8;
    }
  }

  clear(): void {
    for (const f of this.feathers) {
      this.scene.remove(f.mesh);
      f.mesh.geometry.dispose();
      (f.mesh.material as THREE.Material).dispose();
    }
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    for (const t of this.shotTrails) {
      this.scene.remove(t.mesh);
      t.mesh.geometry.dispose();
      (t.mesh.material as THREE.Material).dispose();
    }
    this.feathers = [];
    this.particles = [];
    this.shotTrails = [];
  }
}

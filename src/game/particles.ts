import * as THREE from 'three';

const MAX_PARTICLES = 600;

interface Particle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  colorR: number;
  colorG: number;
  colorB: number;
  alpha: number;
  life: number;
  maxLife: number;
  drag: number;
  gravity: number;
}

interface Shockwave {
  active: boolean;
  x: number;
  z: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  mesh: THREE.Mesh;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private pointsMesh: THREE.Points;
  private geo: THREE.BufferGeometry;
  private positions: Float32Array;
  private colors: Float32Array;
  private shockwaves: Shockwave[] = [];
  private shockwaveGroup: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 4); // RGBA or use size in points

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        size: 1,
        colorR: 1,
        colorG: 1,
        colorB: 1,
        alpha: 0,
        life: 0,
        maxLife: 1,
        drag: 0.95,
        gravity: 0,
      });
      this.positions[i * 3 + 1] = -100;
    }

    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 4));

    const mat = new THREE.PointsMaterial({
      size: 0.45,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.pointsMesh = new THREE.Points(this.geo, mat);
    scene.add(this.pointsMesh);

    // Shockwave Rings Pool
    this.shockwaveGroup = new THREE.Group();
    const ringGeo = new THREE.RingGeometry(0.8, 1.0, 32);
    ringGeo.rotateX(-Math.PI / 2);

    for (let i = 0; i < 8; i++) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(ringGeo, ringMat);
      mesh.position.y = 0.08;
      mesh.visible = false;
      this.shockwaveGroup.add(mesh);
      this.shockwaves.push({
        active: false,
        x: 0,
        z: 0,
        radius: 0.1,
        maxRadius: 6,
        life: 0,
        maxLife: 0.5,
        mesh,
      });
    }
    scene.add(this.shockwaveGroup);
  }

  public emit(
    x: number,
    y: number,
    z: number,
    count: number,
    options?: {
      speed?: number;
      spread?: number;
      color?: { r: number; g: number; b: number };
      life?: number;
      drag?: number;
      gravity?: number;
    }
  ) {
    const speed = options?.speed ?? 6;
    const spread = options?.spread ?? 1;
    const cr = options?.color?.r ?? 0.3;
    const cg = options?.color?.g ?? 0.8;
    const cb = options?.color?.b ?? 1.0;
    const maxLife = options?.life ?? 0.4;
    const drag = options?.drag ?? 0.92;
    const gravity = options?.gravity ?? -2.0;

    let emitted = 0;
    for (let i = 0; i < MAX_PARTICLES && emitted < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        p.z = z;
        p.vx = (Math.random() - 0.5) * speed * spread;
        p.vy = (Math.random() - 0.2) * speed;
        p.vz = (Math.random() - 0.5) * speed * spread;
        p.colorR = cr;
        p.colorG = cg;
        p.colorB = cb;
        p.alpha = 1.0;
        p.life = maxLife;
        p.maxLife = maxLife;
        p.drag = drag;
        p.gravity = gravity;
        emitted++;
      }
    }
  }

  public emitThrusterPuff(x: number, y: number, z: number, dirX: number, dirZ: number) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = x + (Math.random() - 0.5) * 0.15;
        p.y = y;
        p.z = z + (Math.random() - 0.5) * 0.15;
        p.vx = -dirX * 5 + (Math.random() - 0.5) * 0.8;
        p.vy = (Math.random() - 0.5) * 0.3;
        p.vz = -dirZ * 5 + (Math.random() - 0.5) * 0.8;
        p.colorR = 0.2;
        p.colorG = 0.7;
        p.colorB = 1.0;
        p.alpha = 0.8;
        p.life = 0.18;
        p.maxLife = 0.18;
        p.drag = 0.85;
        p.gravity = 0;
        break;
      }
    }
  }

  public emitShockwave(x: number, z: number, maxRadius: number = 8, colorHex: number = 0x38bdf8) {
    for (const sw of this.shockwaves) {
      if (!sw.active) {
        sw.active = true;
        sw.x = x;
        sw.z = z;
        sw.radius = 0.5;
        sw.maxRadius = maxRadius;
        sw.life = 0;
        sw.maxLife = 0.45;
        sw.mesh.position.set(x, 0.08, z);
        sw.mesh.scale.set(0.5, 0.5, 0.5);
        (sw.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
        (sw.mesh.material as THREE.MeshBasicMaterial).opacity = 0.8;
        sw.mesh.visible = true;
        break;
      }
    }
  }

  public update(delta: number) {
    let activeCount = 0;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (p.active) {
        activeCount++;
        p.life -= delta;
        if (p.life <= 0) {
          p.active = false;
          this.positions[i * 3 + 1] = -100; // hide below world
          continue;
        }

        // Physics
        p.x += p.vx * delta;
        p.y += p.vy * delta;
        p.z += p.vz * delta;
        p.vx *= p.drag;
        p.vy += p.gravity * delta;
        p.vz *= p.drag;

        // Ground bounce/clamp
        if (p.y < 0.05) {
          p.y = 0.05;
          p.vy = -p.vy * 0.3;
        }

        const lifeRatio = p.life / p.maxLife;
        this.positions[i * 3] = p.x;
        this.positions[i * 3 + 1] = p.y;
        this.positions[i * 3 + 2] = p.z;

        this.colors[i * 4] = p.colorR;
        this.colors[i * 4 + 1] = p.colorG;
        this.colors[i * 4 + 2] = p.colorB;
        this.colors[i * 4 + 3] = lifeRatio * p.alpha;
      }
    }

    if (activeCount > 0) {
      this.geo.attributes.position.needsUpdate = true;
      this.geo.attributes.color.needsUpdate = true;
    }

    // Update Shockwaves
    for (const sw of this.shockwaves) {
      if (sw.active) {
        sw.life += delta;
        const progress = sw.life / sw.maxLife;
        if (progress >= 1.0) {
          sw.active = false;
          sw.mesh.visible = false;
        } else {
          const currentR = THREE.MathUtils.lerp(0.5, sw.maxRadius, progress);
          sw.mesh.scale.set(currentR, currentR, currentR);
          (sw.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.75;
        }
      }
    }
  }

  public dispose() {
    this.geo.dispose();
    (this.pointsMesh.material as THREE.Material).dispose();
  }
}

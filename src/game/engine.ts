import * as THREE from 'three';
import { sound } from './audio';
import { setupEnvironment, ARENA_RADIUS, EnvironmentRig } from './environment';
import {
  createPlayerShip,
  createScoutDrone,
  createHeavyEnforcer,
  createPhantomHunter,
  createBossModel,
  createPowerupMesh,
  createTelegraphRingMesh,
  materials,
} from './models';
import { ParticleSystem } from './particles';
import {
  GamePhase,
  PlayerStats,
  EnemyEntity,
  EnemyType,
  ProjectileEntity,
  PowerupEntity,
  TelegraphRing,
  FloatingText,
} from './types';

// Pre-allocated math objects to avoid garbage collection in animation loop
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3C = new THREE.Vector3();
const _mouseVec2 = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.0);
const _hitPoint = new THREE.Vector3();

export interface EngineCallbacks {
  onStatsUpdate: (stats: PlayerStats) => void;
  onPhaseChange: (phase: GamePhase) => void;
  onBossStateChange: (bossActive: boolean, bossHp: number, bossMaxHp: number) => void;
  onFloatingText: (texts: FloatingText[]) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private environmentRig!: EnvironmentRig;
  private particles!: ParticleSystem;
  private isSoftwareGl: boolean = false;
  private frameId: number = 0;
  private isDestroyed: boolean = false;

  // Game State
  private phase: GamePhase = 'title';
  private stats: PlayerStats = {
    hp: 100,
    maxHp: 100,
    shield: 100,
    maxShield: 100,
    score: 0,
    highScore: 0,
    wave: 1,
    kills: 0,
    boost: 100,
    maxBoost: 100,
    isBoosting: false,
    empCooldown: 0,
    maxEmpCooldown: 12,
    weaponType: 'plasma',
    weaponLevel: 1,
    powerupTimer: 0,
  };

  // Player Entity in 3D
  private playerGroup!: THREE.Group;
  private playerThrusters: THREE.Mesh[] = [];
  private playerWings!: THREE.Mesh;
  private playerCanopy!: THREE.Mesh;
  private playerX: number = 0;
  private playerZ: number = 0;
  private playerVx: number = 0;
  private playerVz: number = 0;
  private playerRotation: number = 0;
  private playerTargetRotation: number = 0;
  private playerBankRoll: number = 0;
  private playerPitch: number = 0;
  private playerFireTimer: number = 0;
  private playerInvulnerableTimer: number = 0;

  // Camera & Juice
  private cameraTarget = new THREE.Vector3();
  private cameraShakeTrauma: number = 0;
  private hitstopDuration: number = 0;

  // Entity Lists
  private enemies: EnemyEntity[] = [];
  private projectiles: ProjectileEntity[] = [];
  private powerups: PowerupEntity[] = [];
  private telegraphRings: TelegraphRing[] = [];
  private floatingTexts: FloatingText[] = [];
  private nextEntityId: number = 1;

  // Wave Manager
  private waveSpawnTimer: number = 2.0;
  private enemiesToSpawnInWave: number = 0;
  private bossEntity: EnemyEntity | null = null;
  private bossModelRefs: { core: THREE.Mesh; shieldRing: THREE.Mesh } | null = null;

  // Input Handling
  private heldKeys = new Set<string>();
  private justPressedKeys = new Set<string>();
  private mouseAim = { x: 0, z: 0, isAimingWithMouse: false, isMouseDown: false };
  private virtualJoystick = { active: false, dx: 0, dy: 0 };

  // Timing
  private lastTime: number = 0;

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // Load High Score
    try {
      this.stats.highScore = parseInt(localStorage.getItem('cyber_horizon_highscore') || '0', 10);
    } catch {
      this.stats.highScore = 0;
    }

    this.initThree();
    this.initInputListeners();
    this.callbacks.onStatsUpdate({ ...this.stats });
    this.callbacks.onPhaseChange(this.phase);

    this.lastTime = performance.now();
    this.tick();
  }

  private initThree() {
    // Software WebGL Detection per Three.js skill
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.5, 300);
    this.camera.position.set(0, 28, 24);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // Environment & Lighting
    this.environmentRig = setupEnvironment(this.scene, this.renderer, this.isSoftwareGl);
    this.particles = new ParticleSystem(this.scene);

    // Player Model
    const p = createPlayerShip();
    this.playerGroup = p.group;
    this.playerThrusters = p.thrusters;
    this.playerWings = p.wings;
    this.playerCanopy = p.canopy;
    this.scene.add(this.playerGroup);

    // Resize handling
    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    if (!this.container || this.isDestroyed) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private initInputListeners() {
    window.addEventListener('keydown', (e) => {
      // Space / Enter shortcuts
      if ((e.code === 'Space' || e.code === 'Enter') && this.phase === 'title') {
        this.startGame();
        e.preventDefault();
        return;
      }
      if ((e.code === 'Space' || e.code === 'Enter') && (this.phase === 'gameover' || this.phase === 'victory')) {
        this.startGame();
        e.preventDefault();
        return;
      }
      if (e.code === 'Escape') {
        this.togglePause();
        e.preventDefault();
        return;
      }

      if (!this.heldKeys.has(e.code)) {
        this.justPressedKeys.add(e.code);
      }
      this.heldKeys.add(e.code);

      // Prevent window scrolling on arrow keys or space
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.heldKeys.delete(e.code);
    });

    // Clear held keys on window blur per 60fps input craft rules
    window.addEventListener('blur', () => {
      this.heldKeys.clear();
      this.justPressedKeys.clear();
      this.mouseAim.isMouseDown = false;
      this.virtualJoystick.active = false;
    });

    // Mouse aiming on playfield
    window.addEventListener('pointermove', (e) => {
      if (this.phase !== 'playing') return;
      const rect = this.container.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Unproject to ground plane (Y = 1.0)
      _mouseVec2.set(ndcX, ndcY);
      _raycaster.setFromCamera(_mouseVec2, this.camera);
      if (_raycaster.ray.intersectPlane(_groundPlane, _hitPoint)) {
        this.mouseAim.x = _hitPoint.x;
        this.mouseAim.z = _hitPoint.z;
        this.mouseAim.isAimingWithMouse = true;
      }
    });

    window.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) {
        return; // Don't capture UI buttons
      }
      sound.activate();
      if (this.phase === 'playing') {
        this.mouseAim.isMouseDown = true;
      }
    });

    window.addEventListener('pointerup', () => {
      this.mouseAim.isMouseDown = false;
    });
  }

  public setVirtualJoystick(active: boolean, dx: number, dy: number) {
    this.virtualJoystick.active = active;
    this.virtualJoystick.dx = dx;
    this.virtualJoystick.dy = dy;
  }

  public triggerEmpSpecial() {
    if (this.phase !== 'playing') return;
    if (this.stats.empCooldown <= 0) {
      this.fireEmpNova();
    }
  }

  public triggerBoost(active: boolean) {
    this.stats.isBoosting = active;
  }

  public startGame() {
    sound.activate();
    this.phase = 'playing';
    this.callbacks.onPhaseChange(this.phase);

    // Reset player stats
    this.stats = {
      hp: 100,
      maxHp: 100,
      shield: 100,
      maxShield: 100,
      score: 0,
      highScore: this.stats.highScore,
      wave: 1,
      kills: 0,
      boost: 100,
      maxBoost: 100,
      isBoosting: false,
      empCooldown: 0,
      maxEmpCooldown: 12,
      weaponType: 'plasma',
      weaponLevel: 1,
      powerupTimer: 0,
    };

    this.playerX = 0;
    this.playerZ = 0;
    this.playerVx = 0;
    this.playerVz = 0;
    this.playerRotation = 0;
    this.playerTargetRotation = 0;
    this.playerInvulnerableTimer = 1.0;

    // Clear existing combat objects
    this.clearAllCombatEntities();

    // Start Wave 1
    this.startWave(1);
    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  public togglePause() {
    if (this.phase === 'playing') {
      this.phase = 'paused';
      this.callbacks.onPhaseChange(this.phase);
    } else if (this.phase === 'paused') {
      this.phase = 'playing';
      this.callbacks.onPhaseChange(this.phase);
    }
  }

  public restartGame() {
    this.startGame();
  }

  private clearAllCombatEntities() {
    for (const e of this.enemies) {
      this.scene.remove(e.meshGroup);
      if (e.telegraphMesh) this.scene.remove(e.telegraphMesh);
    }
    this.enemies = [];

    for (const p of this.projectiles) {
      this.scene.remove(p.mesh);
    }
    this.projectiles = [];

    for (const pu of this.powerups) {
      this.scene.remove(pu.mesh);
    }
    this.powerups = [];

    for (const tr of this.telegraphRings) {
      this.scene.remove(tr.mesh);
    }
    this.telegraphRings = [];

    this.floatingTexts = [];
    this.bossEntity = null;
    this.bossModelRefs = null;
    this.callbacks.onBossStateChange(false, 0, 0);
  }

  private startWave(waveNum: number) {
    this.stats.wave = waveNum;
    this.waveSpawnTimer = 1.5;

    // Show wave notice
    this.spawnFloatingText(`WAVE ${waveNum}`, this.playerX, 3.5, this.playerZ, '#38bdf8');

    if (waveNum % 5 === 0) {
      // Boss Wave!
      sound.playBossWarning();
      this.spawnBoss();
      this.enemiesToSpawnInWave = 0;
    } else {
      // Standard wave scale
      this.enemiesToSpawnInWave = 5 + waveNum * 3;
    }
  }

  private spawnBoss() {
    const boss = createBossModel();
    this.bossModelRefs = { core: boss.core, shieldRing: boss.shieldRing };

    const bossHp = 450 + this.stats.wave * 120;
    const enemy: EnemyEntity = {
      id: this.nextEntityId++,
      type: 'boss',
      x: 0,
      z: -32,
      vx: 0,
      vz: 0,
      rotation: Math.PI,
      hp: bossHp,
      maxHp: bossHp,
      radius: 3.2,
      speed: 3.5,
      attackTimer: 1.0,
      telegraphTimer: 0,
      telegraphDuration: 0.8,
      isTelegraphing: false,
      telegraphTargetX: 0,
      telegraphTargetZ: 0,
      hitFlashTimer: 0,
      meshGroup: boss.group,
    };

    boss.group.position.set(enemy.x, 2.0, enemy.z);
    this.scene.add(boss.group);
    this.enemies.push(enemy);
    this.bossEntity = enemy;

    this.callbacks.onBossStateChange(true, enemy.hp, enemy.maxHp);
  }

  private spawnEnemy(type: EnemyType) {
    // Spawn around arena perimeter
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = ARENA_RADIUS * 0.85;
    const x = Math.cos(angle) * spawnDist;
    const z = Math.sin(angle) * spawnDist;

    let group: THREE.Group;
    let hp = 30;
    let radius = 1.0;
    let speed = 9.0;
    let attackTimer = 1.5 + Math.random() * 1.0;
    let telegraphDuration = 0.5;

    if (type === 'drone') {
      group = createScoutDrone();
      hp = 25 + this.stats.wave * 4;
      radius = 0.8;
      speed = 10.5;
      attackTimer = 1.8 + Math.random();
      telegraphDuration = 0.45;
    } else if (type === 'enforcer') {
      group = createHeavyEnforcer();
      hp = 70 + this.stats.wave * 12;
      radius = 1.6;
      speed = 5.0;
      attackTimer = 2.5 + Math.random();
      telegraphDuration = 1.1; // longer telegraphed mortar windup
    } else {
      // Hunter
      group = createPhantomHunter();
      hp = 45 + this.stats.wave * 8;
      radius = 1.2;
      speed = 13.0;
      attackTimer = 2.0 + Math.random();
      telegraphDuration = 0.6;
    }

    group.position.set(x, 1.0, z);
    this.scene.add(group);

    const enemy: EnemyEntity = {
      id: this.nextEntityId++,
      type,
      x,
      z,
      vx: 0,
      vz: 0,
      rotation: 0,
      hp,
      maxHp: hp,
      radius,
      speed,
      attackTimer,
      telegraphTimer: 0,
      telegraphDuration,
      isTelegraphing: false,
      telegraphTargetX: 0,
      telegraphTargetZ: 0,
      hitFlashTimer: 0,
      meshGroup: group,
    };

    this.enemies.push(enemy);
  }

  private spawnPowerup(x: number, z: number) {
    const kinds: ('shield' | 'overcharge' | 'emp' | 'boost')[] = ['shield', 'overcharge', 'emp', 'boost'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const mesh = createPowerupMesh(kind);
    mesh.position.set(x, 0.8, z);
    this.scene.add(mesh);

    this.powerups.push({
      id: this.nextEntityId++,
      kind,
      x,
      z,
      rotation: 0,
      life: 18.0,
      mesh,
    });
  }

  private firePlayerWeapon() {
    sound.playLaser(this.stats.weaponLevel);
    this.playerFireTimer = this.stats.weaponType === 'plasma' ? 0.14 : 0.22;

    // Small camera impulse & recoil
    this.cameraShakeTrauma = Math.min(1.0, this.cameraShakeTrauma + 0.08);

    const forwardX = Math.sin(this.playerRotation);
    const forwardZ = Math.cos(this.playerRotation);

    // Left and Right Cannons
    const perpX = Math.cos(this.playerRotation);
    const perpZ = -Math.sin(this.playerRotation);

    const spawnPositions = [
      { x: this.playerX + perpX * 0.9 + forwardX * 0.8, z: this.playerZ + perpZ * 0.9 + forwardZ * 0.8 },
      { x: this.playerX - perpX * 0.9 + forwardX * 0.8, z: this.playerZ - perpZ * 0.9 + forwardZ * 0.8 },
    ];

    const projSpeed = 46;
    const damage = 22 + this.stats.weaponLevel * 7;

    spawnPositions.forEach((pos) => {
      const geo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6);
      geo.rotateX(Math.PI / 2);
      const mesh = new THREE.Mesh(geo, materials.playerLaser);
      mesh.position.set(pos.x, 1.0, pos.z);
      mesh.rotation.y = this.playerRotation;
      this.scene.add(mesh);

      this.projectiles.push({
        id: this.nextEntityId++,
        isPlayer: true,
        x: pos.x,
        y: 1.0,
        z: pos.z,
        vx: forwardX * projSpeed,
        vy: 0,
        vz: forwardZ * projSpeed,
        damage,
        radius: 0.5,
        life: 0,
        maxLife: 1.2,
        color: 0x38bdf8,
        mesh,
      });

      // Muzzle spark
      this.particles.emit(pos.x, 1.0, pos.z, 4, {
        speed: 5,
        color: { r: 0.2, g: 0.8, b: 1.0 },
        life: 0.15,
      });
    });

    // Spread tier shots if upgraded
    if (this.stats.weaponLevel >= 2) {
      [-0.18, 0.18].forEach((angleOffset) => {
        const spreadRot = this.playerRotation + angleOffset;
        const sFx = Math.sin(spreadRot);
        const sFz = Math.cos(spreadRot);

        const geo = new THREE.CylinderGeometry(0.06, 0.06, 0.9, 6);
        geo.rotateX(Math.PI / 2);
        const mesh = new THREE.Mesh(geo, materials.playerLaser);
        mesh.position.set(this.playerX, 1.0, this.playerZ);
        mesh.rotation.y = spreadRot;
        this.scene.add(mesh);

        this.projectiles.push({
          id: this.nextEntityId++,
          isPlayer: true,
          x: this.playerX,
          y: 1.0,
          z: this.playerZ,
          vx: sFx * projSpeed * 0.95,
          vy: 0,
          vz: sFz * projSpeed * 0.95,
          damage: damage * 0.7,
          radius: 0.45,
          life: 0,
          maxLife: 1.0,
          color: 0x38bdf8,
          mesh,
        });
      });
    }
  }

  private fireEmpNova() {
    this.stats.empCooldown = this.stats.maxEmpCooldown;
    sound.playEmpShockwave();

    this.cameraShakeTrauma = Math.min(1.0, this.cameraShakeTrauma + 0.5);
    this.particles.emitShockwave(this.playerX, this.playerZ, 24, 0xa855f7);
    this.particles.emit(this.playerX, 1.0, this.playerZ, 60, {
      speed: 16,
      spread: 2,
      color: { r: 0.65, g: 0.35, b: 1.0 },
      life: 0.6,
    });

    // Destroy all incoming enemy projectiles & heavily damage all nearby enemies
    for (const p of this.projectiles) {
      if (!p.isPlayer) {
        p.life = p.maxLife + 1; // triggers removal
      }
    }

    for (const e of this.enemies) {
      const dist = Math.hypot(e.x - this.playerX, e.z - this.playerZ);
      if (dist < 24) {
        const dmg = Math.floor(80 * (1 - dist / 28));
        e.hp -= dmg;
        e.hitFlashTimer = 0.2;
        this.spawnFloatingText(`-${dmg}`, e.x, 2.0, e.z, '#c084fc');
        if (e.hp <= 0) {
          this.destroyEnemy(e);
        }
      }
    }
  }

  private destroyEnemy(enemy: EnemyEntity) {
    sound.playExplosion(enemy.type === 'boss' || enemy.type === 'enforcer');
    this.hitstopDuration = enemy.type === 'boss' ? 0.08 : 0.04;
    this.cameraShakeTrauma = Math.min(1.0, this.cameraShakeTrauma + (enemy.type === 'boss' ? 0.6 : 0.2));

    this.particles.emitShockwave(enemy.x, enemy.z, enemy.type === 'boss' ? 14 : 5, 0xf43f5e);
    this.particles.emit(enemy.x, 1.0, enemy.z, enemy.type === 'boss' ? 80 : 30, {
      speed: enemy.type === 'boss' ? 18 : 10,
      color: { r: 1.0, g: 0.3, b: 0.3 },
      life: 0.65,
    });

    // Points calculation
    const points = enemy.type === 'boss' ? 2500 : enemy.type === 'enforcer' ? 400 : enemy.type === 'hunter' ? 300 : 150;
    this.stats.score += points;
    this.stats.kills++;

    if (this.stats.score > this.stats.highScore) {
      this.stats.highScore = this.stats.score;
      try {
        localStorage.setItem('cyber_horizon_highscore', String(this.stats.highScore));
      } catch {}
    }

    this.spawnFloatingText(`+${points}`, enemy.x, 2.5, enemy.z, '#38bdf8');

    // Chance to drop powerup
    const dropChance = enemy.type === 'boss' ? 1.0 : enemy.type === 'enforcer' ? 0.5 : 0.25;
    if (Math.random() < dropChance) {
      this.spawnPowerup(enemy.x, enemy.z);
    }

    if (enemy.type === 'boss') {
      this.bossEntity = null;
      this.bossModelRefs = null;
      this.callbacks.onBossStateChange(false, 0, 0);

      if (this.stats.wave >= 10) {
        // Victory!
        this.phase = 'victory';
        this.callbacks.onPhaseChange(this.phase);
      }
    }
  }

  private hitPlayer(damage: number) {
    if (this.playerInvulnerableTimer > 0) return;

    this.cameraShakeTrauma = Math.min(1.0, this.cameraShakeTrauma + 0.45);

    if (this.stats.shield > 0) {
      sound.playShieldHit();
      const absorbed = Math.min(this.stats.shield, damage);
      this.stats.shield -= absorbed;
      damage -= absorbed;

      this.particles.emit(this.playerX, 1.0, this.playerZ, 14, {
        speed: 6,
        color: { r: 0.2, g: 0.8, b: 1.0 },
        life: 0.3,
      });
    }

    if (damage > 0) {
      sound.playHullDamage();
      this.stats.hp = Math.max(0, this.stats.hp - damage);
      this.playerInvulnerableTimer = 0.3; // brief mercy invulnerability

      this.particles.emit(this.playerX, 1.0, this.playerZ, 22, {
        speed: 9,
        color: { r: 1.0, g: 0.2, b: 0.2 },
        life: 0.45,
      });

      if (this.stats.hp <= 0) {
        sound.playExplosion(true);
        this.phase = 'gameover';
        this.callbacks.onPhaseChange(this.phase);
      }
    }
  }

  private spawnFloatingText(text: string, x: number, y: number, z: number, color: string) {
    this.floatingTexts.push({
      id: this.nextEntityId++,
      text,
      x,
      y,
      z,
      color,
      opacity: 1.0,
      vy: 1.8,
      life: 0.8,
    });
  }

  /**
   * Main Simulation Update Loop
   */
  private update(rawDt: number) {
    // Delta clamping per game craft directives
    const dt = Math.min(rawDt, 0.05);

    // Hitstop freeze handling
    if (this.hitstopDuration > 0) {
      this.hitstopDuration -= dt;
      return;
    }

    // Camera Shake Decay
    if (this.cameraShakeTrauma > 0) {
      this.cameraShakeTrauma = Math.max(0, this.cameraShakeTrauma - dt * 2.2);
    }

    const time = performance.now() * 0.001;
    this.environmentRig.update(time, dt);
    this.particles.update(dt);

    if (this.phase === 'title') {
      // Cinematic live camera orbit around hero interceptor
      const camOrbitRadius = 9.0;
      const camOrbitSpeed = 0.4;
      this.camera.position.x = Math.sin(time * camOrbitSpeed) * camOrbitRadius;
      this.camera.position.z = Math.cos(time * camOrbitSpeed) * camOrbitRadius;
      this.camera.position.y = 3.8 + Math.sin(time * 0.8) * 0.5;
      this.camera.lookAt(0, 1.2, 0);

      // Player hover idle bob
      this.playerGroup.position.set(0, 1.2 + Math.sin(time * 2.2) * 0.12, 0);
      this.playerGroup.rotation.y = time * 0.25;
      return;
    }

    if (this.phase !== 'playing') {
      return;
    }

    // 1. Process Player Input & Kinematics
    let moveX = 0;
    let moveZ = 0;

    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) moveZ -= 1;
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) moveZ += 1;
    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) moveX -= 1;
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) moveX += 1;

    // Mobile virtual joystick input
    if (this.virtualJoystick.active) {
      moveX += this.virtualJoystick.dx;
      moveZ += this.virtualJoystick.dy;
    }

    // Normalize movement vector
    const moveLen = Math.hypot(moveX, moveZ);
    if (moveLen > 1) {
      moveX /= moveLen;
      moveZ /= moveLen;
    }

    const isBoostHeld = this.heldKeys.has('ShiftLeft') || this.heldKeys.has('ShiftRight') || this.stats.isBoosting;
    const canBoost = isBoostHeld && this.stats.boost > 5;
    this.stats.isBoosting = canBoost;

    if (canBoost) {
      this.stats.boost = Math.max(0, this.stats.boost - dt * 35);
    } else {
      this.stats.boost = Math.min(this.stats.maxBoost, this.stats.boost + dt * 18);
    }

    const accel = canBoost ? 65 : 42;
    const maxSpeed = canBoost ? 24 : 15;
    const drag = 0.88;

    this.playerVx += moveX * accel * dt;
    this.playerVz += moveZ * accel * dt;

    // Clamp speed
    const currentSpeed = Math.hypot(this.playerVx, this.playerVz);
    if (currentSpeed > maxSpeed) {
      this.playerVx = (this.playerVx / currentSpeed) * maxSpeed;
      this.playerVz = (this.playerVz / currentSpeed) * maxSpeed;
    }

    this.playerVx *= drag;
    this.playerVz *= drag;

    this.playerX += this.playerVx * dt;
    this.playerZ += this.playerVz * dt;

    // Arena boundary containment
    const distFromOrigin = Math.hypot(this.playerX, this.playerZ);
    if (distFromOrigin > ARENA_RADIUS - 1.5) {
      const normalX = this.playerX / distFromOrigin;
      const normalZ = this.playerZ / distFromOrigin;
      this.playerX = normalX * (ARENA_RADIUS - 1.5);
      this.playerZ = normalZ * (ARENA_RADIUS - 1.5);

      // Bounce velocity
      const dot = this.playerVx * normalX + this.playerVz * normalZ;
      if (dot > 0) {
        this.playerVx -= 1.5 * dot * normalX;
        this.playerVz -= 1.5 * dot * normalZ;
        this.cameraShakeTrauma = Math.min(1.0, this.cameraShakeTrauma + 0.15);
      }
    }

    // Target rotation: point towards mouse aim or direction of movement
    if (this.mouseAim.isAimingWithMouse) {
      const aimDx = this.mouseAim.x - this.playerX;
      const aimDz = this.mouseAim.z - this.playerZ;
      if (Math.hypot(aimDx, aimDz) > 0.5) {
        this.playerTargetRotation = Math.atan2(aimDx, aimDz);
      }
    } else if (moveLen > 0.1) {
      this.playerTargetRotation = Math.atan2(moveX, moveZ);
    }

    // Smooth rotational damping
    let rotDiff = this.playerTargetRotation - this.playerRotation;
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    this.playerRotation += rotDiff * Math.min(1.0, dt * 14);

    // Bank roll into turns (squash/stretch game feel)
    const targetRoll = -rotDiff * 1.5;
    this.playerBankRoll = THREE.MathUtils.damp(this.playerBankRoll, targetRoll, 10, dt);

    // Pitch on acceleration
    const targetPitch = (currentSpeed / maxSpeed) * 0.15;
    this.playerPitch = THREE.MathUtils.damp(this.playerPitch, targetPitch, 8, dt);

    // Update Player 3D Mesh
    this.playerGroup.position.set(this.playerX, 1.0 + Math.sin(time * 6) * 0.05, this.playerZ);
    this.playerGroup.rotation.y = this.playerRotation;
    this.playerGroup.rotation.z = this.playerBankRoll;
    this.playerGroup.rotation.x = this.playerPitch;

    // Thruster scale & flame modulation
    const thrusterScale = 0.8 + (currentSpeed / maxSpeed) * 1.2 + (canBoost ? 0.8 : 0);
    this.playerThrusters.forEach((t) => {
      t.scale.set(1.0, thrusterScale, 1.0);
    });

    // Emit thruster exhaust particles
    if (currentSpeed > 1.5) {
      const backX = -Math.sin(this.playerRotation);
      const backZ = -Math.cos(this.playerRotation);
      this.particles.emitThrusterPuff(this.playerX + backX * 1.3, 0.9, this.playerZ + backZ * 1.3, backX, backZ);
    }

    // Audio Engine Telemetry
    sound.updateEngineTelemetry(currentSpeed / maxSpeed, canBoost);

    // Passive Shield Regen
    if (this.stats.shield < this.stats.maxShield) {
      this.stats.shield = Math.min(this.stats.maxShield, this.stats.shield + dt * 6);
    }

    // EMP Cooldown
    if (this.stats.empCooldown > 0) {
      this.stats.empCooldown = Math.max(0, this.stats.empCooldown - dt);
    }

    // Invulnerability timer
    if (this.playerInvulnerableTimer > 0) {
      this.playerInvulnerableTimer = Math.max(0, this.playerInvulnerableTimer - dt);
      this.playerGroup.visible = Math.floor(time * 20) % 2 === 0;
    } else {
      this.playerGroup.visible = true;
    }

    // Weapon Auto-Fire or Manual Fire
    if (this.playerFireTimer > 0) {
      this.playerFireTimer -= dt;
    }

    const isFiring =
      this.heldKeys.has('Space') ||
      this.mouseAim.isMouseDown ||
      this.justPressedKeys.has('Space');

    if (isFiring && this.playerFireTimer <= 0) {
      this.firePlayerWeapon();
    }

    // Special Trigger via Q or E
    if (this.justPressedKeys.has('KeyQ') || this.justPressedKeys.has('KeyE')) {
      this.triggerEmpSpecial();
    }

    // 2. Wave Spawner Logic
    if (this.enemiesToSpawnInWave > 0) {
      this.waveSpawnTimer -= dt;
      if (this.waveSpawnTimer <= 0) {
        this.waveSpawnTimer = 1.2 + Math.random() * 0.8;
        this.enemiesToSpawnInWave--;

        // Determine enemy type based on current wave
        const roll = Math.random();
        if (this.stats.wave >= 4 && roll < 0.25) {
          this.spawnEnemy('hunter');
        } else if (this.stats.wave >= 2 && roll < 0.5) {
          this.spawnEnemy('enforcer');
        } else {
          this.spawnEnemy('drone');
        }
      }
    } else if (this.enemies.length === 0 && !this.bossEntity) {
      // Wave cleared!
      this.stats.score += 500 * this.stats.wave;
      this.startWave(this.stats.wave + 1);
      sound.playPowerupPickup();
    }

    // 3. Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      // Hit flash reset
      if (e.hitFlashTimer > 0) {
        e.hitFlashTimer -= dt;
      }

      const dx = this.playerX - e.x;
      const dz = this.playerZ - e.z;
      const dist = Math.hypot(dx, dz);

      // Face player
      e.rotation = Math.atan2(dx, dz);
      e.meshGroup.rotation.y = e.rotation;

      if (e.type === 'drone') {
        // Fast swarming behavior, keeps medium distance
        if (dist > 8) {
          e.x += (dx / dist) * e.speed * dt;
          e.z += (dz / dist) * e.speed * dt;
        } else if (dist < 5) {
          // Circle or retreat
          e.x -= (dx / dist) * e.speed * 0.5 * dt;
          e.z -= (dz / dist) * e.speed * 0.5 * dt;
        }

        // Bob up/down
        e.meshGroup.position.set(e.x, 1.0 + Math.sin(time * 5 + e.id) * 0.15, e.z);

        // Drone attack cycle
        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          e.attackTimer = 2.2 + Math.random() * 0.8;
          // Fire single plasma bolt
          const projGeo = new THREE.SphereGeometry(0.2, 8, 8);
          const projMesh = new THREE.Mesh(projGeo, materials.enemyLaser);
          projMesh.position.set(e.x, 1.0, e.z);
          this.scene.add(projMesh);

          const pDirX = dx / dist;
          const pDirZ = dz / dist;
          this.projectiles.push({
            id: this.nextEntityId++,
            isPlayer: false,
            x: e.x,
            y: 1.0,
            z: e.z,
            vx: pDirX * 18,
            vy: 0,
            vz: pDirZ * 18,
            damage: 15,
            radius: 0.35,
            life: 0,
            maxLife: 3.0,
            color: 0xf43f5e,
            mesh: projMesh,
          });
        }
      } else if (e.type === 'enforcer') {
        // Heavy Mech Tank: slow advance, telegraphed mortar ground blasts
        if (dist > 12) {
          e.x += (dx / dist) * e.speed * dt;
          e.z += (dz / dist) * e.speed * dt;
        }
        e.meshGroup.position.set(e.x, 0.5, e.z);

        e.attackTimer -= dt;
        if (!e.isTelegraphing && e.attackTimer <= 0) {
          // Begin Telegraphed Ground Mortar
          e.isTelegraphing = true;
          e.telegraphTimer = e.telegraphDuration;
          e.telegraphTargetX = this.playerX + this.playerVx * 0.5; // Lead target slightly
          e.telegraphTargetZ = this.playerZ + this.playerVz * 0.5;

          // Spawn ground telegraph danger circle
          const ringMesh = createTelegraphRingMesh();
          ringMesh.position.set(e.telegraphTargetX, 0.04, e.telegraphTargetZ);
          this.scene.add(ringMesh);

          this.telegraphRings.push({
            id: this.nextEntityId++,
            x: e.telegraphTargetX,
            z: e.telegraphTargetZ,
            radius: 4.5,
            currentRadius: 0.5,
            maxDuration: e.telegraphDuration,
            elapsed: 0,
            damage: 35,
            mesh: ringMesh,
          });
        } else if (e.isTelegraphing) {
          e.telegraphTimer -= dt;
          if (e.telegraphTimer <= 0) {
            e.isTelegraphing = false;
            e.attackTimer = 3.2 + Math.random();
            sound.playHeavyShot();
          }
        }
      } else if (e.type === 'hunter') {
        // Phantom Hunter: dash & flank, fires spread
        e.x += (dx / dist) * e.speed * dt;
        e.z += (dz / dist) * e.speed * dt;
        e.meshGroup.position.set(e.x, 1.0, e.z);

        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          e.attackTimer = 2.0 + Math.random();
          // Triple spread shots
          const baseAngle = Math.atan2(dx, dz);
          [-0.25, 0, 0.25].forEach((offset) => {
            const shotAngle = baseAngle + offset;
            const pX = Math.sin(shotAngle);
            const pZ = Math.cos(shotAngle);

            const projGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 6);
            projGeo.rotateX(Math.PI / 2);
            const projMesh = new THREE.Mesh(projGeo, materials.enemyLaser);
            projMesh.position.set(e.x, 1.0, e.z);
            projMesh.rotation.y = shotAngle;
            this.scene.add(projMesh);

            this.projectiles.push({
              id: this.nextEntityId++,
              isPlayer: false,
              x: e.x,
              y: 1.0,
              z: e.z,
              vx: pX * 22,
              vy: 0,
              vz: pZ * 22,
              damage: 18,
              radius: 0.4,
              life: 0,
              maxLife: 2.2,
              color: 0xf43f5e,
              mesh: projMesh,
            });
          });
        }
      } else if (e.type === 'boss') {
        // Omega Behemoth Boss
        if (dist > 16) {
          e.x += (dx / dist) * e.speed * dt;
          e.z += (dz / dist) * e.speed * dt;
        }
        e.meshGroup.position.set(e.x, 2.0 + Math.sin(time * 2) * 0.2, e.z);

        // Spin shield ring & pulse core
        if (this.bossModelRefs) {
          this.bossModelRefs.shieldRing.rotation.z += dt * 1.8;
          const coreScale = 1.0 + Math.sin(time * 8) * 0.15;
          this.bossModelRefs.core.scale.set(coreScale, coreScale, coreScale);
        }

        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          e.attackTimer = 1.8;
          // Dual heavy plasma barrage
          [-2.2, 2.2].forEach((xOff) => {
            const projGeo = new THREE.SphereGeometry(0.45, 10, 10);
            const projMesh = new THREE.Mesh(projGeo, materials.heavyMortar);
            projMesh.position.set(e.x + xOff, 2.0, e.z);
            this.scene.add(projMesh);

            const pDirX = dx / dist;
            const pDirZ = dz / dist;
            this.projectiles.push({
              id: this.nextEntityId++,
              isPlayer: false,
              x: e.x + xOff,
              y: 2.0,
              z: e.z,
              vx: pDirX * 16,
              vy: 0,
              vz: pDirZ * 16,
              damage: 28,
              radius: 0.6,
              life: 0,
              maxLife: 3.5,
              color: 0xfbbf24,
              mesh: projMesh,
            });
          });

          // Ground telegraph strike under player
          const ringMesh = createTelegraphRingMesh();
          ringMesh.position.set(this.playerX, 0.04, this.playerZ);
          this.scene.add(ringMesh);

          this.telegraphRings.push({
            id: this.nextEntityId++,
            x: this.playerX,
            z: this.playerZ,
            radius: 5.5,
            currentRadius: 0.5,
            maxDuration: 1.2,
            elapsed: 0,
            damage: 40,
            mesh: ringMesh,
          });
        }

        this.callbacks.onBossStateChange(true, e.hp, e.maxHp);
      }

      // Check collision between enemy body and player
      if (dist < e.radius + 1.2) {
        this.hitPlayer(20);
        // Push enemy back
        e.x -= (dx / dist) * 2;
        e.z -= (dz / dist) * 2;
      }
    }

    // 4. Update Telegraph Danger Rings
    for (let i = this.telegraphRings.length - 1; i >= 0; i--) {
      const ring = this.telegraphRings[i];
      ring.elapsed += dt;
      const progress = ring.elapsed / ring.maxDuration;

      if (progress >= 1.0) {
        // Detonate impact!
        sound.playExplosion(true);
        this.particles.emitShockwave(ring.x, ring.z, ring.radius, 0xf43f5e);
        this.particles.emit(ring.x, 0.5, ring.z, 35, {
          speed: 12,
          color: { r: 1.0, g: 0.2, b: 0.2 },
          life: 0.5,
        });

        // Damage player if inside ring
        const distToPlayer = Math.hypot(this.playerX - ring.x, this.playerZ - ring.z);
        if (distToPlayer <= ring.radius) {
          this.hitPlayer(ring.damage);
        }

        this.scene.remove(ring.mesh);
        ring.mesh.geometry.dispose();
        this.telegraphRings.splice(i, 1);
      } else {
        // Expand ring indicator
        const scale = THREE.MathUtils.lerp(0.5, ring.radius, progress);
        ring.mesh.scale.set(scale, scale, scale);
        (ring.mesh.material as THREE.MeshBasicMaterial).opacity = 0.35 + progress * 0.55;
      }
    }

    // 5. Update Projectiles & Check Collisions
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.projectiles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.mesh.position.set(p.x, p.y, p.z);

      if (p.isPlayer) {
        // Check collision against enemies
        let hitEnemy: EnemyEntity | null = null;
        for (const e of this.enemies) {
          const dist = Math.hypot(p.x - e.x, p.z - e.z);
          if (dist < p.radius + e.radius) {
            hitEnemy = e;
            break;
          }
        }

        if (hitEnemy) {
          hitEnemy.hp -= p.damage;
          hitEnemy.hitFlashTimer = 0.12;

          this.particles.emit(p.x, p.y, p.z, 8, {
            speed: 6,
            color: { r: 0.2, g: 0.8, b: 1.0 },
            life: 0.2,
          });

          this.spawnFloatingText(`${Math.floor(p.damage)}`, p.x, p.y + 0.8, p.z, '#38bdf8');

          if (hitEnemy.hp <= 0) {
            this.destroyEnemy(hitEnemy);
            const idx = this.enemies.indexOf(hitEnemy);
            if (idx !== -1) {
              this.scene.remove(hitEnemy.meshGroup);
              this.enemies.splice(idx, 1);
            }
          }

          // Remove projectile
          this.scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          this.projectiles.splice(i, 1);
          continue;
        }
      } else {
        // Enemy projectile against player
        const distToPlayer = Math.hypot(p.x - this.playerX, p.z - this.playerZ);
        if (distToPlayer < p.radius + 1.0) {
          this.hitPlayer(p.damage);

          this.scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          this.projectiles.splice(i, 1);
          continue;
        }
      }
    }

    // 6. Update Powerup Pickups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const pu = this.powerups[i];
      pu.life -= dt;
      pu.rotation += dt * 2.5;
      pu.mesh.rotation.y = pu.rotation;
      pu.mesh.position.y = 0.8 + Math.sin(time * 4 + pu.id) * 0.2;

      if (pu.life <= 0) {
        this.scene.remove(pu.mesh);
        this.powerups.splice(i, 1);
        continue;
      }

      // Check collection
      const dist = Math.hypot(this.playerX - pu.x, this.playerZ - pu.z);
      if (dist < 2.0) {
        sound.playPowerupPickup();
        if (pu.kind === 'shield') {
          this.stats.shield = Math.min(this.stats.maxShield, this.stats.shield + 45);
          this.spawnFloatingText('+SHIELD', pu.x, 2.0, pu.z, '#06b6d4');
        } else if (pu.kind === 'overcharge') {
          this.stats.weaponLevel = Math.min(4, this.stats.weaponLevel + 1);
          this.spawnFloatingText('WEAPON UPGRADE!', pu.x, 2.0, pu.z, '#f59e0b');
        } else if (pu.kind === 'emp') {
          this.stats.empCooldown = 0;
          this.spawnFloatingText('EMP READY!', pu.x, 2.0, pu.z, '#a855f7');
        } else if (pu.kind === 'boost') {
          this.stats.boost = this.stats.maxBoost;
          this.spawnFloatingText('+BOOST OVERCHARGE', pu.x, 2.0, pu.z, '#10b981');
        }

        this.particles.emit(pu.x, 1.0, pu.z, 25, {
          speed: 8,
          color: { r: 0.2, g: 1.0, b: 0.6 },
          life: 0.4,
        });

        this.scene.remove(pu.mesh);
        this.powerups.splice(i, 1);
      }
    }

    // 7. Update Floating Combat Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y += ft.vy * dt;
      ft.opacity = Math.max(0, ft.life / 0.8);
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
    this.callbacks.onFloatingText([...this.floatingTexts]);

    // 8. Dynamic Camera Follow with Smooth Spring Damping & Decay Camera Shake
    const targetCamX = this.playerX + (this.playerVx * 0.25);
    const targetCamZ = this.playerZ + 20 + (this.playerVz * 0.25);
    const targetCamY = 24 + (canBoost ? 3 : 0);

    this.cameraTarget.x = THREE.MathUtils.damp(this.cameraTarget.x, this.playerX, 6, dt);
    this.cameraTarget.z = THREE.MathUtils.damp(this.cameraTarget.z, this.playerZ, 6, dt);

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 5, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetCamZ, 5, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, 4, dt);

    // Apply Camera Shake
    if (this.cameraShakeTrauma > 0) {
      const shakeMag = this.cameraShakeTrauma * this.cameraShakeTrauma * 0.8;
      this.camera.position.x += (Math.random() - 0.5) * shakeMag;
      this.camera.position.y += (Math.random() - 0.5) * shakeMag;
      this.camera.position.z += (Math.random() - 0.5) * shakeMag;
    }

    this.camera.lookAt(this.cameraTarget.x, 0.5, this.cameraTarget.z);

    // Update UI Stats
    this.callbacks.onStatsUpdate({ ...this.stats });

    // Clear edge-triggered keys at end of frame
    this.justPressedKeys.clear();
  }

  /**
   * Main 60fps RequestAnimationFrame Loop
   */
  private tick = () => {
    if (this.isDestroyed) return;

    const now = performance.now();
    const rawDt = (now - this.lastTime) * 0.001;
    this.lastTime = now;

    this.update(rawDt);
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      // Software WebGL pacing per skill directives
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.isDestroyed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(this.tick, 60);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public getMinimapData() {
    return {
      player: { x: this.playerX, z: this.playerZ, rotation: this.playerRotation },
      enemies: this.enemies.map((e) => ({ x: e.x, z: e.z, type: e.type })),
      powerups: this.powerups.map((p) => ({ x: p.x, z: p.z, kind: p.kind })),
      arenaRadius: ARENA_RADIUS,
    };
  }

  public getPlayerScreenPos(x: number, y: number, z: number) {
    _vec3A.set(x, y, z);
    _vec3A.project(this.camera);
    const rect = this.container.getBoundingClientRect();
    const screenX = ((_vec3A.x + 1) * rect.width) / 2;
    const screenY = ((-_vec3A.y + 1) * rect.height) / 2;
    const isVisible = _vec3A.z < 1.0;
    return { x: screenX, y: screenY, isVisible };
  }

  public dispose() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.onResize);
    sound.dispose();
    this.environmentRig.dispose();
    this.particles.dispose();
    this.clearAllCombatEntities();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}

export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover' | 'victory';

export type WeaponType = 'plasma' | 'spread' | 'beam';

export interface PlayerStats {
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  score: number;
  highScore: number;
  wave: number;
  kills: number;
  boost: number;
  maxBoost: number;
  isBoosting: boolean;
  empCooldown: number;
  maxEmpCooldown: number;
  weaponType: WeaponType;
  weaponLevel: number;
  powerupTimer: number;
}

export type EnemyType = 'drone' | 'enforcer' | 'hunter' | 'boss';

export interface EnemyEntity {
  id: number;
  type: EnemyType;
  x: number;
  z: number;
  vx: number;
  vz: number;
  rotation: number;
  hp: number;
  maxHp: number;
  radius: number;
  speed: number;
  attackTimer: number;
  telegraphTimer: number;
  telegraphDuration: number;
  isTelegraphing: boolean;
  telegraphTargetX: number;
  telegraphTargetZ: number;
  hitFlashTimer: number;
  meshGroup: any; // THREE.Group
  telegraphMesh?: any;
}

export interface ProjectileEntity {
  id: number;
  isPlayer: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  radius: number;
  life: number;
  maxLife: number;
  color: number;
  mesh: any; // THREE.Mesh
}

export type PowerupKind = 'shield' | 'overcharge' | 'emp' | 'boost';

export interface PowerupEntity {
  id: number;
  kind: PowerupKind;
  x: number;
  z: number;
  rotation: number;
  life: number;
  mesh: any;
}

export interface TelegraphRing {
  id: number;
  x: number;
  z: number;
  radius: number;
  currentRadius: number;
  maxDuration: number;
  elapsed: number;
  damage: number;
  mesh: any;
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  z: number;
  color: string;
  opacity: number;
  vy: number;
  life: number;
}

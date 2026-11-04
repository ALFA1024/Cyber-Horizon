import * as THREE from 'three';
import { EnemyType, PowerupKind } from './types';

/**
 * Procedural Materials Library
 * PBR metals, polarized glass, emissive cores, and procedural finishes.
 */

// Shared reusable materials
export const materials = {
  // Player Ship Materials
  shipHull: new THREE.MeshStandardMaterial({
    color: 0x1e293b, // slate-800 gunmetal
    metalness: 0.85,
    roughness: 0.25,
  }),
  shipWing: new THREE.MeshStandardMaterial({
    color: 0x0f172a, // dark obsidian
    metalness: 0.9,
    roughness: 0.18,
  }),
  shipCanopy: new THREE.MeshPhysicalMaterial({
    color: 0x06b6d4, // glowing cyan glass
    metalness: 0.1,
    roughness: 0.08,
    transmission: 0.6,
    transparent: true,
    opacity: 0.9,
    reflectivity: 0.95,
  }),
  shipAccentCyan: new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.8,
    metalness: 0.5,
    roughness: 0.2,
  }),
  shipThrusterGlow: new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
  }),
  shipShadow: new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  }),

  // Enemy Materials
  droneArmor: new THREE.MeshStandardMaterial({
    color: 0x3f3f46,
    metalness: 0.8,
    roughness: 0.35,
  }),
  droneCoreRed: new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xe11d48,
    emissiveIntensity: 1.2,
    metalness: 0.2,
    roughness: 0.2,
  }),

  enforcerArmor: new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.7,
    roughness: 0.5,
  }),
  enforcerTrimAmber: new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.9,
    metalness: 0.3,
    roughness: 0.3,
  }),

  hunterArmor: new THREE.MeshStandardMaterial({
    color: 0x18181b,
    metalness: 0.95,
    roughness: 0.15,
  }),
  hunterNeonPurple: new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    emissive: 0x9333ea,
    emissiveIntensity: 1.0,
    metalness: 0.4,
    roughness: 0.2,
  }),

  // Boss Materials
  bossHullDark: new THREE.MeshStandardMaterial({
    color: 0x09090b,
    metalness: 0.9,
    roughness: 0.25,
  }),
  bossGoldTrim: new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    metalness: 0.95,
    roughness: 0.2,
  }),
  bossCoreRed: new THREE.MeshStandardMaterial({
    color: 0xff0055,
    emissive: 0xff0055,
    emissiveIntensity: 1.8,
    metalness: 0.1,
    roughness: 0.1,
  }),

  // Projectile & FX Materials
  playerLaser: new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
  }),
  enemyLaser: new THREE.MeshBasicMaterial({
    color: 0xf43f5e,
  }),
  heavyMortar: new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
  }),

  // Telegraph ring material
  telegraphRing: new THREE.MeshBasicMaterial({
    color: 0xf43f5e,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  telegraphLine: new THREE.LineBasicMaterial({
    color: 0xf43f5e,
    transparent: true,
    opacity: 0.75,
  }),

  // Hit Flash Material
  hitFlashMat: new THREE.MeshBasicMaterial({
    color: 0xffffff,
  }),
};

/**
 * Creates the Hero Interceptor Hovercraft (8-part composite THREE.Group)
 */
export function createPlayerShip(): {
  group: THREE.Group;
  thrusters: THREE.Mesh[];
  canopy: THREE.Mesh;
  wings: THREE.Mesh;
  shadow: THREE.Mesh;
} {
  const group = new THREE.Group();

  // 1. Primary Silhouette: Sleek aerodynamic fuselage
  const hullGeo = new THREE.ConeGeometry(0.75, 2.8, 5);
  hullGeo.rotateX(Math.PI / 2);
  hullGeo.scale(1.2, 0.45, 1.0);
  const hull = new THREE.Mesh(hullGeo, materials.shipHull);
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);

  // 2. Cockpit Canopy (Secondary read)
  const canopyGeo = new THREE.CylinderGeometry(0.22, 0.35, 1.1, 8);
  canopyGeo.rotateX(Math.PI / 2);
  canopyGeo.scale(1.0, 0.6, 1.0);
  const canopy = new THREE.Mesh(canopyGeo, materials.shipCanopy);
  canopy.position.set(0, 0.22, 0.1);
  canopy.castShadow = true;
  group.add(canopy);

  // 3. Swept Delta Wings (Composite part)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0.8);
  wingShape.lineTo(2.4, -0.6);
  wingShape.lineTo(2.2, -1.0);
  wingShape.lineTo(0.5, -0.7);
  wingShape.lineTo(-0.5, -0.7);
  wingShape.lineTo(-2.2, -1.0);
  wingShape.lineTo(-2.4, -0.6);
  wingShape.closePath();

  const extrudeSettings = { depth: 0.08, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.04, bevelThickness: 0.04 };
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
  wingGeo.rotateX(Math.PI / 2);
  wingGeo.translate(0, 0, -0.04);
  const wings = new THREE.Mesh(wingGeo, materials.shipWing);
  wings.castShadow = true;
  wings.receiveShadow = true;
  group.add(wings);

  // 4. Wingtip Energy Stabilizers (Accent detail)
  [-2.25, 2.25].forEach((xPos) => {
    const finGeo = new THREE.BoxGeometry(0.08, 0.4, 0.7);
    const fin = new THREE.Mesh(finGeo, materials.shipAccentCyan);
    fin.position.set(xPos, 0.12, -0.85);
    fin.rotation.z = xPos > 0 ? -0.25 : 0.25;
    group.add(fin);
  });

  // 5. Dual Under-Wing Plasma Autocannons (Accent detail)
  [-0.9, 0.9].forEach((xPos) => {
    const cannonGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.0, 8);
    cannonGeo.rotateX(Math.PI / 2);
    const cannon = new THREE.Mesh(cannonGeo, materials.shipHull);
    cannon.position.set(xPos, -0.1, 0.2);
    group.add(cannon);

    const emitterGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.15, 8);
    emitterGeo.rotateX(Math.PI / 2);
    const emitter = new THREE.Mesh(emitterGeo, materials.shipAccentCyan);
    emitter.position.set(xPos, -0.1, 0.75);
    group.add(emitter);
  });

  // 6. Twin Vector Thruster Bells (Secondary read)
  const thrusters: THREE.Mesh[] = [];
  [-0.45, 0.45].forEach((xPos) => {
    const thrusterBellGeo = new THREE.CylinderGeometry(0.2, 0.26, 0.5, 8);
    thrusterBellGeo.rotateX(Math.PI / 2);
    const bell = new THREE.Mesh(thrusterBellGeo, materials.shipHull);
    bell.position.set(xPos, 0.02, -1.35);
    group.add(bell);

    // Glowing plasma flame interior
    const flameGeo = new THREE.ConeGeometry(0.16, 0.8, 8);
    flameGeo.rotateX(-Math.PI / 2);
    const flame = new THREE.Mesh(flameGeo, materials.shipThrusterGlow);
    flame.position.set(xPos, 0.02, -1.8);
    group.add(flame);
    thrusters.push(flame);
  });

  // 7. Sensor Dorsal Intake Scoop
  const scoopGeo = new THREE.BoxGeometry(0.25, 0.18, 0.6);
  const scoop = new THREE.Mesh(scoopGeo, materials.shipAccentCyan);
  scoop.position.set(0, 0.22, -0.6);
  group.add(scoop);

  // 8. Ground Contact Shadow Disc
  const shadowGeo = new THREE.PlaneGeometry(3.5, 3.5);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(shadowGeo, materials.shipShadow);
  shadow.position.y = -0.95;
  group.add(shadow);

  group.position.y = 1.0;
  return { group, thrusters, canopy, wings, shadow };
}

/**
 * Creates Scout Drone (4-part composite THREE.Group)
 */
export function createScoutDrone(): THREE.Group {
  const group = new THREE.Group();

  // 1. Central Core
  const coreGeo = new THREE.SphereGeometry(0.45, 12, 10);
  const core = new THREE.Mesh(coreGeo, materials.droneCoreRed);
  group.add(core);

  // 2. Outer Armored Ring Segment
  const ringGeo = new THREE.TorusGeometry(0.65, 0.1, 8, 16);
  const ring = new THREE.Mesh(ringGeo, materials.droneArmor);
  group.add(ring);

  // 3. Forward Eye Sensor Lens
  const eyeGeo = new THREE.CylinderGeometry(0.18, 0.12, 0.25, 8);
  eyeGeo.rotateX(Math.PI / 2);
  const eye = new THREE.Mesh(eyeGeo, materials.droneArmor);
  eye.position.set(0, 0, 0.4);
  group.add(eye);

  // 4. Dual Antenna Fins
  [-0.4, 0.4].forEach((xPos) => {
    const finGeo = new THREE.BoxGeometry(0.06, 0.5, 0.15);
    const fin = new THREE.Mesh(finGeo, materials.droneArmor);
    fin.position.set(xPos, 0.2, -0.2);
    group.add(fin);
  });

  // Shadow
  const shadowGeo = new THREE.PlaneGeometry(1.6, 1.6);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(shadowGeo, materials.shipShadow);
  shadow.position.y = -0.95;
  group.add(shadow);

  group.position.y = 1.0;
  return group;
}

/**
 * Creates Heavy Enforcer Mech Tank (7-part composite THREE.Group)
 */
export function createHeavyEnforcer(): THREE.Group {
  const group = new THREE.Group();

  // 1. Heavy Armored Base Chassis
  const baseGeo = new THREE.CylinderGeometry(1.1, 1.3, 0.6, 6);
  const base = new THREE.Mesh(baseGeo, materials.enforcerArmor);
  base.castShadow = true;
  group.add(base);

  // 2. Rotating Turret Block
  const turretGeo = new THREE.BoxGeometry(1.2, 0.55, 1.3);
  const turret = new THREE.Mesh(turretGeo, materials.enforcerArmor);
  turret.position.y = 0.5;
  turret.castShadow = true;
  group.add(turret);

  // 3 & 4. Dual Heavy Mortar Barrels
  [-0.35, 0.35].forEach((xPos) => {
    const barrelGeo = new THREE.CylinderGeometry(0.14, 0.18, 1.3, 8);
    barrelGeo.rotateX(Math.PI / 2);
    const barrel = new THREE.Mesh(barrelGeo, materials.enforcerArmor);
    barrel.position.set(xPos, 0.55, 0.9);
    group.add(barrel);

    const muzzleGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.2, 8);
    muzzleGeo.rotateX(Math.PI / 2);
    const muzzle = new THREE.Mesh(muzzleGeo, materials.enforcerTrimAmber);
    muzzle.position.set(xPos, 0.55, 1.55);
    group.add(muzzle);
  });

  // 5. Reactor Generator on Turret Spine
  const reactorGeo = new THREE.SphereGeometry(0.35, 8, 8);
  const reactor = new THREE.Mesh(reactorGeo, materials.enforcerTrimAmber);
  reactor.position.set(0, 0.6, -0.4);
  group.add(reactor);

  // 6. Quad Stabilizer Skids
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const skidGeo = new THREE.BoxGeometry(0.3, 0.2, 0.8);
    const skid = new THREE.Mesh(skidGeo, materials.enforcerArmor);
    skid.position.set(Math.cos(angle) * 1.3, -0.2, Math.sin(angle) * 1.3);
    skid.rotation.y = -angle;
    group.add(skid);
  }

  // Shadow
  const shadowGeo = new THREE.PlaneGeometry(3.5, 3.5);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(shadowGeo, materials.shipShadow);
  shadow.position.y = -0.48;
  group.add(shadow);

  group.position.y = 0.5;
  return group;
}

/**
 * Creates Phantom Hunter (5-part composite THREE.Group)
 */
export function createPhantomHunter(): THREE.Group {
  const group = new THREE.Group();

  // 1. Sleek Inverted Needle Hull
  const hullGeo = new THREE.ConeGeometry(0.5, 2.2, 4);
  hullGeo.rotateX(Math.PI / 2);
  hullGeo.scale(1.2, 0.35, 1.0);
  const hull = new THREE.Mesh(hullGeo, materials.hunterArmor);
  hull.castShadow = true;
  group.add(hull);

  // 2. Forward Swept Wing Blades
  const wingGeo = new THREE.BoxGeometry(2.6, 0.06, 0.5);
  const wings = new THREE.Mesh(wingGeo, materials.hunterArmor);
  wings.position.set(0, 0, 0.1);
  wings.rotation.y = 0.2;
  group.add(wings);

  // 3. Purple Neon Edge Strips
  [-1.25, 1.25].forEach((xPos) => {
    const edgeGeo = new THREE.BoxGeometry(0.08, 0.12, 0.8);
    const edge = new THREE.Mesh(edgeGeo, materials.hunterNeonPurple);
    edge.position.set(xPos, 0, 0.2);
    group.add(edge);
  });

  // 4. Central Visor Slit
  const visorGeo = new THREE.BoxGeometry(0.3, 0.08, 0.3);
  const visor = new THREE.Mesh(visorGeo, materials.hunterNeonPurple);
  visor.position.set(0, 0.12, 0.6);
  group.add(visor);

  // Shadow
  const shadowGeo = new THREE.PlaneGeometry(2.8, 2.8);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(shadowGeo, materials.shipShadow);
  shadow.position.y = -0.95;
  group.add(shadow);

  group.position.y = 1.0;
  return group;
}

/**
 * Creates Omega Behemoth Boss (11-part composite THREE.Group)
 */
export function createBossModel(): {
  group: THREE.Group;
  core: THREE.Mesh;
  shieldRing: THREE.Mesh;
} {
  const group = new THREE.Group();

  // 1. Heavy Dreadnought Central Hull
  const hullGeo = new THREE.BoxGeometry(3.5, 1.6, 5.0);
  const hull = new THREE.Mesh(hullGeo, materials.bossHullDark);
  hull.castShadow = true;
  group.add(hull);

  // 2. Gold Trim Accent Bulkheads
  const trimGeo = new THREE.BoxGeometry(3.7, 0.3, 5.2);
  const trim = new THREE.Mesh(trimGeo, materials.bossGoldTrim);
  trim.position.y = 0.2;
  group.add(trim);

  // 3. Massive Exposed Core Reactor
  const coreGeo = new THREE.SphereGeometry(1.2, 16, 16);
  const core = new THREE.Mesh(coreGeo, materials.bossCoreRed);
  core.position.set(0, 0.8, 0.2);
  group.add(core);

  // 4. Rotating Outer Energy Shield Ring
  const shieldRingGeo = new THREE.TorusGeometry(2.6, 0.15, 8, 24);
  const shieldRing = new THREE.Mesh(shieldRingGeo, materials.bossGoldTrim);
  shieldRing.rotation.x = Math.PI / 2;
  shieldRing.position.y = 0.8;
  group.add(shieldRing);

  // 5 & 6. Port & Starboard Heavy Cannon Sponsons
  [-2.2, 2.2].forEach((xPos) => {
    const sponsonGeo = new THREE.BoxGeometry(1.0, 1.0, 2.5);
    const sponson = new THREE.Mesh(sponsonGeo, materials.bossHullDark);
    sponson.position.set(xPos, 0, 0);
    group.add(sponson);

    // Twin heavy barrels
    [-0.25, 0.25].forEach((yOff) => {
      const barrelGeo = new THREE.CylinderGeometry(0.18, 0.22, 2.0, 8);
      barrelGeo.rotateX(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeo, materials.bossGoldTrim);
      barrel.position.set(xPos, yOff, 1.8);
      group.add(barrel);
    });
  });

  // 7. Command Prow Spire
  const prowGeo = new THREE.ConeGeometry(1.2, 2.5, 4);
  prowGeo.rotateX(Math.PI / 2);
  prowGeo.scale(1.2, 0.6, 1.0);
  const prow = new THREE.Mesh(prowGeo, materials.bossHullDark);
  prow.position.set(0, 0.1, 3.2);
  group.add(prow);

  // 8. Quad Rear Exhaust Engines
  [[-0.8, -0.3], [0.8, -0.3], [-0.8, 0.4], [0.8, 0.4]].forEach(([xPos, yPos]) => {
    const thrusterGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.8, 8);
    thrusterGeo.rotateX(Math.PI / 2);
    const thruster = new THREE.Mesh(thrusterGeo, materials.bossGoldTrim);
    thruster.position.set(xPos, yPos, -2.8);
    group.add(thruster);
  });

  // 9. Contact Shadow
  const shadowGeo = new THREE.PlaneGeometry(8, 9);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(shadowGeo, materials.shipShadow);
  shadow.position.y = -1.5;
  group.add(shadow);

  group.position.y = 2.0;
  return { group, core, shieldRing };
}

/**
 * Creates floating 3D Powerup pickup
 */
export function createPowerupMesh(kind: PowerupKind): THREE.Group {
  const group = new THREE.Group();

  let mat: THREE.Material;
  let geo: THREE.BufferGeometry;

  if (kind === 'shield') {
    mat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 1.2,
      metalness: 0.1,
      roughness: 0.1,
    });
    geo = new THREE.OctahedronGeometry(0.5, 0);
  } else if (kind === 'overcharge') {
    mat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 1.3,
      metalness: 0.2,
      roughness: 0.2,
    });
    geo = new THREE.DodecahedronGeometry(0.45, 0);
  } else if (kind === 'emp') {
    mat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x9333ea,
      emissiveIntensity: 1.4,
      metalness: 0.1,
      roughness: 0.1,
    });
    geo = new THREE.IcosahedronGeometry(0.45, 0);
  } else {
    // Boost
    mat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 1.2,
      metalness: 0.1,
      roughness: 0.1,
    });
    geo = new THREE.TorusGeometry(0.4, 0.14, 8, 16);
  }

  const crystal = new THREE.Mesh(geo, mat);
  group.add(crystal);

  // Wireframe outer cage
  const cageGeo = new THREE.OctahedronGeometry(0.65, 0);
  const cageMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0.4,
  });
  const cage = new THREE.Mesh(cageGeo, cageMat);
  group.add(cage);

  // Ground shadow
  const shadowGeo = new THREE.PlaneGeometry(1.2, 1.2);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(shadowGeo, materials.shipShadow);
  shadow.position.y = -0.75;
  group.add(shadow);

  group.position.y = 0.8;
  return group;
}

/**
 * Creates Ground Telegraph Danger Circle (for mortar artillery targeting)
 */
export function createTelegraphRingMesh(): THREE.Mesh {
  const geo = new THREE.RingGeometry(0.2, 1.0, 32);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, materials.telegraphRing.clone());
  mesh.position.y = 0.04; // grounded without z-fighting
  return mesh;
}

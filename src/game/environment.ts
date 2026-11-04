import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface EnvironmentRig {
  scene: THREE.Scene;
  keyLight: THREE.DirectionalLight;
  dustPoints: THREE.Points;
  boundaryPylons: THREE.Group;
  monoliths: THREE.Group;
  update: (time: number, delta: number) => void;
  dispose: () => void;
}

export const ARENA_RADIUS = 46;

/**
 * Creates procedural high-res cyberpunk grid texture via HTML5 Canvas
 */
function createGridTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Dark biomech asphalt base
  ctx.fillStyle = '#050813';
  ctx.fillRect(0, 0, size, size);

  // Subtle secondary sub-grid
  ctx.strokeStyle = 'rgba(14, 116, 144, 0.18)';
  ctx.lineWidth = 1;
  const step = size / 32;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  // Primary luminous grid lines
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
  ctx.lineWidth = 2.5;
  const mainStep = size / 8;
  for (let i = 0; i <= size; i += mainStep) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  // Glowing intersection dots
  ctx.fillStyle = '#38bdf8';
  for (let x = 0; x <= size; x += mainStep) {
    for (let y = 0; y <= size; y += mainStep) {
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(18, 18);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Sets up 3D environment, lighting rig, studio reflections, boundary structures, and atmospheric particles
 */
export function setupEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean
): EnvironmentRig {
  // 1. Studio Environment Reflection via RoomEnvironment
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  pmremGenerator.dispose();

  // 2. Horizon-Matched Fog
  const fogColor = new THREE.Color(0x030712);
  scene.background = fogColor;
  scene.fog = new THREE.FogExp2(0x030712, 0.016);

  // 3. Balanced Studio Rig: Warm Key Light + Cool Hemisphere Fill
  const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.9);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xffedd5, 1.4);
  keyLight.position.set(30, 45, 25);
  if (!isSoftwareGl) {
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 120;
    const d = 55;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
  }
  scene.add(keyLight);

  // Subtle Cyan Rim Light from opposing angle
  const rimLight = new THREE.DirectionalLight(0x06b6d4, 0.6);
  rimLight.position.set(-35, 15, -35);
  scene.add(rimLight);

  // 4. Procedural Arena Floor (Extends far beyond playable zone)
  const floorGeo = new THREE.PlaneGeometry(240, 240, 1, 1);
  floorGeo.rotateX(-Math.PI / 2);
  const gridTexture = createGridTexture();
  gridTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const floorMat = new THREE.MeshStandardMaterial({
    map: gridTexture,
    metalness: 0.6,
    roughness: 0.4,
  });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.receiveShadow = true;
  floorMesh.position.y = 0;
  scene.add(floorMesh);

  // 5. Playable Boundary Ring (Holographic energy field on the ground)
  const boundaryGeo = new THREE.RingGeometry(ARENA_RADIUS - 0.5, ARENA_RADIUS + 0.5, 64);
  boundaryGeo.rotateX(-Math.PI / 2);
  const boundaryMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  const boundaryRing = new THREE.Mesh(boundaryGeo, boundaryMat);
  boundaryRing.position.y = 0.03;
  scene.add(boundaryRing);

  // 6. Perimeter Defense Pylons (Natural sci-fi boundary markers around perimeter)
  const boundaryPylons = new THREE.Group();
  const numPylons = 16;
  const pylonMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.25,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 1.2,
    metalness: 0.2,
    roughness: 0.2,
  });

  for (let i = 0; i < numPylons; i++) {
    const angle = (i / numPylons) * Math.PI * 2;
    const px = Math.cos(angle) * ARENA_RADIUS;
    const pz = Math.sin(angle) * ARENA_RADIUS;

    const pylonGroup = new THREE.Group();
    pylonGroup.position.set(px, 0, pz);

    // Tapered Spire
    const spireGeo = new THREE.ConeGeometry(0.7, 7, 5);
    spireGeo.translate(0, 3.5, 0);
    const spire = new THREE.Mesh(spireGeo, pylonMat);
    spire.castShadow = true;
    spire.receiveShadow = true;
    pylonGroup.add(spire);

    // Glowing Emitter Ring at top
    const emitterGeo = new THREE.TorusGeometry(0.5, 0.1, 6, 16);
    emitterGeo.rotateX(Math.PI / 2);
    emitterGeo.translate(0, 5.5, 0);
    const emitter = new THREE.Mesh(emitterGeo, beaconMat);
    pylonGroup.add(emitter);

    boundaryPylons.add(pylonGroup);
  }
  scene.add(boundaryPylons);

  // 7. Futuristic Biomech Monoliths & Crystalline Spikes scattered in background
  const monoliths = new THREE.Group();
  const monolithGeo = new THREE.BoxGeometry(2.5, 14, 2.5);
  monolithGeo.translate(0, 7, 0);
  const monolithMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.9,
    roughness: 0.15,
  });

  // Position monoliths outside active combat arena
  const monolithPositions = [
    [58, 20], [-62, 25], [30, -65], [-45, -55],
    [70, -35], [-75, -20], [15, 75], [-25, 70]
  ];

  monolithPositions.forEach(([mx, mz], idx) => {
    const mono = new THREE.Mesh(monolithGeo, monolithMat);
    mono.position.set(mx, 0, mz);
    mono.rotation.y = idx * 0.7;
    mono.castShadow = true;
    monoliths.add(mono);

    // Vertical neon power conduits on monolith faces
    const stripGeo = new THREE.BoxGeometry(0.1, 12, 0.1);
    stripGeo.translate(0, 7, 1.26);
    const strip = new THREE.Mesh(stripGeo, beaconMat);
    strip.position.set(mx, 0, mz);
    strip.rotation.y = idx * 0.7;
    monoliths.add(strip);
  });
  scene.add(monoliths);

  // 8. Atmospheric Glowing Void Dust Embers (Zero GC particles)
  const dustCount = 350;
  const dustGeo = new THREE.BufferGeometry();
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 110;
    dustPositions[i * 3 + 1] = Math.random() * 22;
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 110;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));

  const dustMat = new THREE.PointsMaterial({
    color: 0x38bdf8,
    size: 0.35,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  scene.add(dustPoints);

  const update = (_time: number, delta: number) => {
    // Subtle float & drift of atmospheric motes
    const posAttr = dustGeo.attributes.position as THREE.BufferAttribute;
    const array = posAttr.array as Float32Array;
    for (let i = 0; i < dustCount; i++) {
      array[i * 3 + 1] -= delta * 0.4;
      if (array[i * 3 + 1] < 0) {
        array[i * 3 + 1] = 22;
      }
    }
    posAttr.needsUpdate = true;
  };

  const dispose = () => {
    floorGeo.dispose();
    floorMat.dispose();
    gridTexture.dispose();
    boundaryGeo.dispose();
    boundaryMat.dispose();
    dustGeo.dispose();
    dustMat.dispose();
  };

  return { scene, keyLight, dustPoints, boundaryPylons, monoliths, update, dispose };
}

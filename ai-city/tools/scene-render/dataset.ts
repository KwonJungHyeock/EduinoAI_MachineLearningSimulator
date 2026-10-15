// author: eduino
// 데이터셋 렌더(개발용): 고정 CCTV 카메라로 거리 장면을 무작위로 만들고, 차 · 사람의 화면 상자(2D)와 위치를 함께 기록.
// ?dataset=1&n=60&night=0&seed=1  → window.__ds = { w, h, items: [{ png, objs: [{cls, box:[x0,y0,x1,y1], onRoad}] }] }
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

const W = 256, H = 160, T = 4;
const loader = new GLTFLoader();
const cache = new Map<string, Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }>>();
const load = (m: string) => { if (!cache.has(m)) cache.set(m, loader.loadAsync(`/models/${m}.${m.startsWith('people/') ? 'gltf' : 'glb'}`).then((g) => ({ scene: g.scene, animations: g.animations }))); return cache.get(m)!; };
const CARS = ['sedan', 'suv', 'taxi', 'van', 'hatchback-sports', 'sedan-sports', 'suv-luxury', 'police', 'delivery', 'truck'];
const PEOPLE = ['m-casual-2', 'f-casual', 'm-casual-hoodie', 'f-formal', 'm-suit', 'f-worker', 'm-worker', 'f-suit', 'm-adventurer', 'f-adventurer', 'm-punk'];
const POSES = ['Idle', 'Walk', 'Run'];

function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

async function obj(m: string, x: number, z: number, r: number, s: number, pose?: string) {
  const g = await load(m), o = skClone(g.scene);
  if (pose && g.animations.length) { const mx = new THREE.AnimationMixer(o); const c = g.animations.find((a) => a.name === pose) ?? g.animations[0]; mx.clipAction(c).play(); mx.setTime(c.duration * 0.35); mx.update(0); }
  o.position.set(x, 0, z); o.rotation.y = (r * Math.PI) / 180; o.scale.setScalar(s);
  o.traverse((c) => { const me = c as THREE.Mesh; if (me.isMesh) { me.castShadow = true; me.receiveShadow = true; } });
  return o;
}

export async function dataset(n: number, night: boolean, seed: number) {
  const R = rng(seed);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H); renderer.setPixelRatio(1); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.body.appendChild(renderer.domElement);
  const cam = new THREE.PerspectiveCamera(48, W / H, 0.1, 100);
  const items: { png: string; objs: { cls: string; box: number[]; onRoad: boolean; x: number; z: number }[] }[] = [];

  // 고정 배경(도로 + 보도 + 횡단보도 + 건물)
  const base = new THREE.Group();
  const add = async (m: string, x: number, z: number, r = 0, s = T) => base.add(await obj(m, x, z, r, s));
  for (let gx = -4; gx <= 4; gx++) {
    await add(gx === 0 ? 'city-kit-roads/road-crossing' : 'city-kit-roads/road-straight', gx * T, 0, gx === 0 ? 90 : 0);
    await add('city-kit-roads/tile-low', gx * T, T); await add('city-kit-roads/tile-low', gx * T, -T); await add('city-kit-roads/tile-low', gx * T, -2 * T);
  }
  const shops = ['building-a', 'building-c', 'building-e', 'building-g', 'building-i', 'building-k'];
  for (let i = 0; i < 6; i++) await add(`commercial/${shops[i]}`, -12 + i * 4.8, -11);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ color: '#7d9a63', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01; ground.receiveShadow = true; base.add(ground);

  for (let k = 0; k < n; k++) {
    const scene = new THREE.Scene();
    const sky = night ? '#0d1626' : '#86b6e2';
    scene.background = new THREE.Color(sky); scene.fog = new THREE.Fog(sky, 22, 48);
    scene.add(new THREE.HemisphereLight(night ? '#33486e' : '#cfe4ff', night ? '#101418' : '#5b6b4a', night ? 0.35 : 0.75));
    const sun = new THREE.DirectionalLight(night ? '#9fb6ff' : '#ffe9c7', night ? 0.45 : 3.1);
    sun.position.set(4 + R() * 6, 12, 2 + R() * 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
    const sc = sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; scene.add(sun);
    if (night) for (const lx of [-8, 0, 8]) { const l = new THREE.PointLight('#ffd9a0', 22, 14, 1.6); l.position.set(lx + R() * 2, 4.5, -2.6); scene.add(l); }
    renderer.toneMappingExposure = night ? 1.05 : 0.95;
    scene.add(base.clone(true));
    // 물체: 차 0~3대(차도), 사람 1~4명(보도 또는 횡단보도 · 차도)
    const objs: { cls: string; o: THREE.Object3D; onRoad: boolean; x: number; z: number }[] = [];
    const nCar = Math.floor(R() * 4), nPer = 1 + Math.floor(R() * 4), used: number[][] = [];
    const free = (x: number, z: number, d: number) => used.every(([ux, uz]) => Math.hypot(ux - x, uz - z) > d);
    for (let i = 0; i < nCar; i++) {
      const lane = R() < 0.5 ? 0.9 : -0.9, x = -8 + R() * 16; if (!free(x, lane, 3.2)) continue; used.push([x, lane]);
      const o = await obj(`car-kit/${CARS[Math.floor(R() * CARS.length)]}`, x, lane, lane > 0 ? 90 : 270, 1); scene.add(o); objs.push({ cls: 'car', o, onRoad: true, x, z: lane });
    }
    for (let i = 0; i < nPer; i++) {
      const where = R(); // 0.35 보도(위) · 0.35 보도(아래) · 0.3 차도(횡단 · 무단)
      const z = where < 0.35 ? -2.4 - R() * 1.4 : where < 0.7 ? 2.4 + R() * 1.4 : -1.6 + R() * 3.2;
      const x = -8 + R() * 16; if (!free(x, z, 1.4)) continue; used.push([x, z]);
      const o = await obj(`people/${PEOPLE[Math.floor(R() * PEOPLE.length)]}`, x, z, R() * 360, 0.7, POSES[Math.floor(R() * 3)]);
      scene.add(o); objs.push({ cls: 'person', o, onRoad: Math.abs(z) < 2, x, z });
    }
    cam.position.set(0, 6.8, 8.2); cam.lookAt(0, 0, -0.4); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    renderer.render(scene, cam);
    // 화면 상자: 물체 경계 상자 8꼭짓점을 화면으로 투영
    const out = objs.map(({ cls, o, onRoad, x, z }) => {
      const b = new THREE.Box3().setFromObject(o); let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
      for (const px of [b.min.x, b.max.x]) for (const py of [b.min.y, b.max.y]) for (const pz of [b.min.z, b.max.z]) {
        const v = new THREE.Vector3(px, py, pz).project(cam); const sx = (v.x + 1) / 2, sy = (1 - v.y) / 2;
        x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
      }
      return { cls, box: [x0, y0, x1, y1].map((v) => +Math.max(0, Math.min(1, v)).toFixed(4)), onRoad, x: +x.toFixed(2), z: +z.toFixed(2) };
    });
    items.push({ png: renderer.domElement.toDataURL('image/png'), objs: out });
  }
  return { w: W, h: H, items };
}

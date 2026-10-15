// author: eduino
// 장면 렌더 도구: Kenney 로우폴리 모델(CC0)로 CCTV 각도 장면을 조립해 이미지로 만든다. (개발용)
//   ?probe=모델,모델…        모델 크기 측정
//   ?scene=cam01&v=base|event  장면 렌더 → window.__out 에 PNG dataURL
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { SCENES, type Item } from './scenes';

const Q0 = new URLSearchParams(location.search);
const W = Number(Q0.get('w') ?? 960), H = Math.round((W * 600) / 960);
const loader = new GLTFLoader();
const cache = new Map<string, Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }>>();
const load = (m: string) => {
  if (!cache.has(m)) cache.set(m, loader.loadAsync(`/models/${m}.${m.startsWith("people/") ? "gltf" : "glb"}`).then((g) => ({ scene: g.scene, animations: g.animations })));
  return cache.get(m)!;
};
declare global { interface Window { __done?: boolean; __out?: string; __probe?: unknown; __err?: string } }

async function probe(list: string[]) {
  const out: Record<string, number[]> = {};
  for (const m of list) {
    const g = await load(m);
    const s = new THREE.Box3().setFromObject(g.scene).getSize(new THREE.Vector3());
    out[m] = [+s.x.toFixed(3), +s.y.toFixed(3), +s.z.toFixed(3)];
  }
  window.__probe = out; window.__done = true;
}

async function place(scene: THREE.Scene, it: Item) {
  const g = await load(it.m);
  const o = skClone(g.scene);
  // 캐릭터 자세: 애니메이션 한 프레임으로 고정
  if (it.pose && g.animations.length) {
    const mixer = new THREE.AnimationMixer(o);
    const clip = g.animations.find((a) => a.name === it.pose) ?? g.animations[0];
    mixer.clipAction(clip).play(); mixer.setTime(it.poseT ?? (it.pose === 'die' || it.pose === 'Death' ? clip.duration - 0.01 : clip.duration * 0.35));
  }
  setup(o, it); scene.add(o);
}
function setup(o: THREE.Object3D, it: Item) {
  o.position.set(it.x, it.y ?? 0, it.z);
  o.rotation.set(it.rx ?? 0, ((it.r ?? 0) * Math.PI) / 180, it.rz ?? 0);
  o.scale.setScalar(it.s ?? 1);
  o.traverse((c) => { const m = c as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
}

async function render(id: string, v: 'base' | 'event') {
  const def = SCENES.find((s) => s.id === id);
  if (!def) throw new Error('no scene ' + id);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H); renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = def.exposure ?? 1.05;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(def.sky ?? '#9cc7e8');
  scene.fog = new THREE.Fog(def.sky ?? '#9cc7e8', 14, 34);
  scene.add(new THREE.HemisphereLight('#dfefff', '#6b7f5a', 1.3));
  const sun = new THREE.DirectionalLight('#fff4dd', 2.4);
  sun.position.set(...(def.sun ?? [6, 12, 4])); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; sc.far = 50;
  sun.shadow.bias = -0.0004; scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: def.ground ?? '#7d9a63', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01; ground.receiveShadow = true; scene.add(ground);
  for (const it of def.base) await place(scene, it);
  if (v === 'event') for (const it of def.event) await place(scene, it);
  const cam = new THREE.PerspectiveCamera(def.fov ?? 52, W / H, 0.1, 100);
  cam.position.set(...def.cam); cam.lookAt(...def.look);
  renderer.render(scene, cam);
  window.__out = renderer.domElement.toDataURL('image/png');
  window.__done = true;
}

const q = new URLSearchParams(location.search);
(q.get('probe') ? probe(q.get('probe')!.split(',')) : render(q.get('scene') ?? 'cam01', (q.get('v') as 'base' | 'event') ?? 'base'))
  .catch((e) => { window.__err = String(e?.stack ?? e); window.__done = true; });

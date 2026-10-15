// author: eduino
// 장면 렌더 도구: Kenney 로우폴리 모델(CC0)로 CCTV 각도 장면을 조립해 이미지로 만든다. (개발용)
//   ?probe=모델,모델…        모델 크기 측정
//   ?scene=cam01&v=base|event  장면 렌더 → window.__out 에 PNG dataURL
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
const LOOK = new URLSearchParams(location.search).get('look') ?? 'real'; // real | flat(이전 방식)
let ENV: THREE.Texture | null = null; // 반사용 환경맵 — 차 · 유리창에만 건다(전체에 걸면 화면이 바램)
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
  if (LOOK === 'real') finish(o, it.m);
}
// 재질: 차 = 도장 광택 + 유리 반사, 건물 · 바닥 = 무광, 창문(파란 계열) = 반사, 사람 = 천 질감
function finish(o: THREE.Object3D, m: string) {
  const kind = m.startsWith('car-kit/') ? 'car' : m.startsWith('people/') ? 'person' : m.startsWith('city-kit-roads/road') || m.includes('tile') ? 'road' : 'build';
  o.traverse((c) => {
    const mesh = c as THREE.Mesh; if (!mesh.isMesh) return;
    const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.MeshStandardMaterial[];
    const out = mats.map((mt) => {
      const n = mt.clone() as THREE.MeshStandardMaterial;
      const hsl = { h: 0, s: 0, l: 0 }; n.color?.getHSL(hsl);
      const glassy = !n.map && hsl.h > 0.5 && hsl.h < 0.7 && hsl.s > 0.25; // 파란 유리창
      if (kind === 'car') { const p = new THREE.MeshPhysicalMaterial({ map: n.map, color: n.color, roughness: 0.38, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.1, envMap: ENV, envMapIntensity: 0.32 }); return p; }
      if (kind === 'person') { n.roughness = 0.85; n.metalness = 0; return n; }
      if (kind === 'road') { n.roughness = 0.95; n.metalness = 0; return n; }
      if (glassy) { n.roughness = 0.06; n.metalness = 0.4; n.envMap = ENV; n.envMapIntensity = 0.9; return n; }
      n.roughness = 0.82; n.metalness = 0; return n;
    });
    mesh.material = Array.isArray(mesh.material) ? out : out[0];
  });
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = (def.exposure ?? 1.05) * (LOOK === 'real' ? 0.95 : 1);
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const sky = def.sky ?? (LOOK === 'real' ? '#7fb2e0' : '#9cc7e8');
  scene.background = new THREE.Color(sky);
  scene.fog = new THREE.Fog(sky, LOOK === 'real' ? 22 : 14, LOOK === 'real' ? 48 : 34);
  const real = LOOK === 'real';
  if (real) { // 하늘 반사(환경맵): 광택 · 유리 반사용
    const pm = new THREE.PMREMGenerator(renderer);
    ENV = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  }
  scene.add(new THREE.HemisphereLight('#cfe4ff', '#5b6b4a', real ? 0.72 : 1.3));
  const sun = new THREE.DirectionalLight(real ? '#ffe9c7' : '#fff4dd', real ? 3.3 : 2.4);
  sun.position.set(...(def.sun ?? [6, 12, 4])); sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096); sun.shadow.radius = 4; sun.shadow.normalBias = 0.02;
  const sc = sun.shadow.camera; sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; sc.far = 50;
  sun.shadow.bias = -0.0004; scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: def.ground ?? '#7d9a63', roughness: 1, envMapIntensity: 0.2 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01; ground.receiveShadow = true; scene.add(ground);
  for (const it of def.base) await place(scene, it);
  if (v === 'event') for (const it of def.event) await place(scene, it);
  const cam = new THREE.PerspectiveCamera(def.fov ?? 52, W / H, 0.1, 100);
  cam.position.set(...def.cam); cam.lookAt(...def.look);
  if (real && new URLSearchParams(location.search).get('ao') !== '0') { // 접촉 음영(GTAO): 건물 밑 · 차 밑 · 구석이 자연스럽게 어두워짐
    const comp = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
    comp.setPixelRatio(1); comp.setSize(W, H);
    comp.addPass(new RenderPass(scene, cam));
    const ao = new GTAOPass(scene, cam, W, H);
    ao.updateGtaoMaterial({ radius: 1.4, distanceExponent: 1.2, thickness: 2, scale: 1.6, samples: 16 });
    ao.blendIntensity = 1; comp.addPass(ao);
    comp.addPass(new OutputPass());
    comp.render();
  } else renderer.render(scene, cam);
  window.__out = renderer.domElement.toDataURL('image/png');
  window.__done = true;
}

const q = new URLSearchParams(location.search);
declare global { interface Window { __ds?: unknown } }
if (q.get('dataset')) {
  import('./dataset').then(({ dataset }) => dataset(Number(q.get('n') ?? 40), q.get('night') === '1', Number(q.get('seed') ?? 1)))
    .then((d) => { window.__ds = d; window.__done = true; }).catch((e) => { window.__err = String(e?.stack ?? e); window.__done = true; });
} else
(q.get('probe') ? probe(q.get('probe')!.split(',')) : render(q.get('scene') ?? 'cam01', (q.get('v') as 'base' | 'event') ?? 'base'))
  .catch((e) => { window.__err = String(e?.stack ?? e); window.__done = true; });

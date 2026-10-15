// author: eduino
// 메인 화면 'AI 코어' 받침대 렌더(개발용): 짙은 광택 금속 단 3층 + 테두리 빛 띠 + 바닥 반사 타일.
// ?pedestal=1&w=1200 → window.__out (배경 = 메인 화면 배경색, 가장자리는 화면 쪽 CSS 마스크로 지움)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export function pedestal(W: number) {
  const H = Math.round(W * 0.75);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H); renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#05070d');
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  (scene as THREE.Scene & { environmentIntensity: number }).environmentIntensity = 0.18;
  scene.fog = new THREE.Fog('#05070d', 5.5, 10);
  const metal = new THREE.MeshPhysicalMaterial({ color: '#0b0e16', metalness: 0.8, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 });
  const glow = (c: string) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
  // 바닥: 어두운 반사 타일
  const tiles = new THREE.Group();
  for (let i = -6; i <= 6; i++) for (let j = -6; j <= 3; j++) {
    const t = new THREE.Mesh(new RoundedBoxGeometry(0.96, 0.06, 0.96, 2, 0.02), new THREE.MeshPhysicalMaterial({ color: '#07090f', metalness: 0.5, roughness: 0.42 }));
    t.position.set(i, -0.03, j); t.receiveShadow = true; tiles.add(t);
  }
  scene.add(tiles);
  // 받침대 3층 + 층마다 빛 띠(파랑 → 보라)
  const layers: [number, number, number, string][] = [[2.6, 0.32, 0.0, '#3b82f6'], [2.1, 0.28, 0.32, '#6366f1'], [1.5, 0.22, 0.6, '#8b5cf6']];
  for (const [s, h, y, c] of layers) {
    const b = new THREE.Mesh(new RoundedBoxGeometry(s, h, s, 6, 0.14), metal); b.position.y = y + h / 2; b.castShadow = true; scene.add(b);
    const rim = new THREE.Mesh(new RoundedBoxGeometry(s + 0.012, 0.012, s + 0.012, 6, 0.006), glow(c)); rim.position.y = y + h - 0.035; scene.add(rim);
  }
  // 맨 위 원판(코어가 서는 자리)
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.58, 0.06, 96), metal); disc.position.y = 0.85; scene.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.012, 16, 128), glow('#a5b4fc')); ring.rotation.x = Math.PI / 2; ring.position.y = 0.885; scene.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.006, 16, 128), glow('#60a5fa')); ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.885; scene.add(ring2);
  // 빛: 위에서 내려오는 차가운 빛 + 받침대 둘레 보라 빛
  const key = new THREE.SpotLight('#9fb4ff', 16, 12, 0.42, 0.8, 1.4); key.position.set(0, 6, 1.5); key.target.position.set(0, 0.6, 0); key.castShadow = true; scene.add(key, key.target);
  for (const [x, z] of [[-1.5, 0.9], [1.5, 0.9], [0, 1.6]]) { const l = new THREE.PointLight('#6d28d9', 1.6, 2.2, 2); l.position.set(x, 0.15, z); scene.add(l); }
  const cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 50); cam.position.set(0, 3.6, 6.0); cam.lookAt(0, 0.7, 0);
  const comp = new EffectComposer(renderer); comp.setPixelRatio(1); comp.setSize(W, H);
  comp.addPass(new RenderPass(scene, cam)); comp.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.4, 0.55, 0.9)); comp.addPass(new OutputPass()); comp.render();
  return renderer.domElement.toDataURL('image/png');
}

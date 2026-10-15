// author: eduino
// 재활용 선별 라인 렌더(개발용) — 공통 기초(머신러닝 기초) 장면 · 물건 사진.
//   ?recycle=line&w=1600                    라인 전경(컨베이어 · 센서 게이트 · 분류 통 · 로봇 팔 · 물건)
//   ?recycle=item&kind=can|pet|glass&v=0..  물건 한 개 사진(이름표 붙이기 재료). kind 에 crushed · colorglass · labeled 도 있음
// 물건은 회전체(Lathe)로 직접 모델링: 캔 = 금속 광택, 페트 · 유리 = 투과 재질.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export type Kind = 'can' | 'pet' | 'glass' | 'crushed' | 'colorglass' | 'labeled';
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const V = (pts: number[][]) => pts.map(([r, y]) => new THREE.Vector2(r, y));

// 캔 라벨(코드로 그린 추상 무늬 — 상표 없음)
function canLabel(hue: number) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d')!;
  x.fillStyle = `hsl(${hue} 70% 42%)`; x.fillRect(0, 0, 512, 256);
  x.fillStyle = `hsl(${(hue + 40) % 360} 80% 60%)`; x.fillRect(0, 150, 512, 40);
  x.fillStyle = 'rgba(255,255,255,0.85)'; for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(64 + i * 128, 90, 26, 0, Math.PI * 2); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
}
function paperLabel() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d')!;
  x.fillStyle = '#f4efe3'; x.fillRect(0, 0, 512, 128); x.fillStyle = '#c2410c'; x.fillRect(0, 0, 512, 22); x.fillStyle = '#18201d'; for (let i = 0; i < 5; i++) x.fillRect(40 + i * 90, 60, 60, 10);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function makeItem(kind: Kind, seed = 1): THREE.Group {
  const R = rng(seed * 97 + kind.length), g = new THREE.Group();
  const glassMat = (color: string, rough = 0.05) => new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: 0, transmission: 1, thickness: 0.004, ior: 1.5, envMapIntensity: 1.2, transparent: true, side: THREE.DoubleSide });
  if (kind === 'can' || kind === 'crushed') {
    const prof = V([[0, 0], [0.026, 0], [0.031, 0.006], [0.033, 0.014], [0.033, 0.108], [0.028, 0.118], [0.027, 0.122], [0, 0.122]]);
    const geo = new THREE.LatheGeometry(prof, 64);
    if (kind === 'crushed') { // 찌그러짐: 가운데를 납작하게 + 주름
      const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x); const k = 1 - 0.38 * Math.exp(-(((y - 0.06) / 0.03) ** 2)) * (0.6 + 0.4 * Math.sin(a * 5 + seed)); p.setX(i, x * k * (1 + 0.15 * Math.cos(a))); p.setZ(i, z * k * 0.7); p.setY(i, y * 0.82); }
      geo.computeVertexNormals();
    }
    const body = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: canLabel(Math.floor(R() * 360)), metalness: 0.75, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.15 }));
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.002, 48), new THREE.MeshStandardMaterial({ color: '#c9ced6', metalness: 1, roughness: 0.22 })); top.position.y = kind === 'crushed' ? 0.1 : 0.1215;
    g.add(body, top);
  } else if (kind === 'pet' || kind === 'labeled') {
    const prof = V([[0, 0.002], [0.022, 0], [0.032, 0.008], [0.033, 0.03], [0.031, 0.05], [0.033, 0.07], [0.033, 0.14], [0.03, 0.165], [0.018, 0.19], [0.0135, 0.2], [0.0135, 0.21], [0, 0.21]]);
    const tint = ['#dff2ff', '#e6fff0', '#f2f7ff'][Math.floor(R() * 3)];
    g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 64), glassMat(tint, 0.08)));
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.016, 32), new THREE.MeshStandardMaterial({ color: ['#1d4ed8', '#e5e7eb', '#16a34a'][Math.floor(R() * 3)], roughness: 0.45 })); cap.position.y = 0.214; g.add(cap);
    if (kind === 'labeled') { const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.0335, 0.0335, 0.05, 48, 1, true), new THREE.MeshStandardMaterial({ map: paperLabel(), roughness: 0.7 })); lb.position.y = 0.1; g.add(lb); }
  } else {
    const prof = V([[0, 0.003], [0.024, 0], [0.03, 0.006], [0.031, 0.02], [0.031, 0.14], [0.026, 0.165], [0.014, 0.19], [0.0125, 0.225], [0.014, 0.232], [0, 0.232]]);
    const col = kind === 'colorglass' ? '#2563eb' : ['#2f7d4f', '#7a4a1e', '#e8f1ea'][Math.floor(R() * 3)];
    const m = glassMat(col, 0.03); m.thickness = 0.01; m.attenuationColor = new THREE.Color(col); m.attenuationDistance = 0.05;
    g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 64), m));
  }
  g.traverse((c) => { const me = c as THREE.Mesh; if (me.isMesh) { me.castShadow = true; me.receiveShadow = true; } });
  return g;
}

function stage(W: number, H: number, bg: string) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H); renderer.setPixelRatio(1); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(bg);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.02).texture;
  return { renderer, scene };
}
function finish(renderer: THREE.WebGLRenderer, scene: THREE.Scene, cam: THREE.Camera, W: number, H: number, ao = true) {
  const comp = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
  comp.setPixelRatio(1); comp.setSize(W, H); comp.addPass(new RenderPass(scene, cam));
  if (ao) { const p = new GTAOPass(scene, cam as THREE.PerspectiveCamera, W, H); p.updateGtaoMaterial({ radius: 0.25, distanceExponent: 1.2, thickness: 0.4, scale: 1.2, samples: 16 }); comp.addPass(p); }
  comp.addPass(new OutputPass()); comp.render();
  return renderer.domElement.toDataURL('image/png');
}

// 물건 한 개 사진: 밝은 회색 판 위, 살짝 위에서
export function itemShot(kind: Kind, v: number, W = 480) {
  const H = W, { renderer, scene } = stage(W, H, '#e9ecef');
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshStandardMaterial({ color: '#dfe3e8', roughness: 0.6 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const key = new THREE.DirectionalLight('#ffffff', 2.2); key.position.set(0.4, 0.8, 0.5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); const sc = key.shadow.camera; sc.left = sc.bottom = -0.3; sc.right = sc.top = 0.3; key.shadow.radius = 6; scene.add(key);
  scene.add(new THREE.HemisphereLight('#ffffff', '#c7ccd2', 0.6));
  const it = makeItem(kind, v + 1), R = rng(v * 13 + 5);
  if (kind !== 'crushed' && R() < 0.35) { it.rotation.z = Math.PI / 2; it.position.y = 0.033; } // 일부는 누워 있음
  it.rotation.y = R() * Math.PI * 2; scene.add(it);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 10); cam.position.set(0, 0.32, 0.42); cam.lookAt(0, 0.09, 0);
  return finish(renderer, scene, cam, W, H, false);
}

// 라인 전경
export async function line(W: number) {
  const H = Math.round(W * 0.625), { renderer, scene } = stage(W, H, '#d9dee4');
  scene.fog = new THREE.Fog('#d9dee4', 4, 9);
  const mat = (color: string, rough = 0.6, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), mat('#b9c0c8', 0.45)); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 8), mat('#e4e8ec', 0.9)); wall.position.set(0, 4, -2.2); scene.add(wall);
  // 바닥 안전선
  for (const z of [-0.75, 0.75]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.06), mat('#f5c542', 0.5)); s.rotation.x = -Math.PI / 2; s.position.set(0, 0.002, z); scene.add(s); }
  // 컨베이어: 프레임 + 검은 벨트 + 롤러 + 다리
  const L = 5.2, y = 0.82, bw = 0.5;
  const belt = new THREE.Mesh(new THREE.BoxGeometry(L, 0.04, bw), mat('#1f2328', 0.85)); belt.position.set(0, y, 0); belt.receiveShadow = true; belt.castShadow = true; scene.add(belt);
  for (const z of [-bw / 2 - 0.03, bw / 2 + 0.03]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(L + 0.1, 0.09, 0.05), mat('#9aa4ae', 0.3, 0.8)); rail.position.set(0, y + 0.01, z); rail.castShadow = true; scene.add(rail); }
  for (let i = 0; i < 7; i++) for (const z of [-bw / 2, bw / 2]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, y, 0.05), mat('#7d8791', 0.35, 0.7)); leg.position.set(-L / 2 + 0.2 + i * ((L - 0.4) / 6), y / 2, z); leg.castShadow = true; scene.add(leg); }
  // 센서 게이트: 아치 + 청록 빛 띠
  const gx = -0.6;
  for (const z of [-0.38, 0.38]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.08), mat('#e9edf1', 0.35, 0.2)); p.position.set(gx, y + 0.27, z); p.castShadow = true; scene.add(p); }
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.84), mat('#e9edf1', 0.35, 0.2)); top.position.set(gx, y + 0.58, 0); top.castShadow = true; scene.add(top);
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.6), new THREE.MeshBasicMaterial({ color: '#2fbf8a', toneMapped: false })); glow.position.set(gx, y + 0.52, 0); scene.add(glow);
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.48), new THREE.MeshBasicMaterial({ color: '#2fbf8a', transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })); beam.rotation.y = Math.PI / 2; beam.position.set(gx, y + 0.27, 0); scene.add(beam);
  // 분류 통 3개(캔 · 페트 · 유리) — 라인 끝 앞쪽
  const bins: [string, number][] = [['#9aa4ae', 1.1], ['#3b82f6', 1.75], ['#2f7d4f', 2.4]];
  for (const [c, x] of bins) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.5), mat(c, 0.55)); b.position.set(x, 0.31, 0.85); b.castShadow = true; b.receiveShadow = true; scene.add(b);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.03, 0.52), mat('#2b3138', 0.5)); rim.position.set(x, 0.635, 0.85); scene.add(rim);
  }
  // 로봇 팔(원통 · 상자 조립): 받침 → 어깨 → 위팔 → 아래팔 → 집게
  const arm = new THREE.Group(), am = mat('#f2f4f6', 0.35, 0.1), jm = mat('#2b3138', 0.4, 0.4);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.18, 40), jm); base.position.y = 0.09; arm.add(base);
  const sh = new THREE.Group(); sh.position.y = 0.18; arm.add(sh); sh.rotation.y = 0.5;
  const tur = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.14, 40), am); tur.position.y = 0.07; sh.add(tur);
  const up = new THREE.Group(); up.position.y = 0.14; sh.add(up); up.rotation.z = -0.55;
  const ua = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.1), am); ua.position.y = 0.31; up.add(ua);
  const el = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.14, 32), jm); el.rotation.x = Math.PI / 2; el.position.y = 0.62; up.add(el);
  const fo = new THREE.Group(); fo.position.y = 0.62; up.add(fo); fo.rotation.z = 2.1;
  const fa = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), am); fa.position.y = 0.25; fo.add(fa);
  const wr = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 32), jm); wr.position.y = 0.52; fo.add(wr);
  for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.09, 0.05), jm); f.position.set(s * 0.035, 0.6, 0); fo.add(f); }
  arm.position.set(0.6, 0, -0.62); arm.traverse((c) => { const me = c as THREE.Mesh; if (me.isMesh) me.castShadow = true; }); scene.add(arm);
  // 벨트 위 물건(무작위 종류 · 위치 · 눕힘)
  const R = rng(7), kinds: Kind[] = ['can', 'pet', 'glass', 'can', 'pet', 'glass', 'crushed', 'labeled', 'colorglass', 'pet', 'can', 'glass'];
  kinds.forEach((k, i) => {
    const it = makeItem(k, i + 3), x = -2.3 + i * 0.36 + (R() - 0.5) * 0.08, lie = k !== 'crushed' && R() < 0.4;
    if (lie) { it.rotation.z = Math.PI / 2; it.position.y = 0.033; }
    const holder = new THREE.Group(); holder.add(it); holder.position.set(x, y + 0.02, (R() - 0.5) * 0.24); holder.rotation.y = R() * Math.PI * 2; scene.add(holder);
  });
  // 빛: 천장 창 느낌의 큰 면광 + 방향광 그림자
  scene.add(new THREE.HemisphereLight('#ffffff', '#9aa4ae', 0.5));
  const sun = new THREE.DirectionalLight('#fff6ea', 2.4); sun.position.set(-1.5, 4, 2.5); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.radius = 5; sun.shadow.bias = -0.0003;
  const s2 = sun.shadow.camera; s2.left = -4; s2.right = 4; s2.top = 3; s2.bottom = -3; scene.add(sun);
  const cam = new THREE.PerspectiveCamera(34, W / H, 0.05, 30); cam.position.set(-1.1, 1.75, 2.9); cam.lookAt(0.1, 0.8, 0);
  return finish(renderer, scene, cam, W, H);
}

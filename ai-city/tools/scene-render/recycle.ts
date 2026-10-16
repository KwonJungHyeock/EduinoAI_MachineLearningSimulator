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
// 옆선 점을 촘촘하게(찌그러짐 · 주름이 높이 방향으로 보이도록)
const dense = (pts: number[][], step = 0.002) => { const o: number[][] = [pts[0]]; for (let i = 1; i < pts.length; i++) { const [r0, y0] = pts[i - 1], [r1, y1] = pts[i], n = Math.max(1, Math.ceil(Math.hypot(r1 - r0, y1 - y0) / step)); for (let k = 1; k <= n; k++) o.push([r0 + (r1 - r0) * (k / n), y0 + (y1 - y0) * (k / n)]); } return o; };

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
  const clear = (color: string, rough: number, thick: number) => new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: 0, transmission: 1, thickness: thick, ior: 1.5, envMapIntensity: 1.6, specularIntensity: 1, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide });
  if (kind === 'can' || kind === 'crushed') {
    const prof = V(dense([[0, 0], [0.026, 0], [0.031, 0.006], [0.033, 0.014], [0.033, 0.108], [0.028, 0.118], [0.027, 0.122], [0.0262, 0.1225], [0, 0.1225]]));
    const geo = new THREE.LatheGeometry(prof, 96, 0, Math.PI * 2);
    if (kind === 'crushed') { // 찌그러짐: 위아래로 눌려 주름(아코디언)이 지고, 한쪽이 납작하게 꺾임
      const p = geo.attributes.position, ph = R() * 6;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), mid = Math.exp(-(((y - 0.06) / 0.035) ** 2));
        const fold = 1 + 0.16 * mid * Math.sin(y * 260 + a * 1.5 + ph);           // 주름
        const dent = 1 - 0.55 * mid * Math.pow(Math.max(0, Math.cos(a - ph)), 2);          // 한쪽이 움푹
        const yy = y < 0.02 ? y : 0.02 + (y - 0.02) * 0.52 + 0.006 * Math.sin(a * 3 + ph) * mid; // 높이 52 %
        p.setX(i, x * fold * dent * 1.08); p.setZ(i, z * fold * dent * 0.92); p.setY(i, yy);
      }
      geo.computeVertexNormals();
    }
    const body = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: canLabel(Math.floor(R() * 360)), metalness: 0.8, roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.2 }));
    const lid = new THREE.Mesh(new THREE.TorusGeometry(0.0268, 0.0016, 10, 64), new THREE.MeshStandardMaterial({ color: '#b8bec8', metalness: 1, roughness: 0.3 })); lid.rotation.x = Math.PI / 2; lid.position.y = kind === 'crushed' ? 0.02 + 0.1025 * 0.52 : 0.1225;
    const tab = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.0012, 0.02), new THREE.MeshStandardMaterial({ color: '#9aa1ab', metalness: 1, roughness: 0.35 })); tab.position.set(0, lid.position.y + 0.001, 0.006);
    g.add(body, lid, tab);
    if (kind === 'crushed') g.rotation.z = (R() - 0.5) * 0.5;
  } else if (kind === 'pet' || kind === 'labeled') {
    // 페트병: 얇고 투명한 몸통 + 가로 홈(골) + 밀크 플라스틱 뚜껑 링
    const pts: number[][] = [[0, 0.002], [0.02, 0], [0.031, 0.007], [0.033, 0.024]];
    for (let k = 0; k < 6; k++) { const y0 = 0.03 + k * 0.018; pts.push([0.0325, y0], [0.0305, y0 + 0.006], [0.0325, y0 + 0.011]); }
    pts.push([0.033, 0.15], [0.029, 0.172], [0.018, 0.193], [0.0135, 0.201], [0.0135, 0.208], [0.0128, 0.208]);
    const tint = ['#e3f2ff', '#e8fff2', '#f5f8ff'][Math.floor(R() * 3)];
    g.add(new THREE.Mesh(new THREE.LatheGeometry(V(pts), 72), clear(tint, 0.12, 0.002)));
    const cc = ['#1d4ed8', '#f1f5f9', '#16a34a', '#dc2626'][Math.floor(R() * 4)];
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0152, 0.0152, 0.017, 40), new THREE.MeshPhysicalMaterial({ color: cc, roughness: 0.4, clearcoat: 0.4 })); cap.position.y = 0.217; g.add(cap);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0148, 0.0018, 8, 40), new THREE.MeshStandardMaterial({ color: cc, roughness: 0.5 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.205; g.add(ring);
    if (kind === 'labeled') { const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.0336, 0.0336, 0.052, 64, 1, true), new THREE.MeshStandardMaterial({ map: paperLabel(), roughness: 0.65 })); lb.position.y = 0.1; g.add(lb); }
  } else {
    // 유리병: 두꺼운 유리(굴절 · 흡수 색) + 병목 테
    const prof = V([[0, 0.004], [0.024, 0], [0.03, 0.006], [0.031, 0.02], [0.031, 0.14], [0.026, 0.165], [0.014, 0.19], [0.0125, 0.222], [0.015, 0.226], [0.015, 0.232], [0.0105, 0.232], [0.0105, 0.19], [0.026, 0.14], [0.027, 0.02], [0, 0.012]]);
    const col = kind === 'colorglass' ? '#2563eb' : ['#2f7d4f', '#7a4a1e', '#dfeee4'][Math.floor(R() * 3)];
    const m = clear(col, 0.02, 0.03); m.attenuationColor = new THREE.Color(col); m.attenuationDistance = kind === 'colorglass' ? 0.04 : col === '#dfeee4' ? 0.6 : 0.05;
    g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 72), m));
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

// 물건 한 개 사진: 어두운 스튜디오(앱 화면 결) + 위 부드러운 빛 + 뒤 가장자리 빛, 물건 크기에 맞춰 자동 구도
export function itemShot(kind: Kind, v: number, W = 480) {
  const H = W, { renderer, scene } = stage(W, H, '#0c1016');
  renderer.toneMappingExposure = 0.95; scene.fog = new THREE.Fog('#0c1016', 0.5, 1.6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshPhysicalMaterial({ color: '#141a24', roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.35 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const key = new THREE.SpotLight('#ffffff', 4, 3, 0.45, 0.85, 1.4); key.position.set(0.25, 0.9, 0.45); key.target.position.set(0, 0.08, 0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 8; key.shadow.bias = -0.0004; scene.add(key, key.target);
  const rim = new THREE.DirectionalLight('#9fd8ff', 1.6); rim.position.set(-0.6, 0.4, -0.8); scene.add(rim);
  scene.add(new THREE.HemisphereLight('#c7d2fe', '#0b0e14', 0.35));
  const it = makeItem(kind, v + 1), R = rng(v * 13 + 5);
  const lie = kind !== 'crushed' && R() < 0.35;
  if (lie) it.rotation.z = Math.PI / 2;
  it.rotation.y += R() * Math.PI * 2;
  const holder = new THREE.Group(); holder.add(it); scene.add(holder);
  const b = new THREE.Box3().setFromObject(holder), c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3());
  holder.position.set(-c.x, -b.min.y, -c.z);
  const r = Math.max(sz.x, sz.y, sz.z) * 0.62, dist = r / Math.tan((15 * Math.PI) / 180);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 10); cam.position.set(0, sz.y / 2 + dist * 0.42, dist * 0.92); cam.lookAt(0, sz.y / 2, 0);
  return finish(renderer, scene, cam, W, H, false);
}

// 라인 전경
// 옆에서 본 라인(수업 장면용, 물건 없이) — 물건은 같은 카메라로 따로 렌더한 스프라이트를 화면에서 움직인다
export const SIDE = { aspect: 0.5, pos: [0.7, 2.05, 5.6] as const, look: [0.7, 0.62, 0] as const, fov: 29 };
function sideCam(W: number, H: number) { const c = new THREE.PerspectiveCamera(SIDE.fov, W / H, 0.05, 40); c.position.set(...SIDE.pos); c.lookAt(...SIDE.look); c.updateMatrixWorld(); c.updateProjectionMatrix(); return c; }
declare global { interface Window { __meta?: unknown } }
export async function line(W: number, view: 'hero' | 'side' = 'hero') {
  const H = Math.round(W * (view === 'side' ? SIDE.aspect : 0.625)), { renderer, scene } = stage(W, H, '#0b0f16');
  scene.fog = new THREE.Fog('#0b0f16', 4.5, 10); renderer.toneMappingExposure = 1.0;
  (scene as THREE.Scene & { environmentIntensity: number }).environmentIntensity = 0.35;
  const mat = (color: string, rough = 0.6, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), mat('#1c222c', 0.32, 0.1)); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 8), mat('#151a22', 0.8)); wall.position.set(0, 4, -2.2); scene.add(wall);
  // 바닥 안전선
  for (const z of [-0.75, 0.75]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.06), mat('#f5c542', 0.5)); s.rotation.x = -Math.PI / 2; s.position.set(0, 0.002, z); scene.add(s); }
  // 컨베이어: 프레임 + 검은 벨트 + 롤러 + 다리
  const L = 5.2, y = 0.82, bw = 0.5; // 벨트 x: -2.6 ~ 2.6
  const belt = new THREE.Mesh(new THREE.BoxGeometry(L, 0.04, bw), mat('#1f2328', 0.85)); belt.position.set(0, y, 0); belt.receiveShadow = true; belt.castShadow = true; scene.add(belt);
  for (const z of [-bw / 2 - 0.03, bw / 2 + 0.03]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(L + 0.1, 0.09, 0.05), mat('#5d6773', 0.3, 0.8)); rail.position.set(0, y + 0.01, z); rail.castShadow = true; scene.add(rail); }
  for (let i = 0; i < 7; i++) for (const z of [-bw / 2, bw / 2]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, y, 0.05), mat('#3d4550', 0.35, 0.7)); leg.position.set(-L / 2 + 0.2 + i * ((L - 0.4) / 6), y / 2, z); leg.castShadow = true; scene.add(leg); }
  // 센서 게이트: 아치 + 청록 빛 띠
  const gx = -0.6;
  for (const z of [-0.38, 0.38]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.08), mat('#2a313c', 0.35, 0.4)); p.position.set(gx, y + 0.27, z); p.castShadow = true; scene.add(p); }
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.84), mat('#2a313c', 0.35, 0.4)); top.position.set(gx, y + 0.58, 0); top.castShadow = true; scene.add(top);
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.6), new THREE.MeshBasicMaterial({ color: '#2fbf8a', toneMapped: false })); glow.position.set(gx, y + 0.52, 0); scene.add(glow);
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.48), new THREE.MeshBasicMaterial({ color: '#2fbf8a', transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false })); beam.rotation.y = Math.PI / 2; beam.position.set(gx, y + 0.27, 0); scene.add(beam);
  // 분류 통 3개(캔 · 페트 · 유리) — 라인 끝에 나란히, 통마다 색 띠
  const bins: [string, number][] = [['#9aa4ae', -0.62], ['#3b82f6', 0], ['#2f7d4f', 0.62]];
  for (const [c, z] of bins) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.5), mat('#262d37', 0.5, 0.3)); b.position.set(3.05, 0.31, z); b.castShadow = true; b.receiveShadow = true; scene.add(b);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.505, 0.07, 0.505), new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, emissive: c, emissiveIntensity: 0.25 })); band.position.set(3.05, 0.5, z); scene.add(band);
  }
  const chute = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.62), mat('#5d6773', 0.3, 0.8)); chute.position.set(2.8, 0.72, 0); chute.rotation.z = -0.35; scene.add(chute);
  // 로봇 팔: 벨트 뒤 받침 기둥 위, 팔이 벨트 쪽으로 숙여 물건을 집으려는 자세
  const arm = new THREE.Group(), am = mat('#e8ebef', 0.35, 0.1), jm = mat('#2b3138', 0.4, 0.4);
  const ped = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.78, 0.34), mat('#262d37', 0.5, 0.3)); ped.position.y = 0.39; arm.add(ped);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.1, 40), jm); base.position.y = 0.83; arm.add(base);
  const sh = new THREE.Group(); sh.position.y = 0.88; arm.add(sh); sh.rotation.y = -Math.PI / 2 + 0.25;
  const tur = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.13, 40), am); tur.position.y = 0.065; sh.add(tur);
  const up = new THREE.Group(); up.position.y = 0.13; sh.add(up); up.rotation.z = -0.35;
  const ua = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.5, 0.09), am); ua.position.y = 0.25; up.add(ua);
  const el = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.13, 32), jm); el.rotation.x = Math.PI / 2; el.position.y = 0.5; up.add(el);
  const fo = new THREE.Group(); fo.position.y = 0.5; up.add(fo); fo.rotation.z = -1.95;
  const fa = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.42, 0.07), am); fa.position.y = 0.21; fo.add(fa);
  const wr = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.07, 32), jm); wr.position.y = 0.44; fo.add(wr);
  for (const sgn of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.08, 0.045), jm); f.position.set(sgn * 0.03, 0.51, 0); fo.add(f); }
  const led = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.006, 8, 48), new THREE.MeshBasicMaterial({ color: '#2fbf8a', toneMapped: false })); led.rotation.x = Math.PI / 2; led.position.y = 0.95; arm.add(led);
  arm.position.set(1.15, 0, -0.62); arm.traverse((c) => { const me = c as THREE.Mesh; if (me.isMesh) me.castShadow = true; }); scene.add(arm);
  // 벨트 위 물건(무작위 종류 · 위치 · 눕힘)
  const R = rng(7), kinds: Kind[] = view === 'side' ? [] : ['can', 'pet', 'glass', 'can', 'pet', 'glass', 'crushed', 'labeled', 'colorglass', 'pet', 'can', 'glass'];
  kinds.forEach((k, i) => {
    const it = makeItem(k, i + 3), x = -2.3 + i * 0.36 + (R() - 0.5) * 0.08, lie = k !== 'crushed' && R() < 0.4;
    if (lie) { it.rotation.z = Math.PI / 2; it.position.y = 0.033; }
    const holder = new THREE.Group(); holder.add(it); holder.position.set(x, y + 0.02, (R() - 0.5) * 0.24); holder.rotation.y = R() * Math.PI * 2; scene.add(holder);
  });
  // 빛: 천장 창 느낌의 큰 면광 + 방향광 그림자
  scene.add(new THREE.HemisphereLight('#9fb4d8', '#0b0f16', 0.35));
  // 라인 위 작업등 3개 + 벽 청록 띠 조명 + 센서 게이트 빛
  for (const x of [-1.6, 0.4, 2.4]) { const l = new THREE.SpotLight('#fff1dd', 16, 6, 0.6, 0.6, 1.4); l.position.set(x, 3.2, 0.3); l.target.position.set(x, 0.8, 0); l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.0004; scene.add(l, l.target);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.06, 32), new THREE.MeshBasicMaterial({ color: '#fff4e2', toneMapped: false })); lamp.position.set(x, 3.25, 0.3); scene.add(lamp); }
  const strip = new THREE.Mesh(new THREE.BoxGeometry(14, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: '#2dd4bf', toneMapped: false })); strip.position.set(0, 1.6, -2.18); scene.add(strip);
  const gl = new THREE.PointLight('#2fbf8a', 2.2, 1.6, 2); gl.position.set(-0.6, 1.25, 0); scene.add(gl);
  const sun = new THREE.DirectionalLight('#c7d2fe', 0.5); sun.position.set(-1.5, 4, 2.5); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.radius = 5; sun.shadow.bias = -0.0003;
  const s2 = sun.shadow.camera; s2.left = -4; s2.right = 4; s2.top = 3; s2.bottom = -3; scene.add(sun);
  let cam = new THREE.PerspectiveCamera(34, W / H, 0.05, 30); cam.position.set(-2.5, 1.7, 2.75); cam.lookAt(0.75, 0.78, -0.1);
  if (view === 'side') {
    cam = sideCam(W, H);
    // 화면 좌표 기록: 벨트 윗면(z=0) x 별 위치, 센서 게이트, 통 위치(0~1 비율)
    const pr = (x: number, yy: number, z = 0) => { const v = new THREE.Vector3(x, yy, z).project(cam); return [+((v.x + 1) / 2).toFixed(4), +((1 - v.y) / 2).toFixed(4)]; };
    window.__meta = { belt: [-2.6, -1.3, 0, 1.3, 2.6].map((x) => [x, ...pr(x, y + 0.02)]), gate: pr(-0.6, y + 0.02), arm: pr(1.15, y + 0.02), bins: [-0.62, 0, 0.62].map((z) => pr(3.05, 0.62, z)), w: W, h: H };
  }
  return finish(renderer, scene, cam, W, H);
}
// 물건 스프라이트: 수업 장면 카메라와 같은 각도 · 빛, 투명 배경. 물건은 x=0 벨트 위(z=0). zoom>1 = 이름표 붙이기 · 슬라이드용 큰 그림
export function sprite(kind: Kind, v: number, W: number, lie: boolean, zoom = 1) {
  const H = Math.round(W * SIDE.aspect);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
  renderer.setSize(W, H); renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.setClearColor(0x000000, 0);
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.02).texture;
  (scene as THREE.Scene & { environmentIntensity: number }).environmentIntensity = 0.45;
  scene.add(new THREE.HemisphereLight('#9fb4d8', '#0b0f16', 0.5));
  const l = new THREE.SpotLight('#fff1dd', 16, 6, 0.6, 0.6, 1.4); l.position.set(0.3, 3.2, 0.3); l.target.position.set(0, 0.8, 0); scene.add(l, l.target);
  const rim = new THREE.DirectionalLight('#9fd8ff', 0.8); rim.position.set(-1, 1.5, -2); scene.add(rim);
  const it = makeItem(kind, v + 1); if (lie) { it.rotation.z = Math.PI / 2; it.position.y = 0.033; }
  const R = rng(v * 31 + 9); it.rotation.y = R() * Math.PI * 2;
  const holder = new THREE.Group(); holder.add(it); holder.scale.setScalar(1.8 * zoom); holder.position.set(0.25, 0.84, 0); scene.add(holder); // 수업 장면에서 잘 보이도록 1.8배(zoom = 크게 보여 줄 때 고해상도용)
  const cam = sideCam(W, H);
  const v0 = new THREE.Vector3(0.25, 0.84, 0).project(cam);
  window.__meta = { anchor: [(v0.x + 1) / 2 * W, (1 - v0.y) / 2 * H], w: W, h: H };
  renderer.render(scene, cam);
  return renderer.domElement.toDataURL('image/png');
}

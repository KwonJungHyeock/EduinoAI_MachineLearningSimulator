# author: eduino
# 렌더한 장면 PNG → WebP (public/vision), 평소 vs 사건 픽셀 차이로 '변화량 지도'(격자) · 변화 영역 계산 → src/data/visionScenes.json
import json, re, sys
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter

SRC = Path(sys.argv[1]); ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/vision'; OUT.mkdir(parents=True, exist_ok=True)
GW, GH = 32, 20  # 변화량 격자 (AI가 보는 숫자)
meta = re.findall(r"id: '(cam\d+)', name: '([^']+)', situation: '([^']+)',\s*detail: '([^']+)'", (ROOT / 'tools/scene-render/scenes.ts').read_text(encoding='utf-8'))
scenes = []
for sid, name, situation, detail in meta:
    a = Image.open(SRC / f'{sid}-base.png').convert('RGB'); b = Image.open(SRC / f'{sid}-event.png').convert('RGB')
    for v, im in (('base', a), ('event', b)): im.save(OUT / f'{sid}-{v}.webp', 'WEBP', quality=80, method=6)
    a.resize((320, 200), Image.LANCZOS).save(OUT / f'{sid}-base-s.webp', 'WEBP', quality=72)
    b.resize((320, 200), Image.LANCZOS).save(OUT / f'{sid}-event-s.webp', 'WEBP', quality=72)
    d = ImageChops.difference(a, b).convert('L').filter(ImageFilter.MaxFilter(3))
    w, h = d.size; px = d.load()
    grid = []
    for gy in range(GH):
        for gx in range(GW):
            x0, x1, y0, y1 = gx * w // GW, (gx + 1) * w // GW, gy * h // GH, (gy + 1) * h // GH
            s = sum(px[x, y] for y in range(y0, y1, 2) for x in range(x0, x1, 2)); n = ((y1 - y0 + 1) // 2) * ((x1 - x0 + 1) // 2)
            grid.append(min(100, round(s / n / 255 * 100 * 4)))  # 0~100, 4배 강조
    bb = d.point(lambda v: 255 if v > 24 else 0).getbbox()
    box = [round(bb[0] / w, 4), round(bb[1] / h, 4), round(bb[2] / w, 4), round(bb[3] / h, 4)] if bb else None
    scenes.append({'id': sid, 'name': name, 'situation': situation, 'detail': detail, 'box': box, 'grid': grid})
    print(sid, name, 'box', box, 'max', max(grid))
(ROOT / 'src/data/visionScenes.json').write_text(json.dumps({'_note': '자동 생성(tools/scene-render/pack.py). 변화량 = 평소 장면과 사건 장면의 픽셀 차이를 32×20 격자로 평균(0~100).', 'gw': GW, 'gh': GH, 'scenes': scenes}, ensure_ascii=False), encoding='utf-8')

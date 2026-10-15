# author: eduino
# 데이터셋 묶기: 렌더한 거리 장면(낮 200 · 밤 80) → 학습용 조각(20×20 밝기, car · person · empty) + 탐지용 장면 이미지 · 상자
# 출력: public/vision/ds/crops.json, public/vision/ds/scenes.json, public/vision/ds/{day,night}-NNN.webp
import json, base64, io, random, sys
from pathlib import Path
from PIL import Image
SRC = Path(sys.argv[1]); ROOT = Path(__file__).resolve().parents[2]; OUT = ROOT / 'public/vision/ds'; OUT.mkdir(parents=True, exist_ok=True)
S = 20; random.seed(3)
def crop(im, cx, cy, side):
    x0, y0 = cx - side / 2, cy - side / 2
    return im.crop((round(x0), round(y0), round(x0 + side), round(y0 + side))).resize((S, S), Image.BOX)
def iou(a, b):
    ix = max(0, min(a[2], b[2]) - max(a[0], b[0])); iy = max(0, min(a[3], b[3]) - max(a[1], b[1])); i = ix * iy
    return i / ((a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - i + 1e-9)
crops = {'size': S, 'classes': ['car', 'person', 'empty'], 'sets': {}}
scenes = {'w': 256, 'h': 160, 'day': [], 'night': []}
for tod in ('day', 'night'):
    d = json.loads((SRC / f'{tod}.json').read_text())
    W, H = d['w'], d['h']
    for k, it in enumerate(d['items']):
        im = Image.open(io.BytesIO(base64.b64decode(it['png'].split(',')[1]))).convert('RGB')
        im.save(OUT / f'{tod}-{k:03d}.webp', 'WEBP', quality=82)
        g = im.convert('L')
        boxes = [[o['box'][0] * W, o['box'][1] * H, o['box'][2] * W, o['box'][3] * H] for o in it['objs']]
        scenes[tod].append({'i': k, 'objs': it['objs']})
        split = ('train' if k < 160 else 'test') if tod == 'day' else ('train' if k < 50 else 'test')
        key = f'{tod}-{split}'; st = crops['sets'].setdefault(key, {'x': [], 'y': []})
        for o, b in zip(it['objs'], boxes):
            w, h = b[2] - b[0], b[3] - b[1]
            if w < 4 or h < 6 or b[0] <= 0 or b[2] >= W or b[1] <= 0: continue  # 화면 밖으로 잘린 물체 제외
            for j in range(2 if split == 'train' else 1):  # 학습용은 조금 밀린 조각 하나 더(데이터 늘리기)
                dx, dy = (random.uniform(-0.12, 0.12) * w, random.uniform(-0.12, 0.12) * h) if j else (0, 0)
                side = max(w, h) * random.uniform(1.15, 1.35)
                st['x'].append(base64.b64encode(crop(g, (b[0] + b[2]) / 2 + dx, (b[1] + b[3]) / 2 + dy, side).tobytes()).decode())
                st['y'].append(0 if o['cls'] == 'car' else 1)
        n_empty = 3 if split == 'train' else 2
        tries = 0
        while n_empty and tries < 200:
            tries += 1; side = random.uniform(14, 44); cx = random.uniform(side / 2, W - side / 2); cy = random.uniform(40 + side / 2, H - side / 2)
            wb = [cx - side / 2, cy - side / 2, cx + side / 2, cy + side / 2]
            if any(iou(wb, b) > 0.05 or (b[0] < cx < b[2] and b[1] < cy < b[3]) for b in boxes): continue
            st['x'].append(base64.b64encode(crop(g, cx, cy, side).tobytes()).decode()); st['y'].append(2); n_empty -= 1
for k, v in crops['sets'].items(): print(k, len(v['y']), [v['y'].count(c) for c in range(3)])
(OUT / 'crops.json').write_text(json.dumps(crops, separators=(',', ':')))
(OUT / 'scenes.json').write_text(json.dumps(scenes, separators=(',', ':')))
print('crops', (OUT / 'crops.json').stat().st_size // 1024, 'KB · scenes', sum(1 for _ in OUT.glob('*.webp')), 'webp', sum(f.stat().st_size for f in OUT.glob('*.webp')) // 1024, 'KB')

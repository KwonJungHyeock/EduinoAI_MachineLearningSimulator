# author: eduino
# 2차시용: 장면 이미지 → 64×40 밝기 격자(0~255). 화면 · node 점검이 같은 숫자를 씀 → public/vision/grids.json
import json
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[2]; V = ROOT / 'public/vision'
meta = json.loads((ROOT / 'src/data/visionScenes.json').read_text(encoding='utf-8'))
GW, GH = 64, 40
out = {'gw': GW, 'gh': GH, 'scenes': []}
for s in meta['scenes']:
    row = {'id': s['id'], 'name': s['name']}
    for v in ('base', 'event'):
        im = Image.open(V / f"{s['id']}-{v}.webp").convert('L').resize((GW, GH), Image.BOX)
        row[v] = list(im.getdata())
    out['scenes'].append(row)
(V / 'grids.json').write_text(json.dumps(out, separators=(',', ':')), encoding='utf-8')
print('ok', (V / 'grids.json').stat().st_size // 1024, 'KB')

# 3차시 이후용: 사건 장면 128×80 밝기(바이트 → base64) + 변화 영역 상자
import base64
HW, HH = 128, 80
hi = {'w': HW, 'h': HH, 'scenes': []}
for s in meta['scenes']:
    for v in ('event', 'base'):
        pass
    im = Image.open(V / f"{s['id']}-event.webp").convert('L').resize((HW, HH), Image.BOX)
    hi['scenes'].append({'id': s['id'], 'name': s['name'], 'box': s['box'], 'data': base64.b64encode(im.tobytes()).decode()})
(V / 'hires.json').write_text(json.dumps(hi, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('hires', (V / 'hires.json').stat().st_size // 1024, 'KB')

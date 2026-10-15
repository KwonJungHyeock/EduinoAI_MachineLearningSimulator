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

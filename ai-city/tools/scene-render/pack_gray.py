# author: eduino
# 탐지용 흑백 장면(무손실 PNG): 낮 학습 장면 0~39(헛탐지 모으기) · 낮 시험 장면 160~199 · 밤 시험 장면 50~79 → public/vision/ds/g/{day,night}-NNN.png
# 화면(캔버스로 읽음)과 점검(tools/png.ts 로 읽음)이 같은 픽셀을 쓴다.
import json, base64, io, sys
from pathlib import Path
from PIL import Image
SRC = Path(sys.argv[1]); OUT = Path(__file__).resolve().parents[2] / 'public/vision/ds/g'; OUT.mkdir(parents=True, exist_ok=True)
for tod, rng in (('day', [*range(0, 40), *range(160, 200)]), ('night', range(50, 80))):
    d = json.loads((SRC / f'{tod}.json').read_text())
    for k in rng:
        im = Image.open(io.BytesIO(base64.b64decode(d['items'][k]['png'].split(',')[1]))).convert('L')
        im.save(OUT / f'{tod}-{k:03d}.png', optimize=True)
print(sum(f.stat().st_size for f in OUT.glob('*.png')) // 1024, 'KB')

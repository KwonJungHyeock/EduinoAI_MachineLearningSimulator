# author: eduino
# Foundation Lab 장면 묶기: 옆에서 본 라인 배경(물건 없음) + 물건 스프라이트(투명 배경, 알파 경계로 자르고 '벨트 닿는 점' 기준 위치 기록)
# 입력: 렌더 폴더(bg.png · {kind}{v}.png · meta_last.json) → public/found/line.webp · sprites/*.webp · scene.json
import json, sys
from pathlib import Path
from PIL import Image
SRC = Path(sys.argv[1]); OUT = Path(__file__).resolve().parents[2] / 'public/found'; (OUT / 'sprites').mkdir(parents=True, exist_ok=True)
meta = json.loads((SRC / 'meta_last.json').read_text())
bg = Image.open(SRC / 'bg.png').convert('RGB'); W, H = bg.size
top, bot = int(H * 0.04), int(H * 0.86)                         # 아래 빈 바닥을 잘라 16:8.2 정도로
bg.crop((0, top, W, bot)).save(OUT / 'line.webp', 'WEBP', quality=86)
h2 = bot - top
m = meta['bg.png']; fix = lambda p: [p[0], round((p[1] * H - top) / h2, 4)]
scene = {'w': W, 'h': h2, 'belt': [[b[0], *fix(b[1:])] for b in m['belt']], 'gate': fix(m['gate']), 'arm': fix(m['arm']), 'bins': [fix(b) for b in m['bins']], 'sprites': {}}
for f, mm in meta.items():
    if f == 'bg.png': continue
    im = Image.open(SRC / f).convert('RGBA'); bb = im.getbbox(); c = im.crop(bb); name = f.replace('.png', '')
    c.save(OUT / 'sprites' / f'{name}.webp', 'WEBP', quality=88)
    ax, ay = mm['anchor']
    # 화면 비율로: 스프라이트 크기(배경 폭 기준) · 닿는 점에서 왼쪽 위까지의 거리
    scene['sprites'][name] = {'w': round(c.width / W, 4), 'h': round(c.height / h2, 4), 'dx': round((bb[0] - ax) / W, 4), 'dy': round((bb[1] - ay) / h2, 4)}
(OUT / 'scene.json').write_text(json.dumps(scene, separators=(',', ':')))
print('ok', len(scene['sprites']), 'sprites', sum(p.stat().st_size for p in OUT.rglob('*.webp')) // 1024, 'KB')

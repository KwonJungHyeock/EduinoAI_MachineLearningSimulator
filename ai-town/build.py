#!/usr/bin/env python3
# author: eduino
# 데이터(JSON)를 페이지에 끼워 index.html 을 만든다. 화면 로직은 넣지 않는다.
# file:// 에서는 fetch 가 막히므로 데이터를 페이지에 직접 넣어, 더블클릭으로 열어도 뜨게 한다.

import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
TPL = ROOT / "tpl.html"
OUT = ROOT / "index.html"
DATA_DIR = ROOT / "data"
MARKER = "/*__TOWN_DATA__*/"


def load_data():
    """data/*.json 을 모두 읽어 파일명(확장자 제외)을 키로 묶는다."""
    bundle = {}
    for path in sorted(DATA_DIR.glob("*.json")):
        with path.open(encoding="utf-8") as f:
            bundle[path.stem] = json.load(f)  # 깨진 JSON 이면 여기서 멈춘다(의도)
    return bundle


def main():
    tpl = TPL.read_text(encoding="utf-8")
    if MARKER not in tpl:
        raise SystemExit("tpl.html 에 데이터 자리(%s) 가 없습니다." % MARKER)

    bundle = load_data()
    # ensure_ascii=False 로 한글을 그대로 둔다. </script> 깨짐 방지로 분리 표기.
    payload = json.dumps(bundle, ensure_ascii=False).replace("</", "<\\/")
    inject = "window.__TOWN__ = " + payload + ";"

    html = tpl.replace(MARKER, inject)
    OUT.write_text(html, encoding="utf-8")

    keys = ", ".join(bundle.keys()) or "(없음)"
    print("생성: %s" % OUT.name)
    print("넣은 데이터: %s" % keys)
    print("더블클릭(file://) 으로 열어도 지도와 이름표가 떠야 합니다.")


if __name__ == "__main__":
    main()

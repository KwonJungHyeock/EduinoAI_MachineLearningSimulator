#!/bin/sh
# author: eduino — 장면 렌더용 Kenney 모델(CC0) 받기. 받은 파일은 실행하지 않고 압축만 풀어 GLB · 텍스처만 복사.
set -e
OUT="$(dirname "$0")/public/models"; TMP="$(mktemp -d)"
get() { curl -sL -o "$TMP/$1.zip" "$2"; mkdir -p "$TMP/$1" && python3 -c "import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "$TMP/$1.zip" "$TMP/$1"
  mkdir -p "$OUT/$1/Textures"; cp "$TMP/$1/Models/GLB format/"*.glb "$OUT/$1/"; cp "$TMP/$1/Models/GLB format/Textures/"* "$OUT/$1/Textures/"; }
get city-kit-roads https://kenney.nl/media/pages/assets/city-kit-roads/74288c9459-1791628607/kenney_city-kit-roads.zip
get commercial https://kenney.nl/media/pages/assets/city-kit-commercial/a742d900eb-1753115042/kenney_city-kit-commercial_2.1.zip
get suburban https://kenney.nl/media/pages/assets/city-kit-suburban/2c871b7af2-1745479373/kenney_city-kit-suburban_20.zip
get car-kit https://kenney.nl/media/pages/assets/car-kit/1a312ec241-1775131960/kenney_car-kit.zip
get characters https://kenney.nl/media/pages/assets/mini-characters/bfc7e272b4-1774770718/kenney_mini-characters.zip
rm -rf "$TMP"; echo "done: $OUT"

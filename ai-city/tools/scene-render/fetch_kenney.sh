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

# 사람: Quaternius Ultimate Modular Men / Women (CC0) — Google Drive 공개 폴더의 glTF
OUTP="$(dirname "$0")/public/models/people"; mkdir -p "$OUTP"
q() { curl -sL -o "$OUTP/$2.gltf" "https://drive.usercontent.google.com/download?id=$1&export=download&confirm=t"; }
q 1Jn7kULNmrtqP8BUUL19h8MhbdOnwPFhv m-casual-2; q 1em1So1xwwQNfHJYMvzKcXkZllvtxpKP5 m-casual-hoodie; q 1NhXHnGU0zK9hBrT5FoZp8nTz_EmvTPg5 m-suit
q 14d8n7IDnnlnGt_uiATnNg3uvi_4dyd9V m-worker; q 1fzSq1Rr037f7QkfXPWEAzmbLMNx-FpPA m-adventurer; q 1yHWu5ezXq4dYBcn4sWiNd16YN9fMtXo0 m-punk
q 18b3WwlrwrFYWAM7BcnjWeIxKJyxAQiGh f-casual; q 1iayBzVv_zLjuPtaNPouw_auwKlQLLmes f-formal; q 1GjWtofxjmPku25cXJxHrzLLeUbXw7A_s f-suit
q 1iwF_fqDErPH9uyol6NmS-MnzGgsZ5ejV f-worker; q 1uxAFnDp73NO1c16LvHHjAYh1-deMNk5I f-adventurer
echo "people done: $OUTP"

# 가구(관제실 장면): Kenney Furniture Kit (CC0) — GLB 는 'Models/GLTF format/' 안에 있음
F="$(dirname "$0")/public/models/furniture"; mkdir -p "$F"; T2="$(mktemp -d)"
curl -sL -o "$T2/f.zip" https://kenney.nl/media/pages/assets/furniture-kit/440e0608a4-1677580847/kenney_furniture-kit.zip
python3 -c "import zipfile,sys,os; z=zipfile.ZipFile(sys.argv[1]); [open(os.path.join(sys.argv[2], n.split('/')[-1]),'wb').write(z.read(n)) for n in z.namelist() if n.startswith('Models/GLTF format/') and n.endswith('.glb')]" "$T2/f.zip" "$F"
rm -rf "$T2"; echo "furniture done: $F"

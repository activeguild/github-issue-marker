#!/usr/bin/env bash
# Chrome ウェブストアへ提出する zip を作る。
# 拡張機能の実行に必要なファイルだけを明示的に並べる（許可リスト方式）。
# `zip -r .` にすると .git/ や docs/ まで巻き込むため、ここは増やさない限り追加されない。
set -euo pipefail

cd "$(dirname "$0")/.."

FILES=(
  manifest.json
  background.js
  content.js
  content.css
  popup.html
  popup.js
  popup.css
  _locales/ja/messages.json
  _locales/en/messages.json
  icons/icon16.png
  icons/icon32.png
  icons/icon48.png
  icons/icon128.png
)

VERSION="$(python3 -c 'import json;print(json.load(open("manifest.json"))["version"])')"
OUT="dist/github-issue-read-marker-${VERSION}.zip"

for f in "${FILES[@]}"; do
  [ -f "$f" ] || { echo "見つかりません: $f" >&2; exit 1; }
done

mkdir -p dist
rm -f "$OUT"
zip -q -X "$OUT" "${FILES[@]}"

echo "$OUT"
unzip -l "$OUT"

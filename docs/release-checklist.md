# 公開チェックリスト

Chrome ウェブストアへ提出するまでの手順です。掲載文は [store-listing.ja.md](store-listing.ja.md) /
[store-listing.en.md](store-listing.en.md) にまとめてあります。

## 1. リポジトリ側（完了済み）

- [x] `icons/` にアイコン（16 / 32 / 48 / 128 px、原本は `icon.svg`）
- [x] `manifest.json` に `icons` と `action`（ツールバーのポップアップ）を追加
- [x] `popup.html` / `popup.js` / `popup.css`
- [x] `README.md`（日本語）・`README.en.md`（英語）
- [x] `LICENSE`（MIT）
- [x] `PRIVACY.md`（日英併記。これがストアに登録するプライバシーポリシー URL になります）
- [x] `_locales/ja` `_locales/en`（ストアの名前・概要を日英で出し分ける）
- [x] `.gitignore`
- [x] `scripts/package.sh`（提出用 zip を作る）

## 2. 動作確認（手元で実施）

`chrome://extensions` →「パッケージ化されていない拡張機能を読み込む」でこのフォルダーを読み込み、
GitHub の適当な Issue ページで確認します。

- [ ] 段落にマウスを乗せるとツールバーが出て、✓ / × が付く・外れる
- [ ] メモを書いて保存され、リロード後も残っている
- [ ] ツールバーアイコン（新規）のポップアップが開き、2 つのボタンが動く
- [ ] 右クリックメニューの 2 項目が従来どおり動く
- [ ] 返信コメント作成パネルの［コピー］と［コメント欄に挿入］が動く
- [ ] Issue 間をページ遷移しても、それぞれのマークが正しく復元される
- [ ] ダークテーマでもポップアップの表示が崩れない
- [ ] Issue 以外の GitHub ページでポップアップのボタンを押すと、案内メッセージが出る

## 3. スクリーンショット（最低 1 枚、最大 5 枚）

**サイズは 1280×800 px**（または 640×400 px）。PNG または JPEG。

**撮影用のサンプル Issue を用意してあります**:
<https://github.com/activeguild/github-issue-marker/issues/1>
段落・リスト・見出し・コードブロック・表・折りたたみがひと通り入っているので、
対応ブロックを一画面で見せられます。撮り終えたらクローズして構いません。

### ちょうど 1280×800 で撮る方法（おすすめ）

Chrome の DevTools を使うと、OS のウィンドウ枠が入らない正確なサイズで撮れます。

1. 対象ページで DevTools を開く（`⌥⌘I`）
2. デバイスツールバーを開く（`⇧⌘M`）
3. 上部のプルダウンを **Responsive** にして、サイズに `1280` × `800` を入力
4. DevTools 右上の `⋮` →「Capture screenshot」

デスクトップのスクリーンショットから作る場合は、**リサイズではなく切り抜き**を使います。
`sips -z` はアスペクト比を無視して引き伸ばすため歪みます。

```sh
sips -Z 1280 shot.png --out tmp.png   # 長辺 1280 に比率を保って縮小
sips -c 800 1280 tmp.png --out shot-1280x800.png   # 中央を 800x1280(高さ x 幅)で切り抜き
```

撮っておきたい画面:

1. 段落にツールバーが出ていて、✓ と × とメモが混在している状態（これを 1 枚目に）
2. メモ編集ポップアップを開いた状態
3. 返信コメント作成パネルに引用が集まっている状態
4. ツールバーアイコンのポップアップ

- [ ] 1280×800 のスクリーンショットを 1〜5 枚用意した
- [ ] （任意）小プロモーションタイル 440×280 px — 無くても公開できますが、あると検索結果で優先されます

## 4. 提出

- [ ] [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole) で開発者登録（初回のみ $5・2 段階認証が必要）
- [ ] `./scripts/package.sh` で zip を作る
- [ ] 新しいアイテムとして zip をアップロード
- [ ] 「ストアの掲載情報」タブに store-listing.ja.md の内容を貼る（スクリーンショットもここ）
- [ ] 掲載情報タブで英語を追加し、store-listing.en.md の「詳細な説明」を貼る（名前と概要は `_locales/en` から自動で切り替わります）
- [ ] 「プライバシー」タブに単一用途の説明・権限の理由・データ使用の申告を入力
- [ ] プライバシーポリシー URL に `https://github.com/activeguild/github-issue-marker/blob/main/PRIVACY.md` を入力
- [ ] 「配信」タブで公開範囲（公開／限定公開）と対象国を設定
- [ ] 審査に提出 — 通常は数日、長いと 2〜3 週間かかることがあります

## 5. 公開後

- [ ] `README.md` / `README.en.md` の「Chrome ウェブストアから」にストアの URL を追記
- [ ] GitHub にリリースタグを打つ（`git tag v1.3.0 && git push --tags`）

## 更新するとき

1. `manifest.json` の `version` を上げる
2. `./scripts/package.sh`
3. ダッシュボードで新しいパッケージをアップロードして再提出

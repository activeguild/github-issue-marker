# プライバシーポリシー / Privacy Policy

**GitHub Issue Read Marker**

最終更新日 / Last updated: 2026-11-02

---

## 日本語

### 収集する情報

本拡張機能は、**いかなる個人情報も収集・送信しません。**

本拡張機能が保存するのは、利用者が自分で付けた以下の情報のみです。

- Issue / Pull Request のページ上で ✓ / × のマークを付けた箇所の位置（段落を識別するためのハッシュ値）
- 利用者が入力したメモの本文
- 対象となるページのパス（例: `/owner/repo/issues/123`、`/owner/repo/pull/45`）
- 「保存したページの一覧」に表示するための、そのページのタイトル・段落の数・最終更新日時

### 保存場所

上記の情報はすべて、Chrome の `chrome.storage.local` API により**利用者のブラウザー内にのみ**保存されます。
開発者を含む第三者がこの情報を閲覧することはできません。

一覧画面の「書き出し」を使うと、上記の情報を JSON ファイルとして利用者の端末に保存します。
このファイルは利用者自身が管理するもので、本拡張機能がどこかへ送信することはありません。

### 外部送信

本拡張機能は外部サーバーとの通信を一切行いません。
ネットワーク通信を行うコード（`fetch` / `XMLHttpRequest` など）はソースコードに含まれていません。
ソースコードは [GitHub リポジトリ](https://github.com/activeguild/github-issue-marker)で誰でも確認できます。

### 第三者提供

収集する情報がないため、第三者への提供・販売・共有は一切ありません。
広告目的での利用、および人間による閲覧もありません。

### 権限の利用目的

| 権限 | 用途 |
| --- | --- |
| `storage` | マークとメモをブラウザー内に保存するため |
| `contextMenus` | 右クリックメニューに操作項目を追加するため |
| `clipboardWrite` | 作成した返信コメントをクリップボードへコピーするため |
| `https://github.com/*` | GitHub の Issue / Pull Request ページ上にツールバーとメモを表示するため |

### データの削除

保存したデータは、以下のいずれかの方法で削除できます。

- 右クリックメニューまたはツールバーアイコンから「このページのマークとメモを消去」を実行する
- 「保存したページの一覧」でページごと、または 90 日以上更新のないページをまとめて削除する
- Chrome の拡張機能管理画面から本拡張機能をアンインストールする（保存データもあわせて削除されます）

### 免責

本拡張機能は GitHub, Inc. とは一切関係のない非公式ツールです。

### お問い合わせ

ご質問・ご要望は [GitHub Issues](https://github.com/activeguild/github-issue-marker/issues) までお寄せください。

---

## English

### Information We Collect

This extension **does not collect or transmit any personal information.**

The only data it stores is what you create yourself:

- The location of the paragraphs you marked with ✓ / × on an issue or pull request page (a hash value used to identify a paragraph)
- The text of the notes you typed
- The path of the page in question (e.g. `/owner/repo/issues/123`, `/owner/repo/pull/45`)
- That page's title, paragraph count and last-updated time, shown in the "Saved pages" list

### Where It Is Stored

All of the above is stored **only inside your own browser** via Chrome's `chrome.storage.local` API.
Neither the developer nor any third party can read it.

The "Export" button on the saved-pages list writes the data above to a JSON file on your own device.
That file is yours to manage; the extension never sends it anywhere.

### Transmission

This extension never communicates with any external server.
No networking code (`fetch`, `XMLHttpRequest`, etc.) exists in the source, which anyone can verify in the
[GitHub repository](https://github.com/activeguild/github-issue-marker).

### Third Parties

Because no data is collected, nothing is sold, shared, or transferred to third parties.
The data is not used for advertising and is not read by any human.

### Why Each Permission Is Needed

| Permission | Purpose |
| --- | --- |
| `storage` | To save your marks and notes inside the browser |
| `contextMenus` | To add the extension's commands to the right-click menu |
| `clipboardWrite` | To copy the drafted reply comment to the clipboard |
| `https://github.com/*` | To display the toolbar and notes on GitHub issue and pull request pages |

### Deleting Your Data

You can remove the stored data at any time by either:

- Running "Clear all marks and notes on this page" from the right-click menu or the toolbar popup
- Deleting a page, or every page not updated for 90+ days, from the "Saved pages" list
- Uninstalling the extension from Chrome's extensions page (stored data is removed with it)

### Disclaimer

This is an unofficial tool and is not affiliated with, endorsed by, or sponsored by GitHub, Inc.

### Contact

Please open an issue at [GitHub Issues](https://github.com/activeguild/github-issue-marker/issues).

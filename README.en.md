# GitHub Issue Read Marker

<img src="icons/icon128.png" width="96" align="right" alt="">

A Chrome extension for reading long GitHub issues: mark any paragraph of the issue body or a comment
with **✓ / ×**, and attach private notes to it. Your marks are saved in the browser and restored the
next time you open the same issue.

English | [日本語](README.md)

---

## Features

### Mark and annotate individual paragraphs

Hover over a paragraph in the issue body or any comment and a **[✓] [×] [note]** toolbar appears on its left.

- **✓** — mark something you have read or verified
- **×** — mark something you want to push back on
- **note** — write a comment about that spot (visible only in your own browser)

Pressing the same button again removes the mark.

Paragraphs, list items, headings, code blocks, table rows and `<summary>` elements inside `.markdown-body`
can all be marked.

### Draft a reply from your notes and ×s

Choose **"Draft a reply from notes and ×"** from the right-click menu or the toolbar popup, and the
extension collects every marked spot as a Markdown blockquote (`>`) with your note underneath:

```markdown
> the original sentence that was quoted

your note goes here
```

- Checkboxes let you pick which to include: spots with notes / × spots / ✓ spots
- Quotes follow document order; lists keep their `-`, code blocks keep their fences, table rows are `|`-separated
- **Insert into comment box** drops the text straight into the new-comment field at the bottom of the page (undo works)
- **Copy** puts it on the clipboard instead

### Clear a page in one go

Choose **"Clear all marks and notes on this page"** from the right-click menu or the toolbar popup.
A dialog shows how many marks and notes will be removed before anything is deleted.

## Installation

### From the Chrome Web Store

> A link will be added here once the extension passes review.

### Load from source (for developers)

1. Clone this repository, or download and unpack the ZIP
2. Open `chrome://extensions` in Chrome
3. Turn on **Developer mode** in the top-right corner
4. Click **Load unpacked** and select this folder

## Privacy

**Nothing is ever sent anywhere.** Marks and notes live only in your own browser, stored via
`chrome.storage.local`. See [PRIVACY.md](PRIVACY.md) for details.

## Project layout

| File | Role |
| --- | --- |
| `manifest.json` | Extension definition (Manifest V3) |
| `content.js` | The main script running on GitHub issue pages: toolbar, notes, reply composer |
| `content.css` | Styling for the above; follows GitHub's Primer CSS variables |
| `background.js` | Registers the right-click menu and relays messages to `content.js` |
| `popup.html` / `popup.js` / `popup.css` | The toolbar icon popup |
| `_locales/` | Japanese and English name/summary for the store listing (the UI itself is Japanese only) |
| `icons/` | Extension icons (`icon.svg` is the source) |

There is no build step — plain JavaScript and CSS are loaded as-is.

### Building the distribution ZIP

```sh
./scripts/package.sh
```

This writes `dist/github-issue-read-marker-<version>.zip` containing only the files the extension needs
at runtime.

## Requirements

Any Manifest V3 browser — Chrome 88+, Edge, Brave and other Chromium-based browsers.

## License

[MIT](LICENSE)

## Disclaimer

This is an unofficial tool and is not affiliated with, endorsed by, or sponsored by GitHub, Inc.

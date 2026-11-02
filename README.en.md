# GitHub Issue Read Marker

<img src="icons/icon128.png" width="96" align="right" alt="">

A Chrome extension for reading long GitHub issues and pull requests: mark any paragraph of the
description or a comment with **✓ / ×**, and attach private notes to it. Your marks are saved in the
browser and restored the next time you open the same page.

It works on issue pages and on the **Conversation** tab of pull requests (not on Files changed and
the other PR tabs).

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

Choose **"Compose a reply from notes and ×"** from the right-click menu or the toolbar popup, and the
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

### See how much you have read

Once a page has at least one mark, a badge at the bottom left shows how many paragraphs carry a ✓ or ×,
out of all paragraphs on the page (e.g. `45 / 120 read (38%)`). The total grows as more comments load.
Click the badge to jump to the next paragraph that has neither mark.

### Keyboard shortcuts

| Action | Default key |
| --- | --- |
| Select the next paragraph | `Alt+Shift+J` (Mac: `⌥⇧J`) |
| Toggle ✓ on the selected paragraph | `Alt+Shift+C` |
| Toggle × on the selected paragraph | `Alt+Shift+X` |
| Write a note on the selected paragraph | `Alt+Shift+N` |
| Select the previous paragraph | not set |
| Jump to the next unread paragraph | not set |
| Compose a reply from notes and × | not set |

The selected paragraph gets a blue outline. The first press of a marking key only selects the first
paragraph on screen. Shortcuts do nothing while you are typing in a text field. Change or assign keys
at `chrome://extensions/shortcuts` (the toolbar popup has a link there and lists the current keys).

### Saved pages, export and import

**Saved pages** in the toolbar popup (also the extension's options page) lists every issue and pull
request you have marked, newest first, with its counts and progress. From there you can:

- open or delete a page
- delete pages that have not been updated for 90 days or more
- **export** everything to a JSON file and **import** it again, e.g. to move to another computer.
  Pages you already have are merged paragraph by paragraph; where both copies have the same paragraph,
  the more recently updated page wins (a note is kept from the older copy if the newer one has none).

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
| `content.js` | The main script running on GitHub issue / PR pages: toolbar, notes, reply composer, progress badge, keyboard navigation |
| `content.css` | Styling for the above; follows GitHub's Primer CSS variables |
| `background.js` | Registers the right-click menu and relays menu clicks and keyboard shortcuts to `content.js` |
| `popup.html` / `popup.js` / `popup.css` | The toolbar icon popup |
| `overview.html` / `overview.js` / `overview.css` | Saved-pages list with export / import (also the options page) |
| `_locales/` | Name, summary and UI strings in English, Japanese and Romanian; picked by the browser's display language, falling back to English |
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

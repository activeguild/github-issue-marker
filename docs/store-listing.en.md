# Chrome Web Store listing (English)

Ready to paste into the matching fields of the Developer Dashboard.

## Store listing tab

### Extension name and summary

Neither is editable in the dashboard — both are taken from `_locales/en/messages.json` inside the
package. To change them, edit that file, rebuild the zip and upload it again.

| Field | Current value |
| --- | --- |
| Extension name (max 75) | `GitHub Issue Read Marker` |
| Summary (max 132) | `Mark paragraphs of a GitHub issue with a check or a cross and attach private notes as you read.` |

### Detailed description

```
Long GitHub issues are easy to lose your place in — which parts have you read, and which ones did you
want to push back on? GitHub Issue Read Marker lets you mark and annotate the issue body and every
comment, paragraph by paragraph.

■ Mark any paragraph with ✓ / × and a note
Hover over a paragraph and a [✓] [×] [note] toolbar appears on its left.
・✓ — something you have read or verified
・× — something you want to push back on
・note — a comment about that spot, visible only in your own browser
Press the same button again to remove the mark.
Paragraphs, list items, headings, code blocks, table rows and collapsible summaries are all supported.

■ Draft a reply from your notes and ×s
Choose "Draft a reply from notes and ×" from the right-click menu or the toolbar popup, and every
marked spot is collected as a Markdown blockquote with your note underneath.
Checkboxes let you pick what to include: spots with notes, × spots, ✓ spots.
Lists keep their "-", code blocks keep their fences, and table rows are quoted "|"-separated, so the
original shape of the text survives.
The finished draft can be inserted straight into the comment box at the bottom of the page, or copied
to your clipboard.

■ Your marks are saved
Marks and notes are stored per issue and restored the next time you open it.
When you no longer need them, "Clear all marks and notes on this page" removes them in one step.

■ Privacy
This extension never communicates with any external server.
Your marks and notes stay inside your own browser (chrome.storage.local) and nobody — including the
developer — can read them.
The full source code is published on GitHub:
https://github.com/activeguild/github-issue-marker

■ Note
This is an unofficial tool and is not affiliated with, endorsed by, or sponsored by GitHub, Inc.
```

### Category

```
Developer Tools
```

### Language

The default locale is Japanese. Add English in the store listing tab of the dashboard; the name and
summary switch to the English messages automatically. Only the detailed description below has to be
pasted in by hand.

### Support links

| Field | URL |
| --- | --- |
| Homepage | `https://github.com/activeguild/github-issue-marker` |
| Support | `https://github.com/activeguild/github-issue-marker/issues` |
| Privacy policy | `https://github.com/activeguild/github-issue-marker/blob/main/PRIVACY.md` |

## Privacy tab

### Single purpose description

```
The sole purpose of this extension is to let the user mark and annotate individual paragraphs of the
body and comments on a GitHub issue page, so that they can keep track of what they have read and reuse
those notes when drafting a reply.
```

### Permission justifications

| Permission | Justification to enter |
| --- | --- |
| `storage` | Saves the marks and notes the user creates inside the browser so that they are restored the next time the same issue is opened. |
| `contextMenus` | Adds "Draft a reply" and "Clear all marks and notes on this page" to the right-click menu so the user can run them from the page. |
| `clipboardWrite` | Copies the drafted reply text to the clipboard when the user clicks the copy button. |
| Host permission `https://github.com/*` | Displays the marking toolbar, the notes and the reply composer on GitHub issue pages. The extension does not run on any other site. |
| Remote code | Not used. All code ships inside the extension package. |

### Data usage disclosure

Types of data collected: **tick "Website content" only**

Reasoning:

- The extension reads text from the page when computing the hash that identifies a paragraph and when
  building the quoted reply (`hash()` and `quoteSource()` in `content.js`). That counts as handling
  website content.
- The text itself is never stored. What is stored is the hash, the user's own note and the issue path —
  all in `chrome.storage.local`, never transmitted.

Leave the rest unticked: personally identifiable information, health, financial, authentication,
personal communications, location, web history, user activity.

> **Note**: the official docs do not clearly settle whether local-only storage requires ticking these
> boxes. One page says disclosure is required "even when data is processed or stored locally", while the
> definition of "collect" can be read as off-device transmission. This errs on the side of over-declaring,
> because a reviewer reading the source will see the text being read. Adjust if the dashboard's own help
> text says otherwise.
>
> "Web history" is a borderline call — the storage key contains `/owner/repo/issues/123`. It is limited to
> pages the user marked and is not browsing-history collection, so it is left unticked.

Tick all three certification checkboxes — all of them hold true:

- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

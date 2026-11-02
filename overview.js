'use strict';

// 保存したページの一覧と、データの書き出し・読み込み
// 保存形式（content.js の save()）:
//   キー   "ghrc:/owner/repo/issues/123" または "ghrc:/owner/repo/pull/123"
//   値     { v: 2, updatedAt, w, title, total, items: { ID: { s?: 'check' | 'cross', n?: メモ } } }
//   v1 形式はチェック済み ID の配列

const KEY_RE = /^ghrc:\/([^/]+)\/([^/]+)\/(issues|pull)\/(\d+)$/;
const EXPORT_FORMAT = 'github-issue-read-marker';
const STALE_DAYS = 90;

const i18n = (key, subs) => chrome.i18n.getMessage(key, subs);
const lang = chrome.i18n.getUILanguage();
const $ = (id) => document.getElementById(id);

document.documentElement.lang = lang;
document.title = `${i18n('overviewTitle')} - ${i18n('name')}`;
for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = i18n(el.dataset.i18n);
for (const el of document.querySelectorAll('[data-i18n-placeholder]')) {
  el.placeholder = i18n(el.dataset.i18nPlaceholder);
}

const list = $('list');
const empty = $('empty');
const filter = $('filter');
const status = $('status');
let pages = []; // 表示用に整えたページ一覧

// ---- 保存形式の正規化 -------------------------------------------------------
function cleanItems(items) {
  const out = {};
  for (const [id, it] of Object.entries(items)) {
    if (!it || typeof it !== 'object') continue;
    const c = {};
    if (it.s === 'check' || it.s === 'cross') c.s = it.s;
    if (typeof it.n === 'string' && it.n.trim()) c.n = it.n;
    if (c.s || c.n) out[id] = c;
  }
  return out;
}

// 壊れた値や知らない形式は null
function normalize(raw) {
  if (Array.isArray(raw)) {
    const items = {};
    for (const id of raw) if (typeof id === 'string') items[id] = { s: 'check' };
    return { v: 2, updatedAt: 0, items };
  }
  if (!raw || typeof raw !== 'object' || !raw.items || typeof raw.items !== 'object' || Array.isArray(raw.items)) {
    return null;
  }
  const page = { v: 2, updatedAt: Number(raw.updatedAt) || 0, items: cleanItems(raw.items) };
  if (typeof raw.title === 'string' && raw.title) page.title = raw.title;
  if (Number.isInteger(raw.total) && raw.total > 0) page.total = raw.total;
  return page;
}

// ---- 一覧 -------------------------------------------------------------------
function toPage(key, raw) {
  const m = key.match(KEY_RE);
  const data = m && normalize(raw);
  if (!data) return null;
  const [, owner, repo, kind, num] = m;
  let check = 0;
  let cross = 0;
  let notes = 0;
  for (const it of Object.values(data.items)) {
    if (it.s === 'check') check++;
    if (it.s === 'cross') cross++;
    if (it.n) notes++;
  }
  const label = `${owner}/${repo} #${num}`;
  return {
    key,
    url: `https://github.com/${owner}/${repo}/${kind}/${num}`,
    kind,
    label,
    title: data.title || label,
    updatedAt: data.updatedAt,
    total: data.total,
    check,
    cross,
    notes,
  };
}

function formatDate(ms) {
  if (!ms) return i18n('overviewUnknownDate');
  return new Date(ms).toLocaleString(lang, { dateStyle: 'medium', timeStyle: 'short' });
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function row(p) {
  const li = document.createElement('li');

  const head = document.createElement('div');
  head.className = 'ghrc-row-head';
  const kind = document.createElement('span');
  kind.className = `ghrc-kind ghrc-kind-${p.kind}`;
  kind.textContent = i18n(p.kind === 'pull' ? 'kindPull' : 'kindIssue');
  const a = document.createElement('a');
  a.href = p.url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = p.title; // 読み込んだデータ由来なので必ず textContent で入れる
  head.append(kind, a);

  const meta = document.createElement('div');
  meta.className = 'ghrc-row-meta ghrc-muted';
  const parts = [p.label, i18n('overviewCounts', [String(p.check), String(p.cross), String(p.notes)])];
  if (p.total) {
    const pct = Math.min(100, Math.round(((p.check + p.cross) / p.total) * 100));
    parts.push(i18n('overviewProgress', [String(pct)]));
  }
  parts.push(i18n('overviewUpdated', [formatDate(p.updatedAt)]));
  meta.textContent = parts.join(' · ');

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'ghrc-danger ghrc-small';
  del.textContent = i18n('delete');
  del.addEventListener('click', () => {
    if (window.confirm(i18n('overviewDeleteConfirm', [p.title]))) chrome.storage.local.remove(p.key);
  });

  const body = document.createElement('div');
  body.className = 'ghrc-row-body';
  body.append(head, meta);
  li.append(body, del);
  return li;
}

function renderList() {
  const q = filter.value.trim().toLowerCase();
  const shown = q ? pages.filter((p) => `${p.title} ${p.label}`.toLowerCase().includes(q)) : pages;
  list.replaceChildren(...shown.map(row));
  $('count').textContent = i18n('overviewCount', [String(shown.length)]);
  empty.hidden = shown.length > 0;
  empty.textContent = i18n(pages.length ? 'overviewNoMatch' : 'overviewEmpty');
}

function refresh() {
  chrome.storage.local.get(null, (all) => {
    pages = Object.entries(all)
      .map(([key, raw]) => toPage(key, raw))
      .filter(Boolean)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    renderList();
  });
  chrome.storage.local.getBytesInUse(null, (bytes) => {
    $('usage').textContent = i18n('overviewUsage', [formatBytes(bytes), formatBytes(chrome.storage.local.QUOTA_BYTES)]);
  });
}

filter.addEventListener('input', renderList);
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === 'local') refresh();
});

// ---- 古いページの削除 -------------------------------------------------------
$('stale').addEventListener('click', () => {
  const limit = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;
  // 更新日時が分からない（v1 形式の）ページは対象にしない
  const keys = pages.filter((p) => p.updatedAt && p.updatedAt < limit).map((p) => p.key);
  if (!keys.length) {
    status.textContent = i18n('overviewStaleNone');
    return;
  }
  if (window.confirm(i18n('overviewStaleConfirm', [String(keys.length)]))) {
    chrome.storage.local.remove(keys, () => {
      status.textContent = i18n('overviewStaleDone', [String(keys.length)]);
    });
  }
});

// ---- 書き出し ---------------------------------------------------------------
$('export').addEventListener('click', () => {
  chrome.storage.local.get(null, (all) => {
    const out = {};
    for (const [key, raw] of Object.entries(all)) {
      const data = KEY_RE.test(key) && normalize(raw);
      if (data) out[key] = data;
    }
    const payload = { format: EXPORT_FORMAT, version: 1, exportedAt: new Date().toISOString(), pages: out };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `github-issue-read-marker-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = i18n('exportDone', [String(Object.keys(out).length)]);
  });
});

// ---- 読み込み ---------------------------------------------------------------
// 同じページがすでにあれば段落ごとに統合し、同じ段落が両方にあれば更新日時が新しいページの方を優先する。
// ただしメモは、新しい側に無ければ古い側のものを残す（マークだけ付け直した側でメモが消えないように）
function merge(current, incoming) {
  const [older, newer] = incoming.updatedAt > current.updatedAt ? [current, incoming] : [incoming, current];
  const items = { ...older.items };
  for (const [id, it] of Object.entries(newer.items)) {
    const prev = items[id] || {};
    const c = {};
    if (it.s || prev.s) c.s = it.s || prev.s;
    if (it.n || prev.n) c.n = it.n || prev.n;
    items[id] = c;
  }
  const page = {
    v: 2,
    updatedAt: Math.max(current.updatedAt, incoming.updatedAt),
    items,
  };
  const title = newer.title || older.title;
  const total = newer.total || older.total;
  if (title) page.title = title;
  if (total) page.total = total;
  return page;
}

$('import').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = ''; // 同じファイルをもう一度選べるように
  if (!file) return;

  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch (_) {
    payload = null;
  }
  const incoming = {};
  if (payload && payload.format === EXPORT_FORMAT && payload.pages && typeof payload.pages === 'object') {
    for (const [key, raw] of Object.entries(payload.pages)) {
      const data = KEY_RE.test(key) && normalize(raw);
      if (data && Object.keys(data.items).length) incoming[key] = data;
    }
  }
  const keys = Object.keys(incoming);
  if (!keys.length) {
    status.textContent = i18n('importInvalid');
    return;
  }
  if (!window.confirm(i18n('importConfirm', [String(keys.length)]))) return;

  chrome.storage.local.get(keys, (current) => {
    const writes = {};
    let added = 0;
    let merged = 0;
    for (const key of keys) {
      const cur = normalize(current[key]);
      if (cur) {
        writes[key] = merge(cur, incoming[key]);
        merged++;
      } else {
        writes[key] = incoming[key];
        added++;
      }
    }
    chrome.storage.local.set(writes, () => {
      status.textContent = chrome.runtime.lastError
        ? i18n('importFailed', [chrome.runtime.lastError.message])
        : i18n('importDone', [String(added), String(merged)]);
    });
  });
});

refresh();

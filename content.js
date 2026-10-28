(() => {
  'use strict';

  // 対象ページ。PR の会話タブも対象にするなら /issues/ を /(?:issues|pull)/ に変更
  const PAGE_RE = /^\/[^/]+\/[^/]+\/issues\/\d+/;

  // マーク・メモの単位になるブロック要素（Issue 本文・コメントの Markdown 内）
  const BLOCK_TAGS = ['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'tr', 'summary'];
  const BLOCK_SEL = BLOCK_TAGS.map((t) => `.markdown-body ${t}`).join(',');

  const GAP = 6; // コメント本文の左端からの距離(px)
  const HIDE_DELAY = 400; // ホバーを外してからツールバーを消すまで(ms)
  const STORAGE_PREFIX = 'ghrc:';

  const svg = (d) =>
    `<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="${d}"/></svg>`;
  const ICONS = {
    check: svg('M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z'),
    cross: svg('M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z'),
    note: svg('M1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0 1 13.25 12H9.06l-2.573 2.573A1.458 1.458 0 0 1 4 13.543V12H2.75A1.75 1.75 0 0 1 1 10.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.75.75 0 0 1 .53-.22h4.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z'),
  };
  const STATUS_CLASS = { check: 'ghrc-checked', cross: 'ghrc-crossed' };
  const STATUS_LABEL = { check: '✓を付ける', cross: '×を付ける' };

  let path = null; // 直近に処理した location.pathname
  let pageKey = null; // 保存用キー（/owner/repo/issues/123）
  let active = false;
  let items = new Map(); // ID -> { s?: 'check' | 'cross', n?: メモ }
  let elToId = new WeakMap();
  let idToEl = new Map();
  let order = []; // 文書順の ID 一覧
  let needScan = true;
  let hoverEl = null;
  let hideTimer = 0;
  let raf = 0;
  let editingId = null;
  const marks = new Map(); // ID -> 左側のマーク
  const notes = new Map(); // ID -> 本文中に差し込むメモ表示

  // ---- UI レイヤー --------------------------------------------------------
  // <body> は GitHub の画面遷移で差し替わるため <html> 直下に置く
  const layer = document.createElement('div');
  layer.id = 'ghrc-layer';

  // ホバー時のツールバー [✓][×][メモ]
  const toolbar = document.createElement('div');
  toolbar.className = 'ghrc-toolbar';
  toolbar.hidden = true;
  for (const [act, label] of [['check', STATUS_LABEL.check], ['cross', STATUS_LABEL.cross], ['note', 'メモを書く']]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.act = act;
    b.title = label;
    b.setAttribute('aria-label', label);
    b.innerHTML = ICONS[act];
    toolbar.appendChild(b);
  }
  toolbar.addEventListener('mousedown', (e) => e.preventDefault()); // テキスト選択を崩さない
  toolbar.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    const id = hoverEl && elToId.get(hoverEl);
    if (!id) return;
    if (b.dataset.act === 'note') openEditor(id);
    else setStatus(id, b.dataset.act);
  });

  // メモ編集ポップアップ
  const editor = document.createElement('div');
  editor.className = 'ghrc-editor';
  editor.hidden = true;
  editor.innerHTML =
    '<textarea rows="3" placeholder="この箇所へのメモ（自分だけに表示されます）"></textarea>' +
    '<div class="ghrc-editor-actions">' +
    '<button type="button" data-act="delete" class="ghrc-danger">削除</button>' +
    '<span class="ghrc-spacer"></span>' +
    '<span class="ghrc-hint">⌘/Ctrl+Enter で保存</span>' +
    '<button type="button" data-act="cancel">キャンセル</button>' +
    '<button type="button" data-act="save" class="ghrc-primary">保存</button>' +
    '</div>';
  const textarea = editor.querySelector('textarea');
  const deleteBtn = editor.querySelector('[data-act="delete"]');
  editor.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    e.preventDefault();
    if (b.dataset.act === 'save') saveNote(textarea.value);
    else if (b.dataset.act === 'delete') saveNote('');
    else closeEditor();
  });
  textarea.addEventListener('keydown', (e) => {
    e.stopPropagation(); // GitHub のショートカットキーを発火させない
    if (e.isComposing) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeEditor();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      saveNote(textarea.value);
    }
  });

  // 返信コメント作成パネル（右クリックメニューから開く）
  const composer = document.createElement('div');
  composer.className = 'ghrc-composer';
  composer.hidden = true;
  composer.setAttribute('role', 'dialog');
  composer.setAttribute('aria-label', '返信コメントを作成');
  composer.innerHTML =
    '<div class="ghrc-composer-head">' +
    '<strong>返信コメントを作成</strong>' +
    `<button type="button" class="ghrc-icon-btn" data-act="close" title="閉じる" aria-label="閉じる">${ICONS.cross}</button>` +
    '</div>' +
    '<div class="ghrc-composer-opts">' +
    '<label><input type="checkbox" data-opt="note" checked> メモがある箇所</label>' +
    '<label><input type="checkbox" data-opt="cross" checked> ×の箇所</label>' +
    '<label><input type="checkbox" data-opt="check"> ✓の箇所</label>' +
    '</div>' +
    '<textarea rows="12" spellcheck="false"></textarea>' +
    '<p class="ghrc-composer-empty" hidden>対象の箇所がありません。ツールバーでメモや×を付けると、ここに引用として集まります。</p>' +
    '<div class="ghrc-editor-actions">' +
    '<span class="ghrc-hint ghrc-status" aria-live="polite"></span>' +
    '<span class="ghrc-spacer"></span>' +
    '<button type="button" data-act="copy">コピー</button>' +
    '<button type="button" data-act="insert" class="ghrc-primary">コメント欄に挿入</button>' +
    '</div>';
  const composerText = composer.querySelector('textarea');
  const composerEmpty = composer.querySelector('.ghrc-composer-empty');
  const composerStatus = composer.querySelector('.ghrc-status');

  layer.append(toolbar, editor, composer);
  document.documentElement.appendChild(layer);

  // ---- 保存 ---------------------------------------------------------------
  function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  const storageKey = () => STORAGE_PREFIX + pageKey;
  const getItem = (id) => items.get(id) || {};

  function load() {
    const key = storageKey();
    try {
      chrome.storage.local.get(key, (res) => {
        if (storageKey() !== key) return; // 読み込み中に別ページへ移動した
        const raw = res[key];
        const loaded = new Map();
        if (Array.isArray(raw)) {
          // v1 形式（チェック済み ID の配列）からの移行
          for (const id of raw) loaded.set(id, { s: 'check' });
        } else if (raw && raw.items) {
          for (const [id, it] of Object.entries(raw.items)) loaded.set(id, it);
        }
        // 読み込み完了前に付けたマークも失わないようマージ
        for (const [id, it] of items) loaded.set(id, it);
        items = loaded;
        schedule();
      });
    } catch (_) {
      /* 拡張機能の再読み込み直後などはコンテキストが無効になる */
    }
  }

  function save() {
    const key = storageKey();
    try {
      if (items.size) {
        chrome.storage.local.set({
          [key]: { v: 2, updatedAt: Date.now(), items: Object.fromEntries(items) },
        });
      } else {
        chrome.storage.local.remove(key);
      }
    } catch (_) {
      /* 同上 */
    }
  }

  function putItem(id, it) {
    if (it.s || it.n) items.set(id, it);
    else items.delete(id);
    save();
    schedule();
  }

  function setStatus(id, s) {
    const it = { ...getItem(id) };
    if (it.s === s) delete it.s; // 同じボタンをもう一度押すと解除
    else it.s = s;
    putItem(id, it);
  }

  // ---- ページ遷移 ---------------------------------------------------------
  function onNavigate() {
    path = location.pathname;
    const m = path.match(PAGE_RE);
    pageKey = m ? m[0] : null;
    active = !!pageKey;

    items = new Map();
    for (const el of document.querySelectorAll('.ghrc-checked, .ghrc-crossed')) {
      el.classList.remove('ghrc-checked', 'ghrc-crossed');
    }
    for (const n of document.querySelectorAll('.ghrc-note')) n.remove();
    for (const mark of marks.values()) mark.remove();
    marks.clear();
    notes.clear();
    hideToolbar();
    closeEditor();
    closeComposer();
    needScan = true;

    if (active) load();
  }

  // ---- ブロックの検出と ID 付け -------------------------------------------
  // メモ表示（.ghrc-note）の文字は ID 計算に含めない
  function blockText(el) {
    let s;
    if (!el.querySelector('.ghrc-note')) {
      s = el.textContent;
    } else {
      s = '';
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) =>
          n.parentElement && n.parentElement.closest('.ghrc-note')
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT,
      });
      for (let n = w.nextNode(); n; n = w.nextNode()) s += n.data;
    }
    return s.replace(/\s+/g, ' ').trim();
  }

  // ID = テキスト内容のハッシュ + 同じテキストの出現順
  function rescan() {
    elToId = new WeakMap();
    idToEl = new Map();
    order = [];
    const counts = new Map();
    for (const el of document.querySelectorAll(BLOCK_SEL)) {
      if (el.closest('.ghrc-note')) continue;
      const text = blockText(el);
      if (!text) continue;
      const h = hash(text);
      const n = counts.get(h) || 0;
      counts.set(h, n + 1);
      const id = `${h}-${n}`;
      elToId.set(el, id);
      idToEl.set(id, el);
      order.push(id);
    }
  }

  // ---- 配置 ---------------------------------------------------------------
  // 返り値: コメント本文の左外側の右端 x と、ブロック1行目の中央 y
  function positionFor(el) {
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null; // 折りたたまれた details の中など
    const body = el.closest('.markdown-body');
    const right = (body ? body.getBoundingClientRect().left : r.left) - GAP;
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
    return { right, cy: r.top + Math.min(lineHeight, r.height) / 2 };
  }

  function placeAt(node, pos) {
    if (!pos) {
      node.hidden = true;
      return;
    }
    node.hidden = false;
    const x = Math.round(pos.right - node.offsetWidth);
    const y = Math.round(pos.cy - node.offsetHeight / 2);
    node.style.transform = `translate(${x}px, ${y}px)`;
  }

  function positionEditor() {
    const el = idToEl.get(editingId);
    if (!el || !el.isConnected) return;
    const r = el.getBoundingClientRect();
    const body = el.closest('.markdown-body');
    const w = editor.offsetWidth;
    const h = editor.offsetHeight;
    let left = body ? body.getBoundingClientRect().left : r.left;
    left = Math.max(12, Math.min(left, window.innerWidth - w - 12));
    let top = r.bottom + 6;
    if (top + h > window.innerHeight - 12 && r.top - h - 6 > 12) top = r.top - h - 6;
    editor.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  }

  // ---- 描画 ---------------------------------------------------------------
  function makeMark(id) {
    const mark = document.createElement('button');
    mark.type = 'button';
    mark.className = 'ghrc-mark';
    mark.addEventListener('mousedown', (e) => e.preventDefault());
    mark.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const s = getItem(id).s;
      if (s) setStatus(id, s);
    });
    return mark;
  }

  function makeNote(id) {
    const n = document.createElement('div');
    n.className = 'ghrc-note';
    n.title = 'クリックしてメモを編集';
    n.innerHTML = `<span class="ghrc-note-icon">${ICONS.note}</span><span class="ghrc-note-text"></span>`;
    n.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openEditor(id);
    });
    return n;
  }

  // メモはブロックの直後（li は子リストの前、表の行は最後のセル内）に差し込む
  function syncNote(id, el, text) {
    let n = notes.get(id);
    if (!n) {
      n = makeNote(id);
      notes.set(id, n);
    }
    const t = n.querySelector('.ghrc-note-text');
    if (t.textContent !== text) t.textContent = text;

    if (el.tagName === 'LI') {
      const sub = el.querySelector(':scope > ul, :scope > ol');
      if (sub) {
        if (n.parentNode !== el || n.nextElementSibling !== sub) el.insertBefore(n, sub);
      } else if (n.parentNode !== el) {
        el.appendChild(n);
      }
    } else if (el.tagName === 'TR') {
      const cell = el.lastElementChild;
      if (cell && n.parentNode !== cell) cell.appendChild(n);
    } else if (el.nextElementSibling !== n) {
      el.after(n);
    }
  }

  function render() {
    // ハイライト（GitHub 側の再描画でクラスが消えても付け直す）
    for (const el of document.querySelectorAll('.ghrc-checked, .ghrc-crossed')) {
      const s = getItem(elToId.get(el)).s;
      for (const [state, cls] of Object.entries(STATUS_CLASS)) {
        if (s !== state && el.classList.contains(cls)) el.classList.remove(cls);
      }
    }

    const toolbarShown = !toolbar.hidden && hoverEl;
    const liveMarks = new Set();
    const liveNotes = new Set();
    for (const [id, it] of items) {
      const el = idToEl.get(id);
      if (!el || !el.isConnected) continue;

      if (it.s) {
        const cls = STATUS_CLASS[it.s];
        if (cls && !el.classList.contains(cls)) el.classList.add(cls);

        let mark = marks.get(id);
        if (!mark) {
          mark = makeMark(id);
          marks.set(id, mark);
          layer.insertBefore(mark, toolbar); // ツールバーより下に重ねる
        }
        if (mark.dataset.state !== it.s) {
          mark.dataset.state = it.s;
          mark.innerHTML = ICONS[it.s];
          const label = it.s === 'check' ? '✓を外す' : '×を外す';
          mark.title = label;
          mark.setAttribute('aria-label', label);
        }
        // ホバー中のブロックはツールバーが状態を表示するのでマークは隠す
        placeAt(mark, toolbarShown && el === hoverEl ? null : positionFor(el));
        liveMarks.add(id);
      }

      if (it.n) {
        syncNote(id, el, it.n);
        liveNotes.add(id);
      }
    }
    for (const [id, mark] of marks) {
      if (!liveMarks.has(id)) {
        mark.remove();
        marks.delete(id);
      }
    }
    for (const [id, n] of notes) {
      if (!liveNotes.has(id)) {
        n.remove();
        notes.delete(id);
      }
    }

    // ツールバー
    if (hoverEl) {
      const id = elToId.get(hoverEl);
      if (!hoverEl.isConnected || !id) {
        hideToolbar();
      } else {
        const it = getItem(id);
        toolbar.dataset.state = it.s || '';
        toolbar.dataset.hasNote = it.n ? '1' : '';
        placeAt(toolbar, positionFor(hoverEl));
      }
    }

    if (editingId) positionEditor();
  }

  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (location.pathname !== path) onNavigate();
      if (!active) return;
      if (needScan) {
        needScan = false;
        rescan();
      }
      render();
    });
  }

  // ---- メモ編集 -----------------------------------------------------------
  function openEditor(id) {
    hideToolbar();
    editingId = id;
    const note = getItem(id).n || '';
    textarea.value = note;
    deleteBtn.hidden = !note;
    editor.hidden = false;
    positionEditor();
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(note.length, note.length);
    schedule();
  }

  function closeEditor() {
    editingId = null;
    editor.hidden = true;
  }

  function saveNote(text) {
    const id = editingId;
    if (!id) return;
    const it = { ...getItem(id) };
    const t = text.trim();
    if (t) it.n = t;
    else delete it.n;
    closeEditor();
    putItem(id, it);
  }

  // ---- ホバー -------------------------------------------------------------
  function hideToolbar() {
    clearTimeout(hideTimer);
    if (!hoverEl && toolbar.hidden) return;
    hoverEl = null;
    toolbar.hidden = true;
    schedule(); // 隠していたマークを戻す
  }

  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideToolbar, HIDE_DELAY);
  }

  // ホバー中のブロックからツールバーまでの「通り道」。
  // ここにマウスがある間は、余白や親要素の上を通ってもツールバーを消さない・動かさない
  function inKeepZone(x, y) {
    if (!hoverEl || toolbar.hidden || !hoverEl.isConnected) return false;
    const r = hoverEl.getBoundingClientRect();
    const b = toolbar.getBoundingClientRect();
    const pad = 8;
    return (
      x >= b.left - pad &&
      x <= r.right + pad &&
      y >= Math.min(r.top, b.top) - pad &&
      y <= Math.max(r.bottom, b.bottom) + pad
    );
  }

  function setHover(block) {
    if (!elToId.has(block)) rescan();
    if (!elToId.has(block)) {
      scheduleHide();
      return;
    }
    clearTimeout(hideTimer);
    if (hoverEl === block && !toolbar.hidden) return;
    hoverEl = block;
    toolbar.hidden = false;
    schedule();
  }

  document.addEventListener(
    'mousemove',
    (e) => {
      if (!active || editingId) return;
      const t = e.target;
      if (!(t instanceof Element)) return;

      // ツールバーやマークの上にいる間は消さない
      if (layer.contains(t)) {
        clearTimeout(hideTimer);
        return;
      }

      const block = t.closest('.ghrc-note') ? null : t.closest(BLOCK_SEL);

      if (inKeepZone(e.clientX, e.clientY)) {
        clearTimeout(hideTimer);
        // 通り道の中では、より内側のブロック（ネストした子）に入ったときだけ切り替える
        if (block && block !== hoverEl && hoverEl.contains(block)) setHover(block);
        return;
      }

      if (!block) {
        scheduleHide();
        return;
      }
      setHover(block);
    },
    { capture: true, passive: true }
  );

  document.documentElement.addEventListener('mouseleave', scheduleHide);

  // ---- 返信コメントの作成 -------------------------------------------------
  function cleanText(el, dropSublists) {
    const c = el.cloneNode(true);
    for (const n of c.querySelectorAll('.ghrc-note')) n.remove();
    if (dropSublists) for (const n of c.querySelectorAll(':scope > ul, :scope > ol')) n.remove();
    return c.textContent.replace(/\s+/g, ' ').trim();
  }

  // 引用元の Markdown（リストは記号付き、コードはフェンス付き、表の行は | 区切り）
  function quoteSource(el) {
    switch (el.tagName) {
      case 'TR':
        return [...el.children].map((cell) => cleanText(cell)).join(' | ');
      case 'PRE': {
        const c = el.cloneNode(true);
        for (const n of c.querySelectorAll('.ghrc-note')) n.remove();
        return '```\n' + c.textContent.replace(/\n+$/, '') + '\n```';
      }
      case 'LI':
        return '- ' + cleanText(el, true);
      default:
        return cleanText(el);
    }
  }

  function composerOptions() {
    const opts = {};
    for (const cb of composer.querySelectorAll('input[data-opt]')) opts[cb.dataset.opt] = cb.checked;
    return opts;
  }

  function buildReply(opts) {
    const parts = [];
    for (const id of order) {
      const it = items.get(id);
      const el = idToEl.get(id);
      if (!it || !el) continue;
      const include =
        (opts.note && it.n) || (opts.cross && it.s === 'cross') || (opts.check && it.s === 'check');
      if (!include) continue;
      const quote = quoteSource(el)
        .split('\n')
        .map((line) => (line ? `> ${line}` : '>'))
        .join('\n');
      parts.push(it.n ? `${quote}\n\n${it.n}` : quote);
    }
    return { text: parts.join('\n\n'), count: parts.length };
  }

  function refreshComposer() {
    const { text, count } = buildReply(composerOptions());
    composerText.value = text;
    composerText.hidden = count === 0;
    composerEmpty.hidden = count !== 0;
    for (const b of composer.querySelectorAll('[data-act="copy"], [data-act="insert"]')) b.disabled = count === 0;
    composerStatus.textContent = count ? `${count} 箇所を引用` : '';
  }

  function openComposer() {
    if (!active) return;
    rescan();
    hideToolbar();
    closeEditor();
    composer.hidden = false;
    refreshComposer();
    composerText.focus({ preventScroll: true });
    composerText.setSelectionRange(0, 0);
    composerText.scrollTop = 0;
  }

  function closeComposer() {
    composer.hidden = true;
  }

  // ページ最下部の新規コメント欄（旧 UI / 新 UI の両方を探す）
  function findCommentBox() {
    const sel = [
      '#new_comment_field',
      'textarea[name="comment[body]"]',
      'textarea[aria-label="Markdown value"]',
      'textarea[placeholder*="comment" i]',
    ].join(',');
    const boxes = [...document.querySelectorAll(sel)].filter(
      (t) => t.offsetParent !== null && !t.disabled && !t.readOnly
    );
    return boxes[boxes.length - 1] || null;
  }

  function insertIntoCommentBox(text) {
    const box = findCommentBox();
    if (!box) return false;
    box.scrollIntoView({ block: 'center' });
    box.focus();
    const sep = box.value.trim() ? '\n\n' : '';
    box.setSelectionRange(box.value.length, box.value.length);
    // insertText なら GitHub(React) 側の入力イベントと元に戻す(Undo)も効く
    const ok = document.execCommand('insertText', false, sep + text);
    if (!ok || !box.value.endsWith(text)) {
      box.value = box.value + sep + text;
      box.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return true;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      composerText.hidden = false;
      composerText.focus();
      composerText.select();
      return document.execCommand('copy');
    }
  }

  composer.addEventListener('change', (e) => {
    if (e.target.matches('input[data-opt]')) refreshComposer();
  });
  composer.addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    e.preventDefault();
    const text = composerText.value;
    if (b.dataset.act === 'close') {
      closeComposer();
    } else if (b.dataset.act === 'copy') {
      composerStatus.textContent = (await copyText(text)) ? 'コピーしました' : 'コピーできませんでした';
    } else if (b.dataset.act === 'insert') {
      if (insertIntoCommentBox(text)) {
        closeComposer();
      } else {
        const copied = await copyText(text);
        composerStatus.textContent = copied
          ? 'コメント欄が見つからないため、クリップボードにコピーしました'
          : 'コメント欄が見つかりませんでした';
      }
    }
  });
  composer.addEventListener('keydown', (e) => {
    e.stopPropagation(); // GitHub のショートカットキーを発火させない
    if (e.key === 'Escape' && !e.isComposing) {
      e.preventDefault();
      closeComposer();
    }
  });

  // ---- ページ単位の一括消去 -----------------------------------------------
  function clearPage() {
    if (!active) return;
    let marked = 0;
    let noted = 0;
    for (const it of items.values()) {
      if (it.s) marked++;
      if (it.n) noted++;
    }
    if (!marked && !noted) {
      window.alert('このページには消去するマークやメモがありません。');
      return;
    }
    const ok = window.confirm(
      `このページのマーク（✓・×）${marked} 件とメモ ${noted} 件をすべて消去します。\n` +
        '消去すると元に戻せません。よろしいですか？'
    );
    if (!ok) return;
    items = new Map();
    save();
    closeEditor();
    hideToolbar();
    if (!composer.hidden) refreshComposer();
    schedule();
  }

  // 右クリックメニュー（background.js）からの呼び出し
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg) return;
    if (msg.type === 'ghrc:compose-reply') openComposer();
    else if (msg.type === 'ghrc:clear-page') clearPage();
    sendResponse({ active }); // Issue ページ以外なら何も起きないので、呼び出し元に伝える
  });

  // ---- 変化の監視 ---------------------------------------------------------
  new MutationObserver((records) => {
    let relevant = false;
    for (const r of records) {
      if (layer.contains(r.target)) continue;
      relevant = true;
      if (r.type !== 'attributes') {
        needScan = true;
        break;
      }
    }
    if (relevant) schedule();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'open', 'hidden', 'style'],
  });

  new ResizeObserver(schedule).observe(document.documentElement);
  window.addEventListener('scroll', schedule, { capture: true, passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('popstate', schedule);
  document.addEventListener('turbo:load', schedule);

  schedule();
})();

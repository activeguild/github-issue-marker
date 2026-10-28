const ROOT_ID = 'ghrc-root';
const MENUS = [
  { id: 'ghrc-compose-reply', title: 'メモと×から返信コメントを作成', message: 'ghrc:compose-reply' },
  { id: 'ghrc-clear-page', title: 'このページのマークとメモをすべて消去', message: 'ghrc:clear-page' },
];
const CONTEXTS = ['page', 'selection', 'link', 'image'];
const PATTERNS = ['https://github.com/*/issues/*'];

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    // 第1階層：ツール名
    chrome.contextMenus.create({
      id: ROOT_ID,
      title: 'GitHub Issue Read Marker',
      contexts: CONTEXTS,
      documentUrlPatterns: PATTERNS,
    });
    // 第2階層：各機能
    for (const m of MENUS) {
      chrome.contextMenus.create({
        id: m.id,
        parentId: ROOT_ID,
        title: m.title,
        contexts: CONTEXTS,
        documentUrlPatterns: PATTERNS,
      });
    }
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const menu = MENUS.find((m) => m.id === info.menuItemId);
  if (!menu || !tab || tab.id == null) return;
  chrome.tabs.sendMessage(tab.id, { type: menu.message }, () => {
    // 拡張を更新した直後で、ページ側のスクリプトがまだ古い／無い場合は無視
    void chrome.runtime.lastError;
  });
});

const ROOT_ID = 'ghrc-root';
const MENUS = [
  { id: 'ghrc-compose-reply', titleKey: 'menuComposeReply', message: 'ghrc:compose-reply' },
  { id: 'ghrc-clear-page', titleKey: 'menuClearPage', message: 'ghrc:clear-page' },
];
const CONTEXTS = ['page', 'selection', 'link', 'image'];
const PATTERNS = ['https://github.com/*/issues/*'];

// ブラウザーの表示言語が変わっても追従するよう、起動のたびに作り直す
chrome.runtime.onInstalled.addListener(createMenus);
chrome.runtime.onStartup.addListener(createMenus);

function createMenus() {
  chrome.contextMenus.removeAll(() => {
    // 第1階層：ツール名
    chrome.contextMenus.create({
      id: ROOT_ID,
      title: chrome.i18n.getMessage('name'),
      contexts: CONTEXTS,
      documentUrlPatterns: PATTERNS,
    });
    // 第2階層：各機能
    for (const m of MENUS) {
      chrome.contextMenus.create({
        id: m.id,
        parentId: ROOT_ID,
        title: chrome.i18n.getMessage(m.titleKey),
        contexts: CONTEXTS,
        documentUrlPatterns: PATTERNS,
      });
    }
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const menu = MENUS.find((m) => m.id === info.menuItemId);
  if (!menu || !tab || tab.id == null) return;
  chrome.tabs.sendMessage(tab.id, { type: menu.message }, () => {
    // 拡張を更新した直後で、ページ側のスクリプトがまだ古い／無い場合は無視
    void chrome.runtime.lastError;
  });
});

const ROOT_ID = 'ghrc-root';
const MENUS = [
  { id: 'ghrc-compose-reply', titleKey: 'menuComposeReply', message: 'ghrc:compose-reply' },
  { id: 'ghrc-clear-page', titleKey: 'menuClearPage', message: 'ghrc:clear-page' },
];
const CONTEXTS = ['page', 'selection', 'link', 'image'];
// PR の Files changed などにも出るが、content.js 側が会話タブ以外では何もしない
const PATTERNS = ['https://github.com/*/issues/*', 'https://github.com/*/pull/*'];

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

function sendToTab(tab, message) {
  if (!tab || tab.id == null) return;
  chrome.tabs.sendMessage(tab.id, message, () => {
    // 拡張を更新した直後で、ページ側のスクリプトがまだ古い／無い場合や、GitHub 以外のタブでは無視
    void chrome.runtime.lastError;
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const menu = MENUS.find((m) => m.id === info.menuItemId);
  if (menu) sendToTab(tab, { type: menu.message });
});

// キーボードショートカット（manifest.json の commands）
chrome.commands.onCommand.addListener((command, tab) => {
  const message = { type: 'ghrc:command', command };
  if (tab) sendToTab(tab, message);
  else chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => sendToTab(tabs[0], message));
});

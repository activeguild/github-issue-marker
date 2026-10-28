'use strict';

const status = document.getElementById('status');

// content.js へ指示を送る。拡張を更新した直後や Issue ページ以外では応答が無い
function send(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || tab.id == null) return;
    chrome.tabs.sendMessage(tab.id, { type: message }, (res) => {
      // 応答が無い（GitHub 以外）か active でない（Issue ページ以外）なら何も起きていない
      if (chrome.runtime.lastError || !res || !res.active) {
        status.textContent = 'GitHub の Issue ページを開いてからお試しください。';
        return;
      }
      window.close(); // 操作はページ側で続くのでポップアップは閉じる
    });
  });
}

document.getElementById('compose').addEventListener('click', () => send('ghrc:compose-reply'));
document.getElementById('clear').addEventListener('click', () => send('ghrc:clear-page'));

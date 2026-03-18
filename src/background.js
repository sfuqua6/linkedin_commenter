// background.js — service worker (MV3). Minimal — no proxying needed.
// API calls go directly from content scripts to AI providers.

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.tabs.create({ url: 'src/options.html' });
  }
});

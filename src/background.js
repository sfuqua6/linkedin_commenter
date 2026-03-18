// background.js — service worker (MV3). Minimal — no proxying needed.
// API calls go directly from content scripts to AI providers.

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    // Open the popup page so users configure their endpoint first
    chrome.tabs.create({ url: 'src/popup.html' });
  }
});

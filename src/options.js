const $ = id => document.getElementById(id);
const KEYS = ['systemPrompt', 'role', 'topics', 'length', 'draftCount'];

$('close-link').addEventListener('click', (e) => {
  e.preventDefault();
  window.close();
});

chrome.storage.local.get(
  { systemPrompt: '', role: '', topics: '', length: 'medium', draftCount: '2' },
  data => {
    if (chrome.runtime.lastError) return;
    KEYS.forEach(k => { if ($(k)) $(k).value = data[k] ?? ''; });
  }
);

$('save').addEventListener('click', () => {
  const data = {};
  KEYS.forEach(k => { data[k] = $(k).value.trim(); });
  chrome.storage.local.set(data, () => {
    const s = $('status');
    if (chrome.runtime.lastError) {
      s.textContent = 'Error: ' + chrome.runtime.lastError.message;
      return;
    }
    s.textContent = 'Saved ✓';
    setTimeout(() => { s.textContent = ''; }, 1800);
  });
});

const $ = id => document.getElementById(id);
const KEYS = ['systemPrompt', 'role', 'topics', 'length', 'draftCount'];

$('close-link').addEventListener('click', (e) => {
  e.preventDefault();
  window.close();
});

chrome.storage.sync.get(
  { systemPrompt: '', role: '', topics: '', length: 'medium', draftCount: '2' },
  data => { KEYS.forEach(k => { if ($(k)) $(k).value = data[k] ?? ''; }); }
);

$('save').addEventListener('click', () => {
  const data = {};
  KEYS.forEach(k => { data[k] = $(k).value.trim(); });
  chrome.storage.sync.set(data, () => {
    const s = $('status');
    s.textContent = 'Saved.';
    setTimeout(() => { s.textContent = ''; }, 1800);
  });
});

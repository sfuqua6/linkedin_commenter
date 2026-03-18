const $ = id => document.getElementById(id);

chrome.storage.local.get({ endpoint: '', model: '', apiKey: '' }, data => {
  if (chrome.runtime.lastError) {
    $('status').textContent = 'Load failed: ' + chrome.runtime.lastError.message;
    return;
  }
  $('endpoint').value = data.endpoint;
  $('model').value    = data.model;
  $('apiKey').value   = data.apiKey;
});

const MODEL_DEFAULTS = {
  'https://api.openai.com/v1/chat/completions':   'gpt-4o-mini',
  'https://api.anthropic.com/v1/messages':        'claude-haiku-4-5-20251001',
  'https://api.deepseek.com/v1/chat/completions': 'deepseek-chat',
  'http://localhost:11434/v1/chat/completions':    'llama3.2',
};

function saveSettings() {
  const payload = {
    endpoint: $('endpoint').value.trim(),
    model:    $('model').value.trim(),
    apiKey:   $('apiKey').value.trim(),
  };
  const s = $('status');
  chrome.storage.local.set(payload, () => {
    if (chrome.runtime.lastError) {
      s.textContent = 'Error: ' + chrome.runtime.lastError.message;
      s.style.color = '#dc2626';
      return;
    }
    s.style.color = '';
    s.textContent = 'Saved ✓';
    setTimeout(() => { s.textContent = ''; }, 1800);
  });
}

document.querySelectorAll('.preset-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const ep = chip.dataset.endpoint;
    $('endpoint').value = ep;
    if (!$('model').value && MODEL_DEFAULTS[ep]) $('model').value = MODEL_DEFAULTS[ep];
    saveSettings();
  });
});

$('save').addEventListener('click', saveSettings);

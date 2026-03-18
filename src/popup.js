const $ = id => document.getElementById(id);

chrome.storage.sync.get({ endpoint: '', model: '', apiKey: '' }, data => {
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
  chrome.storage.sync.set({
    endpoint: $('endpoint').value.trim(),
    model:    $('model').value.trim(),
    apiKey:   $('apiKey').value.trim(),
  }, () => {
    const s = $('status');
    s.textContent = 'Saved.';
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

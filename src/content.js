// content.js — UI layer. Injects Draft buttons, manages modal, renders results.
// No AI logic lives here. Calls Engine.generate() for everything AI-related.

(async () => {
  'use strict';

  const TONES = [
    { id: 'thoughtful',  label: 'Thoughtful'  },
    { id: 'contrarian',  label: 'Contrarian'  },
    { id: 'storyteller', label: 'Storyteller' },
    { id: 'tactical',    label: 'Tactical'    },
  ];

  // -------------------------------------------------------------------------
  // Modal
  // -------------------------------------------------------------------------
  let modal = null;
  let currentPostElement = null;
  let activeAbort = null;

  function onEscape(e) {
    if (e.key === 'Escape') closeModal();
  }

  function buildModal() {
    const el = document.createElement('div');
    el.id = 'ce-modal';
    el.innerHTML = `
      <div id="ce-backdrop"></div>
      <div id="ce-dialog" role="dialog" aria-modal="true" aria-label="Comment Engine">
        <div id="ce-header">
          <span id="ce-title">Comment Engine</span>
          <button id="ce-close" aria-label="Close">✕</button>
        </div>
        <div id="ce-tone-row">
          ${TONES.map(t => `<button class="ce-tone" data-tone="${t.id}">${t.label}</button>`).join('')}
        </div>
        <div id="ce-output"></div>
        <div id="ce-status"></div>
      </div>
    `;
    document.body.appendChild(el);

    el.querySelector('#ce-backdrop').addEventListener('click', closeModal);
    el.querySelector('#ce-close').addEventListener('click', closeModal);
    el.querySelectorAll('.ce-tone').forEach(btn => {
      btn.addEventListener('click', () => handleGenerate(btn.dataset.tone));
    });

    return el;
  }

  function openModal(postElement) {
    currentPostElement = postElement;
    if (!modal) modal = buildModal();
    modal.querySelector('#ce-output').innerHTML = '';
    modal.querySelector('#ce-status').textContent = 'Pick a tone to generate.';
    modal.querySelectorAll('.ce-tone').forEach(b => b.classList.remove('active'));
    modal.style.display = 'flex';
    document.addEventListener('keydown', onEscape);
  }

  function closeModal() {
    if (activeAbort) { activeAbort.abort(); activeAbort = null; }
    if (modal) modal.style.display = 'none';
    currentPostElement = null;
    document.removeEventListener('keydown', onEscape);
  }

  // -------------------------------------------------------------------------
  // Generate
  // -------------------------------------------------------------------------
  async function handleGenerate(tone) {
    if (!currentPostElement) return;

    // Abort any in-flight request
    if (activeAbort) activeAbort.abort();
    activeAbort = new AbortController();

    const output = modal.querySelector('#ce-output');
    const status = modal.querySelector('#ce-status');
    modal.querySelectorAll('.ce-tone').forEach(b => b.classList.toggle('active', b.dataset.tone === tone));

    output.innerHTML = '<div class="ce-spinner"></div>';
    status.textContent = 'Generating…';

    try {
      const settings = await Engine.loadSettings();
      const drafts = await Engine.generate({
        postElement: currentPostElement, tone, settings, signal: activeAbort.signal,
      });
      renderDrafts(drafts);
      status.textContent = drafts.length > 1 ? `${drafts.length} drafts generated.` : 'Draft ready.';
    } catch (err) {
      if (err.name === 'AbortError') return; // user switched tones, ignore
      output.innerHTML = `<p class="ce-error">${escapeHtml(err.message)}</p>`;
      status.textContent = 'Error.';
    }
  }

  function renderDrafts(drafts) {
    const output = modal.querySelector('#ce-output');
    output.innerHTML = '';
    drafts.forEach((text, i) => {
      const card = document.createElement('div');
      card.className = 'ce-draft-card';

      if (drafts.length > 1) {
        const label = document.createElement('div');
        label.className = 'ce-draft-label';
        label.textContent = `Draft ${i + 1}`;
        card.appendChild(label);
      }

      const body = document.createElement('p');
      body.className = 'ce-draft-text';
      body.textContent = text;
      card.appendChild(body);

      const actions = document.createElement('div');
      actions.className = 'ce-draft-actions';

      const pasteBtn = document.createElement('button');
      pasteBtn.className = 'ce-btn-primary';
      pasteBtn.textContent = 'Paste';
      pasteBtn.addEventListener('click', () => pasteComment(text));

      const copyBtn = document.createElement('button');
      copyBtn.className = 'ce-btn-secondary';
      copyBtn.textContent = 'Copy';
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
        });
      });

      actions.appendChild(pasteBtn);
      actions.appendChild(copyBtn);
      card.appendChild(actions);
      output.appendChild(card);
    });
  }

  // -------------------------------------------------------------------------
  // Paste into LinkedIn's comment box
  // -------------------------------------------------------------------------
  function pasteComment(text) {
    if (!currentPostElement) return;

    // Click the comment button to open the box if not already open
    const commentBtn = currentPostElement.querySelector(
      'button[aria-label*="comment" i], button[data-control-name="comment"]'
    );
    if (commentBtn) commentBtn.click();

    setTimeout(() => {
      const box = findCommentBox(currentPostElement);
      if (!box) return;
      box.focus();

      // Clear then insert — selectAllChildren + insertText replaces existing content,
      // but some LinkedIn states leave an empty <br> that shifts the cursor.
      // Selecting the full range ensures a clean paste.
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(box);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('insertText', false, text);

      closeModal();
    }, 300);
  }

  function findCommentBox(postElement) {
    const selectors = [
      '.comments-comment-box__form [contenteditable="true"]',
      '[data-test-id="comment-box__form"] [contenteditable="true"]',
      '.editor-content[contenteditable="true"]',
    ];
    const scope = postElement.closest('.feed-shared-update-v2') || postElement;
    for (const sel of selectors) {
      const el = scope.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Inject Draft buttons into posts
  // -------------------------------------------------------------------------
  const injected = new WeakSet();

  function injectButton(postElement) {
    if (injected.has(postElement)) return;

    const actionBar = postElement.querySelector(
      '.feed-shared-social-action-bar, .social-actions-bar, [data-test-id="social-actions__comment"]'
    )?.parentElement;

    const anchor = actionBar ||
      postElement.querySelector('.feed-shared-social-counts, .update-v2-social-activity');

    if (!anchor) return;

    injected.add(postElement);

    const btn = document.createElement('button');
    btn.className = 'ce-draft-btn';
    btn.textContent = 'Draft';
    btn.title = 'Generate a comment with Comment Engine';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openModal(postElement);
    });

    anchor.appendChild(btn);
  }

  function scanPosts() {
    const posts = document.querySelectorAll(
      '.feed-shared-update-v2, [data-urn][data-id], .occludable-update'
    );
    posts.forEach(injectButton);
  }

  // -------------------------------------------------------------------------
  // MutationObserver — debounced to avoid thrashing on LinkedIn's busy DOM
  // -------------------------------------------------------------------------
  let scanTimer = null;

  const observer = new MutationObserver(() => {
    if (scanTimer) return;
    scanTimer = requestAnimationFrame(() => {
      scanTimer = null;
      scanPosts();
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  scanPosts();

  // -------------------------------------------------------------------------
  // Utility
  // -------------------------------------------------------------------------
  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

})();

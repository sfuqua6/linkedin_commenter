// engine.js — Core logic. Post extraction, prompt building, response parsing.
// Provider-agnostic: calls Providers.call() and handles all response cleanup.

const Engine = (() => {

  // ---------------------------------------------------------------------------
  // Response parser
  // Strips reasoning/thinking blocks that models like DeepSeek-R1, Claude, and
  // others emit before their actual answer.
  //
  // Patterns handled:
  //   <think>...</think>           — DeepSeek-R1 chain-of-thought
  //   <thinking>...</thinking>     — Anthropic extended thinking
  //   <reasoning>...</reasoning>   — other reasoning models
  //   Anything before the first non-whitespace after those blocks is also trimmed.
  // ---------------------------------------------------------------------------
  function stripThinkingBlocks(text) {
    return text
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
      .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
      .trim();
  }

  // Split a response that may contain multiple drafts separated by blank lines or
  // explicit delimiters like "---", "Draft 1:", "Option 1:", numbered items, etc.
  function splitDrafts(text, expectedCount) {
    // Try explicit numbered draft headers first
    const headerPattern = /(?:^|\n)(?:draft|option|comment)\s*\d+\s*[:\-]/gi;
    if (headerPattern.test(text)) {
      const parts = text.split(/(?:^|\n)(?:draft|option|comment)\s*\d+\s*[:\-]/gi)
        .map(s => s.trim()).filter(Boolean);
      if (parts.length > 1) return parts;
    }

    // Try horizontal-rule separators
    const hrParts = text.split(/\n\s*[-─]{3,}\s*\n/).map(s => s.trim()).filter(Boolean);
    if (hrParts.length > 1) return hrParts;

    // Try double blank lines
    const blankParts = text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
    if (blankParts.length >= expectedCount) return blankParts.slice(0, expectedCount);

    // Fallback: treat whole response as one draft
    return [text.trim()];
  }

  // Full parse pipeline
  function parseResponse(raw, draftCount = 1) {
    const cleaned = stripThinkingBlocks(raw);
    return splitDrafts(cleaned, draftCount);
  }

  // ---------------------------------------------------------------------------
  // LinkedIn post extraction
  // ---------------------------------------------------------------------------
  function extractPostText(postElement) {
    const contentSelectors = [
      '.feed-shared-update-v2__description',
      '.feed-shared-text',
      '.update-components-text',
      '[data-test-id="main-feed-activity-card__commentary"]',
      '.feed-shared-article__description',
      '.feed-shared-inline-show-more-text',
    ];

    for (const sel of contentSelectors) {
      const el = postElement.querySelector(sel);
      if (el) {
        return el.innerText.trim();
      }
    }

    // Fallback: grab any visible paragraph text inside the post
    const paragraphs = [...postElement.querySelectorAll('span[dir], p')]
      .map(el => el.innerText.trim())
      .filter(t => t.length > 20);
    return paragraphs.join('\n').slice(0, 2000);
  }

  function extractAuthorName(postElement) {
    const selectors = [
      '.feed-shared-actor__name',
      '.update-components-actor__name',
      '.feed-shared-update-v2__actor-name',
    ];
    for (const sel of selectors) {
      const el = postElement.querySelector(sel);
      if (el) return el.innerText.trim();
    }
    return '';
  }

  // ---------------------------------------------------------------------------
  // Prompt construction
  // ---------------------------------------------------------------------------
  const TONE_INSTRUCTIONS = {
    thoughtful:  'Add nuance or a thoughtful perspective. End with a smart, open question.',
    contrarian:  'Offer respectful pushback or an alternative angle. Stay constructive.',
    storyteller: 'Share a brief personal-sounding anecdote that genuinely connects to the post.',
    tactical:    'Give one concrete, actionable tip or name a useful framework.',
  };

  function buildPrompt({ postText, author, tone, role, topics, length, draftCount, systemPrompt }) {
    const toneInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.thoughtful;
    const lengthGuide = { short: '1–2 sentences', medium: '2–4 sentences', long: '4–6 sentences' }[length] || '2–3 sentences';
    const draftsNote = draftCount > 1
      ? `Write exactly ${draftCount} distinct drafts. Separate each with three dashes (---) on its own line.`
      : 'Write one comment.';

    const contextParts = [];
    if (role)   contextParts.push(`The commenter's role: ${role}`);
    if (topics) contextParts.push(`Preferred topics: ${topics}`);
    const contextBlock = contextParts.length ? contextParts.join('\n') + '\n' : '';

    const sys = systemPrompt ||
      'You write sharp, human LinkedIn comments. No fluff, no hashtags, no em dashes, no "Great post!" openers.';

    const user = [
      contextBlock,
      `Post by ${author || 'someone'}:`,
      '"""',
      postText.slice(0, 1500),
      '"""',
      '',
      `Tone: ${toneInstruction}`,
      `Length: ${lengthGuide}.`,
      draftsNote,
      'Reply with only the comment text. No preamble.',
    ].join('\n');

    return { systemPrompt: sys, userPrompt: user };
  }

  // ---------------------------------------------------------------------------
  // Main generate function
  // ---------------------------------------------------------------------------
  async function generate({ postElement, tone, settings }) {
    const postText = extractPostText(postElement);
    if (!postText) throw new Error('Could not find post text.');

    const author = extractAuthorName(postElement);
    const draftCount = parseInt(settings.draftCount, 10) || 1;

    const { systemPrompt, userPrompt } = buildPrompt({
      postText, author, tone,
      role:       settings.role,
      topics:     settings.topics,
      length:     settings.length,
      draftCount,
      systemPrompt: settings.systemPrompt,
    });

    const raw = await Providers.call({
      endpoint:   settings.endpoint,
      apiKey:     settings.apiKey,
      model:      settings.model,
      systemPrompt,
      userPrompt,
      maxTokens: 1024,
    });

    return parseResponse(raw, draftCount);
  }

  // ---------------------------------------------------------------------------
  // Settings helpers
  // ---------------------------------------------------------------------------
  async function loadSettings() {
    return new Promise(resolve => {
      chrome.storage.sync.get({
        endpoint:     '',
        apiKey:       '',
        model:        '',
        systemPrompt: '',
        role:         '',
        topics:       '',
        length:       'medium',
        draftCount:   '2',
      }, resolve);
    });
  }

  async function saveSettings(data) {
    return new Promise(resolve => chrome.storage.sync.set(data, resolve));
  }

  return { generate, loadSettings, saveSettings, parseResponse };
})();

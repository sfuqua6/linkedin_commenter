// providers.js — AI adapters. Each adapter exposes a single async call(prompt, opts) method.
// Supports any OpenAI-compatible endpoint, Anthropic, and Ollama.

const Providers = (() => {

  // Default endpoints and their suggested models
  const ENDPOINTS = {
    anthropic: 'https://api.anthropic.com/v1/messages',
    openai:    'https://api.openai.com/v1/chat/completions',
    ollama:    'http://localhost:11434/v1/chat/completions',
    deepseek:  'https://api.deepseek.com/v1/chat/completions',
  };

  const MODEL_DEFAULTS = {
    'https://api.openai.com/v1/chat/completions':   'gpt-4o-mini',
    'https://api.anthropic.com/v1/messages':        'claude-haiku-4-5-20251001',
    'https://api.deepseek.com/v1/chat/completions': 'deepseek-chat',
    'http://localhost:11434/v1/chat/completions':    'llama3.2',
  };

  // Detect if the endpoint is Anthropic's messages API
  function isAnthropic(endpoint) {
    return endpoint && endpoint.includes('api.anthropic.com');
  }

  // Resolve model: use explicit model, or fall back to default for known endpoints
  function resolveModel(endpoint, model) {
    if (model) return model;
    return MODEL_DEFAULTS[endpoint] || '';
  }

  // Call Anthropic Messages API
  async function callAnthropic({ endpoint, apiKey, model, systemPrompt, userPrompt, maxTokens = 1024, signal }) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt || undefined,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      signal,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${err}`);
    }
    const data = await res.json();
    return data.content?.map(b => b.text).join('') ?? '';
  }

  // Call any OpenAI-compatible chat completions endpoint (OpenAI, DeepSeek, Ollama, Custom)
  async function callOpenAI({ endpoint, apiKey, model, systemPrompt, userPrompt, maxTokens = 1024, signal }) {
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: userPrompt });

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
      signal,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`API error ${res.status}: ${err}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  }

  // Unified call — routes to the right adapter based on endpoint
  async function call({ endpoint, apiKey, model, systemPrompt, userPrompt, maxTokens, signal }) {
    if (!endpoint) throw new Error('No API endpoint configured.');

    const resolvedModel = resolveModel(endpoint, model);
    if (!resolvedModel) throw new Error('No model configured. Click the extension icon to set one up.');

    const opts = { endpoint, apiKey, model: resolvedModel, systemPrompt, userPrompt, maxTokens, signal };

    if (isAnthropic(endpoint)) {
      return callAnthropic(opts);
    }
    return callOpenAI(opts);
  }

  return { call, ENDPOINTS, MODEL_DEFAULTS };
})();

// providers.js — AI adapters. Each adapter exposes a single async call(prompt, opts) method.
// Supports any OpenAI-compatible endpoint, Anthropic, and Ollama.

const Providers = (() => {

  // Default endpoints
  const ENDPOINTS = {
    anthropic: 'https://api.anthropic.com/v1/messages',
    openai:    'https://api.openai.com/v1/chat/completions',
    ollama:    'http://localhost:11434/v1/chat/completions',
    deepseek:  'https://api.deepseek.com/v1/chat/completions',
  };

  // Detect if the endpoint is Anthropic's messages API
  function isAnthropic(endpoint) {
    return endpoint && endpoint.includes('api.anthropic.com');
  }

  // Call Anthropic Messages API
  async function callAnthropic({ endpoint, apiKey, model, systemPrompt, userPrompt, maxTokens = 1024 }) {
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
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${err}`);
    }
    const data = await res.json();
    return data.content?.map(b => b.text).join('') ?? '';
  }

  // Call any OpenAI-compatible chat completions endpoint (OpenAI, DeepSeek, Ollama, Custom)
  async function callOpenAI({ endpoint, apiKey, model, systemPrompt, userPrompt, maxTokens = 1024 }) {
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: userPrompt });

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`API error ${res.status}: ${err}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  }

  // Unified call — routes to the right adapter based on endpoint
  async function call({ endpoint, apiKey, model, systemPrompt, userPrompt, maxTokens }) {
    if (!endpoint) throw new Error('No API endpoint configured.');
    if (!model)    throw new Error('No model configured.');

    if (isAnthropic(endpoint)) {
      return callAnthropic({ endpoint, apiKey, model, systemPrompt, userPrompt, maxTokens });
    }
    return callOpenAI({ endpoint, apiKey, model, systemPrompt, userPrompt, maxTokens });
  }

  return { call, ENDPOINTS };
})();

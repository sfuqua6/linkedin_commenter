#!/usr/bin/env node
// mock-server.js — Fake OpenAI-compatible API for testing Comment Engine
// No dependencies. Run: node test/mock-server.js
//
// Returns canned responses so you can test the full extension flow
// without any API key, GPU, or real model.

const http = require('http');

const PORT = 11434;

const CANNED = {
  thoughtful: [
    'The real unlock here isn\'t the framework itself — it\'s the forcing function it creates for cross-team alignment. I\'ve seen orgs adopt similar approaches and the biggest win was always the shared vocabulary, not the process. What\'s been the hardest part of getting buy-in from the skeptics on your team?',
    'This resonates. The gap between "knowing" a best practice and actually internalizing it is massive. I spent two years coaching teams on this exact pattern before it clicked that the bottleneck was never knowledge — it was psychological safety to experiment. Have you found ways to accelerate that shift?',
  ],
  contrarian: [
    'I\'d push back slightly here — this works beautifully in orgs with strong engineering culture, but I\'ve watched it backfire in teams where the underlying trust isn\'t there yet. The tool becomes a surveillance mechanism instead of an enablement one. Worth stress-testing against your org\'s actual dynamics before going all-in.',
  ],
  storyteller: [
    'This reminds me of a project I led three years ago where we tried the exact opposite approach. Total disaster for the first quarter — shipping velocity dropped 40%. But by month six, our incident rate was near zero and the team was actually enjoying their work again. Sometimes the "slow" path is the fast one.',
  ],
  tactical: [
    'One concrete move: run a 30-minute "assumption audit" before your next planning cycle. List every belief driving your roadmap, then tag each as validated (data exists), assumed (no data), or inherited (someone said it once). Teams I\'ve worked with typically find 60% are inherited. That\'s your leverage.',
  ],
};

function pickResponse(body) {
  const userMsg = (body.messages || []).find(m => m.role === 'user');
  const text = userMsg?.content || '';

  // Detect tone from the prompt
  for (const [tone, responses] of Object.entries(CANNED)) {
    if (text.toLowerCase().includes(tone)) {
      return responses[Math.floor(Math.random() * responses.length)];
    }
  }

  // Multi-draft response (if prompt asks for multiple drafts)
  if (text.includes('distinct drafts') || text.includes('---')) {
    return 'Draft 1: Interesting framing. The part that stands out is the emphasis on iteration speed over iteration quality — in my experience those aren\'t as opposed as they seem.\n---\nDraft 2: This maps closely to what I\'ve seen in platform teams that successfully transitioned from project-mode to product-mode. The key inflection point was when they stopped measuring output and started measuring adoption.';
  }

  // Default single response
  return CANNED.thoughtful[0];
}

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /v1/models
  if (req.url === '/v1/models' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      data: [{ id: 'mock-model', object: 'model', owned_by: 'test' }],
    }));
    return;
  }

  // POST /v1/chat/completions
  if (req.url === '/v1/chat/completions' && req.method === 'POST') {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      let body;
      try {
        body = JSON.parse(data);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }

      console.log(`[mock] model=${body.model} messages=${body.messages?.length}`);

      const content = pickResponse(body);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        id: 'chatcmpl-mock-' + Date.now(),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: body.model || 'mock-model',
        choices: [{
          index: 0,
          message: { role: 'assistant', content },
          finish_reason: 'stop',
        }],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      }));
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\nMock API server running at http://localhost:${PORT}/v1/chat/completions`);
  console.log('Set this as your endpoint in Comment Engine (Ollama preset works).\n');
  console.log('Canned tones: thoughtful, contrarian, storyteller, tactical');
  console.log('Press Ctrl+C to stop.\n');
});

#!/usr/bin/env node
// parse.test.js — Unit tests for Engine.parseResponse / splitDrafts
// Run: node test/parse.test.js
// No dependencies required.

// Load engine.js in a minimal browser-like env
const fs = require('fs');
const vm = require('vm');

// Stub browser globals so engine.js loads cleanly
const sandbox = vm.createContext({
  chrome: {
    storage: {
      local: { get: () => {}, set: () => {} },
    },
  },
  fetch: async () => ({}),
  console,
});

// Load source files — rewrite `const X =` to `var X =` so they leak onto the context
function loadInSandbox(file) {
  const code = fs.readFileSync(file, 'utf-8').replace(/^const (\w+) =/m, 'var $1 =');
  vm.runInContext(code, sandbox);
}
loadInSandbox('src/providers.js');
loadInSandbox('src/engine.js');

const { parseResponse } = sandbox.Engine;

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${e.message}`);
  }
}

function eq(actual, expected, msg = '') {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg}\n        expected: ${e}\n        got:      ${a}`);
}

// ── Single draft ──

console.log('\n── Single draft ──');

test('plain text returned as-is', () => {
  eq(parseResponse('Hello world'), ['Hello world']);
});

test('leading/trailing whitespace trimmed', () => {
  eq(parseResponse('  Hello world  \n'), ['Hello world']);
});

test('first char preserved on simple response', () => {
  const r = parseResponse('The key insight here is alignment.');
  eq(r[0][0], 'T', 'first char should be T');
});

test('first char preserved after think block', () => {
  const r = parseResponse('<think>reasoning here</think>Actually, the real point is...');
  eq(r[0][0], 'A', 'first char should be A');
});

test('first char preserved after thinking block', () => {
  const r = parseResponse('<thinking>deep thought</thinking>Bold take on this.');
  eq(r[0][0], 'B', 'first char should be B');
});

test('first char preserved after reasoning block', () => {
  const r = parseResponse('<reasoning>analysis</reasoning>Consider the alternative.');
  eq(r[0][0], 'C', 'first char should be C');
});

test('think block with newline before content', () => {
  const r = parseResponse('<think>stuff</think>\nThe answer is clear.');
  eq(r, ['The answer is clear.']);
});

test('multiple thinking blocks stripped', () => {
  const r = parseResponse('<think>a</think><thinking>b</thinking>Real content.');
  eq(r, ['Real content.']);
});

test('empty think block', () => {
  const r = parseResponse('<think></think>Yes.');
  eq(r, ['Yes.']);
});

// ── Multi-draft: header split ──

console.log('\n── Multi-draft: header split ──');

test('Draft N: headers split correctly', () => {
  const r = parseResponse('Draft 1: First take.\nDraft 2: Second take.', 2);
  eq(r.length, 2);
  eq(r[0], 'First take.');
  eq(r[1], 'Second take.');
});

test('first char of each draft preserved with headers', () => {
  const r = parseResponse('Draft 1: Alpha point.\nDraft 2: Beta point.', 2);
  eq(r[0][0], 'A', 'first draft starts with A');
  eq(r[1][0], 'B', 'second draft starts with B');
});

test('Option N: headers work too', () => {
  const r = parseResponse('Option 1: Foo bar.\nOption 2: Baz qux.', 2);
  eq(r.length, 2);
  eq(r[0][0], 'F');
});

test('Comment N: headers work', () => {
  const r = parseResponse('Comment 1: Hello.\nComment 2: World.', 2);
  eq(r.length, 2);
});

test('Draft header with think block before it', () => {
  const r = parseResponse('<think>ok</think>Draft 1: Alpha.\nDraft 2: Beta.', 2);
  eq(r.length, 2);
  eq(r[0][0], 'A');
  eq(r[1][0], 'B');
});

// ── Multi-draft: HR split ──

console.log('\n── Multi-draft: HR split ──');

test('--- separator splits correctly', () => {
  const r = parseResponse('First draft here.\n---\nSecond draft here.', 2);
  eq(r.length, 2);
  eq(r[0], 'First draft here.');
  eq(r[1], 'Second draft here.');
});

test('first char preserved with --- split', () => {
  const r = parseResponse('Alpha.\n---\nBeta.', 2);
  eq(r[0][0], 'A');
  eq(r[1][0], 'B');
});

test('long dash separator', () => {
  const r = parseResponse('First.\n──────\nSecond.', 2);
  eq(r.length, 2);
});

test('HR split after think block', () => {
  const r = parseResponse('<think>x</think>First.\n---\nSecond.', 2);
  eq(r.length, 2);
  eq(r[0][0], 'F');
});

// ── Multi-draft: blank line split ──

console.log('\n── Multi-draft: blank line split ──');

test('double blank line splits', () => {
  const r = parseResponse('First draft.\n\nSecond draft.', 2);
  eq(r.length, 2);
  eq(r[0], 'First draft.');
  eq(r[1], 'Second draft.');
});

test('first char preserved with blank-line split', () => {
  const r = parseResponse('Absolutely right.\n\nBut consider this.', 2);
  eq(r[0][0], 'A');
  eq(r[1][0], 'B');
});

// ── Edge cases: potential first-char bugs ──

console.log('\n── Edge cases ──');

test('response starting with a quote char', () => {
  const r = parseResponse('"This is a quoted comment."');
  eq(r[0][0], '"', 'first char should be quote');
});

test('response starting with number', () => {
  const r = parseResponse('1 thing stands out here.');
  eq(r[0][0], '1');
});

test('response with only whitespace before content', () => {
  const r = parseResponse('\n\n  The real insight is here.');
  eq(r, ['The real insight is here.']);
});

test('numbered list that looks like drafts but isnt', () => {
  const r = parseResponse('1. First point\n2. Second point\n3. Third point');
  // Should NOT split since these aren't draft/option/comment headers
  eq(r.length, 1);
});

test('response is just the comment, no wrapper', () => {
  const raw = 'Interesting framing. The emphasis on speed over quality is a false dichotomy in my experience.';
  const r = parseResponse(raw);
  eq(r[0], raw);
});

test('Draft 1: with no space after colon', () => {
  const r = parseResponse('Draft 1:Alpha.\nDraft 2:Beta.', 2);
  eq(r.length, 2);
  eq(r[0], 'Alpha.');
  eq(r[1], 'Beta.');
});

test('think block that contains draft-like text', () => {
  const r = parseResponse('<think>Draft 1: this is reasoning</think>Actual comment.');
  eq(r, ['Actual comment.']);
});

test('DeepSeek-R1 style response with long think block', () => {
  const think = '<think>' + 'x'.repeat(500) + '</think>';
  const r = parseResponse(think + 'The real answer.');
  eq(r, ['The real answer.']);
  eq(r[0][0], 'T');
});

// ── Summary ──

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);

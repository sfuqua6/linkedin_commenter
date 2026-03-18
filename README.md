# Comment Engine

Draft sharp LinkedIn comments. Bring your own AI.

## Install

1. Download and unzip `comment-engine.zip`
2. Open `chrome://extensions` in Chrome
3. Toggle on **Developer mode** (top right)
4. Click **Load unpacked** → select the unzipped `linkedin-comment-engine` folder
5. Pin the diamond icon in your toolbar

## Configure

Click the extension icon → pick a provider → enter your key → save.

| Provider | Key format | Notes |
|---|---|---|
| Anthropic | `sk-ant-...` | console.anthropic.com |
| OpenAI | `sk-...` | platform.openai.com |
| Ollama | none | Must be running locally |
| Custom | optional | Any OpenAI-compatible endpoint |

## Use

1. Open linkedin.com/feed
2. Each post gets a small **Draft** button in the action bar
3. Click it → pick a tone → hit generate
4. **Paste** drops the text into LinkedIn's comment box. **Copy** puts it on your clipboard.

## Tones

- **Thoughtful** — adds nuance, asks a smart question
- **Contrarian** — respectful pushback, alternative angle
- **Storyteller** — brief personal anecdote that connects
- **Tactical** — concrete tip or framework

## Advanced settings

Click "advanced settings" in the popup to configure:

- **System prompt** — set your voice and persona
- **Your role** — so comments sound like you
- **Your topics** — keeps comments in your lane
- **Length and draft count** — control output shape

## Architecture

The extension is modular. Three layers, each works independently:

```
content.js  — UI layer. Injects buttons, manages modal, renders results.
engine.js   — Core logic. Post extraction, prompt building, response parsing.
providers.js — AI adapters. Each provider is a self-contained module.
```

The AI provider is a plug-in. Remove `providers.js` entirely and the UI still loads — it just shows "no provider configured." Swap in a different AI backend by adding an adapter to the `adapters` object in `providers.js`.

## Privacy

All API calls go directly from your browser to the AI provider. Nothing is proxied, logged, or sent anywhere else. Your API key lives in Chrome's sync storage.

# Comment Engine

Draft sharp LinkedIn comments. Bring your own AI.

## Install

1. Download and unzip `comment-engine.zip`
2. Open `chrome://extensions` in Chrome
3. Toggle on **Developer mode** (top right)
4. Click **Load unpacked** → select the unzipped `linkedin-comment-engine` folder
5. Pin the diamond icon in your toolbar

## Configure

Click the extension icon. The **Advanced settings** gear link is at the top of the popup if you want to set your voice first.

To connect a model, fill in three fields:

| Field | What to enter |
|---|---|
| **Endpoint URL** | Your provider's API URL. Use a preset chip or paste any URL. |
| **Model** | The model name, e.g. `gpt-4o-mini`, `claude-haiku-4-5-20251001`, `deepseek-chat`, `llama3.2` |
| **API Key** | Your key (leave blank for Ollama or keyless endpoints) |

Preset chips auto-fill the endpoint and suggest a default model for OpenAI, Anthropic, DeepSeek, and Ollama. Any OpenAI-compatible endpoint works — the extension routes automatically based on the URL.

**Reasoning models** (DeepSeek R1, Anthropic extended thinking) are supported. `<think>`, `<thinking>`, and `<reasoning>` blocks are stripped before comments are shown.

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

The gear link at the **top of the popup** opens the advanced settings page:

- **System prompt** — overrides the built-in prompt entirely; set your voice and persona
- **Your role** — added to every prompt so comments sound like you
- **Your topics** — keeps comments within your areas of expertise
- **Length** — short (1–2 sentences), medium (2–4), or long (4–6)
- **Draft count** — generate 1, 2, or 3 drafts per request

## Architecture

The extension is modular. Three layers, each works independently:

```
content.js  — UI layer. Injects buttons, manages modal, renders results.
engine.js   — Core logic. Post extraction, prompt building, response parsing.
providers.js — AI adapters. Each provider is a self-contained module.
```

The provider layer auto-detects the API style from the endpoint URL — Anthropic's Messages API for `api.anthropic.com`, OpenAI-compatible chat completions for everything else. Swap in any backend by pointing to a different endpoint.

## Privacy

All API calls go directly from your browser to the AI provider. Nothing is proxied, logged, or sent anywhere else. Your API key lives in Chrome's sync storage.

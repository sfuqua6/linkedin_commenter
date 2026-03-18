# Plan: Tone System Overhaul + Prompt Enrichment

## 1. New Tone System

**Replace** the 4 hardcoded tones (Thoughtful, Contrarian, Storyteller, Tactical) with:

- **3 preset buttons**: Professional, Playful, Contrarian
- **1 custom text input**: a small text field where the user can type any tone/instruction
  (e.g. "sarcastic but kind", "ask a provocative question", "disagree politely")
- Custom input has a "Go" button (or Enter to submit)
- Preset buttons still work as one-click generate

### UI layout in the modal (content.js + content.css):
```
[ Professional ]  [ Playful ]  [ Contrarian ]
[ Type your own tone...              ] [Go]
```

### Tone instructions (engine.js):
- **Professional**: "Write a polished, credibility-building comment. Reference relevant experience or frameworks. Sound like someone worth following."
- **Playful**: "Write a warm, witty comment with personality. Use light humor or a clever observation. Be human, not corporate."
- **Contrarian**: "Offer a respectful counterpoint or an angle the author didn't consider. Stay constructive — challenge the idea, not the person."
- **Custom**: the user's raw text is passed directly as the tone instruction

## 2. Prompt Quality Improvements (engine.js)

Upgrade the system prompt and user prompt template:

**Better default system prompt:**
```
You are a LinkedIn commenter who sounds like a real human — not a bot, not a thought-leader caricature. Write comments that are specific to the post, never generic. No hashtags. No em dashes. No "Great post!" or "Love this!" openers. No bullet points. Match the energy of the original post.
```

**Better user prompt structure:**
- Add instruction to reference specific details from the post (prevents generic comments)
- Add negative examples of what NOT to do (helps small models)
- Clarify that the comment should stand alone (no @mentions, no "as [role]" disclaimers)

## 3. Settings Page: Save Custom Tones (options.html + options.js)

Add a "Saved Tones" section to the advanced settings page where users can save their favorite custom tones for quick reuse. These appear as additional buttons in the modal alongside the 3 presets.

- Store in `chrome.storage.local` as `customTones` array (max 5)
- Each is a short label + instruction string
- Simple add/remove UI — no over-engineering

## 4. README Update

- Update the Tones section to reflect the new 3 presets + custom input
- Add a "Custom tones" subsection explaining the text field and saved tones
- Update the Testing section with mock server instructions
- Fix the Privacy section (says "sync storage" — should say "local storage")

## 5. Other Enrichment Options to Consider

These are optional additions — worth discussing:

### A. Post-aware context (low effort, high value)
The prompt already extracts post text and author name. We could also extract:
- Whether the post has an image/link/article (changes comment strategy)
- The post's engagement level (visible reactions count)
- Whether the author is in the user's network (1st/2nd connection badge)

**Verdict**: Extract post type (text-only / article / image) — it's one querySelector and meaningfully changes what makes a good comment.

### B. Comment history awareness (medium effort)
Track the last N comments generated (stored locally) so the AI can avoid repeating itself. Pass as a "don't repeat these patterns" instruction.

**Verdict**: Skip for now — adds complexity for marginal gain.

### C. Re-roll button (low effort)
Add a "re-roll" / refresh button on each draft card that regenerates just that draft with the same tone.

**Verdict**: Worth adding — simple UX win. Users often want to keep one draft and re-roll another.

### D. Edit-in-place (medium effort)
Let users click on a draft to edit it before pasting.

**Verdict**: Skip — users can just paste and edit in LinkedIn's own box.

## Files Changed

1. `src/engine.js` — new tone map, improved prompts, post-type detection
2. `src/content.js` — new modal UI (3 buttons + custom input + re-roll)
3. `src/content.css` — styles for custom tone input, re-roll button
4. `src/options.html` — saved custom tones section
5. `src/options.js` — save/load/delete custom tones
6. `README.md` — updated docs
7. `test/parse.test.js` — update tests for new prompt structure
8. `comment-engine.zip` — rebuild

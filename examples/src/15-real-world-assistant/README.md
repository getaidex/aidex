# 15 — Real-World Assistant (Capstone)

**Level 9 · Capstone · Advanced · ~15 min**

## What problem does this solve?
Nothing new — this is the "wow, I understand Aidex" moment, where every
concept from levels 1-8 is composed into one small interactive
assistant instead of demonstrated in isolation.

## Why would I use this Aidex feature?
This is a synthesis, not a new feature: provider selection (03), an
optional system prompt (03), a versioned prompt template (02), the
`AIBuilder`/`AI` façade (01), a real domain engine call (`document.
summarize`, from 07), and observability timing per turn (06) — all in
one file, looping until you type `exit`.

## When should I use this in a real project?
This is the shape a real Aidex-backed CLI assistant takes: pick a
provider once, loop on user input, route some requests through
specialized engines and the rest through plain `ai.text()`, and track
timing throughout.

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` (falls back to `StubProvider` demo mode,
  same as 03-interactive-chat)

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
GEMINI_API_KEY=your-key pnpm --filter @aidex/examples real-world-assistant
```
Type `summarize` to paste text through `document.summarize`, anything
else to chat, or `exit` to quit.

## Expected output
```
Choose a provider — [1] Gemini  [2] Stub (demo):
Optional system prompt (press Enter for a sensible default):
Commands: type a request, 'summarize' to paste text to summarize, or 'exit' to quit.

You: what's a clean way to debounce a function in TypeScript?
Assistant: ...
  (took 42ms)

You: exit
Goodbye!
```

(The "Choose a provider" prompt only appears when `GEMINI_API_KEY` is set — omit the key and the demo-mode notice replaces it, same as 03-interactive-chat.)

## Concepts learned
- Nothing new by design — recognizing every piece from levels 1-8, composed
- How a real Aidex-backed assistant CLI is actually structured end to end

## Related packages
`@aidex/sdk`, `@aidex/providers`, `@aidex/prompts`, `@aidex/document`, `@aidex/observability`

## Next example
None — you've completed the course. See the master
[examples/README.md](../../README.md) for what to explore next
(`@aidex/content`, `@aidex/media`, `@aidex/cli`), or
[BUILD-YOUR-FIRST-AIDEX-APP.md](../../BUILD-YOUR-FIRST-AIDEX-APP.md) to
build your own project from scratch.

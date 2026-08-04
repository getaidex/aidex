# 03 — Interactive Chat

**Level 1 · Getting Started · Beginner · ~10 min**

## What problem does this solve?
You want a multi-turn conversation — the model should "remember" what
was said earlier in the session.

## Why would I use this Aidex feature?
This example is deliberately teaching a gap: Aidex's `ai.text(input)`
is stateless, single-shot — there is no built-in conversation/message-
history API today. Rather than hide that, this shows the standard
pattern for building one yourself: keep a transcript array client-side,
re-render it into one prompt string every turn, and re-send the whole
thing. Understanding this now means you won't go looking for a
`ai.chat()` method that doesn't exist.

## When should I use this in a real project?
Any CLI tool, bot, or support agent that needs multi-turn context.
Watch prompt length as history grows — real projects usually cap or
summarize old turns before they blow past a model's context window
(not shown here, to keep the pattern legible).

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` (falls back to `StubProvider` demo mode,
  and skips the provider-choice prompt entirely in that case)

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
GEMINI_API_KEY=your-key pnpm --filter @aidex/examples interactive-chat
```
Type `exit` or `quit` to end the session.

## Expected output
An interactive prompt loop:
```
Choose a provider — [1] Gemini  [2] Stub (demo):
Optional system prompt (press Enter to skip):
Type 'exit' or 'quit' to end the conversation.

You: what's a good name for a cat?
Assistant: ...
You: exit
Goodbye!
```

## Concepts learned
- Why `ai.text()` is single-shot and what that implies
- Client-managed conversation state over a stateless API
- Interactive CLI loop with `readline/promises`, provider selection, exit command

## Related packages
`@aidex/sdk`, `@aidex/providers`

## Next example
[04 — Custom Provider](../04-custom-provider/README.md) — implement the
`Provider` interface yourself instead of using Gemini/Stub.

# 20 — Build a CLI (Bonus)

**Bonus · Package Coverage · Beginner · ~5 min**

## What problem does this solve?
You want a small set of named commands dispatching to one shared `AI`
instance — some AI-backed, some not — without hand-rolling a
name-to-handler map yourself.

## Why would I use this Aidex feature?
`CLI` holds one `AI` and a name→command map, auto-registering `"text"`
and `"version"` at construction. `cli.register({name, execute(ai, input)})`
adds more — as a plain object, not a special type, since `Command`
isn't even exported from the package. `cli.execute(name, input)`
dispatches by name and throws a clear error for an unknown one.

## When should I use this in a real project?
A small internal tool or script with a handful of named operations
where some need the AI and some don't — not a public terminal command
(this class has no `bin` entry; see its own README for why "CLI" here
means "command-dispatch class," not "shell executable").

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` (falls back to `StubProvider` demo mode)

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples build-a-cli
```

## Expected output
```
No GEMINI_API_KEY found — using StubProvider (demo mode).

$ cli version
  -> 0.2.1-alpha

$ cli text "Say hello to Aidex in one short sentence."
  -> stub:Say hello to Aidex in one short sentence.

$ cli uppercase "shout this"
  -> SHOUT THIS

$ cli summarize "Aidex is a modular, provider-agnostic AI application platform with a frozen kernel and composable feature packages."
  -> stub:Summarize in one sentence: Aidex is a modular, provider-agnostic AI application platform with a frozen kernel and composable feature packages.

Unknown command correctly rejected: Unknown command: "does-not-exist"
```

## Concepts learned
- `CLI`'s constructor auto-registering built-in commands, plus `register()` for custom ones
- Commands as plain objects (structural typing) rather than an imported type
- Not every registered command needs to touch the `AI` instance it's handed

## Related packages
`@aidex/cli`, `@aidex/sdk`

## Next example
None — this is the last bonus example. See the master
[examples/README.md](../../README.md) for the full course.

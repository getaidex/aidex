# @aidex/cli

The executable interface to Aidex — the first real application built on
`@aidex/sdk`, proving the SDK can be consumed end to end. **It contains no AI
logic.** Every command is a one-line delegation to the SDK; the CLI itself
never builds a prompt, never touches a provider, and never makes a decision
about what to ask a model.

## Contents

- **`CLI`** — holds exactly one `AI` instance, registers commands, and
  executes them by name. At construction it auto-registers the two built-in
  commands, `"text"` and `"version"`, so `new CLI(ai, version)` is
  immediately usable:
  ```ts
  const cli = new CLI(ai, '1.0.0');
  await cli.execute('text', 'hello');   // → delegates to ai.text('hello')
  await cli.execute('version');         // → '1.0.0'
  ```
  `cli.register(command)` also accepts additional custom commands — any
  object matching `{ name: string; execute(ai, input): Promise<string> }` —
  for extensibility beyond the two built-ins.
- **`commands/TextCommand`** — `execute(ai, input)` returns
  `await ai.text(input)`. Nothing more.
- **`commands/VersionCommand`** — returns a version string injected at
  construction (`new VersionCommand('1.0.0')`). No filesystem or
  `package.json` lookup of any kind.

Both commands, and the `Command` interface they implement, are internal to
this package — the public API is `CLI` alone.

## Rules this package follows

- **No AI logic.** `CLI` never calls `ai.text()`/`ai.execute()` itself —
  only a registered `Command` does, once dispatched to by name.
- **No provider, kernel, strategy, or plugin imports.** The only import
  anywhere in `src/` (excluding tests) is `import type { AI } from '@aidex/sdk'`.
- **Composition only.** `CLI` holds an `AI` instance and a `Map` of
  commands; commands are plain classes implementing an interface, never
  extending a base class. No inheritance anywhere in this package.
- No singleton, no global mutable state — every `CLI` instance owns its own
  command registry.

## Dependency direction

`@aidex/cli` depends on `@aidex/sdk` only. `@aidex/providers` is a
devDependency used solely by this package's tests (`StubProvider`, to build
a real `AI` via `AIBuilder`).

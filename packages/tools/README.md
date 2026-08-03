# @aidex/tools

A central registry providing reusable tools for engines: register once,
discover by id or by required permission, execute by id with permission
validation gating every call.

## Contents

- **`types/Tool`** — `{ id, name, description, permissions?, inputSchema?,
  execute(input): Promise<TResult> }`. `permissions` declares what a caller
  must have been granted before `execute()` runs. `inputSchema` is
  forward-compatible plumbing for future MCP (Model Context Protocol)
  compatibility — MCP describes tools by name/description/a JSON-Schema
  input shape, so carrying an optional JSON-Schema-shaped object today means
  a future MCP adapter can expose these tools without this package
  changing. No MCP transport or handshake is implemented — that's genuinely
  future work, not simulated here.
- **`registry/ToolRegistry`** — `register()`, `has()`, `get()`, `list()`
  (discovery: every tool), `listByPermission(permission)` (discovery:
  tools requiring a given permission), `execute(id, input,
  grantedPermissions?)`. Duplicate `id` registration throws `@aidex/core`'s
  own `DuplicateRegistrationError` (reused, not reimplemented).
- **`ToolNotFoundError`** — thrown by `execute()` for an unregistered id.
  `has()`/`get()` stay plain accessors, matching every other registry in
  this codebase.
- **`ToolPermissionDeniedError`** — thrown by `execute()` when
  `grantedPermissions` doesn't cover every permission the tool declares as
  required. Carries `missingPermissions` — exactly what's absent, not the
  full required set. The tool's own `execute()` is never called when this
  check fails.

## Permission validation

`execute(id, input, grantedPermissions = [])` compares the tool's declared
`permissions` against `grantedPermissions` (a flat list of permission name
strings) before invoking the tool. A tool declaring no `permissions` runs
unconditionally regardless of what's granted.

## Dependency direction

`@aidex/tools` depends on `@aidex/core` only (`DuplicateRegistrationError`,
reused). No dependency on `@aidex/engines`, any provider, strategy, plugin,
or application code — tools are meant to be reusable by engines, not
coupled to any one of them.

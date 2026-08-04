# 13 — Tool Registry

**Level 7 · Plugins · Intermediate · ~5 min**

## What problem does this solve?
A tool that takes a real action (sending email, calling a paid API)
shouldn't run just because it's registered — the caller needs to prove,
per call, that they're allowed to invoke it.

## Why would I use this Aidex feature?
`ToolRegistry.execute(id, input, grantedPermissions)` checks the
caller-supplied permissions against the tool's declared `permissions`
at the moment of execution — there's no separate grant/revoke API to
get out of sync with reality.

## When should I use this in a real project?
Any tool with side effects your application doesn't want triggered
unconditionally — gate it by permission and pass exactly what the
current caller/context is allowed to use.

## Requirements
- Node ≥18, pnpm — no API key needed, purely local.

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples tool-registry
```

## Expected output
```
Executing with the required permission granted:
  Email sent to ops@example.com: "Deploy complete"

Executing WITHOUT the required permission:
  Denied, as expected: missing permissions [email:send]
```

## Concepts learned
- `Tool.permissions` + `ToolRegistry.execute(id, input, granted)`
- `ToolPermissionDeniedError` and its `missingPermissions` field

## Related packages
`@aidex/tools`

## Next example
[14 — Custom Engine](../14-custom-engine/README.md) — the flagship
closing example: build and register your own engine through the modern
SDK façade.

# 08 — Resume Analyzer

**Level 3 · Documents · Intermediate · ~10 min**

## What problem does this solve?
You want a structured read on a resume — skills, experience, and how
well it matches a specific role — instead of skimming it manually.

## Why would I use this Aidex feature?
`resume.analyze` is a single-purpose engine with a fixed output
contract: `{candidateName?, skills, experienceYears?, summary?,
matchScore?}`. Supplying an optional `jobDescription` alongside the
resume gets you `matchScore` (0-100); omit it and that field is simply
left unset — there's no separate call needed for "with vs. without a
target role."

## When should I use this in a real project?
Early-stage resume triage against a specific job posting — this
produces a structured signal to sort/filter candidates, not a final
hiring decision.

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` (falls back to a demo provider returning a
  canned analysis)

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples resume-analyzer
```

## Expected output
```
Candidate: Jordan Rivera
Experience: 6 years
Skills: TypeScript, Node.js, Go, Kafka, Kubernetes
Summary: Backend engineer with strong distributed-systems and event-driven architecture background.
Match score against job description: 82/100 (only populated when a jobDescription is supplied — omit it and this stays unset)
```

## Concepts learned
- `resume.analyze`'s real (verified) output contract — not a wishlist
- Optional input fields that gate optional output fields (`jobDescription` → `matchScore`)
- Why example code should be checked against actual engine behavior, not assumed field names

## Related packages
`@aidex/document`, `@aidex/sdk`

## Next example
[09 — Brand Kit Generator](../09-brand-kit-generator/README.md) — a
different feature package, `@aidex/design`.

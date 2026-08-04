# 07 — Document Intelligence

**Level 3 · Documents · Intermediate · ~10 min**

## What problem does this solve?
You have real business documents (contracts, invoices) and need
structured information out of them — key fields, a summary, a
classification, keywords, or a risk review — without hand-writing a
prompt from scratch each time.

## Why would I use this Aidex feature?
`@aidex/document` bundles these as ready-made engines behind one
feature package (`DOCUMENT_FEATURE_PACKAGE`), registered in one call via
`AIBuilder.use()`. Each engine has a fixed input/output contract, so
your application code calls `ai.engine(id).execute(input)` and gets a
typed, predictable result — not a paragraph you have to re-parse.

## When should I use this in a real project?
Any pipeline ingesting text documents that need structured downstream
handling — invoice processing, contract review queues, document
classification/routing.

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` (falls back to a demo provider returning
  canned JSON matching the chosen operation's schema)

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples document-intelligence
```
Follow the prompts to pick an operation and a fixture document.

## Expected output
JSON matching the chosen engine's result type, e.g. for "Review":
```json
{
  "findings": [
    {
      "issue": "No notice period required for termination",
      "severity": "high",
      "recommendation": "Add a minimum 30-day written notice requirement for either party."
    }
  ],
  "summary": "One high-severity gap found in termination terms."
}
```

## Concepts learned
- Feature packages: `AIBuilder.use(DOCUMENT_FEATURE_PACKAGE)` registers
  many engines in one call
- `ai.engine(id).execute(input)` — the façade call surface
- Why every document engine requires `mimeType` starting with `text/`,
  and why `document.ocr` is off-limits (not implemented)
- `document.summarize` is the one exception that returns plain text, not JSON

## Related packages
`@aidex/document`, `@aidex/sdk`, `@aidex/providers`

## Next example
[08 — Resume Analyzer](../08-resume-analyzer/README.md) — one focused
document engine, `resume.analyze`, in depth.

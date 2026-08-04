# 10 — Marketing Campaign

**Level 5 · Marketing · Intermediate · ~10 min**

## What problem does this solve?
Launching something needs several coordinated pieces of copy — an
email, a social post, SEO keywords, a campaign plan — usually written
one at a time, inconsistently.

## Why would I use this Aidex feature?
`@aidex/marketing`'s engines share one brief format (`{brief,
targetAudience?}`), so the same one-sentence description drives all
four outputs, assembled here into one packet.

## When should I use this in a real project?
Fast first-draft campaign collateral for a product launch or feature
announcement — a starting point for a marketer to edit, not
publish-ready copy.

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` (falls back to a demo provider with canned
  campaign JSON)

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples marketing-campaign
```

## Expected output
Prompts for a one-sentence brief, then prints an email (subject +
body), a social caption, SEO keywords with volume/difficulty, and a
campaign plan with objectives and a summary.

## Concepts learned
- Composing multiple engines from one feature package around a shared brief
- `marketing.campaign.plan`'s `channels` field is echoed from your input, not model-generated — read the source, not just the name, before trusting a field
- Consistent "assemble a packet" pattern, same shape as 09-brand-kit-generator

## Related packages
`@aidex/marketing`, `@aidex/sdk`

## Next example
[11 — Workflow Orchestration](../11-workflow-orchestration/README.md) —
chain engines together with real data dependencies between steps.

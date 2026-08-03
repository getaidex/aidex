# Security Policy

## Project status

Aidex is pre-release (`v0.1.0-alpha`). Every package in this workspace is
currently `"private": true` — nothing is published to any registry yet. This
limits the practical blast radius of most findings, but the codebase is
public and a vulnerability is worth reporting even before a first public
release — including in `@aidex/providers`' handling of API keys/credentials
passed to `GeminiProvider`, since that's the one package in this repository
that makes real outbound network calls to a third-party API today.

## Supported Versions

No version is under long-term security support yet. Until a stable `1.0.0` is
released, only the latest commit on `main` is supported — please report
findings against `main`, not against a specific alpha tag.

| Version | Supported |
| --- | --- |
| `main` (latest) | ✅ |
| Any tagged pre-release (`v0.x.y-alpha`, etc.) | ❌ — upgrade to `main` first |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Instead, email **isudheerbabu.dev@gmail.com** with:

- A description of the vulnerability and its potential impact.
- Steps to reproduce, or a minimal proof-of-concept if possible.
- The commit SHA or version you tested against.

You should receive an acknowledgment within a few days. This is a small,
early-stage project without a dedicated security team, so response times
won't match a large open-source foundation's SLA — but every report will be
read and taken seriously.

## What counts as in scope

- **`packages/core`** — the kernel's public API, lifecycle, registries, and
  type contracts.
- **`packages/providers`** — API key/credential handling in `GeminiProvider`,
  error translation that could leak sensitive data from a vendor error into
  a log or response, and any issue in how it constructs or calls the
  `@google/genai` SDK.
- **Any other package** (`strategies`, `plugins`, `engines`, `prompts`,
  `tools`, `workflow`, `memory`, `observability`, `evaluation`, `sdk`,
  `adapters`, `cli`) — logic errors with security consequences, e.g. a
  `ToolRegistry` permission check that can be bypassed, or a `PromptRegistry`
  template-rendering path that doesn't escape/validate correctly.
- Supply-chain concerns: dependencies (including `@google/genai`) and the
  workspace's own tooling configuration (`package.json`, `tsconfig.json`,
  `eslint.config.js`, `vitest.config.ts`, `.github/workflows/`).

Classic application-level vulnerability classes (auth bypass, stored
injection against a real datastore, etc.) mostly don't apply yet — Aidex
ships no database, no HTTP server, and no multi-tenant auth model itself
(see [`docs/roadmap/roadmap.md`](docs/roadmap/roadmap.md)). Prompt-injection-
style concerns are still relevant wherever a `Strategy`/`Provider` handles
untrusted input, even at this stage.

## Disclosure

Please give us a reasonable window to address a confirmed vulnerability before
any public disclosure. We'll coordinate a disclosure timeline with you once a
report is confirmed.

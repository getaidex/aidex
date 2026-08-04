#!/usr/bin/env node
'use strict';

// This monorepo uses pnpm's `workspace:*` protocol for every internal
// @aidex/* dependency. npm and yarn don't understand that protocol — they
// either fail outright or (worse, for `npm publish`/`npm pack`) ship the
// literal, unresolved string "workspace:*" into the published tarball. Only
// pnpm rewrites it to the real resolved version at publish time. This guard
// fails loudly before either of those things can happen silently.
const userAgent = process.env.npm_config_user_agent || '';

if (!userAgent.includes('pnpm')) {
  console.error(
    [
      '',
      'This repository is pnpm-only.',
      `You ran this with: ${userAgent || 'an unknown package manager'}`,
      '',
      'Use `pnpm install` (not npm/yarn) to install dependencies, and',
      '`pnpm publish` / `pnpm -r publish` (not `npm publish`) to publish —',
      'npm/yarn do not rewrite this monorepo\'s internal "workspace:*"',
      'dependency ranges, so anything installed or published with them',
      'will be broken.',
      '',
    ].join('\n')
  );
  process.exit(1);
}

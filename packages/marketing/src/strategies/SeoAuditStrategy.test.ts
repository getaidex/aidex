import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { SEO_AUDIT_PROMPT } from '../prompts/seoAuditPrompt.js';
import { SeoAuditStrategy } from './SeoAuditStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(SEO_AUDIT_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const VALID_RESPONSE = JSON.stringify({
  score: 78,
  findings: [{ issue: 'Missing alt text', severity: 'low', recommendation: 'Add alt text to images.' }],
});

describe('SeoAuditStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new SeoAuditStrategy(makePrompts());
    expect(strategy.name).toBe('marketing-seo-audit');
    expect(strategy.version).toBe('1.0.0');
  });

  it('has no brief requirement — url alone is enough', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new SeoAuditStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { url: 'https://example.test' } },
      makeContext(provider)
    );

    expect(result.score).toBe(78);
    expect(result.findings).toEqual([
      { issue: 'Missing alt text', severity: 'low', recommendation: 'Add alt text to images.' },
    ]);
  });

  it('defaults an invalid/missing severity to "medium"', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return {
          content: JSON.stringify({
            score: 50,
            findings: [{ issue: 'x', recommendation: 'y' }],
          }),
        };
      },
    };
    const strategy = new SeoAuditStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { url: 'https://x.test' } },
      makeContext(provider)
    );

    expect(result.findings[0]?.severity).toBe('medium');
  });

  it('rejects a request with no url', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new SeoAuditStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });

  it('throws UnparsableProviderResponseError when score is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new SeoAuditStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { url: 'https://x.test' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});

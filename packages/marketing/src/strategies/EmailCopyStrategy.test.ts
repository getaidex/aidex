import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { EMAIL_COPY_PROMPT } from '../prompts/emailCopyPrompt.js';
import { EmailCopyStrategy } from './EmailCopyStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(EMAIL_COPY_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const VALID_RESPONSE = JSON.stringify({ subject: 'Weekly digest', body: 'Here is what happened this week.' });

describe('EmailCopyStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new EmailCopyStrategy(makePrompts());
    expect(strategy.name).toBe('marketing-email-copy');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into EmailCopyResult', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new EmailCopyStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { brief: 'Weekly newsletter' } },
      makeContext(provider)
    );

    expect(result.subject).toBe('Weekly digest');
    expect(result.body).toBe('Here is what happened this week.');
  });

  it('includes an explicit callToAction in the rendered prompt', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: VALID_RESPONSE };
      },
    };
    const strategy = new EmailCopyStrategy(makePrompts());

    await strategy.execute(
      { strategy: strategy.name, input: { brief: 'x', callToAction: 'Buy now' } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('Buy now');
  });

  it('rejects a missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new EmailCopyStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });

  it('throws UnparsableProviderResponseError when subject/body are missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new EmailCopyStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});

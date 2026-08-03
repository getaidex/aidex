import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { EMAIL_SEQUENCE_PROMPT } from '../prompts/emailSequencePrompt.js';
import { EmailSequenceStrategy } from './EmailSequenceStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(EMAIL_SEQUENCE_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const VALID_RESPONSE = JSON.stringify({
  steps: [
    { subject: 'Welcome!', body: 'Thanks for joining.' },
    { subject: 'Getting started', body: 'Here is how to begin.' },
  ],
});

describe('EmailSequenceStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new EmailSequenceStrategy(makePrompts());
    expect(strategy.name).toBe('marketing-email-sequence');
    expect(strategy.version).toBe('1.0.0');
  });

  it('combines AI-generated subject/body with deterministic sendDayOffset', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new EmailSequenceStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { brief: 'Onboarding' } },
      makeContext(provider)
    );

    expect(result.steps).toEqual([
      { subject: 'Welcome!', body: 'Thanks for joining.', sendDayOffset: 0 },
      { subject: 'Getting started', body: 'Here is how to begin.', sendDayOffset: 3 },
    ]);
  });

  it('includes an explicit stepCount in the rendered prompt', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: VALID_RESPONSE };
      },
    };
    const strategy = new EmailSequenceStrategy(makePrompts());

    await strategy.execute(
      { strategy: strategy.name, input: { brief: 'x', stepCount: 5 } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('exactly 5 step');
  });

  it('rejects a missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new EmailSequenceStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });

  it('throws UnparsableProviderResponseError when steps is empty', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() { return { content: JSON.stringify({ steps: [] }) }; },
    };
    const strategy = new EmailSequenceStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});

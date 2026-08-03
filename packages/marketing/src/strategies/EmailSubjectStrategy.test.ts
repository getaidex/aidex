import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { EMAIL_SUBJECT_PROMPT } from '../prompts/emailSubjectPrompt.js';
import { EmailSubjectStrategy } from './EmailSubjectStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(EMAIL_SUBJECT_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const VALID_RESPONSE = JSON.stringify({ subjects: ["Don't miss out!", 'Flash sale inside'] });

describe('EmailSubjectStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new EmailSubjectStrategy(makePrompts());
    expect(strategy.name).toBe('marketing-email-subject');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into EmailSubjectResult', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new EmailSubjectStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { brief: 'Flash sale' } },
      makeContext(provider)
    );

    expect(result.subjects).toEqual(["Don't miss out!", 'Flash sale inside']);
  });

  it('includes an explicit variantCount in the rendered prompt', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: VALID_RESPONSE };
      },
    };
    const strategy = new EmailSubjectStrategy(makePrompts());

    await strategy.execute(
      { strategy: strategy.name, input: { brief: 'x', variantCount: 5 } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('exactly 5 variant');
  });

  it('rejects a missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new EmailSubjectStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });

  it('throws UnparsableProviderResponseError when subjects is empty', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() { return { content: JSON.stringify({ subjects: [] }) }; },
    };
    const strategy = new EmailSubjectStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});

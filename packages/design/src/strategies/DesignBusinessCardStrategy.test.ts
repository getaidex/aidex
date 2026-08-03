import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { DESIGN_BUSINESS_CARD_PROMPT } from '../prompts/designBusinessCardPrompt.js';
import { DesignBusinessCardStrategy } from './DesignBusinessCardStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(DESIGN_BUSINESS_CARD_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('DesignBusinessCardStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new DesignBusinessCardStrategy(makePrompts());
    expect(strategy.name).toBe('design-business-card');
    expect(strategy.version).toBe('1.0.0');
  });

  it('returns only a front asset when doubleSided is omitted, even if the provider supplies a back', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return { content: JSON.stringify({ frontDescription: 'Front layout', backDescription: 'Back layout' }) };
      },
    };
    const strategy = new DesignBusinessCardStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'design-business-card', input: { brief: 'Studio card' } },
      makeContext(provider)
    );

    expect(result.back).toBeUndefined();
  });

  it('returns both sides when doubleSided is true', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return { content: JSON.stringify({ frontDescription: 'Front layout', backDescription: 'Back layout' }) };
      },
    };
    const strategy = new DesignBusinessCardStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'design-business-card', input: { brief: 'x', doubleSided: true } },
      makeContext(provider)
    );

    expect(result.back).toBeDefined();
  });

  it('includes the sides request in the rendered prompt', async () => {
    const seenPrompts: string[] = [];
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) { seenPrompts.push(prompt.content); return { content: '{"frontDescription": "x"}' }; },
    };
    const strategy = new DesignBusinessCardStrategy(makePrompts());

    await strategy.execute({ strategy: 'design-business-card', input: { brief: 'x', doubleSided: true } }, makeContext(provider));
    await strategy.execute({ strategy: 'design-business-card', input: { brief: 'x' } }, makeContext(provider));

    expect(seenPrompts[0]).toContain('front and a back side');
    expect(seenPrompts[1]).toContain('single-sided card');
  });

  it('includes existing brand colors/fonts from branding in the rendered prompt', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) { seenPrompt = prompt.content; return { content: '{"frontDescription": "x"}' }; },
    };
    const strategy = new DesignBusinessCardStrategy(makePrompts());

    await strategy.execute(
      {
        strategy: 'design-business-card',
        input: { brief: 'x', branding: { colors: ['#4A2E1E'], fonts: ['Playfair Display'] } },
      },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('use these existing brand colors: #4A2E1E');
    expect(seenPrompt).toContain('reflect these existing brand fonts: Playfair Display');
  });

  it('rejects a missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DesignBusinessCardStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-business-card', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidDesignEngineInputError);
  });

  it('throws UnparsableProviderResponseError when frontDescription is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DesignBusinessCardStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-business-card', input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});

import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { DESIGN_MOCKUP_PROMPT } from '../prompts/designMockupPrompt.js';
import { DesignMockupStrategy } from './DesignMockupStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(DESIGN_MOCKUP_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('DesignMockupStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new DesignMockupStrategy(makePrompts());
    expect(strategy.name).toBe('design-mockup');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into DesignMockupResult', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() { return { content: JSON.stringify({ description: 'Logo on a phone screen' }) }; },
    };
    const strategy = new DesignMockupStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'design-mockup', input: { brief: 'x', mockupType: 'phone' } },
      makeContext(provider)
    );

    expect(decodeURIComponent(result.assetUrl.split(',')[1])).toBe('Logo on a phone screen');
    expect(result.format).toBe('png');
  });

  it('includes the mockup type in the rendered prompt', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) { seenPrompt = prompt.content; return { content: '{"description": "x"}' }; },
    };
    const strategy = new DesignMockupStrategy(makePrompts());

    await strategy.execute({ strategy: 'design-mockup', input: { brief: 'x', mockupType: 'billboard' } }, makeContext(provider));

    expect(seenPrompt).toContain('billboard mockup scene');
  });

  it('rejects a missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DesignMockupStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-mockup', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidDesignEngineInputError);
  });

  it('throws UnparsableProviderResponseError when description is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DesignMockupStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-mockup', input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});

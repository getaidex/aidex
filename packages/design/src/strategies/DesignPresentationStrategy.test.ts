import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { DESIGN_PRESENTATION_PROMPT } from '../prompts/designPresentationPrompt.js';
import { DesignPresentationStrategy } from './DesignPresentationStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(DESIGN_PRESENTATION_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('DesignPresentationStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new DesignPresentationStrategy(makePrompts());
    expect(strategy.name).toBe('design-presentation');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into a slide array', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() { return { content: JSON.stringify({ slides: ['Title slide', 'Problem slide'] }) }; },
    };
    const strategy = new DesignPresentationStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'design-presentation', input: { brief: 'Pitch deck' } },
      makeContext(provider)
    );

    expect(result.slides).toHaveLength(2);
    expect(decodeURIComponent(result.slides[0].assetUrl.split(',')[1])).toBe('Title slide');
  });

  it('includes the slide count request in the rendered prompt', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) { seenPrompt = prompt.content; return { content: '{"slides": []}' }; },
    };
    const strategy = new DesignPresentationStrategy(makePrompts());

    await strategy.execute(
      { strategy: 'design-presentation', input: { brief: 'x', slideCount: 6 } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('Generate exactly 6 slides.');
  });

  it('rejects a missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DesignPresentationStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-presentation', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidDesignEngineInputError);
  });

  it('throws UnparsableProviderResponseError when slides is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DesignPresentationStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-presentation', input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});

import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { DESIGN_TYPOGRAPHY_PROMPT } from '../prompts/designTypographyPrompt.js';
import { DesignTypographyStrategy } from './DesignTypographyStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(DESIGN_TYPOGRAPHY_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('DesignTypographyStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new DesignTypographyStrategy(makePrompts());
    expect(strategy.name).toBe('design-typography');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into DesignTypographyResult', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return {
          content: JSON.stringify({
            pairings: [{ heading: 'Playfair Display', body: 'Source Sans Pro', notes: 'Classic pairing' }],
          }),
        };
      },
    };
    const strategy = new DesignTypographyStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'design-typography', input: { brief: 'x' } },
      makeContext(provider)
    );

    expect(result.pairings).toEqual([
      { heading: 'Playfair Display', body: 'Source Sans Pro', notes: 'Classic pairing' },
    ]);
  });

  it('includes existing brand fonts from branding in the rendered prompt', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) { seenPrompt = prompt.content; return { content: '{"pairings": []}' }; },
    };
    const strategy = new DesignTypographyStrategy(makePrompts());

    await strategy.execute(
      { strategy: 'design-typography', input: { brief: 'x', branding: { fonts: ['Playfair Display'] } } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('Complement these existing brand fonts: Playfair Display.');
  });

  it('drops individual malformed pairing entries rather than failing', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return { content: JSON.stringify({ pairings: [{ heading: 'H', body: 'B' }, { heading: 'onlyHeading' }] }) };
      },
    };
    const strategy = new DesignTypographyStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'design-typography', input: { brief: 'x' } },
      makeContext(provider)
    );

    expect(result.pairings).toEqual([{ heading: 'H', body: 'B' }]);
  });

  it('rejects a missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DesignTypographyStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-typography', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidDesignEngineInputError);
  });

  it('throws UnparsableProviderResponseError when pairings is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DesignTypographyStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-typography', input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});

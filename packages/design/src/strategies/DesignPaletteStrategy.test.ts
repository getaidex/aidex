import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { DESIGN_PALETTE_PROMPT } from '../prompts/designPalettePrompt.js';
import { DesignPaletteStrategy } from './DesignPaletteStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(DESIGN_PALETTE_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('DesignPaletteStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new DesignPaletteStrategy(makePrompts());
    expect(strategy.name).toBe('design-palette');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into DesignPaletteResult', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return {
          content: JSON.stringify({
            colors: [
              { name: 'Deep Brown', hex: '#4A2E1E', role: 'primary' },
              { name: 'Gold', hex: '#D9A566', role: 'accent' },
            ],
          }),
        };
      },
    };
    const strategy = new DesignPaletteStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'design-palette', input: { brief: 'Coffee shop palette' } },
      makeContext(provider)
    );

    expect(result.colors).toHaveLength(2);
    expect(result.colors[0]).toEqual({ name: 'Deep Brown', hex: '#4A2E1E', role: 'primary' });
  });

  it('includes the color count request in the rendered prompt', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) { seenPrompt = prompt.content; return { content: '{"colors": []}' }; },
    };
    const strategy = new DesignPaletteStrategy(makePrompts());

    await strategy.execute(
      { strategy: 'design-palette', input: { brief: 'x', colorCount: 4 } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('Generate exactly 4 colors.');
  });

  it('includes existing brand colors from branding in the rendered prompt', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) { seenPrompt = prompt.content; return { content: '{"colors": []}' }; },
    };
    const strategy = new DesignPaletteStrategy(makePrompts());

    await strategy.execute(
      {
        strategy: 'design-palette',
        input: { brief: 'x', branding: { colors: ['#4A2E1E', '#D9A566'] } },
      },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('Complement these existing brand colors: #4A2E1E, #D9A566.');
  });

  it('drops individual malformed color entries rather than failing', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return { content: JSON.stringify({ colors: [{ name: 'ok', hex: '#000' }, { hex: '#111' }] }) };
      },
    };
    const strategy = new DesignPaletteStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'design-palette', input: { brief: 'x' } },
      makeContext(provider)
    );

    expect(result.colors).toEqual([{ name: 'ok', hex: '#000' }]);
  });

  it('rejects a missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DesignPaletteStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-palette', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidDesignEngineInputError);
  });

  it('throws UnparsableProviderResponseError when colors is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DesignPaletteStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-palette', input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});

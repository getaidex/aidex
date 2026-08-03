import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { DESIGN_LOGO_PROMPT } from '../prompts/designLogoPrompt.js';
import { DesignLogoStrategy } from './DesignLogoStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(DESIGN_LOGO_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('DesignLogoStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new DesignLogoStrategy(makePrompts());
    expect(strategy.name).toBe('design-logo');
    expect(strategy.version).toBe('1.0.0');
  });

  it('returns only a primary asset when the provider supplies no variants', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() { return { content: JSON.stringify({ primaryDescription: 'A bold geometric mark' }) }; },
    };
    const strategy = new DesignLogoStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'design-logo', input: { brief: 'Studio logo' } },
      makeContext(provider)
    );

    expect(decodeURIComponent(result.primary.assetUrl.split(',')[1])).toBe('A bold geometric mark');
    expect(result.variants).toBeUndefined();
  });

  it('returns variants when the provider supplies variantDescriptions', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return {
          content: JSON.stringify({
            primaryDescription: 'Primary mark',
            variantDescriptions: ['Icon-only variant', 'Monochrome variant'],
          }),
        };
      },
    };
    const strategy = new DesignLogoStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'design-logo', input: { brief: 'x', variantsCount: 2 } },
      makeContext(provider)
    );

    expect(result.variants).toHaveLength(2);
  });

  it('includes the variants request in the rendered prompt', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) { seenPrompt = prompt.content; return { content: JSON.stringify({ primaryDescription: 'x' }) }; },
    };
    const strategy = new DesignLogoStrategy(makePrompts());

    await strategy.execute(
      { strategy: 'design-logo', input: { brief: 'x', variantsCount: 3 } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('provide 3 alternate variant');
  });

  it('includes existing brand colors/fonts from branding in the rendered prompt', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) { seenPrompt = prompt.content; return { content: JSON.stringify({ primaryDescription: 'x' }) }; },
    };
    const strategy = new DesignLogoStrategy(makePrompts());

    await strategy.execute(
      {
        strategy: 'design-logo',
        input: { brief: 'x', branding: { colors: ['#4A2E1E'], fonts: ['Playfair Display'] } },
      },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('use these existing brand colors: #4A2E1E');
    expect(seenPrompt).toContain('reflect these existing brand fonts: Playfair Display');
  });

  it('rejects a missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DesignLogoStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-logo', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidDesignEngineInputError);
  });

  it('throws UnparsableProviderResponseError when primaryDescription is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DesignLogoStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-logo', input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});

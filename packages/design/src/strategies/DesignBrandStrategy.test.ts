import type { ExecutionContext, Provider } from '@aidex/core';
import { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { DESIGN_BRAND_PROMPT } from '../prompts/designBrandPrompt.js';
import { DesignBrandStrategy } from './DesignBrandStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(DESIGN_BRAND_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const VALID_RESPONSE = JSON.stringify({
  logoDescription: 'A minimalist coffee cup mark in warm brown tones',
  palette: ['#4A2E1E', '#D9A566'],
  typography: ['Playfair Display', 'Source Sans Pro'],
  guidelines: 'Use the mark on light backgrounds only.',
});

describe('DesignBrandStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new DesignBrandStrategy(makePrompts());
    expect(strategy.name).toBe('design-brand');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into DesignBrandResult', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new DesignBrandStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'design-brand', input: { brief: 'Coffee shop brand' } },
      makeContext(provider)
    );

    expect(result.logo.assetUrl).toContain('data:text/plain,');
    expect(decodeURIComponent(result.logo.assetUrl.split(',')[1])).toContain('minimalist coffee cup');
    expect(result.logo.format).toBe('svg');
    expect(result.palette).toEqual(['#4A2E1E', '#D9A566']);
    expect(result.typography).toEqual(['Playfair Display', 'Source Sans Pro']);
    expect(result.guidelines).toContain('light backgrounds');
  });

  it('includes targetAudience/style/industry in the rendered prompt when supplied', async () => {
    let seenPrompt = '';
    const provider: Provider = { name: 'inline', async generate(prompt) { seenPrompt = prompt.content; return { content: VALID_RESPONSE }; } };
    const strategy = new DesignBrandStrategy(makePrompts());

    await strategy.execute(
      {
        strategy: 'design-brand',
        input: { brief: 'x', targetAudience: 'families', style: 'playful', industry: 'retail' },
      },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('the target audience is families');
    expect(seenPrompt).toContain('use a playful style');
    expect(seenPrompt).toContain('the industry is retail');
  });

  it('honors an explicit outputFormat', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new DesignBrandStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'design-brand', input: { brief: 'x', outputFormat: 'png' } },
      makeContext(provider)
    );

    expect(result.logo.format).toBe('png');
  });

  it('rejects a missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new DesignBrandStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-brand', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidDesignEngineInputError);
  });

  it('throws UnparsableProviderResponseError when the provider returns invalid JSON', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: 'not json' }; } };
    const strategy = new DesignBrandStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-brand', input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('throws UnparsableProviderResponseError when logoDescription is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DesignBrandStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-brand', input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('records observability events when configured', async () => {
    const provider: Provider = {
      name: 'p',
      async generate() { return { content: VALID_RESPONSE, metadata: { usage: { inputTokens: 1, outputTokens: 1 } } }; },
    };
    const observability = new ObservabilityBus();
    const strategy = new DesignBrandStrategy(makePrompts(), { observability });

    await strategy.execute({ strategy: 'design-brand', input: { brief: 'x' } }, makeContext(provider));

    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'tokens']);
  });
});

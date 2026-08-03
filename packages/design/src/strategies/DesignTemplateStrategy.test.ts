import type { ExecutionContext, Provider } from '@aidex/core';
import { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { DESIGN_TEMPLATE_PROMPT } from '../prompts/designTemplatePrompt.js';
import { DesignTemplateStrategy } from './DesignTemplateStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(DESIGN_TEMPLATE_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const VALID_RESPONSE = JSON.stringify({ description: 'An event invite with a customizable headline and date' });

describe('DesignTemplateStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new DesignTemplateStrategy(makePrompts());
    expect(strategy.name).toBe('design-template');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into DesignTemplateResult, wrapping the asset', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new DesignTemplateStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'design-template', input: { brief: 'x' } },
      makeContext(provider)
    );

    expect(decodeURIComponent(result.asset.assetUrl.split(',')[1])).toBe('An event invite with a customizable headline and date');
    expect(result.asset.format).toBe('png');
    expect(result.editableFields).toBeUndefined();
  });

  it('echoes editableFields verbatim from the request, not from the AI response', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new DesignTemplateStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'design-template', input: { brief: 'x', editableFields: ['headline', 'date'] } },
      makeContext(provider)
    );

    expect(result.editableFields).toEqual(['headline', 'date']);
  });

  it('rejects a missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new DesignTemplateStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-template', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidDesignEngineInputError);
  });

  it('throws UnparsableProviderResponseError when the provider returns invalid JSON', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: 'not json' }; } };
    const strategy = new DesignTemplateStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-template', input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('throws UnparsableProviderResponseError when description is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DesignTemplateStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-template', input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('propagates a provider error and records it via observability', async () => {
    const providerError = new Error('provider unavailable');
    const provider: Provider = { name: 'p', async generate() { throw providerError; } };
    const observability = new ObservabilityBus();
    const strategy = new DesignTemplateStrategy(makePrompts(), { observability });

    await expect(
      strategy.execute({ strategy: 'design-template', input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBe(providerError);

    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'error']);
  });

  it('records observability events on success', async () => {
    const provider: Provider = {
      name: 'p',
      async generate() { return { content: VALID_RESPONSE, metadata: { usage: { inputTokens: 1, outputTokens: 1 } } }; },
    };
    const observability = new ObservabilityBus();
    const strategy = new DesignTemplateStrategy(makePrompts(), { observability });

    await strategy.execute({ strategy: 'design-template', input: { brief: 'x' } }, makeContext(provider));

    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'tokens']);
  });
});

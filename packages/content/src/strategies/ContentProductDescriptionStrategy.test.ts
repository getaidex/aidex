import type { ExecutionContext, Provider } from '@aidex/core';
import { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { StubProvider } from '@aidex/providers';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { CONTENT_PRODUCT_DESCRIPTION_PROMPT } from '../prompts/contentProductDescriptionPrompt.js';
import {
  ContentProductDescriptionStrategy,
  parseContentProductDescriptionResponse,
} from './ContentProductDescriptionStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(CONTENT_PRODUCT_DESCRIPTION_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('ContentProductDescriptionStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new ContentProductDescriptionStrategy(makePrompts());
    expect(strategy.name).toBe('content-product-description');
    expect(strategy.version).toBe('1.0.0');
  });

  it('renders the registered prompt and returns provider content as description', async () => {
    const provider = new StubProvider();
    const strategy = new ContentProductDescriptionStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'content-product-description', input: { productName: 'Wireless Mouse' } },
      makeContext(provider)
    );

    expect(result.description).toContain('Wireless Mouse');
  });

  it('folds features/tone into the rendered prompt guidance', async () => {
    let seenPrompt = '';
    const provider: Provider = { name: 'inline', async generate(prompt) { seenPrompt = prompt.content; return { content: 'ok' }; } };
    const strategy = new ContentProductDescriptionStrategy(makePrompts());

    await strategy.execute(
      {
        strategy: 'content-product-description',
        input: { productName: 'x', features: ['fast', 'quiet'], tone: 'playful' },
      },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('highlight these features: fast, quiet');
    expect(seenPrompt).toContain('use a playful tone');
  });

  it('rejects a missing productName', async () => {
    const provider = new StubProvider();
    const strategy = new ContentProductDescriptionStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'content-product-description', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidContentEngineInputError);
  });

  it('records observability events when configured', async () => {
    const provider: Provider = { name: 'p', async generate() { return { content: 'ok', metadata: { usage: { inputTokens: 1, outputTokens: 1 } } }; } };
    const observability = new ObservabilityBus();
    const strategy = new ContentProductDescriptionStrategy(makePrompts(), { observability });

    await strategy.execute(
      { strategy: 'content-product-description', input: { productName: 'x' } },
      makeContext(provider)
    );

    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'tokens']);
  });
});

describe('parseContentProductDescriptionResponse', () => {
  it('trims the response content into description', () => {
    expect(parseContentProductDescriptionResponse({ content: '  a description.  ' })).toEqual({
      description: 'a description.',
    });
  });
});

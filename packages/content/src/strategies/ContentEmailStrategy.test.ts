import type { ExecutionContext, Provider, ProviderResponse } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { CONTENT_EMAIL_PROMPT } from '../prompts/contentEmailPrompt.js';
import { ContentEmailStrategy, parseContentEmailResponse } from './ContentEmailStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(CONTENT_EMAIL_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('ContentEmailStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new ContentEmailStrategy(makePrompts());
    expect(strategy.name).toBe('content-email');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into ContentEmailResult', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return { content: '{"subject": "Hi", "body": "Body text."}' };
      },
    };
    const strategy = new ContentEmailStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'content-email', input: { purpose: 'follow up' } },
      makeContext(provider)
    );

    expect(result).toEqual({ subject: 'Hi', body: 'Body text.' });
  });

  it('folds tone/recipientContext into the rendered prompt guidance', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: '{"subject": "s", "body": "b"}' };
      },
    };
    const strategy = new ContentEmailStrategy(makePrompts());

    await strategy.execute(
      {
        strategy: 'content-email',
        input: { purpose: 'x', tone: 'friendly', recipientContext: 'a new client' },
      },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('use a friendly tone');
    expect(seenPrompt).toContain('a new client');
  });

  it('rejects a missing purpose', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new ContentEmailStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'content-email', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidContentEngineInputError);
  });

  it('throws UnparsableProviderResponseError when the provider returns invalid JSON', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: 'not json' }; } };
    const strategy = new ContentEmailStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'content-email', input: { purpose: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});

describe('parseContentEmailResponse', () => {
  function response(content: string): ProviderResponse {
    return { content };
  }

  it('throws when subject is missing', () => {
    expect(() => parseContentEmailResponse('s', response('{"body": "b"}'))).toThrow(
      UnparsableProviderResponseError
    );
  });

  it('throws when body is missing', () => {
    expect(() => parseContentEmailResponse('s', response('{"subject": "s"}'))).toThrow(
      UnparsableProviderResponseError
    );
  });
});

import type { ExecutionContext, Provider, ProviderResponse } from '@aidex/core';
import { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { DOCUMENT_REVIEW_PROMPT } from '../prompts/documentReviewPrompt.js';
import { DocumentReviewStrategy, parseDocumentReviewResponse } from './DocumentReviewStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(DOCUMENT_REVIEW_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('DocumentReviewStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new DocumentReviewStrategy(makePrompts());
    expect(strategy.name).toBe('document-review');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into DocumentReviewResult', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return {
          content:
            '{"findings": [{"issue": "Missing date", "severity": "medium", "recommendation": "Add a date."}], ' +
            '"summary": "One issue found."}',
        };
      },
    };
    const strategy = new DocumentReviewStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { source: { content: 'policy text', mimeType: 'text/plain' } } },
      makeContext(provider)
    );

    expect(result).toEqual({
      findings: [{ issue: 'Missing date', severity: 'medium', recommendation: 'Add a date.' }],
      summary: 'One issue found.',
    });
  });

  it('includes focus areas in the rendered prompt when supplied', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: '{"findings": []}' };
      },
    };
    const strategy = new DocumentReviewStrategy(makePrompts());

    await strategy.execute(
      {
        strategy: strategy.name,
        input: { source: { content: 'x', mimeType: 'text/plain' }, focusAreas: ['compliance', 'formatting'] },
      },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('Focus specifically on: compliance, formatting.');
  });

  it('omits the focus areas note when not supplied', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: '{"findings": []}' };
      },
    };
    const strategy = new DocumentReviewStrategy(makePrompts());

    await strategy.execute(
      { strategy: strategy.name, input: { source: { content: 'x', mimeType: 'text/plain' } } },
      makeContext(provider)
    );

    expect(seenPrompt).not.toContain('Focus specifically on');
  });

  it('rejects a missing source', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DocumentReviewStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidDocumentEngineInputError);
  });

  it('rejects a binary (non-text/*) mimeType', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DocumentReviewStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: strategy.name, input: { source: { content: 'x', mimeType: 'application/pdf' } } },
        makeContext(provider)
      )
    ).rejects.toThrow('unsupported mimeType');
  });

  it('throws UnparsableProviderResponseError when the provider returns invalid JSON', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: 'not json' }; } };
    const strategy = new DocumentReviewStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: strategy.name, input: { source: { content: 'x', mimeType: 'text/plain' } } },
        makeContext(provider)
      )
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('records observability events when configured', async () => {
    const provider: Provider = {
      name: 'p',
      async generate() {
        return { content: '{"findings": []}', metadata: { usage: { inputTokens: 1, outputTokens: 1 } } };
      },
    };
    const observability = new ObservabilityBus();
    const strategy = new DocumentReviewStrategy(makePrompts(), { observability });

    await strategy.execute(
      { strategy: strategy.name, input: { source: { content: 'x', mimeType: 'text/plain' } } },
      makeContext(provider)
    );

    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'tokens']);
  });

  it('records a provider failure and rethrows', async () => {
    const error = new Error('provider down');
    const provider: Provider = { name: 'p', async generate() { throw error; } };
    const observability = new ObservabilityBus();
    const strategy = new DocumentReviewStrategy(makePrompts(), { observability });

    await expect(
      strategy.execute(
        { strategy: strategy.name, input: { source: { content: 'x', mimeType: 'text/plain' } } },
        makeContext(provider)
      )
    ).rejects.toBe(error);
    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'error']);
  });
});

describe('parseDocumentReviewResponse', () => {
  function response(content: string): ProviderResponse {
    return { content };
  }

  it('defaults findings to an empty array when absent', () => {
    const result = parseDocumentReviewResponse('s', response('{}'));
    expect(result).toEqual({ findings: [] });
  });

  it('drops findings with an invalid severity', () => {
    const result = parseDocumentReviewResponse(
      's',
      response('{"findings": [{"issue": "a", "recommendation": "b", "severity": "extreme"}]}')
    );
    expect(result.findings).toEqual([]);
  });

  it('drops findings missing a required field', () => {
    const result = parseDocumentReviewResponse(
      's',
      response('{"findings": [{"issue": "a", "severity": "low"}]}')
    );
    expect(result.findings).toEqual([]);
  });
});

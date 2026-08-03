import type { ExecutionContext, Provider, ProviderResponse } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { CONTRACT_REVIEW_PROMPT } from '../prompts/contractReviewPrompt.js';
import { ContractReviewStrategy, parseContractReviewResponse } from './ContractReviewStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(CONTRACT_REVIEW_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('ContractReviewStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new ContractReviewStrategy(makePrompts());
    expect(strategy.name).toBe('contract-review');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into ContractReviewResult', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return {
          content:
            '{"risks": [{"clause": "Termination", "severity": "high", "explanation": "One-sided."}], ' +
            '"summary": "Some risk found."}',
        };
      },
    };
    const strategy = new ContractReviewStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'contract-review', input: { source: { content: 'contract text', mimeType: 'text/plain' } } },
      makeContext(provider)
    );

    expect(result).toEqual({
      risks: [{ clause: 'Termination', severity: 'high', explanation: 'One-sided.' }],
      summary: 'Some risk found.',
    });
  });

  it('includes focus areas in the rendered prompt when supplied', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: '{"risks": []}' };
      },
    };
    const strategy = new ContractReviewStrategy(makePrompts());

    await strategy.execute(
      {
        strategy: 'contract-review',
        input: { source: { content: 'x', mimeType: 'text/plain' }, focusAreas: ['termination', 'liability'] },
      },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('Focus specifically on: termination, liability.');
  });

  it('omits the focus areas note when not supplied', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: '{"risks": []}' };
      },
    };
    const strategy = new ContractReviewStrategy(makePrompts());

    await strategy.execute(
      { strategy: 'contract-review', input: { source: { content: 'x', mimeType: 'text/plain' } } },
      makeContext(provider)
    );

    expect(seenPrompt).not.toContain('Focus specifically on');
  });

  it('rejects a missing source', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new ContractReviewStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'contract-review', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidDocumentEngineInputError);
  });

  it('rejects a binary (non-text/*) mimeType', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new ContractReviewStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: 'contract-review', input: { source: { content: 'x', mimeType: 'application/pdf' } } },
        makeContext(provider)
      )
    ).rejects.toThrow('unsupported mimeType');
  });

  it('throws UnparsableProviderResponseError when the provider returns invalid JSON', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: 'not json' }; } };
    const strategy = new ContractReviewStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: 'contract-review', input: { source: { content: 'x', mimeType: 'text/plain' } } },
        makeContext(provider)
      )
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});

describe('parseContractReviewResponse', () => {
  function response(content: string): ProviderResponse {
    return { content };
  }

  it('defaults risks to an empty array when absent', () => {
    const result = parseContractReviewResponse('s', response('{}'));
    expect(result).toEqual({ risks: [] });
  });

  it('drops risks with an invalid severity', () => {
    const result = parseContractReviewResponse(
      's',
      response('{"risks": [{"clause": "a", "explanation": "b", "severity": "extreme"}]}')
    );
    expect(result.risks).toEqual([]);
  });

  it('drops risks missing a required field', () => {
    const result = parseContractReviewResponse(
      's',
      response('{"risks": [{"clause": "a", "severity": "low"}]}')
    );
    expect(result.risks).toEqual([]);
  });
});

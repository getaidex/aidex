import type { ExecutionContext, Provider, ProviderResponse } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { INVOICE_EXTRACTION_PROMPT } from '../prompts/invoiceExtractionPrompt.js';
import { InvoiceExtractionStrategy, parseInvoiceExtractionResponse } from './InvoiceExtractionStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(INVOICE_EXTRACTION_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('InvoiceExtractionStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new InvoiceExtractionStrategy(makePrompts());
    expect(strategy.name).toBe('invoice-extraction');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into InvoiceExtractionResult', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return {
          content:
            '{"invoiceNumber": "INV-1", "totalAmount": 100, "currency": "USD", ' +
            '"lineItems": [{"description": "Widget", "quantity": 2, "amount": 100}]}',
        };
      },
    };
    const strategy = new InvoiceExtractionStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'invoice-extraction', input: { source: { content: 'invoice text', mimeType: 'text/plain' } } },
      makeContext(provider)
    );

    expect(result).toEqual({
      invoiceNumber: 'INV-1',
      totalAmount: 100,
      currency: 'USD',
      lineItems: [{ description: 'Widget', quantity: 2, amount: 100 }],
    });
  });

  it('rejects a missing source', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new InvoiceExtractionStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'invoice-extraction', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidDocumentEngineInputError);
  });

  it('rejects a binary (non-text/*) mimeType', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new InvoiceExtractionStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: 'invoice-extraction', input: { source: { content: 'x', mimeType: 'application/pdf' } } },
        makeContext(provider)
      )
    ).rejects.toThrow('unsupported mimeType');
  });

  it('throws UnparsableProviderResponseError when the provider returns invalid JSON', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: 'not json' }; } };
    const strategy = new InvoiceExtractionStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: 'invoice-extraction', input: { source: { content: 'x', mimeType: 'text/plain' } } },
        makeContext(provider)
      )
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});

describe('parseInvoiceExtractionResponse', () => {
  function response(content: string): ProviderResponse {
    return { content };
  }

  it('defaults lineItems to an empty array when absent', () => {
    const result = parseInvoiceExtractionResponse('s', response('{}'));
    expect(result).toEqual({ lineItems: [] });
  });

  it('drops line items missing a description', () => {
    const result = parseInvoiceExtractionResponse(
      's',
      response('{"lineItems": [{"description": "ok"}, {"quantity": 1}]}')
    );
    expect(result.lineItems).toEqual([{ description: 'ok' }]);
  });

  it('throws when the response is not a JSON object', () => {
    expect(() => parseInvoiceExtractionResponse('s', response('[1,2,3]'))).toThrow(
      UnparsableProviderResponseError
    );
  });
});

import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { InvoiceExtractionEngine } from './InvoiceExtractionEngine.js';

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('InvoiceExtractionEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new InvoiceExtractionEngine();
    expect(engine.id).toBe('invoice.extract');
    expect(engine.name).toBe('Invoice Extraction');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('extracts invoice data from a valid text document via the configured provider', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return { content: '{"lineItems": [{"description": "Item"}]}' };
      },
    };
    const engine = new InvoiceExtractionEngine();

    const result = await engine.execute(
      makeContext(provider, {
        strategy: 'invoice.extract',
        input: { source: { content: 'invoice text', mimeType: 'text/plain' } },
      })
    );

    expect(result).toEqual({ lineItems: [{ description: 'Item' }] });
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const engine = new InvoiceExtractionEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidDocumentEngineInputError
    );
  });
});

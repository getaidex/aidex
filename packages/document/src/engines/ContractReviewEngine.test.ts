import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { ContractReviewEngine } from './ContractReviewEngine.js';

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('ContractReviewEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new ContractReviewEngine();
    expect(engine.id).toBe('contract.review');
    expect(engine.name).toBe('Contract Review');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('reviews a valid text contract via the configured provider', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return { content: '{"risks": [{"clause": "a", "severity": "low", "explanation": "b"}]}' };
      },
    };
    const engine = new ContractReviewEngine();

    const result = await engine.execute(
      makeContext(provider, {
        strategy: 'contract.review',
        input: { source: { content: 'contract text', mimeType: 'text/plain' } },
      })
    );

    expect(result).toEqual({ risks: [{ clause: 'a', severity: 'low', explanation: 'b' }] });
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const engine = new ContractReviewEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidDocumentEngineInputError
    );
  });
});

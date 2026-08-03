import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { ContentEmailEngine } from './ContentEmailEngine.js';

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('ContentEmailEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new ContentEmailEngine();
    expect(engine.id).toBe('content.email');
    expect(engine.name).toBe('Content Email');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('generates an email for a valid purpose via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{"subject": "S", "body": "B"}' }; } };
    const engine = new ContentEmailEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: 'content.email', input: { purpose: 'follow up' } })
    );

    expect(result).toEqual({ subject: 'S', body: 'B' });
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const engine = new ContentEmailEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidContentEngineInputError
    );
  });
});

import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { DesignTypographyEngine } from './DesignTypographyEngine.js';

const VALID_RESPONSE = JSON.stringify({ pairings: [{ heading: 'A', body: 'B' }] });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('DesignTypographyEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new DesignTypographyEngine();
    expect(engine.id).toBe('design.typography');
    expect(engine.name).toBe('Design Typography');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('generates font pairings via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignTypographyEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: 'design.typography', input: { brief: 'x' } })
    );

    expect(result.pairings).toEqual([{ heading: 'A', body: 'B' }]);
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignTypographyEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidDesignEngineInputError
    );
  });
});

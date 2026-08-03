import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { DesignPresentationEngine } from './DesignPresentationEngine.js';

const VALID_RESPONSE = JSON.stringify({ slides: ['Title', 'Problem'] });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('DesignPresentationEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new DesignPresentationEngine();
    expect(engine.id).toBe('design.presentation');
    expect(engine.name).toBe('Design Presentation');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('generates presentation slides via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignPresentationEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: 'design.presentation', input: { brief: 'Pitch deck' } })
    );

    expect(result.slides).toHaveLength(2);
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignPresentationEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidDesignEngineInputError
    );
  });
});

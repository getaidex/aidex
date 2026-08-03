import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { DesignFlyerEngine } from './DesignFlyerEngine.js';

const VALID_RESPONSE = JSON.stringify({ description: 'A grand-opening flyer with bold color blocks' });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('DesignFlyerEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new DesignFlyerEngine();
    expect(engine.id).toBe('design.flyer');
    expect(engine.name).toBe('Design Flyer');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('generates a flyer via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignFlyerEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: 'design.flyer', input: { brief: 'Grand opening flyer', sides: 2 } })
    );

    expect(result.assetUrl).toContain('data:text/plain,');
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignFlyerEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(InvalidDesignEngineInputError);
  });
});

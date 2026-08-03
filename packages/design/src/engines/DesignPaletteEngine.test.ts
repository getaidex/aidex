import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { DesignPaletteEngine } from './DesignPaletteEngine.js';

const VALID_RESPONSE = JSON.stringify({ colors: [{ name: 'Blue', hex: '#0000FF' }] });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('DesignPaletteEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new DesignPaletteEngine();
    expect(engine.id).toBe('design.palette');
    expect(engine.name).toBe('Design Palette');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('generates a palette via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignPaletteEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: 'design.palette', input: { brief: 'Coffee shop palette' } })
    );

    expect(result.colors).toEqual([{ name: 'Blue', hex: '#0000FF' }]);
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignPaletteEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidDesignEngineInputError
    );
  });
});

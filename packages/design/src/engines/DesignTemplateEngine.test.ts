import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { DesignTemplateEngine } from './DesignTemplateEngine.js';

const VALID_RESPONSE = JSON.stringify({ description: 'An event invite with a customizable headline and date' });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('DesignTemplateEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new DesignTemplateEngine();
    expect(engine.id).toBe('design.template');
    expect(engine.name).toBe('Design Template');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('generates a template via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignTemplateEngine();

    const result = await engine.execute(
      makeContext(provider, {
        strategy: 'design.template',
        input: { brief: 'Event invite template', editableFields: ['headline', 'date'] },
      })
    );

    expect(result.asset.assetUrl).toContain('data:text/plain,');
    expect(result.editableFields).toEqual(['headline', 'date']);
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignTemplateEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(InvalidDesignEngineInputError);
  });
});

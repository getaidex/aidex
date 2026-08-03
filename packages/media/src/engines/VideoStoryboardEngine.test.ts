import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';
import { VideoStoryboardEngine } from './VideoStoryboardEngine.js';

const VALID_RESPONSE = JSON.stringify({
  scenes: [{ description: 'Opening shot' }, { description: 'Closing shot' }],
});

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('VideoStoryboardEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new VideoStoryboardEngine();
    expect(engine.id).toBe('media.video.storyboard');
    expect(engine.version).toBe('1.0.0');
  });

  it('generates a storyboard via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new VideoStoryboardEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: engine.id, input: { brief: 'Launch video' } })
    );

    expect(result.scenes).toHaveLength(2);
  });

  it('rejects a request missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new VideoStoryboardEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: engine.id, input: {} }))
    ).rejects.toBeInstanceOf(InvalidMediaEngineInputError);
  });
});

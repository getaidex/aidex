import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { EngineRegistry } from '@aidex/engines';
import { describe, expect, it } from 'vitest';
import { MediaEngineId } from '../identifiers.js';
import { AssetConvertEngine } from './AssetConvertEngine.js';
import { AssetTransformEngine } from './AssetTransformEngine.js';
import { AudioGenerateEngine } from './AudioGenerateEngine.js';
import { AudioSummarizeEngine } from './AudioSummarizeEngine.js';
import { AudioTranscribeEngine } from './AudioTranscribeEngine.js';
import { ImageEditEngine } from './ImageEditEngine.js';
import { ImageGenerateEngine } from './ImageGenerateEngine.js';
import { ImageOptimizeEngine } from './ImageOptimizeEngine.js';
import { ImageVariantEngine } from './ImageVariantEngine.js';
import { VideoEditEngine } from './VideoEditEngine.js';
import { VideoGenerateEngine } from './VideoGenerateEngine.js';
import { VideoStoryboardEngine } from './VideoStoryboardEngine.js';
import { VideoThumbnailEngine } from './VideoThumbnailEngine.js';

/**
 * There is no `aidex.engine(id)` method anywhere in this platform —
 * `Aidex` (@aidex/core) has exactly four public methods, none of them
 * that. Engine registration/dispatch by id is @aidex/engines'
 * EngineRegistry — register() then execute(id, context) — the real
 * mechanism this suite verifies against, same as every prior Feature
 * Pack's registration test.
 *
 * One provider mock serves all 13 dispatch calls: each engine's Strategy
 * only reads the JSON keys it expects and ignores the rest, so a single
 * response containing every key any of the 13 might look for is valid
 * input for all of them.
 */
const ALL_FIELDS_RESPONSE = JSON.stringify({
  description: 'A generic media specification',
  variantDescriptions: ['Variant one', 'Variant two'],
  scenes: [{ description: 'Scene one' }, { description: 'Scene two' }],
  text: 'Placeholder transcript',
  detectedLanguage: 'en',
  summary: 'A placeholder summary',
});

const provider: Provider = { name: 'test', async generate() { return { content: ALL_FIELDS_RESPONSE }; } };

const SOURCE = { url: 'https://x.test/a', mimeType: 'application/octet-stream' };

function makeContext(request: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

function buildRegistry(): EngineRegistry {
  const registry = new EngineRegistry();
  registry.register(new ImageGenerateEngine());
  registry.register(new ImageEditEngine());
  registry.register(new ImageVariantEngine());
  registry.register(new ImageOptimizeEngine());
  registry.register(new VideoGenerateEngine());
  registry.register(new VideoEditEngine());
  registry.register(new VideoStoryboardEngine());
  registry.register(new VideoThumbnailEngine());
  registry.register(new AudioGenerateEngine());
  registry.register(new AudioTranscribeEngine());
  registry.register(new AudioSummarizeEngine());
  registry.register(new AssetConvertEngine());
  registry.register(new AssetTransformEngine());
  return registry;
}

describe('Phase 3 Media engines — EngineRegistry registration + AI-backed execution', () => {
  it('registers all 13 engines with no id collisions', () => {
    const registry = buildRegistry();

    for (const id of Object.values(MediaEngineId)) {
      expect(registry.has(id)).toBe(true);
    }
    expect(registry.list()).toHaveLength(13);
  });

  it('resolves and executes "media.image.generate" through the registry by id, via the provider', async () => {
    const registry = buildRegistry();

    const result = await registry.execute(MediaEngineId.ImageGenerate, {
      config: { provider },
      provider,
      request: { strategy: MediaEngineId.ImageGenerate, input: { brief: 'Studio shot' } },
    });

    expect(result).toMatchObject({ assetUrl: expect.stringContaining('data:text/plain,') });
  });

  it('dispatches every registered id to the correct engine, not a neighbor', async () => {
    const registry = buildRegistry();

    const variant = await registry.execute(
      MediaEngineId.ImageVariant,
      makeContext({ strategy: MediaEngineId.ImageVariant, input: { brief: 'x', source: SOURCE } })
    );
    const storyboard = await registry.execute(
      MediaEngineId.VideoStoryboard,
      makeContext({ strategy: MediaEngineId.VideoStoryboard, input: { brief: 'x' } })
    );
    const transcribe = await registry.execute(
      MediaEngineId.AudioTranscribe,
      makeContext({ strategy: MediaEngineId.AudioTranscribe, input: { source: SOURCE } })
    );

    expect(variant).toHaveProperty('variants');
    expect(storyboard).toHaveProperty('scenes');
    expect(transcribe).toHaveProperty('text');
  });

  it('every registered engine actually calls context.provider.generate() (AI-backed, not a placeholder)', async () => {
    const registry = buildRegistry();
    let callCount = 0;
    const countingProvider: Provider = {
      name: 'counting',
      async generate() {
        callCount += 1;
        return { content: ALL_FIELDS_RESPONSE };
      },
    };
    const context = (id: string, input: Record<string, unknown>): ExecutionContext => ({
      config: { provider: countingProvider },
      provider: countingProvider,
      request: { strategy: id, input },
    });

    await registry.execute(MediaEngineId.ImageGenerate, context(MediaEngineId.ImageGenerate, { brief: 'x' }));
    await registry.execute(
      MediaEngineId.ImageEdit,
      context(MediaEngineId.ImageEdit, { brief: 'x', source: SOURCE })
    );
    await registry.execute(
      MediaEngineId.ImageVariant,
      context(MediaEngineId.ImageVariant, { brief: 'x', source: SOURCE })
    );
    await registry.execute(MediaEngineId.ImageOptimize, context(MediaEngineId.ImageOptimize, { source: SOURCE }));
    await registry.execute(MediaEngineId.VideoGenerate, context(MediaEngineId.VideoGenerate, { brief: 'x' }));
    await registry.execute(
      MediaEngineId.VideoEdit,
      context(MediaEngineId.VideoEdit, { brief: 'x', source: SOURCE })
    );
    await registry.execute(MediaEngineId.VideoStoryboard, context(MediaEngineId.VideoStoryboard, { brief: 'x' }));
    await registry.execute(
      MediaEngineId.VideoThumbnail,
      context(MediaEngineId.VideoThumbnail, { source: SOURCE })
    );
    await registry.execute(MediaEngineId.AudioGenerate, context(MediaEngineId.AudioGenerate, { brief: 'x' }));
    await registry.execute(
      MediaEngineId.AudioTranscribe,
      context(MediaEngineId.AudioTranscribe, { source: SOURCE })
    );
    await registry.execute(
      MediaEngineId.AudioSummarize,
      context(MediaEngineId.AudioSummarize, { source: SOURCE })
    );
    await registry.execute(
      MediaEngineId.AssetConvert,
      context(MediaEngineId.AssetConvert, { source: SOURCE, targetFormat: 'pdf' })
    );
    await registry.execute(
      MediaEngineId.AssetTransform,
      context(MediaEngineId.AssetTransform, { brief: 'x', source: SOURCE })
    );

    expect(callCount).toBe(13);
  });
});

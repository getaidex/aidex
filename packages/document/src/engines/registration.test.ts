import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { EngineRegistry } from '@aidex/engines';
import { describe, expect, it } from 'vitest';
import { DocumentEngineId } from '../identifiers.js';
import { DocumentClassifyEngine } from './DocumentClassifyEngine.js';
import { DocumentKeywordsEngine } from './DocumentKeywordsEngine.js';
import { DocumentReviewEngine } from './DocumentReviewEngine.js';
import { DocumentTransformEngine } from './DocumentTransformEngine.js';

/**
 * @aidex/document didn't have a dedicated EngineRegistry registration test
 * before the Expansion Phase 2 introduced this file, scoped to the 4 new
 * engines this expansion adds. Now Phase 3-upgraded: one provider mock
 * serves all 4 dispatch calls, each Strategy only reading the JSON keys
 * it expects and ignoring the rest.
 */
const NEW_ENGINE_IDS = [
  DocumentEngineId.Classify,
  DocumentEngineId.Keywords,
  DocumentEngineId.Transform,
  DocumentEngineId.Review,
];

const ALL_FIELDS_RESPONSE = JSON.stringify({
  documentType: 'letter',
  confidence: 0.5,
  keywords: ['a'],
  content: 'reformatted content',
  findings: [{ issue: 'a', severity: 'low', recommendation: 'b' }],
});

const provider: Provider = { name: 'test', async generate() { return { content: ALL_FIELDS_RESPONSE }; } };

const VALID_INPUT: Readonly<Record<string, Record<string, unknown>>> = {
  [DocumentEngineId.Classify]: { source: { content: 'x', mimeType: 'text/plain' } },
  [DocumentEngineId.Keywords]: { source: { content: 'x', mimeType: 'text/plain' } },
  [DocumentEngineId.Transform]: { source: { content: 'x', mimeType: 'text/plain' }, targetFormat: 'markdown' },
  [DocumentEngineId.Review]: { source: { content: 'x', mimeType: 'text/plain' } },
};

function makeContext(request: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

function buildRegistry(): EngineRegistry {
  const registry = new EngineRegistry();
  registry.register(new DocumentClassifyEngine());
  registry.register(new DocumentKeywordsEngine());
  registry.register(new DocumentTransformEngine());
  registry.register(new DocumentReviewEngine());
  return registry;
}

describe('Expansion Phase 3 Document engines — EngineRegistry registration + AI-backed execution', () => {
  it('registers all 4 new engines with no id collisions', () => {
    const registry = buildRegistry();

    for (const id of NEW_ENGINE_IDS) {
      expect(registry.has(id)).toBe(true);
    }
    expect(registry.list()).toHaveLength(4);
  });

  it('resolves and executes every new engine id through the registry, via the provider', async () => {
    const registry = buildRegistry();

    for (const id of NEW_ENGINE_IDS) {
      const input = VALID_INPUT[id] as Record<string, unknown>;
      const result = await registry.execute(id, makeContext({ strategy: id, input }));
      expect(result).toBeTruthy();
    }
  });

  it('dispatches each id to the correct engine, not a neighbor', async () => {
    const registry = buildRegistry();

    const classify = await registry.execute(
      DocumentEngineId.Classify,
      makeContext({ strategy: DocumentEngineId.Classify, input: VALID_INPUT[DocumentEngineId.Classify] })
    );
    const keywords = await registry.execute(
      DocumentEngineId.Keywords,
      makeContext({ strategy: DocumentEngineId.Keywords, input: VALID_INPUT[DocumentEngineId.Keywords] })
    );
    const transform = await registry.execute(
      DocumentEngineId.Transform,
      makeContext({ strategy: DocumentEngineId.Transform, input: VALID_INPUT[DocumentEngineId.Transform] })
    );
    const review = await registry.execute(
      DocumentEngineId.Review,
      makeContext({ strategy: DocumentEngineId.Review, input: VALID_INPUT[DocumentEngineId.Review] })
    );

    expect(classify).toHaveProperty('documentType');
    expect(keywords).toHaveProperty('keywords');
    expect(transform).toHaveProperty('content');
    expect(review).toHaveProperty('findings');
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

    for (const id of NEW_ENGINE_IDS) {
      await registry.execute(id, context(id, VALID_INPUT[id] as Record<string, unknown>));
    }

    expect(callCount).toBe(4);
  });
});

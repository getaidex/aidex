import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { ContentBlogEngine } from './ContentBlogEngine.js';

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('ContentBlogEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new ContentBlogEngine();
    expect(engine.id).toBe('content.blog');
    expect(engine.name).toBe('Content Blog');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('generates a blog post for a valid topic via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{"title": "T", "content": "C"}' }; } };
    const engine = new ContentBlogEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: 'content.blog', input: { topic: 'remote work' } })
    );

    expect(result).toEqual({ title: 'T', content: 'C' });
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const engine = new ContentBlogEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidContentEngineInputError
    );
  });
});

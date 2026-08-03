import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { ResumeAnalysisEngine } from './ResumeAnalysisEngine.js';

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('ResumeAnalysisEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new ResumeAnalysisEngine();
    expect(engine.id).toBe('resume.analyze');
    expect(engine.name).toBe('Resume Analysis');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('analyzes a valid text resume via the configured provider', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return { content: '{"skills": ["Go"]}' };
      },
    };
    const engine = new ResumeAnalysisEngine();

    const result = await engine.execute(
      makeContext(provider, {
        strategy: 'resume.analyze',
        input: { source: { content: 'resume text', mimeType: 'text/plain' } },
      })
    );

    expect(result).toEqual({ skills: ['Go'] });
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const engine = new ResumeAnalysisEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidDocumentEngineInputError
    );
  });
});

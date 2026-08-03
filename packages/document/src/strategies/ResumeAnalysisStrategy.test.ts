import type { ExecutionContext, Provider, ProviderResponse } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { RESUME_ANALYSIS_PROMPT } from '../prompts/resumeAnalysisPrompt.js';
import { ResumeAnalysisStrategy, parseResumeAnalysisResponse } from './ResumeAnalysisStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(RESUME_ANALYSIS_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('ResumeAnalysisStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new ResumeAnalysisStrategy(makePrompts());
    expect(strategy.name).toBe('resume-analysis');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into ResumeAnalysisResult', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return {
          content: '{"candidateName": "Ada", "skills": ["TypeScript", "Rust"], "experienceYears": 5}',
        };
      },
    };
    const strategy = new ResumeAnalysisStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'resume-analysis', input: { source: { content: 'resume text', mimeType: 'text/plain' } } },
      makeContext(provider)
    );

    expect(result).toEqual({ candidateName: 'Ada', skills: ['TypeScript', 'Rust'], experienceYears: 5 });
  });

  it('includes the job description in the rendered prompt when supplied', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: '{"skills": []}' };
      },
    };
    const strategy = new ResumeAnalysisStrategy(makePrompts());

    await strategy.execute(
      {
        strategy: 'resume-analysis',
        input: {
          source: { content: 'resume', mimeType: 'text/plain' },
          jobDescription: 'Senior Backend Engineer',
        },
      },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('Senior Backend Engineer');
    expect(seenPrompt).toContain('matchScore');
  });

  it('notes the absence of a job description when not supplied', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: '{"skills": []}' };
      },
    };
    const strategy = new ResumeAnalysisStrategy(makePrompts());

    await strategy.execute(
      { strategy: 'resume-analysis', input: { source: { content: 'resume', mimeType: 'text/plain' } } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('No job description was provided');
  });

  it('rejects a missing source', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new ResumeAnalysisStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'resume-analysis', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidDocumentEngineInputError);
  });

  it('rejects a binary (non-text/*) mimeType', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new ResumeAnalysisStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: 'resume-analysis', input: { source: { content: 'x', mimeType: 'application/pdf' } } },
        makeContext(provider)
      )
    ).rejects.toThrow('unsupported mimeType');
  });

  it('throws UnparsableProviderResponseError when the provider returns invalid JSON', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: 'not json' }; } };
    const strategy = new ResumeAnalysisStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: 'resume-analysis', input: { source: { content: 'x', mimeType: 'text/plain' } } },
        makeContext(provider)
      )
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});

describe('parseResumeAnalysisResponse', () => {
  function response(content: string): ProviderResponse {
    return { content };
  }

  it('defaults skills to an empty array when absent', () => {
    const result = parseResumeAnalysisResponse('s', response('{}'));
    expect(result).toEqual({ skills: [] });
  });

  it('drops malformed optional fields rather than throwing', () => {
    const result = parseResumeAnalysisResponse(
      's',
      response('{"skills": ["a"], "experienceYears": "five", "matchScore": "high"}')
    );
    expect(result).toEqual({ skills: ['a'] });
  });
});

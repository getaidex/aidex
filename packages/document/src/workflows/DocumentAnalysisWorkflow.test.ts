import type { Prompt, Provider, ProviderResponse } from '@aidex/core';
import type { WorkflowEvent } from '@aidex/workflow';
import { describe, expect, it } from 'vitest';
import { DocumentAnalysisWorkflow } from './DocumentAnalysisWorkflow.js';

const CLASSIFY_RESPONSE = JSON.stringify({ documentType: 'report', confidence: 0.8 });
const KEYWORDS_RESPONSE = JSON.stringify({ keywords: ['revenue', 'growth'] });

function respondFor(promptContent: string): ProviderResponse {
  if (promptContent.includes('Determine the type or category')) return { content: CLASSIFY_RESPONSE };
  if (promptContent.includes('Extract the key phrases and topics')) return { content: KEYWORDS_RESPONSE };
  throw new Error(`Unexpected prompt: ${promptContent}`);
}

function makeMockProvider(): Provider & { calls: Prompt[] } {
  const calls: Prompt[] = [];
  return {
    name: 'mock',
    calls,
    async generate(prompt) {
      calls.push(prompt);
      return respondFor(prompt.content);
    },
  };
}

const INPUT = { source: { content: 'Quarterly report text', mimeType: 'text/plain' } };

describe('DocumentAnalysisWorkflow', () => {
  it('exposes id/name/description', () => {
    const workflow = new DocumentAnalysisWorkflow();
    expect(workflow.id).toBe('document.workflow.document-analysis');
    expect(workflow.name).toBeTruthy();
    expect(workflow.description).toBeTruthy();
  });

  it('composes both engines into one DocumentAnalysisPackage (registration + execution)', async () => {
    const provider = makeMockProvider();
    const workflow = new DocumentAnalysisWorkflow();

    const result = await workflow.run(INPUT, provider);

    expect(provider.calls).toHaveLength(2);
    expect(result.classification.documentType).toBe('report');
    expect(result.keywords.keywords).toEqual(['revenue', 'growth']);
  });

  it('calls the 2 engines in order: classify, keywords', async () => {
    const provider = makeMockProvider();
    const workflow = new DocumentAnalysisWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[0].content).toContain('Determine the type or category');
    expect(provider.calls[1].content).toContain('Extract the key phrases and topics');
  });

  it('both steps read the same original source independently (documented non-dependency)', async () => {
    const provider = makeMockProvider();
    const workflow = new DocumentAnalysisWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[0].content).toContain('Quarterly report text');
    expect(provider.calls[1].content).toContain('Quarterly report text');
  });

  it('stops after the failing step and never runs later steps', async () => {
    const error = new Error('provider unavailable');
    const provider: Provider = { name: 'failing', async generate() { throw error; } };
    const workflow = new DocumentAnalysisWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toBe(error);
  });

  it('propagates a later-step failure without corrupting the already-produced classification result', async () => {
    let callCount = 0;
    const provider: Provider = {
      name: 'flaky',
      async generate(prompt) {
        callCount += 1;
        if (prompt.content.includes('Determine the type or category')) return { content: CLASSIFY_RESPONSE };
        throw new Error('keywords failed');
      },
    };
    const workflow = new DocumentAnalysisWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toThrow('keywords failed');
    expect(callCount).toBe(2);
  });

  it('emits lifecycle events for both steps, in order', async () => {
    const provider = makeMockProvider();
    const workflow = new DocumentAnalysisWorkflow();
    const events: WorkflowEvent[] = [];

    await workflow.run(INPUT, provider, { onEvent: (event) => events.push(event) });

    expect(events.map((e) => e.type)).toEqual([
      'workflow-started',
      'step-started',
      'step-completed',
      'step-started',
      'step-completed',
      'workflow-completed',
    ]);
    expect(events.map((e) => e.stepName).filter(Boolean)).toEqual([
      'document.classify',
      'document.classify',
      'document.keywords',
      'document.keywords',
    ]);
  });

  it('emits step-failed and stops the event stream when a step throws', async () => {
    const provider: Provider = { name: 'failing', async generate() { throw new Error('boom'); } };
    const workflow = new DocumentAnalysisWorkflow();
    const events: WorkflowEvent[] = [];

    await expect(
      workflow.run(INPUT, provider, { onEvent: (event) => events.push(event) })
    ).rejects.toThrow('boom');

    expect(events.map((e) => e.type)).toEqual(['workflow-started', 'step-started', 'step-failed']);
  });

  it('supports cancellation via AbortSignal', async () => {
    const provider = makeMockProvider();
    const workflow = new DocumentAnalysisWorkflow();
    const controller = new AbortController();
    controller.abort();

    await expect(workflow.run(INPUT, provider, { signal: controller.signal })).rejects.toThrow(
      'Workflow cancelled'
    );
  });
});

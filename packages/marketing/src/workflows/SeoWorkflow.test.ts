import type { Prompt, Provider, ProviderResponse } from '@aidex/core';
import type { WorkflowEvent } from '@aidex/workflow';
import { describe, expect, it } from 'vitest';
import { SeoWorkflow } from './SeoWorkflow.js';

const KEYWORDS_RESPONSE = JSON.stringify({ keywords: [{ keyword: 'running shoes' }] });
const META_RESPONSE = JSON.stringify({ title: 'Best Running Shoes', description: 'Find your perfect pair.' });
const AUDIT_RESPONSE = JSON.stringify({ score: 82, findings: [] });

function respondFor(promptContent: string): ProviderResponse {
  if (promptContent.includes('SEO keyword list')) return { content: KEYWORDS_RESPONSE };
  if (promptContent.includes('SEO title')) return { content: META_RESPONSE };
  if (promptContent.includes('Audit the following page')) return { content: AUDIT_RESPONSE };
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

const INPUT = { brief: 'running shoes', content: 'A page about running shoes.', url: 'https://x.test' };

describe('SeoWorkflow', () => {
  it('exposes id/name/description', () => {
    const workflow = new SeoWorkflow();
    expect(workflow.id).toBe('marketing.workflow.seo');
    expect(workflow.name).toBeTruthy();
    expect(workflow.description).toBeTruthy();
  });

  it('composes all 3 engines into one SeoPackage (registration + execution)', async () => {
    const provider = makeMockProvider();
    const workflow = new SeoWorkflow();

    const result = await workflow.run(INPUT, provider);

    expect(provider.calls).toHaveLength(3);
    expect(result.keywords.keywords).toEqual([{ keyword: 'running shoes' }]);
    expect(result.meta.title).toBe('Best Running Shoes');
    expect(result.audit.score).toBe(82);
  });

  it('calls the 3 engines in order: keywords, meta, audit', async () => {
    const provider = makeMockProvider();
    const workflow = new SeoWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[0].content).toContain('SEO keyword list');
    expect(provider.calls[1].content).toContain('SEO title');
    expect(provider.calls[2].content).toContain('Audit the following page');
  });

  it('targets the top keyword in meta, and folds meta into the audited content (real 3-step composition)', async () => {
    const provider = makeMockProvider();
    const workflow = new SeoWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[1].content).toContain('running shoes');
    expect(provider.calls[2].content).toContain('Best Running Shoes');
    expect(provider.calls[2].content).toContain('Find your perfect pair.');
  });

  it('stops after the failing step and never runs later steps', async () => {
    const error = new Error('provider unavailable');
    const provider: Provider = { name: 'failing', async generate() { throw error; } };
    const workflow = new SeoWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toBe(error);
  });

  it('propagates a later-step failure without corrupting the already-produced keywords result', async () => {
    let callCount = 0;
    const provider: Provider = {
      name: 'flaky',
      async generate(prompt) {
        callCount += 1;
        if (prompt.content.includes('SEO keyword list')) return { content: KEYWORDS_RESPONSE };
        throw new Error('meta generation failed');
      },
    };
    const workflow = new SeoWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toThrow('meta generation failed');
    expect(callCount).toBe(2);
  });

  it('emits lifecycle events for all 3 steps, in order', async () => {
    const provider = makeMockProvider();
    const workflow = new SeoWorkflow();
    const events: WorkflowEvent[] = [];

    await workflow.run(INPUT, provider, { onEvent: (event) => events.push(event) });

    expect(events.map((e) => e.type)).toEqual([
      'workflow-started',
      'step-started',
      'step-completed',
      'step-started',
      'step-completed',
      'step-started',
      'step-completed',
      'workflow-completed',
    ]);
    expect(events.map((e) => e.stepName).filter(Boolean)).toEqual([
      'marketing.seo.keywords',
      'marketing.seo.keywords',
      'marketing.seo.meta',
      'marketing.seo.meta',
      'marketing.seo.audit',
      'marketing.seo.audit',
    ]);
  });

  it('emits step-failed and stops the event stream when a step throws', async () => {
    const provider: Provider = { name: 'failing', async generate() { throw new Error('boom'); } };
    const workflow = new SeoWorkflow();
    const events: WorkflowEvent[] = [];

    await expect(
      workflow.run(INPUT, provider, { onEvent: (event) => events.push(event) })
    ).rejects.toThrow('boom');

    expect(events.map((e) => e.type)).toEqual(['workflow-started', 'step-started', 'step-failed']);
  });

  it('supports cancellation via AbortSignal', async () => {
    const provider = makeMockProvider();
    const workflow = new SeoWorkflow();
    const controller = new AbortController();
    controller.abort();

    await expect(workflow.run(INPUT, provider, { signal: controller.signal })).rejects.toThrow(
      'Workflow cancelled'
    );
  });
});

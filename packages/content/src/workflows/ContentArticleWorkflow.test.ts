import type { Prompt, Provider, ProviderResponse } from '@aidex/core';
import type { WorkflowEvent } from '@aidex/workflow';
import { describe, expect, it } from 'vitest';
import { ContentArticleWorkflow } from './ContentArticleWorkflow.js';

/** content.generate/content.rewrite/content.expand all take the provider's raw content directly — no JSON wrapping. */
const GENERATE_RESPONSE = 'A first draft about renewable energy.';
const REWRITE_RESPONSE = 'A polished draft about renewable energy.';
const EXPAND_RESPONSE = 'A polished and expanded draft about renewable energy, with more detail.';

function respondFor(promptContent: string): ProviderResponse {
  if (promptContent.includes('Generate new content')) return { content: GENERATE_RESPONSE };
  if (promptContent.includes('Rewrite the following content.')) return { content: REWRITE_RESPONSE };
  if (promptContent.includes('Expand the following content')) return { content: EXPAND_RESPONSE };
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

const INPUT = { topic: 'renewable energy' };

describe('ContentArticleWorkflow', () => {
  it('exposes id/name/description', () => {
    const workflow = new ContentArticleWorkflow();
    expect(workflow.id).toBe('content.workflow.article');
    expect(workflow.name).toBeTruthy();
    expect(workflow.description).toBeTruthy();
  });

  it('composes all 3 engines into one ContentArticlePackage (registration + execution)', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentArticleWorkflow();

    const result = await workflow.run(INPUT, provider);

    expect(provider.calls).toHaveLength(3);
    expect(result.generated.content).toBe(GENERATE_RESPONSE);
    expect(result.rewritten.rewrittenContent).toBe(REWRITE_RESPONSE);
    expect(result.expanded.expandedContent).toBe(EXPAND_RESPONSE);
  });

  it('calls the 3 engines in order: generate, rewrite, expand', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentArticleWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[0].content).toContain('Generate new content');
    expect(provider.calls[1].content).toContain('Rewrite the following content.');
    expect(provider.calls[2].content).toContain('Expand the following content');
  });

  it('fully chains: generated content flows into rewrite, and rewritten content flows into expand (real engine composition)', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentArticleWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[1].content).toContain(GENERATE_RESPONSE);
    expect(provider.calls[2].content).toContain(REWRITE_RESPONSE);
  });

  it('stops after the failing step and never runs later steps', async () => {
    const error = new Error('provider unavailable');
    const provider: Provider = { name: 'failing', async generate() { throw error; } };
    const workflow = new ContentArticleWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toBe(error);
  });

  it('propagates a later-step failure without corrupting the already-produced generate result', async () => {
    let callCount = 0;
    const provider: Provider = {
      name: 'flaky',
      async generate(prompt) {
        callCount += 1;
        if (prompt.content.includes('Generate new content')) return { content: GENERATE_RESPONSE };
        throw new Error('rewrite failed');
      },
    };
    const workflow = new ContentArticleWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toThrow('rewrite failed');
    expect(callCount).toBe(2);
  });

  it('emits lifecycle events for all 3 steps, in order', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentArticleWorkflow();
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
      'content.generate',
      'content.generate',
      'content.rewrite',
      'content.rewrite',
      'content.expand',
      'content.expand',
    ]);
  });

  it('emits step-failed and stops the event stream when a step throws', async () => {
    const provider: Provider = { name: 'failing', async generate() { throw new Error('boom'); } };
    const workflow = new ContentArticleWorkflow();
    const events: WorkflowEvent[] = [];

    await expect(
      workflow.run(INPUT, provider, { onEvent: (event) => events.push(event) })
    ).rejects.toThrow('boom');

    expect(events.map((e) => e.type)).toEqual(['workflow-started', 'step-started', 'step-failed']);
  });

  it('supports cancellation via AbortSignal', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentArticleWorkflow();
    const controller = new AbortController();
    controller.abort();

    await expect(workflow.run(INPUT, provider, { signal: controller.signal })).rejects.toThrow(
      'Workflow cancelled'
    );
  });
});

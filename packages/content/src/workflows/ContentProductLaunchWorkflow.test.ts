import type { Prompt, Provider, ProviderResponse } from '@aidex/core';
import type { WorkflowEvent } from '@aidex/workflow';
import { describe, expect, it } from 'vitest';
import { ContentProductLaunchWorkflow } from './ContentProductLaunchWorkflow.js';

/** content.product-description takes the provider's raw content directly — no JSON wrapping, unlike content.seo/content.tagline. */
const DESCRIPTION_RESPONSE = 'A sleek new water bottle that keeps drinks cold for 24 hours.';
const SEO_RESPONSE = JSON.stringify({ optimizedContent: 'Optimized: sleek insulated water bottle.', suggestedKeywords: ['insulated bottle'] });
const TAGLINE_RESPONSE = JSON.stringify({ taglines: ['Stay Cold. Stay Bold.', 'Cold for Days.'] });

function respondFor(promptContent: string): ProviderResponse {
  if (promptContent.includes('Write a product description')) return { content: DESCRIPTION_RESPONSE };
  if (promptContent.includes('SEO-optimize')) return { content: SEO_RESPONSE };
  if (promptContent.includes('tagline variants')) return { content: TAGLINE_RESPONSE };
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

const INPUT = { productName: 'Chill Bottle' };

describe('ContentProductLaunchWorkflow', () => {
  it('exposes id/name/description', () => {
    const workflow = new ContentProductLaunchWorkflow();
    expect(workflow.id).toBe('content.workflow.product-launch');
    expect(workflow.name).toBeTruthy();
    expect(workflow.description).toBeTruthy();
  });

  it('composes all 3 engines into one ContentProductLaunchPackage (registration + execution)', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentProductLaunchWorkflow();

    const result = await workflow.run(INPUT, provider);

    expect(provider.calls).toHaveLength(3);
    expect(result.description.description).toBe(DESCRIPTION_RESPONSE);
    expect(result.seo.optimizedContent).toContain('insulated water bottle');
    expect(result.taglines.taglines).toHaveLength(2);
  });

  it('calls the 3 engines in order: product-description, seo, tagline', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentProductLaunchWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[0].content).toContain('Write a product description');
    expect(provider.calls[1].content).toContain('SEO-optimize');
    expect(provider.calls[2].content).toContain('tagline variants');
  });

  it('fans out from the description: both seo and tagline use it, not just the product name (real engine composition)', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentProductLaunchWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[1].content).toContain(DESCRIPTION_RESPONSE);
    expect(provider.calls[2].content).toContain(DESCRIPTION_RESPONSE);
  });

  it('stops after the failing step and never runs later steps', async () => {
    const error = new Error('provider unavailable');
    const provider: Provider = { name: 'failing', async generate() { throw error; } };
    const workflow = new ContentProductLaunchWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toBe(error);
  });

  it('propagates a later-step failure without corrupting the already-produced description result', async () => {
    let callCount = 0;
    const provider: Provider = {
      name: 'flaky',
      async generate(prompt) {
        callCount += 1;
        if (prompt.content.includes('Write a product description')) return { content: DESCRIPTION_RESPONSE };
        throw new Error('seo failed');
      },
    };
    const workflow = new ContentProductLaunchWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toThrow('seo failed');
    expect(callCount).toBe(2);
  });

  it('emits lifecycle events for all 3 steps, in order', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentProductLaunchWorkflow();
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
      'content.product-description',
      'content.product-description',
      'content.seo',
      'content.seo',
      'content.tagline',
      'content.tagline',
    ]);
  });

  it('emits step-failed and stops the event stream when a step throws', async () => {
    const provider: Provider = { name: 'failing', async generate() { throw new Error('boom'); } };
    const workflow = new ContentProductLaunchWorkflow();
    const events: WorkflowEvent[] = [];

    await expect(
      workflow.run(INPUT, provider, { onEvent: (event) => events.push(event) })
    ).rejects.toThrow('boom');

    expect(events.map((e) => e.type)).toEqual(['workflow-started', 'step-started', 'step-failed']);
  });

  it('supports cancellation via AbortSignal', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentProductLaunchWorkflow();
    const controller = new AbortController();
    controller.abort();

    await expect(workflow.run(INPUT, provider, { signal: controller.signal })).rejects.toThrow(
      'Workflow cancelled'
    );
  });
});

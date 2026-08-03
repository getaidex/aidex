import type { Prompt, Provider, ProviderResponse } from '@aidex/core';
import type { WorkflowEvent } from '@aidex/workflow';
import { describe, expect, it } from 'vitest';
import { ContentBlogWorkflow } from './ContentBlogWorkflow.js';

const BLOG_RESPONSE = JSON.stringify({ title: 'Cedar & Bean Opens', content: 'A cozy new coffee shop.' });
const SEO_RESPONSE = JSON.stringify({ optimizedContent: 'Optimized: A cozy new coffee shop.', suggestedKeywords: ['coffee'] });
const HEADLINE_RESPONSE = JSON.stringify({ headlines: ['Cedar & Bean Is Here', 'Your New Favorite Coffee Spot'] });

/** Branches on each Strategy's own fixed prompt lead-in text — stable regardless of the exact input a workflow step constructs. */
function respondFor(promptContent: string): ProviderResponse {
  if (promptContent.includes('Write a blog post')) return { content: BLOG_RESPONSE };
  if (promptContent.includes('SEO-optimize')) return { content: SEO_RESPONSE };
  if (promptContent.includes('Generate') && promptContent.includes('headline variants')) return { content: HEADLINE_RESPONSE };
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

const INPUT = { topic: 'a cozy coffee shop' };

describe('ContentBlogWorkflow', () => {
  it('exposes id/name/description', () => {
    const workflow = new ContentBlogWorkflow();
    expect(workflow.id).toBe('content.workflow.blog');
    expect(workflow.name).toBeTruthy();
    expect(workflow.description).toBeTruthy();
  });

  it('composes all 3 engines into one ContentBlogPackage (registration + execution)', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentBlogWorkflow();

    const result = await workflow.run(INPUT, provider);

    expect(provider.calls).toHaveLength(3);
    expect(result.blog.title).toBe('Cedar & Bean Opens');
    expect(result.seo.optimizedContent).toContain('cozy new coffee shop');
    expect(result.headlines.headlines).toHaveLength(2);
  });

  it('calls the 3 engines in order: blog, seo, headline', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentBlogWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[0].content).toContain('Write a blog post');
    expect(provider.calls[1].content).toContain('SEO-optimize');
    expect(provider.calls[2].content).toContain('headline variants');
  });

  it('optimizes the blog step own content, but generates headlines from the original topic (documented independence)', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentBlogWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[1].content).toContain('A cozy new coffee shop.');
    expect(provider.calls[2].content).toContain('a cozy coffee shop');
  });

  it('stops after the failing step and never runs later steps', async () => {
    const error = new Error('provider unavailable');
    const provider: Provider = { name: 'failing', async generate() { throw error; } };
    const workflow = new ContentBlogWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toBe(error);
  });

  it('propagates a later-step failure without corrupting the already-produced blog result', async () => {
    let callCount = 0;
    const provider: Provider = {
      name: 'flaky',
      async generate(prompt) {
        callCount += 1;
        if (prompt.content.includes('Write a blog post')) return { content: BLOG_RESPONSE };
        throw new Error('seo failed');
      },
    };
    const workflow = new ContentBlogWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toThrow('seo failed');
    expect(callCount).toBe(2);
  });

  it('emits lifecycle events for all 3 steps, in order', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentBlogWorkflow();
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
      'content.blog',
      'content.blog',
      'content.seo',
      'content.seo',
      'content.headline',
      'content.headline',
    ]);
  });

  it('emits step-failed and stops the event stream when a step throws', async () => {
    const provider: Provider = { name: 'failing', async generate() { throw new Error('boom'); } };
    const workflow = new ContentBlogWorkflow();
    const events: WorkflowEvent[] = [];

    await expect(
      workflow.run(INPUT, provider, { onEvent: (event) => events.push(event) })
    ).rejects.toThrow('boom');

    expect(events.map((e) => e.type)).toEqual(['workflow-started', 'step-started', 'step-failed']);
  });

  it('supports cancellation via AbortSignal', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentBlogWorkflow();
    const controller = new AbortController();
    controller.abort();

    await expect(workflow.run(INPUT, provider, { signal: controller.signal })).rejects.toThrow(
      'Workflow cancelled'
    );
  });
});

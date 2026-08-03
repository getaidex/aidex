import type { Prompt, Provider, ProviderResponse } from '@aidex/core';
import type { WorkflowEvent } from '@aidex/workflow';
import { describe, expect, it } from 'vitest';
import { ContentSocialWorkflow } from './ContentSocialWorkflow.js';

const SOCIAL_RESPONSE = JSON.stringify({ content: 'Check out our new launch!', hashtags: ['launch'] });
/** content.tone/content.shorten take the provider's raw content directly — no JSON wrapping, unlike content.social. */
const TONE_RESPONSE = 'Check out our exciting new launch, friend!';
const SHORTEN_RESPONSE = 'New launch — check it out!';

function respondFor(promptContent: string): ProviderResponse {
  if (promptContent.includes('Write a social media post')) return { content: SOCIAL_RESPONSE };
  if (promptContent.includes('Rewrite the following content using a')) return { content: TONE_RESPONSE };
  if (promptContent.includes('Shorten and condense')) return { content: SHORTEN_RESPONSE };
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

const INPUT = { topic: 'new product launch', tone: 'playful' };

describe('ContentSocialWorkflow', () => {
  it('exposes id/name/description', () => {
    const workflow = new ContentSocialWorkflow();
    expect(workflow.id).toBe('content.workflow.social');
    expect(workflow.name).toBeTruthy();
    expect(workflow.description).toBeTruthy();
  });

  it('composes all 3 engines into one ContentSocialPackage (registration + execution)', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentSocialWorkflow();

    const result = await workflow.run(INPUT, provider);

    expect(provider.calls).toHaveLength(3);
    expect(result.social.content).toBe('Check out our new launch!');
    expect(result.toned.content).toBe(TONE_RESPONSE);
    expect(result.shortened.shortenedContent).toBe(SHORTEN_RESPONSE);
  });

  it('calls the 3 engines in order: social, tone, shorten', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentSocialWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[0].content).toContain('Write a social media post');
    expect(provider.calls[1].content).toContain('Rewrite the following content using a');
    expect(provider.calls[2].content).toContain('Shorten and condense');
  });

  it('fully chains: social content flows into tone, and toned content flows into shorten (real engine composition)', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentSocialWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[1].content).toContain('Check out our new launch!');
    expect(provider.calls[2].content).toContain(TONE_RESPONSE);
  });

  it('stops after the failing step and never runs later steps', async () => {
    const error = new Error('provider unavailable');
    const provider: Provider = { name: 'failing', async generate() { throw error; } };
    const workflow = new ContentSocialWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toBe(error);
  });

  it('propagates a later-step failure without corrupting the already-produced social result', async () => {
    let callCount = 0;
    const provider: Provider = {
      name: 'flaky',
      async generate(prompt) {
        callCount += 1;
        if (prompt.content.includes('Write a social media post')) return { content: SOCIAL_RESPONSE };
        throw new Error('tone failed');
      },
    };
    const workflow = new ContentSocialWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toThrow('tone failed');
    expect(callCount).toBe(2);
  });

  it('emits lifecycle events for all 3 steps, in order', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentSocialWorkflow();
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
      'content.social',
      'content.social',
      'content.tone',
      'content.tone',
      'content.shorten',
      'content.shorten',
    ]);
  });

  it('emits step-failed and stops the event stream when a step throws', async () => {
    const provider: Provider = { name: 'failing', async generate() { throw new Error('boom'); } };
    const workflow = new ContentSocialWorkflow();
    const events: WorkflowEvent[] = [];

    await expect(
      workflow.run(INPUT, provider, { onEvent: (event) => events.push(event) })
    ).rejects.toThrow('boom');

    expect(events.map((e) => e.type)).toEqual(['workflow-started', 'step-started', 'step-failed']);
  });

  it('supports cancellation via AbortSignal', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentSocialWorkflow();
    const controller = new AbortController();
    controller.abort();

    await expect(workflow.run(INPUT, provider, { signal: controller.signal })).rejects.toThrow(
      'Workflow cancelled'
    );
  });
});

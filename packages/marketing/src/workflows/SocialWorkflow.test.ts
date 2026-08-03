import type { Prompt, Provider, ProviderResponse } from '@aidex/core';
import type { WorkflowEvent } from '@aidex/workflow';
import { describe, expect, it } from 'vitest';
import { SocialWorkflow } from './SocialWorkflow.js';

const CAPTION_RESPONSE = JSON.stringify({ caption: 'New arrivals just dropped!' });
const HASHTAGS_RESPONSE = JSON.stringify({ hashtags: ['#newarrivals', '#shopnow'] });
const SCHEDULE_RESPONSE = JSON.stringify({ order: [0] });

function respondFor(promptContent: string): ProviderResponse {
  if (promptContent.includes('post caption')) return { content: CAPTION_RESPONSE };
  if (promptContent.includes('hashtag set')) return { content: HASHTAGS_RESPONSE };
  if (promptContent.includes('optimal publishing order')) return { content: SCHEDULE_RESPONSE };
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

const INPUT = { brief: 'New product launch', startDate: '2026-01-01' };

describe('SocialWorkflow', () => {
  it('exposes id/name/description', () => {
    const workflow = new SocialWorkflow();
    expect(workflow.id).toBe('marketing.workflow.social');
    expect(workflow.name).toBeTruthy();
    expect(workflow.description).toBeTruthy();
  });

  it('composes all 3 engines into one SocialPublishingPackage (registration + execution)', async () => {
    const provider = makeMockProvider();
    const workflow = new SocialWorkflow();

    const result = await workflow.run(INPUT, provider);

    expect(provider.calls).toHaveLength(3);
    expect(result.caption.caption).toBe('New arrivals just dropped!');
    expect(result.hashtags.hashtags).toEqual(['#newarrivals', '#shopnow']);
    expect(result.schedule.scheduled).toHaveLength(1);
  });

  it('calls the 3 engines in order: caption, hashtags, schedule', async () => {
    const provider = makeMockProvider();
    const workflow = new SocialWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[0].content).toContain('post caption');
    expect(provider.calls[1].content).toContain('hashtag set');
    expect(provider.calls[2].content).toContain('optimal publishing order');
  });

  it('combines caption + hashtags into the single scheduled post (real engine composition, not 3 independent calls)', async () => {
    const provider = makeMockProvider();
    const workflow = new SocialWorkflow();

    const result = await workflow.run(INPUT, provider);

    expect(result.schedule.scheduled[0]?.content).toContain('New arrivals just dropped!');
    expect(result.schedule.scheduled[0]?.content).toContain('#newarrivals');
    expect(result.schedule.scheduled[0]?.publishAt).toBe('2026-01-01');
  });

  it('stops after the failing step and never runs later steps', async () => {
    const error = new Error('provider unavailable');
    const provider: Provider = { name: 'failing', async generate() { throw error; } };
    const workflow = new SocialWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toBe(error);
  });

  it('propagates a later-step failure without corrupting the already-produced caption result', async () => {
    let callCount = 0;
    const provider: Provider = {
      name: 'flaky',
      async generate(prompt) {
        callCount += 1;
        if (prompt.content.includes('post caption')) return { content: CAPTION_RESPONSE };
        throw new Error('hashtag generation failed');
      },
    };
    const workflow = new SocialWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toThrow('hashtag generation failed');
    expect(callCount).toBe(2);
  });

  it('emits lifecycle events for all 3 steps, in order', async () => {
    const provider = makeMockProvider();
    const workflow = new SocialWorkflow();
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
      'marketing.social.caption',
      'marketing.social.caption',
      'marketing.social.hashtags',
      'marketing.social.hashtags',
      'marketing.social.schedule',
      'marketing.social.schedule',
    ]);
  });

  it('emits step-failed and stops the event stream when a step throws', async () => {
    const provider: Provider = { name: 'failing', async generate() { throw new Error('boom'); } };
    const workflow = new SocialWorkflow();
    const events: WorkflowEvent[] = [];

    await expect(
      workflow.run(INPUT, provider, { onEvent: (event) => events.push(event) })
    ).rejects.toThrow('boom');

    expect(events.map((e) => e.type)).toEqual(['workflow-started', 'step-started', 'step-failed']);
  });

  it('supports cancellation via AbortSignal', async () => {
    const provider = makeMockProvider();
    const workflow = new SocialWorkflow();
    const controller = new AbortController();
    controller.abort();

    await expect(workflow.run(INPUT, provider, { signal: controller.signal })).rejects.toThrow(
      'Workflow cancelled'
    );
  });
});

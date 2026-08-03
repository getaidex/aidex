import type { Prompt, Provider, ProviderResponse } from '@aidex/core';
import type { WorkflowEvent } from '@aidex/workflow';
import { describe, expect, it } from 'vitest';
import { ContentRepurposeWorkflow } from './ContentRepurposeWorkflow.js';

/** content.summarize takes the provider's raw content directly — no JSON wrapping, unlike content.social/content.email. */
const SUMMARIZE_RESPONSE = 'A concise recap of the article.';
const SOCIAL_RESPONSE = JSON.stringify({ content: 'Here is the recap!', hashtags: ['recap'] });
const EMAIL_RESPONSE = JSON.stringify({ subject: 'Recap inside', body: 'Here is the recap.' });

function respondFor(promptContent: string): ProviderResponse {
  if (promptContent.includes('Summarize the following content')) return { content: SUMMARIZE_RESPONSE };
  if (promptContent.includes('Write a social media post')) return { content: SOCIAL_RESPONSE };
  if (promptContent.includes('Write an email')) return { content: EMAIL_RESPONSE };
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

const INPUT = { content: 'A very long article about the launch, spanning several paragraphs...' };

describe('ContentRepurposeWorkflow', () => {
  it('exposes id/name/description', () => {
    const workflow = new ContentRepurposeWorkflow();
    expect(workflow.id).toBe('content.workflow.repurpose');
    expect(workflow.name).toBeTruthy();
    expect(workflow.description).toBeTruthy();
  });

  it('composes all 3 engines into one ContentRepurposePackage (registration + execution)', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentRepurposeWorkflow();

    const result = await workflow.run(INPUT, provider);

    expect(provider.calls).toHaveLength(3);
    expect(result.summary.summary).toBe(SUMMARIZE_RESPONSE);
    expect(result.social.content).toBe('Here is the recap!');
    expect(result.email.subject).toBe('Recap inside');
  });

  it('calls the 3 engines in order: summarize, social, email', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentRepurposeWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[0].content).toContain('Summarize the following content');
    expect(provider.calls[1].content).toContain('Write a social media post');
    expect(provider.calls[2].content).toContain('Write an email');
  });

  it('fans out from the summary: both social and email use it, not the original raw content (real engine composition)', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentRepurposeWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[1].content).toContain(SUMMARIZE_RESPONSE);
    expect(provider.calls[2].content).toContain(SUMMARIZE_RESPONSE);
    expect(provider.calls[1].content).not.toContain('A very long article');
    expect(provider.calls[2].content).not.toContain('A very long article');
  });

  it('stops after the failing step and never runs later steps', async () => {
    const error = new Error('provider unavailable');
    const provider: Provider = { name: 'failing', async generate() { throw error; } };
    const workflow = new ContentRepurposeWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toBe(error);
  });

  it('propagates a later-step failure without corrupting the already-produced summary result', async () => {
    let callCount = 0;
    const provider: Provider = {
      name: 'flaky',
      async generate(prompt) {
        callCount += 1;
        if (prompt.content.includes('Summarize the following content')) return { content: SUMMARIZE_RESPONSE };
        throw new Error('social failed');
      },
    };
    const workflow = new ContentRepurposeWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toThrow('social failed');
    expect(callCount).toBe(2);
  });

  it('emits lifecycle events for all 3 steps, in order', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentRepurposeWorkflow();
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
      'content.summarize',
      'content.summarize',
      'content.social',
      'content.social',
      'content.email',
      'content.email',
    ]);
  });

  it('emits step-failed and stops the event stream when a step throws', async () => {
    const provider: Provider = { name: 'failing', async generate() { throw new Error('boom'); } };
    const workflow = new ContentRepurposeWorkflow();
    const events: WorkflowEvent[] = [];

    await expect(
      workflow.run(INPUT, provider, { onEvent: (event) => events.push(event) })
    ).rejects.toThrow('boom');

    expect(events.map((e) => e.type)).toEqual(['workflow-started', 'step-started', 'step-failed']);
  });

  it('supports cancellation via AbortSignal', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentRepurposeWorkflow();
    const controller = new AbortController();
    controller.abort();

    await expect(workflow.run(INPUT, provider, { signal: controller.signal })).rejects.toThrow(
      'Workflow cancelled'
    );
  });
});

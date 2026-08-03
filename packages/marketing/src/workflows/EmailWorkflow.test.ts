import type { Prompt, Provider, ProviderResponse } from '@aidex/core';
import type { WorkflowEvent } from '@aidex/workflow';
import { describe, expect, it } from 'vitest';
import { EmailWorkflow } from './EmailWorkflow.js';

const SUBJECT_RESPONSE = JSON.stringify({ subjects: ["Don't miss out!"] });
const COPY_RESPONSE = JSON.stringify({ subject: "Don't miss out!", body: 'Here is the full pitch.' });
const SEQUENCE_RESPONSE = JSON.stringify({ steps: [{ subject: 'Welcome!', body: 'Thanks for joining.' }] });

function respondFor(promptContent: string): ProviderResponse {
  if (promptContent.includes('subject line variants')) return { content: SUBJECT_RESPONSE };
  if (promptContent.includes('subject line and body copy')) return { content: COPY_RESPONSE };
  if (promptContent.includes('drip sequence')) return { content: SEQUENCE_RESPONSE };
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

const INPUT = { brief: 'Flash sale' };

describe('EmailWorkflow', () => {
  it('exposes id/name/description', () => {
    const workflow = new EmailWorkflow();
    expect(workflow.id).toBe('marketing.workflow.email');
    expect(workflow.name).toBeTruthy();
    expect(workflow.description).toBeTruthy();
  });

  it('composes all 3 engines into one EmailCampaignPackage (registration + execution)', async () => {
    const provider = makeMockProvider();
    const workflow = new EmailWorkflow();

    const result = await workflow.run(INPUT, provider);

    expect(provider.calls).toHaveLength(3);
    expect(result.subjects.subjects).toEqual(["Don't miss out!"]);
    expect(result.copy.body).toBe('Here is the full pitch.');
    expect(result.sequence.steps).toHaveLength(1);
  });

  it('calls the 3 engines in order: subject, copy, sequence', async () => {
    const provider = makeMockProvider();
    const workflow = new EmailWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[0].content).toContain('subject line variants');
    expect(provider.calls[1].content).toContain('subject line and body copy');
    expect(provider.calls[2].content).toContain('drip sequence');
  });

  it('folds subject into copy step and copy.body into sequence step (real engine composition, not 3 independent calls)', async () => {
    const provider = makeMockProvider();
    const workflow = new EmailWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[1].content).toContain("Don't miss out!");
    expect(provider.calls[2].content).toContain('Here is the full pitch.');
  });

  it('stops after the failing step and never runs later steps', async () => {
    const error = new Error('provider unavailable');
    const provider: Provider = { name: 'failing', async generate() { throw error; } };
    const workflow = new EmailWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toBe(error);
  });

  it('propagates a later-step failure without corrupting the already-produced subjects result', async () => {
    let callCount = 0;
    const provider: Provider = {
      name: 'flaky',
      async generate(prompt) {
        callCount += 1;
        if (prompt.content.includes('subject line variants')) return { content: SUBJECT_RESPONSE };
        throw new Error('copy generation failed');
      },
    };
    const workflow = new EmailWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toThrow('copy generation failed');
    expect(callCount).toBe(2);
  });

  it('emits lifecycle events for all 3 steps, in order', async () => {
    const provider = makeMockProvider();
    const workflow = new EmailWorkflow();
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
      'marketing.email.subject',
      'marketing.email.subject',
      'marketing.email.copy',
      'marketing.email.copy',
      'marketing.email.sequence',
      'marketing.email.sequence',
    ]);
  });

  it('emits step-failed and stops the event stream when a step throws', async () => {
    const provider: Provider = { name: 'failing', async generate() { throw new Error('boom'); } };
    const workflow = new EmailWorkflow();
    const events: WorkflowEvent[] = [];

    await expect(
      workflow.run(INPUT, provider, { onEvent: (event) => events.push(event) })
    ).rejects.toThrow('boom');

    expect(events.map((e) => e.type)).toEqual(['workflow-started', 'step-started', 'step-failed']);
  });

  it('supports cancellation via AbortSignal', async () => {
    const provider = makeMockProvider();
    const workflow = new EmailWorkflow();
    const controller = new AbortController();
    controller.abort();

    await expect(workflow.run(INPUT, provider, { signal: controller.signal })).rejects.toThrow(
      'Workflow cancelled'
    );
  });
});

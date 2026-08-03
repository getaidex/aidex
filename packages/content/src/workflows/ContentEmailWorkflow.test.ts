import type { Prompt, Provider, ProviderResponse } from '@aidex/core';
import type { WorkflowEvent } from '@aidex/workflow';
import { describe, expect, it } from 'vitest';
import { ContentEmailWorkflow } from './ContentEmailWorkflow.js';

const EMAIL_RESPONSE = JSON.stringify({ subject: 'Welcome!', body: 'Thanks for joining us.' });
/** content.tone takes the provider's raw content directly — no JSON wrapping, unlike content.email/content.translate. */
const TONE_RESPONSE = 'Thanks so much for joining us, friend!';
const TRANSLATE_RESPONSE = JSON.stringify({ translatedContent: 'Gracias por unirte.', detectedSourceLanguage: 'en' });

function respondFor(promptContent: string): ProviderResponse {
  if (promptContent.includes('Write an email')) return { content: EMAIL_RESPONSE };
  if (promptContent.includes('Rewrite the following content using a')) return { content: TONE_RESPONSE };
  if (promptContent.includes('Translate the following content')) return { content: TRANSLATE_RESPONSE };
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

const INPUT = { purpose: 'welcome new users', tone: 'friendly', targetLanguage: 'es' };

describe('ContentEmailWorkflow', () => {
  it('exposes id/name/description', () => {
    const workflow = new ContentEmailWorkflow();
    expect(workflow.id).toBe('content.workflow.email');
    expect(workflow.name).toBeTruthy();
    expect(workflow.description).toBeTruthy();
  });

  it('composes all 3 engines into one ContentEmailPackage (registration + execution)', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentEmailWorkflow();

    const result = await workflow.run(INPUT, provider);

    expect(provider.calls).toHaveLength(3);
    expect(result.email.subject).toBe('Welcome!');
    expect(result.toned.content).toBe(TONE_RESPONSE);
    expect(result.translated.translatedContent).toBe('Gracias por unirte.');
  });

  it('calls the 3 engines in order: email, tone, translate', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentEmailWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[0].content).toContain('Write an email');
    expect(provider.calls[1].content).toContain('Rewrite the following content using a');
    expect(provider.calls[2].content).toContain('Translate the following content');
  });

  it('fully chains on the body: email.body flows into tone, and toned content flows into translate (real engine composition)', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentEmailWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[1].content).toContain('Thanks for joining us.');
    expect(provider.calls[2].content).toContain(TONE_RESPONSE);
  });

  it('stops after the failing step and never runs later steps', async () => {
    const error = new Error('provider unavailable');
    const provider: Provider = { name: 'failing', async generate() { throw error; } };
    const workflow = new ContentEmailWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toBe(error);
  });

  it('propagates a later-step failure without corrupting the already-produced email result', async () => {
    let callCount = 0;
    const provider: Provider = {
      name: 'flaky',
      async generate(prompt) {
        callCount += 1;
        if (prompt.content.includes('Write an email')) return { content: EMAIL_RESPONSE };
        throw new Error('tone failed');
      },
    };
    const workflow = new ContentEmailWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toThrow('tone failed');
    expect(callCount).toBe(2);
  });

  it('emits lifecycle events for all 3 steps, in order', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentEmailWorkflow();
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
      'content.email',
      'content.email',
      'content.tone',
      'content.tone',
      'content.translate',
      'content.translate',
    ]);
  });

  it('emits step-failed and stops the event stream when a step throws', async () => {
    const provider: Provider = { name: 'failing', async generate() { throw new Error('boom'); } };
    const workflow = new ContentEmailWorkflow();
    const events: WorkflowEvent[] = [];

    await expect(
      workflow.run(INPUT, provider, { onEvent: (event) => events.push(event) })
    ).rejects.toThrow('boom');

    expect(events.map((e) => e.type)).toEqual(['workflow-started', 'step-started', 'step-failed']);
  });

  it('supports cancellation via AbortSignal', async () => {
    const provider = makeMockProvider();
    const workflow = new ContentEmailWorkflow();
    const controller = new AbortController();
    controller.abort();

    await expect(workflow.run(INPUT, provider, { signal: controller.signal })).rejects.toThrow(
      'Workflow cancelled'
    );
  });
});

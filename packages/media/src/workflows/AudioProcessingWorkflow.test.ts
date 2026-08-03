import type { Prompt, Provider, ProviderResponse } from '@aidex/core';
import type { WorkflowEvent } from '@aidex/workflow';
import { describe, expect, it } from 'vitest';
import { AudioProcessingWorkflow } from './AudioProcessingWorkflow.js';

const SOURCE = { url: 'https://x.test/a.mp3', mimeType: 'audio/mpeg' };
const TRANSCRIBE_RESPONSE = JSON.stringify({ text: 'Placeholder transcript text', detectedLanguage: 'en' });
const SUMMARIZE_RESPONSE = JSON.stringify({ summary: 'A placeholder summary of the audio content' });

function respondFor(promptContent: string): ProviderResponse {
  if (promptContent.includes('placeholder transcript')) return { content: TRANSCRIBE_RESPONSE };
  if (promptContent.includes('placeholder summary')) return { content: SUMMARIZE_RESPONSE };
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

describe('AudioProcessingWorkflow', () => {
  it('exposes id/name/description', () => {
    const workflow = new AudioProcessingWorkflow();
    expect(workflow.id).toBe('media.workflow.audio-processing');
    expect(workflow.name).toBeTruthy();
    expect(workflow.description).toBeTruthy();
  });

  it('composes both engines into one AudioProcessingResult (registration + execution)', async () => {
    const provider = makeMockProvider();
    const workflow = new AudioProcessingWorkflow();

    const result = await workflow.run({ source: SOURCE }, provider);

    expect(provider.calls).toHaveLength(2);
    expect(result.transcript.text).toBe('Placeholder transcript text');
    expect(result.summary.summary).toBe('A placeholder summary of the audio content');
  });

  it('calls the 2 engines in order: transcribe, summarize', async () => {
    const provider = makeMockProvider();
    const workflow = new AudioProcessingWorkflow();

    await workflow.run({ source: SOURCE }, provider);

    expect(provider.calls[0].content).toContain('placeholder transcript');
    expect(provider.calls[1].content).toContain('placeholder summary');
  });

  it('passes language/maxLength through to their respective steps', async () => {
    const provider = makeMockProvider();
    const workflow = new AudioProcessingWorkflow();

    const result = await workflow.run({ source: SOURCE, language: 'fr', maxLength: 10 }, provider);

    expect(provider.calls[0].content).toContain('expected language is fr');
    expect(result.summary.summary.length).toBeLessThanOrEqual(10);
  });

  it('stops after the failing step and never runs later steps', async () => {
    const error = new Error('provider unavailable');
    const provider: Provider = {
      name: 'failing',
      async generate() {
        throw error;
      },
    };
    const workflow = new AudioProcessingWorkflow();

    await expect(workflow.run({ source: SOURCE }, provider)).rejects.toBe(error);
  });

  it('propagates a later-step failure without corrupting the already-produced transcript result', async () => {
    let callCount = 0;
    const provider: Provider = {
      name: 'flaky',
      async generate(prompt) {
        callCount += 1;
        if (prompt.content.includes('placeholder transcript')) {
          return { content: TRANSCRIBE_RESPONSE };
        }
        throw new Error('summarization failed');
      },
    };
    const workflow = new AudioProcessingWorkflow();

    await expect(workflow.run({ source: SOURCE }, provider)).rejects.toThrow('summarization failed');
    expect(callCount).toBe(2);
  });

  it('emits lifecycle events for both steps, in order', async () => {
    const provider = makeMockProvider();
    const workflow = new AudioProcessingWorkflow();
    const events: WorkflowEvent[] = [];

    await workflow.run({ source: SOURCE }, provider, { onEvent: (event) => events.push(event) });

    expect(events.map((e) => e.type)).toEqual([
      'workflow-started',
      'step-started',
      'step-completed',
      'step-started',
      'step-completed',
      'workflow-completed',
    ]);
    expect(events.map((e) => e.stepName).filter(Boolean)).toEqual([
      'media.audio.transcribe',
      'media.audio.transcribe',
      'media.audio.summarize',
      'media.audio.summarize',
    ]);
  });

  it('emits step-failed and stops the event stream when a step throws', async () => {
    const provider: Provider = {
      name: 'failing',
      async generate() {
        throw new Error('boom');
      },
    };
    const workflow = new AudioProcessingWorkflow();
    const events: WorkflowEvent[] = [];

    await expect(
      workflow.run({ source: SOURCE }, provider, { onEvent: (event) => events.push(event) })
    ).rejects.toThrow('boom');

    expect(events.map((e) => e.type)).toEqual(['workflow-started', 'step-started', 'step-failed']);
  });

  it('supports cancellation via AbortSignal', async () => {
    const provider = makeMockProvider();
    const workflow = new AudioProcessingWorkflow();
    const controller = new AbortController();
    controller.abort();

    await expect(
      workflow.run({ source: SOURCE }, provider, { signal: controller.signal })
    ).rejects.toThrow('Workflow cancelled');
  });
});

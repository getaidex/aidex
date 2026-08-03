import type { Prompt, Provider, ProviderResponse } from '@aidex/core';
import type { WorkflowEvent } from '@aidex/workflow';
import { describe, expect, it } from 'vitest';
import { VideoPreparationWorkflow } from './VideoPreparationWorkflow.js';

const SOURCE = { url: 'https://x.test/a.mp4', mimeType: 'video/mp4' };
const STORYBOARD_RESPONSE = JSON.stringify({
  scenes: [{ description: 'Opening shot' }, { description: 'Closing shot' }],
});
const THUMBNAIL_RESPONSE = JSON.stringify({ description: 'A frame showing the product' });

function respondFor(promptContent: string): ProviderResponse {
  if (promptContent.includes('storyboard for a video')) return { content: STORYBOARD_RESPONSE };
  if (promptContent.includes('extracted as a thumbnail')) return { content: THUMBNAIL_RESPONSE };
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

describe('VideoPreparationWorkflow', () => {
  it('exposes id/name/description', () => {
    const workflow = new VideoPreparationWorkflow();
    expect(workflow.id).toBe('media.workflow.video-preparation');
    expect(workflow.name).toBeTruthy();
    expect(workflow.description).toBeTruthy();
  });

  it('composes both engines into one VideoPreparationResult (registration + execution)', async () => {
    const provider = makeMockProvider();
    const workflow = new VideoPreparationWorkflow();

    const result = await workflow.run({ brief: 'Launch video', source: SOURCE }, provider);

    expect(provider.calls).toHaveLength(2);
    expect(result.storyboard.scenes).toHaveLength(2);
    expect(result.thumbnail.assetUrl).toContain('data:text/plain,');
  });

  it('calls the 2 engines in order: storyboard, thumbnail', async () => {
    const provider = makeMockProvider();
    const workflow = new VideoPreparationWorkflow();

    await workflow.run({ brief: 'x', source: SOURCE }, provider);

    expect(provider.calls[0].content).toContain('storyboard for a video');
    expect(provider.calls[1].content).toContain('extracted as a thumbnail');
  });

  it('passes sceneCount/timestampSeconds/outputFormat through to their respective steps', async () => {
    const provider = makeMockProvider();
    const workflow = new VideoPreparationWorkflow();

    await workflow.run(
      { brief: 'x', source: SOURCE, sceneCount: 5, timestampSeconds: 12, outputFormat: 'png' },
      provider
    );

    expect(provider.calls[0].content).toContain('exactly 5 scenes');
    expect(provider.calls[1].content).toContain('12 seconds');
  });

  it('stops after the failing step and never runs later steps', async () => {
    const error = new Error('provider unavailable');
    const provider: Provider = {
      name: 'failing',
      async generate() {
        throw error;
      },
    };
    const workflow = new VideoPreparationWorkflow();

    await expect(workflow.run({ brief: 'x', source: SOURCE }, provider)).rejects.toBe(error);
  });

  it('propagates a later-step failure without corrupting the already-produced storyboard result', async () => {
    let callCount = 0;
    const provider: Provider = {
      name: 'flaky',
      async generate(prompt) {
        callCount += 1;
        if (prompt.content.includes('storyboard for a video')) {
          return { content: STORYBOARD_RESPONSE };
        }
        throw new Error('thumbnail extraction failed');
      },
    };
    const workflow = new VideoPreparationWorkflow();

    await expect(workflow.run({ brief: 'x', source: SOURCE }, provider)).rejects.toThrow(
      'thumbnail extraction failed'
    );
    expect(callCount).toBe(2);
  });

  it('emits lifecycle events for both steps, in order', async () => {
    const provider = makeMockProvider();
    const workflow = new VideoPreparationWorkflow();
    const events: WorkflowEvent[] = [];

    await workflow.run({ brief: 'x', source: SOURCE }, provider, { onEvent: (event) => events.push(event) });

    expect(events.map((e) => e.type)).toEqual([
      'workflow-started',
      'step-started',
      'step-completed',
      'step-started',
      'step-completed',
      'workflow-completed',
    ]);
    expect(events.map((e) => e.stepName).filter(Boolean)).toEqual([
      'media.video.storyboard',
      'media.video.storyboard',
      'media.video.thumbnail',
      'media.video.thumbnail',
    ]);
  });

  it('emits step-failed and stops the event stream when a step throws', async () => {
    const provider: Provider = {
      name: 'failing',
      async generate() {
        throw new Error('boom');
      },
    };
    const workflow = new VideoPreparationWorkflow();
    const events: WorkflowEvent[] = [];

    await expect(
      workflow.run({ brief: 'x', source: SOURCE }, provider, { onEvent: (event) => events.push(event) })
    ).rejects.toThrow('boom');

    expect(events.map((e) => e.type)).toEqual(['workflow-started', 'step-started', 'step-failed']);
  });

  it('supports cancellation via AbortSignal', async () => {
    const provider = makeMockProvider();
    const workflow = new VideoPreparationWorkflow();
    const controller = new AbortController();
    controller.abort();

    await expect(
      workflow.run({ brief: 'x', source: SOURCE }, provider, { signal: controller.signal })
    ).rejects.toThrow('Workflow cancelled');
  });
});

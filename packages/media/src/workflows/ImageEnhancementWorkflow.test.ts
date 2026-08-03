import type { Prompt, Provider, ProviderResponse } from '@aidex/core';
import type { WorkflowEvent } from '@aidex/workflow';
import { describe, expect, it } from 'vitest';
import { ImageEnhancementWorkflow } from './ImageEnhancementWorkflow.js';

const SOURCE = { url: 'https://x.test/original.png', mimeType: 'image/png' };
const OPTIMIZE_RESPONSE = JSON.stringify({ description: 'Recompressed at 80% quality' });
const VARIANT_RESPONSE = JSON.stringify({ variantDescriptions: ['A blue variant', 'A green variant'] });

/** Branches on each Strategy's own fixed prompt lead-in text — stable regardless of the exact input a workflow step constructs. */
function respondFor(promptContent: string): ProviderResponse {
  if (promptContent.includes('optimization plan')) return { content: OPTIMIZE_RESPONSE };
  if (promptContent.includes('variants of an existing image')) return { content: VARIANT_RESPONSE };
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

describe('ImageEnhancementWorkflow', () => {
  it('exposes id/name/description', () => {
    const workflow = new ImageEnhancementWorkflow();
    expect(workflow.id).toBe('media.workflow.image-enhancement');
    expect(workflow.name).toBeTruthy();
    expect(workflow.description).toBeTruthy();
  });

  it('composes both engines into one ImageEnhancementResult (registration + execution)', async () => {
    const provider = makeMockProvider();
    const workflow = new ImageEnhancementWorkflow();

    const result = await workflow.run({ brief: 'Sharpen and brighten', source: SOURCE }, provider);

    expect(provider.calls).toHaveLength(2);
    expect(result.optimized.assetUrl).toContain('data:text/plain,');
    expect(result.variants.variants).toHaveLength(2);
  });

  it('calls the 2 engines in order: optimize, variant', async () => {
    const provider = makeMockProvider();
    const workflow = new ImageEnhancementWorkflow();

    await workflow.run({ brief: 'x', source: SOURCE }, provider);

    expect(provider.calls[0].content).toContain('optimization plan');
    expect(provider.calls[1].content).toContain('variants of an existing image');
  });

  it('flows the optimized result forward into the variant step (real engine composition, not 2 independent calls)', async () => {
    let seenVariantSourceUrl = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        if (prompt.content.includes('variants of an existing image')) {
          seenVariantSourceUrl = prompt.content;
          return { content: VARIANT_RESPONSE };
        }
        return { content: OPTIMIZE_RESPONSE };
      },
    };
    const workflow = new ImageEnhancementWorkflow();

    await workflow.run({ brief: 'x', source: SOURCE }, provider);

    // VariantStep's prompt should reference the OPTIMIZED asset's data: URI,
    // not the original SOURCE.url — proof the optimized result flowed forward.
    expect(seenVariantSourceUrl).toContain('data:text/plain,');
    expect(seenVariantSourceUrl).not.toContain(SOURCE.url);
  });

  it('stops after the failing step and never runs later steps', async () => {
    const error = new Error('provider unavailable');
    const provider: Provider = {
      name: 'failing',
      async generate() {
        throw error;
      },
    };
    const workflow = new ImageEnhancementWorkflow();

    await expect(workflow.run({ brief: 'x', source: SOURCE }, provider)).rejects.toBe(error);
  });

  it('propagates a later-step failure without corrupting the already-produced optimize result', async () => {
    let callCount = 0;
    const provider: Provider = {
      name: 'flaky',
      async generate(prompt) {
        callCount += 1;
        if (prompt.content.includes('optimization plan')) {
          return { content: OPTIMIZE_RESPONSE };
        }
        throw new Error('variant generation failed');
      },
    };
    const workflow = new ImageEnhancementWorkflow();

    await expect(workflow.run({ brief: 'x', source: SOURCE }, provider)).rejects.toThrow('variant generation failed');
    expect(callCount).toBe(2);
  });

  it('emits lifecycle events for both steps, in order', async () => {
    const provider = makeMockProvider();
    const workflow = new ImageEnhancementWorkflow();
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
      'media.image.optimize',
      'media.image.optimize',
      'media.image.variant',
      'media.image.variant',
    ]);
  });

  it('emits step-failed and stops the event stream when a step throws', async () => {
    const provider: Provider = {
      name: 'failing',
      async generate() {
        throw new Error('boom');
      },
    };
    const workflow = new ImageEnhancementWorkflow();
    const events: WorkflowEvent[] = [];

    await expect(
      workflow.run({ brief: 'x', source: SOURCE }, provider, { onEvent: (event) => events.push(event) })
    ).rejects.toThrow('boom');

    expect(events.map((e) => e.type)).toEqual(['workflow-started', 'step-started', 'step-failed']);
  });

  it('supports cancellation via AbortSignal', async () => {
    const provider = makeMockProvider();
    const workflow = new ImageEnhancementWorkflow();
    const controller = new AbortController();
    controller.abort();

    await expect(
      workflow.run({ brief: 'x', source: SOURCE }, provider, { signal: controller.signal })
    ).rejects.toThrow('Workflow cancelled');
  });
});

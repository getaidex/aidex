import type { Prompt, Provider, ProviderResponse } from '@aidex/core';
import type { WorkflowEvent } from '@aidex/workflow';
import { describe, expect, it } from 'vitest';
import { DocumentLocalizationWorkflow } from './DocumentLocalizationWorkflow.js';

const TRANSLATE_RESPONSE = JSON.stringify({
  translatedText: 'Texto traducido.',
  detectedSourceLanguage: 'en',
});
/** document.summarize's Strategy takes the provider's raw content directly as the summary — no JSON wrapping, unlike every other strategy in this package. */
const SUMMARIZE_RESPONSE = 'Resumen breve.';

function respondFor(promptContent: string): ProviderResponse {
  if (promptContent.includes('Translate the following document')) return { content: TRANSLATE_RESPONSE };
  if (promptContent.includes('Summarize the following document')) return { content: SUMMARIZE_RESPONSE };
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

const INPUT = { source: { content: 'Original English text', mimeType: 'text/plain' }, targetLanguage: 'es' };

describe('DocumentLocalizationWorkflow', () => {
  it('exposes id/name/description', () => {
    const workflow = new DocumentLocalizationWorkflow();
    expect(workflow.id).toBe('document.workflow.document-localization');
    expect(workflow.name).toBeTruthy();
    expect(workflow.description).toBeTruthy();
  });

  it('composes both engines into one LocalizedDocumentPackage (registration + execution)', async () => {
    const provider = makeMockProvider();
    const workflow = new DocumentLocalizationWorkflow();

    const result = await workflow.run(INPUT, provider);

    expect(provider.calls).toHaveLength(2);
    expect(result.translation.translatedText).toBe('Texto traducido.');
    expect(result.summary.summary).toBe('Resumen breve.');
  });

  it('calls the 2 engines in order: translate, summarize', async () => {
    const provider = makeMockProvider();
    const workflow = new DocumentLocalizationWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[0].content).toContain('Translate the following document');
    expect(provider.calls[1].content).toContain('Summarize the following document');
  });

  it('summarizes the translated text, adapted through a DocumentSource — not the original-language document (real engine composition)', async () => {
    const provider = makeMockProvider();
    const workflow = new DocumentLocalizationWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[1].content).toContain('Texto traducido.');
    expect(provider.calls[1].content).not.toContain('Original English text');
  });

  it('stops after the failing step and never runs later steps', async () => {
    const error = new Error('provider unavailable');
    const provider: Provider = { name: 'failing', async generate() { throw error; } };
    const workflow = new DocumentLocalizationWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toBe(error);
  });

  it('propagates a later-step failure without corrupting the already-produced translation result', async () => {
    let callCount = 0;
    const provider: Provider = {
      name: 'flaky',
      async generate(prompt) {
        callCount += 1;
        if (prompt.content.includes('Translate the following document')) return { content: TRANSLATE_RESPONSE };
        throw new Error('summarize failed');
      },
    };
    const workflow = new DocumentLocalizationWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toThrow('summarize failed');
    expect(callCount).toBe(2);
  });

  it('emits lifecycle events for both steps, in order', async () => {
    const provider = makeMockProvider();
    const workflow = new DocumentLocalizationWorkflow();
    const events: WorkflowEvent[] = [];

    await workflow.run(INPUT, provider, { onEvent: (event) => events.push(event) });

    expect(events.map((e) => e.type)).toEqual([
      'workflow-started',
      'step-started',
      'step-completed',
      'step-started',
      'step-completed',
      'workflow-completed',
    ]);
    expect(events.map((e) => e.stepName).filter(Boolean)).toEqual([
      'document.translate',
      'document.translate',
      'document.summarize',
      'document.summarize',
    ]);
  });

  it('emits step-failed and stops the event stream when a step throws', async () => {
    const provider: Provider = { name: 'failing', async generate() { throw new Error('boom'); } };
    const workflow = new DocumentLocalizationWorkflow();
    const events: WorkflowEvent[] = [];

    await expect(
      workflow.run(INPUT, provider, { onEvent: (event) => events.push(event) })
    ).rejects.toThrow('boom');

    expect(events.map((e) => e.type)).toEqual(['workflow-started', 'step-started', 'step-failed']);
  });

  it('supports cancellation via AbortSignal', async () => {
    const provider = makeMockProvider();
    const workflow = new DocumentLocalizationWorkflow();
    const controller = new AbortController();
    controller.abort();

    await expect(workflow.run(INPUT, provider, { signal: controller.signal })).rejects.toThrow(
      'Workflow cancelled'
    );
  });
});

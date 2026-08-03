import type { Prompt, Provider, ProviderResponse } from '@aidex/core';
import type { WorkflowEvent } from '@aidex/workflow';
import { describe, expect, it } from 'vitest';
import { AnalyticsWorkflow } from './AnalyticsWorkflow.js';

const SUMMARY_RESPONSE = JSON.stringify({ summary: 'Clicks are strong.', highlights: ['Clicks up 20%'] });
const INSIGHTS_RESPONSE = JSON.stringify({
  insights: [{ observation: 'Churn is above target', recommendation: 'Launch a retention campaign' }],
});

function respondFor(promptContent: string): ProviderResponse {
  if (promptContent.includes('Summarize the following')) return { content: SUMMARY_RESPONSE };
  if (promptContent.includes('Derive actionable insights')) return { content: INSIGHTS_RESPONSE };
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

const INPUT = { metrics: [{ name: 'clicks', value: 120 }] };

describe('AnalyticsWorkflow', () => {
  it('exposes id/name/description', () => {
    const workflow = new AnalyticsWorkflow();
    expect(workflow.id).toBe('marketing.workflow.analytics');
    expect(workflow.name).toBeTruthy();
    expect(workflow.description).toBeTruthy();
  });

  it('composes both engines into one AnalyticsReport (registration + execution)', async () => {
    const provider = makeMockProvider();
    const workflow = new AnalyticsWorkflow();

    const result = await workflow.run(INPUT, provider);

    expect(provider.calls).toHaveLength(2);
    expect(result.summary.summary).toBe('Clicks are strong.');
    expect(result.insights.insights).toHaveLength(1);
  });

  it('calls the 2 engines in order: summary, insights', async () => {
    const provider = makeMockProvider();
    const workflow = new AnalyticsWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[0].content).toContain('Summarize the following');
    expect(provider.calls[1].content).toContain('Derive actionable insights');
  });

  it('stops after the failing step and never runs later steps', async () => {
    const error = new Error('provider unavailable');
    const provider: Provider = { name: 'failing', async generate() { throw error; } };
    const workflow = new AnalyticsWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toBe(error);
  });

  it('propagates a later-step failure without corrupting the already-produced summary result', async () => {
    let callCount = 0;
    const provider: Provider = {
      name: 'flaky',
      async generate(prompt) {
        callCount += 1;
        if (prompt.content.includes('Summarize the following')) return { content: SUMMARY_RESPONSE };
        throw new Error('insights generation failed');
      },
    };
    const workflow = new AnalyticsWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toThrow('insights generation failed');
    expect(callCount).toBe(2);
  });

  it('emits lifecycle events for both steps, in order', async () => {
    const provider = makeMockProvider();
    const workflow = new AnalyticsWorkflow();
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
      'marketing.analytics.summary',
      'marketing.analytics.summary',
      'marketing.analytics.insights',
      'marketing.analytics.insights',
    ]);
  });

  it('emits step-failed and stops the event stream when a step throws', async () => {
    const provider: Provider = { name: 'failing', async generate() { throw new Error('boom'); } };
    const workflow = new AnalyticsWorkflow();
    const events: WorkflowEvent[] = [];

    await expect(
      workflow.run(INPUT, provider, { onEvent: (event) => events.push(event) })
    ).rejects.toThrow('boom');

    expect(events.map((e) => e.type)).toEqual(['workflow-started', 'step-started', 'step-failed']);
  });

  it('supports cancellation via AbortSignal', async () => {
    const provider = makeMockProvider();
    const workflow = new AnalyticsWorkflow();
    const controller = new AbortController();
    controller.abort();

    await expect(workflow.run(INPUT, provider, { signal: controller.signal })).rejects.toThrow(
      'Workflow cancelled'
    );
  });
});

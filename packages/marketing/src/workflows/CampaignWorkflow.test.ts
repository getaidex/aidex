import type { Prompt, Provider, ProviderResponse } from '@aidex/core';
import type { WorkflowEvent } from '@aidex/workflow';
import { describe, expect, it } from 'vitest';
import { CampaignWorkflow } from './CampaignWorkflow.js';

const BRIEF_RESPONSE = JSON.stringify({
  document: 'A formal brief for Cedar & Bean coffee shop.',
  objectives: ['Establish market presence'],
});
const PLAN_RESPONSE = JSON.stringify({
  objectives: [{ goal: 'Increase awareness' }],
  summary: 'A focused summer campaign for Cedar & Bean.',
});
const CALENDAR_RESPONSE = JSON.stringify({ activities: ['Teaser day', 'Launch day'] });

/** Branches on each Strategy's own fixed prompt lead-in text — stable regardless of the exact input a workflow step constructs. */
function respondFor(promptContent: string): ProviderResponse {
  if (promptContent.includes('raw creative idea')) return { content: BRIEF_RESPONSE };
  if (promptContent.includes('Plan a marketing campaign')) return { content: PLAN_RESPONSE };
  if (promptContent.includes('day-by-day list')) return { content: CALENDAR_RESPONSE };
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

const INPUT = { brief: 'A cozy coffee shop', startDate: '2026-01-01', durationDays: 2 };

describe('CampaignWorkflow', () => {
  it('exposes id/name/description', () => {
    const workflow = new CampaignWorkflow();
    expect(workflow.id).toBe('marketing.workflow.campaign');
    expect(workflow.name).toBeTruthy();
    expect(workflow.description).toBeTruthy();
  });

  it('composes all 3 engines into one CampaignPackage (registration + execution)', async () => {
    const provider = makeMockProvider();
    const workflow = new CampaignWorkflow();

    const result = await workflow.run(INPUT, provider);

    expect(provider.calls).toHaveLength(3);
    expect(result.brief.document).toContain('Cedar & Bean');
    expect(result.plan.summary).toContain('Cedar & Bean');
    expect(result.calendar.entries).toHaveLength(2);
  });

  it('calls the 3 engines in order: brief, plan, calendar', async () => {
    const provider = makeMockProvider();
    const workflow = new CampaignWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[0].content).toContain('raw creative idea');
    expect(provider.calls[1].content).toContain('Plan a marketing campaign');
    expect(provider.calls[2].content).toContain('day-by-day list');
  });

  it('flows brief.document into plan and plan.summary into calendar (real engine composition, not 3 independent calls)', async () => {
    const provider = makeMockProvider();
    const workflow = new CampaignWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[1].content).toContain('A formal brief for Cedar & Bean coffee shop.');
    expect(provider.calls[2].content).toContain('A focused summer campaign for Cedar & Bean.');
  });

  it('stops after the failing step and never runs later steps', async () => {
    const error = new Error('provider unavailable');
    const provider: Provider = { name: 'failing', async generate() { throw error; } };
    const workflow = new CampaignWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toBe(error);
  });

  it('propagates a later-step failure without corrupting the already-produced brief result', async () => {
    let callCount = 0;
    const provider: Provider = {
      name: 'flaky',
      async generate(prompt) {
        callCount += 1;
        if (prompt.content.includes('raw creative idea')) return { content: BRIEF_RESPONSE };
        throw new Error('plan generation failed');
      },
    };
    const workflow = new CampaignWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toThrow('plan generation failed');
    expect(callCount).toBe(2);
  });

  it('emits lifecycle events for all 3 steps, in order', async () => {
    const provider = makeMockProvider();
    const workflow = new CampaignWorkflow();
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
      'marketing.campaign.brief',
      'marketing.campaign.brief',
      'marketing.campaign.plan',
      'marketing.campaign.plan',
      'marketing.campaign.calendar',
      'marketing.campaign.calendar',
    ]);
  });

  it('emits step-failed and stops the event stream when a step throws', async () => {
    const provider: Provider = { name: 'failing', async generate() { throw new Error('boom'); } };
    const workflow = new CampaignWorkflow();
    const events: WorkflowEvent[] = [];

    await expect(
      workflow.run(INPUT, provider, { onEvent: (event) => events.push(event) })
    ).rejects.toThrow('boom');

    expect(events.map((e) => e.type)).toEqual(['workflow-started', 'step-started', 'step-failed']);
  });

  it('supports cancellation via AbortSignal', async () => {
    const provider = makeMockProvider();
    const workflow = new CampaignWorkflow();
    const controller = new AbortController();
    controller.abort();

    await expect(workflow.run(INPUT, provider, { signal: controller.signal })).rejects.toThrow(
      'Workflow cancelled'
    );
  });
});

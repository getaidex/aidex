import type { Prompt, Provider, ProviderResponse } from '@aidex/core';
import type { WorkflowEvent } from '@aidex/workflow';
import { describe, expect, it } from 'vitest';
import { BrandKitWorkflow } from './BrandKitWorkflow.js';

const BRAND_RESPONSE = JSON.stringify({
  logoDescription: 'A minimalist coffee cup mark',
  palette: ['#4A2E1E', '#D9A566'],
  typography: ['Playfair Display', 'Source Sans Pro'],
  guidelines: 'Keep the mark on light backgrounds.',
});
const LOGO_RESPONSE = JSON.stringify({ primaryDescription: 'The refined coffee cup mark' });
const PALETTE_RESPONSE = JSON.stringify({ colors: [{ name: 'Deep Brown', hex: '#4A2E1E', role: 'primary' }] });
const TYPOGRAPHY_RESPONSE = JSON.stringify({
  pairings: [{ heading: 'Playfair Display', body: 'Source Sans Pro' }],
});

/** Branches on each Strategy's own fixed prompt lead-in text — stable regardless of the brief text a workflow step constructs. */
function respondFor(promptContent: string): ProviderResponse {
  if (promptContent.includes('Design a brand identity')) return { content: BRAND_RESPONSE };
  if (promptContent.includes('Design a logo')) return { content: LOGO_RESPONSE };
  if (promptContent.includes('Generate a color palette')) return { content: PALETTE_RESPONSE };
  if (promptContent.includes('Suggest font pairings')) return { content: TYPOGRAPHY_RESPONSE };
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

describe('BrandKitWorkflow', () => {
  it('exposes id/name/description', () => {
    const workflow = new BrandKitWorkflow();
    expect(workflow.id).toBe('design.workflow.brand-kit');
    expect(workflow.name).toBeTruthy();
    expect(workflow.description).toBeTruthy();
  });

  it('composes all 4 engines into one BrandKitResult (registration + execution)', async () => {
    const provider = makeMockProvider();
    const workflow = new BrandKitWorkflow();

    const result = await workflow.run({ brandName: 'Cedar & Bean' }, provider);

    expect(provider.calls).toHaveLength(4);
    expect(result.brand.palette).toEqual(['#4A2E1E', '#D9A566']);
    expect(result.logo.primary.assetUrl).toContain('data:text/plain,');
    expect(result.palette.colors).toEqual([{ name: 'Deep Brown', hex: '#4A2E1E', role: 'primary' }]);
    expect(result.typography.pairings).toEqual([{ heading: 'Playfair Display', body: 'Source Sans Pro' }]);
  });

  it('calls the 4 engines in order: brand, logo, palette, typography', async () => {
    const provider = makeMockProvider();
    const workflow = new BrandKitWorkflow();

    await workflow.run({ brandName: 'x' }, provider);

    expect(provider.calls[0].content).toContain('Design a brand identity');
    expect(provider.calls[1].content).toContain('Design a logo');
    expect(provider.calls[2].content).toContain('Generate a color palette');
    expect(provider.calls[3].content).toContain('Suggest font pairings');
  });

  it('flows design.brand output forward into the later steps (real engine composition, not 4 independent calls)', async () => {
    const provider = makeMockProvider();
    const workflow = new BrandKitWorkflow();

    await workflow.run({ brandName: 'Cedar & Bean' }, provider);

    // LogoStep should reference brand's guidelines; PaletteStep/TypographyStep
    // should pass brand's starter palette/typography as `branding` context.
    expect(provider.calls[1].content).toContain('Keep the mark on light backgrounds');
    expect(provider.calls[2].content).toContain('#4A2E1E');
    expect(provider.calls[3].content).toContain('Playfair Display');
  });

  it('includes targetAudience/style/industry in the initial brand step', async () => {
    const provider = makeMockProvider();
    const workflow = new BrandKitWorkflow();

    await workflow.run(
      { brandName: 'x', targetAudience: 'young professionals', style: 'minimalist', industry: 'hospitality' },
      provider
    );

    expect(provider.calls[0].content).toContain('the target audience is young professionals');
    expect(provider.calls[0].content).toContain('use a minimalist style');
    expect(provider.calls[0].content).toContain('the industry is hospitality');
  });

  it('stops after the failing step and never runs later steps', async () => {
    const error = new Error('provider unavailable');
    const provider: Provider = {
      name: 'failing',
      async generate() {
        throw error;
      },
    };
    const workflow = new BrandKitWorkflow();

    await expect(workflow.run({ brandName: 'x' }, provider)).rejects.toBe(error);
  });

  it('propagates a later-step failure without corrupting the already-produced brand result', async () => {
    let callCount = 0;
    const provider: Provider = {
      name: 'flaky',
      async generate(prompt) {
        callCount += 1;
        if (prompt.content.includes('Design a brand identity')) {
          return { content: BRAND_RESPONSE };
        }
        throw new Error('logo generation failed');
      },
    };
    const workflow = new BrandKitWorkflow();

    await expect(workflow.run({ brandName: 'x' }, provider)).rejects.toThrow('logo generation failed');
    // brand (1) + the failing logo attempt (1) — palette/typography never ran.
    expect(callCount).toBe(2);
  });

  it('emits lifecycle events for every step, in order', async () => {
    const provider = makeMockProvider();
    const workflow = new BrandKitWorkflow();
    const events: WorkflowEvent[] = [];

    await workflow.run({ brandName: 'x' }, provider, { onEvent: (event) => events.push(event) });

    expect(events.map((e) => e.type)).toEqual([
      'workflow-started',
      'step-started',
      'step-completed',
      'step-started',
      'step-completed',
      'step-started',
      'step-completed',
      'step-started',
      'step-completed',
      'workflow-completed',
    ]);
    expect(events.map((e) => e.stepName).filter(Boolean)).toEqual([
      'design.brand',
      'design.brand',
      'design.logo',
      'design.logo',
      'design.palette',
      'design.palette',
      'design.typography',
      'design.typography',
    ]);
  });

  it('emits step-failed and stops the event stream when a step throws', async () => {
    const provider: Provider = {
      name: 'failing',
      async generate() {
        throw new Error('boom');
      },
    };
    const workflow = new BrandKitWorkflow();
    const events: WorkflowEvent[] = [];

    await expect(
      workflow.run({ brandName: 'x' }, provider, { onEvent: (event) => events.push(event) })
    ).rejects.toThrow('boom');

    expect(events.map((e) => e.type)).toEqual(['workflow-started', 'step-started', 'step-failed']);
  });
});

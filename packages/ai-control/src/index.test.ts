import { describe, expect, it } from 'vitest';
import { Aidex, type Provider, type Strategy } from '@aidex/core';
import {
  AIDisabledError,
  AIFeatureControlPlugin,
  InMemoryAIFeatureControl,
  type AIControlState,
  type AIFeatureControl,
} from './index.js';

describe('@aidex/ai-control public API (via package barrel)', () => {
  it('runs the full enable/disable/read flow through the barrel import only', async () => {
    const control: AIFeatureControl = new InMemoryAIFeatureControl();
    const provider: Provider = {
      name: 'stub',
      async generate(prompt) {
        return { content: `ok:${prompt.content}` };
      },
    };
    const strategy: Strategy<string> = {
      name: 'text-generation',
      async execute(request, context) {
        const response = await context.provider.generate({ content: String(request.input ?? '') });
        return response.content;
      },
    };

    const aidex = new Aidex({ provider, plugins: [new AIFeatureControlPlugin(control)] });
    aidex.registerStrategy(strategy);

    await expect(
      aidex.execute<string>({ strategy: 'text-generation', input: 'hi' })
    ).resolves.toBe('ok:hi');

    control.setEnabled(false);
    const rejection = aidex.execute({ strategy: 'text-generation', input: 'hi' });
    await expect(rejection).rejects.toBeInstanceOf(AIDisabledError);
    await expect(rejection).rejects.toBeInstanceOf(Error);

    const state: AIControlState = control.getState();
    expect(state).toEqual({ enabled: false, features: {} });
  });
});

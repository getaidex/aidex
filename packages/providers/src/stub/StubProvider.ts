import type { AidexOptions, Prompt, Provider, ProviderResponse } from '@aidex/core';
import {
  ProviderCapability,
  createProviderCapabilities,
  type ProviderCapabilities,
  type CapableProvider,
} from '../capabilities/index.js';

export interface StubProviderConfig {
  name?: string;
}

export class StubProvider implements Provider, CapableProvider {
  readonly name: string;

  // Reflects what generate() below actually does, not what a "real" model
  // could theoretically do — flip a capability to true only once the
  // matching implementation genuinely exists.
  private readonly capabilities = createProviderCapabilities([ProviderCapability.TextGeneration]);

  constructor(config: StubProviderConfig = {}) {
    this.name = config.name ?? 'stub';
  }

  async generate(prompt: Prompt, options?: AidexOptions): Promise<ProviderResponse> {
    return {
      // content: the one field every caller can rely on — a pure,
      // deterministic function of prompt.content, standing in for "the model's
      // answer" without ever calling a model.
      content: `stub:${prompt.content}`,
      // metadata: propagate whatever the Prompt carried in, plus this
      // provider's own identity — the shape a real provider uses to surface
      // its own diagnostics (e.g. { model, tokenCount }) alongside the
      // caller's original trace/tagging data.
      metadata: { ...prompt.metadata, provider: this.name },
      // raw: the escape hatch a real provider fills with its vendor SDK's
      // untyped native response. There is no SDK here, so this echoes the
      // exact prompt/options generate() received — enough to prove the field
      // is wired end-to-end without inventing a fake vendor payload shape.
      raw: { prompt, options: options ?? null },
    };
  }

  getCapabilities(): ProviderCapabilities {
    return this.capabilities;
  }
}

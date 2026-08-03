import type { Plugin } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { PromptTemplate } from '@aidex/prompts';
import type { EngineMetadata } from '@aidex/catalog';

/**
 * A feature pack's complete, hand-assembled manifest — everything it
 * offers, ready for AIBuilder.use() to fan into the SDK's real registries.
 * `workflows` is generic over TWorkflow purely so a feature pack's own
 * manifest constant (and any application reading it back) gets real types
 * instead of `unknown[]` — the SDK itself never inspects TWorkflow and
 * AIBuilder.use() never registers, adapts, wraps, or executes anything in
 * this array. Feature-pack workflow helpers (e.g. DocumentReviewWorkflow)
 * predate @aidex/workflow's Workflow/WorkflowRegistry and have their own
 * run(input, provider, options) shape — this field exists purely so the
 * manifest represents "everything this pack offers" for an app to
 * discover and use directly, via each workflow's own native API.
 *
 * Every Engine in `engines` is a singleton, shared across every
 * EngineRegistry that registers it — engine implementations must stay
 * stateless; all execution state belongs on ExecutionContext, never on
 * the Engine instance itself.
 */
export interface FeaturePackage<TWorkflow = unknown> {
  readonly name: string;
  readonly version: string;
  readonly engines?: readonly Engine[];
  readonly prompts?: readonly PromptTemplate[];
  /**
   * Note: each entry is installed via AIBuilder.plugin(), which fully
   * supports @aidex/plugins' ExtendedPlugin bulk-registration — if an entry
   * declares registerEngines()/registerStrategies()/registerPrompts()/
   * registerTools(), those are registered exactly as if called directly on
   * the builder. This manifest's own engines/prompts arrays remain the
   * more direct approach for this pack's own capabilities, but a plugin
   * that declares its own via ExtendedPlugin works too.
   */
  readonly plugins?: readonly Plugin[];
  readonly metadata?: readonly EngineMetadata[];
  readonly workflows?: readonly TWorkflow[];
}

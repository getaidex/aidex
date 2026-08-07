export { AI } from './AI.js';
export { AIBuilder } from './builder/AIBuilder.js';
export { EngineHandle } from './engine/EngineHandle.js';
export { WorkflowHandle } from './workflow/WorkflowHandle.js';
export type { AIConfiguration } from './configuration/AIConfiguration.js';
export type { AidexWorkflowContext } from './workflow/WorkflowHandle.js';
export type { FeaturePackage } from './featurePackage/FeaturePackage.js';

// AidexError is exported here as the one deliberate exception to the
// "domain errors aren't re-exported" convention below — it's not a
// domain-specific error like StrategyNotFoundError; it's the universal
// base type every application-level catch needs regardless of which
// package threw, so it belongs alongside this SDK's other public types.
export { AidexError } from '@aidex/core';
export type { AidexErrorOptions } from '@aidex/core';

// Re-exported because they're direct parameter types of this SDK's own
// public methods (AIBuilder.provider()/.plugin(), AIConfiguration.provider/
// .plugins) — a developer authoring a custom Provider or Plugin to pass into
// this SDK would otherwise have to import @aidex/core directly, breaking the
// SDK's own "applications never need to import @aidex/core" promise for
// exactly the case this package exists to support.
//
// Strategy is deliberately NOT re-exported: nothing in this SDK's public
// surface accepts one today (AIBuilder has no .strategy() method — only
// @aidex/strategies' TextGenerationStrategy is auto-registered internally).
// Exporting a type with no corresponding capability to use it would itself
// be exposing an unnecessary type. Revisit if/when AIBuilder grows a way to
// register a custom Strategy.
export type { Provider, Plugin } from '@aidex/core';

// Engine is re-exported for the identical reason as Provider/Plugin above:
// it's a direct parameter type of AIBuilder.engine(). EngineNotFoundError
// and UnsupportedProviderCapabilityError are deliberately NOT re-exported —
// matches the existing precedent that @aidex/core's StrategyNotFoundError
// isn't re-exported either; callers who need instanceof on these import
// @aidex/engines directly, the same as they would for a kernel error today.
export type { Engine } from '@aidex/engines';

// Workflow is re-exported for the identical reason: it's a direct
// parameter type of AIBuilder.workflow(). WorkflowNotFoundError and
// WorkflowAlreadyRegisteredError are deliberately NOT re-exported — same
// precedent as EngineNotFoundError/UnsupportedProviderCapabilityError/
// StrategyNotFoundError; callers who need instanceof on these import
// @aidex/workflow directly.
export type { Workflow } from '@aidex/workflow';

// PromptTemplate is a direct parameter type of AIBuilder.prompt() (and of
// FeaturePackage.prompts); PromptRegistry is the direct return type of
// AI.prompts(). PromptNotFoundError/MissingPromptVariableError/
// InvalidPromptError are deliberately NOT re-exported — same precedent as
// every other domain error in this file; callers who need instanceof on
// these import @aidex/prompts directly.
export type { PromptTemplate, PromptRegistry } from '@aidex/prompts';

// EngineMetadata is a direct parameter type of FeaturePackage.metadata;
// EngineCatalog is the direct return type of AI.catalog().
export type { EngineMetadata, EngineCatalog } from '@aidex/catalog';

// Tool is a direct parameter type of AIBuilder.tool() (and of
// ExtendedPlugin.registerTools(), consumed internally); ToolRegistry is
// the direct return type of AI.tools(). ToolNotFoundError/
// ToolPermissionDeniedError are deliberately NOT re-exported — same
// precedent as every other domain error in this file; callers who need
// instanceof on these import @aidex/tools directly.
export type { Tool, ToolRegistry } from '@aidex/tools';

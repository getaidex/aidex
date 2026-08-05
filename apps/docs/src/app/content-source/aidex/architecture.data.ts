import type { DiagramData } from '../../engine/diagrams/diagram.types';

export interface ArchitectureSection {
  id: string;
  title: string;
  summary: string;
  diagram: DiagramData;
}

/**
 * Hand-authored, not mechanically parsed — these describe conceptual request
 * flows that don't live in any single file, so they're written here directly
 * (grounded in docs/architecture/kernel-philosophy.md,
 * docs/architecture/request-lifecycle.md, and each package's own README, not
 * invented). The package dependency graph, by contrast, IS mechanically
 * generated — see dependency-graph.json.
 */
export const ARCHITECTURE_SECTIONS: ArchitectureSection[] = [
  {
    id: 'kernel',
    title: 'Kernel',
    summary:
      'The frozen core every layer above it depends on. Four public members, ever: new Aidex(), use(), registerStrategy(), execute().',
    diagram: {
      title: 'Kernel execution flow',
      layers: [
        {
          nodes: [
            {
              id: 'application',
              label: 'Your Application',
              description:
                'Configures Aidex with a Provider and Strategies, then calls execute(). Every product and business decision lives here — the kernel never sees them.',
            },
          ],
        },
        {
          nodes: [
            {
              id: 'kernel',
              label: 'Aidex Kernel',
              description:
                'new Aidex(config) stores config, builds Lifecycle/StrategyRegistry/PluginRegistry, and exposes exactly four public members. Its public surface is locked forever; what request objects carry is free to grow.',
              relatedPackages: [{ label: '@aidex/core', path: '/packages/core' }],
              relatedGuide: { label: 'Creating Plugins', path: '/guides/creating-plugins' },
            },
          ],
        },
        {
          nodes: [
            {
              id: 'strategy',
              label: 'Strategy',
              description:
                'Looked up by name from StrategyRegistry and awaited inside execute(). Builds a Prompt, calls a Provider, and shapes the raw response into a result.',
              relatedPackages: [{ label: '@aidex/strategies', path: '/packages/strategies' }],
            },
          ],
        },
        {
          nodes: [
            {
              id: 'provider',
              label: 'Provider',
              description:
                'Turns a Prompt into a ProviderResponse by calling one AI backend — Gemini today, others later. No awareness of strategy logic or what the caller intends.',
              relatedPackages: [{ label: '@aidex/providers', path: '/packages/providers' }],
              relatedGuide: { label: 'Creating a Provider', path: '/guides/creating-a-provider' },
              relatedExamples: [{ label: '04 — Custom Provider', path: '/examples/04-custom-provider' }],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'sdk',
    title: 'SDK',
    summary: 'The developer-facing façade most applications touch, hiding kernel construction and wiring.',
    diagram: {
      title: 'SDK façade',
      layers: [
        {
          nodes: [
            {
              id: 'aibuilder',
              label: 'AIBuilder',
              description:
                '.provider(p).build() assembles a raw Aidex kernel instance behind one façade, hiding StrategyRegistry and PluginRegistry wiring.',
              relatedPackages: [{ label: '@aidex/sdk', path: '/packages/sdk' }],
            },
          ],
        },
        {
          nodes: [
            {
              id: 'ai',
              label: 'AI',
              description:
                'The façade AIBuilder returns. ai.text(prompt) and ai.execute(request) are the two calls most applications ever need — the entire public surface for most integrations.',
              relatedPackages: [{ label: '@aidex/sdk', path: '/packages/sdk' }],
              relatedExamples: [{ label: '01 — Getting Started', path: '/examples/01-getting-started' }],
            },
          ],
        },
        {
          nodes: [
            {
              id: 'kernel-sdk',
              label: 'Aidex Kernel',
              description: 'What AI wraps internally — the same frozen four-method kernel shown in the Kernel diagram.',
              relatedPackages: [{ label: '@aidex/core', path: '/packages/core' }],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'provider-abstraction',
    title: 'Provider abstraction',
    summary: 'A two-member interface — adding a new AI backend never touches the kernel.',
    diagram: {
      title: 'Provider abstraction',
      layers: [
        {
          nodes: [
            {
              id: 'provider-interface',
              label: 'Provider interface',
              description:
                'Exactly two members: { name, generate(prompt, options?) }. Nothing else — this is the entire contract a new backend implements.',
              relatedPackages: [{ label: '@aidex/core', path: '/packages/core' }],
              relatedGuide: { label: 'Creating a Provider', path: '/guides/creating-a-provider' },
            },
          ],
        },
        {
          nodes: [
            {
              id: 'stub-provider',
              label: 'StubProvider',
              description: 'A deterministic, network-free implementation used for demos, tests, and examples.',
              relatedPackages: [{ label: '@aidex/providers', path: '/packages/providers' }],
            },
            {
              id: 'gemini-provider',
              label: 'GeminiProvider',
              description: 'A real implementation calling Google Gemini via @google/genai, with error translation and observability wiring.',
              relatedPackages: [{ label: '@aidex/providers', path: '/packages/providers' }],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'engine-execution',
    title: 'Engine execution',
    summary: 'A provider-agnostic, domain-agnostic unit of work, dispatched by id — separate from the kernel entirely.',
    diagram: {
      title: 'Engine execution',
      layers: [
        {
          nodes: [
            {
              id: 'engine-registry',
              label: 'EngineRegistry',
              description:
                'register()/execute(id, context) dispatches by id to a registered Engine, reusing @aidex/core\'s ExecutionContext rather than a parallel shape.',
              relatedPackages: [{ label: '@aidex/engines', path: '/packages/engines' }],
            },
          ],
        },
        {
          nodes: [
            {
              id: 'engine',
              label: 'Engine',
              description:
                '{ id, name, description, version, execute(context) }. Provider-agnostic and domain-agnostic — the registry has no idea what any engine actually does.',
              relatedPackages: [
                { label: '@aidex/engines', path: '/packages/engines' },
                { label: '@aidex/catalog', path: '/packages/catalog' },
              ],
              relatedGuide: { label: 'Creating an Engine', path: '/guides/creating-an-engine' },
              relatedExamples: [{ label: '14 — Custom Engine', path: '/examples/14-custom-engine' }],
            },
          ],
        },
        {
          nodes: [
            {
              id: 'engine-provider',
              label: 'Provider (optional)',
              description:
                'An Engine may call a Provider via the ExecutionContext it receives, gated by engineSupportsProvider() capability checks against its requiredCapabilities.',
              relatedPackages: [{ label: '@aidex/providers', path: '/packages/providers' }],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'workflow-execution',
    title: 'Workflow execution',
    summary: 'An ordered sequence of steps run strictly one after another against one shared context.',
    diagram: {
      title: 'Workflow execution',
      layers: [
        {
          nodes: [
            {
              id: 'workflow',
              label: 'Workflow',
              description:
                'An ordered list of WorkflowSteps, run by WorkflowExecutor directly or dispatched by id via WorkflowRegistry.',
              relatedPackages: [{ label: '@aidex/workflow', path: '/packages/workflow' }],
              relatedGuide: { label: 'Creating a Workflow', path: '/guides/creating-a-workflow' },
              relatedExamples: [{ label: '11 — Workflow Orchestration', path: '/examples/11-workflow-orchestration' }],
            },
          ],
        },
        {
          nodes: [
            {
              id: 'workflow-step',
              label: 'WorkflowStep(s)',
              description:
                'Each step is { name, execute(context) }. WorkflowExecutor awaits them strictly in order; a thrown error stops the run immediately — no retry, no parallelism.',
              relatedPackages: [{ label: '@aidex/workflow', path: '/packages/workflow' }],
            },
          ],
        },
        {
          nodes: [
            {
              id: 'workflow-context',
              label: 'WorkflowContext',
              description:
                'A generic, provider-independent bag of shared state. Steps communicate forward by mutating it in place.',
              relatedPackages: [{ label: '@aidex/workflow', path: '/packages/workflow' }],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'plugin-lifecycle',
    title: 'Plugin lifecycle',
    summary: 'Five phases, and a plugin observes only the ones it defines a hook for.',
    diagram: {
      title: 'Plugin lifecycle',
      layers: [
        {
          nodes: [
            {
              id: 'plugin',
              label: 'Plugin',
              description:
                'A plain object: a required name, plus up to five optional hooks — onBoot, onReady, beforeExecute, afterExecute, onShutdown.',
              relatedPackages: [{ label: '@aidex/plugins', path: '/packages/plugins' }],
              relatedGuide: { label: 'Creating Plugins', path: '/guides/creating-plugins' },
              relatedExamples: [{ label: '12 — Plugin Example', path: '/examples/12-plugin-example' }],
            },
          ],
        },
        {
          nodes: [
            {
              id: 'use',
              label: 'use(plugin)',
              description:
                'Registers the plugin, then wires each hook it actually defines to its matching Lifecycle phase — an unused hook is never attached at all.',
              relatedPackages: [{ label: '@aidex/core', path: '/packages/core' }],
            },
          ],
        },
        {
          nodes: [
            {
              id: 'lifecycle-phases',
              label: 'Lifecycle phases',
              description:
                'boot (fires before any plugin is wired — unobservable by design), ready (config.plugins entries only), beforeExecute/afterExecute (awaited on every execute() call), shutdown (reserved, not yet wired to any public method).',
              relatedPackages: [{ label: '@aidex/core', path: '/packages/core' }],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'registry-system',
    title: 'Registry system',
    summary: 'One shape, five registries — register/unregister/has/get/list, plus one dispatch method each.',
    diagram: {
      title: 'Registry system',
      layers: [
        {
          nodes: [
            {
              id: 'registry-pattern',
              label: 'Registry pattern',
              description:
                'register()/unregister()/has()/get()/list(), plus one dispatch method. Silent lookup (has/get) always stays separate from fail-loud dispatch (execute/render/call).',
            },
          ],
        },
        {
          nodes: [
            {
              id: 'strategy-registry',
              label: 'StrategyRegistry',
              description: 'Dispatches Strategies by name inside the kernel.',
              relatedPackages: [{ label: '@aidex/core', path: '/packages/core' }],
            },
            {
              id: 'engine-registry-node',
              label: 'EngineRegistry',
              description: 'Dispatches Engines by id.',
              relatedPackages: [{ label: '@aidex/engines', path: '/packages/engines' }],
              relatedGuide: { label: 'Creating an Engine', path: '/guides/creating-an-engine' },
            },
            {
              id: 'prompt-registry',
              label: 'PromptRegistry',
              description: 'Dispatches versioned prompt templates by id (and optional version).',
              relatedPackages: [{ label: '@aidex/prompts', path: '/packages/prompts' }],
              relatedGuide: { label: 'Prompt Templates', path: '/guides/prompt-templates' },
            },
            {
              id: 'tool-registry',
              label: 'ToolRegistry',
              description: 'Dispatches permission-gated Tools by name.',
              relatedPackages: [{ label: '@aidex/tools', path: '/packages/tools' }],
            },
            {
              id: 'workflow-registry',
              label: 'WorkflowRegistry',
              description: 'Dispatches Workflows by id, delegating to WorkflowExecutor.',
              relatedPackages: [{ label: '@aidex/workflow', path: '/packages/workflow' }],
              relatedGuide: { label: 'Creating a Workflow', path: '/guides/creating-a-workflow' },
            },
          ],
        },
      ],
    },
  },
  {
    id: 'observability',
    title: 'Observability',
    summary: 'Duration, cost, and an ordered event timeline — every input supplied by the caller, no vendor pricing baked in.',
    diagram: {
      title: 'Observability',
      layers: [
        {
          nodes: [
            {
              id: 'observability-bus',
              label: 'ObservabilityBus',
              description:
                'subscribe(handler)/emit(event), backed by a Timeline for ordered history. Eight track*() convenience methods cover every signal this package knows about.',
              relatedPackages: [{ label: '@aidex/observability', path: '/packages/observability' }],
              relatedGuide: { label: 'Observability', path: '/guides/observability' },
              relatedExamples: [{ label: '06 — Observability', path: '/examples/06-observability' }],
            },
          ],
        },
        {
          nodes: [
            {
              id: 'execution-metrics',
              label: 'ExecutionMetrics',
              description: 'Pure duration math: recordStart(), recordEnd(), getDuration().',
              relatedPackages: [{ label: '@aidex/observability', path: '/packages/observability' }],
            },
            {
              id: 'cost-estimator',
              label: 'CostEstimator',
              description: 'Pure math over token counts and prices the caller supplies — no hardcoded vendor pricing table.',
              relatedPackages: [{ label: '@aidex/observability', path: '/packages/observability' }],
            },
            {
              id: 'timeline',
              label: 'Timeline',
              description: 'An ordered, caller-driven event collector — never generates its own timestamp.',
              relatedPackages: [{ label: '@aidex/observability', path: '/packages/observability' }],
            },
          ],
        },
      ],
    },
  },
];

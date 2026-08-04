/**
 * 11 — Workflow Orchestration
 *
 * A real multi-engine pipeline: extract → summarize → translate →
 * review, chained via @aidex/workflow's generic Workflow/
 * WorkflowExecutor. Each WorkflowStep closes over the SDK's `ai`
 * instance and calls a document engine, storing its result on shared
 * state for later steps — translate's input is literally derived from
 * summarize's output, a real data dependency, not just four unrelated
 * calls run in sequence. A second run demonstrates cancellation via
 * AbortController.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AIBuilder, type AI } from '@aidex/sdk';
import { GeminiProvider } from '@aidex/providers';
import type { Provider } from '@aidex/core';
import { DOCUMENT_FEATURE_PACKAGE, DocumentEngineId } from '@aidex/document';
import { Workflow, WorkflowExecutor, WorkflowCancelledError, type WorkflowEvent } from '@aidex/workflow';

// `import.meta.dirname` needs Node 20.11+/21.2+ — this repo supports
// Node >=18, so resolve __dirname the portable way instead.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface PipelineState {
  source: { content: string; mimeType: string };
  extracted?: { fields: Record<string, string> };
  summary?: string;
  translated?: string;
  reviewFindings?: { issue: string; severity: string; recommendation: string }[];
}

let currentStepEngineId: DocumentEngineId | string = DocumentEngineId.Extract;

function demoResponseFor(engineId: string): string {
  switch (engineId) {
    case DocumentEngineId.Extract:
      return JSON.stringify({ fields: { topic: 'event-driven architecture', tradeoff: 'operational complexity' } });
    case DocumentEngineId.Translate:
      return JSON.stringify({ translatedText: 'Los sistemas orientados a eventos desacoplan productores de consumidores.', detectedSourceLanguage: 'English' });
    case DocumentEngineId.Review:
      return JSON.stringify({
        findings: [{ issue: 'No mention of monitoring tooling choice', severity: 'low', recommendation: 'Name at least one tracing tool as an example.' }],
        summary: 'Solid overview, one minor gap.',
      });
    default: // Summarize — plain text, not JSON
      return 'Event-driven architecture decouples services for independent deploys, at the cost of needing strong tracing and schema discipline.';
  }
}

function createProvider(): Provider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) return new GeminiProvider({ apiKey });
  return {
    name: 'demo-workflow-provider',
    async generate() {
      return { content: demoResponseFor(currentStepEngineId) };
    },
  };
}

function buildPipeline(ai: AI): Workflow<PipelineState> {
  const workflow = new Workflow<PipelineState>('document-pipeline');

  workflow.addStep({
    name: 'extract',
    async execute(state) {
      currentStepEngineId = DocumentEngineId.Extract;
      state.extracted = (await ai.engine(DocumentEngineId.Extract).execute({ source: state.source })) as PipelineState['extracted'];
    },
  });

  workflow.addStep({
    name: 'summarize',
    async execute(state) {
      currentStepEngineId = DocumentEngineId.Summarize;
      const result = (await ai.engine(DocumentEngineId.Summarize).execute({ source: state.source })) as { summary: string };
      state.summary = result.summary;
    },
  });

  workflow.addStep({
    name: 'translate',
    async execute(state) {
      currentStepEngineId = DocumentEngineId.Translate;
      // Real dependency: this step's input is the previous step's output,
      // not the original source — proof this is a pipeline, not four
      // independent calls run back to back.
      const result = (await ai.engine(DocumentEngineId.Translate).execute({
        source: { content: state.summary ?? '', mimeType: 'text/plain' },
        targetLanguage: 'Spanish',
      })) as { translatedText: string };
      state.translated = result.translatedText;
    },
  });

  workflow.addStep({
    name: 'review',
    async execute(state) {
      currentStepEngineId = DocumentEngineId.Review;
      const result = (await ai.engine(DocumentEngineId.Review).execute({ source: state.source })) as {
        findings: PipelineState['reviewFindings'];
      };
      state.reviewFindings = result.findings;
    },
  });

  return workflow;
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.log('No GEMINI_API_KEY found — using a demo provider with canned per-step JSON.\n');
  }

  const content = await readFile(path.join(__dirname, 'fixtures', 'article.md'), 'utf8');
  const ai = new AIBuilder().provider(createProvider()).use(DOCUMENT_FEATURE_PACKAGE).build();
  const workflow = buildPipeline(ai);
  const executor = new WorkflowExecutor();

  console.log('Running pipeline: extract → summarize → translate → review\n');

  const finalState = await executor.execute(
    workflow,
    { source: { content, mimeType: 'text/plain' } },
    {
      onEvent: (event: WorkflowEvent) => {
        console.log(`[workflow event] ${event.type}${event.stepName ? ` (${event.stepName})` : ''}`);
      },
    }
  );

  console.log('\nExtracted fields:', finalState.extracted?.fields);
  console.log('Summary:', finalState.summary);
  console.log('Translated summary (Spanish):', finalState.translated);
  console.log('Review findings:', finalState.reviewFindings);

  console.log('\nNow demonstrating cancellation — aborting immediately:');
  const controller = new AbortController();
  controller.abort();
  try {
    await executor.execute(buildPipeline(ai), { source: { content, mimeType: 'text/plain' } }, { signal: controller.signal });
  } catch (error) {
    if (error instanceof WorkflowCancelledError) {
      console.log(`Workflow cancelled as expected (stepName: ${error.stepName ?? 'n/a'}).`);
    } else {
      throw error;
    }
  }
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});

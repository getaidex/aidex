import { describe, expect, it } from 'vitest';
import type { AidexConfig, ILogger, Metadata } from '@aidex/core';
import { Workflow, WorkflowRegistry, type WorkflowStep } from '@aidex/workflow';
import { WorkflowHandle, type AidexWorkflowContext } from './WorkflowHandle.js';

function makeConfig(): AidexConfig {
  return {
    provider: {
      name: 'stub',
      async generate(prompt) {
        return { content: prompt.content };
      },
    },
  };
}

function makeConfigWithLoggerAndMetadata(): AidexConfig & { logger: ILogger; metadata: Metadata } {
  const logger: ILogger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
  const metadata: Metadata = {
    userId: 'user-123',
    sessionId: 'session-456',
  };

  return {
    provider: {
      name: 'stub',
      async generate(prompt) {
        return { content: prompt.content };
      },
    },
    logger,
    metadata,
  };
}

interface TestState {
  documentId: string;
}

type FullContext = TestState & { $aidex: AidexWorkflowContext };

function makeRecordingStep(contexts: FullContext[]): WorkflowStep<FullContext> {
  return {
    name: 'record',
    async execute(context) {
      contexts.push(context);
    },
  };
}

describe('WorkflowHandle', () => {
  it('delegates execute() to WorkflowRegistry.execute() and returns the final context', async () => {
    const registry = new WorkflowRegistry();
    const contexts: FullContext[] = [];
    const workflow = new Workflow<FullContext>('resume-review');
    workflow.addStep(makeRecordingStep(contexts));
    registry.register(workflow);
    const handle = new WorkflowHandle<TestState>(registry, makeConfig(), 'resume-review');

    const result = await handle.execute({ documentId: 'doc-1' });

    expect(result.documentId).toBe('doc-1');
    expect(contexts).toHaveLength(1);
  });

  it('injects a frozen $aidex object carrying provider/config/logger/metadata', async () => {
    const registry = new WorkflowRegistry();
    const contexts: FullContext[] = [];
    const workflow = new Workflow<FullContext>('resume-review');
    workflow.addStep(makeRecordingStep(contexts));
    registry.register(workflow);
    const config = makeConfigWithLoggerAndMetadata();
    const handle = new WorkflowHandle<TestState>(registry, config, 'resume-review');

    await handle.execute({ documentId: 'doc-1' });

    expect(contexts[0]?.$aidex.provider).toBe(config.provider);
    expect(contexts[0]?.$aidex.config).toBe(config);
    expect(contexts[0]?.$aidex.logger).toBe(config.logger);
    expect(contexts[0]?.$aidex.metadata).toBe(config.metadata);
    expect(Object.isFrozen(contexts[0]?.$aidex)).toBe(true);
  });

  it('does not let a step mutate the $aidex object', async () => {
    const registry = new WorkflowRegistry();
    const workflow = new Workflow<FullContext>('resume-review');
    workflow.addStep({
      name: 'try-mutate',
      async execute(context) {
        expect(() => {
          (context.$aidex as { provider: unknown }).provider = null;
        }).toThrow();
      },
    });
    registry.register(workflow);
    const handle = new WorkflowHandle<TestState>(registry, makeConfig(), 'resume-review');

    await expect(handle.execute({ documentId: 'doc-1' })).resolves.toBeDefined();
  });

  it('preserves the caller-supplied input fields alongside $aidex', async () => {
    const registry = new WorkflowRegistry();
    const contexts: FullContext[] = [];
    const workflow = new Workflow<FullContext>('resume-review');
    workflow.addStep(makeRecordingStep(contexts));
    registry.register(workflow);
    const handle = new WorkflowHandle<TestState>(registry, makeConfig(), 'resume-review');

    await handle.execute({ documentId: 'doc-42' });

    expect(contexts[0]?.documentId).toBe('doc-42');
  });

  it('propagates a rejection from WorkflowRegistry.execute() without catching it', async () => {
    const registry = new WorkflowRegistry();
    const handle = new WorkflowHandle<TestState>(registry, makeConfig(), 'missing-workflow');

    await expect(handle.execute({ documentId: 'doc-1' })).rejects.toThrow(/not found/i);
  });

  it('works with no input argument, still receiving $aidex', async () => {
    const registry = new WorkflowRegistry();
    const contexts: FullContext[] = [];
    const workflow = new Workflow<FullContext>('resume-review');
    workflow.addStep(makeRecordingStep(contexts));
    registry.register(workflow);
    const handle = new WorkflowHandle<TestState>(registry, makeConfig(), 'resume-review');

    await handle.execute();

    expect(contexts[0]?.$aidex).toBeDefined();
  });

  it('passes options (e.g. an abort signal) through to the real WorkflowExecutor', async () => {
    const registry = new WorkflowRegistry();
    const contexts: FullContext[] = [];
    const workflow = new Workflow<FullContext>('resume-review');
    workflow.addStep(makeRecordingStep(contexts));
    registry.register(workflow);
    const handle = new WorkflowHandle<TestState>(registry, makeConfig(), 'resume-review');
    const controller = new AbortController();
    controller.abort();

    await expect(
      handle.execute({ documentId: 'doc-1' }, { signal: controller.signal })
    ).rejects.toThrow(/cancelled/i);
    expect(contexts).toHaveLength(0);
  });
});

import { describe, expect, it } from 'vitest';
import { WorkflowAlreadyRegisteredError } from './WorkflowAlreadyRegisteredError.js';

describe('WorkflowAlreadyRegisteredError', () => {
  it('carries the duplicate workflow id and a descriptive message', () => {
    const error = new WorkflowAlreadyRegisteredError('resume-review');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(WorkflowAlreadyRegisteredError);
    expect(error.name).toBe('WorkflowAlreadyRegisteredError');
    expect(error.workflowId).toBe('resume-review');
    expect(error.message).toBe('Workflow already registered: "resume-review"');
  });
});

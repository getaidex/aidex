import { describe, expect, it } from 'vitest';
import { WorkflowNotFoundError } from './WorkflowNotFoundError.js';

describe('WorkflowNotFoundError', () => {
  it('carries the missing workflow id and a descriptive message', () => {
    const error = new WorkflowNotFoundError('resume-review');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(WorkflowNotFoundError);
    expect(error.name).toBe('WorkflowNotFoundError');
    expect(error.workflowId).toBe('resume-review');
    expect(error.message).toBe('Workflow not found: "resume-review"');
  });
});

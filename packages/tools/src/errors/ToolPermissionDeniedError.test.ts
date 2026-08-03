import { describe, expect, it } from 'vitest';
import { ToolPermissionDeniedError } from './ToolPermissionDeniedError.js';

describe('ToolPermissionDeniedError', () => {
  it('carries the tool id, missing permissions, and a descriptive message', () => {
    const error = new ToolPermissionDeniedError('filesystem.write', [
      'filesystem:write',
      'filesystem:delete',
    ]);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ToolPermissionDeniedError');
    expect(error.toolId).toBe('filesystem.write');
    expect(error.missingPermissions).toEqual(['filesystem:write', 'filesystem:delete']);
    expect(error.message).toBe(
      'Tool "filesystem.write" requires permission(s) not granted: filesystem:write, filesystem:delete'
    );
  });
});

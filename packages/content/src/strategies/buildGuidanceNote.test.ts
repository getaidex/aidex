import { describe, expect, it } from 'vitest';
import { buildGuidanceNote } from './buildGuidanceNote.js';

describe('buildGuidanceNote', () => {
  it('returns an empty string when nothing is supplied', () => {
    expect(buildGuidanceNote({})).toBe('');
  });

  it('includes keywords when supplied', () => {
    expect(buildGuidanceNote({ keywords: ['a', 'b'] })).toBe(' Please incorporate these keywords: a, b.');
  });

  it('ignores an empty keywords array', () => {
    expect(buildGuidanceNote({ keywords: [] })).toBe('');
  });

  it('includes tone when supplied', () => {
    expect(buildGuidanceNote({ tone: 'formal' })).toBe(' Please use a formal tone.');
  });

  it('includes length when supplied', () => {
    expect(buildGuidanceNote({ length: 200 })).toBe(' Please aim for approximately 200 words.');
  });

  it('combines all three when all are supplied, semicolon-separated', () => {
    expect(buildGuidanceNote({ keywords: ['a'], tone: 'formal', length: 100 })).toBe(
      ' Please incorporate these keywords: a; use a formal tone; aim for approximately 100 words.'
    );
  });
});

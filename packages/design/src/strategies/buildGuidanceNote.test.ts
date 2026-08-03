import { describe, expect, it } from 'vitest';
import { buildGuidanceNote } from './buildGuidanceNote.js';

describe('buildGuidanceNote', () => {
  it('returns an empty string when nothing is supplied', () => {
    expect(buildGuidanceNote({})).toBe('');
  });

  it('includes targetAudience when supplied', () => {
    expect(buildGuidanceNote({ targetAudience: 'young professionals' })).toBe(
      ' Please note: the target audience is young professionals.'
    );
  });

  it('includes style when supplied', () => {
    expect(buildGuidanceNote({ style: 'minimalist' })).toBe(' Please note: use a minimalist style.');
  });

  it('includes industry when supplied', () => {
    expect(buildGuidanceNote({ industry: 'hospitality' })).toBe(' Please note: the industry is hospitality.');
  });

  it('combines all three when all are supplied, semicolon-separated', () => {
    expect(buildGuidanceNote({ targetAudience: 'families', style: 'playful', industry: 'retail' })).toBe(
      ' Please note: the target audience is families; use a playful style; the industry is retail.'
    );
  });
});

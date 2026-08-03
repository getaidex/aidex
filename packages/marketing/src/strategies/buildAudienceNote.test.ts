import { describe, expect, it } from 'vitest';
import { buildAudienceNote } from './buildAudienceNote.js';

describe('buildAudienceNote', () => {
  it('returns an empty string when targetAudience is undefined', () => {
    expect(buildAudienceNote(undefined)).toBe('');
  });

  it('returns a sentence naming the target audience when supplied', () => {
    expect(buildAudienceNote('young professionals')).toBe(' The target audience is young professionals.');
  });
});

import { describe, expect, it } from 'vitest';
import { assetFromDescription } from './assetFromDescription.js';

describe('assetFromDescription', () => {
  it('encodes the description into a data: URI', () => {
    const result = assetFromDescription('A minimalist blue logo', 'svg');
    expect(result.assetUrl).toBe('data:text/plain,A%20minimalist%20blue%20logo');
    expect(result.format).toBe('svg');
  });

  it('is dereferenceable — decoding the URI recovers the original description', () => {
    const description = 'A warm, hand-drawn poster with coffee cup illustrations & bold type';
    const result = assetFromDescription(description, 'png');
    const [, encoded] = result.assetUrl.split(',');
    expect(decodeURIComponent(encoded)).toBe(description);
  });

  it('does not include width/height', () => {
    const result = assetFromDescription('x', 'pdf');
    expect(result.width).toBeUndefined();
    expect(result.height).toBeUndefined();
  });
});

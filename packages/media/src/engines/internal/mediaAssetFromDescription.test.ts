import { describe, expect, it } from 'vitest';
import { mediaAssetFromDescription } from './mediaAssetFromDescription.js';

describe('mediaAssetFromDescription', () => {
  it('encodes the description into a data: URI and keeps the given mimeType', () => {
    const result = mediaAssetFromDescription('A minimalist blue product shot', 'image/png');
    expect(result.assetUrl).toBe('data:text/plain,A%20minimalist%20blue%20product%20shot');
    expect(result.mimeType).toBe('image/png');
  });

  it('is dereferenceable — decoding the URI recovers the original description', () => {
    const description = 'A warm, hand-drawn scene with coffee cups & bold type';
    const result = mediaAssetFromDescription(description, 'video/mp4');
    const [, encoded] = result.assetUrl.split(',');
    expect(decodeURIComponent(encoded)).toBe(description);
  });
});

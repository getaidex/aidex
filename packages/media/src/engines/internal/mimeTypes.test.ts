import { describe, expect, it } from 'vitest';
import { audioMimeType, genericMimeType, imageMimeType, videoMimeType } from './mimeTypes.js';

describe('imageMimeType', () => {
  it('maps each valid format', () => {
    expect(imageMimeType('png')).toBe('image/png');
    expect(imageMimeType('jpg')).toBe('image/jpeg');
    expect(imageMimeType('webp')).toBe('image/webp');
    expect(imageMimeType('svg')).toBe('image/svg+xml');
  });
  it('defaults to png when omitted', () => {
    expect(imageMimeType()).toBe('image/png');
  });
});

describe('videoMimeType', () => {
  it('maps each valid format', () => {
    expect(videoMimeType('mp4')).toBe('video/mp4');
    expect(videoMimeType('webm')).toBe('video/webm');
    expect(videoMimeType('mov')).toBe('video/quicktime');
  });
  it('defaults to mp4 when omitted', () => {
    expect(videoMimeType()).toBe('video/mp4');
  });
});

describe('audioMimeType', () => {
  it('maps each valid format', () => {
    expect(audioMimeType('mp3')).toBe('audio/mpeg');
    expect(audioMimeType('wav')).toBe('audio/wav');
    expect(audioMimeType('ogg')).toBe('audio/ogg');
  });
  it('defaults to mp3 when omitted', () => {
    expect(audioMimeType()).toBe('audio/mpeg');
  });
});

describe('genericMimeType', () => {
  it('builds a deterministic placeholder mime type from a free-form target format', () => {
    expect(genericMimeType('pdf')).toBe('application/pdf');
  });
});

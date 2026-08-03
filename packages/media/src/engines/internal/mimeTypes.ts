import type { AudioOutputFormat } from '../../types/audio.types.js';
import type { ImageOutputFormat } from '../../types/image.types.js';
import type { VideoOutputFormat } from '../../types/video.types.js';

const IMAGE_MIME_TYPES: Record<ImageOutputFormat, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

const VIDEO_MIME_TYPES: Record<VideoOutputFormat, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

const AUDIO_MIME_TYPES: Record<AudioOutputFormat, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
};

export function imageMimeType(format: ImageOutputFormat = 'png'): string {
  return IMAGE_MIME_TYPES[format];
}

export function videoMimeType(format: VideoOutputFormat = 'mp4'): string {
  return VIDEO_MIME_TYPES[format];
}

export function audioMimeType(format: AudioOutputFormat = 'mp3'): string {
  return AUDIO_MIME_TYPES[format];
}

/** `targetFormat` on media.asset.convert is a free-form string, not a closed union — no real MIME table can cover it, so this is an honest, deterministic placeholder convention, not a claim of correctness. */
export function genericMimeType(targetFormat: string): string {
  return `application/${targetFormat}`;
}

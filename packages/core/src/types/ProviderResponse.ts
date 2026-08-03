import type { Metadata } from './Metadata.js';

export interface ProviderResponse {
  readonly content: string;
  readonly raw?: unknown;
  readonly metadata?: Metadata;
}

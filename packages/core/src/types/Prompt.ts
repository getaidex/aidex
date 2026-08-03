import type { Metadata } from './Metadata.js';

export interface Prompt {
  readonly content: string;
  readonly metadata?: Metadata;
}

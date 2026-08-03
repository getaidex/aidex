import type { DocumentSource } from './DocumentSource.js';

/** `fields`, when supplied, limits extraction to those field names. */
export interface DocumentExtractRequest {
  readonly source: DocumentSource;
  readonly fields?: readonly string[];
}

export interface DocumentExtractResult {
  readonly fields: Record<string, string>;
  readonly confidence?: Record<string, number>;
}

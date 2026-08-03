import type { DocumentSource } from './DocumentSource.js';

export interface DocumentKeywordsRequest {
  readonly source: DocumentSource;
}

export interface DocumentKeywordsResult {
  readonly keywords: readonly string[];
}

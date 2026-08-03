import type { DocumentSource } from './DocumentSource.js';

export interface DocumentSummarizeRequest {
  readonly source: DocumentSource;
  readonly maxLength?: number;
}

export interface DocumentSummarizeResult {
  readonly summary: string;
}

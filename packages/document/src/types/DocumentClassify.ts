import type { DocumentSource } from './DocumentSource.js';

export interface DocumentClassifyRequest {
  readonly source: DocumentSource;
}

export interface DocumentClassifyResult {
  readonly documentType: string;
  readonly confidence?: number;
}

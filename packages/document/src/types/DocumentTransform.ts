import type { DocumentSource } from './DocumentSource.js';

/** `targetFormat` is a free-form string (e.g. "markdown", "plain-text", "json") — kept distinct from `translate` (language) and `summarize` (condensing). */
export interface DocumentTransformRequest {
  readonly source: DocumentSource;
  readonly targetFormat: string;
}

export interface DocumentTransformResult {
  readonly content: string;
  readonly mimeType: string;
}

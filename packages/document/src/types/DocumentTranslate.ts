import type { DocumentSource } from './DocumentSource.js';

/** `sourceLanguage` is a hint, not a requirement — omit it to auto-detect. */
export interface DocumentTranslateRequest {
  readonly source: DocumentSource;
  readonly targetLanguage: string;
  readonly sourceLanguage?: string;
}

export interface DocumentTranslateResult {
  readonly translatedText: string;
  readonly detectedSourceLanguage?: string;
}

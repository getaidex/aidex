import type { DocumentSource } from './DocumentSource.js';

export interface DocumentOcrRequest {
  readonly source: DocumentSource;
  readonly language?: string;
}

export interface OcrPage {
  readonly pageNumber: number;
  readonly text: string;
}

export interface DocumentOcrResult {
  readonly text: string;
  readonly pages?: readonly OcrPage[];
}

/** `sourceLanguage` is a hint, not a requirement — omit it to auto-detect. Mirrors @aidex/document's DocumentTranslateRequest/Result shape exactly. */
export interface ContentTranslateRequest {
  readonly content: string;
  readonly targetLanguage: string;
  readonly sourceLanguage?: string;
}

export interface ContentTranslateResult {
  readonly translatedContent: string;
  readonly detectedSourceLanguage?: string;
}

/** Mirrors @aidex/document's DocumentSummarizeRequest/Result shape exactly. */
export interface ContentSummarizeRequest {
  readonly content: string;
  readonly maxLength?: number;
}

export interface ContentSummarizeResult {
  readonly summary: string;
}

/** `targetKeywords`, when supplied, are what the optimization should target; `suggestedKeywords` on the result are what it found. */
export interface ContentSeoRequest {
  readonly content: string;
  readonly targetKeywords?: readonly string[];
}

export interface ContentSeoResult {
  readonly optimizedContent: string;
  readonly suggestedKeywords?: readonly string[];
  readonly metaDescription?: string;
}

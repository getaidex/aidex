/** `platform`, when supplied, is a free-form hint (e.g. "twitter", "linkedin") — no closed platform enum in Phase 1. */
export interface ContentSocialRequest {
  readonly topic: string;
  readonly platform?: string;
  readonly tone?: string;
}

export interface ContentSocialResult {
  readonly content: string;
  readonly hashtags?: readonly string[];
}

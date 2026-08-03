/** `instructions`, when supplied, steers the rewrite (e.g. "make it more formal"). */
export interface ContentRewriteRequest {
  readonly content: string;
  readonly instructions?: string;
}

export interface ContentRewriteResult {
  readonly rewrittenContent: string;
}

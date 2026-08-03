/** `description`, when supplied, is free-form context about the brand; `count` requests that many tagline variants. */
export interface ContentTaglineRequest {
  readonly brandName: string;
  readonly description?: string;
  readonly count?: number;
}

export interface ContentTaglineResult {
  readonly taglines: readonly string[];
}

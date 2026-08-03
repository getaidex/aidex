/** `keywords`/`tone`/`length`, when supplied, guide generation; none are required to produce something. */
export interface ContentGenerateRequest {
  readonly topic: string;
  readonly keywords?: readonly string[];
  readonly tone?: string;
  readonly length?: number;
}

export interface ContentGenerateResult {
  readonly content: string;
}

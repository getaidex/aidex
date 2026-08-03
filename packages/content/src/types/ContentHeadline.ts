/** `count`, when supplied, requests that many headline variants; omit it to let the implementation choose a default. */
export interface ContentHeadlineRequest {
  readonly topic: string;
  readonly count?: number;
}

export interface ContentHeadlineResult {
  readonly headlines: readonly string[];
}

export interface ContentShortenRequest {
  readonly content: string;
  readonly targetLength?: number;
}

export interface ContentShortenResult {
  readonly shortenedContent: string;
}

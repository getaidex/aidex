export interface ContentExpandRequest {
  readonly content: string;
  readonly targetLength?: number;
}

export interface ContentExpandResult {
  readonly expandedContent: string;
}

export interface ContentProductDescriptionRequest {
  readonly productName: string;
  readonly features?: readonly string[];
  readonly tone?: string;
}

export interface ContentProductDescriptionResult {
  readonly description: string;
}

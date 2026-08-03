export interface ContentBlogRequest {
  readonly topic: string;
  readonly keywords?: readonly string[];
  readonly tone?: string;
  readonly targetLength?: number;
}

export interface ContentBlogResult {
  readonly title: string;
  readonly content: string;
}

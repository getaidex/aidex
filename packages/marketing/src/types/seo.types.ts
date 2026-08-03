import type { MarketingBrief } from './marketing.types.js';

export interface SeoKeyword {
  readonly keyword: string;
  readonly estimatedVolume?: number;
  readonly difficulty?: 'low' | 'medium' | 'high';
}

export interface SeoKeywordsRequest extends MarketingBrief {
  readonly market?: string;
}

export interface SeoKeywordsResult {
  readonly keywords: readonly SeoKeyword[];
}

/** Does NOT extend MarketingBrief — meta tags are derived from existing page content, not a fresh creative brief. */
export interface SeoMetaRequest {
  readonly content: string;
  readonly targetKeyword?: string;
}

export interface SeoMetaResult {
  readonly title: string;
  readonly description: string;
}

export interface SeoAuditFinding {
  readonly issue: string;
  readonly severity: 'low' | 'medium' | 'high';
  readonly recommendation: string;
}

/** Does NOT extend MarketingBrief — an audit inspects an existing page/URL, not a fresh creative brief. */
export interface SeoAuditRequest {
  readonly url: string;
  readonly content?: string;
}

export interface SeoAuditResult {
  readonly score: number;
  readonly findings: readonly SeoAuditFinding[];
}

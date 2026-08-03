import type { DocumentSource } from './DocumentSource.js';

/**
 * Domain-neutral sibling of `ContractReviewRequest` — this engine reviews
 * any document, not just contracts, so `focusAreas` names general review
 * topics (e.g. "compliance", "formatting") rather than contract clauses.
 */
export interface DocumentReviewRequest {
  readonly source: DocumentSource;
  readonly focusAreas?: readonly string[];
}

export interface DocumentReviewFinding {
  readonly issue: string;
  readonly severity: 'low' | 'medium' | 'high';
  readonly recommendation: string;
}

export interface DocumentReviewResult {
  readonly findings: readonly DocumentReviewFinding[];
  readonly summary?: string;
}

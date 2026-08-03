import type { DocumentSource } from './DocumentSource.js';

/** `focusAreas`, when supplied, narrows review to those clause topics (e.g. "termination", "liability"). */
export interface ContractReviewRequest {
  readonly source: DocumentSource;
  readonly focusAreas?: readonly string[];
}

export interface ContractRisk {
  readonly clause: string;
  readonly severity: 'low' | 'medium' | 'high';
  readonly explanation: string;
}

export interface ContractReviewResult {
  readonly risks: readonly ContractRisk[];
  readonly summary?: string;
}

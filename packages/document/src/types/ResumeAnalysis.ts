import type { DocumentSource } from './DocumentSource.js';

/** `jobDescription`, when supplied, is scored against — `matchScore` on the result stays unset without it. */
export interface ResumeAnalysisRequest {
  readonly source: DocumentSource;
  readonly jobDescription?: string;
}

export interface ResumeAnalysisResult {
  readonly candidateName?: string;
  readonly skills: readonly string[];
  readonly experienceYears?: number;
  readonly summary?: string;
  readonly matchScore?: number;
}

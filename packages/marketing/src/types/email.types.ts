import type { MarketingBrief } from './marketing.types.js';

export interface EmailSubjectRequest extends MarketingBrief {
  readonly variantCount?: number;
}

export interface EmailSubjectResult {
  readonly subjects: readonly string[];
}

export interface EmailCopyRequest extends MarketingBrief {
  readonly callToAction?: string;
}

export interface EmailCopyResult {
  readonly subject: string;
  readonly body: string;
}

export interface EmailSequenceStep {
  readonly subject: string;
  readonly body: string;
  readonly sendDayOffset: number;
}

export interface EmailSequenceRequest extends MarketingBrief {
  readonly stepCount?: number;
}

export interface EmailSequenceResult {
  readonly steps: readonly EmailSequenceStep[];
}

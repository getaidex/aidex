export interface MetricPoint {
  readonly name: string;
  readonly value: number;
}

/** Does NOT extend MarketingBrief — analytics operates on existing metrics data, not a fresh creative brief. */
export interface AnalyticsSummaryRequest {
  readonly metrics: readonly MetricPoint[];
  readonly periodLabel?: string;
}

export interface AnalyticsSummaryResult {
  readonly summary: string;
  readonly highlights: readonly string[];
}

export interface AnalyticsInsight {
  readonly observation: string;
  readonly recommendation: string;
}

/** Does NOT extend MarketingBrief — analytics operates on existing metrics data, not a fresh creative brief. */
export interface AnalyticsInsightsRequest {
  readonly metrics: readonly MetricPoint[];
  readonly goal?: string;
}

export interface AnalyticsInsightsResult {
  readonly insights: readonly AnalyticsInsight[];
}

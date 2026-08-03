import type { MarketingBrief, MarketingChannel } from './marketing.types.js';

export interface CampaignObjective {
  readonly goal: string;
  readonly metric?: string;
}

export interface CampaignPlanRequest extends MarketingBrief {
  readonly channels?: readonly MarketingChannel[];
  readonly budget?: number;
  readonly durationDays?: number;
}

export interface CampaignPlanResult {
  readonly objectives: readonly CampaignObjective[];
  readonly channels: readonly MarketingChannel[];
  readonly summary: string;
}

export interface CampaignBriefRequest extends MarketingBrief {
  readonly product?: string;
}

export interface CampaignBriefResult {
  readonly document: string;
  readonly objectives: readonly string[];
}

export interface CampaignCalendarEntry {
  readonly date: string;
  readonly channel: MarketingChannel;
  readonly activity: string;
}

/**
 * Does NOT extend MarketingBrief — a calendar is derived from an
 * already-planned campaign (`campaignContext`, typically `campaign.plan`'s
 * own output), not a fresh creative brief.
 */
export interface CampaignCalendarRequest {
  readonly campaignContext: string;
  readonly startDate: string;
  readonly durationDays: number;
  readonly channels?: readonly MarketingChannel[];
}

export interface CampaignCalendarResult {
  readonly entries: readonly CampaignCalendarEntry[];
}

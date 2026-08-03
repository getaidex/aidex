import type { MarketingBrief } from './marketing.types.js';

/** Narrower than MarketingChannel (marketing.types.ts) — specific social networks, not broad marketing channels. */
export type SocialPlatform = 'instagram' | 'twitter' | 'linkedin' | 'facebook' | 'tiktok';

export interface SocialCaptionRequest extends MarketingBrief {
  readonly platform?: SocialPlatform;
}

export interface SocialCaptionResult {
  readonly caption: string;
}

export interface SocialHashtagsRequest extends MarketingBrief {
  readonly platform?: SocialPlatform;
  readonly count?: number;
}

export interface SocialHashtagsResult {
  readonly hashtags: readonly string[];
}

export interface SocialPostDraft {
  readonly content: string;
  readonly platform: SocialPlatform;
}

export interface ScheduledPost extends SocialPostDraft {
  readonly publishAt: string;
}

/** Does NOT extend MarketingBrief — scheduling arranges already-written posts, not a fresh creative brief. */
export interface SocialScheduleRequest {
  readonly posts: readonly SocialPostDraft[];
  readonly startDate: string;
}

export interface SocialScheduleResult {
  readonly scheduled: readonly ScheduledPost[];
}

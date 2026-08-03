/**
 * Minimal shared base — only `brief` (the creative starting point) and
 * `targetAudience` (central to almost every marketing operation, unlike
 * e.g. `@aidex/media`'s domain where a shared "audience" concept doesn't
 * apply) genuinely recur across this pack's generative engines. See the
 * README's "Design decisions" section for the full 8-extends/6-doesn't
 * split rationale.
 */
export interface MarketingBrief {
  readonly brief: string;
  readonly targetAudience?: string;
}

/**
 * Reused wherever an operation needs to name which marketing channel(s)
 * it targets — `campaign.plan` and `campaign.calendar` both use this;
 * kept separate from `SocialPlatform` (social.types.ts), which is a
 * narrower, social-specific concept.
 */
export type MarketingChannel = 'email' | 'social' | 'seo' | 'paid-ads' | 'content';

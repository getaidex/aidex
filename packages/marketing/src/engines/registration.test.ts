import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { EngineRegistry } from '@aidex/engines';
import { describe, expect, it } from 'vitest';
import { MarketingEngineId } from '../identifiers.js';
import { AnalyticsInsightsEngine } from './AnalyticsInsightsEngine.js';
import { AnalyticsSummaryEngine } from './AnalyticsSummaryEngine.js';
import { CampaignBriefEngine } from './CampaignBriefEngine.js';
import { CampaignCalendarEngine } from './CampaignCalendarEngine.js';
import { CampaignPlanEngine } from './CampaignPlanEngine.js';
import { EmailCopyEngine } from './EmailCopyEngine.js';
import { EmailSequenceEngine } from './EmailSequenceEngine.js';
import { EmailSubjectEngine } from './EmailSubjectEngine.js';
import { SeoAuditEngine } from './SeoAuditEngine.js';
import { SeoKeywordsEngine } from './SeoKeywordsEngine.js';
import { SeoMetaEngine } from './SeoMetaEngine.js';
import { SocialCaptionEngine } from './SocialCaptionEngine.js';
import { SocialHashtagsEngine } from './SocialHashtagsEngine.js';
import { SocialScheduleEngine } from './SocialScheduleEngine.js';

/**
 * There is no `aidex.engine(id)` method anywhere in this platform —
 * `Aidex` (@aidex/core) has exactly four public methods, none of them
 * that. Engine registration/dispatch by id is @aidex/engines'
 * EngineRegistry — register() then execute(id, context) — the real
 * mechanism this suite verifies against, same as every prior Feature
 * Pack's registration test.
 *
 * One provider mock serves all 14 dispatch calls: each engine's Strategy
 * only reads the JSON keys it expects and ignores the rest, so a single
 * response containing every key any of the 14 might look for is valid
 * input for all of them.
 */
const ALL_FIELDS_RESPONSE = JSON.stringify({
  objectives: [{ goal: 'A goal' }],
  summary: 'A summary',
  document: 'A document',
  activities: ['Day 1 activity', 'Day 2 activity'],
  keywords: [{ keyword: 'a keyword' }],
  title: 'A title',
  description: 'A description',
  score: 80,
  findings: [],
  caption: 'A caption',
  hashtags: ['#a'],
  order: [0],
  subjects: ['A subject'],
  subject: 'A subject',
  body: 'A body',
  steps: [{ subject: 'A subject', body: 'A body' }],
  highlights: [],
  insights: [{ observation: 'An observation', recommendation: 'A recommendation' }],
});

const provider: Provider = { name: 'test', async generate() { return { content: ALL_FIELDS_RESPONSE }; } };

function makeContext(request: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

function buildRegistry(): EngineRegistry {
  const registry = new EngineRegistry();
  registry.register(new CampaignPlanEngine());
  registry.register(new CampaignBriefEngine());
  registry.register(new CampaignCalendarEngine());
  registry.register(new SeoKeywordsEngine());
  registry.register(new SeoMetaEngine());
  registry.register(new SeoAuditEngine());
  registry.register(new SocialCaptionEngine());
  registry.register(new SocialHashtagsEngine());
  registry.register(new SocialScheduleEngine());
  registry.register(new EmailSubjectEngine());
  registry.register(new EmailCopyEngine());
  registry.register(new EmailSequenceEngine());
  registry.register(new AnalyticsSummaryEngine());
  registry.register(new AnalyticsInsightsEngine());
  return registry;
}

const VALID_INPUT: Readonly<Record<string, Record<string, unknown>>> = {
  [MarketingEngineId.CampaignPlan]: { brief: 'x' },
  [MarketingEngineId.CampaignBrief]: { brief: 'x' },
  [MarketingEngineId.CampaignCalendar]: { campaignContext: 'x', startDate: '2026-01-01', durationDays: 2 },
  [MarketingEngineId.SeoKeywords]: { brief: 'x' },
  [MarketingEngineId.SeoMeta]: { content: 'x' },
  [MarketingEngineId.SeoAudit]: { url: 'https://x.test' },
  [MarketingEngineId.SocialCaption]: { brief: 'x' },
  [MarketingEngineId.SocialHashtags]: { brief: 'x' },
  [MarketingEngineId.SocialSchedule]: { posts: [{ content: 'x', platform: 'instagram' }], startDate: '2026-01-01' },
  [MarketingEngineId.EmailSubject]: { brief: 'x' },
  [MarketingEngineId.EmailCopy]: { brief: 'x' },
  [MarketingEngineId.EmailSequence]: { brief: 'x' },
  [MarketingEngineId.AnalyticsSummary]: { metrics: [{ name: 'x', value: 1 }] },
  [MarketingEngineId.AnalyticsInsights]: { metrics: [{ name: 'x', value: 1 }] },
};

describe('Phase 3 Marketing engines — EngineRegistry registration + AI-backed execution', () => {
  it('registers all 14 engines with no id collisions', () => {
    const registry = buildRegistry();

    for (const id of Object.values(MarketingEngineId)) {
      expect(registry.has(id)).toBe(true);
    }
    expect(registry.list()).toHaveLength(14);
  });

  it('resolves and executes every engine id through the registry, via the provider', async () => {
    const registry = buildRegistry();

    for (const id of Object.values(MarketingEngineId)) {
      const input = VALID_INPUT[id] as Record<string, unknown>;
      const result = await registry.execute(id, makeContext({ strategy: id, input }));
      expect(result).toBeTruthy();
    }
  });

  it('dispatches each id to the correct engine, not a neighbor', async () => {
    const registry = buildRegistry();

    const plan = await registry.execute(
      MarketingEngineId.CampaignPlan,
      makeContext({ strategy: MarketingEngineId.CampaignPlan, input: VALID_INPUT[MarketingEngineId.CampaignPlan] })
    );
    const keywords = await registry.execute(
      MarketingEngineId.SeoKeywords,
      makeContext({ strategy: MarketingEngineId.SeoKeywords, input: VALID_INPUT[MarketingEngineId.SeoKeywords] })
    );
    const hashtags = await registry.execute(
      MarketingEngineId.SocialHashtags,
      makeContext({
        strategy: MarketingEngineId.SocialHashtags,
        input: VALID_INPUT[MarketingEngineId.SocialHashtags],
      })
    );

    expect(plan).toHaveProperty('objectives');
    expect(keywords).toHaveProperty('keywords');
    expect(hashtags).toHaveProperty('hashtags');
  });

  it('every registered engine actually calls context.provider.generate() (AI-backed, not a placeholder)', async () => {
    const registry = buildRegistry();
    let callCount = 0;
    const countingProvider: Provider = {
      name: 'counting',
      async generate() {
        callCount += 1;
        return { content: ALL_FIELDS_RESPONSE };
      },
    };
    const context = (id: string, input: Record<string, unknown>): ExecutionContext => ({
      config: { provider: countingProvider },
      provider: countingProvider,
      request: { strategy: id, input },
    });

    for (const id of Object.values(MarketingEngineId)) {
      await registry.execute(id, context(id, VALID_INPUT[id] as Record<string, unknown>));
    }

    expect(callCount).toBe(14);
  });
});

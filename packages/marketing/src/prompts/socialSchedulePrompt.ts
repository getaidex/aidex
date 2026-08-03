import type { PromptTemplate } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';

export const SOCIAL_SCHEDULE_PROMPT_ID = MarketingEngineId.SocialSchedule;

/**
 * Publish dates are computed deterministically by `SocialScheduleStrategy`
 * from `startDate` — the provider is only asked to decide the optimal
 * *order* to publish the already-written posts in, returned as an array
 * of 0-based indices into the original `posts` list (a permutation, not
 * new content).
 */
export const SOCIAL_SCHEDULE_PROMPT: PromptTemplate = {
  id: SOCIAL_SCHEDULE_PROMPT_ID,
  version: '1.0.0',
  variables: ['postsList'],
  template:
    'You are given a list of already-written social media posts, each with a 0-based index. Decide the ' +
    'optimal publishing order for engagement. Respond with strict JSON only, no markdown, no commentary, ' +
    'in exactly this shape:\n' +
    '{"order": [<the post indices, reordered>]}\n\n' +
    'Posts:\n{{postsList}}',
};

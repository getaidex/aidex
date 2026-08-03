import type { PromptTemplate } from '@aidex/prompts';
import { MediaEngineId } from '../identifiers.js';

export const IMAGE_OPTIMIZE_PROMPT_ID = MediaEngineId.ImageOptimize;

/** No `brief` — image.optimize is purely parametric (see @aidex/media's README), so the prompt is entirely constraint-driven. */
export const IMAGE_OPTIMIZE_PROMPT: PromptTemplate = {
  id: IMAGE_OPTIMIZE_PROMPT_ID,
  version: '1.0.0',
  variables: ['sourceNote', 'constraintsNote'],
  template:
    'Write a detailed optimization plan for an existing image asset.{{sourceNote}}{{constraintsNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"description": "<a detailed description of the optimization approach and the resulting image>"}',
};

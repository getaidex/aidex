import type { PromptTemplate } from '@aidex/prompts';
import { MediaEngineId } from '../identifiers.js';

export const IMAGE_GENERATE_PROMPT_ID = MediaEngineId.ImageGenerate;

/**
 * Providers in this platform are text-only — see `mediaAssetFromDescription`
 * for the full rationale. This prompt asks for a genuine creative
 * specification, not real pixels.
 */
export const IMAGE_GENERATE_PROMPT: PromptTemplate = {
  id: IMAGE_GENERATE_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'dimensionsNote'],
  template:
    'Write a detailed visual specification for a new image based on the following creative brief.{{dimensionsNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"description": "<a detailed description of the image — subject, composition, colors, lighting, style>"}\n\n' +
    'Brief:\n{{brief}}',
};

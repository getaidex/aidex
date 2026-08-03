import type { PromptTemplate } from '@aidex/prompts';
import { MediaEngineId } from '../identifiers.js';

export const ASSET_TRANSFORM_PROMPT_ID = MediaEngineId.AssetTransform;

export const ASSET_TRANSFORM_PROMPT: PromptTemplate = {
  id: ASSET_TRANSFORM_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'sourceNote'],
  template:
    'Write a detailed transformation plan for an existing media asset according to the following ' +
    'creative brief.{{sourceNote}} Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"description": "<a detailed description of the transformation applied and the resulting asset>"}\n\n' +
    'Brief:\n{{brief}}',
};

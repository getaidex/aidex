import type { PromptTemplate } from '@aidex/prompts';
import { MediaEngineId } from '../identifiers.js';

export const ASSET_CONVERT_PROMPT_ID = MediaEngineId.AssetConvert;

/** No `brief` — asset.convert is purely parametric (see @aidex/media's README). */
export const ASSET_CONVERT_PROMPT: PromptTemplate = {
  id: ASSET_CONVERT_PROMPT_ID,
  version: '1.0.0',
  variables: ['sourceNote', 'targetFormatNote'],
  template:
    'Write a detailed conversion plan for an existing media asset.{{sourceNote}}{{targetFormatNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"description": "<a detailed description of the conversion approach and the resulting asset>"}',
};

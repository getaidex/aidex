import type { PromptTemplate } from '@aidex/prompts';
import { MediaEngineId } from '../identifiers.js';

export const VIDEO_EDIT_PROMPT_ID = MediaEngineId.VideoEdit;

export const VIDEO_EDIT_PROMPT: PromptTemplate = {
  id: VIDEO_EDIT_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'sourceNote'],
  template:
    'Write detailed edit instructions for modifying an existing video according to the following ' +
    'creative brief.{{sourceNote}} Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"description": "<a detailed description of the edits to apply and the resulting video>"}\n\n' +
    'Brief:\n{{brief}}',
};

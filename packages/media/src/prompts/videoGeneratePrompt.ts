import type { PromptTemplate } from '@aidex/prompts';
import { MediaEngineId } from '../identifiers.js';

export const VIDEO_GENERATE_PROMPT_ID = MediaEngineId.VideoGenerate;

export const VIDEO_GENERATE_PROMPT: PromptTemplate = {
  id: VIDEO_GENERATE_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'durationNote'],
  template:
    'Write a detailed shot-by-shot specification for a new video based on the following creative brief.{{durationNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"description": "<a detailed description of the video — shots, pacing, visuals, audio direction>"}\n\n' +
    'Brief:\n{{brief}}',
};

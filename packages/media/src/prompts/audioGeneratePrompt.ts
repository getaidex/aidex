import type { PromptTemplate } from '@aidex/prompts';
import { MediaEngineId } from '../identifiers.js';

export const AUDIO_GENERATE_PROMPT_ID = MediaEngineId.AudioGenerate;

export const AUDIO_GENERATE_PROMPT: PromptTemplate = {
  id: AUDIO_GENERATE_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'durationNote'],
  template:
    'Write a detailed audio specification for a new audio asset based on the following creative brief.{{durationNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"description": "<a detailed description of the audio — instrumentation, tone, pacing, mood>"}\n\n' +
    'Brief:\n{{brief}}',
};

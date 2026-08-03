import type { PromptTemplate } from '@aidex/prompts';
import { MediaEngineId } from '../identifiers.js';

export const AUDIO_SUMMARIZE_PROMPT_ID = MediaEngineId.AudioSummarize;

/** Same known limitation as `audio.transcribe` — see `audioTranscribePrompt.ts`. */
export const AUDIO_SUMMARIZE_PROMPT: PromptTemplate = {
  id: AUDIO_SUMMARIZE_PROMPT_ID,
  version: '1.0.0',
  variables: ['sourceNote', 'lengthNote'],
  template:
    'You cannot access the actual audio content, only its metadata below — produce a clearly-labeled, ' +
    'plausible placeholder summary rather than claiming a real transcription-derived summary.{{sourceNote}}{{lengthNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"summary": "<a placeholder summary>"}',
};

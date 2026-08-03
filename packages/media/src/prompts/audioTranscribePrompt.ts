import type { PromptTemplate } from '@aidex/prompts';
import { MediaEngineId } from '../identifiers.js';

export const AUDIO_TRANSCRIBE_PROMPT_ID = MediaEngineId.AudioTranscribe;

/**
 * KNOWN LIMITATION, documented rather than hidden: `Provider.generate()`
 * is text-only and this pack has no external ASR/transcription API to
 * call (forbidden in Phase 3 anyway) — the provider never actually hears
 * `source.url`'s audio. The prompt asks for an honest, clearly-labeled
 * best-effort placeholder transcript built only from the metadata given
 * (source URL, mimeType, language hint), not a fabricated claim of real
 * transcription. A future Feature Pack backed by a real ASR-capable
 * Provider would replace this without changing `AudioTranscribeResult`'s
 * shape.
 */
export const AUDIO_TRANSCRIBE_PROMPT: PromptTemplate = {
  id: AUDIO_TRANSCRIBE_PROMPT_ID,
  version: '1.0.0',
  variables: ['sourceNote', 'languageNote'],
  template:
    'You cannot access the actual audio content, only its metadata below — produce a clearly-labeled, ' +
    'plausible placeholder transcript rather than claiming a real transcription.{{sourceNote}}{{languageNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"text": "<a placeholder transcript>", "detectedLanguage": "<optional ISO language code>"}',
};

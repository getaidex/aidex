import type { PromptTemplate } from '@aidex/prompts';
import { MediaEngineId } from '../identifiers.js';

export const VIDEO_STORYBOARD_PROMPT_ID = MediaEngineId.VideoStoryboard;

/**
 * `scenes` is genuinely textual output (scene descriptions, not a binary
 * asset) — no `mediaAssetFromDescription` wrapping needed here, unlike
 * every other video/image/audio-generation prompt in this package.
 */
export const VIDEO_STORYBOARD_PROMPT: PromptTemplate = {
  id: VIDEO_STORYBOARD_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'sceneCountNote'],
  template:
    'Write a scene-by-scene storyboard for a video based on the following creative brief.{{sceneCountNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"scenes": [{"description": "<a detailed description of one scene, in order>", ' +
    '"durationSeconds": <optional number of seconds for this scene>}]}\n\n' +
    'Brief:\n{{brief}}',
};

import type { PromptTemplate } from '@aidex/prompts';
import { MediaEngineId } from '../identifiers.js';

export const VIDEO_THUMBNAIL_PROMPT_ID = MediaEngineId.VideoThumbnail;

/** No `brief` — video.thumbnail is purely parametric (see @aidex/media's README). */
export const VIDEO_THUMBNAIL_PROMPT: PromptTemplate = {
  id: VIDEO_THUMBNAIL_PROMPT_ID,
  version: '1.0.0',
  variables: ['sourceNote', 'timestampNote'],
  template:
    'Write a detailed description of the video frame that would be extracted as a thumbnail.{{sourceNote}}{{timestampNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"description": "<a detailed description of the extracted frame>"}',
};

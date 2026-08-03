import type { PromptTemplate } from '@aidex/prompts';
import { MediaEngineId } from '../identifiers.js';

export const IMAGE_VARIANT_PROMPT_ID = MediaEngineId.ImageVariant;

export const IMAGE_VARIANT_PROMPT: PromptTemplate = {
  id: IMAGE_VARIANT_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'sourceNote', 'variantsNote'],
  template:
    'Write detailed visual specifications for variants of an existing image according to the following ' +
    'creative brief.{{sourceNote}}{{variantsNote}} Respond with strict JSON only, no markdown, no commentary, ' +
    'in exactly this shape:\n' +
    '{"variantDescriptions": ["<a detailed description of one variant — composition, colors, style>"]}\n\n' +
    'Brief:\n{{brief}}',
};

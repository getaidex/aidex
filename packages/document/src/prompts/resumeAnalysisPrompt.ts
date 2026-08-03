import type { PromptTemplate } from '@aidex/prompts';

export const RESUME_ANALYSIS_PROMPT_ID = 'resume.analyze';

/**
 * `jobDescriptionNote` is always supplied by ResumeAnalysisStrategy before
 * rendering — the actual job description text (if supplied) is folded into
 * that computed sentence in JS, not passed as its own placeholder, for the
 * same reason DOCUMENT_TRANSLATE_PROMPT's sourceLanguageNote is.
 */
export const RESUME_ANALYSIS_PROMPT: PromptTemplate = {
  id: RESUME_ANALYSIS_PROMPT_ID,
  version: '1.0.0',
  variables: ['document', 'jobDescriptionNote'],
  template:
    'Analyze the following resume. Respond with strict JSON only, no markdown, no commentary, ' +
    'in exactly this shape:\n' +
    '{"candidateName": "<name or null>", "skills": ["<skill>"], ' +
    '"experienceYears": <number or null>, "summary": "<1-2 sentence summary or null>", ' +
    '"matchScore": <number 0-100 or null>}\n' +
    '{{jobDescriptionNote}}\n\n' +
    'Resume:\n{{document}}',
};

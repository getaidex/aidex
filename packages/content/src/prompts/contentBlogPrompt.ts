import type { PromptTemplate } from '@aidex/prompts';

export const CONTENT_BLOG_PROMPT_ID = 'content.blog';

export const CONTENT_BLOG_PROMPT: PromptTemplate = {
  id: CONTENT_BLOG_PROMPT_ID,
  version: '1.0.0',
  variables: ['topic', 'guidance'],
  template:
    'Write a blog post about the following topic.{{guidance}} Respond with strict JSON only, ' +
    'no markdown, no commentary, in exactly this shape:\n' +
    '{"title": "<a compelling title>", "content": "<the full blog post body>"}\n\n' +
    'Topic:\n{{topic}}',
};

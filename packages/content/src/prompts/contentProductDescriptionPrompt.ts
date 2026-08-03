import type { PromptTemplate } from '@aidex/prompts';

export const CONTENT_PRODUCT_DESCRIPTION_PROMPT_ID = 'content.product-description';

export const CONTENT_PRODUCT_DESCRIPTION_PROMPT: PromptTemplate = {
  id: CONTENT_PRODUCT_DESCRIPTION_PROMPT_ID,
  version: '1.0.0',
  variables: ['productName', 'guidance'],
  template:
    'Write a product description for the following product.{{guidance}} Respond with only ' +
    'the description — no preamble, no headings, no commentary.\n\n' +
    'Product name:\n{{productName}}',
};

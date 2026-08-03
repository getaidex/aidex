import type { PromptTemplate } from '@aidex/prompts';

export const INVOICE_EXTRACTION_PROMPT_ID = 'invoice.extract';

export const INVOICE_EXTRACTION_PROMPT: PromptTemplate = {
  id: INVOICE_EXTRACTION_PROMPT_ID,
  version: '1.0.0',
  variables: ['document'],
  template:
    'Extract invoice details from the following document. Respond with strict JSON only, ' +
    'no markdown, no commentary, in exactly this shape:\n' +
    '{"invoiceNumber": "<value or null>", "issueDate": "<YYYY-MM-DD or null>", ' +
    '"dueDate": "<YYYY-MM-DD or null>", "vendorName": "<value or null>", ' +
    '"totalAmount": <number or null>, "currency": "<ISO 4217 code or null>", ' +
    '"lineItems": [{"description": "<value>", "quantity": <number or null>, ' +
    '"unitPrice": <number or null>, "amount": <number or null>}]}\n\n' +
    'Document:\n{{document}}',
};

import type { DocumentSource } from './DocumentSource.js';

export interface InvoiceExtractionRequest {
  readonly source: DocumentSource;
}

export interface InvoiceLineItem {
  readonly description: string;
  readonly quantity?: number;
  readonly unitPrice?: number;
  readonly amount?: number;
}

export interface InvoiceExtractionResult {
  readonly invoiceNumber?: string;
  readonly issueDate?: string;
  readonly dueDate?: string;
  readonly vendorName?: string;
  readonly totalAmount?: number;
  readonly currency?: string;
  readonly lineItems: readonly InvoiceLineItem[];
}

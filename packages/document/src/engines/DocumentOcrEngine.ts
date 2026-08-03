import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import { DocumentEngineId } from '../identifiers.js';
import type { DocumentOcrResult } from '../types/DocumentOcr.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';
import { NotImplementedError } from '../errors/NotImplementedError.js';

export class DocumentOcrEngine implements Engine<DocumentOcrResult> {
  readonly id = DocumentEngineId.Ocr;
  readonly name = 'Document OCR';
  readonly description = 'Extracts raw text from a scanned or image-based document.';
  readonly version = '0.1.0';

  async execute(context: ExecutionContext): Promise<DocumentOcrResult> {
    const input = context.request?.input;
    assertHasValidSource(this.id, input);

    throw new NotImplementedError(this.id);
  }
}

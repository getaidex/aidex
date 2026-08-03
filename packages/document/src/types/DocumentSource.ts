/**
 * The input every engine in this pack accepts — one representation of one
 * document. `content` is base64-encoded bytes for binary mime types (PDF,
 * images) or plain text for `text/plain`; callers pick the encoding by
 * setting `mimeType`, not by a separate flag.
 */
export interface DocumentSource {
  readonly content: string;
  readonly mimeType: string;
  readonly filename?: string;
}

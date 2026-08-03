/** `tone` is required — this engine exists specifically to retarget it (e.g. "formal", "playful", "urgent"). */
export interface ContentToneRequest {
  readonly content: string;
  readonly tone: string;
}

export interface ContentToneResult {
  readonly content: string;
}

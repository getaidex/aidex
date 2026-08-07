export interface AidexOptions {
  timeout?: number;
  signal?: AbortSignal;
  stream?: boolean;
  debug?: boolean;
  /**
   * Mirrors AidexRequest.executionId — set automatically by Aidex.execute()
   * so a Provider can read it from `options` without the Provider interface
   * needing a third parameter.
   */
  executionId?: string;
  [key: string]: unknown;
}

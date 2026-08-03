export interface AidexOptions {
  timeout?: number;
  signal?: AbortSignal;
  stream?: boolean;
  debug?: boolean;
  [key: string]: unknown;
}

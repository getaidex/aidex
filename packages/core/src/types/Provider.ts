import type { AidexOptions } from './AidexOptions.js';
import type { Prompt } from './Prompt.js';
import type { ProviderResponse } from './ProviderResponse.js';

export interface Provider {
  readonly name: string;
  generate(prompt: Prompt, options?: AidexOptions): Promise<ProviderResponse>;
}

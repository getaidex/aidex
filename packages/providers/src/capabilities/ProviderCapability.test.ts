import { describe, expect, it } from 'vitest';
import { ProviderCapability } from './ProviderCapability.js';

describe('ProviderCapability', () => {
  it('defines the expected set of capability identifiers', () => {
    expect(ProviderCapability).toEqual({
      TextGeneration: 'text-generation',
      StructuredOutput: 'structured-output',
      ImageGeneration: 'image-generation',
      ImageUnderstanding: 'image-understanding',
      Embeddings: 'embeddings',
      Streaming: 'streaming',
      ToolCalling: 'tool-calling',
      FunctionCalling: 'function-calling',
      JsonOutput: 'json-output',
      MultimodalInput: 'multimodal-input',
    });
  });

  it('has no duplicate capability values', () => {
    const values = Object.values(ProviderCapability);
    expect(new Set(values).size).toBe(values.length);
  });
});

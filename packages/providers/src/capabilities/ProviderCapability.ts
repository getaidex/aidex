/**
 * Generic capability identifiers a Provider can report supporting.
 * Vendor-neutral by design — no Gemini/OpenAI-specific flags belong here.
 */
export const ProviderCapability = {
  TextGeneration: 'text-generation',
  /** Constrains output to a caller-supplied schema (e.g. JSON Schema) and reliably conforms to it. */
  StructuredOutput: 'structured-output',
  ImageGeneration: 'image-generation',
  ImageUnderstanding: 'image-understanding',
  Embeddings: 'embeddings',
  Streaming: 'streaming',
  /** Invokes provider-defined/agentic tools (e.g. code execution, retrieval) mid-generation, as part of the provider's own tool-use loop. */
  ToolCalling: 'tool-calling',
  /** Calls caller-supplied function schemas and returns structured function-call requests for the caller to execute. */
  FunctionCalling: 'function-calling',
  /** Can be told to emit syntactically valid JSON, without necessarily conforming to a specific schema. */
  JsonOutput: 'json-output',
  MultimodalInput: 'multimodal-input',
} as const;

export type ProviderCapability = (typeof ProviderCapability)[keyof typeof ProviderCapability];

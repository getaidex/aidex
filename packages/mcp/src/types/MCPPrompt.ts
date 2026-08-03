import type { MCPContentBlock } from './MCPContentBlock.js';

export interface MCPPromptArgument {
  readonly name: string;
  readonly description?: string;
  readonly required?: boolean;
}

export interface MCPPromptMessage {
  readonly role: 'user' | 'assistant';
  readonly content: MCPContentBlock;
}

/**
 * The contract a registerable MCP prompt must satisfy — a *protocol-level*
 * prompt a client can request and fill in with arguments, distinct from
 * `@aidex/prompts`' `PromptTemplate` (this platform's own internal
 * LLM-prompt templating, rendered server-side before a Provider call).
 * Named `MCPPrompt` throughout this package specifically to avoid that
 * collision. `get()` is the prompt's own handler; this package never
 * renders anything itself.
 */
export interface MCPPrompt {
  readonly name: string;
  readonly description?: string;
  readonly arguments?: readonly MCPPromptArgument[];
  get(args?: Record<string, string>): Promise<readonly MCPPromptMessage[]>;
}

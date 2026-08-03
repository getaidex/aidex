import { DuplicateRegistrationError } from '@aidex/core';
import type { MCPPrompt, MCPPromptMessage } from '../types/MCPPrompt.js';
import { MCPPromptNotFoundError } from '../errors/MCPPromptNotFoundError.js';

/**
 * Central, name-keyed registry for MCP prompts — register once, dispatch
 * by name. Distinct from `@aidex/prompts`' `PromptRegistry` (this
 * platform's own internal LLM-prompt templating registry, versioned,
 * rendered before a Provider call); this registry holds protocol-level
 * `MCPPrompt` objects a client requests directly, and never renders
 * anything itself.
 */
export class MCPPromptRegistry {
  private readonly prompts = new Map<string, MCPPrompt>();

  register(prompt: MCPPrompt): void {
    if (this.prompts.has(prompt.name)) {
      throw new DuplicateRegistrationError('MCPPrompt', prompt.name);
    }
    this.prompts.set(prompt.name, prompt);
  }

  unregister(name: string): boolean {
    return this.prompts.delete(name);
  }

  has(name: string): boolean {
    return this.prompts.has(name);
  }

  get(name: string): MCPPrompt | undefined {
    return this.prompts.get(name);
  }

  list(): MCPPrompt[] {
    return Array.from(this.prompts.values());
  }

  async getMessages(name: string, args?: Record<string, string>): Promise<readonly MCPPromptMessage[]> {
    const prompt = this.prompts.get(name);
    if (!prompt) {
      throw new MCPPromptNotFoundError(name);
    }

    return prompt.get(args);
  }
}

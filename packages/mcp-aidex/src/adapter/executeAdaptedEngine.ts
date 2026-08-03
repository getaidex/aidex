import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { MCPToolResult } from '@aidex/mcp';

/**
 * The one place an adapted `Engine` is actually invoked. Its own step so
 * it's unit-testable independent of `EngineToMCPToolAdapter`/
 * `MCPAidexAdapter`, the same reason every parse/build helper in this
 * platform is factored out this way.
 *
 * Execution flow: MCP tool `input` (whatever a client sent, unchanged —
 * generic object mapping, no feature-pack-specific conversion) becomes
 * `context.request.input`; `baseContext` (the caller's shared config/
 * provider/logger) is reused as-is, never rebuilt or reconstructed, so
 * every adapted engine's execution shares the exact same `Provider`
 * instance. `engine.execute()` is the *only* execution logic here — this
 * function never duplicates what a Strategy or Engine already does.
 *
 * Result mapping: an `Engine`'s `Result` is arbitrary, feature-pack-defined
 * JSON — the one generic representation every result can carry without
 * this package knowing its shape is one text content block of its JSON
 * encoding. If the engine throws, that error is *not* swallowed and not
 * re-thrown either: it's reported through the returned `MCPToolResult`
 * itself (`isError: true`, the thrown error's own `.message` — never its
 * `.stack`), the same "propagate through the result, don't leak
 * internals" shape `@aidex/mcp`'s own JSON-RPC layer uses for Internal
 * error responses.
 */
export async function executeAdaptedEngine(
  engine: Engine,
  input: unknown,
  baseContext: ExecutionContext
): Promise<MCPToolResult> {
  const context: ExecutionContext = {
    ...baseContext,
    request: { strategy: engine.id, input },
  };

  try {
    const result = await engine.execute(context);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: 'text', text: message }], isError: true };
  }
}

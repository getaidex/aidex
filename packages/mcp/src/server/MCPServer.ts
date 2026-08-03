import type { MCPServerConfig } from '../types/MCPServerConfig.js';
import type { MCPServerMetadata } from '../types/MCPServerMetadata.js';
import { MCPToolRegistry } from '../registry/MCPToolRegistry.js';
import { MCPResourceRegistry } from '../registry/MCPResourceRegistry.js';
import { MCPPromptRegistry } from '../registry/MCPPromptRegistry.js';
import { buildServerMetadata } from '../metadata/buildServerMetadata.js';
import { MCPProtocolHandler } from '../protocol/MCPProtocolHandler.js';
import { buildParseErrorResponse } from '../protocol/buildParseErrorResponse.js';

/**
 * Composes one `MCPTransport`, one of each registry
 * (`MCPToolRegistry`/`MCPResourceRegistry`/`MCPPromptRegistry`), the
 * server's own metadata, and — as of Phase 2 — one `MCPProtocolHandler`
 * that turns inbound transport payloads into JSON-RPC 2.0 responses.
 * Registration is still each registry's own job — call
 * `server.tools.register(tool)` directly, the same way an
 * `EngineRegistry` is used directly rather than through `Aidex`. `MCPServer`
 * itself owns none of the protocol logic (envelope validation, method
 * routing, error-code mapping) — that's entirely `MCPProtocolHandler`'s
 * job; this class only wires transport in/out to it.
 */
export class MCPServer {
  readonly tools = new MCPToolRegistry();
  readonly resources = new MCPResourceRegistry();
  readonly prompts = new MCPPromptRegistry();

  private readonly config: MCPServerConfig;
  private readonly handler: MCPProtocolHandler;
  private started = false;

  constructor(config: MCPServerConfig) {
    this.config = config;
    this.handler = new MCPProtocolHandler({
      tools: this.tools,
      resources: this.resources,
      prompts: this.prompts,
      getMetadata: () => this.getMetadata(),
    });
  }

  getMetadata(): MCPServerMetadata {
    return buildServerMetadata(this.config);
  }

  isStarted(): boolean {
    return this.started;
  }

  async start(): Promise<void> {
    await this.config.transport.start(
      async (message) => {
        const response = await this.handler.handleMessage(message);
        if (response !== undefined) {
          await this.config.transport.send(response);
        }
      },
      async (error) => {
        this.config.logger?.error('MCP transport error', error);
        // JSON-RPC 2.0 requires a Parse Error response when a payload
        // can't be parsed as JSON at all — id is always null, since no
        // request id was ever successfully parsed out. Only the error's
        // message is used, never its stack.
        await this.config.transport.send(buildParseErrorResponse(error.message));
      }
    );
    this.started = true;
  }

  async stop(): Promise<void> {
    await this.config.transport.close();
    this.started = false;
  }
}

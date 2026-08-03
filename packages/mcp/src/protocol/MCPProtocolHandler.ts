import type { MCPToolRegistry } from '../registry/MCPToolRegistry.js';
import type { MCPResourceRegistry } from '../registry/MCPResourceRegistry.js';
import type { MCPPromptRegistry } from '../registry/MCPPromptRegistry.js';
import type { MCPServerMetadata } from '../types/MCPServerMetadata.js';
import { MCPToolNotFoundError } from '../errors/MCPToolNotFoundError.js';
import { MCPResourceNotFoundError } from '../errors/MCPResourceNotFoundError.js';
import { MCPPromptNotFoundError } from '../errors/MCPPromptNotFoundError.js';
import { JSONRPC_VERSION, type JsonRpcId, type JsonRpcResponse } from './JsonRpc.js';
import { JsonRpcErrorCode } from './JsonRpcErrorCode.js';
import { JsonRpcProtocolError } from './JsonRpcProtocolError.js';
import { asRecord, asString, asStringRecord } from './params.js';

export interface MCPProtocolHandlerDeps {
  readonly tools: MCPToolRegistry;
  readonly resources: MCPResourceRegistry;
  readonly prompts: MCPPromptRegistry;
  readonly getMetadata: () => MCPServerMetadata;
}

/**
 * Turns raw, already-JSON-parsed transport payloads into JSON-RPC 2.0
 * responses. Owns all protocol logic — envelope validation,
 * request/notification/batch handling, method routing, error-code
 * mapping — and delegates every actual capability lookup to exactly one
 * of the three registries this platform already has
 * (`MCPToolRegistry`/`MCPResourceRegistry`/`MCPPromptRegistry`). Never
 * imports `@aidex/engines`, `@aidex/providers`, or `@aidex/workflow` — a
 * tool/resource/prompt backed by any of those is still just an
 * `MCPTool`/`MCPResource`/`MCPPrompt` as far as this class is concerned,
 * and registering one requires no change here.
 */
export class MCPProtocolHandler {
  constructor(private readonly deps: MCPProtocolHandlerDeps) {}

  /**
   * Handles one already-JSON-parsed transport payload — a single message
   * or a JSON-RPC batch array. Returns what to send back: one response,
   * an array of responses, or `undefined` when nothing should be sent (a
   * lone notification, or a batch made entirely of notifications).
   */
  async handleMessage(payload: unknown): Promise<JsonRpcResponse | JsonRpcResponse[] | undefined> {
    if (Array.isArray(payload)) {
      if (payload.length === 0) {
        // Per the JSON-RPC 2.0 spec's own example: an empty batch is a
        // single Invalid Request response, not an array of one.
        return this.errorResponse(null, JsonRpcErrorCode.InvalidRequest, 'Batch request must not be empty');
      }
      return this.handleBatch(payload);
    }

    return this.handleSingle(payload);
  }

  private async handleBatch(messages: readonly unknown[]): Promise<JsonRpcResponse[] | undefined> {
    const responses: JsonRpcResponse[] = [];
    for (const message of messages) {
      const response = await this.handleSingle(message);
      if (response !== undefined) {
        responses.push(response);
      }
    }
    // A batch made entirely of notifications gets no response at all.
    return responses.length > 0 ? responses : undefined;
  }

  private async handleSingle(raw: unknown): Promise<JsonRpcResponse | undefined> {
    const envelope = asRecord(raw);
    const id = this.extractId(envelope);
    const isNotification = envelope !== undefined && !Object.prototype.hasOwnProperty.call(envelope, 'id');

    let method: string;
    let params: unknown;
    try {
      const validated = this.validateEnvelope(envelope);
      method = validated.method;
      params = validated.params;
    } catch (error) {
      // A notification is never answered, even a malformed one.
      return isNotification ? undefined : this.errorResponseFrom(id, error);
    }

    try {
      const result = await this.dispatch(method, params);
      return isNotification ? undefined : this.successResponse(id, result);
    } catch (error) {
      return isNotification ? undefined : this.errorResponseFrom(id, error);
    }
  }

  private extractId(envelope: Record<string, unknown> | undefined): JsonRpcId {
    const value = envelope?.id;
    return typeof value === 'string' || typeof value === 'number' || value === null ? value : null;
  }

  private validateEnvelope(envelope: Record<string, unknown> | undefined): { method: string; params: unknown } {
    if (envelope === undefined) {
      throw new JsonRpcProtocolError(JsonRpcErrorCode.InvalidRequest, 'Request must be a JSON object');
    }
    if (envelope.jsonrpc !== JSONRPC_VERSION) {
      throw new JsonRpcProtocolError(JsonRpcErrorCode.InvalidRequest, '"jsonrpc" must be "2.0"');
    }

    const method = asString(envelope.method);
    if (method === undefined || method.length === 0) {
      throw new JsonRpcProtocolError(JsonRpcErrorCode.InvalidRequest, '"method" must be a non-empty string');
    }

    return { method, params: envelope.params };
  }

  private async dispatch(method: string, params: unknown): Promise<unknown> {
    switch (method) {
      case 'initialize':
        return this.handleInitialize();
      case 'tools/list':
        return this.handleToolsList();
      case 'tools/call':
        return this.handleToolsCall(params);
      case 'resources/list':
        return this.handleResourcesList();
      case 'resources/read':
        return this.handleResourcesRead(params);
      case 'prompts/list':
        return this.handlePromptsList();
      case 'prompts/get':
        return this.handlePromptsGet(params);
      default:
        throw new JsonRpcProtocolError(JsonRpcErrorCode.MethodNotFound, `Unknown method: "${method}"`);
    }
  }

  private handleInitialize(): unknown {
    const metadata = this.deps.getMetadata();
    return {
      protocolVersion: metadata.protocolVersion,
      capabilities: {
        ...(metadata.capabilities.tools ? { tools: {} } : {}),
        ...(metadata.capabilities.resources ? { resources: {} } : {}),
        ...(metadata.capabilities.prompts ? { prompts: {} } : {}),
      },
      serverInfo: { name: metadata.name, version: metadata.version },
    };
  }

  private handleToolsList(): unknown {
    return {
      tools: this.deps.tools.list().map((tool) => ({
        name: tool.name,
        ...(tool.description !== undefined ? { description: tool.description } : {}),
        ...(tool.inputSchema !== undefined ? { inputSchema: tool.inputSchema } : {}),
      })),
    };
  }

  private async handleToolsCall(params: unknown): Promise<unknown> {
    const record = asRecord(params);
    const name = record ? asString(record.name) : undefined;
    if (name === undefined) {
      throw new JsonRpcProtocolError(
        JsonRpcErrorCode.InvalidParams,
        '"tools/call" requires a "name" string parameter'
      );
    }

    try {
      return await this.deps.tools.call(name, record?.arguments ?? {});
    } catch (error) {
      if (error instanceof MCPToolNotFoundError) {
        throw new JsonRpcProtocolError(JsonRpcErrorCode.InvalidParams, error.message, { name });
      }
      throw error;
    }
  }

  private handleResourcesList(): unknown {
    return {
      resources: this.deps.resources.list().map((resource) => ({
        uri: resource.uri,
        name: resource.name,
        ...(resource.description !== undefined ? { description: resource.description } : {}),
        ...(resource.mimeType !== undefined ? { mimeType: resource.mimeType } : {}),
      })),
    };
  }

  private async handleResourcesRead(params: unknown): Promise<unknown> {
    const record = asRecord(params);
    const uri = record ? asString(record.uri) : undefined;
    if (uri === undefined) {
      throw new JsonRpcProtocolError(
        JsonRpcErrorCode.InvalidParams,
        '"resources/read" requires a "uri" string parameter'
      );
    }

    try {
      const content = await this.deps.resources.read(uri);
      return { contents: [content] };
    } catch (error) {
      if (error instanceof MCPResourceNotFoundError) {
        throw new JsonRpcProtocolError(JsonRpcErrorCode.InvalidParams, error.message, { uri });
      }
      throw error;
    }
  }

  private handlePromptsList(): unknown {
    return {
      prompts: this.deps.prompts.list().map((prompt) => ({
        name: prompt.name,
        ...(prompt.description !== undefined ? { description: prompt.description } : {}),
        ...(prompt.arguments !== undefined ? { arguments: prompt.arguments } : {}),
      })),
    };
  }

  private async handlePromptsGet(params: unknown): Promise<unknown> {
    const record = asRecord(params);
    const name = record ? asString(record.name) : undefined;
    if (name === undefined) {
      throw new JsonRpcProtocolError(
        JsonRpcErrorCode.InvalidParams,
        '"prompts/get" requires a "name" string parameter'
      );
    }
    const args = asStringRecord(record?.arguments);

    try {
      const messages = await this.deps.prompts.getMessages(name, args);
      const description = this.deps.prompts.get(name)?.description;
      return {
        ...(description !== undefined ? { description } : {}),
        messages,
      };
    } catch (error) {
      if (error instanceof MCPPromptNotFoundError) {
        throw new JsonRpcProtocolError(JsonRpcErrorCode.InvalidParams, error.message, { name });
      }
      throw error;
    }
  }

  private successResponse(id: JsonRpcId, result: unknown): JsonRpcResponse {
    return { jsonrpc: JSONRPC_VERSION, id, result };
  }

  private errorResponse(id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcResponse {
    return { jsonrpc: JSONRPC_VERSION, id, error: { code, message, ...(data !== undefined ? { data } : {}) } };
  }

  /** Never reads `error.stack` — only a `JsonRpcProtocolError`'s own `code`/`message`/`data`, or the fixed, generic "Internal error" message for anything else (a real bug, a registry throwing something unexpected — its details never reach the client). */
  private errorResponseFrom(id: JsonRpcId, error: unknown): JsonRpcResponse {
    if (error instanceof JsonRpcProtocolError) {
      return this.errorResponse(id, error.code, error.message, error.data);
    }
    return this.errorResponse(id, JsonRpcErrorCode.InternalError, 'Internal error');
  }
}

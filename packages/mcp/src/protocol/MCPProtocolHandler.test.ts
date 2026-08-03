import { describe, expect, it } from 'vitest';
import type { MCPTool } from '../types/MCPTool.js';
import type { MCPResource } from '../types/MCPResource.js';
import type { MCPPrompt } from '../types/MCPPrompt.js';
import type { MCPServerMetadata } from '../types/MCPServerMetadata.js';
import { MCPToolRegistry } from '../registry/MCPToolRegistry.js';
import { MCPResourceRegistry } from '../registry/MCPResourceRegistry.js';
import { MCPPromptRegistry } from '../registry/MCPPromptRegistry.js';
import { MCP_PROTOCOL_VERSION } from './MCPProtocolVersion.js';
import { JsonRpcErrorCode } from './JsonRpcErrorCode.js';
import type { JsonRpcResponse } from './JsonRpc.js';
import { MCPProtocolHandler } from './MCPProtocolHandler.js';

/**
 * All three registries are real `MCPToolRegistry`/`MCPResourceRegistry`/
 * `MCPPromptRegistry` instances (already covered by their own dedicated
 * test files) populated with mock Tool/Resource/Prompt objects — the
 * mocking this suite exercises is at the capability level, the same
 * shape `MCPServer.test.ts`'s Phase 1 tests already used.
 */
const TEST_METADATA: MCPServerMetadata = {
  name: 'test-server',
  version: '1.0.0',
  protocolVersion: MCP_PROTOCOL_VERSION,
  capabilities: { tools: true, resources: true, prompts: true },
};

function makeHandler(overrides: Partial<{ metadata: MCPServerMetadata }> = {}): {
  handler: MCPProtocolHandler;
  tools: MCPToolRegistry;
  resources: MCPResourceRegistry;
  prompts: MCPPromptRegistry;
} {
  const tools = new MCPToolRegistry();
  const resources = new MCPResourceRegistry();
  const prompts = new MCPPromptRegistry();
  const handler = new MCPProtocolHandler({
    tools,
    resources,
    prompts,
    getMetadata: () => overrides.metadata ?? TEST_METADATA,
  });
  return { handler, tools, resources, prompts };
}

const ECHO_TOOL: MCPTool = {
  name: 'echo',
  description: 'Echoes input back',
  inputSchema: { type: 'object', properties: { text: { type: 'string' } } },
  async execute(input) {
    return { content: [{ type: 'text', text: JSON.stringify(input) }] };
  },
};

const NOTES_RESOURCE: MCPResource = {
  uri: 'file:///notes.txt',
  name: 'notes',
  description: 'Some notes',
  mimeType: 'text/plain',
  async read() {
    return { uri: 'file:///notes.txt', mimeType: 'text/plain', text: 'hello' };
  },
};

const GREETING_PROMPT: MCPPrompt = {
  name: 'greeting',
  description: 'Greets someone',
  arguments: [{ name: 'who', required: true }],
  async get(args) {
    return [{ role: 'user', content: { type: 'text', text: `hello ${args?.who ?? 'world'}` } }];
  },
};

describe('MCPProtocolHandler', () => {
  describe('initialize', () => {
    it('responds with protocolVersion/capabilities/serverInfo built from getMetadata()', async () => {
      const { handler } = makeHandler();

      const response = await handler.handleMessage({ jsonrpc: '2.0', id: 1, method: 'initialize' });

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: { tools: {}, resources: {}, prompts: {} },
          serverInfo: { name: 'test-server', version: '1.0.0' },
        },
      });
    });

    it('omits a capability from the wire response when its metadata flag is false', async () => {
      const { handler } = makeHandler({
        metadata: { ...TEST_METADATA, capabilities: { tools: true, resources: false, prompts: true } },
      });

      const response = await handler.handleMessage({ jsonrpc: '2.0', id: 1, method: 'initialize' });

      expect(response).toMatchObject({ result: { capabilities: { tools: {}, prompts: {} } } });
      expect(response).not.toMatchObject({ result: { capabilities: { resources: {} } } });
    });
  });

  describe('tools/list', () => {
    it('lists registered tools, projecting out execute()', async () => {
      const { handler, tools } = makeHandler();
      tools.register(ECHO_TOOL);

      const response = await handler.handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/list' });

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: {
          tools: [
            {
              name: 'echo',
              description: 'Echoes input back',
              inputSchema: { type: 'object', properties: { text: { type: 'string' } } },
            },
          ],
        },
      });
    });

    it('returns an empty list when no tools are registered', async () => {
      const { handler } = makeHandler();

      const response = await handler.handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/list' });

      expect(response).toMatchObject({ result: { tools: [] } });
    });
  });

  describe('tools/call', () => {
    it('delegates to MCPToolRegistry.call() and returns its MCPToolResult as the response result', async () => {
      const { handler, tools } = makeHandler();
      tools.register(ECHO_TOOL);

      const response = await handler.handleMessage({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'echo', arguments: { text: 'hi' } },
      });

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: { content: [{ type: 'text', text: '{"text":"hi"}' }] },
      });
    });

    it('defaults arguments to {} when omitted', async () => {
      const { handler, tools } = makeHandler();
      tools.register(ECHO_TOOL);

      const response = await handler.handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'echo' } });

      expect(response).toEqual({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: '{}' }] } });
    });

    it('returns Invalid params when "name" is missing', async () => {
      const { handler } = makeHandler();

      const response = await handler.handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: {} });

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: { code: JsonRpcErrorCode.InvalidParams, message: expect.any(String) },
      });
    });

    it('returns Invalid params when params is missing entirely', async () => {
      const { handler } = makeHandler();

      const response = await handler.handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call' });

      expect(response).toMatchObject({ error: { code: JsonRpcErrorCode.InvalidParams } });
    });

    it('returns Invalid params (not Internal error) when the tool name is not registered', async () => {
      const { handler } = makeHandler();

      const response = await handler.handleMessage({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'missing' },
      });

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: JsonRpcErrorCode.InvalidParams,
          message: 'MCP tool not found: "missing"',
          data: { name: 'missing' },
        },
      });
    });
  });

  describe('resources/list', () => {
    it('lists registered resources, projecting out read()', async () => {
      const { handler, resources } = makeHandler();
      resources.register(NOTES_RESOURCE);

      const response = await handler.handleMessage({ jsonrpc: '2.0', id: 1, method: 'resources/list' });

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: {
          resources: [{ uri: 'file:///notes.txt', name: 'notes', description: 'Some notes', mimeType: 'text/plain' }],
        },
      });
    });
  });

  describe('resources/read', () => {
    it('delegates to MCPResourceRegistry.read() and wraps the content in a "contents" array', async () => {
      const { handler, resources } = makeHandler();
      resources.register(NOTES_RESOURCE);

      const response = await handler.handleMessage({
        jsonrpc: '2.0',
        id: 1,
        method: 'resources/read',
        params: { uri: 'file:///notes.txt' },
      });

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: { contents: [{ uri: 'file:///notes.txt', mimeType: 'text/plain', text: 'hello' }] },
      });
    });

    it('returns Invalid params when "uri" is missing', async () => {
      const { handler } = makeHandler();

      const response = await handler.handleMessage({ jsonrpc: '2.0', id: 1, method: 'resources/read', params: {} });

      expect(response).toMatchObject({ error: { code: JsonRpcErrorCode.InvalidParams } });
    });

    it('returns Invalid params when the uri is not registered', async () => {
      const { handler } = makeHandler();

      const response = await handler.handleMessage({
        jsonrpc: '2.0',
        id: 1,
        method: 'resources/read',
        params: { uri: 'file:///missing.txt' },
      });

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: JsonRpcErrorCode.InvalidParams,
          message: 'MCP resource not found: "file:///missing.txt"',
          data: { uri: 'file:///missing.txt' },
        },
      });
    });
  });

  describe('prompts/list', () => {
    it('lists registered prompts, projecting out get()', async () => {
      const { handler, prompts } = makeHandler();
      prompts.register(GREETING_PROMPT);

      const response = await handler.handleMessage({ jsonrpc: '2.0', id: 1, method: 'prompts/list' });

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: {
          prompts: [{ name: 'greeting', description: 'Greets someone', arguments: [{ name: 'who', required: true }] }],
        },
      });
    });
  });

  describe('prompts/get', () => {
    it('delegates to MCPPromptRegistry.getMessages() and includes the prompt\'s own description', async () => {
      const { handler, prompts } = makeHandler();
      prompts.register(GREETING_PROMPT);

      const response = await handler.handleMessage({
        jsonrpc: '2.0',
        id: 1,
        method: 'prompts/get',
        params: { name: 'greeting', arguments: { who: 'Ada' } },
      });

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: {
          description: 'Greets someone',
          messages: [{ role: 'user', content: { type: 'text', text: 'hello Ada' } }],
        },
      });
    });

    it('returns Invalid params when "name" is missing', async () => {
      const { handler } = makeHandler();

      const response = await handler.handleMessage({ jsonrpc: '2.0', id: 1, method: 'prompts/get', params: {} });

      expect(response).toMatchObject({ error: { code: JsonRpcErrorCode.InvalidParams } });
    });

    it('returns Invalid params when the prompt name is not registered', async () => {
      const { handler } = makeHandler();

      const response = await handler.handleMessage({
        jsonrpc: '2.0',
        id: 1,
        method: 'prompts/get',
        params: { name: 'missing' },
      });

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: JsonRpcErrorCode.InvalidParams,
          message: 'MCP prompt not found: "missing"',
          data: { name: 'missing' },
        },
      });
    });
  });

  describe('invalid request envelopes', () => {
    it('rejects a payload that is not a JSON object', async () => {
      const { handler } = makeHandler();

      const response = await handler.handleMessage('just a string');

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: null,
        error: { code: JsonRpcErrorCode.InvalidRequest, message: expect.any(String) },
      });
    });

    it('rejects a message with the wrong "jsonrpc" value', async () => {
      const { handler } = makeHandler();

      const response = await handler.handleMessage({ jsonrpc: '1.0', id: 1, method: 'initialize' });

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: { code: JsonRpcErrorCode.InvalidRequest, message: expect.any(String) },
      });
    });

    it('rejects a message with no "method"', async () => {
      const { handler } = makeHandler();

      const response = await handler.handleMessage({ jsonrpc: '2.0', id: 1 });

      expect(response).toMatchObject({ error: { code: JsonRpcErrorCode.InvalidRequest } });
    });

    it('rejects a message with a non-string "method"', async () => {
      const { handler } = makeHandler();

      const response = await handler.handleMessage({ jsonrpc: '2.0', id: 1, method: 42 });

      expect(response).toMatchObject({ error: { code: JsonRpcErrorCode.InvalidRequest } });
    });

    it('preserves the request id even when the envelope is otherwise invalid', async () => {
      const { handler } = makeHandler();

      const response = await handler.handleMessage({ jsonrpc: '1.0', id: 'abc-123', method: 'initialize' });

      expect(response).toMatchObject({ id: 'abc-123' });
    });
  });

  describe('unknown method', () => {
    it('returns Method not found for a syntactically valid but unsupported method', async () => {
      const { handler } = makeHandler();

      const response = await handler.handleMessage({ jsonrpc: '2.0', id: 1, method: 'not/a/real/method' });

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: { code: JsonRpcErrorCode.MethodNotFound, message: 'Unknown method: "not/a/real/method"' },
      });
    });
  });

  describe('internal errors', () => {
    it('maps an unexpected error thrown by a registered tool to Internal error, without leaking its message', async () => {
      const { handler, tools } = makeHandler();
      tools.register({
        name: 'broken',
        async execute() {
          throw new Error('sensitive internal detail: /etc/passwd');
        },
      });

      const response = await handler.handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'broken' } });

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: { code: JsonRpcErrorCode.InternalError, message: 'Internal error' },
      });
    });
  });

  describe('request id correlation', () => {
    it.each([1, 'string-id', null])('echoes back id %j unchanged', async (id) => {
      const { handler } = makeHandler();

      const response = await handler.handleMessage({ jsonrpc: '2.0', id, method: 'tools/list' });

      expect(response).toMatchObject({ id });
    });
  });

  describe('notifications', () => {
    it('returns undefined (no response) for a message with no "id" property, even on success', async () => {
      const { handler } = makeHandler();

      const response = await handler.handleMessage({ jsonrpc: '2.0', method: 'tools/list' });

      expect(response).toBeUndefined();
    });

    it('returns undefined (no response) for a notification that errors', async () => {
      const { handler } = makeHandler();

      const response = await handler.handleMessage({ jsonrpc: '2.0', method: 'not/a/real/method' });

      expect(response).toBeUndefined();
    });

    it('a request with id: null still receives a response (distinct from a notification, which has no "id" property at all)', async () => {
      const { handler } = makeHandler();

      const response = await handler.handleMessage({ jsonrpc: '2.0', id: null, method: 'tools/list' });

      expect(response).toMatchObject({ id: null, result: { tools: [] } });
    });
  });

  describe('batch requests', () => {
    it('processes every message in a batch and returns an array of responses in order', async () => {
      const { handler, tools } = makeHandler();
      tools.register(ECHO_TOOL);

      const response = await handler.handleMessage([
        { jsonrpc: '2.0', id: 1, method: 'initialize' },
        { jsonrpc: '2.0', id: 2, method: 'tools/list' },
      ]);

      expect(Array.isArray(response)).toBe(true);
      expect((response as JsonRpcResponse[]).map((r) => r.id)).toEqual([1, 2]);
    });

    it('omits notifications from the batch response array', async () => {
      const { handler } = makeHandler();

      const response = await handler.handleMessage([
        { jsonrpc: '2.0', id: 1, method: 'tools/list' },
        { jsonrpc: '2.0', method: 'tools/list' }, // notification — no id
      ]);

      expect(response).toEqual([{ jsonrpc: '2.0', id: 1, result: { tools: [] } }]);
    });

    it('returns undefined for a batch made entirely of notifications', async () => {
      const { handler } = makeHandler();

      const response = await handler.handleMessage([
        { jsonrpc: '2.0', method: 'tools/list' },
        { jsonrpc: '2.0', method: 'resources/list' },
      ]);

      expect(response).toBeUndefined();
    });

    it('returns a single Invalid Request response (not an array) for an empty batch', async () => {
      const { handler } = makeHandler();

      const response = await handler.handleMessage([]);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: null,
        error: { code: JsonRpcErrorCode.InvalidRequest, message: expect.any(String) },
      });
    });

    it('includes error responses for individually-invalid messages within an otherwise-valid batch', async () => {
      const { handler } = makeHandler();

      const response = await handler.handleMessage([
        { jsonrpc: '2.0', id: 1, method: 'tools/list' },
        { jsonrpc: '2.0', id: 2, method: 'nonexistent' },
      ]);

      expect(response).toEqual([
        { jsonrpc: '2.0', id: 1, result: { tools: [] } },
        { jsonrpc: '2.0', id: 2, error: { code: JsonRpcErrorCode.MethodNotFound, message: expect.any(String) } },
      ]);
    });
  });
});
